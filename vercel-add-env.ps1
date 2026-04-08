$headers = @{
    'Authorization' = 'Bearer `$env:VERCEL_TOKEN'
    'Content-Type' = 'application/json'
}

# Add environment variables (update with your vars)
$envVars = @(
    @{
        key = 'DATABASE_URL'
        value = '`' + $env:DATABASE_URL + '`'
        target = @('production', 'preview', 'development')
    }
    # Add other safe vars here
)

foreach ($env in $envVars) {
    $body = $env | ConvertTo-Json -Depth 10
    $response = Invoke-RestMethod -Uri 'https://api.vercel.com/v6/projects/kero-sistema-delivery/env' -Method POST -Headers $headers -Body $body
    Write-Host "Added:" $env.key
}

Write-Host "`nDone! Variables added safely with env vars."
