$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
}

Write-Host "=== VERIFICANDO COLUNAS EM configuracoes ===" -ForegroundColor Cyan
$config = Invoke-RestMethod -Uri 'https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/configuracoes?select=id,nome_loja,agente_atendente_ativo,whatsapp_instance_id,whatsapp_status&limit=1' -Headers $headers
$config | ConvertTo-Json -Depth 10

Write-Host "`n=== VERIFICANDO NOVAS TABELAS ===" -ForegroundColor Cyan
$tables = @('usuarios', 'tenants', 'categorias', 'produtos', 'clientes', 'pedidos', 'itens_pedido', 'opcoes', 'valores', 'entregadores', 'pagamentos', 'enderecos', 'cupons', 'funcionarios')
foreach ($t in $tables) {
    try {
        $c = Invoke-RestMethod -Uri "https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/$t?select=id&limit=1" -Headers $headers -ErrorAction SilentlyContinue
        Write-Host "[OK] $t" -ForegroundColor Green
    } catch {
        Write-Host "[X] $t" -ForegroundColor Red
    }
}