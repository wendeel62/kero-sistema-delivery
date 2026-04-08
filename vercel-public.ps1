$headers = @{
    'Authorization' = 'Bearer $env:VERCEL_TOKEN'
    'Content-Type' = 'application/json'
}

# Disable Vercel Authentication
$body = @{
    framework = 'vite'
    buildCommand = 'npm run build'
    outputDirectory = 'dist'
    public = $true
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri 'https://api.vercel.com/v6/projects/kero-sistema-delivery' -Method PATCH -Headers $headers -Body $body
Write-Host "Project updated!"
Write-Host "Public: $($response.public)"
