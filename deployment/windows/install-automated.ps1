# Ansa MES Fully Automated Windows Installation Script
# Run as Administrator
# This script automates ALL deployment steps from specs/windows-deployment.md

param(
    [string]$InstallPath = "C:\ansa-mes",
    [string]$WebPort = 80,
    [string]$ApiPort = 3000,
    [switch]$SkipIIS = $false,
    [switch]$SkipService = $false,
    [switch]$Interactive = $true
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Color-coded output functions
function Write-Step { param($msg) Write-Host "`n$msg" -ForegroundColor Cyan }
function Write-Success { param($msg) Write-Host "  ✓ $msg" -ForegroundColor Green }
function Write-Warning { param($msg) Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Write-Info { param($msg) Write-Host "  → $msg" -ForegroundColor White }
function Write-Error { param($msg) Write-Host "  ✗ $msg" -ForegroundColor Red }

Write-Host @"
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║        Ansa MES Automated Windows Installer              ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
"@ -ForegroundColor Cyan

# ============================================================
# Step 0: Pre-flight Checks
# ============================================================

Write-Step "[0/10] Pre-flight Checks"

# Check Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "This script must be run as Administrator"
    Write-Host "`nPlease right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}
Write-Success "Running as Administrator"

# Verify we're in the release package
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$packageRoot = Split-Path -Parent $scriptDir

if (-not (Test-Path (Join-Path $packageRoot "api"))) {
    Write-Error "Cannot find 'api' folder in package"
    Write-Info "Expected structure: ansa-mes-vX.X.X/api/"
    Write-Info "Current location: $packageRoot"
    exit 1
}
Write-Success "Release package structure validated"

# ============================================================
# Step 1: Check Prerequisites
# ============================================================

Write-Step "[1/10] Checking Prerequisites"

# Node.js
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Error "Node.js not found"
    Write-Info "Install with: winget install OpenJS.NodeJS.LTS"
    Write-Info "Or download from: https://nodejs.org/"
    exit 1
}
$nodeVersion = node --version
Write-Success "Node.js $nodeVersion"

# IIS
if (-not $SkipIIS) {
    $iisFeature = Get-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -ErrorAction SilentlyContinue
    if ($iisFeature.State -ne "Enabled") {
        Write-Warning "IIS not installed"
        Write-Info "Installing IIS with URL Rewrite support..."
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole -All -NoRestart
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-ISAPIExtensions -All -NoRestart
        Enable-WindowsOptionalFeature -Online -FeatureName IIS-ISAPIFilter -All -NoRestart
        Write-Success "IIS installed"
    } else {
        Write-Success "IIS installed"
    }
}

# NSSM (optional)
$nssmCmd = Get-Command nssm -ErrorAction SilentlyContinue
if (-not $nssmCmd -and -not $SkipService) {
    Write-Warning "NSSM not found (optional for Windows Service)"
    Write-Info "Download from: https://nssm.cc/download"
    Write-Info "Continuing without service installation..."
    $SkipService = $true
}

# ============================================================
# Step 2: Create Directories
# ============================================================

Write-Step "[2/10] Creating Installation Directories"

$dirs = @(
    $InstallPath,
    "$InstallPath\api",
    "$InstallPath\web",
    "$InstallPath\logs",
    "$InstallPath\config"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Success "Created $dir"
    } else {
        Write-Info "Directory exists: $dir"
    }
}

# ============================================================
# Step 3: Copy Application Files
# ============================================================

Write-Step "[3/10] Copying Application Files"

# Copy API
$apiSource = Join-Path $packageRoot "api"
Write-Info "Copying API files..."
Copy-Item -Path "$apiSource\*" -Destination "$InstallPath\api" -Recurse -Force
Write-Success "API files copied"

# Copy Web
$webSource = Join-Path $packageRoot "web"
Write-Info "Copying Web UI files..."
Copy-Item -Path "$webSource\*" -Destination "$InstallPath\web" -Recurse -Force

# Copy web.config
$webConfigSource = Join-Path $scriptDir "web.config"
if (Test-Path $webConfigSource) {
    Copy-Item -Path $webConfigSource -Destination "$InstallPath\web\web.config" -Force
    Write-Success "Web UI files copied with web.config"
} else {
    Write-Success "Web UI files copied"
    Write-Warning "web.config not found - IIS rewrite may not work"
}

# ============================================================
# Step 4: Fix package.json - Remove Workspace References
# ============================================================

