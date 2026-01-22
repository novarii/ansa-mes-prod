# CI/CD Pipeline Documentation

This document explains the automated build and deployment workflows for Ansa MES.

## Overview

We have three GitHub Actions workflows for different deployment scenarios:

| Workflow | Trigger | Purpose | Output |
|----------|---------|---------|--------|
| **Build Deployment** | Push to `main` | Continuous builds for testing | Artifact (90 days) |
| **Release** | Git tag `v*.*.*` | Official releases | GitHub Release + tarball |
| **Deploy (Self-Hosted)** | Push to `deploy` or manual | Auto-deploy to client server | Live deployment |

## Workflow 1: Automated Builds (build-deployment.yml)

### Purpose
Automatically builds a deployment package every time code is pushed to `main` branch.

### Triggers
- Push to `main` branch (except markdown-only changes)
- Manual trigger via GitHub Actions UI

### What It Does
1. ✅ Lints code
2. ✅ Type checks
3. ✅ Runs tests
4. 🏗️ Builds API (NestJS with Webpack)
5. 🏗️ Builds Web (React with Vite)
6. 📦 Creates deployment tarball
7. ⬆️ Uploads as GitHub artifact (90 days retention)

### Usage

**Automatic (default):**
```bash
# Just push to main
git push origin main
```

**Manual trigger with custom version:**
1. Go to Actions tab in GitHub
2. Select "Build Deployment Package"
3. Click "Run workflow"
4. Enter version (e.g., `v1.0.0-beta`)
5. Click "Run workflow"

### Downloading Artifacts

1. Go to the workflow run in GitHub Actions
2. Scroll to "Artifacts" section at the bottom
3. Download `ansa-mes-{version}.tar.gz`
4. Transfer to client server

---

## Workflow 2: GitHub Releases (release.yml)

### Purpose
Creates official releases with downloadable deployment packages.

### Triggers
Git tag matching `v*.*.*` (semantic versioning)

### What It Does
1. ✅ Lints, type checks, and tests
2. 🏗️ Builds both API and Web
3. 📦 Creates deployment tarball
4. 📝 Generates release notes from CHANGELOG.md
5. 🎉 Creates GitHub Release with tarball attached
6. ⬆️ Uploads artifact backup (365 days retention)

### Usage

**Create a release:**

```bash
# 1. Update CHANGELOG.md with version details
nano deployment/CHANGELOG.md

# 2. Commit changelog
git add deployment/CHANGELOG.md
git commit -m "chore: update changelog for v1.0.0"

# 3. Create and push tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 4. GitHub Actions automatically creates the release
```

**Release notes:**
The workflow automatically extracts release notes from `deployment/CHANGELOG.md` for the tagged version.

**Example CHANGELOG.md entry:**
```markdown
## [v1.0.0] - 2026-01-22

### Added
- Production entry with automated batch numbers
- Activity tracking for worker time management

### Changed
- Improved work order filtering performance

### Fixed
- Fixed rejected quantity warehouse routing
```

### Downloading from Releases

**For clients:**
1. Go to your repository's Releases page
2. Find the desired version (e.g., `Ansa MES v1.0.0`)
3. Download `ansa-mes-v1.0.0.tar.gz` from Assets
4. Follow installation instructions in README.md

**Direct link format:**
```
https://github.com/your-org/your-repo/releases/download/v1.0.0/ansa-mes-v1.0.0.tar.gz
```

---

## Workflow 3: Self-Hosted Deployment (deploy-self-hosted.yml)

### Purpose
**Fully automated deployment** to client on-premises servers using a self-hosted GitHub Actions runner.

### ⚠️ Prerequisites

This workflow requires:
1. **Self-hosted runner** on the client's network
2. **SSH access** from runner to target server
3. **Repository secrets** configured

### Setup

#### Step 1: Install Self-Hosted Runner

On the client's network (can be any Linux machine with network access to the target server):

```bash
# Follow GitHub's instructions to install the runner
# Settings > Actions > Runners > New self-hosted runner

# Add the 'on-prem' label during setup
./config.sh --labels on-prem
```

**Documentation:** https://docs.github.com/en/actions/hosting-your-own-runners

#### Step 2: Configure Repository Secrets

