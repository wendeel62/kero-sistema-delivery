-- Migracao: Corrigir cast UUID nas policies RLS do vault
--
-- As policies antigas comparavam tenant_id (UUID) com auth.jwt()->>'tenant_id'
-- (text) sem cast explicito. O PostgreSQL pode fazer implicit cast, mas
-- e mais seguro e performatico usar cast explicito.
--
-- Tambem adiciona app.current_tenant_id() como fallback, mantendo
-- consistencia com as demais tabelas.

-- ============================================================================
-- 1. Remover policies antigas
-- ============================================================================
DROP POLICY IF EXISTS vault_tenant_select ON public.vault;
DROP POLICY IF EXISTS vault_tenant_insert ON public.vault;
DROP POLICY IF EXISTS vault_tenant_update ON public.vault;
DROP POLICY IF EXISTS vault_tenant_delete ON public.vault;

-- ============================================================================
-- 2. Recriar com cast explicito e fallback via app.current_tenant_id()
-- ============================================================================
CREATE POLICY vault_tenant_select ON public.vault
    FOR SELECT TO authenticated
    USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        OR tenant_id = auth.uid()
        OR tenant_id = app.current_tenant_id()
    );

CREATE POLICY vault_tenant_insert ON public.vault
    FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        OR tenant_id = auth.uid()
        OR tenant_id = app.current_tenant_id()
    );

CREATE POLICY vault_tenant_update ON public.vault
    FOR UPDATE TO authenticated
    USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        OR tenant_id = auth.uid()
        OR tenant_id = app.current_tenant_id()
    )
    WITH CHECK (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        OR tenant_id = auth.uid()
        OR tenant_id = app.current_tenant_id()
    );

CREATE POLICY vault_tenant_delete ON public.vault
    FOR DELETE TO authenticated
    USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        OR tenant_id = auth.uid()
        OR tenant_id = app.current_tenant_id()
    );
