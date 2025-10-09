-- MySQL Schema cho MCP Jira Crawler
-- Dựa trên Prisma schema hiện tại

-- Tạo database nếu chưa có
CREATE DATABASE IF NOT EXISTS issue_tracking_db;
USE issue_tracking_db;

-- Bảng users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    email_address VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_account_id (account_id)
);

-- Bảng projects  
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(255) PRIMARY KEY,
    key VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    self VARCHAR(500),
    project_type VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_key (key),
    INDEX idx_key (key)
);

-- Bảng statuses
CREATE TABLE IF NOT EXISTS statuses (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    status_category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
);

-- Bảng fix_versions
CREATE TABLE IF NOT EXISTS fix_versions (
    id VARCHAR(255) PRIMARY KEY,
    self VARCHAR(500),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    archived BOOLEAN DEFAULT FALSE,
    released BOOLEAN DEFAULT FALSE,
    release_date DATETIME,
    project_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_project_id (project_id),
    INDEX idx_name (name),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Bảng issues (chính)
CREATE TABLE IF NOT EXISTS issues (
    id VARCHAR(255) PRIMARY KEY,
    key VARCHAR(50) NOT NULL,
    self VARCHAR(500),
    summary TEXT,
    status_id VARCHAR(255),
    project_id VARCHAR(255),
    assignee_id VARCHAR(255),
    reporter_id VARCHAR(255),
    fix_version_id VARCHAR(255),
    created DATETIME NOT NULL,
    updated DATETIME NOT NULL,
    resolved_date DATETIME,
    time_estimate INT,
    time_original_estimate INT,
    custom_fields JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (key),
    INDEX idx_project_id (project_id),
    INDEX idx_assignee_id (assignee_id),
    INDEX idx_reporter_id (reporter_id),
    INDEX idx_status_id (status_id),
    INDEX idx_created (created),
    FOREIGN KEY (status_id) REFERENCES statuses(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (fix_version_id) REFERENCES fix_versions(id) ON DELETE SET NULL
);

-- Bảng components
CREATE TABLE IF NOT EXISTS components (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    self VARCHAR(500),
    issue_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_issue_id (issue_id),
    INDEX idx_name (name),
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
);

-- Bảng labels
CREATE TABLE IF NOT EXISTS labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    issue_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_issue_id (issue_id),
    INDEX idx_name (name),
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
);

-- Bảng changelogs
CREATE TABLE IF NOT EXISTS changelogs (
    id VARCHAR(255) PRIMARY KEY,
    issue_id VARCHAR(255) NOT NULL,
    created DATETIME NOT NULL,
    author_id VARCHAR(255),
    items JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_issue_id (issue_id),
    INDEX idx_author_id (author_id),
    INDEX idx_created (created),
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Bảng subtasks
CREATE TABLE IF NOT EXISTS subtasks (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    self VARCHAR(500),
    issue_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_issue_id (issue_id),
    INDEX idx_name (name),
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
);

-- Bảng issue_fix_versions (many-to-many)
CREATE TABLE IF NOT EXISTS issue_fix_versions (
    issue_id VARCHAR(255),
    fix_version_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (issue_id, fix_version_id),
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
    FOREIGN KEY (fix_version_id) REFERENCES fix_versions(id) ON DELETE CASCADE
);

-- Bảng snapshot_issues (để lưu snapshot)
CREATE TABLE IF NOT EXISTS snapshot_issues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    issue_id VARCHAR(255),
    snapshot_date DATETIME NOT NULL,
    key VARCHAR(50) NOT NULL,
    self VARCHAR(500),
    summary TEXT,
    status_id VARCHAR(255),
    project_id VARCHAR(255),
    assignee_id VARCHAR(255),
    reporter_id VARCHAR(255),
    fix_version_id VARCHAR(255),
    created DATETIME NOT NULL,
    updated DATETIME NOT NULL,
    resolved_date DATETIME,
    time_estimate INT,
    time_original_estimate INT,
    custom_fields JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_snapshot_date (snapshot_date),
    INDEX idx_issue_id (issue_id),
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
);

-- Tạo views để dễ query
CREATE OR REPLACE VIEW issue_summary AS
SELECT 
    i.id,
    i.key,
    i.summary,
    i.status_id,
    s.name as status_name,
    i.project_id,
    p.name as project_name,
    i.assignee_id,
    u1.display_name as assignee_name,
    i.reporter_id,
    u2.display_name as reporter_name,
    i.created,
    i.updated,
    i.resolved_date
FROM issues i
LEFT JOIN statuses s ON i.status_id = s.id
LEFT JOIN projects p ON i.project_id = p.id
LEFT JOIN users u1 ON i.assignee_id = u1.id
LEFT JOIN users u2 ON i.reporter_id = u2.id;
