-- Migração unificada: políticas RLS para todas as tabelas multi-tenant
-- Substitui: fix_rls_produtos, 0001_fix_rls_produtos, fix_rls_final,
-- 20260514_fix_rls_current_tenant_id, 20260417_complete_rls_policies

-- ============================================================================
-- Função centralizada de resolução de tenant_id
-- ============================================================================
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (NULLIF(auth.jwt() ->> 'tenant_id', ''))::uuid,
    (
      SELECT ur.tenant_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.tenant_id IS NOT NULL
        AND ur.role IN ('admin', 'super_admin', 'editor')
      ORDER BY CASE ur.role WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2 WHEN 'editor' THEN 3 END
      LIMIT 1
    ),
    auth.uid()
  )
$$;

-- ============================================================================
-- Produtos
-- ============================================================================
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS produtos_tenant_insert ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_select ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_update ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_delete ON public.produtos;

CREATE POLICY produtos_tenant_insert ON public.produtos FOR INSERT TO authenticated
  WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY produtos_tenant_select ON public.produtos FOR SELECT TO authenticated
  USING (tenant_id = app.current_tenant_id());
CREATE POLICY produtos_tenant_update ON public.produtos FOR UPDATE TO authenticated
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY produtos_tenant_delete ON public.produtos FOR DELETE TO authenticated
  USING (tenant_id = app.current_tenant_id());

-- ============================================================================
-- Categorias
-- ============================================================================
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categorias_tenant_insert ON public.categorias;
DROP POLICY IF EXISTS categorias_tenant_select ON public.categorias;
DROP POLICY IF EXISTS categorias_tenant_update ON public.categorias;
DROP POLICY IF EXISTS categorias_tenant_delete ON public.categorias;

CREATE POLICY categorias_tenant_insert ON public.categorias FOR INSERT TO authenticated
  WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY categorias_tenant_select ON public.categorias FOR SELECT TO authenticated
  USING (tenant_id = app.current_tenant_id());
CREATE POLICY categorias_tenant_update ON public.categorias FOR UPDATE TO authenticated
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY categorias_tenant_delete ON public.categorias FOR DELETE TO authenticated
  USING (tenant_id = app.current_tenant_id());

-- ============================================================================
-- Precos tamanho
-- ============================================================================
ALTER TABLE public.precos_tamanho ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS precos_tamanho_tenant_insert ON public.precos_tamanho;
DROP POLICY IF EXISTS precos_tamanho_tenant_select ON public.precos_tamanho;
DROP POLICY IF EXISTS precos_tamanho_tenant_update ON public.precos_tamanho;
DROP POLICY IF EXISTS precos_tamanho_tenant_delete ON public.precos_tamanho;

CREATE POLICY precos_tamanho_tenant_insert ON public.precos_tamanho FOR INSERT TO authenticated
  WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY precos_tamanho_tenant_select ON public.precos_tamanho FOR SELECT TO authenticated
  USING (tenant_id = app.current_tenant_id());
CREATE POLICY precos_tamanho_tenant_update ON public.precos_tamanho FOR UPDATE TO authenticated
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY precos_tamanho_tenant_delete ON public.precos_tamanho FOR DELETE TO authenticated
  USING (tenant_id = app.current_tenant_id());

-- ============================================================================
-- Pedidos
-- ============================================================================
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pedidos_tenant_insert ON public.pedidos;
DROP POLICY IF EXISTS pedidos_tenant_select ON public.pedidos;
DROP POLICY IF EXISTS pedidos_tenant_update ON public.pedidos;
DROP POLICY IF EXISTS pedidos_tenant_delete ON public.pedidos;

CREATE POLICY pedidos_tenant_insert ON public.pedidos FOR INSERT TO authenticated
  WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY pedidos_tenant_select ON public.pedidos FOR SELECT TO authenticated
  USING (tenant_id = app.current_tenant_id());
CREATE POLICY pedidos_tenant_update ON public.pedidos FOR UPDATE TO authenticated
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY pedidos_tenant_delete ON public.pedidos FOR DELETE TO authenticated
  USING (tenant_id = app.current_tenant_id());

-- ============================================================================
-- Itens pedido
-- ============================================================================
ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS itens_pedido_tenant_insert ON public.itens_pedido;
DROP POLICY IF EXISTS itens_pedido_tenant_select ON public.itens_pedido;
DROP POLICY IF EXISTS itens_pedido_tenant_update ON public.itens_pedido;
DROP POLICY IF EXISTS itens_pedido_tenant_delete ON public.itens_pedido;

CREATE POLICY itens_pedido_tenant_insert ON public.itens_pedido FOR INSERT TO authenticated
  WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY itens_pedido_tenant_select ON public.itens_pedido FOR SELECT TO authenticated
  USING (tenant_id = app.current_tenant_id());
CREATE POLICY itens_pedido_tenant_update ON public.itens_pedido FOR UPDATE TO authenticated
  USING (tenant_id = app.current_tenant_id())
  WITH CHECK (tenant_id = app.current_tenant_id());
CREATE POLICY itens_pedido_tenant_delete ON public.itens_pedido FOR DELETE TO authenticated
  USING (tenant_id = app.current_tenant_id());

-- ============================================================================
-- Indexes para performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_produtos_tenant_id ON public.produtos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categorias_tenant_id ON public.categorias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_precos_tamanho_tenant_id ON public.precos_tamanho(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant_id ON public.pedidos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_tenant_id ON public.itens_pedido(tenant_id);
