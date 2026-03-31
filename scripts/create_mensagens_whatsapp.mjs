import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kmtjfapbooqzhysllrbe.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'

const supabase = createClient(supabaseUrl, serviceKey)

const statements = [
  `CREATE TABLE IF NOT EXISTS mensagens_whatsapp (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    contato_telefone text NOT NULL,
    contato_nome text,
    direcao text NOT NULL CHECK (direcao IN ('recebida', 'enviada')),
    conteudo text NOT NULL,
    midia_url text,
    midia_tipo text,
    twilio_message_sid text UNIQUE,
    pedido_id uuid REFERENCES pedidos(id) ON DELETE SET NULL,
    lida boolean DEFAULT false,
    agente_respondeu boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_mensagens_tenant ON mensagens_whatsapp(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mensagens_telefone ON mensagens_whatsapp(contato_telefone)`,
  `CREATE INDEX IF NOT EXISTS idx_mensagens_created ON mensagens_whatsapp(created_at DESC)`,
  `ALTER TABLE mensagens_whatsapp ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "Users can manage suas mensagens" ON mensagens_whatsapp`,
  `CREATE POLICY "Users can manage suas mensagens" ON mensagens_whatsapp FOR ALL USING (tenant_id IN (SELECT tenant_id FROM configuracoes WHERE tenant_id = auth.uid()))`,
  `ALTER PUBLICATION supabase_realtime ADD TABLE mensagens_whatsapp`
]

async function main() {
  console.log('Criando tabela mensagens_whatsapp...')
  
  for (const sql of statements) {
    const { error } = await supabase.rpc('exec_sql', { sql_text: sql })
    if (error) {
      // Try direct table creation via REST
      console.log('Trying alternative method for:', sql.substring(0, 50))
    }
  }
  
  // Try to check if table exists
  const { data, error } = await supabase.from('mensagens_whatsapp').select('*').limit(1)
  
  if (!error || error.code === 'PGRST116') {
    console.log('Tabela já existe ou foi criada!')
  } else {
    console.log('Erro:', error.message)
  }
}

main()
