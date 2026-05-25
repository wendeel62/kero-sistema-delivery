-- Corrigir FK de tenant_id em user_roles para referenciar configuracoes(id)
-- em vez de auth.users(id)

-- 1. Drop existing FK
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_tenant_id_fkey;

-- 2. Add correct FK referencing configuracoes
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.configuracoes(id) ON DELETE CASCADE;

-- 3. Clean up orphaned records where tenant_id doesn't match any configuracoes
DELETE FROM public.user_roles
WHERE tenant_id IS NOT NULL
  AND tenant_id NOT IN (SELECT id FROM public.configuracoes);

-- 4. Ensure all user_roles have a valid tenant_id (backfill from user_id if needed)
INSERT INTO public.configuracoes (id, tenant_id, loja_aberta, taxa_entrega, pedido_minimo)
SELECT ur.user_id, ur.user_id, false, 0, 0
FROM public.user_roles ur
WHERE ur.tenant_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.configuracoes WHERE id = ur.user_id)
ON CONFLICT (id) DO NOTHING;

UPDATE public.user_roles
SET tenant_id = user_id
WHERE tenant_id IS NULL;

-- 5. Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles(tenant_id);
