const { Client } = require('pg')
const fs = require('fs')

const client = new Client({
  connectionString: 'postgresql://postgres:Daviwendeel62@@db.kmtjfapbooqzhysllrbe.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function run() {
  await client.connect()
  console.log('Conectado!')

  // Verificar constraint atual
  const res = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) as definition 
    FROM pg_constraint 
    WHERE conrelid = 'pedidos'::regclass 
    AND contype = 'c'
  `)
  
  console.log('Constraints atuais da tabela pedidos:')
  res.rows.forEach(r => console.log(`  ${r.conname}: ${r.definition}`))

  // Remover constraint antiga de status se existir
  try {
    await client.query('ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_status_check')
    console.log('Constraint antiga removida')
  } catch(e) {
    console.log('Erro ao remover constraint:', e.message)
  }

  // Criar nova constraint com todos os status necessários
  await client.query(`
    ALTER TABLE pedidos 
    ADD CONSTRAINT pedidos_status_check 
    CHECK (status IN ('pendente', 'aberto', 'confirmado', 'preparando', 'pronto', 'saiu_entrega', 'entregue', 'cancelado'))
  `)
  console.log('Nova constraint criada com sucesso!')

  // Verificar se foi criada
  const res2 = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) as definition 
    FROM pg_constraint 
    WHERE conrelid = 'pedidos'::regclass 
    AND conname = 'pedidos_status_check'
  `)
  
  console.log('\nNova constraint:')
  res2.rows.forEach(r => console.log(`  ${r.conname}: ${r.definition}`))

  await client.end()
  console.log('\nPRONTO!')
}

run().catch(e => console.error('ERRO:', e.message))
