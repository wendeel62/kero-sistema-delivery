-- Migracao: Corrigir submit_public_order para usar slug em vez de tenant_id do cliente
--
-- PROBLEMA: A funcao recebia tenant_id diretamente do corpo da requisicao,
-- permitindo que qualquer anonimo enviasse pedidos para QUALQUER tenant
-- apenas conhecendo um UUID valido.
--
-- SOLUCAO: A funcao agora recebe p_slug (identificador publico da loja) e
-- deriva o tenant_id internamente a partir da tabela configuracoes.
-- Mesmo padrao de seguranca usado pelo get_public_menu().

-- ============================================================================
-- 1. Remover funcao antiga (assinatura com jsonb apenas)
-- ============================================================================
DROP FUNCTION IF EXISTS public.submit_public_order(jsonb);

-- ============================================================================
-- 2. Criar nova funcao segura
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_public_order(p_slug text, p_order_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id uuid;
    v_pedido_id uuid;
BEGIN
    -- 1. Resolver tenant_id a partir do slug (NUNCA confiar no cliente)
    SELECT tenant_id INTO v_tenant_id
    FROM configuracoes
    WHERE slug = p_slug;

    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Loja nao encontrada para o slug informado';
    END IF;

    -- 2. Validar que o pedido tem dados minimos
    IF p_order_data->>'cliente_nome' IS NULL OR p_order_data->>'cliente_telefone' IS NULL THEN
        RAISE EXCEPTION 'Nome e telefone do cliente sao obrigatorios';
    END IF;

    -- 3. Inserir pedido com tenant_id resolvido internamente
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

-- ============================================================================
-- 3. Garantir acesso publico (anonimo pode fazer pedidos)
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.submit_public_order(text, jsonb) TO anon, authenticated;
