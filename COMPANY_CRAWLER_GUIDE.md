# 🚀 Company Jira Data Crawler - Complete Guide

## 📋 **Quy trình tổng quan:**

1. **Setup Database** → 2. **Crawl Data** → 3. **View Results**

---

## 🗂️ **Files cần có:**

### ✅ **Database Setup:**
- `company-database-schema.sql` - Schema database
- `create-company-database.bat` - Script tạo database

### ✅ **Crawler:**
- `company-crawler.js` - Main crawler script
- `src/services/mcpJiraService.js` - MCP service (đã có)

### ✅ **Utilities:**
- `view-company-data.js` - Xem dữ liệu đã crawl
- `test-db-connection.js` - Test kết nối (đã có)

---

## 🎯 **Tools cần dùng:**

| **Tool**                                | **Mục đích**           | **Dữ liệu trả về** |
| --------------------------------------- | ---------------------- | ------------------ |
| `jira_get_all_projects`                 | Lấy danh sách projects | Projects list      |
| `jira_get_project_issues`               | Lấy issues của project | Issues basic info  |
| `jira_get_issue` (với expand=changelog) | Lấy chi tiết issue     | Changelog, worklog |

---

## 🗄️ **Database Tables (8 bảng chính):**

| **Bảng**         | **Dữ liệu**               | **Từ tool nào**                              |
| ---------------- | ------------------------- | -------------------------------------------- |
| `bts_projects`   | Projects                  | `jira_get_all_projects`                      |
| `bts_issues`     | Issues chính              | `jira_get_project_issues` + `jira_get_issue` |
| `bts_users`      | Users (assignee/reporter) | `jira_get_project_issues`                    |
| `bts_statuses`   | Status info               | `jira_get_project_issues`                    |
| `bts_labels`     | Labels                    | `jira_get_project_issues`                    |
| `bts_changelogs` | Changelog history         | `jira_get_issue` (expand=changelog)          |
| `bts_worklogs`   | Time tracking             | `jira_get_issue` (expand=worklog)            |
| `bts_subtasks`   | Subtasks                  | `jira_get_issue`                             |

---

## 📊 **Data Mapping chi tiết:**

### 🔧 **jira_get_all_projects** → `bts_projects`
```json
{
  "id": "231799",
  "key": "TESTASKDBB",
  "name": "(구)ASKDB",
  "projectTypeKey": "software"
}
```

### 🔧 **jira_get_project_issues** → `bts_issues`, `bts_users`, `bts_statuses`, `bts_labels`
```json
{
  "id": "3886124",
  "key": "NIQ-94",
  "summary": "Apply MCP to crawl data from JIRA",
  "status": {"id": "3", "name": "In Progress"},
  "assignee": {"display_name": "Vo Nhat Phuong", "email": "phuong.vo@navercorp.com"},
  "labels": ["NIQ", "NIQ-MCP"],
  "issue_type": {"id": "3", "name": "Task"},
  "priority": {"id": "10001", "name": "P1"}
}
```

### 🔧 **jira_get_issue** (expand=changelog,worklog) → `bts_changelogs`, `bts_worklogs`, `bts_subtasks`
```json
{
  "changelog": {
    "histories": [
      {
        "id": "12345",
        "author": {"displayName": "User", "emailAddress": "user@company.com"},
        "created": "2025-10-10T19:34:33.000+0900",
        "items": [{"field": "status", "fromString": "To Do", "toString": "In Progress"}]
      }
    ]
  },
  "worklogs": [...],
  "subtasks": [...]
}
```

---

## 🚀 **Các bước thực hiện:**

### 1️⃣ **Setup Database:**
```bash
.\create-company-database.bat
```

### 2️⃣ **Run Crawler:**
```bash
node company-crawler.js
```

### 3️⃣ **View Results:**
```bash
node view-company-data.js
```

---

## 📈 **Expected Results:**

- **Projects**: 2-3 projects (TESTASKDBB, NFREPORT, NIQ)
- **Issues**: ~86 issues từ project NIQ
- **Users**: ~10-20 users (assignees, reporters)
- **Statuses**: ~5-10 statuses (In Progress, Done, etc.)
- **Changelogs**: ~50-100 changelog entries
- **Labels**: ~10-20 unique labels

---

## ⚡ **Performance Tips:**

- Crawl từng project một
- Throttle requests (100ms delay)
- Batch process cho changelogs nếu cần
- Use pagination cho issues (50 per page)

---

## 🎯 **Final Output:**

Database với đầy đủ dữ liệu Jira từ công ty, ready để:
- Tạo reports
- Analyze data
- Build dashboards
- Export to other systems
