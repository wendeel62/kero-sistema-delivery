# Build script for Kero Printer Helper
# Requires: Go 1.21+ installed (https://go.dev/dl/)
#
# Usage:
#   .\build.ps1          # builds for current platform
#   .\build.ps1 -All     # cross-compiles for Windows x64 + x86

param(
    [switch]$All = $false
)

$Version = "1.0.0"
$Date = (Get-Date -Format "yyyy-MM-dd")
$OutputDir = "dist"

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# Common flags
$LdFlags = "-s -w -X main.version=$Version -X main.buildDate=$Date"

if ($All) {
    Write-Host "=== Cross-compiling Kero Printer Helper v$Version ===" -ForegroundColor Cyan

    $targets = @(
        @{ GOOS="windows"; GOARCH="amd64";  EXT=".exe"; NAME="Kero-Printer-Helper-x64" },
        @{ GOOS="windows"; GOARCH="386";    EXT=".exe"; NAME="Kero-Printer-Helper-x86" }
    )

    foreach ($t in $targets) {
        Write-Host "Building $($t.NAME)..." -ForegroundColor Yellow
        $env:GOOS = $t.GOOS
        $env:GOARCH = $t.GOARCH
        $env:CGO_ENABLED = 0
        $out = Join-Path $OutputDir "$($t.NAME)$($t.EXT)"
        go build -ldflags $LdFlags -o $out .
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ $out" -ForegroundColor Green
        } else {
            Write-Host "  ✗ FAILED" -ForegroundColor Red
        }
    }
} else {
    Write-Host "=== Building Kero Printer Helper v$Version ===" -ForegroundColor Cyan
    $out = Join-Path $OutputDir "Kero-Printer-Helper.exe"
    go build -ldflags $LdFlags -o $out .
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ $out" -ForegroundColor Green
    } else {
        Write-Host "  ✗ FAILED" -ForegroundColor Red
    }
}

Write-Host "Done!" -ForegroundColor Cyan
