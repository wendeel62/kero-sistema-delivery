$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
}

$tables = @(
    'configuracoes', 'usuarios', 'tenants', 'produtos', 'categorias', 'pedidos', 
    'clientes', 'itens_pedido', 'produtos_opcoes', 'opcoes', 'valores', 
    'delivery', 'entregadores', 'pagamentos', 'avaliacoes', 'enderecos',
    'cupons', 'promocoes', 'funcionarios', 'logs', 'whatsapp_sessions'
)

Write-Host "=== ESCANEANDO TABELAS ===" -ForegroundColor Cyan

foreach ($table in $tables) {
    try {
        $count = Invoke-RestMethod -Uri "https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/$table?select=id" -Headers $headers -ErrorAction SilentlyContinue
        if ($count) {
            $cnt = ($count | Measure-Object).Count
            Write-Host "[OK] $table - $cnt registros" -ForegroundColor Green
        }
    } catch {
        Write-Host "[X] $table" -ForegroundColor Red
    }
}

Write-Host "`n=== CONFIGURACOES ===" -ForegroundColor Cyan
try {
    $config = Invoke-RestMethod -Uri 'https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/configuracoes?limit=3' -Headers $headers
    if ($config) {
        $config | ConvertTo-Json -Depth 10
    }
} catch {
    Write-Host "Erro: $_" -ForegroundColor Red
}