Go to repository Settings > Secrets and variables > Actions:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DEPLOY_SERVER` | Target server IP/hostname | `10.0.1.100` or `mes-server.local` |
| `DEPLOY_USER` | SSH user for deployment | `admin` or `deploy-user` |
| `DEPLOY_SSH_KEY` | SSH private key (entire content) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DEPLOY_PATH` | Installation path (optional) | `/opt/ansa-mes` (default if not set) |

**Generating SSH key:**
```bash
# On the self-hosted runner machine
ssh-keygen -t ed25519 -C "github-actions-deploy"

# Copy public key to target server
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy-user@target-server

# Copy private key content to GitHub secret DEPLOY_SSH_KEY
cat ~/.ssh/id_ed25519
```

#### Step 3: Grant Deployment User Permissions

On the target server:
```bash
# Allow deployment user to run systemctl without password
sudo visudo

# Add this line (replace 'deploy-user' with your user):
deploy-user ALL=(ALL) NOPASSWD: /bin/systemctl start ansa-mes, /bin/systemctl stop ansa-mes, /bin/systemctl status ansa-mes, /usr/bin/cp, /usr/bin/chown, /usr/bin/chmod
```

### Usage

**Option 1: Push to `deploy` branch (automatic)**
```bash
# Create deploy branch from main
git checkout main
git pull
git checkout -b deploy
git push origin deploy

# Future deploys: merge main into deploy
git checkout deploy
git merge main
git push origin deploy
```

**Option 2: Manual trigger**
1. Go to Actions tab
2. Select "Deploy to Self-Hosted Server"
3. Click "Run workflow"
4. Enter target server (overrides secret)
5. Click "Run workflow"

### Deployment Process

The workflow automatically:
1. 🏗️ Builds the application
2. 🛑 Stops the current service
3. 💾 Backs up current installation
4. 📦 Transfers new package via SSH
5. 🔧 Runs installer script
6. 🔄 Restores `.env` configuration
7. ▶️ Starts the service
8. ✅ Performs health check

### Rollback

If deployment fails, the workflow automatically cleans up. To manually rollback:

```bash
# SSH to the server
ssh deploy-user@target-server

# Find backup
ls -la /opt/ansa-mes.backup.*

# Restore backup
sudo systemctl stop ansa-mes
sudo rm -rf /opt/ansa-mes
sudo mv /opt/ansa-mes.backup.YYYYMMDD-HHMMSS /opt/ansa-mes
sudo systemctl start ansa-mes
```

---

## Deployment Strategies Comparison

### Strategy 1: Manual Deployment (No GitHub Actions)

**Process:**
1. Developer runs `./scripts/build-deployment.sh` locally
2. Transfer tarball to client manually
3. Client installs manually

**Pros:**
- Simple, no CI/CD setup needed
- Full control over deployment timing
- Works with air-gapped environments

**Cons:**
- Manual process, prone to errors
- No automated testing before deployment
- Slower deployment cycle

**Best for:**
- Initial deployments
- Air-gapped/high-security environments
- Infrequent updates

---

### Strategy 2: GitHub Actions Build + Manual Deploy (Recommended)

**Process:**
1. Developer pushes to `main` → automatic build
2. Download artifact from GitHub Actions
3. Transfer to client and install manually

**Pros:**
- ✅ Automated testing (lint, typecheck, tests)
- ✅ Consistent builds (same environment every time)
- ✅ Artifact versioning and retention
- ✅ Works with any network setup
- ✅ Build happens on push, saves developer time

**Cons:**
- Still requires manual transfer and installation

**Best for:**
- Most production deployments
- Environments with restricted network access
- Staged rollouts

---

### Strategy 3: GitHub Releases (Recommended for Multiple Clients)

**Process:**
1. Developer creates git tag → automatic release
2. Clients download from GitHub Releases page
3. Install manually or with automated scripts

**Pros:**
- ✅ All benefits of Strategy 2
- ✅ Professional release management
- ✅ Version tracking built-in
- ✅ Easy for clients to download
- ✅ Release notes automatically generated
- ✅ Permanent artifact storage

**Cons:**
- Requires repository access for clients (can use private repos)
- Still requires manual installation

**Best for:**
- Multiple client deployments
- Version-controlled releases
- Professional distribution

---

### Strategy 4: Full Automation with Self-Hosted Runner (Advanced)

**Process:**
1. Developer pushes to `deploy` branch
2. Self-hosted runner automatically builds and deploys
3. Zero manual intervention

**Pros:**
- ✅ Fully automated end-to-end
- ✅ Fastest deployment time
- ✅ No manual steps
- ✅ Automatic health checks
- ✅ Automatic rollback on failure

