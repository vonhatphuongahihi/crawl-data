-- ================================WIKI DATABASE SCHEMA========================================

-- Wiki Users Table (updated for MCP data)
CREATE TABLE wiki_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- Remove UNIQUE constraint for MCP compatibility
    user_key VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(500) NOT NULL, -- Increase size for longer names
    avatar_url TEXT,
    roles TEXT,
    english_name VARCHAR(255),
    is_resigned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_key (user_key),
    INDEX idx_user_id (user_id),
    INDEX idx_display_name (display_name)
);

-- Wiki Pages Table (updated for MCP data)
CREATE TABLE wiki_pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id VARCHAR(255) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    views INT DEFAULT 0,
    last_modified_by VARCHAR(500), -- Increase size for longer names
    number_of_versions INT DEFAULT 0,
    parent_page_ids TEXT,
    created_by_id INT,
    created_at TIMESTAMP NULL,
    nearest_parent_id VARCHAR(255),
    space_key VARCHAR(100),
    content_type VARCHAR(50) DEFAULT 'page',
    status VARCHAR(50) DEFAULT 'current',
    version_number INT DEFAULT 1,
    last_modified_at TIMESTAMP NULL,
    created_at_db TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at_db TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_id) REFERENCES wiki_users(id) ON DELETE SET NULL,
    INDEX idx_page_id (page_id),
    INDEX idx_space_key (space_key),
    INDEX idx_created_by (created_by_id),
    INDEX idx_parent_page (nearest_parent_id),
    INDEX idx_status (status)
);

-- Wiki Views Table (tổng views của mỗi user cho mỗi page)
CREATE TABLE wiki_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id VARCHAR(255) NOT NULL,
    user_key VARCHAR(255) NOT NULL,
    total INT DEFAULT 0,
    last_view TIMESTAMP NULL,
    created_at_db TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at_db TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES wiki_pages(page_id) ON DELETE CASCADE,
    FOREIGN KEY (user_key) REFERENCES wiki_users(user_key) ON DELETE CASCADE,
    UNIQUE KEY unique_page_user (page_id, user_key),
    INDEX idx_page_views (page_id),
    INDEX idx_user_views (user_key),
    INDEX idx_last_view (last_view)
);

-- Wiki Contributors Table (version history contributors)
CREATE TABLE wiki_contributors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    create_by_user_key VARCHAR(255) NOT NULL,
    confluence_page_id VARCHAR(255) NOT NULL,
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    version INT NOT NULL,
    when_modified TIMESTAMP NOT NULL,
    message TEXT,
    minor_edit BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (confluence_page_id) REFERENCES wiki_pages(page_id) ON DELETE CASCADE,
    FOREIGN KEY (create_by_user_key) REFERENCES wiki_users(user_key) ON DELETE CASCADE,
    UNIQUE KEY unique_page_version (confluence_page_id, version),
    INDEX idx_page_contributors (confluence_page_id),
    INDEX idx_user_contributors (create_by_user_key),
    INDEX idx_version (version)
);

-- Wiki Visit History Table (chi tiết từng lần visit)
CREATE TABLE wiki_visit_histories (
    visit_id INT AUTO_INCREMENT PRIMARY KEY,
    views_id INT NOT NULL,
    visit_date DATETIME NOT NULL, -- Changed from DATE to DATETIME to support full timestamp
    unix_date VARCHAR(20),
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (views_id) REFERENCES wiki_views(id) ON DELETE CASCADE,
    INDEX idx_views_history (views_id),
    INDEX idx_visit_date (visit_date)
);

-- Wiki History Crawl Pages Table (tracking crawl history)
CREATE TABLE wiki_history_crawl_pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    crawl_at VARCHAR(50) NOT NULL,
    page_crawled INT DEFAULT 0,
    successful_crawls INT DEFAULT 0,
    failed_crawls INT DEFAULT 0,
    crawl_duration_ms INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_crawl_at (crawl_at)
);

-- Wiki Spaces Table (Confluence spaces info)
CREATE TABLE wiki_spaces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    space_id VARCHAR(255) NOT NULL UNIQUE,
    space_key VARCHAR(100) NOT NULL UNIQUE,
    space_name VARCHAR(255) NOT NULL,
    space_type VARCHAR(50),
    status VARCHAR(50),
    description TEXT,
    homepage_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_space_key (space_key),
    INDEX idx_space_name (space_name),
    INDEX idx_status (status)
);

-- Wiki Labels Table (page labels/tags)
CREATE TABLE wiki_labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id VARCHAR(255) NOT NULL,
    label_name VARCHAR(255) NOT NULL,
    label_prefix VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES wiki_pages(page_id) ON DELETE CASCADE,
    INDEX idx_page_labels (page_id),
    INDEX idx_label_name (label_name),
    UNIQUE KEY unique_page_label (page_id, label_name)
);

-- Wiki Comments Table (page comments)
CREATE TABLE wiki_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    comment_id VARCHAR(255) NOT NULL UNIQUE,
    page_id VARCHAR(255) NOT NULL,
    comment_title VARCHAR(255),
    comment_body TEXT,
    author_user_key VARCHAR(255),
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    version_number INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'current',
    created_at_db TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at_db TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES wiki_pages(page_id) ON DELETE CASCADE,
    FOREIGN KEY (author_user_key) REFERENCES wiki_users(user_key) ON DELETE SET NULL,
    INDEX idx_comment_id (comment_id),
    INDEX idx_page_comments (page_id),
    INDEX idx_author_comments (author_user_key),
    INDEX idx_created_at (created_at)
);

-- Insert sample data
INSERT INTO wiki_spaces (space_id, space_key, space_name, space_type, status) VALUES
('123456', 'TEAM', 'Team Space', 'global', 'current'),
('789012', 'PROJ', 'Project Space', 'global', 'current');

-- Create views for easier querying
CREATE VIEW wiki_page_summary AS
SELECT 
    p.page_id,
    p.title,
    p.url,
    p.views,
    p.last_modified_by,
    p.number_of_versions,
    p.space_key,
    p.created_at,
    p.last_modified_at,
    u.display_name as created_by_name,
    COUNT(DISTINCT c.id) as comment_count,
    COUNT(DISTINCT l.label_name) as label_count
FROM wiki_pages p
LEFT JOIN wiki_users u ON p.created_by_id = u.id
LEFT JOIN wiki_comments c ON p.page_id = c.page_id
LEFT JOIN wiki_labels l ON p.page_id = l.page_id
GROUP BY p.id;

CREATE VIEW wiki_user_activity AS
SELECT 
    u.user_key,
    u.display_name,
    u.is_resigned,
    COUNT(DISTINCT p.page_id) as pages_created,
    COUNT(DISTINCT w.page_id) as pages_viewed,
    COUNT(DISTINCT contrib.confluence_page_id) as pages_contributed,
    SUM(w.total) as total_views,
    MAX(w.last_view) as last_view_date
FROM wiki_users u
LEFT JOIN wiki_pages p ON u.id = p.created_by_id
LEFT JOIN wiki_views w ON u.user_key = w.user_key
LEFT JOIN wiki_contributors contrib ON u.user_key = contrib.create_by_user_key
GROUP BY u.id;
