const SUPABASE_URL = 'https://kmtjfapbooqzhysllrbe.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY';

async function checkRPC() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: 'SELECT 1' })
    });
    
    if (res.status === 200) {
      console.log('✅ A função "exec_sql" JÁ EXISTE no seu Supabase!');
      console.log('--- Executando testes básicos de tabelas... ---');
      
      const tablesCheck = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: 'SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\'' })
      });
      
      if (tablesCheck.ok) {
        console.log('Tabelas encontradas:', await tablesCheck.json());
      }
    } else {
      console.log(`❌ Resposta inesperada (Status ${res.status}): A função pode não estar ativa ainda.`);
    }
  } catch (e) {
    console.error('❌ Erro na conexão:', e.message);
  }
}

checkRPC();
