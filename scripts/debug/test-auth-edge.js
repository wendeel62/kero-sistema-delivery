import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars. Be sure to run this with dotenv: node --env-file=.env test.js")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function test() {
  console.log("Logging in as wendeel62@outlook.com...")
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'wendeel62@outlook.com',
    password: 'Daviwendeel62@'
  })

  if (authError || !authData.session) {
    console.error("Login failed:", authError)
    process.exit(1)
  }

  console.log("Login successful! Got token.")

  console.log("Calling Edge Function: admin-dashboard-data")
  try {
    const { data, error } = await supabase.functions.invoke('admin-dashboard-data')

    if (error) {
      console.log("Returned Error object:", error)
      console.log("Error context:", error.context ? await error.context.text() : 'No context')
    } else {
      console.log("Returned Data:", data)
    }
  } catch(e) {
    console.error("Exception:", e)
  }
}

test()
