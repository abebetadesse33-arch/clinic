$body = @{
    email = 'abebetadesse1@gmail.com'
    password = 'Ninielda@&1'
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri 'http://localhost:3000/api/v1/auth/signin' -Method Post -Body $body -ContentType 'application/json'
$response | ConvertTo-Json -Depth 5
