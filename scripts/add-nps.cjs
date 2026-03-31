const { Client } = require('pg')

const client = new Client({
  connectionString: 'postgresql://postgres:Daviwendeel62@@db.kmtjfapbooqzhysllrbe.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function run() {
  console.log('Conectando...')
  await client.connect()
  console.log('Conectado!')

  try {
    await client.query('ALTER TABLE pedidos_online ADD COLUMN IF NOT EXISTS nps_nota INTEGER NULL;')
    console.log('nps_nota adicionada')
  } catch(e) {
    console.log('nps_nota:', e.message)
  }

  try {
    await client.query('ALTER TABLE pedidos_online ADD COLUMN IF NOT EXISTS nps_respondido BOOLEAN DEFAULT FALSE;')
    console.log('nps_respondido adicionada')
  } catch(e) {
    console.log('nps_respondido:', e.message)
  }

  const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'pedidos_online' AND column_name IN ('nps_nota', 'nps_respondido')")
  console.log('Colunas encontradas:', res.rows.map(r => r.column_name))

  await client.end()
  console.log('PRONTO!')
}

run().catch(e => console.error('ERRO:', e.message))
