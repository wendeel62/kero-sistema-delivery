$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
}

# Common tables in Supabase projects
$commonTables = @(
    'usuarios', 'tenants', 'produtos', 'categorias', 'pedidos', 'clientes',
    'mensagens_whatsapp', 'mensagens', 'configuracoes', 'itens_pedido',
    'produtos_opcoes', 'opcoes', 'valores', 'delivery', 'entregadores',
    'pagamentos', 'avaliacoes', 'enderecos', 'cupons', 'promocoes',
    'funcionarios', 'permissao', 'logs', 'sessoes', 'whatsapp_sessions'
)

Write-Host "=== VERIFICANDO TABELAS NO SUPABASE ===" -ForegroundColor Cyan

foreach ($table in $commonTables) {
    try {
        $count = Invoke-RestMethod -Uri "https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/$table?select=id&limit=1" -Headers $headers -ErrorAction SilentlyContinue
        Write-Host "[EXISTE] $table" -ForegroundColor Green
    } catch {
        Write-Host "[NÃO EXISTE] $table" -ForegroundColor Red
    }
}