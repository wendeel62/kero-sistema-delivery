-- Security hardening for tenant isolation.
-- This migration intentionally removes permissive anonymous/auth-wide access.
-- Public cardapio, mesa, motoboy and pedido tracking flows need a follow-up
-- migration with signed tokens or RPCs before this is applied in production.

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((NULLIF(auth.jwt() ->> 'tenant_id', ''))::uuid, auth.uid())
$$;

DO $$
DECLARE
  tbl_name text;
BEGIN
  FOREACH tbl_name IN ARRAY ARRAY[
    'configuracoes',
    'categorias',
    'produtos',
    'precos_tamanho',
    'sabores',
    'mesas',
    'pedidos',
    'itens_pedido',
    'pedidos_online',
    'clientes',
    'cupons',
    'fornecedores',
    'ingredientes',
    'entradas_estoque',
    'ficha_tecnica',
    'caixa',
    'sangrias_caixa',
    'contas_pagar',
    'motoboys',
    'entregas',
    'historico_status',
    'notificacoes',
    'mensagens_whatsapp'
  ] LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = tbl_name
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid', tbl_name);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_name);
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (tenant_id)',
        'idx_' || tbl_name || '_tenant_id',
        tbl_name
      );
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produtos')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'precos_tamanho') THEN
    UPDATE public.precos_tamanho pt
    SET tenant_id = p.tenant_id
    FROM public.produtos p
    WHERE pt.produto_id = p.id
      AND pt.tenant_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pedidos')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'itens_pedido') THEN
    UPDATE public.itens_pedido ip
    SET tenant_id = p.tenant_id
    FROM public.pedidos p
    WHERE ip.pedido_id = p.id
      AND ip.tenant_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ingredientes')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'entradas_estoque') THEN
    UPDATE public.entradas_estoque ee
    SET tenant_id = i.tenant_id
    FROM public.ingredientes i
    WHERE ee.ingrediente_id = i.id
      AND ee.tenant_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produtos')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ficha_tecnica') THEN
    UPDATE public.ficha_tecnica ft
    SET tenant_id = p.tenant_id
    FROM public.produtos p
    WHERE ft.produto_id = p.id
      AND ft.tenant_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'caixa')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sangrias_caixa') THEN
    UPDATE public.sangrias_caixa sc
    SET tenant_id = c.tenant_id
    FROM public.caixa c
    WHERE sc.caixa_id = c.id
      AND sc.tenant_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pedidos')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'entregas') THEN
    UPDATE public.entregas e
    SET tenant_id = p.tenant_id
    FROM public.pedidos p
    WHERE e.pedido_id = p.id
      AND e.tenant_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'motoboys')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'entregas') THEN
    UPDATE public.motoboys m
    SET tenant_id = e.tenant_id
    FROM public.entregas e
    WHERE e.motoboy_id = m.id
      AND m.tenant_id IS NULL
      AND e.tenant_id IS NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'historico_status')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pedidos') THEN
    UPDATE public.historico_status hs
    SET tenant_id = p.tenant_id
    FROM public.pedidos p
    WHERE hs.pedido_id = p.id
      AND hs.origem_tabela = 'pedidos'
      AND hs.tenant_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'historico_status')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pedidos_online') THEN
    UPDATE public.historico_status hs
    SET tenant_id = p.tenant_id
    FROM public.pedidos_online p
    WHERE hs.pedido_id = p.id
      AND hs.origem_tabela = 'pedidos_online'
      AND hs.tenant_id IS NULL;
  END IF;
END $$;

DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY (ARRAY[
        'configuracoes',
        'categorias',
        'produtos',
        'precos_tamanho',
        'sabores',
        'mesas',
        'pedidos',
        'itens_pedido',
        'pedidos_online',
        'clientes',
        'cupons',
        'fornecedores',
        'ingredientes',
        'entradas_estoque',
        'ficha_tecnica',
        'caixa',
        'sangrias_caixa',
        'contas_pagar',
        'motoboys',
        'entregas',
        'historico_status',
        'notificacoes',
        'mensagens_whatsapp'
      ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, policy_record.tablename);
  END LOOP;
END $$;

DO $$
DECLARE
  tbl_name text;
BEGIN
  FOREACH tbl_name IN ARRAY ARRAY[
    'configuracoes',
    'categorias',
    'produtos',
    'precos_tamanho',
    'sabores',
    'mesas',
    'pedidos',
    'itens_pedido',
    'pedidos_online',
    'clientes',
    'cupons',
    'fornecedores',
    'ingredientes',
    'entradas_estoque',
    'ficha_tecnica',
    'caixa',
    'sangrias_caixa',
    'contas_pagar',
    'motoboys',
    'entregas',
    'historico_status',
    'notificacoes',
    'mensagens_whatsapp'
  ] LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = tbl_name
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (tenant_id = app.current_tenant_id())',
        tbl_name || '_tenant_select',
        tbl_name
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (tenant_id = app.current_tenant_id())',
        tbl_name || '_tenant_insert',
        tbl_name
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (tenant_id = app.current_tenant_id()) WITH CHECK (tenant_id = app.current_tenant_id())',
        tbl_name || '_tenant_update',
        tbl_name
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (tenant_id = app.current_tenant_id())',
        tbl_name || '_tenant_delete',
        tbl_name
      );
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  tbl_name text;
  rows_without_tenant bigint;
BEGIN
  FOREACH tbl_name IN ARRAY ARRAY[
    'configuracoes',
    'categorias',
    'produtos',
    'precos_tamanho',
    'sabores',
    'mesas',
    'pedidos',
    'itens_pedido',
    'pedidos_online',
    'clientes',
    'cupons',
    'fornecedores',
    'ingredientes',
    'entradas_estoque',
    'ficha_tecnica',
    'caixa',
    'sangrias_caixa',
    'contas_pagar',
    'motoboys',
    'entregas',
    'historico_status',
    'notificacoes',
    'mensagens_whatsapp'
  ] LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = tbl_name
    ) THEN
      EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id IS NULL', tbl_name)
      INTO rows_without_tenant;

      IF rows_without_tenant > 0 THEN
        RAISE WARNING 'Tabela % ainda possui % registros sem tenant_id. Backfill manual obrigatorio antes de definir NOT NULL.', tbl_name, rows_without_tenant;
      END IF;
    END IF;
  END LOOP;
END $$;