**Cons:**
- Requires self-hosted runner setup
- Requires network access from runner to server
- More complex initial setup
- Need to secure SSH keys

**Best for:**
- Development/staging environments
- Clients with DevOps capabilities
- Frequent deployments
- Teams wanting continuous deployment

---

## Recommended Approach by Environment

| Environment | Strategy | Trigger | Approval |
|-------------|----------|---------|----------|
| **Development** | Manual or Strategy 2 | Push to `main` | None |
| **Staging** | Strategy 4 (self-hosted) | Push to `deploy` | None |
| **Production (single)** | Strategy 2 or 3 | Git tag | Manual |
| **Production (multiple)** | Strategy 3 (releases) | Git tag | Manual |

---

## Security Considerations

### Secrets Management

**Never commit:**
- `.env` files with real credentials
- SSH private keys
- Database passwords

**Use GitHub Secrets for:**
- SSH keys (for self-hosted deployment)
- Server addresses
- Deployment credentials

### SSH Key Security

For self-hosted deployments:
1. Use separate SSH key pair (not personal keys)
2. Restrict key to specific commands (use `authorized_keys` restrictions)
3. Rotate keys periodically
4. Use deployment-specific user with minimal privileges

### Build Security

All workflows:
- Run tests before building
- Use locked dependencies (`pnpm-lock.yaml`)
- Build in isolated environment
- No secrets in build output

---

## Monitoring and Notifications

### GitHub Actions Notifications

Configure notifications in your GitHub account settings:
- Settings > Notifications > Actions
- Enable notifications for workflow failures

### Slack/Email Integration (Optional)

Add to workflow after deployment:

```yaml
- name: Notify Slack
  if: success()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "✅ Ansa MES ${{ needs.build.outputs.version }} deployed successfully"
      }
```

---

## Troubleshooting

### Build Fails

**Check:**
1. Workflow logs in GitHub Actions
2. Lint errors: `pnpm nx run-many -t lint`
3. Type errors: `pnpm nx run-many -t typecheck`
4. Test failures: `pnpm nx run-many -t test`

### Self-Hosted Deployment Fails

**Common issues:**

1. **SSH connection failed**
   - Check `DEPLOY_SERVER` secret is correct
   - Verify SSH key has correct permissions (600)
   - Test SSH manually from runner: `ssh deploy-user@server`

2. **Permission denied errors**
   - Check sudoers configuration
   - Verify deployment user has necessary permissions

3. **Health check failed**
   - Check `.env` configuration was restored
   - View logs: `sudo journalctl -u ansa-mes -n 50`
   - Verify database connectivity

### Artifact Download Issues

**If artifact is too large:**
- GitHub has 2GB limit per artifact
- Our package should be ~50-100MB (well under limit)
- If larger, check for accidentally included `node_modules`

---

## Best Practices

### Before Releasing

- [ ] Update `deployment/CHANGELOG.md`
- [ ] Test locally: `./scripts/build-deployment.sh test`
- [ ] Run full test suite: `pnpm nx run-many -t test`
- [ ] Update version in relevant files if needed
- [ ] Create git tag with semantic version

### After Releasing

- [ ] Verify GitHub Release was created
- [ ] Download and test tarball
- [ ] Notify clients of new version
- [ ] Update deployment documentation if needed

### Versioning Guidelines

Use semantic versioning:
- `vMAJOR.MINOR.PATCH`
- **MAJOR**: Breaking changes (config changes, database migrations)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

Examples:
- `v1.0.0` - Initial release
- `v1.1.0` - Add new calendar feature
- `v1.1.1` - Fix bug in calendar
- `v2.0.0` - Require new environment variable (breaking)

---

## Quick Reference

### Create a Release
```bash
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

### Manual Build Trigger
```bash
gh workflow run build-deployment.yml -f version=v1.0.0-test
```

### Download Latest Release
```bash
gh release download v1.0.0 --pattern '*.tar.gz'
```

### Check Workflow Status
```bash
gh run list --workflow=build-deployment.yml
gh run watch
```

---

## Support

For issues with:
- **Workflows not running**: Check GitHub Actions settings
- **Build failures**: Review workflow logs
- **Deployment issues**: Check server logs and SSH connectivity
- **Artifacts missing**: Verify retention period hasn't expired

**GitHub CLI**: Install `gh` for easier workflow management: https://cli.github.com/
