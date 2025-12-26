# 🎉 Naxtap VPS Deployment - Ready to Deploy!

## ✅ What I've Done

### 1. Removed Railway Files
- Deleted `railway.backend.json`
- Deleted `railway.frontend.json`
- Deleted `Procfile.backend`
- Deleted Railway-specific environment templates
- Deleted Railway deployment guides

### 2. Created VPS Configuration Files

**`ecosystem.config.js`** - Updated PM2 configuration
- Backend runs on port 3000 (2 instances, cluster mode)
- Frontend runs on port 3001 (1 instance)
- Auto-restart enabled
- Logs in `./logs/` directory

**`nginx.conf`** - Nginx web server configuration
- Serves domain: naxtap.az (and www.naxtap.az)
- SSL/HTTPS enabled (Let's Encrypt)
- Reverse proxy to backend (port 3000) at `/api`
- Reverse proxy to frontend (port 3001) at `/`
- Security headers configured
- Gzip compression enabled

**`server-frontend.js`** - Production frontend server
- Serves built React app from `dist/` folder
- SPA routing support (all routes → index.html)
- Security headers
- Port 3001

**`deploy-vps.sh`** - Automated deployment script
- Installs dependencies
- Builds backend and frontend
- Sets up database
- Configures PM2
- Configures Nginx
- Sets up SSL certificate
- One command deployment!

### 3. Created Documentation

**`VPS_DEPLOYMENT_GUIDE.md`** (Complete guide - 400+ lines)
- Part 1: Server setup (Node.js, PM2, Nginx, PostgreSQL, SSL)
- Part 2: Deploy application (upload, build, start)
- Part 3: Configure Nginx
- Part 4: Setup SSL certificate
- Part 5: Start with PM2
- Part 6: Verify deployment
- Part 7: Useful commands
- Troubleshooting section
- Update procedures

**`VPS_QUICK_COMMANDS.md`** (Quick reference)
- All commands organized by phase
- Copy-paste ready
- Common tasks
- Emergency procedures

**`DEPLOYMENT_CHECKLIST.md`** (Step-by-step checklist)
- Phase 1: Server setup
- Phase 2: Deploy application
- Phase 3: Configure Nginx
- Phase 4: Testing
- Phase 5: Monitoring
- Maintenance schedule
- Troubleshooting

---

## 📋 Your Code is Ready for Hostinger VPS!

### What You Have Now:
✅ Production-ready PM2 configuration
✅ Nginx configuration for naxtap.az
✅ SSL/HTTPS setup
✅ Automated deployment script
✅ Complete deployment guide
✅ Quick command reference
✅ Deployment checklist

### Your Environment:
- Domain: `naxtap.az` ✓
- Database: PostgreSQL at `localhost:5432/mydb` ✓
- `.env` file: All API keys configured ✓
- VPS: Hostinger (ready to deploy)

---

## 🚀 How to Deploy (3 Simple Steps)

### Step 1: Prepare VPS (One-Time Setup)
SSH into your Hostinger VPS and run:

```bash
# Install required software
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs nginx postgresql certbot python3-certbot-nginx
sudo npm install -g pm2

# Setup firewall
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw --force enable

# Create app directory
sudo mkdir -p /var/www/naxtap
sudo chown -R $USER:$USER /var/www/naxtap
```

### Step 2: Upload Your Code
From your local machine:

```bash
cd c:\Users\PMY\Downloads\lapsonuncu2\lapsonuncu2
scp -r * root@your-vps-ip:/var/www/naxtap/
```

Or use Git/FTP/FileZilla to upload to `/var/www/naxtap/`

### Step 3: Deploy!
SSH into VPS and run:

```bash
cd /var/www/naxtap
chmod +x deploy-vps.sh
./deploy-vps.sh
```

**That's it!** The script will:
- Install dependencies
- Build backend and frontend
- Setup database
- Start applications with PM2
- Configure Nginx
- Setup SSL certificate

Visit **https://naxtap.az** and your app is live! 🎉

---

## 📚 Documentation Files

Open these files for detailed instructions:

1. **`VPS_DEPLOYMENT_GUIDE.md`** - Complete step-by-step guide
2. **`VPS_QUICK_COMMANDS.md`** - Quick command reference
3. **`DEPLOYMENT_CHECKLIST.md`** - Deployment checklist

All commands are ready to copy-paste!

---

## 🔑 Important Notes

### Domain DNS
Make sure your domain DNS is configured:
```
Type: A
Name: @
Value: your-vps-ip-address

Type: A (or CNAME)
Name: www
Value: your-vps-ip-address (or naxtap.az)
```

### Environment Variables
Your `.env` file already has:
- `DATABASE_URL` configured ✓
- All API keys ✓
- JWT_SECRET ✓
- Payriff credentials ✓

### Ports
- Backend: `3000` (internal)
- Frontend: `3001` (internal)
- Nginx: `80` HTTP → `443` HTTPS (external)

---

## 🎯 After Deployment

### Test Your App
1. Visit `https://naxtap.az` - Homepage loads
2. Test authentication - Register/Login works
3. Test listings - Can view/create
4. Test stores - Can browse stores
5. Test payments - Payriff integration works
6. Check mobile - Responsive design

### Monitor
```bash
pm2 status        # Check apps running
pm2 logs          # View logs
pm2 monit         # Monitor resources
```

### Update Later
```bash
cd /var/www/naxtap
git pull
npm install
npm run build:backend && npm run build:web
pm2 restart all
```

---

## 🆘 Need Help?

Check these sections in `VPS_DEPLOYMENT_GUIDE.md`:
- **Troubleshooting** - Common issues and solutions
- **Useful Commands** - PM2, Nginx, PostgreSQL commands
- **Emergency Procedures** - If site goes down

---

## ✅ Summary

**Files Created:**
- `ecosystem.config.js` (updated)
- `nginx.conf` (new)
- `server-frontend.js` (new)
- `deploy-vps.sh` (new)
- `VPS_DEPLOYMENT_GUIDE.md` (new)
- `VPS_QUICK_COMMANDS.md` (new)
- `DEPLOYMENT_CHECKLIST.md` (updated)

**Railway Files Removed:**
- All Railway-specific configurations deleted

**Ready to Deploy:**
- Just upload code and run `deploy-vps.sh`!

---

Good luck with your deployment! 🚀🎉

Your Naxtap marketplace will be live at **https://naxtap.az** very soon!
