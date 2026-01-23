# Ansa MES - Windows Server Deployment Guide

## Prerequisites

1. **Windows Server 2019/2022** (or Windows 10/11 for testing)
2. **Node.js 20 LTS** - [Download](https://nodejs.org/en/download/) or `winget install OpenJS.NodeJS.LTS`
3. **IIS** (Internet Information Services) - for serving the web UI
4. **NSSM** (optional) - for running API as a Windows Service - [Download](https://nssm.cc/download)

## Quick Start

### 1. Build the Application

On your development machine:

```powershell
# Build both API and Web
pnpm nx build @org/api
pnpm nx build @org/web

# Or use the deployment build script
./scripts/build-deployment.sh
```

### 2. Copy Files to Server

Copy the `deployment` folder to your Windows Server:
- Via network share: `\\server\c$\temp\deployment`
- Via USB/remote desktop
- Via SCP/SFTP

### 3. Run Installation

Open PowerShell as Administrator:

```powershell
cd C:\temp\deployment\windows
.\install.ps1 -InstallPath "C:\ansa-mes"
```

### 4. Configure Environment

Edit `C:\ansa-mes\api\.env` with your credentials:

```env
NODE_ENV=production
PORT=3000

# SAP HANA Database
HANA_HOST=192.168.1.100
HANA_PORT=30015
HANA_USER=SYSTEM
HANA_PASSWORD=YourPassword
HANA_DATABASE=NDB

# SAP Service Layer
SL_BASE_URL=https://sap-server:50000/b1s/v1
SL_COMPANY_DB=SBODEMOUS
SL_USERNAME=manager
SL_PASSWORD=YourPassword
```

### 5. Configure IIS for Web UI

#### Option A: Using IIS Manager (GUI)

1. Open **IIS Manager** (`inetmgr`)
2. Right-click **Sites** → **Add Website**
3. Configure:
   - Site name: `AnsaMES`
   - Physical path: `C:\ansa-mes\web`
   - Port: `80` (or `443` for HTTPS)
4. Add URL Rewrite rule for API proxy (see below)

#### Option B: Using PowerShell

```powershell
# Install IIS features if not present
Install-WindowsFeature -Name Web-Server, Web-Http-Redirect, Web-Filtering -IncludeManagementTools

# Install URL Rewrite Module (download from Microsoft first)
# https://www.iis.net/downloads/microsoft/url-rewrite

# Create the website
Import-Module WebAdministration
New-Website -Name "AnsaMES" -PhysicalPath "C:\ansa-mes\web" -Port 80
```

### 6. Configure URL Rewrite for API Proxy

Create `C:\ansa-mes\web\web.config`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <!-- API Proxy -->
                <rule name="API Proxy" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://localhost:3000/api/{R:1}" />
                </rule>
                <!-- SPA Fallback -->
                <rule name="SPA Fallback" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/index.html" />
                </rule>
            </rules>
        </rewrite>
        <staticContent>
            <mimeMap fileExtension=".json" mimeType="application/json" />
        </staticContent>
    </system.webServer>
</configuration>
```

> **Note:** Install [URL Rewrite Module](https://www.iis.net/downloads/microsoft/url-rewrite) and [Application Request Routing](https://www.iis.net/downloads/microsoft/application-request-routing) for the API proxy to work.

### 7. Start the API Service

#### With NSSM (Recommended):

```powershell
# Start service
nssm start AnsaMES

# Check status
nssm status AnsaMES

# View logs
Get-Content C:\ansa-mes\logs\service.log -Tail 50
```

#### Without NSSM (Manual):

```powershell
cd C:\ansa-mes\api
node main.js
```

Or create a scheduled task to run at startup.

## Alternative: Using PM2 on Windows

PM2 also works on Windows:

```powershell
# Install PM2 globally
npm install -g pm2
npm install -g pm2-windows-startup

# Start API
cd C:\ansa-mes\api
pm2 start main.js --name "ansa-mes-api"

# Save and configure startup
pm2 save
pm2-startup install
```

## Firewall Configuration

```powershell
# Allow HTTP (port 80)
New-NetFirewallRule -DisplayName "Ansa MES HTTP" -Direction Inbound -Port 80 -Protocol TCP -Action Allow

# Allow HTTPS (port 443) if using SSL
New-NetFirewallRule -DisplayName "Ansa MES HTTPS" -Direction Inbound -Port 443 -Protocol TCP -Action Allow

# Allow API port (if accessing directly)
New-NetFirewallRule -DisplayName "Ansa MES API" -Direction Inbound -Port 3000 -Protocol TCP -Action Allow
```

## SSL/HTTPS Setup

### Using IIS with Let's Encrypt (win-acme)

1. Download [win-acme](https://www.win-acme.com/)
2. Run `wacs.exe`
3. Follow prompts to generate and install certificate

### Using Self-Signed Certificate

```powershell
# Create self-signed certificate
$cert = New-SelfSignedCertificate -DnsName "ansa-mes.local" -CertStoreLocation "cert:\LocalMachine\My"

# Bind to IIS
New-WebBinding -Name "AnsaMES" -Protocol "https" -Port 443
$binding = Get-WebBinding -Name "AnsaMES" -Protocol "https"
$binding.AddSslCertificate($cert.Thumbprint, "My")
```

## Troubleshooting

### API won't start
```powershell
# Check if port is in use
netstat -ano | findstr :3000

# Check Node.js
node --version

# Run manually to see errors
cd C:\ansa-mes\api
node main.js
```

### IIS 500 errors
1. Check `C:\ansa-mes\web\web.config` syntax
2. Ensure URL Rewrite module is installed
3. Check IIS logs: `C:\inetpub\logs\LogFiles`

### Database connection issues
```powershell
# Test HANA connectivity
Test-NetConnection -ComputerName your-hana-server -Port 30015
```

## Service Management

```powershell
# Using NSSM
nssm start AnsaMES
nssm stop AnsaMES
nssm restart AnsaMES
nssm status AnsaMES
nssm edit AnsaMES    # GUI configuration

# View logs
Get-Content C:\ansa-mes\logs\service.log -Tail 100 -Wait
```

## Directory Structure

```
C:\ansa-mes\
├── api\
│   ├── main.js          # API entry point
│   ├── node_modules\    # Dependencies
│   ├── package.json
│   └── .env             # Configuration
├── web\
│   ├── index.html       # SPA entry
│   ├── assets\          # JS/CSS bundles
│   └── web.config       # IIS configuration
└── logs\
    ├── service.log      # API stdout
    └── error.log        # API stderr
```
