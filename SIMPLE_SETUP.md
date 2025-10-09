# 🚀 MCP Jira Crawler - Hướng dẫn đơn giản

## 📋 Nếu bạn đã có database rồi

### Bước 1: Clone và setup
```bash
git clone <your-repo-url>
cd mcp-jira-crawl
npm install
npm run build
```

### Bước 2: Setup Database (nếu chưa có)
```bash
# Import MySQL schema
mysql -u your-username -p your-database-name < mysql-schema.sql
```

### Bước 3: Điền thông tin vào file .env
```bash
cp env.example .env
```

Sửa file `.env`:
```env
# Jira Configuration - ĐIỀN THÔNG TIN JIRA CỦA BẠN
JIRA_URL=https://your-domain.atlassian.net
JIRA_USERNAME=your-email@example.com
JIRA_API_TOKEN=your-api-token

# Database Configuration - ĐIỀN THÔNG TIN DATABASE CỦA BẠN
DB_HOST=localhost
DB_PORT=3306
DB_USER=your-db-username
DB_PASSWORD=your-db-password
DB_NAME=your-database-name
```

### Bước 4: Chạy MCP Server (Terminal 1)
```bash
docker run --rm -p 9000:9000 \
  --env-file .env \
  mcp-atlassian:latest \
  --transport streamable-http --port 9000 -vv
```

### Bước 5: Chạy Crawler (Terminal 2)
```bash
npm run crawl:manual
```

## 🎯 Kết quả

- **Không cần truyền email/token** - Tất cả lấy từ file `.env`
- **Data tự động lưu** vào database theo table tương ứng:
  - `projects` - Thông tin projects
  - `issues` - Thông tin issues (chính)
  - `users` - Thông tin users (assignee, reporter)
  - `statuses` - Thông tin status
  - `changelogs` - Lịch sử thay đổi issue
  - `components` - Thông tin components
  - `labels` - Labels của issues
  - `subtasks` - Subtasks
  - `fix_versions` - Fix versions
  - `issue_fix_versions` - Liên kết issues với fix versions
  - `snapshot_issues` - Snapshot để tracking thay đổi

## 📊 Ví dụ chạy

```bash
🚀 Manual MCP Jira Crawler
📋 This will crawl data step by step using MCP tools directly

🔌 Initializing MCP session...
✅ MCP session initialized: abc123
📤 Sending initialized notification...
✅ Initialized notification sent
⏳ Waiting for initialization to complete...
✅ Ready to call tools

🔍 Step 1: Listing available tools...
📋 Available tools: [36 tools found]

🔍 Step 2: Getting all projects...
✅ Found 2 projects:
   - KAN: Kanban Project
   - PROJ: Main Project

🔍 Step 3: Getting issues for project KAN...
✅ Found 15 issues in KAN

🔍 Step 4: Getting detailed info for each issue...
   📋 Processing issue: KAN-19
   ✅ Got details for KAN-19: Design User Trang Điểm đến
   💾 Mapping and saving to database...
   ✅ Saved to database successfully

   📋 Processing issue: KAN-18  
   ✅ Got details for KAN-18: Design User Liên hệ
   💾 Mapping and saving to database...
   ✅ Saved to database successfully

🎉 Manual crawling completed!
```

## ⚡ Commands nhanh

```bash
# Build project
npm run build

# Chạy manual crawler (demo từng bước)
npm run crawl:manual

# Chạy full crawler (tất cả cùng lúc)
npm run crawl
```

## 🔧 Troubleshooting

### Database connection error?
- Kiểm tra thông tin trong `.env`
- Đảm bảo database đang chạy
- Test connection: `mysql -u your-user -p your-database`

### MCP server error?
- Kiểm tra port 9000 có bị chiếm không
- Restart Docker container
- Kiểm tra Jira credentials trong `.env`

### Không có data?
- Kiểm tra Jira API token có quyền đọc không
- Kiểm tra JIRA_URL đúng không
- Xem log để debug

## 📝 Lưu ý

- **Chỉ cần điền `.env`** là chạy được
- **Không cần setup database** nếu đã có
- **Data tự động map** vào đúng table
- **Có thể chạy nhiều lần** - sẽ update data cũ
