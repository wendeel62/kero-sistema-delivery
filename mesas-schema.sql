-- DEPRECATED bootstrap file.
-- Este arquivo deixava mesas publicamente acessiveis sem isolamento por tenant.
-- Nao execute este SQL em novos ambientes. Use apenas migrations versionadas em
-- `supabase/migrations/`, especialmente `20260401123000_security_hardening.sql`.

-- Kero Delivery — Módulo de Mesas (Versão Finalizada)

-- 1. Tabela de Mesas
CREATE TABLE IF NOT EXISTS mesas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero INTEGER NOT NULL UNIQUE,
  capacidade INTEGER DEFAULT 4,
  status TEXT DEFAULT 'livre' CHECK (status IN ('livre', 'ocupada', 'aguardando_pagamento', 'inativa')),
  responsavel TEXT,
  pessoas INTEGER DEFAULT 0,
  aberta_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE mesas ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (Safe Check para Idempotência)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mesas' AND policyname = 'Mesas visiveis para todos') THEN
    CREATE POLICY "Mesas visiveis para todos" ON mesas FOR SELECT USING (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mesas' AND policyname = 'Mesas editaveis por auth') THEN
    CREATE POLICY "Mesas editaveis por auth" ON mesas FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- 4. Adicionar campos na tabela configuracoes
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS total_mesas INTEGER DEFAULT 10;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS capacidade_mesa INTEGER DEFAULT 4;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS modulo_mesas_ativado BOOLEAN DEFAULT true;

-- 5. Adicionar coluna mesa_id na tabela pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS mesa_id UUID REFERENCES mesas(id);

-- 6. Adicionar à publicação realtime (Safe Check)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'mesas') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mesas;
  END IF;
END $$;
