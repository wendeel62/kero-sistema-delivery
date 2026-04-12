import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing env vars. Be sure to run this with dotenv: node --env-file=.env test.js")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function test() {
  console.log("Testing Edge Function: admin-dashboard-data")
  
  try {
    const { data, error } = await supabase.functions.invoke('admin-dashboard-data', {
      headers: {
        // Just dummy headers to see if it reaches the function
      }
    })

    if (error) {
      console.log("Returned Error:", error)
    } else {
      console.log("Returned Data:", data)
    }
  } catch(e) {
    console.error("Exception:", e)
  }
}

test()
