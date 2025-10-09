# MCP Jira Crawler

MCP-based Jira data crawler sử dụng MCP Atlassian server để crawl dữ liệu từ Jira và lưu vào database cục bộ.

## Tính năng

- 🚀 Crawl dữ liệu Jira sử dụng MCP server tools
- 🗄️ Lưu dữ liệu vào MySQL database cục bộ
- 📊 Hỗ trợ crawl projects, issues, users, statuses, components, changelogs
- 🔄 Xử lý batch để tối ưu hiệu suất
- 📈 Báo cáo tiến độ và thống kê chi tiết
- 🛠️ CLI interface dễ sử dụng

## 🚀 Quick Setup

### 📋 Nếu bạn đã có database rồi (Đơn giản nhất)

```bash
# 1. Clone và setup
git clone <your-repo-url>
cd mcp-jira-crawl
npm install
npm run build

# 2. Điền thông tin vào .env
cp env.example .env
# Sửa .env với Jira credentials và database info

# 3. Chạy MCP server (Terminal 1)
docker run --rm -p 9000:9000 --env-file .env mcp-atlassian:latest --transport streamable-http --port 9000 -vv

# 4. Chạy crawler (Terminal 2)
npm run crawl:manual
```

### 🔧 Nếu chưa có database (Full setup)

#### Option 1: Automated Setup
```bash
git clone <your-repo-url>
cd mcp-jira-crawl

# Run setup script
./setup.sh          # Linux/Mac
# OR
.\setup.ps1          # Windows PowerShell
```

#### Option 2: Manual Setup
```bash
# 1. Clone repository
git clone <your-repo-url>
cd mcp-jira-crawl

# 2. Install dependencies
npm install

# 3. Setup environment
cp env.example .env
# Edit .env with your Jira credentials and database settings

# 4. Setup database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS issue_tracking_db;"
mysql -u root -p issue_tracking_db < local-database.sql

# 5. Build project
npm run build

# 6. Start MCP server (Terminal 1)
docker run --rm -p 9000:9000 --env-file .env mcp-atlassian:latest --transport streamable-http --port 9000 -vv

# 7. Run crawler (Terminal 2)
npm run crawl:manual
```

> 💡 **Xem [SIMPLE_SETUP.md](SIMPLE_SETUP.md) để biết chi tiết hơn**

### Yêu cầu hệ thống

- Node.js >= 18.0.0
- MySQL >= 8.0
- Docker (để chạy MCP server)

## Sử dụng

### Crawl tất cả projects

```bash
npm run crawl -- \
  --url "https://your-domain.atlassian.net" \
  --email "your-email@example.com" \
  --token "your-api-token"
```

### Crawl specific projects

```bash
npm run crawl -- \
  --url "https://your-domain.atlassian.net" \
  --email "your-email@example.com" \
  --token "your-api-token" \
  --projects "PROJ1,PROJ2,PROJ3"
```

### Crawl với tùy chọn nâng cao

```bash
npm run crawl -- \
  --url "https://your-domain.atlassian.net" \
  --email "your-email@example.com" \
  --token "your-api-token" \
  --projects "PROJ1" \
  --batch-size 25 \
  --max-issues 500 \
  --include-changelog \
  --include-worklog \
  --include-attachments \
  --output ./my-output
```

### Test kết nối

```bash
npm run test-connection -- \
  --url "https://your-domain.atlassian.net" \
  --email "your-email@example.com" \
  --token "your-api-token"
```

### Xem cấu hình hiện tại

```bash
npm run config
```

## Tùy chọn CLI

| Tùy chọn                    | Mô tả                                         | Mặc định        |
| --------------------------- | --------------------------------------------- | --------------- |
| `-u, --url <url>`           | Jira URL (bắt buộc)                           | -               |
| `-e, --email <email>`       | Jira username/email (bắt buộc)                | -               |
| `-t, --token <token>`       | Jira API token (bắt buộc)                     | -               |
| `-p, --projects <projects>` | Danh sách project keys cách nhau bởi dấu phẩy | Tất cả projects |
| `-b, --batch-size <size>`   | Số lượng issues xử lý mỗi batch               | 50              |
| `-m, --max-issues <max>`    | Số lượng issues tối đa mỗi project            | Không giới hạn  |
| `--include-archived`        | Bao gồm archived projects                     | false           |
| `--include-changelog`       | Bao gồm changelog data                        | true            |
| `--include-worklog`         | Bao gồm worklog data                          | false           |
| `--include-attachments`     | Download attachments                          | false           |
| `-o, --output <dir>`        | Thư mục output cho reports và attachments     | ./output        |

## Cấu trúc Database

Crawler tạo các bảng sau trong database:

- `bts_issues` - Thông tin issues
- `bts_users` - Thông tin users
- `bts_projects` - Thông tin projects
- `bts_statuses` - Thông tin statuses
- `bts_components` - Thông tin components
- `bts_changelogs` - Thông tin changelogs
- `bts_subtasks` - Thông tin subtasks
- `fix_versions` - Thông tin fix versions
- `bts_labels` - Labels của issues
- `bts_issue_fix_versions` - Quan hệ issue-fix version
- `bts_snapshot_issues` - Snapshots của issues

## MCP Server Integration

Crawler sử dụng các MCP tools sau:

- `mcp_mcp-atlassian-service_jira_get_all_projects`
- `mcp_mcp-atlassian-service_jira_get_project_issues`
- `mcp_mcp-atlassian-service_jira_get_issue`
- `mcp_mcp-atlassian-service_jira_search`
- `mcp_mcp-atlassian-service_jira_get_worklog`
- `mcp_mcp-atlassian-service_jira_get_transitions`
- `mcp_mcp-atlassian-service_jira_download_attachments`
- Và nhiều tools khác...

## Báo cáo

Sau khi crawl xong, crawler tạo file `crawl-report.json` trong thư mục output với thông tin:

- Cấu hình crawl
- Tiến độ hoàn thành
- Thống kê chi tiết
- Danh sách lỗi (nếu có)
- Thời gian thực hiện

## Xử lý lỗi

Crawler có cơ chế xử lý lỗi robust:

- Retry tự động cho các lỗi tạm thời
- Log chi tiết các lỗi
- Tiếp tục crawl ngay cả khi có lỗi
- Báo cáo tổng hợp các lỗi cuối cùng

## Development

### Build project

```bash
npm run build
```

### Run in development mode

```bash
npm run dev crawl -- --url "..." --email "..." --token "..."
```

### Lint code

```bash
npm run lint
npm run lint:fix
```

## Troubleshooting

### Lỗi kết nối MCP server

1. Đảm bảo Docker đang chạy
2. Kiểm tra MCP server có khởi động thành công không
3. Kiểm tra port 9000 có bị chiếm không

### Lỗi database

1. Đảm bảo MySQL đang chạy
2. Kiểm tra thông tin kết nối database
3. Đảm bảo database `issue_tracking_db` đã được tạo

### Lỗi authentication Jira

1. Kiểm tra URL Jira có đúng không
2. Kiểm tra API token có hợp lệ không
3. Kiểm tra user có quyền truy cập projects không

## License

MIT License

