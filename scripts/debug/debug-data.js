import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debugData() {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('id, nome_loja, slug, tenant_id')
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Configs in DB:', data)
  }
}

debugData()
