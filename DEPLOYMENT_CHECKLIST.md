# ✅ VPS Deployment Checklist for Naxtap

## Before You Start
- [ ] Have VPS access (SSH credentials)
- [ ] Domain naxtap.az DNS points to VPS IP
- [ ] `.env` file has all API keys
- [ ] PostgreSQL credentials ready

---

## Phase 1: Server Setup ⚙️

### Install Software
- [ ] Connect to VPS via SSH
- [ ] Update system: `sudo apt update && sudo apt upgrade -y`
- [ ] Install Node.js 20.x
- [ ] Install PM2: `sudo npm install -g pm2`
- [ ] Install Nginx: `sudo apt install -y nginx`
- [ ] Install Certbot: `sudo apt install -y certbot python3-certbot-nginx`
- [ ] Setup firewall (allow SSH, HTTP, HTTPS)

### Setup Database
- [ ] Install PostgreSQL (if not installed)
- [ ] Create database: `mydb`
- [ ] Create user: `postgres` with password `test1234`
- [ ] Test connection

---

## Phase 2: Deploy Application 📦

### Upload Code
- [ ] Create directory: `/var/www/naxtap`
- [ ] Upload code (Git/SCP/FTP)
- [ ] Check `.env` file is uploaded
- [ ] Navigate to app directory

### Build Application
- [ ] Run `npm install`
- [ ] Build backend: `npm run build:backend`
- [ ] Generate Prisma: `npx prisma generate`
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Build frontend: `npm run build:web`
- [ ] Verify `backend/dist/` exists
- [ ] Verify `dist/` folder exists

### Start Applications
- [ ] Create logs directory: `mkdir -p logs`
- [ ] Start PM2: `pm2 start ecosystem.config.js --env production`
- [ ] Check status: `pm2 status` (both apps should be online)
- [ ] Save PM2: `pm2 save`
- [ ] Setup auto-start: `pm2 startup`

---

## Phase 3: Configure Nginx 🌐

### Setup Nginx
- [ ] Copy config: `sudo cp nginx.conf /etc/nginx/sites-available/naxtap`
- [ ] Create symlink: `sudo ln -s /etc/nginx/sites-available/naxtap /etc/nginx/sites-enabled/naxtap`
- [ ] Remove default: `sudo rm /etc/nginx/sites-enabled/default`
- [ ] Test config: `sudo nginx -t` (should pass)
- [ ] Reload Nginx: `sudo systemctl reload nginx`

### Setup SSL
- [ ] Verify DNS is propagated: `nslookup naxtap.az`
- [ ] Run certbot: `sudo certbot --nginx -d naxtap.az -d www.naxtap.az`
- [ ] Choose redirect to HTTPS (option 2)
- [ ] Test auto-renewal: `sudo certbot renew --dry-run`

---

## Phase 4: Testing ✅

### Test Backend
- [ ] Test locally: `curl http://localhost:3000/` (should return JSON)
- [ ] Check PM2 logs: `pm2 logs naxtap-backend`
- [ ] No errors in logs

### Test Frontend
- [ ] Test locally: `curl http://localhost:3001/` (should return HTML)
- [ ] Check PM2 logs: `pm2 logs naxtap-frontend`
- [ ] No errors in logs

### Test Domain
- [ ] Open browser: `https://naxtap.az`
- [ ] Homepage loads correctly
- [ ] No SSL warnings (🔒 appears in browser)
- [ ] Test registration/login
- [ ] Test API calls (check browser console)
- [ ] Test listings display
- [ ] Test store pages
- [ ] Test search functionality
- [ ] Test image uploads
- [ ] Test payment flow (if configured)

---

## Phase 5: Monitoring 📊

### Setup Monitoring
- [ ] PM2 logs working: `pm2 logs`
- [ ] Nginx logs accessible: `sudo tail -f /var/log/nginx/naxtap_error.log`
- [ ] Database accessible: `sudo -u postgres psql mydb`

