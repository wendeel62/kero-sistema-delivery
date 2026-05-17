import { Client } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

const client = new Client({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY',
  password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY',
  ssl: { rejectUnauthorized: false }
})

async function applyMigration() {
  console.log('🔧 Lendo arquivo SQL...')
  const sqlPath = join(process.cwd(), 'supabase', 'migrations', '0001_fix_rls_produtos.sql')
  const sql = readFileSync(sqlPath, 'utf-8')
  console.log('📄 SQL lido:', sql.length, 'bytes')



  try {
    console.log('🔗 Conectando ao Supabase...')
    await client.connect()
    console.log('✅ Conectado!')

    console.log('🚀 Executando migration...')
    
    // Split by semicolons but keep multi-line statements intact
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`📋 ${statements.length} statements encontrados\n`)
    
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (!statement) continue
      
      const shortSql = statement.replace(/\s+/g, ' ').substring(0, 80)
      
      try {
        await client.query(statement)
        console.log(`✅ [${i + 1}/${statements.length}] ${shortSql}...`)
        successCount++
      } catch (err) {
        console.log(`❌ [${i + 1}/${statements.length}] Erro: ${shortSql}...`)
        console.log(`   ${err.message}`)
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log(`✅ Sucesso: ${successCount} | ❌ Erros: ${errorCount}`)
    console.log('='.repeat(60))

    if (errorCount === 0) {
      console.log('\n🎉 Migration aplicada com sucesso!')
      console.log('Agora você pode criar produtos sem erro de RLS.')
    } else {
      console.log('\n⚠️ Alguns erros ocorreram.')
    }

  } catch (err) {
    console.error('❌ Erro fatal:', err.message)
  } finally {
    await client.end()
    console.log('\n🔌 Conexão encerrada.')
  }
}

applyMigration().catch(console.error)
