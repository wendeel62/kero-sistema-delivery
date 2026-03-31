const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kmtjfapbooqzhysllrbe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODkwMDgsImV4cCI6MjA5MDA2NTAwOH0.eVy1GLS-DU74TUKPpIyCq8xTvGMxub1R2DIt4I3AEIw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  console.log("Tentando criar admin@kero.com.br...");
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@kero.com.br',
    password: 'kero1234',
  });
  
  if (error) {
    console.error("Erro Supabase:", error);
  } else {
    console.log("Sucesso! Usuário criado ou já existia:", data.user ? data.user.email : 'Sem user info');
  }
}

createAdmin();
