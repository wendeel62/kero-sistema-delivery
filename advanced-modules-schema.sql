-- DEPRECATED bootstrap file.
-- Este arquivo continha politicas auth-wide sem isolamento por tenant.
-- Nao execute este SQL em novos ambientes. Use apenas migrations versionadas em
-- `supabase/migrations/`, especialmente `20260401123000_security_hardening.sql`.

-- Kero Delivery — Schema Módulos Avançados (Clientes, Estoque, Financeiro)

-- 1. Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL UNIQUE,
  email TEXT,
  data_nascimento DATE,
  enderecos JSONB DEFAULT '[]', -- Lista de objetos {cep, rua, numero, bairro, cidade, estado, principal: boolean}
  perfil TEXT DEFAULT 'novo' CHECK (perfil IN ('novo', 'recorrente', 'vip')),
  total_pedidos INT DEFAULT 0,
  total_gasto NUMERIC(10,2) DEFAULT 0,
  cashback NUMERIC(10,2) DEFAULT 0,
  pontos INT DEFAULT 0,
  primeiro_pedido TIMESTAMPTZ,
  ultimo_pedido TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Fidelidade e Configurações de Pontos (Extensão da tabela configuracoes)
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS fidelidade_ativa BOOLEAN DEFAULT false;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS pontos_por_real INT DEFAULT 1;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS valor_ponto_reais NUMERIC(10,2) DEFAULT 0.10;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS pontos_minimos_resgate INT DEFAULT 100;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS cashback_automatico BOOLEAN DEFAULT false;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS mensagem_aniversario TEXT DEFAULT 'Parabéns! Use o cupom NIVER10 para ganhar 10% de desconto hoje!';

-- 3. Cupons
CREATE TABLE IF NOT EXISTS cupons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  tipo TEXT CHECK (tipo IN ('percentual', 'fixo')),
  valor NUMERIC(10,2) NOT NULL,
  usos_realizados INT DEFAULT 0,
  usos_maximos INT,
  validade DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Estoque: Ingredientes e Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  especialidade TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingredientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  unidade TEXT CHECK (unidade IN ('kg', 'L', 'un', 'lata', 'pacote', 'g', 'ml')), -- Sincronizado com EstoquePage.tsx
  estoque_atual NUMERIC(10,2) DEFAULT 0,
  estoque_minimo NUMERIC(10,2) DEFAULT 0,
  estoque_critico NUMERIC(10,2) DEFAULT 0,
  custo_medio NUMERIC(10,2) DEFAULT 0,
  categoria TEXT,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entradas_estoque (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingrediente_id UUID REFERENCES ingredientes(id) ON DELETE CASCADE,
  quantidade NUMERIC(10,2) NOT NULL,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  valor_unitario NUMERIC(10,2),
  data_entrada TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ficha_tecnica (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
  ingrediente_id UUID REFERENCES ingredientes(id) ON DELETE CASCADE,
  quantidade NUMERIC(10,3) NOT NULL, -- Ex: 0.150 kg de queijo
  tamanho TEXT, -- Opcional, se variar por tamanho
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Financeiro: Caixa e Contas a Pagar
CREATE TABLE IF NOT EXISTS caixa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  valor_abertura NUMERIC(10,2) NOT NULL,
  valor_fechamento NUMERIC(10,2),
  total_entradas_pix NUMERIC(10,2) DEFAULT 0,
  total_entradas_cartao NUMERIC(10,2) DEFAULT 0,
  total_entradas_dinheiro NUMERIC(10,2) DEFAULT 0,
  total_sangrias NUMERIC(10,2) DEFAULT 0,
  aberto_em TIMESTAMPTZ DEFAULT now(),
  fechado_em TIMESTAMPTZ,
  aberto_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sangrias_caixa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caixa_id UUID REFERENCES caixa(id) ON DELETE CASCADE,
  valor NUMERIC(10,2) NOT NULL,
  motivo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contas_pagar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  descricao TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  categoria TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pago', 'pendente')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ingredientes;
ALTER PUBLICATION supabase_realtime ADD TABLE clientes;
ALTER PUBLICATION supabase_realtime ADD TABLE caixa;

-- RLS
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clientes total por auth" ON clientes FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE cupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cupons total por auth" ON cupons FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fornecedores total por auth" ON fornecedores FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE ingredientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ingredientes total por auth" ON ingredientes FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE entradas_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Entradas estoque total por auth" ON entradas_estoque FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE ficha_tecnica ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ficha tecnica total por auth" ON ficha_tecnica FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE caixa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Caixa total por auth" ON caixa FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE sangrias_caixa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sangrias total por auth" ON sangrias_caixa FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE contas_pagar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contas pagar total por auth" ON contas_pagar FOR ALL USING (auth.role() = 'authenticated');
