# CI/CD Setup Complete! 🎉

Your Ansa MES repository now has a complete automated deployment pipeline using GitHub Actions.

## 📋 What Was Created

### 1. Deployment Files (`deployment/` directory)

| File | Purpose |
|------|---------|
| `.env.template` | Configuration template for clients |
| `install.sh` | Automated installation script |
| `start.sh`, `stop.sh`, `restart.sh`, `status.sh` | Service management |
| `nginx.conf` | Reverse proxy configuration |
| `README.md` | Complete installation guide (9KB) |
| `QUICK-START.md` | Quick reference guide |
| `CHANGELOG.md` | Version history template |

### 2. Build Scripts

| Script | Purpose |
|--------|---------|
| `scripts/build-deployment.sh` | Manual build script (if needed) |

### 3. GitHub Actions Workflows (`.github/workflows/`)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **ci.yml** | Pull requests | Fast CI checks (lint, test, typecheck) |
| **build-deployment.yml** | Push to `main` | Build deployment packages |
| **release.yml** | Git tag `v*.*.*` | Create official releases |
| **deploy-self-hosted.yml** | Push to `deploy` | Auto-deploy to on-prem (optional) |

### 4. Documentation

| File | Description |
|------|-------------|
| `DEPLOYMENT.md` | Developer deployment guide |
| `.github/CICD.md` | Complete CI/CD documentation |
| `.github/README.md` | Workflows quick reference |
| `CICD-SETUP-SUMMARY.md` | This file |

### 5. Configuration Updates

- ✅ Updated `apps/api/webpack.config.js` to generate production `package.json`
- ✅ Added `dist-deployment/` to `.gitignore`
- ✅ Updated existing `ci.yml` to run only on PRs (avoid duplication)

---

## 🚀 How It Works

### For Development (Pull Requests)

```bash
# Create a PR
git checkout -b feature/my-feature
git push origin feature/my-feature
# Open PR on GitHub

# Workflow 'ci.yml' automatically runs:
# - Lints code
# - Runs tests
# - Type checks
# - Builds everything
```

**Result:** Fast feedback on PRs without creating deployment artifacts.

---

### For Main Branch (Continuous Builds)

```bash
# Merge PR or push to main
git push origin main

# Workflow 'build-deployment.yml' automatically:
# 1. Runs full test suite
# 2. Builds API (production-optimized)
# 3. Builds Web (minified)
# 4. Creates deployment tarball
# 5. Uploads as artifact (90 days)
```

**Download artifact:**
1. Go to Actions tab in GitHub
2. Click on the workflow run
3. Scroll to "Artifacts" section
4. Download `ansa-mes-{version}.tar.gz`

**Result:** Every push to main creates a testable deployment package.

---

### For Production (Releases) ⭐ **Recommended**

```bash
# 1. Update CHANGELOG.md
nano deployment/CHANGELOG.md
# Add version section (see template)

# 2. Commit changelog
git add deployment/CHANGELOG.md
git commit -m "chore: update changelog for v1.0.0"
git push origin main

# 3. Create and push tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Workflow 'release.yml' automatically:
# 1. Builds production package
# 2. Extracts release notes from CHANGELOG.md
# 3. Creates GitHub Release
# 4. Attaches tarball as download
```

**Download for clients:**
- Go to GitHub Releases page
- Find version (e.g., "Ansa MES v1.0.0")
- Download `ansa-mes-v1.0.0.tar.gz` from Assets
- Transfer to client server and follow README.md

**Result:** Professional release management with version tracking.

---

### For Automated Deployment (Optional, Advanced)

**Setup Required:**
1. Install self-hosted GitHub Actions runner on client network
2. Configure SSH access to target server
3. Add repository secrets (see `.github/CICD.md`)

