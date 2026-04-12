import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function test() {
  await supabase.auth.signInWithPassword({
    email: 'wendeel62@outlook.com',
    password: 'Daviwendeel62@'
  })

  // Try to use rpc to get information_schema
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'configuracoes'"
  })

  if (error) {
    console.error("RPC Error:", error.message)
    // If rpc fails, we are stuck for querying schema directly.
  } else {
    console.log("Configuracoes Columns:", data)
  }
}

test()
