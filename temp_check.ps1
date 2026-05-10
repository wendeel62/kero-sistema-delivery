param([string]$baseUrl, [string]$path, [string]$apiKey)
$ErrorActionPreference = "SilentlyContinue"
try {
    $headers = @{"X-Api-Key" = $apiKey}
    $response = Invoke-WebRequest -Method GET -Uri "$baseUrl$path" -Headers $headers -UseBasicParsing -TimeoutSec 5
    $response.Content
} catch {
    @{"error" = $_.Exception.Message; "status" = [int]$_.Exception.Response.StatusCode} | ConvertTo-Json
}