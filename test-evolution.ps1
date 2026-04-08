$headers = @{
    'apikey' = '0f4abb7a9b817e256b68cff61f8a1d11ad018036beabc642070a9b0c5a911c4f'
    'Content-Type' = 'application/json'
}

Write-Host "=== TESTANDO ENDPOINTS DA EVOLUTION API ===" -ForegroundColor Cyan

# Test 1: Listar instâncias
Write-Host "`n[1] instance/fetchInstances/" -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod -Uri "http://evolution-api-production-be62.up.railway.app/instance/fetchInstances/" -Headers $headers
    Write-Host "  [OK] OK" -ForegroundColor Green
} catch { Write-Host "  [X] $_" -ForegroundColor Red }

# Test 2: Enviar mensagem
Write-Host "`n[2] message/sendText/teste" -ForegroundColor Yellow
$body = @{number="559291532662"; text="Teste"} | ConvertTo-Json
try {
    $r = Invoke-RestMethod -Uri "http://evolution-api-production-be62.up.railway.app/message/sendText/teste" -Method POST -Headers $headers -Body $body
    Write-Host "  [OK] OK" -ForegroundColor Green
} catch { Write-Host "  [X] $($_.Exception.Message)" -ForegroundColor Red }

# Test 3: Buscar conversas
Write-Host "`n[3] chat/findChats/teste" -ForegroundColor Yellow
$body = @{} | ConvertTo-Json
try {
    $r = Invoke-RestMethod -Uri "http://evolution-api-production-be62.up.railway.app/chat/findChats/teste" -Method POST -Headers $headers -Body $body
    Write-Host "  [OK] OK" -ForegroundColor Green
    Write-Host "  Total: $($r.Count) conversas" -ForegroundColor Cyan
} catch { Write-Host "  [X] $($_.Exception.Message)" -ForegroundColor Red }

# Test 4: Buscar mensagens
Write-Host "`n[4] chat/findMessages/teste" -ForegroundColor Yellow
$body = @{} | ConvertTo-Json
try {
    $r = Invoke-RestMethod -Uri "http://evolution-api-production-be62.up.railway.app/chat/findMessages/teste" -Method POST -Headers $headers -Body $body
    Write-Host "  [OK] OK" -ForegroundColor Green
} catch { Write-Host "  [X] $($_.Exception.Message)" -ForegroundColor Red }

# Test 5: Buscar contatos
Write-Host "`n[5] chat/findContacts/teste" -ForegroundColor Yellow
$body = @{} | ConvertTo-Json
try {
    $r = Invoke-RestMethod -Uri "http://evolution-api-production-be62.up.railway.app/chat/findContacts/teste" -Method POST -Headers $headers -Body $body
    Write-Host "  [OK] OK" -ForegroundColor Green
    Write-Host "  Total: $($r.Count) contatos" -ForegroundColor Cyan
} catch { Write-Host "  [X] $($_.Exception.Message)" -ForegroundColor Red }

# Test 6: Detalhes da instância
Write-Host "`n[6] instance/fetchInstances/teste" -ForegroundColor Yellow
try {
    $r = Invoke-RestMethod -Uri "http://evolution-api-production-be62.up.railway.app/instance/fetchInstances/teste" -Headers $headers
    Write-Host "  [OK] OK" -ForegroundColor Green
    Write-Host "  Nome: $($r.profileName), Número: $($r.number)" -ForegroundColor Cyan
} catch { Write-Host "  [X] $($_.Exception.Message)" -ForegroundColor Red }

Write-Host "`n=== FIM DOS TESTES ===" -ForegroundColor Cyan