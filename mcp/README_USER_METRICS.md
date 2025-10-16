# 📊 Wiki User Metrics Analytics - Detailed Documentation

## 🎯 Overview

Hệ thống này crawl và phân tích 4 metrics chính cho mỗi user trong Confluence Wiki:

1. **Created Pages** - Số trang user đã tạo
2. **View Pages** - Tổng số lần view của user
3. **Edit Pages** - Số lần edit của user (từ page versions)
4. **Comments** - Số comment của user

---

## 🗂️ File Structure

```
src/
├── services/
│   ├── mcpWikiService.ts          # MCP service interface
│   └── wikiDatabaseService.ts     # Database operations
├── mappers/
│   └── wikiDataMapper.ts          # Data mapping logic
└── scripts/
    └── mcpJiraCrawler.ts          # Main crawler (Jira only)

wiki-crawler.js                    # Main Wiki crawler script
```

---

## 🎯 1. CREATED PAGES METRIC

### **Mục đích**
Đếm số trang mà mỗi user đã tạo trong Confluence.

### **Quy trình chi tiết**

#### **Step 1: Crawl Page Data**
**File:** `wiki-crawler.js` (dòng 160-200)
```javascript
async function processWikiPage(wikiPage) {
    // Lấy page details với MCP tool
    const detailedPage = await mcpService.getPage(wikiPage.id, true, false);
}
```

**Function:** `mcpService.getPage()`
**File:** `src/services/mcpWikiService.ts` (dòng 479-500)
```typescript
async getPage(
    pageId: string,
    includeMetadata: boolean = true,
    convertToMarkdown: boolean = true
): Promise<WikiPage> {
    console.log(`📄 Getting page: ${pageId}, metadata: ${includeMetadata}, markdown: ${convertToMarkdown}`);

    const response = await this.makeRequest('confluence_get_page', {
        page_id: pageId,
        include_metadata: includeMetadata,
        convert_to_markdown: convertToMarkdown
    });

    if (!response.success) {
        throw new Error(response.error || 'Failed to get page');
    }

    return response.data;
}
```

**MCP Tool:** `confluence_get_page`
**Response Format:**
```json
{
    "id": "123456789",
    "title": "Page Title",
    "author": {
        "username": "john.doe",
        "displayName": "John Doe",
        "userKey": "8aeba71497f9113f019805a7edfa0002",
        "accountId": "557058:12345678-1234-1234-1234-123456789012"
    },
    "version": {
        "number": 5,
        "by": { ... },
        "when": "2024-01-15T10:30:00.000Z"
    },
    "created": "2024-01-01T09:00:00.000Z",
    "space": {
        "key": "PROJ",
        "name": "Project Space"
    }
}
```

#### **Step 2: Map Page Data**
**Function:** `WikiDataMapper.mapPage()`
**File:** `src/mappers/wikiDataMapper.ts` (dòng 114-153)
```typescript
static mapPage(wikiPage: WikiPage, createdById?: number, lastModifiedById?: number): WikiPageData {
    // MCP tools should return full URL in the response
    const fullUrl = wikiPage._links?.webui || wikiPage.url || '';

    // Extract parent info from ancestors
    let parentPageIds: string | null = null;
    let nearestParentId: string | null = null;

    if ((wikiPage as any).ancestors && Array.isArray((wikiPage as any).ancestors)) {
        const ancestors = (wikiPage as any).ancestors;
        if (ancestors.length > 0) {
            // Get all parent IDs
            parentPageIds = ancestors.map((ancestor: any) => ancestor.id).join(',');
            // Get nearest parent (first in the array)
            nearestParentId = ancestors[0].id;
        }
    }

    return {
        page_id: wikiPage.id,
        title: wikiPage.title,
        url: fullUrl,
        views: (wikiPage as any).views || 0,
        last_modified_by: wikiPage.version?.by?.displayName || '',
        last_modified_by_key: wikiPage.version?.by?.userKey || wikiPage.version?.by?.accountId || null,
        created_by_display_name: wikiPage.author?.displayName || '',
        created_by_key: wikiPage.author?.username || wikiPage.author?.userKey || wikiPage.author?.accountId || null, // ✅ Username cho created_by_key
        number_of_versions: wikiPage.version?.number || 1,
        parent_page_ids: parentPageIds,
        created_by_id: createdById || null,
        created_at: wikiPage.created ? new Date(wikiPage.created) : (wikiPage.version?.when ? new Date(wikiPage.version.when) : null),
        nearest_parent_id: nearestParentId,
        space_key: wikiPage.space?.key,
        content_type: wikiPage.type || 'page',
        status: wikiPage.status || 'current',
        version_number: wikiPage.version?.number || 1,
        last_modified_at: wikiPage.version?.when ? new Date(wikiPage.version.when) : null,
        last_modified_by_id: lastModifiedById || null
    };
}
```

