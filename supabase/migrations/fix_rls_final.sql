-- ============================================================================
-- CORREÇÃO RLS - APENAS ATUALIZAÇÃO DA FUNÇÃO (sem DROP)
-- Execute no SQL Editor: https://kmtjfapbooqzhysllrbe.supabase.co
-- ============================================================================

-- 1. Atualizar a função app.current_tenant_id() para NÃO causar recursão
-- Nota: Não usamos DROP, apenas REPLACE do corpo da função
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  -- Versão simplificada: apenas JWT claim e auth.uid()
  -- Evita consultar user_roles para prevenir recursão infinita
  SELECT COALESCE(
    (NULLIF(auth.jwt() ->> 'tenant_id', ''))::uuid,
    auth.uid()
  )
$$;

-- 2. Drop e recriar apenas as policies de produtos, categorias, precos_tamanho
DO $$
BEGIN
  -- Drop policies de produtos
  DROP POLICY IF EXISTS produtos_tenant_insert ON public.produtos;
  DROP POLICY IF EXISTS produtos_tenant_select ON public.produtos;
  DROP POLICY IF EXISTS produtos_tenant_update ON public.produtos;
  DROP POLICY IF EXISTS produtos_tenant_delete ON public.produtos;
  
  -- Drop policies de categorias
  DROP POLICY IF EXISTS categorias_tenant_insert ON public.categorias;
  DROP POLICY IF EXISTS categorias_tenant_select ON public.categorias;
  DROP POLICY IF EXISTS categorias_tenant_update ON public.categorias;
  DROP POLICY IF EXISTS categorias_tenant_delete ON public.categorias;
  
  -- Drop policies de precos_tamanho
  DROP POLICY IF EXISTS precos_tamanho_tenant_insert ON public.precos_tamanho;
  DROP POLICY IF EXISTS precos_tamanho_tenant_select ON public.precos_tamanho;
  DROP POLICY IF EXISTS precos_tamanho_tenant_update ON public.precos_tamanho;
  DROP POLICY IF EXISTS precos_tamanho_tenant_delete ON public.precos_tamanho;
END $$;

-- 3. Criar novas policies para produtos
CREATE POLICY produtos_tenant_insert ON public.produtos FOR INSERT TO authenticated WITH CHECK (
  tenant_id = auth.uid()
);

CREATE POLICY produtos_tenant_select ON public.produtos FOR SELECT TO authenticated USING (
  tenant_id = auth.uid()
);

CREATE POLICY produtos_tenant_update ON public.produtos FOR UPDATE TO authenticated 
USING (tenant_id = auth.uid())
WITH CHECK (tenant_id = auth.uid());

CREATE POLICY produtos_tenant_delete ON public.produtos FOR DELETE TO authenticated USING (
  tenant_id = auth.uid()
);

-- 4. Criar novas policies para categorias
CREATE POLICY categorias_tenant_insert ON public.categorias FOR INSERT TO authenticated WITH CHECK (
  tenant_id = auth.uid()
);

CREATE POLICY categorias_tenant_select ON public.categorias FOR SELECT TO authenticated USING (
  tenant_id = auth.uid()
);

CREATE POLICY categorias_tenant_update ON public.categorias FOR UPDATE TO authenticated 
USING (tenant_id = auth.uid())
WITH CHECK (tenant_id = auth.uid());

CREATE POLICY categorias_tenant_delete ON public.categorias FOR DELETE TO authenticated USING (
  tenant_id = auth.uid()
);

-- 5. Criar novas policies para precos_tamanho
CREATE POLICY precos_tamanho_tenant_insert ON public.precos_tamanho FOR INSERT TO authenticated WITH CHECK (
  tenant_id = auth.uid()
);

CREATE POLICY precos_tamanho_tenant_select ON public.precos_tamanho FOR SELECT TO authenticated USING (
  tenant_id = auth.uid()
);

CREATE POLICY precos_tamanho_tenant_update ON public.precos_tamanho FOR UPDATE TO authenticated 
USING (tenant_id = auth.uid())
WITH CHECK (tenant_id = auth.uid());

CREATE POLICY precos_tamanho_tenant_delete ON public.precos_tamanho FOR DELETE TO authenticated USING (
  tenant_id = auth.uid()
);

-- 6. Verificação
SELECT 'Correção RLS aplicada com sucesso!' as status;
SELECT COUNT(*) as policies_count FROM pg_policies WHERE tablename IN ('produtos', 'categorias', 'precos_tamanho');
