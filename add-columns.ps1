$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
    'Content-Type' = 'application/json'
    'Prefer' = 'return=minimal'
}

$sql = @"
-- Adicionar colunas na tabela configuracoes
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS agente_atendente_ativo BOOLEAN DEFAULT false;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS whatsapp_instance_id TEXT;
ALTER TABLE configuracoes ADD COLUMN IF NOT EXISTS whatsapp_status TEXT DEFAULT 'disconnected';
"@

$body = @{ query = $sql } | ConvertTo-Json

Write-Host "=== ADICIONANDO COLUNAS ===" -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri 'https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/rpc/exec_sql' -Method POST -Headers $headers -Body $body
    Write-Host "Sucesso!" -ForegroundColor Green
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}