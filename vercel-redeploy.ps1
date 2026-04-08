$headers = @{
    'Authorization' = 'Bearer $env:VERCEL_TOKEN'
    'Content-Type' = 'application/json'
}

# Trigger a new deployment (redeply)
$body = @{
    gitSource = @{
        type = 'github'
        repoId = 'R_kgDOOZwOQQ'
        ref = 'main'
    }
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri 'https://api.vercel.com/v6/deployments' -Method POST -Headers $headers -Body $body
Write-Host "Deployment triggered!"
Write-Host "URL will be: $($response.url)"
Write-Host "State: $($response.readyState)"
