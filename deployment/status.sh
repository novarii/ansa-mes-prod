#!/bin/bash

# Check Ansa MES service status

APP_NAME="ansa-mes"

echo "========================================="
echo "Ansa MES Status"
echo "========================================="
echo ""

# Service status
echo "Service Status:"
sudo systemctl status ${APP_NAME} --no-pager || true

echo ""
echo "========================================="
echo "Recent Logs (last 20 lines):"
echo "========================================="
sudo journalctl -u ${APP_NAME} -n 20 --no-pager

echo ""
echo "========================================="
echo "Useful Commands:"
echo "========================================="
echo "View live logs: sudo journalctl -u ${APP_NAME} -f"
echo "View API logs: sudo tail -f /var/log/${APP_NAME}/api.log"
echo "Restart service: sudo systemctl restart ${APP_NAME}"
