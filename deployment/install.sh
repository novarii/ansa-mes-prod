#!/bin/bash

# Installation script for Ansa MES
# This script should be run on the client's on-premises server

set -e

APP_NAME="ansa-mes"
APP_DIR="/opt/${APP_NAME}"
APP_USER="ansa"
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}"

echo "========================================="
echo "Ansa MES Installation Script"
echo "========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Error: This script must be run as root (use sudo)"
  exit 1
fi

# Check Node.js version
echo ""
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed"
  echo "Please install Node.js 20.x or later"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Error: Node.js version must be 20 or higher (found: $(node -v))"
  exit 1
fi
echo "Node.js $(node -v) found ✓"

# Check npm
if ! command -v npm &> /dev/null; then
  echo "Error: npm is not installed"
  exit 1
fi
echo "npm $(npm -v) found ✓"

# Check nginx
echo ""
echo "Checking nginx installation..."
if ! command -v nginx &> /dev/null; then
  echo "Warning: nginx is not installed"
  read -p "Do you want to install nginx? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    apt-get update
    apt-get install -y nginx
  else
    echo "nginx is required for deployment. Exiting."
    exit 1
  fi
fi
echo "nginx $(nginx -v 2>&1 | cut -d'/' -f2) found ✓"

# Create application user
echo ""
echo "Creating application user..."
if id "$APP_USER" &>/dev/null; then
  echo "User $APP_USER already exists ✓"
else
  useradd -r -s /bin/false -d $APP_DIR $APP_USER
  echo "User $APP_USER created ✓"
fi

# Create application directory
echo ""
echo "Creating application directory..."
mkdir -p $APP_DIR
mkdir -p /var/log/${APP_NAME}

# Copy application files
echo ""
echo "Copying application files..."
cp -r api $APP_DIR/
cp -r web $APP_DIR/
cp -r scripts $APP_DIR/
cp VERSION $APP_DIR/

# Copy config template if .env doesn't exist
if [ ! -f "$APP_DIR/.env" ]; then
  echo ""
  echo "Creating configuration file..."
  cp config/.env.example $APP_DIR/.env
  echo "Configuration template created at $APP_DIR/.env"
  echo "⚠️  IMPORTANT: Edit $APP_DIR/.env with your settings before starting the application"
else
  echo ""
  echo "Existing .env found, skipping configuration creation"
fi

# Install API dependencies
echo ""
echo "Installing API dependencies..."
cd $APP_DIR/api
npm install --omit=dev --production

# Set permissions
echo ""
echo "Setting permissions..."
chown -R $APP_USER:$APP_USER $APP_DIR
chown -R $APP_USER:$APP_USER /var/log/${APP_NAME}
chmod 600 $APP_DIR/.env

# Install systemd service
echo ""
echo "Installing systemd service..."
cat > /etc/systemd/system/${APP_NAME}.service <<EOF
[Unit]
Description=Ansa MES Application
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR/api
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/node main.js
Restart=always
RestartSec=10
StandardOutput=append:/var/log/${APP_NAME}/api.log
StandardError=append:/var/log/${APP_NAME}/api-error.log

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/${APP_NAME}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
echo "Systemd service installed ✓"

# Configure nginx
echo ""
echo "Configuring nginx..."
cp nginx/nginx.conf $NGINX_CONF

if [ ! -f "/etc/nginx/sites-enabled/${APP_NAME}" ]; then
  ln -s $NGINX_CONF /etc/nginx/sites-enabled/${APP_NAME}
fi

# Test nginx configuration
nginx -t

echo ""
echo "========================================="
echo "Installation completed successfully!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Edit configuration: nano $APP_DIR/.env"
echo "2. Start the application: systemctl start ${APP_NAME}"
echo "3. Enable auto-start: systemctl enable ${APP_NAME}"
echo "4. Reload nginx: systemctl reload nginx"
echo ""
echo "Useful commands:"
echo "  - Check status: systemctl status ${APP_NAME}"
echo "  - View logs: journalctl -u ${APP_NAME} -f"
echo "  - View API logs: tail -f /var/log/${APP_NAME}/api.log"
echo "  - Stop service: systemctl stop ${APP_NAME}"
echo ""
echo "Access the application at: http://your-server-ip"
echo "========================================="
