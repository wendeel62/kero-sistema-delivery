-- Migracao: Adicionar RLS policies no Storage bucket "produtos"
--
-- O bucket "produtos" armazena imagens dos itens do cardapio.
-- Antes desta migration, nao havia nenhuma politica RLS no storage,
-- permitindo que qualquer usuario autenticado acessasse imagens
-- de qualquer tenant.
--
-- A estrutura de pastas e: {tenant_id}/{produto_id}.{ext}
-- A política isola por tenant_id atraves do primeiro segmento do path.

-- ============================================================================
-- 1. Criar bucket "produtos" se nao existir
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
    'produtos',
    'produtos',
    false,
    5242880 -- 5MB limit
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. Ativar RLS no storage.objects (se ja nao estiver ativo)
-- ============================================================================
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. Remover politicas antigas se existirem
-- ============================================================================
DROP POLICY IF EXISTS "produtos_select_tenant" ON storage.objects;
DROP POLICY IF EXISTS "produtos_insert_tenant" ON storage.objects;
DROP POLICY IF EXISTS "produtos_update_tenant" ON storage.objects;
DROP POLICY IF EXISTS "produtos_delete_tenant" ON storage.objects;

-- ============================================================================
-- 4. Politica SELECT: usuario so ve imagens do seu tenant
-- ============================================================================
CREATE POLICY "produtos_select_tenant" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'produtos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================================
-- 5. Politica INSERT: usuario so faz upload para pasta do seu tenant
-- ============================================================================
CREATE POLICY "produtos_insert_tenant" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'produtos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================================
-- 6. Politica UPDATE: usuario so altera imagens do seu tenant
-- ============================================================================
CREATE POLICY "produtos_update_tenant" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'produtos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'produtos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================================
-- 7. Politica DELETE: usuario so exclui imagens do seu tenant
-- ============================================================================
CREATE POLICY "produtos_delete_tenant" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'produtos'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
