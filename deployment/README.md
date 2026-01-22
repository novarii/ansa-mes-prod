# Ansa MES - On-Premises Deployment Guide

## Overview

This package contains a production-ready build of Ansa MES (Manufacturing Execution System) for deployment on your on-premises server.

**Package Contents:**
- `api/` - Backend NestJS application (compiled JavaScript)
- `web/` - Frontend React application (static files)
- `scripts/` - Deployment management scripts
- `nginx/` - Nginx reverse proxy configuration
- `config/` - Environment configuration template

## System Requirements

### Server Requirements

- **Operating System**: Ubuntu 20.04 LTS or later (or compatible Linux distribution)
- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 2GB for application + space for logs
- **Node.js**: Version 20.x or later
- **Nginx**: Latest stable version
- **Network**: Access to SAP HANA database and SAP B1 Service Layer

### Network Requirements

The server must have network access to:
- SAP HANA database (typically port 30013)
- SAP B1 Service Layer (typically HTTPS port 50000)
- Client workstations (for browser access)

## Installation

### Step 1: Transfer Package to Server

```bash
# Transfer the tarball to your server
scp ansa-mes-*.tar.gz user@your-server:/tmp/

# SSH into the server
ssh user@your-server

# Extract the package
cd /tmp
tar -xzf ansa-mes-*.tar.gz
cd ansa-mes-*
```

### Step 2: Run Installation Script

```bash
# Run the installer (requires sudo/root privileges)
sudo ./scripts/install.sh
```

The installer will:
1. Check system requirements (Node.js, npm, nginx)
2. Create application user (`ansa`)
3. Copy files to `/opt/ansa-mes/`
4. Install Node.js dependencies
5. Create systemd service
6. Configure nginx
7. Create configuration template

### Step 3: Configure Environment

Edit the configuration file with your SAP connection details:

```bash
sudo nano /opt/ansa-mes/.env
```

**Required Configuration:**

```bash
# SAP HANA Database
HANA_HOST=10.0.1.100              # Your HANA server IP
HANA_PORT=30013                    # HANA SQL port
HANA_USER=SYSTEM                   # Database user
HANA_PASSWORD=YourPassword         # Database password
HANA_DATABASE=HDB                  # Database name
HANA_SCHEMA=ANSAMES                # Schema name

# SAP B1 Service Layer
SL_BASE_URL=https://10.0.1.100:50000/b1s/v2  # Service Layer URL
SL_COMPANY=ANSA                    # Company database
SL_USERNAME=MES_SERVICE            # Service Layer user
SL_PASSWORD=YourPassword           # Service Layer password

# Application
PORT=3000                          # API port (default: 3000)
CORS_ORIGIN=http://localhost       # Keep as localhost (nginx proxies)
NODE_ENV=production                # Keep as production
```

**Security Note:** The `.env` file contains sensitive credentials. Ensure proper file permissions (600) - the installer sets this automatically.

### Step 4: Start the Application

```bash
# Start the service
sudo systemctl start ansa-mes

# Enable auto-start on boot
sudo systemctl enable ansa-mes

# Reload nginx to apply configuration
sudo systemctl reload nginx
```

### Step 5: Verify Installation

Check the service status:

```bash
sudo systemctl status ansa-mes
```

You should see output indicating the service is "active (running)".

Access the application in a browser:
```
http://your-server-ip
```

## Management Commands

### Using Systemd (Recommended)

```bash
# Start the application
sudo systemctl start ansa-mes

# Stop the application
sudo systemctl stop ansa-mes

# Restart the application
sudo systemctl restart ansa-mes

# Check status
sudo systemctl status ansa-mes

# View logs (live)
sudo journalctl -u ansa-mes -f

# View last 100 log entries
sudo journalctl -u ansa-mes -n 100
```

### Using Provided Scripts

```bash
cd /opt/ansa-mes

# Start
sudo ./scripts/start.sh

# Stop
sudo ./scripts/stop.sh

# Restart
sudo ./scripts/restart.sh

# Check status and view recent logs
sudo ./scripts/status.sh
```

## Log Files

Logs are stored in `/var/log/ansa-mes/`:

- `api.log` - Application output logs
- `api-error.log` - Application error logs

View logs:

```bash
# Application logs
sudo tail -f /var/log/ansa-mes/api.log

# Error logs
sudo tail -f /var/log/ansa-mes/api-error.log

# Nginx access logs
sudo tail -f /var/log/nginx/ansa-mes-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/ansa-mes-error.log
```

## Upgrading

To upgrade to a new version:

```bash
# 1. Stop the current version
sudo systemctl stop ansa-mes

# 2. Backup current installation (optional but recommended)
sudo cp -r /opt/ansa-mes /opt/ansa-mes.backup.$(date +%Y%m%d)

# 3. Backup configuration
sudo cp /opt/ansa-mes/.env /tmp/ansa-mes.env.backup

# 4. Extract new version
cd /tmp
tar -xzf ansa-mes-NEW-VERSION.tar.gz
cd ansa-mes-*

# 5. Run installer (will preserve .env if it exists)
sudo ./scripts/install.sh

# 6. Verify configuration is intact
sudo cat /opt/ansa-mes/.env

# 7. Start the new version
sudo systemctl start ansa-mes

# 8. Verify it's working
sudo systemctl status ansa-mes
```