#### **Step 3: Save to Database**
**Function:** `databaseService.savePages()`
**File:** `src/services/wikiDatabaseService.ts` (dòng 123-150)
```typescript
async savePages(pages: WikiPageData[]): Promise<void> {
    if (pages.length === 0) return;

    const connection = await this.pool.getConnection();
    try {
        await connection.beginTransaction();

        for (const page of pages) {
            await this.insertOrUpdate(connection, 'wiki_pages', page, [
                'title', 'url', 'views', 'last_modified_by', 'last_modified_by_key',
                'created_by_display_name', 'created_by_key', 'number_of_versions',
                'parent_page_ids', 'created_by_id', 'created_at', 'nearest_parent_id',
                'space_key', 'content_type', 'status', 'version_number', 'last_modified_at'
            ]);
        }

        await connection.commit();
        console.log(`Saved ${pages.length} pages to database`);
    } catch (error) {
        await connection.rollback();
        console.error('Error saving pages:', error);
        throw error;
    } finally {
        connection.release();
    }
}
```

#### **Database Schema**
**Table:** `wiki_pages`
```sql
CREATE TABLE wiki_pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id VARCHAR(255) UNIQUE NOT NULL,
    title TEXT,
    url TEXT,
    views INT DEFAULT 0,
    last_modified_by VARCHAR(255),
    last_modified_by_key VARCHAR(255),
    created_by_display_name VARCHAR(255),
    created_by_key VARCHAR(255),        -- ✅ Username của người tạo
    number_of_versions INT,
    parent_page_ids TEXT,
    created_by_id INT,
    created_at DATETIME,
    nearest_parent_id VARCHAR(255),
    space_key VARCHAR(255),
    content_type VARCHAR(50),
    status VARCHAR(50),
    version_number INT,
    last_modified_at DATETIME,
    last_modified_by_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### **Analytics Query**
```sql
-- Created Pages Metric
SELECT 
    created_by_key as username,
    created_by_display_name as display_name,
    COUNT(*) as created_pages
