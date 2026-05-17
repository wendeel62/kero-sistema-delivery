-- ============================================================================
-- CORREÇÃO RLS PARA PRODUTOS
-- Execute este SQL no Supabase SQL Editor: https://kmtjfapbooqzhysllrbe.supabase.co
-- ============================================================================

-- 1. Drop policies antigas da tabela produtos
DROP POLICY IF EXISTS produtos_tenant_insert ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_select ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_update ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_delete ON public.produtos;

-- 2. Drop policies antigas de outras tabelas que podem ter o mesmo problema
DROP POLICY IF EXISTS categorias_tenant_insert ON public.categorias;
DROP POLICY IF EXISTS categorias_tenant_select ON public.categorias;
DROP POLICY IF EXISTS categorias_tenant_update ON public.categorias;
DROP POLICY IF EXISTS categorias_tenant_delete ON public.categorias;

DROP POLICY IF EXISTS precos_tamanho_tenant_insert ON public.precos_tamanho;
DROP POLICY IF EXISTS precos_tamanho_tenant_select ON public.precos_tamanho;
DROP POLICY IF EXISTS precos_tamanho_tenant_update ON public.precos_tamanho;
DROP POLICY IF EXISTS precos_tamanho_tenant_delete ON public.precos_tamanho;

-- 3. Criar nova função app.current_tenant_id() mais flexível
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    -- Prioridade 1: claim explícito no JWT
    (NULLIF(auth.jwt() ->> 'tenant_id', ''))::uuid,
    -- Prioridade 2: tenant_id da tabela user_roles (admin/editor)
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
    -- Prioridade 3: fallback para auth.uid() (usuário É o tenant)
    auth.uid()
  )
$$;

-- 4. Criar novas policies para produtos (permite se user é admin do tenant)
CREATE POLICY produtos_tenant_insert ON public.produtos
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = auth.uid()
  OR tenant_id = app.current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_id
      AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

CREATE POLICY produtos_tenant_select ON public.produtos
FOR SELECT TO authenticated
USING (
  tenant_id = auth.uid()
  OR tenant_id = app.current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_id
      AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

CREATE POLICY produtos_tenant_update ON public.produtos
FOR UPDATE TO authenticated
USING (
  tenant_id = auth.uid()
  OR tenant_id = app.current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_id
      AND ur.role IN ('admin', 'super_admin', 'editor')
  )
)
WITH CHECK (
  tenant_id = auth.uid()
  OR tenant_id = app.current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_id
      AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

CREATE POLICY produtos_tenant_delete ON public.produtos
FOR DELETE TO authenticated
USING (
  tenant_id = auth.uid()
  OR tenant_id = app.current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_id
      AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

-- 5. Criar policies para categorias
CREATE POLICY categorias_tenant_insert ON public.categorias
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = auth.uid()
  OR tenant_id = app.current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_id
      AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

CREATE POLICY categorias_tenant_select ON public.categorias
FOR SELECT TO authenticated
USING (
  tenant_id = auth.uid()
  OR tenant_id = app.current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_id
      AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

CREATE POLICY categorias_tenant_update ON public.categorias
FOR UPDATE TO authenticated
USING (
  tenant_id = auth.uid()
  OR tenant_id = app.current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_id
      AND ur.role IN ('admin', 'super_admin', 'editor')
  )
)
WITH CHECK (
  tenant_id = auth.uid()
  OR tenant_id = app.current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_id
      AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

CREATE POLICY categorias_tenant_delete ON public.categorias
FOR DELETE TO authenticated
USING (
  tenant_id = auth.uid()
  OR tenant_id = app.current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_id
      AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

-- 6. Criar policies para precos_tamanho
CREATE POLICY precos_tamanho_tenant_insert ON public.precos_tamanho
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = auth.uid()
  OR tenant_id = app.current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_id
      AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

CREATE POLICY precos_tamanho_tenant_select ON public.precos_tamanho
FOR SELECT TO authenticated
USING (
  tenant_id = auth.uid()
  OR tenant_id = app.current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_id
      AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

CREATE POLICY precos_tamanho_tenant_update ON public.precos_tamanho
FOR UPDATE TO authenticated
USING (
  tenant_id = auth.uid()
  OR tenant_id = app.current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_id
      AND ur.role IN ('admin', 'super_admin', 'editor')
  )
)
WITH CHECK (
  tenant_id = auth.uid()
  OR tenant_id = app.current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_id
      AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

CREATE POLICY precos_tamanho_tenant_delete ON public.precos_tamanho
FOR DELETE TO authenticated
USING (
  tenant_id = auth.uid()
  OR tenant_id = app.current_tenant_id()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = tenant_id
      AND ur.role IN ('admin', 'super_admin', 'editor')
  )
);

-- 7. Backfill: garantir que todos user_roles tenham tenant_id
UPDATE public.user_roles
SET tenant_id = user_id
WHERE tenant_id IS NULL;

-- Verificação
SELECT 'Correção RLS aplicada com sucesso!' as status;
SELECT COUNT(*) as user_roles_com_tenant_null 
FROM public.user_roles 
WHERE tenant_id IS NULL;