Write-Step "[4/10] Fixing API package.json (removing workspace references)"

$packageJsonPath = Join-Path $InstallPath "api\package.json"
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json

# List of workspace packages to remove
$workspacePackages = @(
    "@org/feature-auth",
    "@org/feature-calendar",
    "@org/feature-production",
    "@org/feature-team",
    "@org/feature-work-orders",
    "@org/shared-types",
    "@org/data-access"
)

$removed = @()
foreach ($pkg in $workspacePackages) {
    if ($packageJson.dependencies.PSObject.Properties.Name -contains $pkg) {
        $packageJson.dependencies.PSObject.Properties.Remove($pkg)
        $removed += $pkg
    }
}

if ($removed.Count -gt 0) {
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content $packageJsonPath -Encoding UTF8
    Write-Success "Removed $($removed.Count) workspace references"
    foreach ($pkg in $removed) {
        Write-Info "  - $pkg"
    }
} else {
    Write-Info "No workspace references found"
}

# ============================================================
# Step 5: Install Dependencies
# ============================================================

Write-Step "[5/10] Installing API Dependencies"

Push-Location "$InstallPath\api"
try {
    Write-Info "Running: npm install --omit=dev..."
    npm install --omit=dev 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Dependencies installed"
    } else {
        Write-Warning "npm install completed with warnings"
    }
} catch {
    Write-Error "Failed to install dependencies: $_"
    exit 1
} finally {
    Pop-Location
}

# ============================================================
# Step 6: Configure Environment (.env)
# ============================================================

Write-Step "[6/10] Configuring Environment"

$envPath = Join-Path $InstallPath "api\.env"

if (Test-Path $envPath) {
    Write-Warning ".env file already exists"
    if ($Interactive) {
        $overwrite = Read-Host "Overwrite? (y/N)"
        if ($overwrite -ne "y") {
            Write-Info "Keeping existing .env"
            $Interactive = $false
        }
    }
}

if ($Interactive) {
    Write-Host "`n  Configure SAP Connection:" -ForegroundColor Yellow

    $hanaHost = Read-Host "  HANA Host (IP or hostname)"
    $hanaPort = Read-Host "  HANA Port (default: 30015)"
    if ([string]::IsNullOrWhiteSpace($hanaPort)) { $hanaPort = "30015" }

    $hanaUser = Read-Host "  HANA Username"
    $hanaPassword = Read-Host "  HANA Password" -AsSecureString
    $hanaPasswordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($hanaPassword))

    $hanaDatabase = Read-Host "  HANA Database (default: NDB)"
    if ([string]::IsNullOrWhiteSpace($hanaDatabase)) { $hanaDatabase = "NDB" }

    $hanaSchema = Read-Host "  HANA Schema"

    Write-Host "`n  SAP Service Layer:" -ForegroundColor Yellow
    $slBaseUrl = Read-Host "  Service Layer URL (e.g., https://192.168.0.150:50000/b1s/v2)"
    $slCompany = Read-Host "  Company Database Name"
    $slUsername = Read-Host "  Service Layer Username"
    $slPassword = Read-Host "  Service Layer Password" -AsSecureString
    $slPasswordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($slPassword))

    $rejectUnauthorized = Read-Host "  Accept self-signed certificates? (Y/n)"
    $tlsReject = if ($rejectUnauthorized -eq "n") { "1" } else { "0" }

    # Generate random session secret
    $sessionSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

    $envContent = @"
# Ansa MES Production Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

NODE_ENV=production
PORT=$ApiPort

# SAP HANA Database
HANA_HOST=$hanaHost
HANA_PORT=$hanaPort
HANA_USER=$hanaUser
HANA_PASSWORD=$hanaPasswordText
HANA_DATABASE=$hanaDatabase
HANA_SCHEMA=$hanaSchema

# SAP Service Layer
SL_BASE_URL=$slBaseUrl
SL_COMPANY=$slCompany
SL_USERNAME=$slUsername
SL_PASSWORD=$slPasswordText

# TLS Configuration
NODE_TLS_REJECT_UNAUTHORIZED=$tlsReject

