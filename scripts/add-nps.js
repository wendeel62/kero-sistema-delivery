const { Client } = require('pg')

const client = new Client({
  connectionString: 'postgresql://postgres:Daviwendeel62@@db.kmtjfapbooqzhysllrbe.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function run() {
  try {
    console.log('Conectando ao Supabase...')
    await client.connect()
    console.log('Conectado!')

    console.log('Adicionando coluna nps_nota...')
    await client.query('ALTER TABLE pedidos_online ADD COLUMN IF NOT EXISTS nps_nota INTEGER NULL;')
    
    console.log('Adicionando coluna nps_respondido...')
    await client.query('ALTER TABLE pedidos_online ADD COLUMN IF NOT EXISTS nps_respondido BOOLEAN DEFAULT FALSE;')
    
    console.log('Verificando colunas...')
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pedidos_online' AND column_name IN ('nps_nota', 'nps_respondido')")
    console.log('Colunas encontradas:', res.rows)
    
    await client.end()
    console.log('SUCESSO! Colunas NPS adicionadas à tabela pedidos_online.')
  } catch(e) {
    console.error('Erro:', e.message)
    process.exit(1)
  }
}

run()
