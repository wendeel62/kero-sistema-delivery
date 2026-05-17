import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = 'https://kmtjfapbooqzhysllrbe.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'

async function applyMigration() {
  console.log('🔧 Lendo arquivo SQL da migration...')
  
  const sqlPath = join(process.cwd(), 'supabase', 'migrations', '0001_fix_rls_produtos.sql')
  const sql = readFileSync(sqlPath, 'utf-8')
  
  console.log('📄 Migration file found:', sqlPath)
  console.log('📊 Tamanho do SQL:', sql.length, 'bytes')
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('🚀 Aplicando migration no Supabase...')
  console.log('URL:', SUPABASE_URL)
  
  try {
    // Split SQL into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📋 Encontrados ${statements.length} statements SQL`)
    
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      const shortSql = statement.length > 60 ? statement.substring(0, 60) + '...' : statement
      
      try {
        // Execute via REST API using service role
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/sql',
          },
          body: statement + ';'
        })
        
        if (response.ok) {
          console.log(`✅ [${i + 1}/${statements.length}] ${shortSql}`)
          successCount++
        } else {
          const error = await response.json().catch(() => ({ message: response.statusText }))
          console.log(`❌ [${i + 1}/${statements.length}] Erro em: ${shortSql}`)
          console.log(`   Detalhes: ${JSON.stringify(error).substring(0, 150)}`)
          errorCount++
        }
      } catch (err) {
        console.log(`❌ [${i + 1}/${statements.length}] Erro crítico: ${err.message}`)
        errorCount++
      }
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log('\n' + '='.repeat(60))
    console.log(`✅ Sucesso: ${successCount} | ❌ Erros: ${errorCount}`)
    console.log('='.repeat(60))
    
    if (errorCount === 0) {
      console.log('\n🎉 Migration aplicada com sucesso!')
      console.log('Agora você pode criar produtos sem erro de RLS.')
    } else {
      console.log('\n⚠️ Alguns erros ocorreram. Verifique o SQL Editor do Supabase.')
    }
    
  } catch (err) {
    console.error('❌ Erro fatal:', err.message)
    console.error('\nAlternativa: Execute manualmente no Supabase SQL Editor:')
    console.error('1. Acesse: https://kmtjfapbooqzhysllrbe.supabase.co')
    console.error('2. Vá para SQL Editor')
    console.error('3. Copie o conteúdo de: supabase/migrations/0001_fix_rls_produtos.sql')
    console.error('4. Cole e execute')
  }
}

applyMigration().catch(console.error)
