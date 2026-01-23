# Start Ansa MES API
param([string]$InstallPath = "C:\ansa-mes")

$apiPath = Join-Path $InstallPath "api"

# Check for NSSM service first
$service = Get-Service -Name "AnsaMES" -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "Starting AnsaMES service..." -ForegroundColor Yellow
    Start-Service -Name "AnsaMES"
    Write-Host "Service started" -ForegroundColor Green
    exit 0
}

# Fall back to manual start
Write-Host "Starting API manually..." -ForegroundColor Yellow
Push-Location $apiPath
Start-Process -FilePath "node" -ArgumentList "main.js" -NoNewWindow
Pop-Location
Write-Host "API started on http://localhost:3000" -ForegroundColor Green