FROM wiki_pages 
GROUP BY created_by_key, created_by_display_name
ORDER BY created_pages DESC;
```

---

## 🎯 2. VIEW PAGES METRIC

### **Mục đích**
Đếm tổng số lần view của mỗi user trên tất cả các trang.

### **Quy trình chi tiết**

#### **Step 1: Crawl Page Views**
**File:** `wiki-crawler.js` (dòng 410-430)
```javascript
async function processWikiPage(wikiPage) {
    // Lấy page views
    const pageViews = await mcpService.getPageViews(wikiPage.id);
    
    // Lấy visit history details
    const visitHistory = await mcpService.getVisitHistory(wikiPage.id);
}
```

**Function:** `mcpService.getPageViews()`
**File:** `src/services/mcpWikiService.ts` (dòng 732-750)
```typescript
async getPageViews(pageId: string): Promise<any> {
    console.log(`👀 Getting page views for ${pageId}...`);

    const response = await this.makeRequest('confluence_get_page_views', {
        page_id: pageId
    });

    if (!response.success) {
        throw new Error(response.error || 'Failed to get page views');
    }

    return response.data;
}
```

**Function:** `mcpService.getVisitHistory()`
**File:** `src/services/mcpWikiService.ts` (dòng 750-765)
```typescript
async getVisitHistory(pageId: string): Promise<any> {
    console.log(`📊 Getting visit history for ${pageId}...`);

    const response = await this.makeRequest('confluence_get_visit_history', {
        page_id: pageId
    });

    if (!response.success) {
        throw new Error(response.error || 'Failed to get visit history');
    }

    return response.data;
}
```

**MCP Tools:** 
- `confluence_get_page_views`
- `confluence_get_visit_history`

**Response Format:**
```json
{
    "results": [
        {
            "lastViewDateFormatted": "2025-10-16T22:54:21.000+09:00",
            "userKey": "8aeba71497f9113f019805a7edfa0002",
            "views": 52
        },
        {
            "lastViewDateFormatted": "2025-10-16T18:07:59.000+09:00",
            "userKey": "8a298a51946eaad40194f66b43b40269",
            "views": 31
        }
    ]
}
```

#### **Step 2: Map View Data**
**File:** `wiki-crawler.js` (dòng 430-520)
```javascript
// Map views data từ visit history
const userNames = Object.keys(visitHistoryByUserName);
const viewPromises = userNames.map(async (username) => {
    const userVisits = visitHistoryByUserName[username];
    
    // Map view data
    const mappedViews = userNames.map(username => 
        WikiDataMapper.mapViewData(wikiPage.id, username, userVisits[username].length)
    );
});
```

**Function:** `WikiDataMapper.mapViewData()`
**File:** `src/mappers/wikiDataMapper.ts` (dòng 155-163)
```typescript
static mapViewData(pageId: string, userKey: string, totalViews: number, lastView?: Date): WikiViewData {
    return {
        page_id: pageId,
        user_key: userKey,
        total: totalViews,
        last_view: lastView || null
    };
}
```

#### **Step 3: Save to Database**
**Function:** `databaseService.saveViews()`
**File:** `src/services/wikiDatabaseService.ts` (dòng 150-175)
```typescript
async saveViews(views: WikiViewData[]): Promise<void> {
    if (views.length === 0) return;

    const connection = await this.pool.getConnection();
    try {
        await connection.beginTransaction();

        for (const view of views) {
            await this.insertOrUpdate(connection, 'wiki_views', view, [
                'total', 'last_view'
            ]);
        }

        await connection.commit();
        console.log(`Saved ${views.length} views to database`);
    } catch (error) {
        await connection.rollback();
        console.error('Error saving views:', error);
        throw error;
    } finally {
        connection.release();
    }
}
```

#### **Database Schema**
**Table:** `wiki_views`
```sql
CREATE TABLE wiki_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id VARCHAR(255) NOT NULL,
    user_key VARCHAR(255) NOT NULL,      -- Username của user
    total INT DEFAULT 0,                 -- Số lần view
    last_view DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES wiki_pages(page_id),
    UNIQUE KEY unique_page_user (page_id, user_key)
);
```

#### **Analytics Query**
```sql
-- View Pages Metric
SELECT 
    user_key as username,
    SUM(total) as total_views
