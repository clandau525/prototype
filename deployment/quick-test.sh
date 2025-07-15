#!/bin/bash

# Quick test script to verify the file upload system is working
# Run this after deployment to check if everything is set up correctly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[TEST]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "🧪 Running File Upload System Tests..."
echo ""

# Test 1: Check if services are running
print_status "1. Checking service status..."

# Check PM2
if pm2 list | grep -q "file-upload-api"; then
    if pm2 list | grep "file-upload-api" | grep -q "online"; then
        echo "  ✅ Backend API (PM2) is running"
    else
        print_error "  ❌ Backend API is not online"
        pm2 status
    fi
else
    print_warning "  ⚠️  Backend API not found in PM2"
fi

# Check Redis
if systemctl is-active --quiet redis; then
    echo "  ✅ Redis is running"
else
    print_error "  ❌ Redis is not running"
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    echo "  ✅ Nginx is running"
else
    print_error "  ❌ Nginx is not running"
fi

echo ""

# Test 2: Check port availability
print_status "2. Checking port availability..."

if netstat -tlnp | grep -q ":80 "; then
    echo "  ✅ Port 80 (HTTP) is open"
else
    print_warning "  ⚠️  Port 80 is not listening"
fi

if netstat -tlnp | grep -q ":3001 "; then
    echo "  ✅ Port 3001 (Backend API) is open"
else
    print_error "  ❌ Port 3001 is not listening"
fi

if netstat -tlnp | grep -q ":6379 "; then
    echo "  ✅ Port 6379 (Redis) is open"
else
    print_error "  ❌ Port 6379 (Redis) is not listening"
fi

echo ""

# Test 3: Test API endpoints
print_status "3. Testing API endpoints..."

# Test health endpoint
if curl -s -f http://localhost/health > /dev/null; then
    echo "  ✅ Main health endpoint is responding"
else
    print_error "  ❌ Main health endpoint is not responding"
fi

# Test backend health endpoint
if curl -s -f http://localhost:3001/health > /dev/null; then
    echo "  ✅ Backend health endpoint is responding"
else
    print_error "  ❌ Backend health endpoint is not responding"
fi

# Test API proxy
if curl -s -f http://localhost/api/health > /dev/null; then
    echo "  ✅ API proxy is working"
else
    print_error "  ❌ API proxy is not working"
fi

# Test auth endpoint (should return validation error, which is expected)
AUTH_RESPONSE=$(curl -s -w "%{http_code}" -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid","password":"test"}' -o /dev/null)

if [ "$AUTH_RESPONSE" = "400" ]; then
    echo "  ✅ Auth endpoint is responding with validation"
elif [ "$AUTH_RESPONSE" = "404" ]; then
    print_error "  ❌ Auth endpoint not found (routing issue)"
else
    print_warning "  ⚠️  Auth endpoint returned unexpected status: $AUTH_RESPONSE"
fi

echo ""

# Test 4: Test frontend
print_status "4. Testing frontend..."

if [ -d "/var/www/file-upload-system/frontend/dist" ]; then
    echo "  ✅ Frontend build directory exists"
    
    if [ -f "/var/www/file-upload-system/frontend/dist/index.html" ]; then
        echo "  ✅ Frontend index.html exists"
    else
        print_error "  ❌ Frontend index.html not found"
    fi
else
    print_error "  ❌ Frontend build directory not found"
fi

# Test frontend serving
FRONTEND_RESPONSE=$(curl -s -w "%{http_code}" http://localhost/ -o /dev/null)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo "  ✅ Frontend is being served correctly"
else
    print_error "  ❌ Frontend is not being served (status: $FRONTEND_RESPONSE)"
fi

echo ""

# Test 5: Check logs for errors
print_status "5. Checking for recent errors..."

# Check PM2 logs for errors
if pm2 logs --lines 10 2>/dev/null | grep -i error; then
    print_warning "  ⚠️  Found errors in PM2 logs (check with: pm2 logs)"
else
    echo "  ✅ No recent errors in PM2 logs"
fi

# Check Nginx error logs
if sudo tail -n 10 /var/log/nginx/error.log 2>/dev/null | grep -v "No such file" | grep -q .; then
    print_warning "  ⚠️  Found entries in Nginx error log"
    sudo tail -n 5 /var/log/nginx/error.log 2>/dev/null || echo "    (Could not read Nginx error log)"
else
    echo "  ✅ No recent errors in Nginx logs"
fi

echo ""

# Summary
print_status "📊 Test Summary"
echo ""

# Get server IP
SERVER_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "unknown")

if [ "$SERVER_IP" != "unknown" ]; then
    echo "🌐 Your application should be available at:"
    echo "   Frontend: http://$SERVER_IP"
    echo "   API: http://$SERVER_IP/api/health"
    echo ""
fi

echo "🔧 Useful commands:"
echo "   pm2 status          - Check application status"
echo "   pm2 logs            - View application logs"
echo "   pm2 restart all     - Restart all applications"
echo "   sudo systemctl status nginx - Check Nginx status"
echo "   sudo systemctl status redis - Check Redis status"
echo ""

print_status "✨ Test completed!"

# Test authentication with valid credentials
echo ""
print_status "6. Testing authentication with valid credentials..."

AUTH_TEST=$(curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}')

if echo "$AUTH_TEST" | grep -q "token"; then
    echo "  ✅ Authentication is working correctly"
    echo "  📝 Test users available:"
    echo "     - user@example.com / password123"
    echo "     - admin@example.com / admin123"
else
    print_warning "  ⚠️  Authentication test failed or returned unexpected response"
    echo "  Response: $AUTH_TEST"
fi