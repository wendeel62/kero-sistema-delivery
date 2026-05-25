-- Migracao: Conceder permissoes para o supabase_auth_admin executar
-- o hook de Custom JWT Claims.
--
-- O Supabase Auth precisa de acesso a funcao custom_jwt_claims para
-- executa-la antes de emitir cada JWT. Sem estas permissoes, o hook
-- falha silenciosamente e o tenant_id nao e injetado no token.

-- ============================================================================
-- 1. Permitir que supabase_auth_admin use o schema public
-- ============================================================================
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- ============================================================================
-- 2. Permitir execucao da funcao hook
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.custom_jwt_claims(jsonb) TO supabase_auth_admin;

-- ============================================================================
-- 3. Remover acesso publico a funcao (so o Auth deve chama-la)
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.custom_jwt_claims(jsonb) FROM authenticated, anon, public;

-- ============================================================================
-- 4. Permitir que supabase_auth_admin leia user_roles (necessario
--    para a funcao resolver o tenant_id)
-- ============================================================================
GRANT ALL ON TABLE public.user_roles TO supabase_auth_admin;

-- ============================================================================
-- 5. Politica RLS para supabase_auth_admin em user_roles
-- ============================================================================
DROP POLICY IF EXISTS "Allow auth admin to read user roles" ON public.user_roles;
CREATE POLICY "Allow auth admin to read user roles" ON public.user_roles
    AS PERMISSIVE
    FOR SELECT
    TO supabase_auth_admin
    USING (true);