FROM wiki_views 
GROUP BY user_key
ORDER BY total_views DESC;
```

---

## 🎯 3. EDIT PAGES METRIC

### **Mục đích**
Đếm số lần edit của mỗi user (từ page versions).

### **Quy trình chi tiết**

#### **Step 1: Crawl Page Versions**
**File:** `wiki-crawler.js` (dòng 560-570)
```javascript
async function processWikiPage(wikiPage) {
    // Lấy page versions
    const pageVersions = await mcpService.getPageVersions(wikiPage.id);
}
```

**Function:** `mcpService.getPageVersions()`
**File:** `src/services/mcpWikiService.ts` (dòng 857-875)
```typescript
async getPageVersions(pageId: string, start: number = 0, limit: number = 25): Promise<any> {
    console.log(`📚 Getting page versions for ${pageId}...`);

    const response = await this.makeRequest('confluence_get_page_versions', {
        page_id: pageId,
        start: start,
        limit: limit
    });

    if (!response.success) {
        throw new Error(response.error || 'Failed to get page versions');
    }

    return response.data;
}
```

**MCP Tool:** `confluence_get_page_versions`
**Response Format:**
```json
{
    "results": [
        {
            "by": {
                "userKey": "8aeba71497f9113f019805a7edfa0002",
                "username": "john.doe",
                "displayName": "John Doe"
            },
            "version": 5,
            "when": "2024-01-15T10:30:00.000Z",
            "message": "Updated content",
            "minorEdit": false
        },
        {
            "by": {
                "userKey": "8a298a51946eaad40194f66b43b40269",
                "username": "jane.smith",
                "displayName": "Jane Smith"
            },
            "version": 4,
            "when": "2024-01-14T15:20:00.000Z",
            "message": "Fixed typo",
            "minorEdit": true
        }
    ]
}
```

#### **Step 2: Map Contributors**
**File:** `wiki-crawler.js` (dòng 570-610)
```javascript
// Map contributors từ page versions
if (pageVersions && pageVersions.results) {
    const contributors = [];
    
    // MCP tool returns {results: [...]} format
    pageVersions.results.forEach(version => {
        if (version.by) {
            contributors.push({
                create_by_user_key: version.by.userKey || version.by.username || version.by.accountId,
                confluence_page_id: wikiPage.id,
                version: version.version,
                when_modified: new Date(version.when),
                message: version.message || '',
                minor_edit: version.minorEdit || false
            });
        }
    });
}
```

#### **Step 3: Save to Database**
**Function:** `databaseService.saveContributors()`
**File:** `src/services/wikiDatabaseService.ts` (dòng 176-200)
```typescript
async saveContributors(contributors: WikiContributorData[]): Promise<void> {
    if (contributors.length === 0) return;

    const connection = await this.pool.getConnection();
    try {
        await connection.beginTransaction();

        for (const contributor of contributors) {
            await this.insertOrUpdate(connection, 'wiki_contributors', contributor, [
                'when_modified', 'message', 'minor_edit'
            ]);
        }

        await connection.commit();
        console.log(`Saved ${contributors.length} contributors to database`);
    } catch (error) {
        await connection.rollback();
        console.error('Error saving contributors:', error);
        throw error;
    } finally {
        connection.release();
    }
}
```

#### **Database Schema**
**Table:** `wiki_contributors`
```sql
CREATE TABLE wiki_contributors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    confluence_page_id VARCHAR(255) NOT NULL,
    create_by_user_key VARCHAR(255) NOT NULL,  -- Username của user edit
    version INT NOT NULL,
    when_modified DATETIME,
    message TEXT,
    minor_edit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (confluence_page_id) REFERENCES wiki_pages(page_id),
    UNIQUE KEY unique_page_version (confluence_page_id, version)
);
```

#### **Analytics Query**
```sql
-- Edit Pages Metric
SELECT 
    create_by_user_key as username,
    COUNT(*) as edit_count
