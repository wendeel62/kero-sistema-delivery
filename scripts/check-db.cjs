const { Client } = require('pg')
const fs = require('fs')
const { createPgClient } = require('./_env.cjs')

const client = createPgClient()

async function run() {
  let output = []
  
  output.push('Conectando...')
  await client.connect()
  output.push('Conectado!')
  
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
  output.push('Tabelas: ' + res.rows.map(r => r.table_name).join(', '))
  
  // Verificar colunas da tabela motoboys
  const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'motoboys' ORDER BY ordinal_position")
  output.push('\nColunas da tabela motoboys:')
  cols.rows.forEach(r => output.push(`  - ${r.column_name} (${r.data_type})`))
  
  await client.end()
  
  const result = output.join('\n')
  fs.writeFileSync('db-check.txt', result)
  console.log(result)
}

run().catch(e => {
  console.error('ERRO:', e.message)
  process.exit(1)
})
