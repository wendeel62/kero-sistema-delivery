const SUPABASE_URL = 'https://kmtjfapbooqzhysllrbe.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY';

const fs = require('fs');
const path = require('path');

const files = [
  'sabores-schema.sql',
  'supabase-schema.sql',
  'fase2-schema.sql',
  'advanced-modules-schema.sql'
];

async function runSQL(query) {
  // This approach only works if there's a custom 'exec_sql' or similar RPC, 
  // which is common in many Supabase tutorials/projects but not default.
  // Otherwise, we would need to use a postgres client.
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL Exec Error: ${error}`);
  }
  return await response.json();
}

async function sync() {
  console.log('🔄 Iniciando sincronizacao do Banco de Dados...');
  
  for (const file of files) {
    console.log(`\n📄 Processando ${file}...`);
    try {
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      // Tentativa de rodar via RPC se existir
      // Se falhar, tentaremos via CLI ou outro (mas RPC é o único via REST)
      await runSQL(sql);
      console.log(`✅ ${file} sincronizado com sucesso!`);
    } catch (e) {
      console.error(`❌ Erro em ${file}: ${e.message}`);
      console.log('--- Tentando executar blocos separadamente se necessário ---');
    }
  }
  
  console.log('\n✨ Sincronizacao finalizada.');
}

// sync();
console.log("Nota: O método RPC 'exec_sql' precisa estar habilitado no Supabase.");