# Session
SESSION_SECRET=$sessionSecret
"@

    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -NoNewline
    Write-Success ".env configured"

} elseif (-not (Test-Path $envPath)) {
    # Create template
    $templateContent = @"
NODE_ENV=production
PORT=$ApiPort

# SAP HANA Database
HANA_HOST=your-hana-host
HANA_PORT=30015
HANA_USER=your-user
HANA_PASSWORD=your-password
HANA_DATABASE=NDB
HANA_SCHEMA=your-schema

# SAP Service Layer
SL_BASE_URL=https://your-server:50000/b1s/v2
SL_COMPANY=your-company-db
SL_USERNAME=manager
SL_PASSWORD=your-password

# TLS (0 for self-signed certs)
NODE_TLS_REJECT_UNAUTHORIZED=0

# Session
SESSION_SECRET=change-this-to-random-string
"@
    $templateContent | Out-File -FilePath $envPath -Encoding UTF8 -NoNewline
    Write-Warning ".env template created - EDIT BEFORE USE!"
    Write-Info "Location: $envPath"
}

# ============================================================
# Step 7: Test API
# ============================================================

Write-Step "[7/10] Testing API"

Write-Info "Starting API for validation..."
Push-Location "$InstallPath\api"

$apiJob = Start-Job -ScriptBlock {
    param($apiPath)
    Set-Location $apiPath
    node main.js
} -ArgumentList "$InstallPath\api"

Start-Sleep -Seconds 5

if ($apiJob.State -eq "Running") {
    Write-Success "API started successfully"
    Stop-Job $apiJob
    Remove-Job $apiJob
} else {
    Write-Warning "API may have errors - check logs"
    $apiJob | Receive-Job
    Remove-Job $apiJob
}

Pop-Location

# ============================================================
# Step 8: Configure Windows Service (NSSM)
# ============================================================

if (-not $SkipService) {
    Write-Step "[8/10] Configuring Windows Service"

    $serviceName = "AnsaMES"
    $nodePath = (Get-Command node).Source
    $mainJs = Join-Path $InstallPath "api\main.js"

    # Stop and remove existing service
    $existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($existingService) {
        Write-Info "Removing existing service..."
        nssm stop $serviceName 2>&1 | Out-Null
        nssm remove $serviceName confirm 2>&1 | Out-Null
    }

    # Install service
    Write-Info "Installing Windows Service: $serviceName"
    nssm install $serviceName $nodePath $mainJs | Out-Null
    nssm set $serviceName AppDirectory "$InstallPath\api" | Out-Null
    nssm set $serviceName DisplayName "Ansa MES API" | Out-Null
    nssm set $serviceName Description "Ansa Manufacturing Execution System - REST API Server" | Out-Null
    nssm set $serviceName Start SERVICE_AUTO_START | Out-Null
    nssm set $serviceName AppStdout "$InstallPath\logs\api.log" | Out-Null
    nssm set $serviceName AppStderr "$InstallPath\logs\error.log" | Out-Null
    nssm set $serviceName AppStdoutCreationDisposition 4 | Out-Null
    nssm set $serviceName AppStderrCreationDisposition 4 | Out-Null
    nssm set $serviceName AppRotateFiles 1 | Out-Null
    nssm set $serviceName AppRotateOnline 1 | Out-Null
    nssm set $serviceName AppRotateSeconds 86400 | Out-Null
    nssm set $serviceName AppRotateBytes 10485760 | Out-Null

    Write-Success "Windows Service installed: $serviceName"
    Write-Info "Service configured for automatic startup"
    Write-Info "Logs: $InstallPath\logs\"

    # Start service
    Write-Info "Starting service..."
    nssm start $serviceName 2>&1 | Out-Null
    Start-Sleep -Seconds 3

    $serviceStatus = nssm status $serviceName
    if ($serviceStatus -match "SERVICE_RUNNING") {
        Write-Success "Service is running"
    } else {
        Write-Warning "Service status: $serviceStatus"
    }

} else {
    Write-Step "[8/10] Skipping Windows Service Installation"
    Write-Info "To run API manually:"
    Write-Info "  cd $InstallPath\api"
    Write-Info "  node main.js"
}

# ============================================================
# Step 9: Configure IIS
# ============================================================

