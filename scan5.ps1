$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
}

# Test if mensagens_whatsapp exists
Write-Host "=== Testando mensagens_whatsapp ===" -ForegroundColor Cyan
$test = Invoke-RestMethod -Uri 'https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/mensagens_whatsapp?limit=1' -Headers $headers
if ($test) {
    Write-Host "Tabela existe! Count: $($test.Count)"
    $test | ConvertTo-Json -Depth 5
} else {
    Write-Host "Tabela vazia ou não existe"
}

# Try to count all tables with a different approach
Write-Host "`n=== Verificando via postgrest ===" -ForegroundColor Cyan
$url = "https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/mensagens_whatsapp?select=*&limit=1"
$response = Invoke-WebRequest -Uri $url -Headers $headers -UseBasicParsing
Write-Host "Status: $($response.StatusCode)"
Write-Host "Content: $($response.Content)"