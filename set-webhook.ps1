$body = @{
    url = "https://kero-sistema-delivery-9z21l6pk0-wendeel62-7129s-projects.vercel.app/api/webhook-whatsapp"
    enabled = $true
    webhookByEvents = $true
    webhookBase64 = $false
    events = @("MESSAGES_UPSERT", "SEND_MESSAGE", "CONNECTION_UPDATE")
} | ConvertTo-Json

$headers = @{
    apikey = "0f4abb7a9b817e256b68cff61f8a1d11ad018036beabc642070a9b0c5a911c4f"
}

$response = Invoke-WebRequest -Uri "http://evolution-api-production-be62.up.railway.app/webhook/set/teste" -Method POST -ContentType "application/json" -Headers $headers -Body $body
$response.Content
