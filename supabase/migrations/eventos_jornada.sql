-- Tabela para rastrear eventos da jornada do cliente no funil de vendas
CREATE TABLE IF NOT EXISTS eventos_jornada (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_evento TEXT NOT NULL, -- 'visualizacao', 'add_carrinho', 'checkout_iniciado', 'compra'
  quantidade INTEGER DEFAULT 1,
  data DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE eventos_jornada ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eventos_jornada_tenant_isolation" ON eventos_jornada
  FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id'));

-- Índice para consultas rápidas
CREATE INDEX idx_eventos_jornada_tenant_data ON eventos_jornada(tenant_id, data DESC);
CREATE INDEX idx_eventos_jornada_tipo ON eventos_jornada(tipo_evento);