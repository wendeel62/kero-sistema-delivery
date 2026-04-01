-- DEPRECATED bootstrap file.
-- Este arquivo deixava sabores publicamente acessiveis sem isolamento por tenant.
-- Nao execute este SQL em novos ambientes. Use apenas migrations versionadas em
-- `supabase/migrations/`, especialmente `20260401123000_security_hardening.sql`.

-- Kero Delivery — Módulo de Sabores (Pizzas Meio a Meio)

-- 1. Tabela de Sabores
CREATE TABLE IF NOT EXISTS sabores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  disponivel BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE sabores ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança
-- Sabores visíveis para todos (público)
CREATE POLICY "Sabores visiveis para todos" 
ON sabores FOR SELECT 
USING (true);

-- Sabores editáveis apenas por usuários autenticados (admin)
CREATE POLICY "Sabores editaveis por auth" 
ON sabores FOR ALL 
USING (auth.role() = 'authenticated');

-- 4. Adicionar à publicação realtime (para atualizações em tempo real no dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE sabores;
