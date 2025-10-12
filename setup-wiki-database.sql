-- Setup Wiki Database Tables
USE issue_tracking_db;

-- Drop existing wiki tables if they exist
DROP TABLE IF EXISTS wiki_comments;
DROP TABLE IF EXISTS wiki_labels;
DROP TABLE IF EXISTS wiki_visit_histories;
DROP TABLE IF EXISTS wiki_contributors;
DROP TABLE IF EXISTS wiki_views;
DROP TABLE IF EXISTS wiki_pages;
DROP TABLE IF EXISTS wiki_users;
DROP TABLE IF EXISTS wiki_spaces;
DROP TABLE IF EXISTS wiki_history_crawl_pages;

-- Wiki Users Table
CREATE TABLE wiki_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_key VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(500) NOT NULL,
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

-- Wiki Spaces Table
CREATE TABLE wiki_spaces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    space_id VARCHAR(255) NOT NULL UNIQUE,
    space_key VARCHAR(100) NOT NULL UNIQUE,
    space_name VARCHAR(500) NOT NULL,
    space_type VARCHAR(50) DEFAULT 'global',
    status VARCHAR(50) DEFAULT 'current',
    description TEXT,
    homepage_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_space_key (space_key),
    INDEX idx_space_name (space_name),
    INDEX idx_status (status)
);

-- Wiki Pages Table
CREATE TABLE wiki_pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id VARCHAR(255) NOT NULL UNIQUE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    views INT DEFAULT 0,
    last_modified_by VARCHAR(500),
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
    FOREIGN KEY (space_key) REFERENCES wiki_spaces(space_key) ON DELETE SET NULL,
    INDEX idx_page_id (page_id),
    INDEX idx_space_key (space_key),
    INDEX idx_created_by (created_by_id),
    INDEX idx_parent_page (nearest_parent_id),
    INDEX idx_status (status)
);

-- Wiki Views Table
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

-- Wiki Contributors Table
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

-- Wiki Visit History Table
CREATE TABLE wiki_visit_histories (
    visit_id INT AUTO_INCREMENT PRIMARY KEY,
    views_id INT NOT NULL,
    visit_date DATE NOT NULL,
    unix_date VARCHAR(20),
    visit_timestamp TIMESTAMP NULL,
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (views_id) REFERENCES wiki_views(id) ON DELETE CASCADE,
    INDEX idx_views_history (views_id),
    INDEX idx_visit_date (visit_date),
    INDEX idx_visit_timestamp (visit_timestamp)
);

-- Wiki History Crawl Pages Table
CREATE TABLE wiki_history_crawl_pages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    crawl_at VARCHAR(100) NOT NULL,
    page_crawled INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_crawl_at (crawl_at)
);

-- Wiki Labels Table
CREATE TABLE wiki_labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    page_id VARCHAR(255) NOT NULL,
    label_name VARCHAR(255) NOT NULL,
    label_prefix VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES wiki_pages(page_id) ON DELETE CASCADE,
    UNIQUE KEY unique_page_label (page_id, label_name),
    INDEX idx_page_labels (page_id),
    INDEX idx_label_name (label_name)
);

-- Wiki Comments Table
CREATE TABLE wiki_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    comment_id VARCHAR(255) NOT NULL UNIQUE,
    page_id VARCHAR(255) NOT NULL,
    comment_title VARCHAR(500),
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
    INDEX idx_status (status)
);

-- Show created tables
SHOW TABLES LIKE 'wiki_%';
