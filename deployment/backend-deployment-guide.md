# Backend API Deployment Guide

This guide will help you deploy the backend API to your existing EC2 instance where the frontend is already running.

## Prerequisites

- EC2 instance with frontend already deployed
- SSH access to the instance
- Node.js and npm installed (should already be available from frontend setup)

## Deployment Steps

### 1. Upload Backend Files

First, upload your backend files to the EC2 instance. You can use SCP or any file transfer method:

```bash
# From your local machine, upload the backend-api directory
scp -r -i your-key.pem backend-api/ ec2-user@your-ec2-ip:/home/ec2-user/file-upload-system/
scp -r -i your-key.pem shared/ ec2-user@your-ec2-ip:/home/ec2-user/file-upload-system/
```

### 2. SSH into Your EC2 Instance

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### 3. Run the Updated Installation Script

The installation script has been updated to include backend API setup. Run it:

```bash
cd /home/ec2-user/file-upload-system
chmod +x deployment/install.sh
./deployment/install.sh
```

This will:
- Install Redis (required for session management)
- Install backend dependencies
- Build the backend API
- Create environment configuration
- Set up PM2 for process management
- Configure Nginx to proxy API requests

### 4. Manual Setup (if needed)

If you prefer to set up manually or if the script encounters issues:

#### Install Redis
```bash
sudo yum install -y redis
sudo systemctl start redis
sudo systemctl enable redis
```

#### Set up Backend API
```bash
cd /var/www/file-upload-system/backend-api

# Install dependencies
npm install

# Build the application
npm run build

# Create environment file
cp .env.example .env

# Edit environment file with your settings
nano .env
```

#### Configure PM2
```bash
# Create PM2 ecosystem file
cat > /var/www/file-upload-system/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'file-upload-api',
      script: './dist/index.js',
      cwd: '/var/www/file-upload-system/backend-api',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/pm2/file-upload-api-error.log',
      out_file: '/var/log/pm2/file-upload-api-out.log',
      log_file: '/var/log/pm2/file-upload-api.log',
      time: true
    }
  ]
};
EOF

# Start the application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Update Nginx Configuration

The installation script should handle this, but if you need to do it manually:

```bash
sudo nano /etc/nginx/conf.d/file-upload.conf
```

Add the API proxy configuration:

```nginx
# API proxy
location /api/ {
    proxy_pass http://localhost:3001/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # File upload settings
    client_max_body_size 100M;
    proxy_request_buffering off;
}
```

Then reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Verification

### 1. Check Services Status

```bash
# Check PM2 status
pm2 status

# Check Redis status
sudo systemctl status redis

# Check Nginx status
sudo systemctl status nginx
```

### 2. Test API Endpoints

```bash
# Test health endpoint
curl http://localhost/api/health

# Test authentication endpoint (should return validation error)
curl -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'
```

### 3. Check Logs

```bash
# View PM2 logs
pm2 logs

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Environment Configuration

Key environment variables in `/var/www/file-upload-system/backend-api/.env`:

```env
NODE_ENV=production
PORT=3001

# JWT Configuration - IMPORTANT: Change the secret!
JWT_SECRET=your-secure-random-secret-here
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=*

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Upload Configuration
MAX_FILE_SIZE=104857600
TEMP_DIR=/tmp/uploads
```

## Security Considerations

1. **Change JWT Secret**: Generate a secure random secret for JWT tokens
2. **Configure CORS**: Set specific origins instead of `*` for production
3. **SSL Certificate**: Set up HTTPS using Let's Encrypt
4. **Firewall**: Ensure only necessary ports are open

## Troubleshooting

### Backend API Not Starting
```bash
# Check PM2 logs
pm2 logs file-upload-api

# Check if port 3001 is in use
sudo netstat -tlnp | grep 3001

# Restart the application
pm2 restart file-upload-api
```

### API Requests Failing
```bash
# Check Nginx configuration
sudo nginx -t

# Check if backend is running
curl http://localhost:3001/health

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### Redis Connection Issues
```bash
# Check Redis status
sudo systemctl status redis

# Test Redis connection
redis-cli ping

# Restart Redis
sudo systemctl restart redis
```

## Useful Commands

```bash
# Application management
pm2 status                    # Check application status
pm2 logs                      # View logs
pm2 restart file-upload-api   # Restart backend
pm2 stop file-upload-api      # Stop backend

# System services
sudo systemctl status nginx   # Check Nginx status
sudo systemctl reload nginx   # Reload Nginx config
sudo systemctl status redis   # Check Redis status

# Monitoring
htop                          # System resources
sudo netstat -tlnp           # Check open ports
```