const { Client } = require('pg')

function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variavel obrigatoria ausente: ${name}`)
  }
  return value
}

function createPgClient() {
  return new Client({
    connectionString: requireEnv('SUPABASE_DB_URL'),
    ssl: { rejectUnauthorized: false },
  })
}

module.exports = {
  createPgClient,
  requireEnv,
}
