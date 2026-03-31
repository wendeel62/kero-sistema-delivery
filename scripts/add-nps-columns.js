const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://kmtjfapbooqzhysllrbe.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addNpsColumns() {
  console.log('Adicionando colunas NPS na tabela pedidos_online...')
  
  // Usar a API REST para executar SQL via rpc
  // Primeiro vamos verificar se os campos existem tentando fazer um select
  const { data: testData, error: testError } = await supabase
    .from('pedidos_online')
    .select('nps_nota, nps_respondido')
    .limit(1)
  
  if (testError && testError.message.includes('nps_nota')) {
    console.log('Colunas não existem. Tentando criar via API...')
    
    // Tentar criar um registro de teste para forçar a criação das colunas
    // Isso não vai funcionar, mas vamos tentar outra abordagem
    console.log('Por favor, execute o SQL manualmente no painel do Supabase:')
    console.log('ALTER TABLE pedidos_online ADD COLUMN IF NOT EXISTS nps_nota INTEGER NULL;')
    console.log('ALTER TABLE pedidos_online ADD COLUMN IF NOT EXISTS nps_respondido BOOLEAN DEFAULT FALSE;')
  } else {
    console.log('Colunas NPS já existem na tabela pedidos_online!')
    console.log('Dados de teste:', testData)
  }
}

addNpsColumns().catch(console.error)
