$headers = @{
    'Authorization' = "Bearer `$env:SUPABASE_SERVICE_ROLE_KEY"
    'apikey' = "`$env:SUPABASE_SERVICE_ROLE_KEY"
    'Content-Type'
