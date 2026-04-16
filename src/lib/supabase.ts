import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Erro: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY sao obrigatorias.")
  console.error("Configure-as no arquivo .env na raiz do projeto.")
}

export const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})