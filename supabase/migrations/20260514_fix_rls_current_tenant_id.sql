-- ============================================================================
-- Fix RLS: app.current_tenant_id() and produto insertion policy
-- ============================================================================
-- PROBLEM: The INSERT RLS policy on "produtos" (and all tenant-scoped tables)
-- uses WITH CHECK (tenant_id = app.current_tenant_id()), which resolves to
-- COALESCE((NULLIF(auth.jwt() ->> 'tenant_id', ''))::uuid, auth.uid()).
--
-- If the JWT does NOT contain a 'tenant_id' claim, the function falls back to
-- auth.uid(). However, the handle_new_user_role() trigger inserts
-- tenant_id = NULL into user_roles, so the user's admin role has no tenant.
-- Also, if the frontend passes a tenant_id from user_metadata that differs
-- from auth.uid(), the RLS WITH CHECK fails because the policy expects
-- tenant_id = auth.uid() but the row has a different value.
--
-- FIX: Update app.current_tenant_id() to also consider user_roles.tenant_id
-- as a valid source, and update the INSERT policy on tenant-scoped tables to
-- allow inserts when the authenticated user is an admin for that tenant.
-- ============================================================================

-- 1. Update app.current_tenant_id() to consider user_roles.tenant_id
-- This makes the function more robust by also checking the user's role table
-- when the JWT claim is missing.
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  -- Priority 1: explicit JWT claim
  SELECT COALESCE(
    (NULLIF(auth.jwt() ->> 'tenant_id', ''))::uuid,
    -- Priority 2: tenant_id from user_roles where user is admin/editor
    (
      SELECT ur.tenant_id
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.tenant_id IS NOT NULL
        AND ur.role IN ('admin', 'super_admin', 'editor')
      ORDER BY
        CASE ur.role
          WHEN 'super_admin' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'editor' THEN 3
        END
      LIMIT 1
    ),
    -- Priority 3: fallback to auth.uid() (user IS the tenant)
    auth.uid()
  )
$$;

-- 2. Fix handle_new_user_role() to set tenant_id = NEW.id (user.id as tenant)
-- This ensures every new user has a valid tenant_id in user_roles.
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- The user IS the tenant: tenant_id = user_id
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, NEW.id, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create INSERT policies on all tenant-scoped tables to allow inserts
--    when the user is an admin/editor for that tenant (not just when
--    tenant_id matches app.current_tenant_id()).
--    This covers the case where app.current_tenant_id() might resolve to a
--    different value than the actual tenant_id being inserted.
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
    'produto_sabores',
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
    'mensagens_whatsapp',
    'historico_agente'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl_name
    ) THEN
      -- Drop old insert policy
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
        tbl_name || '_tenant_insert', tbl_name);

      -- Create new insert policy that checks:
      -- a) tenant_id matches the user's JWT claim, OR
      -- b) tenant_id matches the user's own ID (user IS the tenant), OR
      -- c) the user is an admin/editor for the given tenant_id
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (
          tenant_id = app.current_tenant_id()
          OR tenant_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.tenant_id = public.%I.tenant_id
              AND ur.role IN (''admin'', ''super_admin'', ''editor'')
          )
        )',
        tbl_name || '_tenant_insert', tbl_name, tbl_name
      );
    END IF;
  END LOOP;
END $$;

-- 4. Similarly fix UPDATE policies to allow updates by tenant admins
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
    'produto_sabores',
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
    'mensagens_whatsapp',
    'historico_agente'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl_name
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
        tbl_name || '_tenant_update', tbl_name);

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated
         USING (
           tenant_id = app.current_tenant_id()
           OR tenant_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.user_roles ur
             WHERE ur.user_id = auth.uid()
               AND ur.tenant_id = public.%I.tenant_id
               AND ur.role IN (''admin'', ''super_admin'', ''editor'')
           )
         )
         WITH CHECK (
           tenant_id = app.current_tenant_id()
           OR tenant_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.user_roles ur
             WHERE ur.user_id = auth.uid()
               AND ur.tenant_id = public.%I.tenant_id
               AND ur.role IN (''admin'', ''super_admin'', ''editor'')
           )
         )',
        tbl_name || '_tenant_update', tbl_name, tbl_name, tbl_name
      );
    END IF;
  END LOOP;
END $$;

-- 5. Fix DELETE policies similarly
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
    'produto_sabores',
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
    'mensagens_whatsapp',
    'historico_agente'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl_name
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
        tbl_name || '_tenant_delete', tbl_name);

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated
         USING (
           tenant_id = app.current_tenant_id()
           OR tenant_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.user_roles ur
             WHERE ur.user_id = auth.uid()
               AND ur.tenant_id = public.%I.tenant_id
               AND ur.role IN (''admin'', ''super_admin'', ''editor'')
           )
         )',
        tbl_name || '_tenant_delete', tbl_name, tbl_name
      );
    END IF;
  END LOOP;
END $$;

-- 6. Fix SELECT policies to allow reads by tenant admins
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
    'produto_sabores',
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
    'mensagens_whatsapp',
    'historico_agente'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl_name
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
        tbl_name || '_tenant_select', tbl_name);

      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated
         USING (
           tenant_id = app.current_tenant_id()
           OR tenant_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.user_roles ur
             WHERE ur.user_id = auth.uid()
               AND ur.tenant_id = public.%I.tenant_id
               AND ur.role IN (''admin'', ''super_admin'', ''editor'')
           )
         )',
        tbl_name || '_tenant_select', tbl_name, tbl_name
      );
    END IF;
  END LOOP;
END $$;

-- 7. Backfill user_roles: ensure all existing users have tenant_id set
-- For users who were created with the old trigger (tenant_id = NULL),
-- set tenant_id = user_id (each user is their own tenant)
UPDATE public.user_roles
SET tenant_id = user_id
WHERE tenant_id IS NULL;

-- 8. Verification
DO $$
DECLARE
  policy_count integer;
  null_tenant_count integer;
BEGIN
  -- Check policies on produtos
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'produtos' AND schemaname = 'public';

  RAISE NOTICE 'produtos RLS policies count: %', policy_count;

  -- Check for NULL tenant_id in user_roles
  SELECT COUNT(*) INTO null_tenant_count
  FROM public.user_roles
  WHERE tenant_id IS NULL;

  IF null_tenant_count > 0 THEN
    RAISE WARNING 'user_roles still has % records with NULL tenant_id!', null_tenant_count;
  ELSE
    RAISE NOTICE 'All user_roles records have tenant_id set. OK';
  END IF;
END $$;
