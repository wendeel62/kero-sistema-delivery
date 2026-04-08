$headers = @{
    'Authorization' = 'Bearer `$env:VERCEL_TOKEN'
    'Content-Type' = 'application/json'
}

$body = @{
    name = 'kero-sistema-delivery'
    gitSource = @{
        type = 'github'
        repoId = 'R_kgDOOZwOQQ'
        ref = 'main'
        commitId = 'HEAD'
    }
    framework = 'vite'
    buildCommand = 'npm run build'
    outputDirectory = 'dist'
} | ConvertTo-Json -Depth 10

$response = Invoke-RestMethod -Uri 'https://api.vercel.com/v6/deployments' -Method POST -Headers $headers -Body $body
$response | ConvertTo-Json -Depth 10
