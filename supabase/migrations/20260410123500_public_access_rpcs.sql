-- Add slug to configuracoes for public identification
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Function to fetch public menu data safely
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
BEGIN
    -- 1. Identify tenant by slug
    SELECT tenant_id, 
           json_build_object(
               'taxa_entrega', taxa_entrega,
               'pedido_minimo', pedido_minimo,
               'loja_aberta', loja_aberta,
               'nome_fantasia', COALESCE(nome_loja, 'Kero Delivery'),
               'logo_url', logo_url
           )
    INTO v_tenant_id, v_config
    FROM configuracoes
    WHERE slug = p_slug
    LIMIT 1;

    IF v_tenant_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- 2. Fetch active categories
    SELECT json_agg(c) INTO v_categories
    FROM (
        SELECT id, nome
        FROM categorias
        WHERE tenant_id = v_tenant_id AND ativo = true
        ORDER BY ordem
    ) c;

    -- 3. Fetch available products
    SELECT json_agg(p) INTO v_products
    FROM (
        SELECT id, categoria_id, nome, descricao, preco, disponivel, imagem_url
        FROM produtos
        WHERE tenant_id = v_tenant_id AND disponivel = true
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
        WHERE tenant_id = v_tenant_id AND disponivel = true
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

-- Function to submit order as public user
CREATE OR REPLACE FUNCTION public.submit_public_order(p_order_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_pedido_id uuid;
BEGIN
    -- Extract tenant_id from order data (must be provided and valid)
    v_tenant_id := (p_order_data->>'tenant_id')::uuid;

    -- Verify the tenant actually exists
    IF NOT EXISTS (SELECT 1 FROM configuracoes WHERE tenant_id = v_tenant_id) THEN
        RAISE EXCEPTION 'Tenant inválido';
    END IF;

    -- Insert into pedidos_online
    INSERT INTO pedidos_online (
        tenant_id,
        cliente_nome,
        cliente_telefone,
        cep,
        endereco,
        numero_endereco,
        complemento,
        bairro,
        cidade,
        estado,
        itens,
        subtotal,
        taxa_entrega,
        total,
        forma_pagamento,
        observacoes,
        status
    )
    VALUES (
        v_tenant_id,
        p_order_data->>'cliente_nome',
        p_order_data->>'cliente_telefone',
        p_order_data->>'cep',
        p_order_data->>'endereco',
        p_order_data->>'numero_endereco',
        p_order_data->>'complemento',
        p_order_data->>'bairro',
        p_order_data->>'cidade',
        p_order_data->>'estado',
        (p_order_data->>'itens')::jsonb,
        (p_order_data->>'subtotal')::numeric,
        (p_order_data->>'taxa_entrega')::numeric,
        (p_order_data->>'total')::numeric,
        p_order_data->>'forma_pagamento',
        p_order_data->>'observacoes',
        'pendente'
    )
    RETURNING id INTO v_pedido_id;

    RETURN v_pedido_id;
END;
$$;

-- Grant access to public roles
GRANT EXECUTE ON FUNCTION public.get_public_menu(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_order(jsonb) TO anon, authenticated;