## Troubleshooting

### Application Won't Start

1. **Check logs:**
   ```bash
   sudo journalctl -u ansa-mes -n 50
   ```

2. **Check configuration:**
   ```bash
   sudo cat /opt/ansa-mes/.env
   ```
   Verify all required variables are set correctly.

3. **Check Node.js version:**
   ```bash
   node -v  # Should be v20.x or later
   ```

4. **Test database connectivity:**
   ```bash
   # Try to connect to HANA from the server
   telnet <HANA_HOST> <HANA_PORT>
   ```

### Cannot Access Application in Browser

1. **Check nginx status:**
   ```bash
   sudo systemctl status nginx
   sudo nginx -t  # Test configuration
   ```

2. **Check firewall:**
   ```bash
   sudo ufw status  # Ubuntu firewall
   # Allow HTTP traffic if blocked
   sudo ufw allow 80/tcp
   ```

3. **Check if application is listening:**
   ```bash
   sudo netstat -tlnp | grep 3000  # Should show node process
   sudo netstat -tlnp | grep 80    # Should show nginx
   ```

### High Memory Usage

The application uses connection pooling (10 HANA connections). If memory is constrained, you can reduce the pool size by modifying the environment:

```bash
# Add to .env
HANA_POOL_SIZE=5
```

Then restart:
```bash
sudo systemctl restart ansa-mes
```

### SAP Connection Issues

1. **Verify network connectivity:**
   ```bash
   ping <HANA_HOST>
   telnet <HANA_HOST> <HANA_PORT>
   curl -k <SL_BASE_URL>/Login  # Test Service Layer
   ```

2. **Check SAP credentials:**
   - Ensure the Service Layer user has appropriate permissions
   - Verify the company database name is correct
   - Check if the HANA user has access to the ANSAMES schema

3. **View detailed errors:**
   ```bash
   sudo journalctl -u ansa-mes -n 100 | grep -i error
   ```

## Security Considerations

### File Permissions

The installer automatically sets secure permissions:
- Application files: owned by `ansa` user
- `.env` file: `600` (readable only by owner)
- Log directory: writable by `ansa` user

### Network Security

1. **Firewall Configuration:**
   ```bash
   # Allow only necessary ports
   sudo ufw allow 80/tcp   # HTTP
   sudo ufw allow 443/tcp  # HTTPS (if using SSL)
   sudo ufw enable
   ```

2. **HTTPS/SSL (Recommended for Production):**

   Edit `/etc/nginx/sites-available/ansa-mes` and uncomment the HTTPS server block. Obtain an SSL certificate using:
   - Let's Encrypt (certbot)
   - Commercial SSL certificate
   - Internal CA certificate

3. **Database Security:**
   - Use dedicated SAP B1 Service Layer user with minimal required permissions
   - Do not use SYSTEM account in production
   - Use strong passwords

## Backup and Recovery

### Backup

Only the configuration needs to be backed up (application is stateless):

```bash
# Backup configuration
sudo cp /opt/ansa-mes/.env /backup/ansa-mes.env.$(date +%Y%m%d)

# Optional: Backup entire installation
sudo tar -czf /backup/ansa-mes-full.$(date +%Y%m%d).tar.gz /opt/ansa-mes
```

### Recovery

To restore from backup:

```bash
# Restore configuration
sudo cp /backup/ansa-mes.env.YYYYMMDD /opt/ansa-mes/.env
sudo chown ansa:ansa /opt/ansa-mes/.env
sudo chmod 600 /opt/ansa-mes/.env
sudo systemctl restart ansa-mes
```

## Monitoring

### Health Check

The nginx configuration includes a health check endpoint:

```bash
curl http://localhost/health
# Should return: healthy
```

### Application Monitoring

Monitor the application using:

1. **Systemd status:**
   ```bash
   systemctl is-active ansa-mes
   ```

2. **Log monitoring:**
   ```bash
   # Watch for errors
   sudo tail -f /var/log/ansa-mes/api-error.log
   ```

3. **Resource usage:**
   ```bash
   # CPU and memory
   top -u ansa

   # Or with systemd
   systemd-cgtop
   ```

## Uninstallation

To completely remove Ansa MES:

```bash
# 1. Stop and disable service
sudo systemctl stop ansa-mes
sudo systemctl disable ansa-mes

# 2. Remove systemd service
sudo rm /etc/systemd/system/ansa-mes.service
sudo systemctl daemon-reload

# 3. Remove nginx configuration
sudo rm /etc/nginx/sites-enabled/ansa-mes
sudo rm /etc/nginx/sites-available/ansa-mes
sudo systemctl reload nginx

# 4. Remove application files
sudo rm -rf /opt/ansa-mes

# 5. Remove logs
sudo rm -rf /var/log/ansa-mes

# 6. Optionally remove user
sudo userdel ansa
```

## Support

For issues or questions:
- Check application logs: `/var/log/ansa-mes/`
- Check nginx logs: `/var/log/nginx/ansa-mes-*.log`
- Review this documentation
- Contact your system administrator

---

**Version Information:**
- See `VERSION` file in installation directory for build version
- Application version displayed in web interface footer
