-- ============================================================================
-- CORREÇÃO RLS - BLOCO ÚNICO (Copie TUDO de uma vez)
-- Execute no SQL Editor: https://kmtjfapbooqzhysllrbe.supabase.co
-- ============================================================================

DO $$
BEGIN
  -- Drop policies antigas da tabela produtos
  DROP POLICY IF EXISTS produtos_tenant_insert ON public.produtos;
  DROP POLICY IF EXISTS produtos_tenant_select ON public.produtos;
  DROP POLICY IF EXISTS produtos_tenant_update ON public.produtos;
  DROP POLICY IF EXISTS produtos_tenant_delete ON public.produtos;

  -- Drop policies antigas da tabela categorias
  DROP POLICY IF EXISTS categorias_tenant_insert ON public.categorias;
  DROP POLICY IF EXISTS categorias_tenant_select ON public.categorias;
  DROP POLICY IF EXISTS categorias_tenant_update ON public.categorias;
  DROP POLICY IF EXISTS categorias_tenant_delete ON public.categorias;

  -- Drop policies antigas da tabela precos_tamanho
  DROP POLICY IF EXISTS precos_tamanho_tenant_insert ON public.precos_tamanho;
  DROP POLICY IF EXISTS precos_tamanho_tenant_select ON public.precos_tamanho;
  DROP POLICY IF EXISTS precos_tamanho_tenant_update ON public.precos_tamanho;
  DROP POLICY IF EXISTS precos_tamanho_tenant_delete ON public.precos_tamanho;
END $$;

-- Criar nova função app.current_tenant_id()
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (NULLIF(auth.jwt() ->> 'tenant_id', ''))::uuid,
    (SELECT ur.tenant_id FROM public.user_roles ur 
     WHERE ur.user_id = auth.uid() AND ur.tenant_id IS NOT NULL 
     AND ur.role IN ('admin', 'super_admin', 'editor')
     ORDER BY CASE ur.role WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2 WHEN 'editor' THEN 3 END LIMIT 1),
    auth.uid()
  )
$$;

-- Criar policies para produtos
CREATE POLICY produtos_tenant_insert ON public.produtos FOR INSERT TO authenticated WITH CHECK (
  tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id AND ur.role IN ('admin', 'super_admin', 'editor'))
);

CREATE POLICY produtos_tenant_select ON public.produtos FOR SELECT TO authenticated USING (
  tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id AND ur.role IN ('admin', 'super_admin', 'editor'))
);

CREATE POLICY produtos_tenant_update ON public.produtos FOR UPDATE TO authenticated USING (
  tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id AND ur.role IN ('admin', 'super_admin', 'editor'))
) WITH CHECK (
  tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id AND ur.role IN ('admin', 'super_admin', 'editor'))
);

CREATE POLICY produtos_tenant_delete ON public.produtos FOR DELETE TO authenticated USING (
  tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id AND ur.role IN ('admin', 'super_admin', 'editor'))
);

-- Criar policies para categorias
CREATE POLICY categorias_tenant_insert ON public.categorias FOR INSERT TO authenticated WITH CHECK (
  tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id AND ur.role IN ('admin', 'super_admin', 'editor'))
);

CREATE POLICY categorias_tenant_select ON public.categorias FOR SELECT TO authenticated USING (
  tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id AND ur.role IN ('admin', 'super_admin', 'editor'))
);

CREATE POLICY categorias_tenant_update ON public.categorias FOR UPDATE TO authenticated USING (
  tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id AND ur.role IN ('admin', 'super_admin', 'editor'))
) WITH CHECK (
  tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id AND ur.role IN ('admin', 'super_admin', 'editor'))
);

CREATE POLICY categorias_tenant_delete ON public.categorias FOR DELETE TO authenticated USING (
  tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id AND ur.role IN ('admin', 'super_admin', 'editor'))
);

-- Criar policies para precos_tamanho
CREATE POLICY precos_tamanho_tenant_insert ON public.precos_tamanho FOR INSERT TO authenticated WITH CHECK (
  tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id AND ur.role IN ('admin', 'super_admin', 'editor'))
);

CREATE POLICY precos_tamanho_tenant_select ON public.precos_tamanho FOR SELECT TO authenticated USING (
  tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id AND ur.role IN ('admin', 'super_admin', 'editor'))
);

CREATE POLICY precos_tamanho_tenant_update ON public.precos_tamanho FOR UPDATE TO authenticated USING (
  tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id AND ur.role IN ('admin', 'super_admin', 'editor'))
) WITH CHECK (
  tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id AND ur.role IN ('admin', 'super_admin', 'editor'))
);

CREATE POLICY precos_tamanho_tenant_delete ON public.precos_tamanho FOR DELETE TO authenticated USING (
  tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id AND ur.role IN ('admin', 'super_admin', 'editor'))
);

-- Backfill: garantir que todos user_roles tenham tenant_id (apenas se não existir)
-- Nota: Se a constraint unique já existir, isso pode falhar - o que é OK
DO $$
BEGIN
  UPDATE public.user_roles SET tenant_id = user_id WHERE tenant_id IS NULL;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'Backfill ignorado: constraint unique já existe';
END $$;

-- Verificação
SELECT 'Correção RLS aplicada com sucesso!' as status;
SELECT COUNT(*) as policies_count FROM pg_policies WHERE tablename IN ('produtos', 'categorias', 'precos_tamanho');
