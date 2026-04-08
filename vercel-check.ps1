$headers = @{
    'Authorization' = 'Bearer `$env:VERCEL_TOKEN'
}

$project = Invoke-RestMethod -Uri 'https://api.vercel.com/v6/projects/kero-sistema-delivery' -Headers $headers

Write-Host "=== Project Status ===" 
$project.env | Where-Object { $_.key -like '*DATABASE*' -or $_.key -like '*SUPABASE*' } | ForEach-Object { 
    Write-Host "$($_.key): [value hidden]" 
}

Write-Host "`n=== Latest Deployment ==="
$url = "https://api.vercel.com/v6/deployments?projectId=" + $project.id
$deployments = Invoke-RestMethod -Uri $url -Headers $headers
Write-Host "URL: $($deployments.deployments[0].url)"
Write-Host "State: $($deployments.deployments[0].readyState)"
