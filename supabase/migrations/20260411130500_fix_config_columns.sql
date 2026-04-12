-- 1. Ensure all expected columns exist in configuracoes
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS nome_loja text;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- 2. Backfill missing slugs
UPDATE public.configuracoes 
SET slug = lower(trim(public.slugify(nome_loja))) 
WHERE (slug IS NULL OR slug = '') AND nome_loja IS NOT NULL;

-- 3. Enhance public menu RPC for resilience
CREATE OR REPLACE FUNCTION public.get_public_menu(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_config jsonb;
    v_categories jsonb;
    v_products jsonb;
    v_prices jsonb;
    v_sabores jsonb;
    v_cleaned_slug text;
BEGIN
    v_cleaned_slug := lower(trim(p_slug));

    -- 1. Identify tenant by slug (case-insensitive and trimmed)
    SELECT tenant_id, 
           json_build_object(
               'taxa_entrega', COALESCE(taxa_entrega, 0),
               'pedido_minimo', COALESCE(pedido_minimo, 0),
               'loja_aberta', COALESCE(loja_aberta, true),
               'nome_fantasia', COALESCE(nome_loja, 'Kero Delivery'),
               'logo_url', logo_url
           )
    INTO v_tenant_id, v_config
    FROM configuracoes
    WHERE lower(trim(slug)) = v_cleaned_slug
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- 2. Fetch active categories
    SELECT json_agg(c) INTO v_categories
    FROM (
        SELECT id, nome
        FROM categorias
        WHERE tenant_id = v_tenant_id AND (ativo = true OR ativo IS NULL)
        ORDER BY ordem
    ) c;

    -- 3. Fetch available products
    SELECT json_agg(p) INTO v_products
    FROM (
        SELECT id, categoria_id, nome, descricao, preco, disponivel, imagem_url
        FROM produtos
        WHERE tenant_id = v_tenant_id AND (disponivel = true OR disponivel IS NULL)
        ORDER BY ordem
    ) p;

    -- 4. Fetch prices by size
    SELECT json_agg(pt) INTO v_prices
    FROM (
        SELECT pt.id, pt.produto_id, pt.tamanho, pt.preco
        FROM precos_tamanho pt
        JOIN produtos p ON p.id = pt.produto_id
        WHERE p.tenant_id = v_tenant_id
    ) pt;

    -- 5. Fetch flavors
    SELECT json_agg(s) INTO v_sabores
    FROM (
        SELECT id, nome, descricao, disponivel
        FROM sabores
        WHERE tenant_id = v_tenant_id AND (disponivel = true OR disponivel IS NULL)
        ORDER BY nome
    ) s;

    RETURN json_build_object(
        'tenant_id', v_tenant_id,
        'config', v_config,
        'categorias', COALESCE(v_categories, '[]'::jsonb),
        'produtos', COALESCE(v_products, '[]'::jsonb),
        'precos_tamanho', COALESCE(v_prices, '[]'::jsonb),
        'sabores', COALESCE(v_sabores, '[]'::jsonb)
    );
END;
$$;

-- 4. Grant access again just in case
GRANT EXECUTE ON FUNCTION public.get_public_menu(text) TO anon, authenticated;
