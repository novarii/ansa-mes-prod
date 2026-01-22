# Deployment Guide for Developers

This document explains how to create and deploy a production build of Ansa MES to client on-premises servers.

> **CI/CD Integration:** See [.github/CICD.md](.github/CICD.md) for automated build and deployment workflows using GitHub Actions.

## Overview

The deployment strategy packages the application as **compiled/distributable files only** (no source code) for distribution to clients. The package includes:

1. **Compiled backend** (NestJS bundled with Webpack)
2. **Built frontend** (React static files from Vite)
3. **Deployment scripts** (installation, start/stop, management)
4. **Configuration templates** (environment variables)
5. **Documentation** (installation and usage guides)

## Prerequisites

Before building a deployment package, ensure:
- All code is committed and tested
- Version is tagged (optional but recommended)
- All dependencies are up to date

## Creating a Deployment Package

### Automated (Recommended)

**Using GitHub Actions:**

Push to main for automatic builds, or create a git tag for releases:

```bash
# Automatic build on every push
git push origin main
# Download artifact from GitHub Actions

# Or create an official release
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
# Download from GitHub Releases page
```

See [.github/CICD.md](.github/CICD.md) for complete CI/CD documentation.

### Manual (Alternative)

Run the build script from the project root:

```bash
# Build with auto-generated timestamp version
./scripts/build-deployment.sh

# Or build with specific version
./scripts/build-deployment.sh v1.0.0
```

This script will:
1. Build the API with webpack (production mode, optimized)
2. Build the web frontend with Vite (production mode, minified)
3. Create the deployment directory structure
4. Copy all necessary files
5. Create a compressed tarball: `ansa-mes-{version}.tar.gz`

**Output location:** `dist-deployment/ansa-mes-{version}.tar.gz`

### Step 2: Test the Build Locally (Optional)

Before sending to client, you can test the build locally:

```bash
# Extract the tarball
cd dist-deployment
tar -xzf ansa-mes-*.tar.gz
cd ansa-mes-*

# Create a test .env file
cp config/.env.example .env
# Edit .env with test credentials

# Test run the API
cd api
node main.js
```

### Step 3: Transfer to Client

Send the tarball to the client via:
- Secure file transfer (SCP, SFTP)
- USB drive (for air-gapped environments)
- Secure cloud storage link

```bash
# Example: SCP to client server
scp dist-deployment/ansa-mes-*.tar.gz admin@client-server:/tmp/
```

## Client Installation

The client follows the installation guide in `deployment/README.md`:

1. Extract the tarball on their server
2. Run `sudo ./scripts/install.sh`
3. Configure SAP credentials in `/opt/ansa-mes/.env`
4. Start the service with `sudo systemctl start ansa-mes`

**All steps are documented** in the deployment package's README.md file.

## What Gets Deployed

### Application Structure

```
/opt/ansa-mes/                    # Installation directory
├── api/
│   ├── main.js                   # Webpack bundled NestJS application
│   ├── package.json              # Production dependencies only
│   └── node_modules/             # Installed after deploy
├── web/
│   ├── index.html                # React app entry point
│   ├── assets/                   # JS, CSS, images (hashed filenames)
│   └── ...
├── scripts/
│   ├── start.sh
│   ├── stop.sh
│   ├── restart.sh
│   └── status.sh
├── .env                          # Configuration (created from template)
└── VERSION                       # Build version identifier
```

### System Integration

The installation creates:
- **Systemd service**: `/etc/systemd/system/ansa-mes.service`
- **Nginx config**: `/etc/nginx/sites-available/ansa-mes`
- **Log directory**: `/var/log/ansa-mes/`
- **Application user**: `ansa` (restricted, no shell)

## Configuration Management

### Environment Variables

Clients configure the application by editing `/opt/ansa-mes/.env`:

**Critical Settings:**
- `HANA_HOST`, `HANA_PASSWORD` - SAP HANA database connection
- `SL_BASE_URL`, `SL_PASSWORD` - SAP B1 Service Layer connection
- `PORT` - API server port (default: 3000)

**Template:** `deployment/.env.template` is copied to the package and used as a starting point.

### Updating Configuration

To update `.env.template` for future deployments, edit:
```
deployment/.env.template
```

Then rebuild the deployment package.

## Upgrading Client Installations

### Process

1. Build new version: `./scripts/build-deployment.sh v1.1.0`
2. Transfer to client
3. Client follows upgrade steps (documented in README.md):
   - Stop service
   - Backup current installation
   - Run installer (preserves .env)
   - Restart service

### Breaking Changes

