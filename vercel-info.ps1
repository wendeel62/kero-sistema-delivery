$headers = @{
    'Authorization' = 'Bearer `$env:VERCEL_TOKEN'
}

# Get project info
$project = Invoke-RestMethod -Uri 'https://api.vercel.com/v6/projects/kero-sistema-delivery' -Headers $headers
$project | ConvertTo-Json -Depth 10

Write-Host "`n=== Latest Deployment ==="
$deployments = Invoke-RestMethod -Uri 'https://api.vercel.com/v6/deployments?projectId=' + $project.id -Headers $headers
$deployments.deployments[0] | ConvertTo-Json -Depth 10
