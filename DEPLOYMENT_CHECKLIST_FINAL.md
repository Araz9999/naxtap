# ✅ VPS Deployment Checklist - Naxtap Marketplace

## 🎯 Pre-Deployment Requirements

### Before You Start
- [ ] **VPS Access**: SSH credentials for your Hostinger VPS
- [ ] **Domain DNS**: `naxtap.az` and `www.naxtap.az` point to your VPS IP address
- [ ] **Database Ready**: PostgreSQL installed or credentials for existing database
- [ ] **Environment File**: `.env` file with all required API keys and secrets

### Critical Environment Variables (MUST HAVE)
Your `.env` file must contain at minimum:

```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Frontend URL
FRONTEND_URL=https://naxtap.az
EXPO_PUBLIC_FRONTEND_URL=https://naxtap.az
EXPO_PUBLIC_RORK_API_BASE_URL=https://naxtap.az

# Database (REQUIRED)
DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# JWT Secret (REQUIRED - Generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here-make-it-very-long-and-random
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d
```

### Optional Environment Variables
These are recommended but the app will work without them (with limited functionality):
- Payriff Payment Gateway credentials
- Email/SMTP configuration
- Social login OAuth credentials
- AWS S3 for file storage
- Redis for caching
- SMS service (Twilio)

---

## 📋 Phase 1: Server Setup (One-Time Only)

### 1. Connect to VPS
```bash
ssh root@your-vps-ip
# or
ssh username@your-vps-ip
```

### 2. Update System
```bash
sudo apt update
sudo apt upgrade -y
```

### 3. Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 4. Install PM2 Process Manager
```bash
sudo npm install -g pm2
pm2 --version
```

### 5. Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

### 6. Install Certbot (for SSL)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 7. Install PostgreSQL (if needed)
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
CREATE DATABASE naxtap_db;
CREATE USER naxtap_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE naxtap_db TO naxtap_user;
\q
```

### 8. Configure Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 📦 Phase 2: Deploy Application

### 1. Create Application Directory
```bash
sudo mkdir -p /var/www/naxtap
sudo chown -R $USER:$USER /var/www/naxtap
cd /var/www/naxtap
```

### 2. Upload Your Code

**Option A: Using Git (Recommended)**
```bash
git clone https://github.com/yourusername/naxtap.git .
```

**Option B: Using SCP (from local machine)**
```bash
# On your local Windows machine
cd c:\Users\PMY\Downloads\lapsonuncu2\lapsonuncu2
scp -r * root@your-vps-ip:/var/www/naxtap/
```

**Option C: Using FTP/SFTP**
- Use FileZilla or WinSCP
- Connect to your VPS
- Upload all files to `/var/www/naxtap/`

### 3. Configure Environment Variables
```bash
cd /var/www/naxtap

# Copy example file
cp env.example .env

# Edit with your actual values
nano .env
# Or use: vi .env
```

**IMPORTANT**: Make sure to update:
- `DATABASE_URL` with your actual PostgreSQL credentials
- `JWT_SECRET` with a strong random string (generate with: `openssl rand -base64 64`)
- `FRONTEND_URL` and related URLs
- All API keys for services you want to use

### 4. Install Dependencies
```bash
npm install
```

### 5. Build Backend
```bash
npm run build:backend

# Verify build
ls backend/dist/server.js  # Should exist
```

### 6. Setup Database
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Optional: Seed database with initial data
npx prisma db seed
```

### 7. Build Frontend
```bash
npm run build:web

# Verify build
ls dist/index.html  # Should exist
```

### 8. Create Logs Directory
```bash
mkdir -p logs
```

---

## 🌐 Phase 3: Configure Nginx

### 1. Copy Nginx Configuration
```bash
cd /var/www/naxtap

# Copy nginx config (works with HTTP initially)
sudo cp nginx.conf /etc/nginx/sites-available/naxtap

# Create symbolic link
sudo ln -s /etc/nginx/sites-available/naxtap /etc/nginx/sites-enabled/naxtap

# Remove default config
sudo rm /etc/nginx/sites-enabled/default
```

### 2. Test Nginx Configuration
```bash
sudo nginx -t
# Should see: "syntax is ok" and "test is successful"
```

### 3. Start/Restart Nginx
```bash
sudo systemctl reload nginx
sudo systemctl status nginx
```

---

## 🔒 Phase 4: Setup SSL Certificate

