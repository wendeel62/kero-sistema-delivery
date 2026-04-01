import { Client } from 'pg'

export function requireEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Variavel obrigatoria ausente: ${name}`)
  }
  return value
}

export function createPgClient() {
  return new Client({
    connectionString: requireEnv('SUPABASE_DB_URL'),
    ssl: { rejectUnauthorized: false },
  })
}
