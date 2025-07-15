# AWS EC2 Deployment Guide - File Upload System

## Prerequisites
- AWS Account with EC2 access
- Key pair for SSH access
- Basic knowledge of SSH and Linux commands

## Step 1: Launch EC2 Instance

### Instance Configuration
1. **AMI**: Amazon Linux 2023 (recommended) or Amazon Linux 2
2. **Instance Type**: t3.small or larger (t3.micro for testing)
3. **Storage**: 20GB+ EBS volume
4. **Security Group**: Configure the following ports:
   - SSH (22) - Your IP only
   - HTTP (80) - 0.0.0.0/0
   - HTTPS (443) - 0.0.0.0/0
   - Custom (3000) - 0.0.0.0/0 (for development)
   - Custom (3001) - 0.0.0.0/0 (for API)

## Step 2: Connect to Your Instance

```bash
# Replace with your key file and instance IP
ssh -i your-key.pem ec2-user@your-instance-ip
```

## Step 3: System Updates and Dependencies

```bash
# Update system
sudo yum update -y

# Install development tools
sudo yum groupinstall -y "Development Tools"

# Install Git
sudo yum install -y git

# Install Node.js (using NodeSource repository)
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify installations
node --version
npm --version
git --version
```

## Step 4: Install Additional Dependencies

```bash
# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo yum install -y nginx

# Install Python (for processing service)
sudo yum install -y python3 python3-pip

# Install Docker (optional, for containerized services)
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user
```

## Step 5: Clone and Setup Project

```bash
# Create application directory
sudo mkdir -p /var/www
sudo chown ec2-user:ec2-user /var/www
cd /var/www

# Clone your project (replace with your repository)
git clone <your-repository-url> file-upload-system
cd file-upload-system

# Install frontend dependencies
cd frontend
npm install
npm run build
cd ..

# Install backend dependencies
cd backend-api
npm install
cd ..

# Install shared dependencies
cd shared
npm install
cd ..

# Install processing service dependencies
cd processing-service
pip3 install -r requirements.txt
cd ..
```

## Step 6: Environment Configuration

Create environment files for each service:

### Frontend Environment (.env.production)
```bash
cd /var/www/file-upload-system/frontend
cat > .env.production << 'EOF'
VITE_API_URL=http://your-domain.com/api
VITE_WS_URL=ws://your-domain.com/ws
EOF
```

### Backend Environment (.env)
```bash
cd /var/www/file-upload-system/backend-api
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
CORS_ORIGIN=http://your-domain.com
DB_CONNECTION_STRING=your-database-connection
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket
JWT_SECRET=your-jwt-secret
UPLOAD_MAX_SIZE=104857600
UPLOAD_MAX_FILES=10
EOF
```

## Step 7: Configure Nginx

```bash
# Create Nginx configuration
sudo tee /etc/nginx/conf.d/file-upload.conf << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP
    
    # Frontend static files
    location / {
        root /var/www/file-upload-system/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Enable gzip compression
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    }
    
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
    
    # WebSocket proxy (for real-time updates)
    location /ws/ {
        proxy_pass http://localhost:3001/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Test Nginx configuration
sudo nginx -t

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Step 8: Setup PM2 Process Management

```bash
# Create PM2 ecosystem file
cd /var/www/file-upload-system
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'file-upload-api',
      script: './backend-api/dist/index.js',
      cwd: '/var/www/file-upload-system/backend-api',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: '/var/log/pm2/file-upload-api-error.log',
      out_file: '/var/log/pm2/file-upload-api-out.log',
      log_file: '/var/log/pm2/file-upload-api.log'
    },
    {
      name: 'file-processing-service',
      script: 'python3',
      args: 'main.py',
      cwd: '/var/www/file-upload-system/processing-service',
      instances: 1,
      error_file: '/var/log/pm2/processing-service-error.log',
      out_file: '/var/log/pm2/processing-service-out.log',
      log_file: '/var/log/pm2/processing-service.log'
    }
  ]
};
EOF

# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown ec2-user:ec2-user /var/log/pm2

# Start applications with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

## Step 9: SSL Certificate (Optional but Recommended)

```bash
# Install Certbot for Let's Encrypt
sudo yum install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## Step 10: Firewall Configuration

```bash
# Configure firewall (if using firewalld)
sudo systemctl start firewalld
sudo systemctl enable firewalld

sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --reload
```

## Step 11: Monitoring and Logs

```bash
# View application logs
pm2 logs

# Monitor processes
pm2 monit

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System monitoring
htop  # Install with: sudo yum install -y htop
```

## Step 12: Database Setup (if needed)

If you're using a database, set it up:

```bash
# For PostgreSQL
sudo yum install -y postgresql postgresql-server
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# For MongoDB
# Add MongoDB repository and install
```

## Step 13: S3 Bucket Setup (for file storage)

1. Create an S3 bucket in AWS Console
2. Configure bucket permissions
3. Create IAM user with S3 access
4. Add credentials to environment variables

## Testing the Deployment

```bash
# Test frontend
curl http://your-domain.com

# Test API
curl http://your-domain.com/api/health

# Check PM2 status
pm2 status

# Check Nginx status
sudo systemctl status nginx
```

## Maintenance Commands

```bash
# Update application
cd /var/www/file-upload-system
git pull
npm run build --prefix frontend
pm2 restart all

# View logs
pm2 logs
sudo tail -f /var/log/nginx/error.log

# Backup
tar -czf backup-$(date +%Y%m%d).tar.gz /var/www/file-upload-system
```

## Security Considerations

1. **Keep system updated**: `sudo yum update -y`
2. **Use strong passwords and keys**
3. **Configure proper firewall rules**
4. **Enable SSL/HTTPS**
5. **Regular backups**
6. **Monitor logs for suspicious activity**
7. **Use IAM roles instead of hardcoded AWS credentials**

## Troubleshooting

### Common Issues:
1. **Port conflicts**: Check if ports 80, 443, 3001 are available
2. **Permission issues**: Ensure proper file ownership
3. **Memory issues**: Monitor with `htop` and consider upgrading instance
4. **SSL issues**: Check certificate validity and renewal

### Useful Commands:
```bash
# Check port usage
sudo netstat -tlnp

# Check disk space
df -h

# Check memory usage
free -h

# Restart services
sudo systemctl restart nginx
pm2 restart all
```