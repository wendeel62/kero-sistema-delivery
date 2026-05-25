-- Migracao: Corrigir trigger handle_new_user_role para criar tenant_id automaticamente
-- e fazer backfill de usuarios existentes com tenant_id NULL

-- ============================================================================
-- 1. Corrigir a funcao handle_new_user_role
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Cria user_roles como admin do proprio tenant
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, NEW.id, 'admin')
  ON CONFLICT (user_id, tenant_id) DO NOTHING;

  -- Garante registro em configuracoes (tenant root)
  INSERT INTO public.configuracoes (id, tenant_id, loja_aberta, taxa_entrega, pedido_minimo)
  VALUES (NEW.id, NEW.id, false, 0, 0)
  ON CONFLICT (id) DO NOTHING;

  -- Propaga tenant_id para raw_app_meta_data (vira claim no JWT)
  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('tenant_id', NEW.id)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Backfill: usuarios existentes sem configuracoes
-- ============================================================================
INSERT INTO public.configuracoes (id, tenant_id, loja_aberta, taxa_entrega, pedido_minimo)
SELECT u.id, u.id, false, 0, 0
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.configuracoes c WHERE c.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. Backfill: user_roles com tenant_id NULL
-- ============================================================================
UPDATE public.user_roles
SET tenant_id = user_id, role = 'admin'
WHERE tenant_id IS NULL;

-- ============================================================================
-- 4. Backfill: garantir que todos usuarios auth.users tenham user_roles
-- ============================================================================
INSERT INTO public.user_roles (user_id, tenant_id, role)
SELECT u.id, u.id, 'admin'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id)
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- ============================================================================
-- 5. Backfill: raw_app_meta_data para usuarios existentes sem tenant_id
-- ============================================================================
UPDATE auth.users
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb) ||
  jsonb_build_object('tenant_id', id)
WHERE raw_app_meta_data IS NULL
   OR raw_app_meta_data->>'tenant_id' IS NULL
   OR raw_app_meta_data->>'tenant_id' = '';
