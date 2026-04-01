const { Client } = require('pg')
const fs = require('fs')
const { createPgClient } = require('./_env.cjs')

const client = createPgClient()

async function run() {
  await client.connect()
  console.log('Conectado!')

  // Verificar colunas da tabela pedidos
  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'pedidos' 
    ORDER BY ordinal_position
  `)
  console.log('Colunas da tabela pedidos:')
  cols.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`))

  // Verificar se motoboy_id existe
  const hasMotoboyId = cols.rows.some(r => r.column_name === 'motoboy_id')
  console.log('\nTem motoboy_id?', hasMotoboyId)

  // Adicionar motoboy_id se não existir
  if (!hasMotoboyId) {
    await client.query('ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS motoboy_id UUID REFERENCES motoboys(id)')
    console.log('Coluna motoboy_id adicionada!')
  }

  // Verificar colunas da tabela motoboys
  const motCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'motoboys' 
    ORDER BY ordinal_position
  `)
  console.log('\nColunas da tabela motoboys:')
  motCols.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`))

  // Verificar se disponivel existe
  const hasDisponivel = motCols.rows.some(r => r.column_name === 'disponivel')
  console.log('\nTem disponivel?', hasDisponivel)

  // Adicionar disponivel se não existir
  if (!hasDisponivel) {
    await client.query('ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS disponivel BOOLEAN DEFAULT true')
    console.log('Coluna disponivel adicionada!')
  }

  await client.end()
  console.log('\nPRONTO!')
}

run().catch(e => console.error('ERRO:', e.message))