FROM wiki_contributors 
GROUP BY create_by_user_key
ORDER BY edit_count DESC;
```

---

## 🎯 4. COMMENTS METRIC

### **Mục đích**
Đếm số comment của mỗi user.

### **Quy trình chi tiết**

#### **Step 1: Crawl Comments**
**File:** `wiki-crawler.js` (dòng 620-630)
```javascript
async function processWikiPage(wikiPage) {
    // Lấy comments
    const comments = await mcpService.getPageComments(wikiPage.id);
}
```

**Function:** `mcpService.getPageComments()`
**File:** `src/services/mcpWikiService.ts` (dòng 548-565)
```typescript
async getPageComments(pageId: string): Promise<WikiComment[]> {
    console.log(`💬 Getting comments for page: ${pageId}`);

    const response = await this.makeRequest('confluence_get_comments', {
        page_id: pageId
    });

    if (!response.success) {
        throw new Error(response.error || 'Failed to get page comments');
    }

    return response.data;
}
```

**MCP Tool:** `confluence_get_comments`
**Response Format:**
```json
[
    {
        "id": "123456789",
        "body": "This is a comment",
        "created": "2024-01-15T10:30:00.000Z",
        "updated": "2024-01-15T10:30:00.000Z",
        "author": {
            "username": "john.doe",
            "display_name": "John Doe",
            "user_key": "8aeba71497f9113f019805a7edfa0002",
            "account_id": "557058:12345678-1234-1234-1234-123456789012"
        }
    }
]
```

#### **Step 2: Map Comments**
**File:** `wiki-crawler.js` (dòng 630-640)
```javascript
// Map comments
const mappedComments = comments.map(comment => 
    WikiDataMapper.mapComment(comment)
);
```

**Function:** `WikiDataMapper.mapComment()`
**File:** `src/mappers/wikiDataMapper.ts` (dòng 190-280)
```typescript
static mapComment(wikiComment: WikiComment): WikiCommentData {
    // Extract author key from comment
    let authorKey: string | null = null;
    if (wikiComment.author?.user_key) {
        authorKey = wikiComment.author.user_key;
    } else if (wikiComment.author?.account_id) {
        authorKey = wikiComment.author.account_id;
    } else if (wikiComment.version?.by?.userKey) {
        authorKey = wikiComment.version.by.userKey;
    } else if (wikiComment.version?.by?.accountId) {
        authorKey = wikiComment.version.by.accountId;
    }

    // Extract timestamps - try direct fields first, then version
    let createdAt: Date | null = null;
    let updatedAt: Date | null = null;

    // Try to parse timestamps, with fallback to current time if empty
    if (wikiComment.created && wikiComment.created.trim() !== '') {
        try {
            createdAt = new Date(wikiComment.created);
        } catch (e) {
            console.warn(`Failed to parse created timestamp: ${wikiComment.created}`);
        }
    } else if (wikiComment.version?.when) {
        try {
            createdAt = new Date(wikiComment.version.when);
        } catch (e) {
            console.warn(`Failed to parse version.when timestamp: ${wikiComment.version.when}`);
        }
    }

    if (wikiComment.updated && wikiComment.updated.trim() !== '') {
        try {
            updatedAt = new Date(wikiComment.updated);
        } catch (e) {
            console.warn(`Failed to parse updated timestamp: ${wikiComment.updated}`);
        }
    } else if (wikiComment.version?.when) {
        try {
            updatedAt = new Date(wikiComment.version.when);
        } catch (e) {
            console.warn(`Failed to parse version.when timestamp: ${wikiComment.version.when}`);
        }
    }

    // Fallback: if no timestamps available, use current time
    if (!createdAt) {
        createdAt = new Date();
        console.warn(`No valid created timestamp found for comment ${wikiComment.id}, using current time`);
    }
    if (!updatedAt) {
        updatedAt = new Date();
        console.warn(`No valid updated timestamp found for comment ${wikiComment.id}, using current time`);
    }

    // Extract username for assignee_code
    let assigneeCode: string | null = null;
    if (wikiComment.author?.username) {
        assigneeCode = wikiComment.author.username; // username goes to assignee_code
    } else if (wikiComment.author?.user_key) {
        assigneeCode = wikiComment.author.user_key;
    } else if (wikiComment.author?.account_id) {
        assigneeCode = wikiComment.author.account_id;
    } else if (authorKey) {
        assigneeCode = authorKey;
    }

    // Extract display_name from author
    const displayName = wikiComment.author?.display_name || null;

    return {
        confluence_page_id: wikiComment.id,
        comment_title: wikiComment.title || '',
        comment_body: wikiComment.body || '',
        author_user_key: authorKey,
        assignee_code: assigneeCode, // username goes here
        display_name: displayName, // Add display_name field
        created_at: createdAt,
        updated_at: updatedAt,
        version_number: wikiComment.version?.number || 1,
        status: 'current'
    };
}
```

#### **Step 3: Save to Database**
**Function:** `databaseService.saveComments()`
**File:** `src/services/wikiDatabaseService.ts` (dòng 258-280)
```typescript
async saveComments(comments: WikiCommentData[]): Promise<void> {
    if (comments.length === 0) return;

    const connection = await this.pool.getConnection();
    try {
        await connection.beginTransaction();

        for (const comment of comments) {
            await this.insertOrUpdate(connection, 'wiki_comments', comment, [
                'comment_title', 'comment_body', 'author_user_key', 'assignee_code', 'display_name', 'created_at',
                'updated_at', 'version_number', 'status'
            ]);
        }

        await connection.commit();
        console.log(`Saved ${comments.length} comments to database`);
    } catch (error) {
        await connection.rollback();
        console.error('Error saving comments:', error);
        throw error;
    } finally {
        connection.release();
    }
}
```

#### **Database Schema**
**Table:** `wiki_comments`
```sql
CREATE TABLE wiki_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    confluence_page_id VARCHAR(255) NOT NULL,
    comment_title TEXT,
    comment_body TEXT,
    author_user_key VARCHAR(255),
    assignee_code VARCHAR(255),        -- ✅ Username của user comment
    display_name VARCHAR(255),         -- Display name của user
    created_at DATETIME,
    updated_at DATETIME,
    version_number INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'current',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (confluence_page_id) REFERENCES wiki_pages(page_id)
);
```

#### **Analytics Query**
```sql
-- Comments Metric
SELECT 
    assignee_code as username,
    display_name,
    COUNT(*) as comment_count
