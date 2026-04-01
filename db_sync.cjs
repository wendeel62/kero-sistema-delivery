const fs = require('fs');
const path = require('path');
const { createPgClient } = require('./scripts/_env.cjs');

const files = [
  'supabase/migrations/eventos_jornada.sql',
  'supabase/migrations/20260401123000_security_hardening.sql'
];

async function runSQL(client, query) {
  return client.query(query);
}

async function sync() {
  const client = createPgClient();
  console.log('🔄 Iniciando sincronizacao do Banco de Dados...');
  await client.connect();
  
  try {
    for (const file of files) {
      console.log(`\n📄 Processando ${file}...`);
      try {
        const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
        await runSQL(client, sql);
        console.log(`✅ ${file} sincronizado com sucesso!`);
      } catch (e) {
        console.error(`❌ Erro em ${file}: ${e.message}`);
      }
    }
  } finally {
    await client.end();
  }
  
  console.log('\n✨ Sincronizacao finalizada.');
}

sync().catch((error) => {
  console.error('Falha ao sincronizar:', error.message);
  process.exit(1);
});
