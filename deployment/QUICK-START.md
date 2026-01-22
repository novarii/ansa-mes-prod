# Ansa MES - Quick Start Guide

## For System Administrators

### Installation (5 minutes)

```bash
# 1. Transfer and extract
scp ansa-mes-*.tar.gz admin@server:/tmp/
ssh admin@server
cd /tmp && tar -xzf ansa-mes-*.tar.gz && cd ansa-mes-*

# 2. Install (requires sudo)
sudo ./scripts/install.sh

# 3. Configure SAP connection
sudo nano /opt/ansa-mes/.env
# Update: HANA_HOST, HANA_PASSWORD, SL_BASE_URL, SL_PASSWORD

# 4. Start
sudo systemctl start ansa-mes
sudo systemctl enable ansa-mes
sudo systemctl reload nginx

# 5. Verify
sudo systemctl status ansa-mes
curl http://localhost/health
```

### Daily Operations

```bash
# Start/Stop/Restart
sudo systemctl start|stop|restart ansa-mes

# Check status
sudo systemctl status ansa-mes

# View logs
sudo journalctl -u ansa-mes -f

# Check version
cat /opt/ansa-mes/VERSION
```

---

## For End Users

### Accessing the Application

1. Open web browser
2. Navigate to: `http://your-server-ip`
3. Enter your PIN twice (e.g., "200" / "200")
4. Select your work station
5. Start working!

### Main Features

**Work Orders**
- View released production orders
- Filter by customer, machine, or order number
- See order details, quantities, and due dates

**Production Entry**
- Report accepted quantities
- Report rejected quantities with automatic scrap routing
- System generates batch numbers automatically

**Activity Tracking**
- **Başla** (Start): Start working on an order
- **Dur** (Stop): Take a break (select reason)
- **Devam** (Resume): Resume after a break
- **Bitir** (Finish): Complete work on the order

**Team View**
- See which colleagues are currently working
- View status across all machines
- Check current shift information

**Calendar**
- View work orders by date
- Filter by date range
- Optional machine filter

---

## Troubleshooting

### Can't Access Application

1. Check if service is running:
   ```bash
   sudo systemctl status ansa-mes
   ```

2. Check nginx:
   ```bash
   sudo systemctl status nginx
   ```

3. Check firewall:
   ```bash
   sudo ufw allow 80/tcp
   ```

### Login Issues

- Verify your PIN with your supervisor
- Ensure you're entering the same value twice
- Check if you have machine access permissions in SAP

### Can't See Work Orders

- Only **Released** orders appear in MES (Status='R')
- Check with production planner if orders are released
- Verify machine assignment in SAP

### Production Entry Errors

- Ensure you have started the work order first (Başla)
- Check quantity doesn't exceed remaining quantity
- Verify warehouse codes are correct in SAP

---

## Architecture Overview

```
┌─────────────────┐
│   Web Browser   │
│  (Port 80/443)  │
└────────┬────────┘
         │
    ┌────▼────┐
    │  Nginx  │  (Reverse Proxy)
    └────┬────┘
         │
    ┌────▼──────────────┐
    │   React Frontend  │
    │   (Static Files)  │
    └───────────────────┘
         │
    ┌────▼──────────────┐
    │   NestJS API      │
    │   (Port 3000)     │
    └────┬─────────┬────┘
         │         │
    ┌────▼────┐ ┌──▼─────────────┐
    │  HANA   │ │ Service Layer  │
    │ (Read)  │ │   (Write)      │
    └─────────┘ └────────────────┘
         │              │
    ┌────▼──────────────▼────┐
    │   SAP Business One     │
    └────────────────────────┘
```

---

## File Locations

| Item | Location |
|------|----------|
| Application | `/opt/ansa-mes/` |
| Configuration | `/opt/ansa-mes/.env` |
| Application Logs | `/var/log/ansa-mes/` |
| Nginx Logs | `/var/log/nginx/ansa-mes-*.log` |
| Systemd Service | `/etc/systemd/system/ansa-mes.service` |
| Nginx Config | `/etc/nginx/sites-available/ansa-mes` |

---

## Quick Reference

### Ports

- **80**: HTTP (nginx)
- **443**: HTTPS (if SSL configured)
- **3000**: API (internal only, proxied by nginx)
- **30013**: SAP HANA (outbound connection)
- **50000**: SAP B1 Service Layer (outbound connection)

### Users

- **ansa**: System user running the application (no login shell)
- **root/sudo**: Required for installation and management

### Services

- **ansa-mes**: Main application service
- **nginx**: Web server and reverse proxy

---

**For detailed information, see README.md**
