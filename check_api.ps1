$baseUrl = $args[0]
$path = $args[1]
$apiKey = $args[2]
$ErrorActionPreference = "Stop"
try {
    $uri = New-Object System.Uri($baseUrl + $path)
    $headers = @{"X-Api-Key" = $apiKey}
    $resp = Invoke-WebRequest -Method GET -Uri $uri -Headers $headers -UseBasicParsing -TimeoutSec 5
    $resp.Content
} catch {
    $sc = $_.Exception.Response.StatusCode
    @{"error" = $_.Exception.Message; "statusCode" = $sc} | ConvertTo-Json
}