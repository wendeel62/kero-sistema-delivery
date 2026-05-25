-- Migration: Add tenant_id and metas_faturamento to configuracoes
-- Data: 2026-04-07

ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT auth.uid();
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS metas_faturamento JSONB DEFAULT '{"dia": null, "semana": null, "mes": null}';

-- Criar índice para tenant_id para melhor performance
CREATE INDEX IF NOT EXISTS idx_configuracoes_tenant_id ON configuracoes(tenant_id);

-- Atualizar RLS policy para usar tenant_id
DROP POLICY IF EXISTS "Config visível para todos" ON configuracoes;
DROP POLICY IF EXISTS "Config editavel por auth" ON configuracoes;

CREATE POLICY "Config visible to tenant" ON configuracoes FOR SELECT USING (tenant_id = auth.uid());
CREATE POLICY "Config editable by tenant" ON configuracoes FOR UPDATE USING (tenant_id = auth.uid());
CREATE POLICY "Config insertable by auth" ON configuracoes FOR INSERT WITH CHECK (tenant_id = auth.uid());
CREATE POLICY "Config deletable by tenant" ON configuracoes FOR DELETE USING (tenant_id = auth.uid());
