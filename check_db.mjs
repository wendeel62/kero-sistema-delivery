import { createPgClient } from './scripts/_env.mjs';

async function checkRPC() {
  const client = createPgClient()

  try {
    await client.connect()
    const ping = await client.query('SELECT 1 AS ok')
    const tablesCheck = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename")

    console.log('✅ Banco conectado:', ping.rows[0])
    console.log('Tabelas encontradas:', tablesCheck.rows.map((row) => row.tablename))
  } catch (e) {
    console.error('❌ Erro na conexão:', e.message);
  } finally {
    await client.end().catch(() => undefined)
  }
}

checkRPC();