if (-not $SkipIIS) {
    Write-Step "[9/10] Configuring IIS"

    Import-Module WebAdministration -ErrorAction SilentlyContinue

    $siteName = "AnsaMES"
    $existingSite = Get-Website -Name $siteName -ErrorAction SilentlyContinue

    if ($existingSite) {
        Write-Info "Removing existing IIS site..."
        Remove-Website -Name $siteName
    }

    # Create new website
    Write-Info "Creating IIS website: $siteName"
    New-Website -Name $siteName `
        -PhysicalPath "$InstallPath\web" `
        -Port $WebPort `
        -Force | Out-Null

    Write-Success "IIS website created"
    Write-Info "Site: $siteName"
    Write-Info "Port: $WebPort"
    Write-Info "Path: $InstallPath\web"

    # Check for URL Rewrite module
    $rewriteModule = Get-WebGlobalModule -Name "RewriteModule" -ErrorAction SilentlyContinue
    if (-not $rewriteModule) {
        Write-Warning "URL Rewrite module not installed"
        Write-Info "Download from: https://www.iis.net/downloads/microsoft/url-rewrite"
        Write-Info "web.config may not work without it"
    } else {
        Write-Success "URL Rewrite module detected"
    }

    # Check for ARR
    $arrModule = Get-WebGlobalModule -Name "ApplicationRequestRouting" -ErrorAction SilentlyContinue
    if (-not $arrModule) {
        Write-Warning "Application Request Routing (ARR) not installed"
        Write-Info "Download from: https://www.iis.net/downloads/microsoft/application-request-routing"
        Write-Info "API proxy (/api/*) may not work without it"
    } else {
        Write-Success "ARR module detected"
    }

} else {
    Write-Step "[9/10] Skipping IIS Configuration"
    Write-Info "Web UI location: $InstallPath\web"
    Write-Info "Configure IIS manually or use another web server"
}

# ============================================================
# Step 10: Configure Firewall
# ============================================================

Write-Step "[10/10] Configuring Windows Firewall"

# Web port
$webRuleName = "Ansa MES Web UI"
$existingWebRule = Get-NetFirewallRule -DisplayName $webRuleName -ErrorAction SilentlyContinue
if ($existingWebRule) {
    Write-Info "Firewall rule exists: $webRuleName"
} else {
    New-NetFirewallRule -DisplayName $webRuleName `
        -Direction Inbound `
        -LocalPort $WebPort `
        -Protocol TCP `
        -Action Allow `
        -Profile Domain,Private | Out-Null
    Write-Success "Firewall rule created: Port $WebPort"
}

# API port (optional - usually accessed via IIS proxy)
if ($Interactive) {
    $exposeApi = Read-Host "`n  Expose API port $ApiPort externally? (y/N)"
    if ($exposeApi -eq "y") {
        $apiRuleName = "Ansa MES API"
        New-NetFirewallRule -DisplayName $apiRuleName `
            -Direction Inbound `
            -LocalPort $ApiPort `
            -Protocol TCP `
            -Action Allow `
            -Profile Domain,Private | Out-Null
        Write-Success "Firewall rule created: Port $ApiPort"
    }
}

# ============================================================
# Installation Complete
# ============================================================

Write-Host "`n"
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                                                          ║" -ForegroundColor Green
Write-Host "║              Installation Complete! ✓                    ║" -ForegroundColor Green
Write-Host "║                                                          ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`n📍 Installation Summary:" -ForegroundColor Cyan
Write-Host "   Location: $InstallPath" -ForegroundColor White
Write-Host "   API Port: $ApiPort" -ForegroundColor White
Write-Host "   Web Port: $WebPort" -ForegroundColor White

Write-Host "`n🔗 Access URLs:" -ForegroundColor Cyan
Write-Host "   Local:   http://localhost:$WebPort" -ForegroundColor White
Write-Host "   Network: http://<server-ip>:$WebPort" -ForegroundColor White

if (-not $SkipService) {
    Write-Host "`n🔧 Service Management:" -ForegroundColor Cyan
    Write-Host "   Start:   nssm start AnsaMES" -ForegroundColor White
    Write-Host "   Stop:    nssm stop AnsaMES" -ForegroundColor White
    Write-Host "   Restart: nssm restart AnsaMES" -ForegroundColor White
    Write-Host "   Status:  nssm status AnsaMES" -ForegroundColor White
    Write-Host "   Logs:    Get-Content '$InstallPath\logs\api.log' -Tail 50 -Wait" -ForegroundColor White
}

Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
if (-not $Interactive) {
    Write-Host "   1. Edit .env file: $InstallPath\api\.env" -ForegroundColor Yellow
}
Write-Host "   2. Open browser: http://localhost:$WebPort" -ForegroundColor White
Write-Host "   3. Login with your SAP credentials" -ForegroundColor White

Write-Host "`n✨ Happy Manufacturing!" -ForegroundColor Magenta
Write-Host ""
