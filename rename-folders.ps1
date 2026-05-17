# Script para renomear pastas com naming inconsistente
# Executar após fechar o VS Code e任何其他 processo usando os arquivos

$srcPath = "C:\Users\usuario\Desktop\Projeto kero\.kilo\worktrees\imaginary-amaryllis\src\components"

# Pasta Dashboard -> dashboard
if (Test-Path "$srcPath\Dashboard") {
    Rename-Item -Path "$srcPath\Dashboard" -NewName "dashboard" -Force
    Write-Host "Dashboard -> dashboard (concluído)"
}

# Pasta Financeiro -> financeiro  
if (Test-Path "$srcPath\Financeiro") {
    Rename-Item -Path "$srcPath\Financeiro" -NewName "financeiro" -Force
    Write-Host "Financeiro -> financeiro (concluído)"
}

# Pasta Pedidos -> pedidos
if (Test-Path "$srcPath\Pedidos") {
    Rename-Item -Path "$srcPath\Pedidos" -NewName "pedidos" -Force
    Write-Host "Pedidos -> pedidos (concluído)"
}

Write-Host "`nRenomeação concluída!"
Write-Host "Execute 'npm run typecheck' para validar."
