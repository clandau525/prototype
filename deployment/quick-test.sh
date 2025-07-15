#!/bin/bash

# Quick Test Setup for File Upload System Frontend
# Run this on Amazon Linux 2 to test the frontend components

set -e

echo "🧪 Setting up quick test environment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Update system
print_status "Updating system..."
sudo yum update -y

# Install Node.js
print_status "Installing Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs git

# Verify installation
node --version
npm --version

# Create test directory
print_status "Setting up test directory..."
mkdir -p ~/file-upload-test
cd ~/file-upload-test

# Create a simple test HTML file to verify the components work
print_status "Creating test files..."

# Create package.json
cat > package.json << 'EOF'
{
  "name": "file-upload-test",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-dropzone": "^14.2.3"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.1.0",
    "vite": "^4.5.0",
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^6.1.4",
    "vitest": "^0.34.6"
  }
}
EOF

# Create vite config
cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
EOF

# Create index.html
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>File Upload Test</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

# Create src directory and files
mkdir -p src

# Create main.jsx
cat > src/main.jsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
EOF

# Create App.jsx
cat > src/App.jsx << 'EOF'
import React from 'react'
import FileUploadDemo from './FileUploadDemo'
import './App.css'

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>File Upload System Test</h1>
        <p>Testing the drag-and-drop file upload components</p>
      </header>
      <main>
        <FileUploadDemo />
      </main>
    </div>
  )
}

export default App
EOF

# Create a simplified FileUploadDemo component
cat > src/FileUploadDemo.jsx << 'EOF'
import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import './FileUploadDemo.css'

function FileUploadDemo() {
  const [files, setFiles] = useState([])
  const [rejected, setRejected] = useState([])

  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    setFiles(prev => [...prev, ...acceptedFiles])
    setRejected(fileRejections)
  }, [])

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  })

  const removeFile = (fileToRemove) => {
    setFiles(prev => prev.filter(file => file !== fileToRemove))
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getDropzoneClass = () => {
    let className = 'dropzone'
    if (isDragActive) className += ' dropzone--active'
    if (isDragAccept) className += ' dropzone--accept'
    if (isDragReject) className += ' dropzone--reject'
    return className
  }

  return (
    <div className="file-upload-demo">
      <div {...getRootProps({ className: getDropzoneClass() })}>
        <input {...getInputProps()} />
        <div className="dropzone-content">
          {isDragActive ? (
            isDragAccept ? (
              <p>✅ Drop files here to upload</p>
            ) : (
              <p>❌ Some files cannot be uploaded</p>
            )
          ) : (
            <div>
              <p>📁 Drag and drop files here, or click to select</p>
              <p>Supports: PDF, DOC, DOCX, PNG, JPG, JPEG (max 10MB)</p>
            </div>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="selected-files">
          <h3>Selected Files ({files.length})</h3>
          <ul>
            {files.map((file, index) => (
              <li key={index} className="file-item">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
                <button onClick={() => removeFile(file)} className="remove-btn">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rejected.length > 0 && (
        <div className="rejected-files">
          <h3>Rejected Files ({rejected.length})</h3>
          <ul>
            {rejected.map(({ file, errors }, index) => (
              <li key={index} className="file-item rejected">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatFileSize(file.size)}</span>
                <div className="errors">
                  {errors.map(error => (
                    <span key={error.code} className="error">
                      {error.message}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default FileUploadDemo
EOF

# Create CSS files
cat > src/index.css << 'EOF'
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background-color: #f5f5f5;
}

* {
  box-sizing: border-box;
}
EOF

cat > src/App.css << 'EOF'
.App {
  min-height: 100vh;
}

.App-header {
  background-color: #282c34;
  padding: 2rem;
  color: white;
  text-align: center;
}

.App-header h1 {
  margin: 0 0 1rem 0;
}

.App-header p {
  margin: 0;
  opacity: 0.8;
}

main {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}
EOF

cat > src/FileUploadDemo.css << 'EOF'
.file-upload-demo {
  width: 100%;
}

.dropzone {
  border: 2px dashed #ccc;
  border-radius: 12px;
  padding: 3rem 2rem;
  text-align: center;
  background-color: #fafafa;
  transition: all 0.2s ease;
  cursor: pointer;
  margin-bottom: 2rem;
}

.dropzone:hover {
  border-color: #999;
  background-color: #f0f0f0;
}

.dropzone--active {
  border-color: #007bff;
  background-color: #e3f2fd;
  transform: scale(1.02);
}

.dropzone--accept {
  border-color: #28a745;
  background-color: #d4edda;
}

.dropzone--reject {
  border-color: #dc3545;
  background-color: #f8d7da;
}

.dropzone-content p {
  margin: 0.5rem 0;
  font-size: 1.1rem;
}

.selected-files, .rejected-files {
  margin-top: 2rem;
}

.selected-files h3, .rejected-files h3 {
  color: #333;
  margin-bottom: 1rem;
}

.selected-files ul, .rejected-files ul {
  list-style: none;
  padding: 0;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
  background: white;
}

.file-item:last-child {
  border-bottom: none;
}

.file-item.rejected {
  background-color: #f8d7da;
}

.file-name {
  font-weight: 500;
  flex: 1;
  margin-right: 1rem;
}

.file-size {
  color: #666;
  margin-right: 1rem;
}

.remove-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}

.remove-btn:hover {
  background-color: #c82333;
}

.errors {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.error {
  background-color: #f5c6cb;
  color: #721c24;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

@media (max-width: 768px) {
  .file-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .file-name, .file-size {
    margin-right: 0;
  }
}
EOF

# Install dependencies
print_status "Installing dependencies..."
npm install

print_status "✅ Quick test setup complete!"
echo ""
print_status "To test the file upload components:"
echo "1. Start the development server: npm run dev"
echo "2. The server will run on http://your-ec2-ip:3000"
echo "3. Make sure your EC2 Security Group allows inbound traffic on port 3000"
echo ""
print_warning "Security Group Setup:"
echo "- Go to AWS Console > EC2 > Security Groups"
echo "- Edit inbound rules for your instance's security group"
echo "- Add rule: Type=Custom TCP, Port=3000, Source=0.0.0.0/0"
echo ""
print_status "Then run: npm run dev"