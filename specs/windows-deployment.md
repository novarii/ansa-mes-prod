# Windows Server Deployment Guide

This guide documents deploying Ansa MES on Windows Server with IIS.

## Prerequisites

- **Windows Server 2019/2022** (or Windows 10/11 for testing)
- **Node.js 20 LTS** - `winget install OpenJS.NodeJS.LTS`
- **IIS** with URL Rewrite and ARR modules
- **NSSM** (for running API as a service) - https://nssm.cc/download

### IIS Modules

Install these before deployment:
- [URL Rewrite](https://www.iis.net/downloads/microsoft/url-rewrite)
- [Application Request Routing (ARR)](https://www.iis.net/downloads/microsoft/application-request-routing)

After installing ARR, enable proxy:
1. IIS Manager → click **server name** (not the site)
2. Double-click **Application Request Routing Cache**
3. Click **Server Proxy Settings** on the right
4. Check **Enable proxy** → Apply

---

## Step 1: Extract Release Package

Download the release package and extract:

```powershell
tar -xzf ansa-mes-v1.0.2.tar.gz
cd ansa-mes-v1.0.2
```

Package structure:
```
ansa-mes-v1.0.2/
├── api/          # NestJS backend
├── web/          # React frontend
├── windows/      # Windows scripts
│   ├── install.ps1
│   ├── web.config
│   └── README.md
└── config/
    └── .env.example
```

---

## Step 2: Copy Files to Install Location

```powershell
$src = "C:\Users\YourUser\Downloads\ansa-mes-v1.0.2"
$dest = "C:\ansa-mes"  # Or your preferred location

# Create directories
New-Item -ItemType Directory -Path "$dest\api" -Force
New-Item -ItemType Directory -Path "$dest\web" -Force
New-Item -ItemType Directory -Path "$dest\logs" -Force

# Copy files
Copy-Item -Path "$src\api\*" -Destination "$dest\api" -Recurse -Force
Copy-Item -Path "$src\web\*" -Destination "$dest\web" -Recurse -Force
Copy-Item -Path "$src\windows\web.config" -Destination "$dest\web" -Force
```

---

## Step 3: Install API Dependencies

The release package has workspace references that must be removed:

```powershell
notepad $dest\api\package.json
```

**Remove these lines** from dependencies (they're bundled in main.js):
```json
"@org/feature-auth": "workspace:*",
"@org/feature-calendar": "workspace:*",
"@org/feature-production": "workspace:*",
"@org/feature-team": "workspace:*",
"@org/feature-work-orders": "workspace:*",
"@org/shared-types": "workspace:*",
```

Then install:
```powershell
cd $dest\api
npm install --omit=dev
```

---

## Step 4: Configure Environment

Create `.env` file:

```powershell
notepad $dest\api\.env
```

Contents:
```env
NODE_ENV=production
PORT=3000

# SAP HANA Database
HANA_HOST=192.168.0.150
HANA_PORT=30015
HANA_USER=your-user
HANA_PASSWORD=your-password
HANA_DATABASE=NDB
HANA_SCHEMA=your-schema

# SAP Service Layer
SL_BASE_URL=https://192.168.0.150:50000/b1s/v2
SL_COMPANY=your-company-db
SL_USERNAME=manager
SL_PASSWORD=your-password

# TLS (0 for self-signed certs)
NODE_TLS_REJECT_UNAUTHORIZED=0
```

> **Important:** The code expects `SL_COMPANY`, not `SL_COMPANY_DB`.

---

## Step 5: Test API Manually

Before setting up the service, verify it starts:

```powershell
cd $dest\api
node main.js
```

You should see NestJS startup logs. Test with:
```powershell
curl http://localhost:3000/api/auth/login -Method POST
```

Press `Ctrl+C` to stop.

---

## Step 6: Set Up API as Windows Service (NSSM)

Download NSSM from https://nssm.cc/download and extract.

```powershell
$nssm = "C:\path\to\nssm.exe"

# Find node path
(Get-Command node).Source  # e.g., C:\nvm4w\nodejs\node.exe

# Install service
& $nssm install AnsaMES
```

In the GUI:
- **Path:** `C:\nvm4w\nodejs\node.exe` (or your node path)
- **Startup directory:** `C:\ansa-mes\api`
- **Arguments:** `main.js`

Click **Install service**.

Configure logging:
```powershell
& $nssm set AnsaMES AppStdout "C:\ansa-mes\logs\api.log"
& $nssm set AnsaMES AppStderr "C:\ansa-mes\logs\error.log"
```

Start the service:
```powershell
& $nssm start AnsaMES
```

### NSSM Commands Reference

```powershell
& $nssm start AnsaMES      # Start
& $nssm stop AnsaMES       # Stop
& $nssm restart AnsaMES    # Restart
& $nssm status AnsaMES     # Check status
& $nssm edit AnsaMES       # Edit config (GUI)
& $nssm remove AnsaMES     # Uninstall service
```

### View Logs

```powershell
# Tail log (live)
Get-Content "C:\ansa-mes\logs\api.log" -Tail 50 -Wait

# View recent entries
Get-Content "C:\ansa-mes\logs\api.log" -Tail 100
```

---

## Step 7: Configure IIS for Web UI

### Using IIS Manager (GUI)

1. Open **IIS Manager** (`inetmgr`)
2. Right-click **Sites** → **Add Website**
3. Configure:
   - **Site name:** `AnsaMES`
   - **Physical path:** `C:\ansa-mes\web`
   - **Port:** `80` (or another available port)
4. Click **OK**

### Verify web.config

Ensure `C:\ansa-mes\web\web.config` exists with URL rewrite rules:
- `/api/*` requests proxy to `http://localhost:3000`
- SPA fallback serves `index.html` for client routes

---

## Step 8: Configure Firewall

Allow inbound traffic (run as Admin):

```powershell
# Web UI port
New-NetFirewallRule -DisplayName "Ansa MES Web" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# If using different port
New-NetFirewallRule -DisplayName "Ansa MES Web" -Direction Inbound -LocalPort 100 -Protocol TCP -Action Allow
```

---

## Step 9: Access the Application

- **Local:** `http://localhost` or `http://localhost:100`
- **Network:** `http://192.168.0.25:100` (server IP + port)
- **VPN:** Same as network, if VPN routes to the subnet

---

## Troubleshooting

### API won't start - "Cannot find module '@nestjs/common'"

Dependencies not installed. Run:
```powershell
cd C:\ansa-mes\api
npm install --omit=dev
```

### API won't start - workspace package errors

Remove `@org/*` workspace references from `package.json`, then `npm install --omit=dev`.

### SAP Login Failed

1. Check `.env` uses `SL_COMPANY` (not `SL_COMPANY_DB`)
2. Verify credentials work from this server
3. Check `NODE_TLS_REJECT_UNAUTHORIZED=0` is set for self-signed certs
4. Restart API after changing `.env`

### IIS 404 errors on /api/*

1. Ensure URL Rewrite module is installed
2. Ensure ARR is installed and proxy is enabled
3. Verify `web.config` exists in web folder
4. Run `iisreset` after changes

### IIS 404 on page refresh (SPA routes)

`web.config` missing SPA fallback rule. Copy from `windows/web.config`.

### Can't access from network

1. Add firewall rule for the port
2. Check IIS binding shows `*` for IP (not localhost)
3. Verify with `Test-NetConnection -ComputerName <server-ip> -Port <port>`

### Check if API is running

```powershell
Get-Process node
curl http://localhost:3000/api/health
```

### Service won't start

Check NSSM logs:
```powershell
Get-Content "C:\ansa-mes\logs\error.log" -Tail 50
```

Common issues:
- Wrong node.exe path
- Wrong working directory
- Missing `.env` file
