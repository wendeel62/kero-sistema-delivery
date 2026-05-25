-- Migracao: Unificar RLS do configuracoes para usar app.current_tenant_id()
-- em vez de auth.uid() diretamente.
--
-- As politicas antigas (criadas em 20260407) usavam `tenant_id = auth.uid()`
-- direto, enquanto todas as outras tabelas usam app.current_tenant_id().
-- Isso criava uma divergencia: se app.current_tenant_id() resolvesse para
-- um UUID diferente de auth.uid(), o configuracoes ficava invisivel.
--
-- Tambem remove politicas residuais de 20260401 (security_hardening)
-- que podem ter sobrado com nomes diferentes.

-- ============================================================================
-- 1. Remover todas as politicas existentes do configuracoes
-- ============================================================================
DROP POLICY IF EXISTS "Config visible to tenant" ON public.configuracoes;
DROP POLICY IF EXISTS "Config editable by tenant" ON public.configuracoes;
DROP POLICY IF EXISTS "Config insertable by auth" ON public.configuracoes;
DROP POLICY IF EXISTS "Config deletable by tenant" ON public.configuracoes;
DROP POLICY IF EXISTS "Config visivel para todos" ON public.configuracoes;
DROP POLICY IF EXISTS "Config editavel por auth" ON public.configuracoes;
DROP POLICY IF EXISTS configuracoes_tenant_select ON public.configuracoes;
DROP POLICY IF EXISTS configuracoes_tenant_insert ON public.configuracoes;
DROP POLICY IF EXISTS configuracoes_tenant_update ON public.configuracoes;
DROP POLICY IF EXISTS configuracoes_tenant_delete ON public.configuracoes;

-- ============================================================================
-- 2. Criar politicas unificadas usando app.current_tenant_id()
-- ============================================================================
CREATE POLICY configuracoes_tenant_select ON public.configuracoes
  FOR SELECT TO authenticated
  USING (tenant_id = app.current_tenant_id());

CREATE POLICY configuracoes_tenant_insert ON public.configuracoes
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = app.current_tenant_id());

CREATE POLICY configuracoes_tenant_update ON public.configuracoes
  FOR UPDATE TO authenticated
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());

CREATE POLICY configuracoes_tenant_delete ON public.configuracoes
  FOR DELETE TO authenticated
  USING (tenant_id = app.current_tenant_id());

-- ============================================================================
-- 3. Garantir RLS ativo
-- ============================================================================
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
