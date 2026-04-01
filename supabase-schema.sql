-- DEPRECATED bootstrap file.
-- Este arquivo continha politicas permissivas incompatíveis com isolamento multi-tenant.
-- Nao execute este SQL em novos ambientes. Use apenas migrations versionadas em
-- `supabase/migrations/`, especialmente `20260401123000_security_hardening.sql`.

-- Kero Delivery — Database Schema (Fase 1)
-- Execute no Supabase SQL Editor

-- 1. Configurações da loja
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_loja TEXT NOT NULL DEFAULT 'Minha Loja',
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  cnpj TEXT,
  horario_abertura TIME DEFAULT '08:00',
  horario_fechamento TIME DEFAULT '23:00',
  taxa_entrega NUMERIC(10,2) DEFAULT 5.00,
  pedido_minimo NUMERIC(10,2) DEFAULT 20.00,
  raio_entrega_km NUMERIC(5,1) DEFAULT 10.0,
  loja_aberta BOOLEAN DEFAULT true,
  aceita_pix BOOLEAN DEFAULT true,
  aceita_cartao BOOLEAN DEFAULT true,
  aceita_dinheiro BOOLEAN DEFAULT true,
  logo_url TEXT,
  cor_primaria TEXT DEFAULT '#ff5637',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Categorias do cardápio
CREATE TABLE IF NOT EXISTS categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INT DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Produtos do cardápio
CREATE TABLE IF NOT EXISTS produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL DEFAULT 0,
  imagem_url TEXT,
  disponivel BOOLEAN DEFAULT true,
  destaque BOOLEAN DEFAULT false,
  tempo_preparo INT DEFAULT 30,
  ordem INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Preços por tamanho
CREATE TABLE IF NOT EXISTS precos_tamanho (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
  tamanho TEXT NOT NULL,
  preco NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Pedidos (PDV)
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero INT GENERATED ALWAYS AS IDENTITY,
  cliente_nome TEXT,
  cliente_telefone TEXT,
  tipo TEXT DEFAULT 'balcao' CHECK (tipo IN ('balcao', 'entrega', 'mesa')),
  mesa_numero INT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aberto','preparando','pronto','entregue','cancelado')),
  subtotal NUMERIC(10,2) DEFAULT 0,
  taxa_entrega NUMERIC(10,2) DEFAULT 0,
  desconto NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  forma_pagamento TEXT DEFAULT 'dinheiro',
  observacoes TEXT,
  endereco_entrega TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Itens do pedido (PDV)
CREATE TABLE IF NOT EXISTS itens_pedido (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id) ON DELETE SET NULL,
  produto_nome TEXT NOT NULL,
  quantidade INT DEFAULT 1,
  preco_unitario NUMERIC(10,2) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  tamanho TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Pedidos Online
CREATE TABLE IF NOT EXISTS pedidos_online (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero INT GENERATED ALWAYS AS IDENTITY,
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT NOT NULL,
  cliente_email TEXT,
  cep TEXT,
  endereco TEXT,
  numero_endereco TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente','confirmado','preparando','saiu_entrega','entregue','cancelado')),
  itens JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC(10,2) DEFAULT 0,
  taxa_entrega NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) DEFAULT 0,
  forma_pagamento TEXT DEFAULT 'pix',
  troco_para NUMERIC(10,2),
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO configuracoes (nome_loja, telefone, cidade, estado) 
VALUES ('Kero Delivery', '(11) 99999-9999', 'São Paulo', 'SP')
ON CONFLICT DO NOTHING;

-- Inserir categorias de exemplo
INSERT INTO categorias (nome, descricao, ordem) VALUES
  ('Pizzas', 'Pizzas artesanais', 1),
  ('Hambúrgueres', 'Hamburgueres artesanais', 2),
  ('Bebidas', 'Refrigerantes, sucos e mais', 3),
  ('Sobremesas', 'Doces e sobremesas', 4);

-- Habilitar Realtime nas tabelas de forma segura
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pedidos') 
  THEN ALTER PUBLICATION supabase_realtime ADD TABLE pedidos; END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pedidos_online') 
  THEN ALTER PUBLICATION supabase_realtime ADD TABLE pedidos_online; END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'produtos') 
  THEN ALTER PUBLICATION supabase_realtime ADD TABLE produtos; END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'configuracoes') 
  THEN ALTER PUBLICATION supabase_realtime ADD TABLE configuracoes; END IF;
END $$;

-- RLS: permitir leitura pública em categorias, produtos e precos_tamanho
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categorias visíveis para todos" ON categorias FOR SELECT USING (true);
CREATE POLICY "Categorias editáveis por auth" ON categorias FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Produtos visíveis para todos" ON produtos FOR SELECT USING (true);
CREATE POLICY "Produtos editáveis por auth" ON produtos FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE precos_tamanho ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Precos visíveis para todos" ON precos_tamanho FOR SELECT USING (true);
CREATE POLICY "Precos editáveis por auth" ON precos_tamanho FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Config visível para todos" ON configuracoes FOR SELECT USING (true);
CREATE POLICY "Config editavel por auth" ON configuracoes FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pedidos total por auth" ON pedidos FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Itens total por auth" ON itens_pedido FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE pedidos_online ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pedidos online visíveis para todos" ON pedidos_online FOR SELECT USING (true);
CREATE POLICY "Pedidos online inseríveis por todos" ON pedidos_online FOR INSERT WITH CHECK (true);
CREATE POLICY "Pedidos online editáveis por auth" ON pedidos_online FOR UPDATE USING (auth.role() = 'authenticated');