**Usage:**
```bash
# Push to deploy branch
git checkout -b deploy
git merge main
git push origin deploy

# Workflow 'deploy-self-hosted.yml' automatically:
# 1. Builds application
# 2. Stops current service
# 3. Backs up existing installation
# 4. Transfers and installs new version
# 5. Restarts service
# 6. Performs health check
```

**Result:** Zero-touch deployment to on-premises server.

---

## 📊 Deployment Strategies Comparison

| Strategy | When | How | Best For |
|----------|------|-----|----------|
| **Manual** | Any time | Run `./scripts/build-deployment.sh` | Initial setup, air-gapped |
| **Main Branch** | Every push to main | Automatic | Development testing |
| **Releases** ⭐ | Create git tag | Automatic | Production deployments |
| **Self-Hosted** | Push to deploy branch | Fully automatic | Staging, frequent updates |

### ⭐ Recommended: Use Releases Strategy

**Why:**
- ✅ Professional version management
- ✅ Easy for clients to download
- ✅ Release notes automatically generated
- ✅ Permanent artifact storage
- ✅ Works with any network setup
- ✅ Clients can choose when to upgrade

**Workflow:**
1. Developer: Create git tag → GitHub creates release
2. Client: Download from GitHub Releases
3. Client: Install on server

---

## 🎯 Next Steps

### 1. Test the Workflows

**Option A: Test with main branch build**
```bash
# Make a small change
echo "# Test" >> README.md
git add README.md
git commit -m "test: trigger workflow"
git push origin main

# Check GitHub Actions tab
# Download artifact when complete
```

**Option B: Test with release (recommended)**
```bash
# Update changelog first
nano deployment/CHANGELOG.md

# Create test release
git tag -a v0.1.0-test -m "Test release"
git push origin v0.1.0-test

# Check GitHub Releases page
# Download tarball and test installation
```

### 2. Update CHANGELOG.md Template

Edit `deployment/CHANGELOG.md` with your initial version:

```markdown
## [v1.0.0] - 2026-01-22

### Added
- Work order management system
- Production entry with batch numbers
- Activity tracking (start/stop/resume/finish)
- Team view with worker status
- Calendar view for work orders
- SAP B1 integration (HANA + Service Layer)

### Technical
- NestJS 11 backend with TypeScript
- React 19 frontend with Tailwind CSS v4
- Automated deployment pipeline
- Production-ready systemd service
- Nginx reverse proxy configuration
```

### 3. Configure Repository Settings

**For Releases strategy (recommended):**
- ✅ Nothing to configure - works out of the box!

**For Self-Hosted strategy (optional):**
1. Install runner on client network
2. Add repository secrets:
   - `DEPLOY_SERVER`: Server IP
   - `DEPLOY_USER`: SSH user
   - `DEPLOY_SSH_KEY`: SSH private key
   - `DEPLOY_PATH`: Installation path (optional)

See `.github/CICD.md` for detailed setup instructions.

### 4. Test on Client Server

Once you have a release artifact:

```bash
# Transfer to client
scp ansa-mes-v1.0.0.tar.gz admin@client-server:/tmp/

# On client server
cd /tmp
tar -xzf ansa-mes-v1.0.0.tar.gz
cd ansa-mes-v1.0.0
sudo ./scripts/install.sh

# Follow prompts and configure .env
sudo nano /opt/ansa-mes/.env

# Start application
sudo systemctl start ansa-mes
sudo systemctl enable ansa-mes
sudo systemctl reload nginx

# Access in browser
http://client-server-ip
```

---

## 📚 Documentation Reference

| Document | Purpose | Location |
|----------|---------|----------|
| **CI/CD Guide** | Complete workflow documentation | `.github/CICD.md` |
| **Deployment Guide** | Developer deployment guide | `DEPLOYMENT.md` |
| **Workflows README** | Quick workflow reference | `.github/README.md` |
| **Installation Guide** | Client installation instructions | `deployment/README.md` |
| **Quick Start** | Quick reference for users | `deployment/QUICK-START.md` |

