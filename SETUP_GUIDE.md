# MCP Jira Crawler - Setup Guide

## 🚀 Quick Setup trên máy mới

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd mcp-jira-crawl
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Tạo file `.env` từ template:
```bash
cp env.example .env
```

Sửa file `.env` với thông tin của bạn:
```env
# Jira Configuration
JIRA_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-api-token

# Database Configuration (Local)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-mysql-password
DB_NAME=issue_tracking_db

# Crawler Configuration
CRAWL_BATCH_SIZE=50
CRAWL_MAX_ISSUES=1000
CRAWL_INCLUDE_CHANGELOG=true
CRAWL_INCLUDE_WORKLOG=false
CRAWL_INCLUDE_ATTACHMENTS=false

# Output Configuration
OUTPUT_DIR=./output
LOG_LEVEL=info

# MCP Server Configuration
MCP_SERVER_PORT=9000
MCP_SERVER_TIMEOUT=30000
```

### 4. Setup Database
```bash
# Tạo database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS issue_tracking_db;"

# Import schema
mysql -u root -p issue_tracking_db < local-database.sql
```

### 5. Build Project
```bash
npm run build
```

### 6. Start MCP Server (Terminal 1)
```bash
# Chạy MCP Atlassian server
docker run --rm -p 9000:9000 \
  --env-file .env \
  mcp-atlassian:latest \
  --transport streamable-http --port 9000 -vv
```

### 7. Run Crawler (Terminal 2)
```bash
# Cách 1: Manual crawler (demo từng bước)
npm run crawl:manual

# Cách 2: Full crawler
npm run crawl

# Cách 3: Build và chạy trực tiếp
node dist/scripts/manualCrawler.js
```

## 📋 Available Commands

```bash
# Build project
npm run build

# Manual crawler (demo)
npm run crawl:manual

# Full crawler
npm run crawl

# Setup database
npm run setup-db

# Quick start (tất cả)
npm run quick-start
```

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Kiểm tra MySQL service
sudo service mysql status

# Restart MySQL
sudo service mysql restart

# Test connection
mysql -u root -p -e "SHOW DATABASES;"
```

### MCP Server Issues
```bash
# Kiểm tra port 9000
netstat -tulpn | grep 9000

# Kill process trên port 9000
sudo fuser -k 9000/tcp
```

### Environment Issues
```bash
# Kiểm tra .env file
cat .env

# Test environment variables
node -e "require('dotenv').config(); console.log(process.env.JIRA_URL);"
```

## 📊 Output

- **Database**: Data được lưu vào MySQL database `issue_tracking_db`
- **Logs**: Console output với progress tracking
- **Files**: Attachments (nếu enabled) trong `./output/`

## 🎯 Features

✅ **MCP Tools Integration** - Sử dụng MCP Atlassian server  
✅ **Complete Data Crawling** - Issues, projects, users, changelogs  
✅ **Database Storage** - MySQL với schema tối ưu  
✅ **Error Handling** - Robust error handling và retry  
✅ **Progress Tracking** - Real-time progress updates  
✅ **Custom Fields** - Support tất cả custom fields  
✅ **Changelog History** - Full issue history tracking  

## 📝 Notes

- **MCP Server** phải chạy trước khi start crawler
- **Database** phải được setup và accessible
- **Jira API Token** phải có quyền đọc data
- **Port 9000** phải available cho MCP server
