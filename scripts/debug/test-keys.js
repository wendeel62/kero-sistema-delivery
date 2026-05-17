import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars. Be sure to run this with dotenv: node --env-file=.env test.js")
  process.exit(1)
}

// We can just use the anon key. If it fails due to RLS, we can print the error. 
// But wait, the admin user has bypass RLS because we set their role or we can login
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function test() {
  console.log("Logging in as wendeel62@outlook.com...")
  await supabase.auth.signInWithPassword({
    email: 'wendeel62@outlook.com',
    password: 'Daviwendeel62@'
  })

  // query the table to get the shape
  console.log("Querying configuracoes...")
  const { data, error } = await supabase.from('configuracoes').select('*').limit(1)

  if (error) {
    console.error("Query Error:", error)
  } else {
    if (data && data.length > 0) {
      console.log("Column keys:", Object.keys(data[0]))
    } else {
      console.log("No data returned, cannot infer columns. Try inserting or getting definition another way.")
    }
  }
}

test()
