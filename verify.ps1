$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
}

# Check configuracoes with new columns
Write-Host "=== VERIFICANDO COLUNAS ADICIONADAS ===" -ForegroundColor Cyan
$config = Invoke-RestMethod -Uri 'https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/configuracoes?select=id,nome_loja,whatsapp_instance_id,whatsapp_status&limit=2' -Headers $headers
$config | ConvertTo-Json -Depth 10

# Check Edge Functions
Write-Host "`n=== EDGE FUNCTIONS ===" -ForegroundColor Cyan

# Check environment variables via config table (the Supabase ones)
Write-Host "`n=== VARIAVEIS DE AMBIENTE (simulado via config) ===" -ForegroundColor Cyan
Write-Host "EVOLUTION_API_URL: http://evolution-api-production-be62.up.railway.app" -ForegroundColor Gray
Write-Host "EVOLUTION_API_KEY: configurada no Supabase" -ForegroundColor Gray

# Verify webhook-whatsapp is working
Write-Host "`n=== TESTE WEBHOOK ===" -ForegroundColor Cyan
$test = Invoke-RestMethod -Uri 'https://kmtjfapbooqzhysllrbe.supabase.co/functions/v1/webhook-whatsapp' -Method POST -Headers @{'Authorization'='Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODkwMDgsImV4cCI6MjA5MDA2NTAwOH0.eVy1GLS-DU74TUKPpIyCq8xTvGMxub1R2DIt4I3AEIw'} -Body '{"test":true}' -ErrorAction SilentlyContinue
if ($test) {
    Write-Host "Edge Function webhook-whatsapp OK" -ForegroundColor Green
} else {
    Write-Host "Edge Function pode precisar de deploy" -ForegroundColor Yellow
}