If a new version requires configuration changes:

1. Update `deployment/.env.template` with new variables
2. Document changes in `deployment/CHANGELOG.md`
3. Add upgrade notes in the release communication
4. Consider providing a migration script if complex

## Build Configuration

### Backend (Webpack)

File: `apps/api/webpack.config.js`

Key settings:
- `generatePackageJson: true` - Creates package.json with production deps
- `optimization: process.env.NODE_ENV === 'production'` - Minification in production
- `sourceMap: process.env.NODE_ENV !== 'production'` - Source maps in dev only

### Frontend (Vite)

File: `apps/web/vite.config.mts`

Key settings:
- `build.outDir: './dist'` - Output directory
- `build.emptyOutDir: true` - Clean before build
- Automatic code splitting and tree shaking
- Asset hashing for cache busting

## Deployment Architecture

### Runtime Architecture

```
┌──────────────────────────────────┐
│   Client Workstation Browser     │
│         (Port 80)                 │
└────────────┬─────────────────────┘
             │
        ┌────▼─────┐
        │  Nginx   │  ← Serves static files + proxies /api
        │ Port 80  │
        └────┬─────┘
             │
        ┌────▼──────────┐
        │  Node.js API  │  ← Bundled NestJS app
        │  Port 3000    │
        └────┬────┬─────┘
             │    │
    ┌────────▼┐ ┌▼──────────────┐
    │  HANA   │ │ Service Layer │  ← SAP B1 integration
    │  Reads  │ │    Writes     │
    └─────────┘ └───────────────┘
```

### Security Considerations

**What's Protected:**
- `.env` file: `600` permissions (owner read/write only)
- Application runs as dedicated user (`ansa`, no shell)
- Systemd hardening: `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem`

**What Clients Should Do:**
- Enable firewall (only allow port 80/443)
- Use HTTPS with SSL certificate (optional nginx config provided)
- Use strong SAP credentials
- Regular security updates on the OS

## Troubleshooting

### Common Build Issues

**Issue: Webpack build fails**
```bash
# Check for TypeScript errors
pnpm nx typecheck @org/api

# Check dependencies
pnpm install
```

**Issue: Vite build fails**
```bash
# Check for TypeScript errors
pnpm nx typecheck @org/web

# Clear cache
rm -rf node_modules/.vite
pnpm nx build @org/web --skip-nx-cache
```

**Issue: Package is too large**
- Check `node_modules` size in API build
- Ensure `devDependencies` are not included (should only be `dependencies`)
- Consider excluding source maps in production builds

### Common Deployment Issues

Refer to the troubleshooting section in `deployment/README.md` which is included in the client package.

## Monitoring and Maintenance

### Client Responsibilities

Clients are responsible for:
- Operating system security updates
- Monitoring application logs
- Disk space management
- Database/SAP B1 connectivity
- Backup of configuration (`.env` file)

### Developer Responsibilities

Development team is responsible for:
- Application updates and bug fixes
- Feature development
- Build and deployment tooling
- Documentation updates

## File Checklist

Before releasing a deployment package, verify these files exist:

- [ ] `scripts/build-deployment.sh` - Build script
- [ ] `deployment/.env.template` - Configuration template
- [ ] `deployment/install.sh` - Installation script
- [ ] `deployment/start.sh` - Start script
- [ ] `deployment/stop.sh` - Stop script
- [ ] `deployment/restart.sh` - Restart script
- [ ] `deployment/status.sh` - Status script
- [ ] `deployment/nginx.conf` - Nginx configuration
- [ ] `deployment/README.md` - Installation guide
- [ ] `deployment/QUICK-START.md` - Quick reference
- [ ] `deployment/CHANGELOG.md` - Version history

All scripts should be executable (`chmod +x`).

## Version Management

### Versioning Scheme

You can use either:

1. **Timestamp-based** (default): `YYYYMMDD-HHMM`
   - Example: `20260122-1430`
   - Automatic, no manual tracking needed

2. **Semantic versioning**: `vMAJOR.MINOR.PATCH`
   - Example: `v1.2.3`
   - Recommended for formal releases

### Tagging Releases

For semantic versioning, tag the git commit:

```bash
# Create and push tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Build with that version
./scripts/build-deployment.sh v1.0.0
```

## Next Steps

- [ ] Update `deployment/CHANGELOG.md` with changes
- [ ] Test build locally before sending to client
- [ ] Coordinate with client for deployment window
- [ ] Prepare rollback plan (keep previous version available)

---

**Questions?** Review the deployment package's README.md or contact the development team.
