import { createPgClient } from './_env.mjs'

async function addNpsColumns() {
  const client = createPgClient()

  console.log('Adicionando colunas NPS na tabela pedidos_online...')
  await client.connect()

  try {
    await client.query('ALTER TABLE pedidos_online ADD COLUMN IF NOT EXISTS nps_nota INTEGER NULL;')
    await client.query('ALTER TABLE pedidos_online ADD COLUMN IF NOT EXISTS nps_respondido BOOLEAN DEFAULT FALSE;')

    const result = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'pedidos_online' AND column_name IN ('nps_nota', 'nps_respondido') ORDER BY column_name"
    )

    console.log('Colunas prontas:', result.rows.map((row) => row.column_name))
  } finally {
    await client.end()
  }
}

addNpsColumns().catch(console.error)
