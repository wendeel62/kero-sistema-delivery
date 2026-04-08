$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
}

# More tables to check
$tables = @(
    'produtos', 'categorias', 'pedidos', 'clientes', 'itens_pedido',
    'usuarios', 'tenants', 'opcoes', 'valores', 'entregadores',
    'pagamentos', 'enderecos', 'cupons', 'funcionarios'
)

Write-Host "=== VERIFICANDO TABELAS ===" -ForegroundColor Cyan

foreach ($table in $tables) {
    try {
        $result = Invoke-RestMethod -Uri "https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/$table?select=id&limit=1" -Headers $headers -ErrorAction SilentlyContinue
        Write-Host "[OK] $table" -ForegroundColor Green
    } catch {
        Write-Host "[X] $table - $_" -ForegroundColor Red
    }
}

# Check if columns whatsapp_instance_id and whatsapp_status exist in configuracoes
Write-Host "`n=== VERIFICANDO COLUNAS EM configuracoes ===" -ForegroundColor Cyan
$config = Invoke-RestMethod -Uri 'https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/configuracoes?select=whatsapp_instance_id,whatsapp_status&limit=1' -Headers $headers
if ($config) {
    Write-Host "Colunas whatsapp existem!" -ForegroundColor Green
    $config | ConvertTo-Json
} else {
    Write-Host "Colunas NAO existem" -ForegroundColor Yellow
}