-- Migracao: Simplificar app.current_tenant_id()
-- Remove filtro de role que impedia usuarios com role='user' de resolverem
-- corretamente o tenant_id no step 2.
--
-- O filtro `ur.role IN ('admin', 'super_admin', 'editor')` fazia com que
-- usuarios com role='user' (criados pela trigger antiga) NAO fossem
-- encontrados, caindo no fallback auth.uid(). Agora que a trigger foi corrigida
-- para criar todos como 'admin', removemos a restricao para garantir que
-- QUALQUER usuario consiga resolver seu tenant_id.

CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (NULLIF(auth.jwt() ->> 'tenant_id', ''))::uuid,
    (
      SELECT ur.tenant_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.tenant_id IS NOT NULL
      LIMIT 1
    ),
    auth.uid()
  )
$$;
