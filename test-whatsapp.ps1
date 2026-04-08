$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
}

Write-Host "=== ENVIANDO MENSAGEM DE TESTE ===" -ForegroundColor Cyan

# Simular webhook payload da Evolution API
$testPayload = @{
    event = "MESSAGES_UPSERT"
    data = @{
        messages = @(
            @{
                key = @{
                    remoteJid = "559291532662@s.whatsapp.net"
                    fromMe = $false
                }
                message = @{
                    conversation = "Teste do Kero - mensagem de chegada!"
                }
                pushName = "David Teste"
            }
        )
    }
} | ConvertTo-Json -Depth 10

# Enviar para Edge Function (webhook)
$webhookUrl = "https://kmtjfapbooqzhysllrbe.supabase.co/functions/v1/webhook-whatsapp"
$webhookHeaders = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODkwMDgsImV4cCI6MjA5MDA2NTAwOH0.eVy1GLS-DU74TUKPpIyCq8xTvGMxub1R2DIt4I3AEIw'
    'Content-Type' = 'application/json'
}

try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method POST -Headers $webhookHeaders -Body $testPayload
    Write-Host "Webhook enviado: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "Erro no webhook: $_" -ForegroundColor Red
}

# Verificar se message foi salva
Start-Sleep -Milliseconds 500

Write-Host "`n=== VERIFICANDO MENSAGENS NO BANCO ===" -ForegroundColor Cyan
$msgs = Invoke-RestMethod -Uri 'https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/mensagens_whatsapp?order=created_at.desc&limit=3' -Headers $headers
$msgs | ConvertTo-Json -Depth 10