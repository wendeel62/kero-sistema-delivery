-- Complete RLS policies for all tables
-- This migration ensures all tables have proper RLS policies

-- Enable RLS on new tables that might not have it
DO $$
DECLARE
  tbl_name text;
BEGIN
  FOREACH tbl_name IN ARRAY ARRAY[
    'user_profiles',
    'audit_logs',
    'vault'
  ] LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = tbl_name
    ) THEN
      -- Enable RLS
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_name);
    END IF;
  END LOOP;
END $$;

-- Create policies for tables that don't have all operations covered

-- user_profiles: user can only see their own profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'user_profiles_select_own' AND tablename = 'user_profiles'
  ) THEN
    CREATE POLICY "user_profiles_select_own" ON public.user_profiles
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- vault: only tenant can access their secrets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'vault_tenant_select' AND tablename = 'vault'
  ) THEN
    CREATE POLICY "vault_tenant_select" ON public.vault
      FOR SELECT
      TO authenticated
      USING (tenant_id = app.current_tenant_id());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'vault_tenant_insert' AND tablename = 'vault'
  ) THEN
    CREATE POLICY "vault_tenant_insert" ON public.vault
      FOR INSERT
      TO authenticated
      WITH CHECK (tenant_id = app.current_tenant_id());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'vault_tenant_update' AND tablename = 'vault'
  ) THEN
    CREATE POLICY "vault_tenant_update" ON public.vault
      FOR UPDATE
      TO authenticated
      USING (tenant_id = app.current_tenant_id())
      WITH CHECK (tenant_id = app.current_tenant_id());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'vault_tenant_delete' AND tablename = 'vault'
  ) THEN
    CREATE POLICY "vault_tenant_delete" ON public.vault
      FOR DELETE
      TO authenticated
      USING (tenant_id = app.current_tenant_id());
  END IF;
END $$;

-- audit_logs: only admins can see
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'audit_logs_admin_select' AND tablename = 'audit_logs'
  ) THEN
    CREATE POLICY "audit_logs_admin_select" ON public.audit_logs
      FOR SELECT
      TO authenticated
      USING (
        tenant_id = app.current_tenant_id()
        AND auth.jwt() ->> 'role' IN ('admin', 'super_admin')
      );
  END IF;
END $$;

-- Final verification
DO $$
DECLARE
  tbl_name text;
  missing_policy text;
BEGIN
  RAISE NOTICE 'RLS Policy Verification:';
  
  FOREACH tbl_name IN ARRAY ARRAY[
    'configuracoes',
    'categorias',
    'produtos',
    'clientes',
    'pedidos',
    'pedidos_online',
    'ingredientes',
    'fornecedores',
    'caixa',
    'contas_pagar',
    'motoboys',
    'mesas',
    'cupons',
    'historico_agente',
    'user_roles',
    'user_profiles',
    'audit_logs',
    'vault'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tbl_name
    ) THEN
      RAISE NOTICE '  %: OK', tbl_name;
    ELSE
      RAISE WARNING '  %: MISSING POLICIES', tbl_name;
    END IF;
  END LOOP;
END $$;