### 1. Verify DNS is Configured
```bash
# Check DNS propagation
nslookup naxtap.az
nslookup www.naxtap.az
# Both should return your VPS IP address
```

### 2. Get SSL Certificate
```bash
sudo certbot --nginx -d naxtap.az -d www.naxtap.az
```

Follow the prompts:
- Enter your email address
- Agree to terms of service
- Choose option 2 to redirect HTTP to HTTPS

**Note**: Certbot will automatically modify your nginx.conf to add SSL configuration.

### 3. Test SSL Auto-Renewal
```bash
sudo certbot renew --dry-run
```

---

## 🚀 Phase 5: Start Applications with PM2

### 1. Start Applications
```bash
cd /var/www/naxtap

# Start backend and frontend
pm2 start ecosystem.config.js --env production
```

### 2. Verify Applications are Running
```bash
pm2 status

# Should show:
# - naxtap-backend (status: online)
# - naxtap-frontend (status: online)
```

### 3. View Logs
```bash
# View all logs
pm2 logs

# View specific app logs
pm2 logs naxtap-backend
pm2 logs naxtap-frontend
```

### 4. Save PM2 Configuration
```bash
# Save current process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Copy and run the command that PM2 outputs
```

---

## ✅ Phase 6: Verify Deployment

### 1. Test Backend API
```bash
# From VPS
curl http://localhost:3000/

# Should return: {"status":"ok","message":"API is running",...}
```

### 2. Test Frontend
```bash
# From VPS
curl http://localhost:3001/

# Should return HTML content
```

### 3. Test Domain
Open in your browser:
- `https://naxtap.az` - Should load your frontend
- `https://naxtap.az/api` - Should return backend API response

### 4. Check PM2 Status
```bash
pm2 status
pm2 monit  # Monitor resources
```

---

## 🔧 Troubleshooting

### Backend Won't Start
```bash
# Check logs
pm2 logs naxtap-backend

# Check if port 3000 is in use
sudo lsof -i :3000

# Verify .env file exists and has DATABASE_URL
cat .env | grep DATABASE_URL

# Test database connection
npx prisma db push --skip-generate
```

### Frontend Won't Load
```bash
# Check logs
pm2 logs naxtap-frontend

# Verify dist folder exists
ls -la dist/

# Check if port 3001 is in use
sudo lsof -i :3001
```

### Nginx Errors
```bash
# Check error logs
sudo tail -f /var/log/nginx/naxtap_error.log

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Test nginx config after renewal
sudo nginx -t
```

### Database Connection Failed
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL
sudo systemctl start postgresql

# Test connection from app directory
cd /var/www/naxtap
npx prisma db push --skip-generate
```

---

## 🔄 Updating Your Application

When you need to deploy updates:

```bash
cd /var/www/naxtap

# Pull latest code (if using Git)
git pull origin main

# Install new dependencies
npm install

# Rebuild backend
npm run build:backend

# Rebuild frontend
npm run build:web

# Run database migrations (if any)
npx prisma migrate deploy

# Restart applications
pm2 restart all

# Check status
pm2 status
pm2 logs
```

---

## 📊 Useful Commands Reference

### PM2 Commands
```bash
pm2 status              # View status
pm2 logs                # View logs
pm2 restart all         # Restart all apps
pm2 restart naxtap-backend  # Restart specific app
pm2 stop all            # Stop all apps
pm2 delete all          # Delete all apps
pm2 monit               # Monitor resources
pm2 save                # Save current processes
```

### Nginx Commands
```bash
sudo nginx -t           # Test configuration
sudo systemctl reload nginx  # Reload nginx
sudo systemctl restart nginx # Restart nginx
sudo systemctl status nginx  # Check status
sudo tail -f /var/log/nginx/naxtap_error.log  # View error logs
```

### Database Commands
```bash
sudo -u postgres psql naxtap_db  # Connect to database
\dt                              # List tables
\d table_name                    # Describe table
\q                               # Exit
```

---

## ✅ Deployment Complete!

Your Naxtap marketplace should now be live at:
- **Frontend**: https://naxtap.az
- **Backend API**: https://naxtap.az/api

### Next Steps
1. Test all features thoroughly
2. Set up automated database backups
3. Configure monitoring and alerts
4. Deploy mobile apps to Expo
5. Submit to app stores

Good luck! 🚀