FROM wiki_comments 
GROUP BY assignee_code, display_name
ORDER BY comment_count DESC;
```

---

## 📊 COMPLETE USER ANALYTICS DASHBOARD

### **Master Query - All Metrics Combined**
```sql
-- Complete User Analytics Dashboard
SELECT 
    COALESCE(p.created_by_key, v.user_key, c.create_by_user_key, cm.assignee_code) as username,
    COALESCE(p.created_by_display_name, cm.display_name, 'Unknown') as display_name,
    COALESCE(p.created_pages, 0) as created_pages,
    COALESCE(v.total_views, 0) as total_views,
    COALESCE(e.edit_count, 0) as edit_count,
    COALESCE(cm.comment_count, 0) as comment_count,
    (COALESCE(p.created_pages, 0) + COALESCE(v.total_views, 0) + COALESCE(e.edit_count, 0) + COALESCE(cm.comment_count, 0)) as total_activity
FROM 
    (SELECT created_by_key, created_by_display_name, COUNT(*) as created_pages 
     FROM wiki_pages 
     GROUP BY created_by_key, created_by_display_name) p
    FULL OUTER JOIN
    (SELECT user_key, SUM(total) as total_views 
     FROM wiki_views 
     GROUP BY user_key) v ON p.created_by_key = v.user_key
    FULL OUTER JOIN
    (SELECT create_by_user_key, COUNT(*) as edit_count 
     FROM wiki_contributors 
     GROUP BY create_by_user_key) e ON COALESCE(p.created_by_key, v.user_key) = e.create_by_user_key
    FULL OUTER JOIN
    (SELECT assignee_code, display_name, COUNT(*) as comment_count 
     FROM wiki_comments 
     GROUP BY assignee_code, display_name) cm ON COALESCE(p.created_by_key, v.user_key, e.create_by_user_key) = cm.assignee_code
