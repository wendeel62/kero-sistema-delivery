import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSchema() {
  const { data, error } = await supabase.rpc('inspect_table_columns', { p_table_name: 'configuracoes' })
  if (error) {
    // Falls back to direct query if inspect_table_columns RPC doesn't exist
    const { data: cols, error: err2 } = await supabase
      .from('configuracoes')
      .select('*')
      .limit(1)
    
    if (err2) {
      console.error('Error fetching configuracoes:', err2)
    } else {
      console.log('Columns in configuracoes:', Object.keys(cols[0] || {}))
    }
  } else {
    console.log('Table schema:', data)
  }
}

checkSchema()
