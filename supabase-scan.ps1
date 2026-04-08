$headers = @{
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttdGpmYXBib29xemh5c2xscmJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4OTAwOCwiZXhwIjoyMDkwMDY1MDA4fQ.JQTqXBg6sJIekY-K-Rq-Bh6L0Sb58qGTkXC0X4JrOSY'
}

# 1. Listar todas as tabelas
Write-Host "=== TABELAS ===" -ForegroundColor Cyan
$tables = Invoke-RestMethod -Uri 'https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/?select=table_name' -Headers $headers
$tables | ForEach-Object { Write-Host $_.table_name }

Write-Host "`n=== DETALHES DAS TABELAS ===" -ForegroundColor Cyan
foreach ($table in $tables) {
    $tableName = $table.table_name
    Write-Host "`n--- $tableName ---" -ForegroundColor Yellow
    
    # Colunas
    $columns = Invoke-RestMethod -Uri "https://kmtjfapbooqzhysllrbe.supabase.co/rest/v1/information_schema.columns?table_name=eq.$tableName" -Headers $headers
    $columns | ForEach-Object { 
        Write-Host "  $($_.column_name): $($_.data_type)" 
    }
}