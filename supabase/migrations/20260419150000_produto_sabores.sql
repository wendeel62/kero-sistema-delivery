-- Create produto_sabores junction table
-- Links produtos to sabores with many-to-many relationship
-- Includes tenant isolation for multi-tenant security

-- 1. Create the produto_sabores table
CREATE TABLE IF NOT EXISTS public.produto_sabores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    sabor_id UUID NOT NULL REFERENCES public.sabores(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL,
    preco_adicional DECIMAL(10,2) DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(produto_id, sabor_id)
);

-- 2. Enable RLS
ALTER TABLE public.produto_sabores ENABLE ROW LEVEL SECURITY;

-- 3. Create index for tenant_id
CREATE INDEX idx_produto_sabores_tenant_id ON public.produto_sabores(tenant_id);

-- 4. Create indexes for foreign key lookups
CREATE INDEX idx_produto_sabores_produto_id ON public.produto_sabores(produto_id);
CREATE INDEX idx_produto_sabores_sabor_id ON public.produto_sabores(sabor_id);

-- 5. Create RLS policies for tenant isolation
DO $$
BEGIN
    -- SELECT: Only tenant users can view their tenant's produto_sabores
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'produto_sabores_tenant_select' 
        AND tablename = 'produto_sabores'
    ) THEN
        CREATE POLICY "produto_sabores_tenant_select" ON public.produto_sabores
            FOR SELECT
            TO authenticated
            USING (tenant_id = app.current_tenant_id());
    END IF;

    -- INSERT: Only tenant users can insert for their tenant
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'produto_sabores_tenant_insert' 
        AND tablename = 'produto_sabores'
    ) THEN
        CREATE POLICY "produto_sabores_tenant_insert" ON public.produto_sabores
            FOR INSERT
            TO authenticated
            WITH CHECK (tenant_id = app.current_tenant_id());
    END IF;

    -- UPDATE: Only tenant users can update their tenant's records
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'produto_sabores_tenant_update' 
        AND tablename = 'produto_sabores'
    ) THEN
        CREATE POLICY "produto_sabores_tenant_update" ON public.produto_sabores
            FOR UPDATE
            TO authenticated
            USING (tenant_id = app.current_tenant_id())
            WITH CHECK (tenant_id = app.current_tenant_id());
    END IF;

    -- DELETE: Only tenant users can delete their tenant's records
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'produto_sabores_tenant_delete' 
        AND tablename = 'produto_sabores'
    ) THEN
        CREATE POLICY "produto_sabores_tenant_delete" ON public.produto_sabores
            FOR DELETE
            TO authenticated
            USING (tenant_id = app.current_tenant_id());
    END IF;
END $$;

-- 6. Create trigger to auto-set tenant_id from produto
CREATE OR REPLACE FUNCTION public.produto_sabores_set_tenant()
RETURNS TRIGGER AS $$
DECLARE
    v_produto_tenant_id uuid;
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT p.tenant_id INTO v_produto_tenant_id
        FROM public.produtos p
        WHERE p.id = NEW.produto_id;
        
        NEW.tenant_id := v_produto_tenant_id;
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_produto_sabores_set_tenant
    BEFORE INSERT OR UPDATE ON public.produto_sabores
    FOR EACH ROW
    EXECUTE FUNCTION public.produto_sabores_set_tenant();

-- 7. Function to get sabores of a produto
CREATE OR REPLACE FUNCTION public.get_produto_sabores(p_produto_id uuid)
RETURNS TABLE(
    id uuid,
    nome text,
    preco_adicional decimal,
    activo boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.sabor_id,
        s.nome,
        ps.preco_adicional,
        ps.activo
    FROM public.produto_sabores ps
    INNER JOIN public.sabores s ON s.id = ps.sabor_id
    WHERE ps.produto_id = p_produto_id
        AND ps.activo = true
        AND ps.tenant_id = app.current_tenant_id()
    ORDER BY s.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to get produtos of a sabor
CREATE OR REPLACE FUNCTION public.get_sabor_produtos(p_sabor_id uuid)
RETURNS TABLE(
    id uuid,
    nome text,
    preco_adicional decimal,
    activo boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.produto_id,
        p.nome,
        ps.preco_adicional,
        ps.activo
    FROM public.produto_sabores ps
    INNER JOIN public.produtos p ON p.id = ps.produto_id
    WHERE ps.sabor_id = p_sabor_id
        AND ps.activo = true
        AND ps.tenant_id = app.current_tenant_id()
    ORDER BY p.nome;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notice
DO $$
BEGIN
    RAISE NOTICE 'Migration 20260419150000_produto_sabores completed successfully.';
    RAISE NOTICE 'Created table: public.produto_sabores';
    RAISE NOTICE 'Policies: select, insert, update, delete (tenant-isolated)';
    RAISE NOTICE 'Functions: get_produto_sabores, get_sabor_produtos';
END $$;