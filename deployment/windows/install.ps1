# Ansa MES Windows Installation Script
# Run as Administrator

param(
    [string]$InstallPath = "C:\ansa-mes",
    [string]$NodeVersion = "20"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ansa MES Windows Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Please run this script as Administrator" -ForegroundColor Red
    exit 1
}

# Create installation directory
Write-Host "`n[1/6] Creating installation directory..." -ForegroundColor Yellow
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
}

# Check for Node.js
Write-Host "`n[2/6] Checking Node.js installation..." -ForegroundColor Yellow
$nodeExists = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeExists) {
    Write-Host "Node.js not found. Please install Node.js $NodeVersion LTS from:" -ForegroundColor Red
    Write-Host "https://nodejs.org/en/download/" -ForegroundColor Cyan
    Write-Host "Or use winget: winget install OpenJS.NodeJS.LTS" -ForegroundColor Cyan
    exit 1
}
$nodeVersion = node --version
Write-Host "Node.js found: $nodeVersion" -ForegroundColor Green

# Copy application files
Write-Host "`n[3/6] Copying application files..." -ForegroundColor Yellow
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$packageRoot = Split-Path -Parent $scriptDir

# Check for api/web in package root (release package structure)
# or under dist/ subfolder (development build structure)
$apiSource = Join-Path $packageRoot "api"
$webSource = Join-Path $packageRoot "web"

if (-not (Test-Path $apiSource)) {
    # Fall back to dist/ subfolder for development builds
    $distPath = Join-Path $packageRoot "dist"
    $apiSource = Join-Path $distPath "api"
    $webSource = Join-Path $distPath "web"
}

if (-not (Test-Path $apiSource)) {
    Write-Host "ERROR: API folder not found" -ForegroundColor Red
    Write-Host "Checked: $(Join-Path $packageRoot 'api')" -ForegroundColor Red
    Write-Host "Checked: $apiSource" -ForegroundColor Red
    Write-Host "Please ensure you have the correct release package." -ForegroundColor Red
    exit 1
}

# Copy API
$apiDest = Join-Path $InstallPath "api"
if (Test-Path $apiSource) {
    Copy-Item -Path $apiSource -Destination $apiDest -Recurse -Force
    Write-Host "API copied to $apiDest" -ForegroundColor Green
}

# Copy Web
$webDest = Join-Path $InstallPath "web"
if (Test-Path $webSource) {
    Copy-Item -Path $webSource -Destination $webDest -Recurse -Force
    Write-Host "Web UI copied to $webDest" -ForegroundColor Green
}

# Create environment file
Write-Host "`n[4/6] Creating environment configuration..." -ForegroundColor Yellow
$envFile = Join-Path $InstallPath "api\.env"
$envTemplate = Join-Path $scriptDir ".env.template"

if (-not (Test-Path $envFile)) {
    if (Test-Path $envTemplate) {
        Copy-Item -Path $envTemplate -Destination $envFile
    } else {
        @"
# Ansa MES Configuration
NODE_ENV=production
PORT=3000

# SAP HANA Database
HANA_HOST=your-hana-server
HANA_PORT=30015
HANA_USER=your-user
HANA_PASSWORD=your-password
HANA_DATABASE=your-database

# SAP Service Layer
SL_BASE_URL=https://your-sap-server:50000/b1s/v1
SL_COMPANY_DB=your-company
SL_USERNAME=your-user
SL_PASSWORD=your-password

# Session
SESSION_SECRET=change-this-to-a-secure-random-string
"@ | Out-File -FilePath $envFile -Encoding UTF8
    }
    Write-Host "Environment file created at $envFile" -ForegroundColor Green
    Write-Host "IMPORTANT: Edit this file with your database credentials!" -ForegroundColor Yellow
}

# Install API dependencies
Write-Host "`n[5/6] Installing API dependencies..." -ForegroundColor Yellow
Push-Location (Join-Path $InstallPath "api")
npm install --omit=dev
Pop-Location
Write-Host "Dependencies installed" -ForegroundColor Green

# Create Windows Service using NSSM (if available) or provide manual instructions
Write-Host "`n[6/6] Setting up Windows Service..." -ForegroundColor Yellow

$nssmPath = Get-Command nssm -ErrorAction SilentlyContinue
if ($nssmPath) {
    # Install service using NSSM
    $serviceName = "AnsaMES"
    $nodePath = (Get-Command node).Source
    $apiPath = Join-Path $InstallPath "api\main.js"

    # Remove existing service if present
    nssm stop $serviceName 2>$null
    nssm remove $serviceName confirm 2>$null

    # Install new service
    nssm install $serviceName $nodePath $apiPath
    nssm set $serviceName AppDirectory (Join-Path $InstallPath "api")
    nssm set $serviceName DisplayName "Ansa MES API"
    nssm set $serviceName Description "Ansa Manufacturing Execution System API Server"
    nssm set $serviceName Start SERVICE_AUTO_START
    nssm set $serviceName AppStdout (Join-Path $InstallPath "logs\service.log")
    nssm set $serviceName AppStderr (Join-Path $InstallPath "logs\error.log")

    # Create logs directory
    New-Item -ItemType Directory -Path (Join-Path $InstallPath "logs") -Force | Out-Null

    Write-Host "Windows Service 'AnsaMES' created successfully" -ForegroundColor Green
    Write-Host "Start with: nssm start AnsaMES" -ForegroundColor Cyan
} else {
    Write-Host "NSSM not found. To run as a Windows Service:" -ForegroundColor Yellow
    Write-Host "1. Install NSSM from https://nssm.cc/download" -ForegroundColor White
    Write-Host "2. Run: nssm install AnsaMES" -ForegroundColor White
    Write-Host "3. Set Path to: node.exe" -ForegroundColor White
    Write-Host "4. Set Arguments to: $InstallPath\api\main.js" -ForegroundColor White
    Write-Host "`nOr run manually with:" -ForegroundColor Yellow
    Write-Host "cd $InstallPath\api && node main.js" -ForegroundColor White
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Edit $envFile with your database credentials" -ForegroundColor White
Write-Host "2. Configure IIS to serve the web UI (see README)" -ForegroundColor White
Write-Host "3. Start the API service" -ForegroundColor White
Write-Host "`nAPI will run on: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Web UI location: $webDest" -ForegroundColor Cyan
