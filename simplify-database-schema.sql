-- Simplify database schema
-- 1. Drop bts_statuses table
-- 2. Simplify bts_users table (auto increment id, remove user_id)
-- 3. Remove foreign key columns from bts_issues

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables that depend on bts_issues first
DROP TABLE IF EXISTS bts_changelogs;
DROP TABLE IF EXISTS bts_issue_fix_versions;
DROP TABLE IF EXISTS bts_labels;
DROP TABLE IF EXISTS bts_subtasks;
DROP TABLE IF EXISTS bts_components;

-- Drop bts_statuses table
DROP TABLE IF EXISTS bts_statuses;

-- Drop and recreate bts_users with simplified schema
DROP TABLE IF EXISTS bts_users;
CREATE TABLE bts_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(255),
    display_name VARCHAR(255),
    email_address VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_account_id (account_id),
    INDEX idx_display_name (display_name),
    INDEX idx_email_address (email_address)
);

-- Drop and recreate bts_issues with simplified schema
DROP TABLE IF EXISTS bts_issues;
CREATE TABLE bts_issues (
    id VARCHAR(255) PRIMARY KEY,
    `key` VARCHAR(50) NOT NULL UNIQUE,
    self VARCHAR(500),
    summary TEXT,
    
    -- Status info (name only)
    status_name VARCHAR(255),
    
    -- Project info
    project_id VARCHAR(100),
    project_key VARCHAR(50),
    project_name VARCHAR(255),
    
    -- User assignments (name only)
    assignee_name VARCHAR(255),
    reporter_name VARCHAR(255),
    
    -- Issue details (name only)
    issue_type_name VARCHAR(255),
    priority_name VARCHAR(255),
    
    -- Dates
    created DATETIME,
    updated DATETIME,
    resolved_date DATETIME,
    
    -- Description and labels
    description TEXT,
    labels JSON,
    subtasks JSON,
    changelog JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_key (`key`),
    INDEX idx_status_name (status_name),
    INDEX idx_project_id (project_id),
    INDEX idx_project_key (project_key),
    INDEX idx_assignee_name (assignee_name),
    INDEX idx_reporter_name (reporter_name),
    INDEX idx_issue_type_name (issue_type_name),
    INDEX idx_priority_name (priority_name),
    INDEX idx_created (created),
    INDEX idx_updated (updated),
    INDEX idx_resolved_date (resolved_date),
    
    -- Foreign key constraints (only for project)
    FOREIGN KEY (project_id) REFERENCES bts_projects(id) ON DELETE SET NULL
);

-- Recreate Changelogs table (for detailed changelog tracking)
CREATE TABLE bts_changelogs (
    id VARCHAR(255) PRIMARY KEY,
    issue_id VARCHAR(255) NOT NULL,
    created DATETIME,
    author_name VARCHAR(255),
    author_email VARCHAR(255),
    items JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_issue_id (issue_id),
    INDEX idx_created (created),
    INDEX idx_author_name (author_name),
    FOREIGN KEY (issue_id) REFERENCES bts_issues(id) ON DELETE CASCADE
);

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