ORDER BY total_activity DESC;
```

### **Top Users by Activity**
```sql
-- Top 10 Most Active Users
SELECT 
    username,
    display_name,
    created_pages,
    total_views,
    edit_count,
    comment_count,
    total_activity,
    ROUND((total_activity / (SELECT SUM(created_pages + total_views + edit_count + comment_count) FROM (
        SELECT 
            COALESCE(COUNT(*), 0) as created_pages,
            COALESCE((SELECT SUM(total) FROM wiki_views), 0) as total_views,
            COALESCE((SELECT COUNT(*) FROM wiki_contributors), 0) as edit_count,
            COALESCE((SELECT COUNT(*) FROM wiki_comments), 0) as comment_count
        FROM wiki_pages
    ) sub)) * 100, 2) as activity_percentage
FROM (
    -- Insert the master query here
) analytics
LIMIT 10;
```

---

## 🚀 Usage Instructions

### **1. Setup Database**
```bash
# Run SQL scripts to create tables
mysql -u username -p database_name < wiki-database.sql
mysql -u username -p database_name < add-assignee-code-to-wiki-comments.sql
```

### **2. Configure Environment**
```bash
# Copy and edit environment file
cp env.example .env

# Edit .env with your database credentials
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database
```

### **3. Build Project**
```bash
npm install
npm run build
```

### **4. Run Crawler**
```bash
# Start MCP server first (in separate terminal)
cd mcp
python -m src.mcp_atlassian.servers.confluence

# Run Wiki crawler
node wiki-crawler.js
```

### **5. View Analytics**
```sql
-- Run analytics queries in your database client
-- Or create a dashboard using the queries above
```

---

## 🔧 Troubleshooting

### **Common Issues**

1. **MCP Server Connection Error**
   ```
   TypeError: fetch failed (ECONNREFUSED)
   ```
   **Solution:** Start MCP server first before running crawler

2. **Database Connection Error**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:3306
   ```
   **Solution:** Check database credentials in `.env` file

3. **Missing Timestamps in Comments**
   ```
   No valid created timestamp found for comment
   ```
   **Solution:** This is handled automatically with fallback to current time

4. **Page Versions API Conflict**
   ```
   HistoryMixin.get_page_versions() takes 2 positional arguments but 4 were given
   ```
   **Solution:** Fixed by renaming method to `get_page_version_history`

---

## 📈 Performance Optimization

### **Database Indexes**
```sql
-- Add indexes for better query performance
CREATE INDEX idx_wiki_pages_created_by ON wiki_pages(created_by_key);
CREATE INDEX idx_wiki_views_user_key ON wiki_views(user_key);
CREATE INDEX idx_wiki_contributors_user ON wiki_contributors(create_by_user_key);
CREATE INDEX idx_wiki_comments_assignee ON wiki_comments(assignee_code);
```

### **Batch Processing**
- Process pages in batches of 50-100
- Use database transactions for consistency
- Implement retry logic for failed requests

### **Monitoring**
- Log all operations with timestamps
- Track success/failure rates
- Monitor database performance

---

## 🎯 Summary

Hệ thống này cung cấp phân tích toàn diện về hoạt động của users trong Confluence Wiki thông qua 4 metrics chính:

1. **Created Pages**: Từ `wiki_pages.created_by_key`
2. **View Pages**: Từ `wiki_views.user_key` và `total`
3. **Edit Pages**: Từ `wiki_contributors.create_by_user_key`
4. **Comments**: Từ `wiki_comments.assignee_code`

Tất cả metrics đều được lưu trữ trong MySQL database và có thể được query để tạo analytics dashboard hoặc báo cáo chi tiết về hoạt động của users.
