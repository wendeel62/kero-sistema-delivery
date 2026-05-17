import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kmtjfapbooqzhysllrbe.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'

const sql = `
-- 1. Drop policies antigas
DROP POLICY IF EXISTS produtos_tenant_insert ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_select ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_update ON public.produtos;
DROP POLICY IF EXISTS produtos_tenant_delete ON public.produtos;

-- 2. Criar nova função app.current_tenant_id()
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

-- 3. Criar novas policies
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

-- 4. Backfill user_roles
UPDATE public.user_roles SET tenant_id = user_id WHERE tenant_id IS NULL;

-- Verificação
SELECT 'Correção aplicada com sucesso!' as status;
`

async function applyFix() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('Aplicando correção RLS...')
  
  // Dividir SQL em statements individuais
  const statements = sql.split(';').filter(s => s.trim().length > 0)
  
  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec', { sql_command: statement.trim() })
      if (error) {
        console.error(`Erro: ${error.message}`)
      } else {
        console.log(`OK: ${statement.trim().substring(0, 50)}...`)
      }
    } catch (err) {
      console.error(`Erro crítico: ${err}`)
    }
  }
  
  console.log('Correção aplicada!')
}

applyFix().catch(console.error)
