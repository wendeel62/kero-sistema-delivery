$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    VERIFICACAO COMPLETA DO SISTEMA    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n[1] TABELAS EXISTENTES" -ForegroundColor Yellow
$allTables = @('configuracoes', 'mensagens_whatsapp', 'usuarios', 'tenants', 'categorias', 'produtos', 'clientes', 'pedidos', 'itens_pedido', 'opcoes', 'valores', 'entregadores', 'pagamentos', 'enderecos', 'cupons', 'funcionarios')
foreach ($t in $allTables) {
    try {
        $c = Invoke-RestMethod -Uri "https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/$t?select=id&limit=1" -Headers $headers -ErrorAction SilentlyContinue
        $count = ($c | Measure-Object).Count
        Write-Host "  [OK] $t ($count registros)" -ForegroundColor Green
    } catch {
        Write-Host "  [X] $t" -ForegroundColor Red
    }
}

Write-Host "`n[2] COLUNAS EM configuracoes" -ForegroundColor Yellow
$config = Invoke-RestMethod -Uri 'https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/configuracoes?select=*&limit=1' -Headers $headers
if ($config) {
    $config[0].PSObject.Properties.Name | ForEach-Object {
        Write-Host "  [OK] $_" -ForegroundColor Green
    }
}

Write-Host "`n[3] REGISTROS EM configuracoes" -ForegroundColor Yellow
$configs = Invoke-RestMethod -Uri 'https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/configuracoes?select=id,nome_loja,whatsapp_instance_id,whatsapp_status,agente_atendente_ativo' -Headers $headers
foreach ($c in $configs) {
    Write-Host "  - $($c.nome_loja)" -ForegroundColor Cyan
    Write-Host "    whatsapp_instance_id: $($c.whatsapp_instance_id)" -ForegroundColor Gray
    Write-Host "    whatsapp_status: $($c.whatsapp_status)" -ForegroundColor Gray
    Write-Host "    agente_atendente_ativo: $($c.agente_atendente_ativo)" -ForegroundColor Gray
}

Write-Host "`n[4] MENSAGENS WHATSAPP" -ForegroundColor Yellow
$msgs = Invoke-RestMethod -Uri 'https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/mensagens_whatsapp?select=*&order=created_at.desc&limit=5' -Headers $headers
Write-Host "  Total de mensagens: $($msgs.Count)" -ForegroundColor Cyan
$msgs | ForEach-Object {
    Write-Host "  - $($_.contato_telefone): $($_.conteudo.Substring(0, [Math]::Min(30, $_.conteudo.Length)))..." -ForegroundColor Gray
}

Write-Host "`n[5] TESTE EDGE FUNCTION webhook-whatsapp" -ForegroundColor Yellow
try {
    $test = Invoke-RestMethod -Uri 'https://kmtjfapbooqzhysllrbe.supabase.co/functions/v1/webhook-whatsapp' -Method POST -Headers @{'Authorization'='Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODkwMDgsImV4cCI6MjA5MDA2NTAwOH0.eVy1GLS-DU74TUKPpIyCq8xTvGMxub1R2DIt4I3AEIw'} -Body '{"test":true}' -ErrorAction SilentlyContinue
    Write-Host "  [OK] Edge Function respondendo" -ForegroundColor Green
} catch {
    Write-Host "  [X] Edge Function com problema" -ForegroundColor Red
}

Write-Host "`n[6] TESTE EVOLUTION API" -ForegroundColor Yellow
try {
    $evo = Invoke-RestMethod -Uri 'http://evolution-api-production-be62.up.railway.app/instance/connect/teste' -Headers @{'apikey'='0f4abb7a9b817e256b68cff61f8a1d11ad018036beabc642078a9b0c5a911c4f'} -ErrorAction SilentlyContinue
    Write-Host "  [OK] Evolution API conectando" -ForegroundColor Green
    $evo | ConvertTo-Json -Depth 3
} catch {
    Write-Host "  [X] Evolution API com problema: $_" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "         VERIFICACAO CONCLUIDA          " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan