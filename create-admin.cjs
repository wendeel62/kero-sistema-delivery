const { createClient } = require('@supabase/supabase-js');
const { requireEnv } = require('./scripts/_env.cjs');

const supabaseUrl = requireEnv('SUPABASE_URL');
const supabaseKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const adminEmail = requireEnv('ADMIN_BOOTSTRAP_EMAIL');
const adminPassword = requireEnv('ADMIN_BOOTSTRAP_PASSWORD');

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdmin() {
  console.log(`Tentando criar ${adminEmail}...`);
  const { data, error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  });
  
  if (error) {
    console.error("Erro Supabase:", error);
  } else {
    console.log("Sucesso! Usuário criado ou já existia:", data.user ? data.user.email : 'Sem user info');
  }
}

createAdmin();
