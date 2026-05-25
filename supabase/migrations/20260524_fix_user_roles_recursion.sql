-- Migracao: Corrigir recursao infinita na politica RLS "Tenant Admins view staff"
--
-- PROBLEMA: A politica antiga fazia subconsulta em public.user_roles DENTRO
-- de uma politica RLS da MESMA tabela. O PostgreSQL detecta a recursao e
-- retorna erro 500.
--
-- SOLUCAO: Criar funcao SECURITY DEFINER (bypassa RLS) para verificar se
-- o usuario atual e admin/super_admin de um tenant. A politica RLS chama
-- esta funcao em vez de fazer subconsulta direta.

-- ============================================================================
-- 1. Funcao auxiliar SECURITY DEFINER (bypassa RLS)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_tenant_admin_safe(t_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
      AND tenant_id IS NOT NULL
      AND (t_id IS NULL OR tenant_id = t_id)
  )
$$;

-- ============================================================================
-- 2. Substituir politica recursiva
-- ============================================================================
DROP POLICY IF EXISTS "Tenant Admins view staff" ON public.user_roles;

CREATE POLICY "Tenant Admins view staff" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    public.is_tenant_admin_safe(public.user_roles.tenant_id)
  );
