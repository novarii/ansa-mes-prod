# GitHub Workflows

This directory contains GitHub Actions workflows for automated building and deployment of Ansa MES.

## Available Workflows

### 🔨 [build-deployment.yml](workflows/build-deployment.yml)
**Continuous Integration - Automatic Builds**

- **Trigger**: Every push to `main` branch
- **Also**: Manual trigger via GitHub UI
- **Purpose**: Automated testing and building
- **Output**: Deployment artifact (90 day retention)
- **Use Case**: Development and testing builds

**What it does:**
1. Lints and type checks code
2. Runs test suite
3. Builds API and Web
4. Creates deployment tarball
5. Uploads as artifact

---

### 🎉 [release.yml](workflows/release.yml)
**Release Management - Official Releases**

- **Trigger**: Git tag matching `v*.*.*` (e.g., `v1.0.0`)
- **Purpose**: Create official releases
- **Output**: GitHub Release with downloadable tarball
- **Use Case**: Production releases for clients

**What it does:**
1. Runs full test suite
2. Builds production package
3. Extracts release notes from CHANGELOG.md
4. Creates GitHub Release
5. Attaches tarball to release

**How to use:**
```bash
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

---

### 🚀 [deploy-self-hosted.yml](workflows/deploy-self-hosted.yml)
**Automated Deployment - Self-Hosted**

- **Trigger**: Push to `deploy` branch or manual
- **Purpose**: Full automation to on-premises server
- **Output**: Live deployment
- **Use Case**: Automated deployments with self-hosted runner

**Requirements:**
- Self-hosted GitHub Actions runner
- SSH access to target server
- Configured repository secrets

**What it does:**
1. Builds application
2. Stops current service
3. Backs up existing installation
4. Transfers and installs new version
5. Restarts service
6. Performs health check

**Setup required:**
See [CICD.md](CICD.md#workflow-3-self-hosted-deployment-deploy-self-hostedyml)

---

## Documentation

- **[CICD.md](CICD.md)** - Complete CI/CD documentation
  - Workflow details
  - Setup instructions
  - Deployment strategies
  - Security considerations
  - Troubleshooting

---

## Quick Start

### For Development (Automatic Builds)

Just push to main:
```bash
git push origin main
```

Download artifact from GitHub Actions runs.

### For Production (Release)

Create a git tag:
```bash
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

Download from GitHub Releases page.

### For Full Automation (Advanced)

Set up self-hosted runner, then push to deploy branch:
```bash
git checkout -b deploy
git push origin deploy
```

---

## Deployment Strategies Comparison

| Strategy | Setup | Automation | Best For |
|----------|-------|------------|----------|
| **Manual** | None | Manual | Air-gapped environments |
| **Build + Manual** | GitHub Actions only | Build only | Most production deploys |
| **Releases** | GitHub Actions only | Build + Release | Multiple clients |
| **Self-Hosted** | Runner + SSH setup | Fully automated | Dev/staging, frequent deploys |

**Recommended:** Use **Releases** strategy for production deployments.

---

## Repository Secrets (for self-hosted deployment)

Configure in Settings > Secrets and variables > Actions:

| Secret | Description |
|--------|-------------|
| `DEPLOY_SERVER` | Target server IP/hostname |
| `DEPLOY_USER` | SSH username |
| `DEPLOY_SSH_KEY` | SSH private key |
| `DEPLOY_PATH` | Installation path (optional, default: /opt/ansa-mes) |

---

## Support

See [CICD.md](CICD.md) for detailed documentation, troubleshooting, and best practices.
