#!/bin/bash

# File Upload System - AWS EC2 Installation Script
# Compatible with Amazon Linux 2

set -e  # Exit on any error

echo "🚀 Starting File Upload System Installation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root. Run as ec2-user."
    exit 1
fi

# Update system
print_status "Updating system packages..."
sudo yum update -y

# Install development tools
print_status "Installing development tools..."
sudo yum groupinstall -y "Development Tools"
sudo yum install -y git curl wget

# Install Node.js
print_status "Installing Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js version: $NODE_VERSION"
print_status "NPM version: $NPM_VERSION"

# Install PM2
print_status "Installing PM2..."
sudo npm install -g pm2

# Install Nginx
print_status "Installing Nginx..."
sudo yum install -y nginx

# Install Python
print_status "Installing Python..."
sudo yum install -y python3 python3-pip

# Create application directory
print_status "Setting up application directory..."
sudo mkdir -p /var/www
sudo chown ec2-user:ec2-user /var/www

# Clone project (you'll need to replace this with your actual repository)
print_status "Setting up project structure..."
cd /var/www
mkdir -p file-upload-system
cd file-upload-system

# Copy project files (assuming they're in the current directory)
if [ -d "/home/ec2-user/file-upload-system" ]; then
    print_status "Copying project files..."
    cp -r /home/ec2-user/file-upload-system/* .
else
    print_warning "Project files not found. You'll need to upload your project files to /var/www/file-upload-system"
fi

# Install dependencies if package.json files exist
if [ -f "frontend/package.json" ]; then
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    print_status "Building frontend..."
    npm run build
    cd ..
fi

if [ -f "backend-api/package.json" ]; then
    print_status "Installing backend dependencies..."
    cd backend-api
    npm install
    cd ..
fi

if [ -f "shared/package.json" ]; then
    print_status "Installing shared dependencies..."
    cd shared
    npm install
    cd ..
fi

if [ -f "processing-service/requirements.txt" ]; then
    print_status "Installing Python dependencies..."
    cd processing-service
    pip3 install -r requirements.txt
    cd ..
fi

# Create environment files
print_status "Creating environment configuration..."

# Frontend environment
if [ -d "frontend" ]; then
    cat > frontend/.env.production << 'EOF'
VITE_API_URL=/api
VITE_WS_URL=/ws
EOF
fi

# Backend environment
if [ -d "backend-api" ]; then
    cat > backend-api/.env << 'EOF'
NODE_ENV=production
PORT=3001
CORS_ORIGIN=*
UPLOAD_MAX_SIZE=104857600
UPLOAD_MAX_FILES=10
EOF
fi

# Configure Nginx
print_status "Configuring Nginx..."
sudo tee /etc/nginx/conf.d/file-upload.conf << 'EOF'
server {
    listen 80 default_server;
    server_name _;
    
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
    
    # WebSocket proxy
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

# Remove default Nginx configuration
sudo rm -f /etc/nginx/conf.d/default.conf

# Test Nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

# Create PM2 ecosystem file
print_status "Setting up PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'file-upload-api',
      script: './backend-api/src/index.js',
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
    }
  ]
};
EOF

# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown ec2-user:ec2-user /var/log/pm2

# Start services
print_status "Starting services..."

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Start PM2 (only if backend exists)
if [ -f "backend-api/src/index.js" ] || [ -f "backend-api/dist/index.js" ]; then
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    print_status "PM2 startup command generated. Please run the command shown above to enable auto-start."
else
    print_warning "Backend API not found. Skipping PM2 setup."
fi

# Install additional useful tools
print_status "Installing additional tools..."
sudo yum install -y htop tree

# Create useful aliases
cat >> ~/.bashrc << 'EOF'

# File Upload System aliases
alias logs='pm2 logs'
alias status='pm2 status'
alias restart='pm2 restart all'
alias nginx-reload='sudo systemctl reload nginx'
alias nginx-logs='sudo tail -f /var/log/nginx/error.log'
EOF

print_status "Installation completed! 🎉"
echo ""
print_status "Next steps:"
echo "1. Upload your project files to /var/www/file-upload-system if not already done"
echo "2. Configure your domain name in /etc/nginx/conf.d/file-upload.conf"
echo "3. Set up SSL certificate with: sudo certbot --nginx -d your-domain.com"
echo "4. Configure environment variables in backend-api/.env"
echo "5. Test the application by visiting your server's IP address"
echo ""
print_status "Useful commands:"
echo "- Check status: pm2 status"
echo "- View logs: pm2 logs"
echo "- Restart services: pm2 restart all"
echo "- Nginx status: sudo systemctl status nginx"
echo ""
print_warning "Don't forget to configure your AWS Security Group to allow HTTP (80) and HTTPS (443) traffic!"