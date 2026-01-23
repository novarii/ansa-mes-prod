# Stop Ansa MES API
param([string]$InstallPath = "C:\ansa-mes")

# Check for NSSM service first
$service = Get-Service -Name "AnsaMES" -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "Stopping AnsaMES service..." -ForegroundColor Yellow
    Stop-Service -Name "AnsaMES"
    Write-Host "Service stopped" -ForegroundColor Green
    exit 0
}

# Fall back to killing node process
Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "Stopped" -ForegroundColor Green
