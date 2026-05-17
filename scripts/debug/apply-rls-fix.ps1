# Script para aplicar correção RLS no Supabase
# Executar: .\apply-rls-fix.ps1

$env:SUPABASE_URL = "https://kmtjfapbooqzhysllrbe.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY"

$sql = @"
-- 1. Atualizar a função app.current_tenant_id()
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (NULLIF(auth.jwt() ->> 'tenant_id', ''))::uuid,
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
    auth.uid()
  )
$$;

-- 2. Corrigir trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, NEW.id, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop policies antigas
DROP POLICY IF EXISTS produtos_tenant_insert ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_select ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_update ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_delete ON public.produtos;

-- 4. Criar novas policies
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

-- 5. Backfill user_roles
UPDATE public.user_roles
SET tenant_id = user_id
WHERE tenant_id IS NULL;

-- Verificação
SELECT 'Correção aplicada com sucesso!' as status;
"@

try {
    Write-Host "Aplicando correção RLS no Supabase..."
    
    $response = Invoke-RestMethod -Method POST `
        -Uri "$env:SUPABASE_URL/rest/v1/query" `
        -Headers @{
            "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY
            "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
            "Content-Type" = "application/json"
            "Prefer" = "return=representation"
        } `
        -Body ($sql | ConvertTo-Json -Compress)
    
    Write-Host "Resposta do Supabase:"
    Write-Host ($response | ConvertTo-Json -Depth 10)
}
catch {
    Write-Host "Erro ao aplicar correção: $($_.Exception.Message)"
    Write-Host "Instruções manuais:"
    Write-Host "1. Acesse https://kmtjfapbooqzhysllrbe.supabase.co"
    Write-Host "2. Vá para SQL Editor"
    Write-Host "3. Cole e execute o conteúdo do arquivo fix_rls_produtos.sql"
}
