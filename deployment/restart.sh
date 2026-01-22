#!/bin/bash

# Restart Ansa MES service

set -e

APP_NAME="ansa-mes"

echo "Restarting ${APP_NAME}..."
sudo systemctl restart ${APP_NAME}
sudo systemctl status ${APP_NAME} --no-pager

echo ""
echo "${APP_NAME} restarted successfully!"
echo "View logs: sudo journalctl -u ${APP_NAME} -f"
