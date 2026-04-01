-- DEPRECATED bootstrap file.
-- Este arquivo continha historico_status e notificacoes com acesso amplo demais.
-- Nao execute este SQL em novos ambientes. Use apenas migrations versionadas em
-- `supabase/migrations/`, especialmente `20260401123000_security_hardening.sql`.

-- Kero Delivery — Módulo 1 (Fase 2)
-- Tabela para histórico de status dos pedidos
-- Execute no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS historico_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID, -- Referencia genérica (pode ser pedidos ou pedidos_online)
  origem_tabela TEXT CHECK (origem_tabela IN ('pedidos', 'pedidos_online')),
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  motivo_cancelamento TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS e Rota de leitura/escrita
ALTER TABLE historico_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Histórico total por auth" ON historico_status FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Histórico visível para todos" ON historico_status FOR SELECT USING (true);
CREATE POLICY "Histórico inserível online" ON historico_status FOR INSERT WITH CHECK (true);

-- Notificacoes
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('novo_pedido_online', 'pedido_atrasado', 'estoque_critico', 'pedido_cancelado')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN DEFAULT false,
  referencia_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notificacoes admin" ON notificacoes FOR ALL USING (auth.role() = 'authenticated');
ALTER PUBLICATION supabase_realtime ADD TABLE notificacoes;
