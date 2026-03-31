-- Migration: Campos NPS na tabela pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nps_nota INTEGER NULL CHECK (nps_nota >= 0 AND nps_nota <= 10);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nps_respondido BOOLEAN DEFAULT FALSE;

-- Migration: Campos NPS na tabela pedidos_online
ALTER TABLE pedidos_online ADD COLUMN IF NOT EXISTS nps_nota INTEGER NULL CHECK (nps_nota >= 0 AND nps_nota <= 10);
ALTER TABLE pedidos_online ADD COLUMN IF NOT EXISTS nps_respondido BOOLEAN DEFAULT FALSE;

-- Índices para consultas de NPS
CREATE INDEX IF NOT EXISTS idx_pedidos_nps ON pedidos(nps_respondido, nps_nota) WHERE nps_respondido = true;
CREATE INDEX IF NOT EXISTS idx_pedidos_online_nps ON pedidos_online(nps_respondido, nps_nota) WHERE nps_respondido = true;
