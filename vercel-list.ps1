$headers = @{
    'Authorization' = 'Bearer `$env:VERCEL_TOKEN'
}

# List projects to verify access
$projects = Invoke-RestMethod -Uri 'https://api.vercel.com/v6/projects' -Headers $headers
$projects.projects | ForEach-Object { Write-Host $_.name }
