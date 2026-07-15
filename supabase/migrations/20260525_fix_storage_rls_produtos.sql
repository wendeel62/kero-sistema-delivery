-- Migracao: Corrigir RLS policies do bucket "produtos"
--
-- PROBLEMA ANTERIOR:
-- As políticas usavam (storage.foldername(name))[1] = auth.uid()::text
-- Mas o código faz upload para: {tenant_id}/{produto_id}.{ext}
-- O path não corresponde a auth.uid(), então TODO upload era bloqueado.
--
-- SOLUCAO:
-- 1. SELECT público (cardapio online é acessado sem login)
-- 2. INSERT/UPDATE/DELETE: usuario autenticado do mesmo tenant
--    Validamos extraindo tenant_id do JWT (claim "tenant_id")
--    ou consultando a tabela user_metadata via SECURITY DEFINER function.
--
-- A estrutura de pastas muda para: {tenant_id}/{produto_id}.{ext}

-- ============================================================================
-- 1. Garantir que o bucket existe e e' publico (necessario para SELECT sem auth)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('produtos', 'produtos', true, 5242880)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets SET public = true WHERE id = 'produtos';

-- ============================================================================
-- 2. Criar funcao helper para extrair tenant_id do JWT
-- ============================================================================
DROP FUNCTION IF EXISTS storage.current_tenant_id();
CREATE OR REPLACE FUNCTION storage.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Tenta extrair do claim "tenant_id" do JWT
  -- O Supabase coloca custom claims no namespace "raw"
  RETURN (
    SELECT tenant_id::uuid
    FROM auth.users
    WHERE id = auth.uid()
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- ============================================================================
-- 3. Remover politicas antigas
-- ============================================================================
DROP POLICY IF EXISTS "produtos_select_tenant" ON storage.objects;
DROP POLICY IF EXISTS "produtos_insert_tenant" ON storage.objects;
DROP POLICY IF EXISTS "produtos_update_tenant" ON storage.objects;
DROP POLICY IF EXISTS "produtos_delete_tenant" ON storage.objects;

-- ============================================================================
-- 4. SELECT:允许公开访问 (anon + authenticated)
-- O cardapio online nao tem auth, mas precisa ver as imagens.
-- Como o bucket e' publico (public=true), qualquer um acessa.
-- Para seguranca adicional, restringimos ao bucket "produtos" e
-- paths que seguem o padrao {uuid}/{uuid}.{ext}
-- ============================================================================
DROP POLICY IF EXISTS "produtos_select_public" ON storage.objects;
CREATE POLICY "produtos_select_public" ON storage.objects
    FOR SELECT
    TO public
    USING (
        bucket_id = 'produtos'
        AND name ~ '^[0-9a-f-]+/[^/]+\.[a-zA-Z0-9]+$'
    );

-- ============================================================================
-- 5. INSERT: usuario autenticado do mesmo tenant
-- O primeiro segmento do path deve corresponder ao tenant_id do usuario.
-- Usamos current_tenant_id() que consulta o banco com SECURITY DEFINER.
-- ============================================================================
DROP POLICY IF EXISTS "produtos_insert_auth" ON storage.objects;
CREATE POLICY "produtos_insert_auth" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'produtos'
        AND (storage.foldername(name))[1] = storage.current_tenant_id()::text
    );

-- ============================================================================
-- 6. UPDATE: mesmo tenant
-- ============================================================================
DROP POLICY IF EXISTS "produtos_update_auth" ON storage.objects;
CREATE POLICY "produtos_update_auth" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'produtos'
        AND (storage.foldername(name))[1] = storage.current_tenant_id()::text
    )
    WITH CHECK (
        bucket_id = 'produtos'
        AND (storage.foldername(name))[1] = storage.current_tenant_id()::text
    );

-- ============================================================================
-- 7. DELETE: mesmo tenant
-- ============================================================================
DROP POLICY IF EXISTS "produtos_delete_auth" ON storage.objects;
CREATE POLICY "produtos_delete_auth" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'produtos'
        AND (storage.foldername(name))[1] = storage.current_tenant_id()::text
    );

-- ============================================================================
-- 8. Grant necessario para a funcao helper
-- ============================================================================
GRANT USAGE ON FUNCTION storage.current_tenant_id() TO anon, authenticated;