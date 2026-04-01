import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPgClient } from './scripts/_env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const files = [
  'supabase/migrations/eventos_jornada.sql',
  'supabase/migrations/20260401123000_security_hardening.sql'
];

async function runSQL(client, query) {
  return client.query(query);
}

async function sync() {
  const client = createPgClient();
  console.log('🚀 Iniciando Sincronizacao em Massa do Banco de Dados...');
  await client.connect();
  
  try {
    for (const file of files) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
         console.log(`⚠️ Arquivo ${file} nao encontrado. Pulando.`);
         continue;
      }
      
      console.log(`\n📄 Sincronizando ${file}...`);
      try {
        const sql = fs.readFileSync(filePath, 'utf8');
        await runSQL(client, sql);
        console.log(`✅ ${file} sincronizado com sucesso!`);
      } catch (e) {
        console.error(`❌ Erro em ${file}: ${e.message}`);
      }
    }
  } finally {
    await client.end();
  }
  
  console.log('\n✨ Todas as operacoes de banco de dados foram concluidas!');
}

sync();
