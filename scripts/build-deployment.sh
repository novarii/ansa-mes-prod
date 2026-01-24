#!/bin/bash

# Build script for creating deployment package
# Usage: ./scripts/build-deployment.sh [version]

set -e

VERSION=${1:-$(date +%Y%m%d-%H%M%S)}
DEPLOY_DIR="ansa-mes-${VERSION}"
DIST_ROOT="dist-deployment"

echo "========================================="
echo "Building Ansa MES Deployment Package"
echo "Version: ${VERSION}"
echo "========================================="

# Clean previous builds
echo "Cleaning previous builds..."
rm -rf ${DIST_ROOT}
mkdir -p ${DIST_ROOT}/${DEPLOY_DIR}

# Build API (NestJS)
echo ""
echo "Building API..."
NODE_ENV=production pnpm nx build @org/api --configuration=production

# Build Web (React)
echo ""
echo "Building Web..."
NODE_ENV=production pnpm nx build @org/web --configuration=production

# Create deployment structure
echo ""
echo "Creating deployment package structure..."

# Copy API build
mkdir -p ${DIST_ROOT}/${DEPLOY_DIR}/api
cp -r apps/api/dist/* ${DIST_ROOT}/${DEPLOY_DIR}/api/

# Copy Web build
mkdir -p ${DIST_ROOT}/${DEPLOY_DIR}/web
cp -r apps/web/dist/* ${DIST_ROOT}/${DEPLOY_DIR}/web/

# Copy deployment scripts
mkdir -p ${DIST_ROOT}/${DEPLOY_DIR}/scripts
cp deployment/*.sh ${DIST_ROOT}/${DEPLOY_DIR}/scripts/
chmod +x ${DIST_ROOT}/${DEPLOY_DIR}/scripts/*.sh

# Copy nginx config
mkdir -p ${DIST_ROOT}/${DEPLOY_DIR}/nginx
cp deployment/nginx.conf ${DIST_ROOT}/${DEPLOY_DIR}/nginx/

# Copy Windows deployment scripts
mkdir -p ${DIST_ROOT}/${DEPLOY_DIR}/windows
cp deployment/windows/*.ps1 ${DIST_ROOT}/${DEPLOY_DIR}/windows/
cp deployment/windows/*.md ${DIST_ROOT}/${DEPLOY_DIR}/windows/

# Copy config template
mkdir -p ${DIST_ROOT}/${DEPLOY_DIR}/config
cp deployment/.env.template ${DIST_ROOT}/${DEPLOY_DIR}/config/.env.example

# Copy documentation
cp deployment/README.md ${DIST_ROOT}/${DEPLOY_DIR}/
cp deployment/QUICK-START.md ${DIST_ROOT}/${DEPLOY_DIR}/ 2>/dev/null || true
cp deployment/CHANGELOG.md ${DIST_ROOT}/${DEPLOY_DIR}/ 2>/dev/null || echo "No changelog found"

# Create version file
echo "${VERSION}" > ${DIST_ROOT}/${DEPLOY_DIR}/VERSION

# Create tarball
echo ""
echo "Creating tarball..."
cd ${DIST_ROOT}
tar -czf ${DEPLOY_DIR}.tar.gz ${DEPLOY_DIR}
cd ..

echo ""
echo "========================================="
echo "Deployment package created successfully!"
echo "Location: ${DIST_ROOT}/${DEPLOY_DIR}.tar.gz"
echo "Size: $(du -h ${DIST_ROOT}/${DEPLOY_DIR}.tar.gz | cut -f1)"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Transfer the tarball to the client server"
echo "2. Extract: tar -xzf ${DEPLOY_DIR}.tar.gz"
echo "3. Run: cd ${DEPLOY_DIR} && sudo ./scripts/install.sh"
