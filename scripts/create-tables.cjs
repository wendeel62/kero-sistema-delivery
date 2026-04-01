const { Client } = require('pg')
const { createPgClient } = require('./_env.cjs')

const client = createPgClient()

async function run() {
  await client.connect()
  console.log('Conectado!')

  // Criar tabela motoboys
  await client.query(`
    CREATE TABLE IF NOT EXISTS motoboys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES auth.users(id),
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL,
      status TEXT DEFAULT 'inativo' CHECK (status IN ('disponivel', 'em_entrega', 'inativo')),
      token_acesso UUID DEFAULT gen_random_uuid(),
      avaliacao_media NUMERIC DEFAULT 0,
      total_entregas INTEGER DEFAULT 0,
      latitude NUMERIC,
      longitude NUMERIC,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)
  console.log('Tabela motoboys criada!')

  // Criar tabela entregas
  await client.query(`
    CREATE TABLE IF NOT EXISTS entregas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES auth.users(id),
      pedido_id UUID NOT NULL REFERENCES pedidos(id),
      motoboy_id UUID NOT NULL REFERENCES motoboys(id),
      status TEXT DEFAULT 'atribuido' CHECK (status IN ('atribuido', 'coletado', 'entregue', 'cancelado')),
      latitude_atual NUMERIC,
      longitude_atual NUMERIC,
      atribuido_em TIMESTAMPTZ DEFAULT now(),
      coletado_em TIMESTAMPTZ,
      entregue_em TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `)
  console.log('Tabela entregas criada!')

  // Habilitar RLS
  await client.query('ALTER TABLE motoboys ENABLE ROW LEVEL SECURITY')
  await client.query('ALTER TABLE entregas ENABLE ROW LEVEL SECURITY')
  console.log('RLS habilitado!')

  // Criar políticas com isolamento por tenant (ignorar se já existirem)
  try {
    await client.query(`CREATE POLICY "Motoboys tenant select" ON motoboys FOR SELECT USING (tenant_id = auth.uid())`)
  } catch(e) {
    console.log('Política motoboys já existe')
  }
  try {
    await client.query(`CREATE POLICY "Motoboys tenant insert" ON motoboys FOR INSERT WITH CHECK (tenant_id = auth.uid())`)
  } catch(e) {
    console.log('Política insert motoboys já existe')
  }
  try {
    await client.query(`CREATE POLICY "Motoboys tenant update" ON motoboys FOR UPDATE USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid())`)
  } catch(e) {
    console.log('Política update motoboys já existe')
  }
  try {
    await client.query(`CREATE POLICY "Entregas tenant select" ON entregas FOR SELECT USING (tenant_id = auth.uid())`)
  } catch(e) {
    console.log('Política select entregas já existe')
  }
  try {
    await client.query(`CREATE POLICY "Entregas tenant insert" ON entregas FOR INSERT WITH CHECK (tenant_id = auth.uid())`)
  } catch(e) {
    console.log('Política insert entregas já existe')
  }
  try {
    await client.query(`CREATE POLICY "Entregas tenant update" ON entregas FOR UPDATE USING (tenant_id = auth.uid()) WITH CHECK (tenant_id = auth.uid())`)
  } catch(e) {
    console.log('Política entregas já existe')
  }
  console.log('Políticas configuradas!')

  // Verificar tabelas criadas
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('motoboys', 'entregas')")
  console.log('Tabelas encontradas:', res.rows.map(r => r.table_name).join(', '))

  await client.end()
  console.log('SUCESSO!')
}

run().catch(e => console.error('ERRO:', e.message))
