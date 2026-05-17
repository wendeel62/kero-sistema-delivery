import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kmtjfapbooqzhysllrbe.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'

const sqlStatements = [
  // 1. Drop old policies
  'DROP POLICY IF EXISTS produtos_tenant_insert ON public.produtos',
  'DROP POLICY IF EXISTS produtos_tenant_select ON public.produtos',
  'DROP POLICY IF EXISTS produtos_tenant_update ON public.produtos',
  'DROP POLICY IF EXISTS produtos_tenant_delete ON public.produtos',
  
  'DROP POLICY IF EXISTS categorias_tenant_insert ON public.categorias',
  'DROP POLICY IF EXISTS categorias_tenant_select ON public.categorias',
  'DROP POLICY IF EXISTS categorias_tenant_update ON public.categorias',
  'DROP POLICY IF EXISTS categorias_tenant_delete ON public.categorias',
  
  'DROP POLICY IF EXISTS precos_tamanho_tenant_insert ON public.precos_tamanho',
  'DROP POLICY IF EXISTS precos_tamanho_tenant_select ON public.precos_tamanho',
  'DROP POLICY IF EXISTS precos_tamanho_tenant_update ON public.precos_tamanho',
  'DROP POLICY IF EXISTS precos_tamanho_tenant_delete ON public.precos_tamanho',

  // 2. Create function
  `CREATE OR REPLACE FUNCTION app.current_tenant_id()
  RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT COALESCE(
      (NULLIF(auth.jwt() ->> 'tenant_id', ''))::uuid,
      (SELECT ur.tenant_id FROM public.user_roles ur 
       WHERE ur.user_id = auth.uid() AND ur.tenant_id IS NOT NULL 
       AND ur.role IN ('admin', 'super_admin', 'editor')
       ORDER BY CASE ur.role WHEN 'super_admin' THEN 1 WHEN 'admin' THEN 2 WHEN 'editor' THEN 3 END LIMIT 1),
      auth.uid()
    )
  $$`,

  // 3. Create policies for produtos
  `CREATE POLICY produtos_tenant_insert ON public.produtos FOR INSERT TO authenticated WITH CHECK (
    tenant_id = auth.uid() 
    OR tenant_id = app.current_tenant_id() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
      AND ur.role IN ('admin', 'super_admin', 'editor')
    )
  )`,

  `CREATE POLICY produtos_tenant_select ON public.produtos FOR SELECT TO authenticated USING (
    tenant_id = auth.uid() 
    OR tenant_id = app.current_tenant_id() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
      AND ur.role IN ('admin', 'super_admin', 'editor')
    )
  )`,

  `CREATE POLICY produtos_tenant_update ON public.produtos FOR UPDATE TO authenticated 
  USING (
    tenant_id = auth.uid() 
    OR tenant_id = app.current_tenant_id() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
      AND ur.role IN ('admin', 'super_admin', 'editor')
    )
  )
  WITH CHECK (
    tenant_id = auth.uid() 
    OR tenant_id = app.current_tenant_id() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
      AND ur.role IN ('admin', 'super_admin', 'editor')
    )
  )`,

  `CREATE POLICY produtos_tenant_delete ON public.produtos FOR DELETE TO authenticated USING (
    tenant_id = auth.uid() 
    OR tenant_id = app.current_tenant_id() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
      AND ur.role IN ('admin', 'super_admin', 'editor')
    )
  )`,

  // 4. Create policies for categorias
  `CREATE POLICY categorias_tenant_insert ON public.categorias FOR INSERT TO authenticated WITH CHECK (
    tenant_id = auth.uid() 
    OR tenant_id = app.current_tenant_id() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
      AND ur.role IN ('admin', 'super_admin', 'editor')
    )
  )`,

  `CREATE POLICY categorias_tenant_select ON public.categorias FOR SELECT TO authenticated USING (
    tenant_id = auth.uid() 
    OR tenant_id = app.current_tenant_id() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
      AND ur.role IN ('admin', 'super_admin', 'editor')
    )
  )`,

  `CREATE POLICY categorias_tenant_update ON public.categorias FOR UPDATE TO authenticated 
  USING (
    tenant_id = auth.uid() 
    OR tenant_id = app.current_tenant_id() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
      AND ur.role IN ('admin', 'super_admin', 'editor')
    )
  )
  WITH CHECK (
    tenant_id = auth.uid() 
    OR tenant_id = app.current_tenant_id() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
      AND ur.role IN ('admin', 'super_admin', 'editor')
    )
  )`,

  `CREATE POLICY categorias_tenant_delete ON public.categorias FOR DELETE TO authenticated USING (
    tenant_id = auth.uid() 
    OR tenant_id = app.current_tenant_id() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
      AND ur.role IN ('admin', 'super_admin', 'editor')
    )
  )`,

  // 5. Create policies for precos_tamanho
  `CREATE POLICY precos_tamanho_tenant_insert ON public.precos_tamanho FOR INSERT TO authenticated WITH CHECK (
    tenant_id = auth.uid() 
    OR tenant_id = app.current_tenant_id() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
      AND ur.role IN ('admin', 'super_admin', 'editor')
    )
  )`,

  `CREATE POLICY precos_tamanho_tenant_select ON public.precos_tamanho FOR SELECT TO authenticated USING (
    tenant_id = auth.uid() 
    OR tenant_id = app.current_tenant_id() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
      AND ur.role IN ('admin', 'super_admin', 'editor')
    )
  )`,

  `CREATE POLICY precos_tamanho_tenant_update ON public.precos_tamanho FOR UPDATE TO authenticated 
  USING (
    tenant_id = auth.uid() 
    OR tenant_id = app.current_tenant_id() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
      AND ur.role IN ('admin', 'super_admin', 'editor')
    )
  )
  WITH CHECK (
    tenant_id = auth.uid() 
    OR tenant_id = app.current_tenant_id() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
      AND ur.role IN ('admin', 'super_admin', 'editor')
    )
  )`,

  `CREATE POLICY precos_tamanho_tenant_delete ON public.precos_tamanho FOR DELETE TO authenticated USING (
    tenant_id = auth.uid() 
    OR tenant_id = app.current_tenant_id() 
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.tenant_id = tenant_id 
      AND ur.role IN ('admin', 'super_admin', 'editor')
    )
  )`,

  // 6. Backfill
  'UPDATE public.user_roles SET tenant_id = user_id WHERE tenant_id IS NULL',
]

async function applyFix() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('🔧 Aplicando correção RLS no Supabase...\n')
  
  let successCount = 0
  let errorCount = 0

  for (const sql of sqlStatements) {
    const shortSql = sql.length > 60 ? sql.substring(0, 60) + '...' : sql
    
    try {
      // Try using REST API with service role
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ sql_query: sql })
      })

      if (response.ok) {
        console.log(`✅ OK: ${shortSql}`)
        successCount++
      } else {
        const error = await response.json()
        console.log(`❌ Erro em: ${shortSql} - ${JSON.stringify(error).substring(0, 100)}`)
        errorCount++
      }
    } catch (err) {
      console.log(`❌ Erro crítico em: ${shortSql} - ${err.message}`)
      errorCount++
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ Sucesso: ${successCount} | ❌ Erros: ${errorCount}`)
  console.log('='.repeat(50))
  
  if (errorCount === 0) {
    console.log('\n🎉 Correção RLS aplicada com sucesso!')
    console.log('Agora você pode criar produtos sem erro de RLS.')
  } else {
    console.log('\n⚠️ Alguns erros ocorreram. Verifique o SQL Editor do Supabase.')
  }
}

applyFix().catch(console.error)
