-- DEPRECATED bootstrap file.
-- Este arquivo continha politicas permissivas para motoboys e entregas.
-- Nao execute este SQL em novos ambientes. Use apenas migrations versionadas em
-- `supabase/migrations/`, especialmente `20260401123000_security_hardening.sql`.

-- Migration: Módulo de Entregas
-- Adicionar campos na tabela motoboys (se não existirem)
ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS token_acesso uuid DEFAULT gen_random_uuid();
ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS status text DEFAULT 'inativo' CHECK (status IN ('disponivel', 'em_entrega', 'inativo'));
ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS avaliacao_media numeric DEFAULT 0;
ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS total_entregas integer DEFAULT 0;
ALTER TABLE motoboys ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Criar tabela entregas
CREATE TABLE IF NOT EXISTS entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  pedido_id uuid NOT NULL REFERENCES pedidos(id),
  motoboy_id uuid NOT NULL REFERENCES motoboys(id),
  status text DEFAULT 'atribuido' CHECK (status IN ('atribuido', 'coletado', 'entregue', 'cancelado')),
  latitude_atual numeric,
  longitude_atual numeric,
  atribuido_em timestamptz DEFAULT now(),
  coletado_em timestamptz,
  entregue_em timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS na tabela entregas
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;

-- Política de leitura para entregas
CREATE POLICY "Entregas: leitura por tenant" ON entregas
  FOR SELECT USING (true);

-- Política de escrita para entregas
CREATE POLICY "Entregas: escrita por tenant" ON entregas
  FOR ALL USING (true);

-- Habilitar Realtime nas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE motoboys;
ALTER PUBLICATION supabase_realtime ADD TABLE entregas;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_entregas_motoboy_id ON entregas(motoboy_id);
CREATE INDEX IF NOT EXISTS idx_entregas_pedido_id ON entregas(pedido_id);
CREATE INDEX IF NOT EXISTS idx_entregas_status ON entregas(status);
CREATE INDEX IF NOT EXISTS idx_entregas_tenant_id ON entregas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_motoboys_token ON motoboys(token_acesso);
