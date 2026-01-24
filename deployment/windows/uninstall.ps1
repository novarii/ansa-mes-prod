# Ansa MES Uninstaller for Windows
# Run as Administrator

param(
    [string]$InstallPath = "C:\ansa-mes",
    [switch]$KeepData = $false
)

$ErrorActionPreference = "Stop"

Write-Host "Ansa MES Uninstaller" -ForegroundColor Red
Write-Host "===================" -ForegroundColor Red

# Check Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Please run as Administrator" -ForegroundColor Red
    exit 1
}

Write-Host "`nThis will remove:" -ForegroundColor Yellow
Write-Host "  - Windows Service 'AnsaMES'" -ForegroundColor White
Write-Host "  - IIS Website 'AnsaMES'" -ForegroundColor White
Write-Host "  - Firewall rules" -ForegroundColor White
if (-not $KeepData) {
    Write-Host "  - Installation files: $InstallPath" -ForegroundColor White
}

$confirm = Read-Host "`nContinue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Cancelled" -ForegroundColor Yellow
    exit 0
}

# Stop and remove Windows Service
Write-Host "`n[1/4] Removing Windows Service..." -ForegroundColor Cyan
$nssmCmd = Get-Command nssm -ErrorAction SilentlyContinue
if ($nssmCmd) {
    $service = Get-Service -Name "AnsaMES" -ErrorAction SilentlyContinue
    if ($service) {
        nssm stop AnsaMES 2>&1 | Out-Null
        nssm remove AnsaMES confirm 2>&1 | Out-Null
        Write-Host "  [OK] Service removed" -ForegroundColor Green
    } else {
        Write-Host "  --> Service not found" -ForegroundColor Gray
    }
} else {
    Write-Host "  --> NSSM not found, skipping" -ForegroundColor Gray
}

# Remove IIS Website
Write-Host "`n[2/4] Removing IIS Website..." -ForegroundColor Cyan
Import-Module WebAdministration -ErrorAction SilentlyContinue
$site = Get-Website -Name "AnsaMES" -ErrorAction SilentlyContinue
if ($site) {
    Remove-Website -Name "AnsaMES"
    Write-Host "  [OK] IIS site removed" -ForegroundColor Green
} else {
    Write-Host "  --> IIS site not found" -ForegroundColor Gray
}

# Remove Firewall Rules
Write-Host "`n[3/4] Removing Firewall Rules..." -ForegroundColor Cyan
$rules = Get-NetFirewallRule -DisplayName "Ansa MES*" -ErrorAction SilentlyContinue
if ($rules) {
    $rules | Remove-NetFirewallRule
    Write-Host "  [OK] Firewall rules removed" -ForegroundColor Green
} else {
    Write-Host "  --> No firewall rules found" -ForegroundColor Gray
}

# Remove Installation Files
if (-not $KeepData) {
    Write-Host "`n[4/4] Removing Installation Files..." -ForegroundColor Cyan
    if (Test-Path $InstallPath) {
        Remove-Item -Path $InstallPath -Recurse -Force
        Write-Host "  [OK] Files removed: $InstallPath" -ForegroundColor Green
    } else {
        Write-Host "  --> Directory not found" -ForegroundColor Gray
    }
} else {
    Write-Host "`n[4/4] Keeping Data..." -ForegroundColor Cyan
    Write-Host "  --> Installation files preserved: $InstallPath" -ForegroundColor Gray
}

Write-Host "`n[OK] Uninstall Complete" -ForegroundColor Green
Write-Host ""
