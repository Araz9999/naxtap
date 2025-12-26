#!/bin/bash

# Naxtap VPS Deployment Script
# Run this on your Hostinger VPS after uploading the code

set -e  # Exit on error

echo "🚀 Starting Naxtap deployment on Hostinger VPS..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/naxtap"
DOMAIN="naxtap.az"

echo -e "${YELLOW}📁 Setting up application directory...${NC}"
# The code should already be uploaded to $APP_DIR

cd $APP_DIR

echo -e "${YELLOW}📦 Installing Node.js dependencies...${NC}"
npm install --production=false

echo -e "${YELLOW}🔨 Building backend...${NC}"
npm run build:backend

echo -e "${YELLOW}🗃️  Setting up PostgreSQL database...${NC}"
npx prisma generate
npx prisma migrate deploy

echo -e "${YELLOW}🌐 Building frontend...${NC}"
npm run build:web

echo -e "${YELLOW}📂 Creating logs directory...${NC}"
mkdir -p logs

echo -e "${YELLOW}🔧 Setting up PM2 process manager...${NC}"
# Stop existing processes if any
pm2 delete all || true

# Start applications with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd -u $USER --hp $HOME

echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/naxtap
sudo ln -sf /etc/nginx/sites-available/naxtap /etc/nginx/sites-enabled/naxtap

# Remove default nginx config if exists
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

echo -e "${YELLOW}🔒 Setting up SSL with Let's Encrypt...${NC}"
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

echo -e "${YELLOW}🔥 Setting up firewall...${NC}"
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Your app is now live at: https://$DOMAIN${NC}"
echo ""
echo "Useful commands:"
echo "  pm2 status              - Check application status"
echo "  pm2 logs                - View application logs"
echo "  pm2 restart all         - Restart all applications"
echo "  sudo systemctl status nginx - Check Nginx status"
echo "  sudo tail -f /var/log/nginx/naxtap_error.log - View Nginx errors"
