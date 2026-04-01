import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { createPgClient, requireEnv } from './_env.mjs'

const supabaseUrl = requireEnv('SUPABASE_URL')
const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  const client = createPgClient()
  const sql = await readFile(new URL('./mensagens_whatsapp.sql', import.meta.url), 'utf8')

  console.log('Aplicando migration local de mensagens_whatsapp...')
  await client.connect()

  try {
    await client.query(sql)
    const { error } = await supabase.from('mensagens_whatsapp').select('id').limit(1)
    if (!error || error.code === 'PGRST116') {
      console.log('Tabela mensagens_whatsapp pronta para uso!')
    } else {
      console.log('Tabela criada, mas a validacao retornou:', error.message)
    }
  } finally {
    await client.end()
  }
}

main()
