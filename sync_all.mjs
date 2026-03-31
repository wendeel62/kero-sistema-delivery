const SUPABASE_URL = 'https://kmtjfapbooqzhysllrbe.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const files = [
  'sabores-schema.sql',
  'mesas-schema.sql',
  'supabase-schema.sql',
  'fase2-schema.sql',
  'advanced-modules-schema.sql'
];

async function runSQL(query) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  
  const result = await response.json();
  if (result.status === 'error') {
    throw new Error(result.message);
  }
  return result;
}

async function sync() {
  console.log('🚀 Iniciando Sincronizacao em Massa do Banco de Dados...');
  
  for (const file of files) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
       console.log(`⚠️ Arquivo ${file} nao encontrado. Pulando.`);
       continue;
    }
    
    console.log(`\n📄 Sincronizando ${file}...`);
    try {
      const sql = fs.readFileSync(filePath, 'utf8');
      await runSQL(sql);
      console.log(`✅ ${file} sincronizado com sucesso!`);
    } catch (e) {
      console.error(`❌ Erro em ${file}: ${e.message}`);
    }
  }
  
  console.log('\n✨ Todas as operacoes de banco de dados foram concluidas!');
}

sync();
