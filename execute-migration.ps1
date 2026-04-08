# Script para executar migration de metas_faturamento no Supabase
# Execute este script com: powershell -ExecutionPolicy Bypass -File execute-migration.ps1

$sqlMigration = @"
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
"@

Write-Host "Migration SQL preparado. Copie o seguinte código e execute no Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host ""
Write-Host $sqlMigration
Write-Host ""
Write-Host "Passos:" -ForegroundColor Cyan
Write-Host "1. Acesse https://app.supabase.com/project/[seu-projeto-id]/sql/new"
Write-Host "2. Cole o SQL acima"
Write-Host "3. Clique em 'Run'"
Write-Host ""
Write-Host "Após executar, a meta será salva corretamente!" -ForegroundColor Green
