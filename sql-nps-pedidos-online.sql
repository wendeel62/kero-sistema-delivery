-- Execute este SQL no painel do Supabase (SQL Editor)
-- https://supabase.com/dashboard → Seu Projeto → SQL Editor

-- Adicionar campos NPS na tabela pedidos_online
ALTER TABLE pedidos_online ADD COLUMN IF NOT EXISTS nps_nota INTEGER NULL;
ALTER TABLE pedidos_online ADD COLUMN IF NOT EXISTS nps_respondido BOOLEAN DEFAULT FALSE;

-- Verificar se os campos foram criados
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pedidos_online' 
AND column_name IN ('nps_nota', 'nps_respondido');