---

## 🔒 Security Notes

### Secrets Management

**Never commit:**
- Real `.env` files with credentials
- SSH private keys
- Database passwords

**Use GitHub Secrets for:**
- SSH keys (self-hosted deployment)
- Server addresses (self-hosted deployment)
- Deployment credentials (self-hosted deployment)

### Build Security

All workflows:
- ✅ Run in isolated environments
- ✅ Use locked dependencies (`pnpm-lock.yaml`)
- ✅ Run tests before building
- ✅ No secrets in build output

### Deployment Security

Installation scripts:
- ✅ Run as dedicated `ansa` user
- ✅ `.env` file with 600 permissions
- ✅ Systemd hardening enabled
- ✅ Nginx reverse proxy isolation

---

## 🐛 Troubleshooting

### Workflow Not Running

**Check:**
1. GitHub Actions is enabled (Settings > Actions)
2. Branch protection rules don't block workflows
3. Workflow file syntax is valid

### Build Fails

**Common causes:**
1. Lint errors: `pnpm nx run-many -t lint`
2. Type errors: `pnpm nx run-many -t typecheck`
3. Test failures: `pnpm nx run-many -t test`
4. Missing dependencies: `pnpm install`

**Fix locally first, then push:**
```bash
pnpm install
pnpm nx run-many -t lint test typecheck
git push origin main
```

### Cannot Download Artifact

**If too large:**
- GitHub limit: 2GB per artifact
- Our package: ~50-100MB (well under limit)
- If larger, check for accidentally included `node_modules`

**If expired:**
- Main branch artifacts: 90 days retention
- Release artifacts: Permanent (GitHub Releases)
- Solution: Create a new tag to rebuild

---

## ✅ Checklist: Ready to Deploy

Before your first production release:

- [ ] Test workflows by creating a test tag
- [ ] Update `deployment/CHANGELOG.md` with version details
- [ ] Test build locally: `./scripts/build-deployment.sh test`
- [ ] Download and extract GitHub release tarball
- [ ] Test installation on a test server
- [ ] Verify `.env.template` has all required variables
- [ ] Review `deployment/README.md` for client instructions
- [ ] Create first production release: `git tag -a v1.0.0`
- [ ] Provide download link to clients
- [ ] Document any client-specific configuration

---

## 🎓 Quick Command Reference

### Create a Release
```bash
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

### Manual Build (if needed)
```bash
./scripts/build-deployment.sh v1.0.0
```

### Download Latest Release (using GitHub CLI)
```bash
gh release download v1.0.0 --pattern '*.tar.gz'
```

### Check Workflow Status
```bash
gh run list --workflow=build-deployment.yml
gh run watch  # Watch live
```

### Trigger Manual Build
```bash
gh workflow run build-deployment.yml -f version=v1.0.0-beta
```

---

## 🌟 Benefits of This Setup

### For Developers
- ✅ Automated testing on every PR
- ✅ Consistent builds in CI environment
- ✅ No manual build commands needed
- ✅ Version tracking built-in
- ✅ Can work on features without worrying about builds

### For DevOps
- ✅ Reproducible builds
- ✅ Artifact retention (90 days / permanent for releases)
- ✅ Audit trail (who released what, when)
- ✅ Optional full automation with self-hosted runners
- ✅ Rollback capability (download previous release)

### For Clients
- ✅ Professional release downloads
- ✅ Clear version numbers
- ✅ Release notes for each version
- ✅ Simple installation process
- ✅ No source code exposure (compiled only)

---

## 📧 Support

For issues:
- **Workflow problems**: Check `.github/CICD.md`
- **Build failures**: Review GitHub Actions logs
- **Deployment issues**: See `deployment/README.md`
- **Questions**: Review documentation or contact development team

---

**You're all set! 🚀**

Start by pushing to main or creating your first release tag. The automation will handle the rest!