### Performance Check
- [ ] Check disk space: `df -h` (should have >20% free)
- [ ] Check memory: `free -h` (should have RAM available)
- [ ] Check CPU: `htop` (not constantly at 100%)
- [ ] Page load time < 3 seconds

---

## Post-Deployment Tasks 🎯

### Security
- [ ] Change default PostgreSQL password
- [ ] Update SSH key authentication
- [ ] Disable root SSH login
- [ ] Setup fail2ban (optional)
- [ ] Enable automatic security updates

### Backups
- [ ] Setup database backups
- [ ] Setup code backups
- [ ] Test restore procedure

### Monitoring (Optional)
- [ ] Setup uptime monitoring (UptimeRobot, Pingdom)
- [ ] Setup error tracking (Sentry)
- [ ] Setup log management
- [ ] Setup performance monitoring

---

## Maintenance Schedule 📅

### Daily
- [ ] Check PM2 status: `pm2 status`
- [ ] Check error logs: `pm2 logs --err`
- [ ] Monitor site uptime

### Weekly
- [ ] Check Nginx logs for errors
- [ ] Review PM2 logs for issues
- [ ] Check disk space usage
- [ ] Backup database

### Monthly
- [ ] Update system packages: `sudo apt update && sudo apt upgrade`
- [ ] Update Node.js dependencies: `npm update`
- [ ] Review and rotate logs
- [ ] Test SSL certificate renewal
- [ ] Review security advisories

---

## Common Issues & Solutions 🐛

### Backend Won't Start
- [ ] Check logs: `pm2 logs naxtap-backend`
- [ ] Verify `.env` exists and has DATABASE_URL
- [ ] Check port 3000 not in use: `sudo lsof -i :3000`
- [ ] Rebuild: `npm run build:backend`

### Frontend Won't Load
- [ ] Check logs: `pm2 logs naxtap-frontend`
- [ ] Verify `dist/` folder exists
- [ ] Check port 3001 not in use: `sudo lsof -i :3001`
- [ ] Rebuild: `npm run build:web`

### SSL Not Working
- [ ] Verify DNS points to VPS IP
- [ ] Check Nginx config: `sudo nginx -t`
- [ ] Rerun certbot: `sudo certbot --nginx -d naxtap.az -d www.naxtap.az`
- [ ] Check certificate: `sudo certbot certificates`

### Database Connection Failed
- [ ] Check PostgreSQL running: `sudo systemctl status postgresql`
- [ ] Verify DATABASE_URL in `.env`
- [ ] Test connection: `pg_isready`
- [ ] Check user permissions

---

## Emergency Procedures 🚨

### If Site Goes Down
```bash
# 1. Check PM2
pm2 status
pm2 restart all

# 2. Check Nginx
sudo systemctl status nginx
sudo systemctl restart nginx

# 3. Check PostgreSQL
sudo systemctl status postgresql
sudo systemctl restart postgresql

# 4. Check logs
pm2 logs
sudo tail -100 /var/log/nginx/naxtap_error.log
```

### If Need to Rollback
```bash
# Stop current deployment
pm2 delete all

# Restore from backup or previous git commit
git checkout previous-commit
npm install
npm run build:backend
npm run build:web
pm2 start ecosystem.config.js --env production
```

---

## ✅ Deployment Complete!

When all boxes are checked:
- ✅ Backend running on PM2
- ✅ Frontend running on PM2
- ✅ Nginx configured and running
- ✅ SSL certificate installed
- ✅ Domain accessible: https://naxtap.az
- ✅ All features working

**Next:** Deploy mobile apps to Expo! 🚀

---

## Quick Commands Reference

```bash
# Check everything
pm2 status && sudo systemctl status nginx && sudo systemctl status postgresql

# Restart everything
pm2 restart all && sudo systemctl reload nginx

# View all logs
pm2 logs

# Update application
cd /var/www/naxtap && git pull && npm install && npm run build:backend && npm run build:web && pm2 restart all
```

Good luck! 🎉
