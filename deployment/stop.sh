#!/bin/bash

# Stop Ansa MES service

set -e

APP_NAME="ansa-mes"

echo "Stopping ${APP_NAME}..."
sudo systemctl stop ${APP_NAME}

echo ""
echo "${APP_NAME} stopped successfully!"
