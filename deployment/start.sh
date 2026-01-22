#!/bin/bash

# Start Ansa MES service

set -e

APP_NAME="ansa-mes"

echo "Starting ${APP_NAME}..."
sudo systemctl start ${APP_NAME}
sudo systemctl status ${APP_NAME} --no-pager

echo ""
echo "${APP_NAME} started successfully!"
echo "View logs: sudo journalctl -u ${APP_NAME} -f"
