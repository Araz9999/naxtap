# 🚀 Naxtap VPS Deployment - Quick Commands

## Part 1: Initial Server Setup (Run Once)

### Connect to VPS
```bash
ssh root@your-vps-ip
```

### Install Required Software
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Setup firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### Setup PostgreSQL (if needed)
```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres psql -c "CREATE DATABASE mydb;"
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'test1234';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE mydb TO postgres;"
```

---

## Part 2: Deploy Application

### Create App Directory
```bash
sudo mkdir -p /var/www/naxtap
sudo chown -R $USER:$USER /var/www/naxtap
cd /var/www/naxtap
```

### Upload Code (choose one method)

**A) Using Git:**
```bash
git clone https://github.com/yourusername/naxtap.git .
```

**B) Using SCP (from local machine):**
```bash
cd c:\Users\PMY\Downloads\lapsonuncu2\lapsonuncu2
scp -r * root@your-vps-ip:/var/www/naxtap/
```

### Build and Deploy
```bash
cd /var/www/naxtap

# Install dependencies
npm install

# Build backend
npm run build:backend

# Setup database
npx prisma generate
npx prisma migrate deploy

# Build frontend
npm run build:web

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Configure Nginx
```bash
# Copy nginx config
sudo cp nginx.conf /etc/nginx/sites-available/naxtap
sudo ln -s /etc/nginx/sites-available/naxtap /etc/nginx/sites-enabled/naxtap
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Setup SSL
```bash
sudo certbot --nginx -d naxtap.az -d www.naxtap.az
```

---

## Part 3: Verify Deployment

### Check Applications
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs

# Test backend
curl http://localhost:3000/

# Test frontend
curl http://localhost:3001/
```

### Test in Browser
- Visit: https://naxtap.az
- Test: Login, registration, listings

---

## Part 4: Common Commands

### PM2 Management
```bash
pm2 status                    # Check status
pm2 logs                      # View logs
pm2 restart all               # Restart all apps
pm2 stop all                  # Stop all apps
pm2 delete all                # Delete all apps
pm2 monit                     # Monitor resources
```

### Update Application
```bash
cd /var/www/naxtap
git pull
npm install
npm run build:backend
npm run build:web
npx prisma migrate deploy
pm2 restart all
```

### Nginx Management
```bash
sudo nginx -t                          # Test config
sudo systemctl reload nginx            # Reload nginx
sudo systemctl restart nginx           # Restart nginx
sudo tail -f /var/log/nginx/naxtap_error.log  # View errors
```

### Database Management
```bash
sudo -u postgres psql mydb             # Connect to database
npx prisma studio                      # Open Prisma Studio
npx prisma migrate deploy              # Run migrations
```

---

## Part 5: Automated Deployment Script

### Make script executable
```bash
chmod +x deploy-vps.sh
```

### Run deployment
```bash
./deploy-vps.sh
```

---

## Emergency Commands

### If something goes wrong:
```bash
# Stop everything
pm2 delete all
sudo systemctl stop nginx

# Check what's using ports
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :80
sudo lsof -i :443

# Kill process by PID
sudo kill -9 <PID>

# Check system resources
df -h          # Disk space
free -h        # Memory
htop           # CPU and processes
```

---

## DNS Configuration

Add these records to your domain registrar:

### A Records
```
Type: A
Name: @
Value: your-vps-ip-address
TTL: 3600

Type: A
Name: www
Value: your-vps-ip-address
TTL: 3600
```

Or use CNAME for www:
```
Type: CNAME
Name: www
Value: naxtap.az
TTL: 3600
```

---

## Environment Variables

Your `.env` file should already have all these:
```
DATABASE_URL=postgresql://postgres:test1234@localhost:5432/mydb?schema=public
JWT_SECRET=your-jwt-secret
PAYRIFF_MERCHANT_ID=your-merchant-id
PAYRIFF_SECRET_KEY=your-secret-key
# ... other keys
```

---

## Quick Status Check

```bash
# One-liner to check everything
pm2 status && sudo systemctl status nginx && sudo systemctl status postgresql
```

---

## Done! 🎉

Your app should be live at: **https://naxtap.az**
