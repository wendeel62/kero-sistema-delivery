-- Rate limiting para RPCs públicos via tabela de controle
-- Cria tabela de rate limiting e funções auxiliares

-- Tabela de controle de rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  rpc_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Index para limpeza eficiente
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_ip_rpc_time
  ON public.rate_limit_logs(ip_hash, rpc_name, created_at);

-- Função de verificação de rate limit
-- Retorna true se a requisição deve ser permitida
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_ip_hash text,
  p_rpc_name text,
  p_max_requests int DEFAULT 60,
  p_window_seconds int DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  -- Contar requisições no window
  SELECT COUNT(*) INTO v_count
  FROM public.rate_limit_logs
  WHERE ip_hash = p_ip_hash
    AND rpc_name = p_rpc_name
    AND created_at > now() - (p_window_seconds || ' seconds')::interval;

  IF v_count >= p_max_requests THEN
    RETURN false;
  END IF;

  -- Registrar requisição
  INSERT INTO public.rate_limit_logs (ip_hash, rpc_name)
  VALUES (p_ip_hash, p_rpc_name);

  RETURN true;
END;
$$;

-- Função de limpeza automática de logs antigos
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_logs(
  p_older_than_seconds int DEFAULT 3600
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted int;
BEGIN
  DELETE FROM public.rate_limit_logs
  WHERE created_at < now() - (p_older_than_seconds || ' seconds')::interval;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- RLS para rate_limit_logs (apenas leitura para admin)
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rate_limit_admin_select ON public.rate_limit_logs;
CREATE POLICY rate_limit_admin_select ON public.rate_limit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'super_admin')
    )
  );

-- Permitir insert para anon (necessário para rate limiting funcionar)
DROP POLICY IF EXISTS rate_limit_anon_insert ON public.rate_limit_logs;
CREATE POLICY rate_limit_anon_insert ON public.rate_limit_logs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Permitir delete para super_admin (limpeza manual)
DROP POLICY IF EXISTS rate_limit_admin_delete ON public.rate_limit_logs;
CREATE POLICY rate_limit_admin_delete ON public.rate_limit_logs
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'super_admin'
    )
  );
