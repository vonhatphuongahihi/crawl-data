-- Company Jira Database Schema
USE issue_tracking_db;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS bts_issue_fix_versions;
DROP TABLE IF EXISTS bts_snapshot_issues;
DROP TABLE IF EXISTS bts_subtasks;
DROP TABLE IF EXISTS bts_labels;
DROP TABLE IF EXISTS bts_components;
DROP TABLE IF EXISTS bts_changelogs;
DROP TABLE IF EXISTS bts_worklogs;
DROP TABLE IF EXISTS bts_transitions;
DROP TABLE IF EXISTS bts_boards;
DROP TABLE IF EXISTS bts_issues;
DROP TABLE IF EXISTS bts_statuses;
DROP TABLE IF EXISTS bts_users;
DROP TABLE IF EXISTS bts_projects;
DROP TABLE IF EXISTS fix_versions;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Projects table
CREATE TABLE bts_projects (
    id VARCHAR(255) PRIMARY KEY,
    `key` VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    self VARCHAR(500),
    project_type_key VARCHAR(100),
    archived BOOLEAN DEFAULT FALSE,
    project_category_self VARCHAR(500),
    project_category_id VARCHAR(255),
    project_category_name VARCHAR(255),
    project_category_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (`key`),
    INDEX idx_name (name),
    INDEX idx_project_category_id (project_category_id)
);

-- Users table
CREATE TABLE bts_users (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    account_id VARCHAR(255),
    display_name VARCHAR(255),
    email_address VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_account_id (account_id),
    INDEX idx_email (email_address),
    INDEX idx_display_name (display_name)
);

-- Statuses table
CREATE TABLE bts_statuses (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status_category JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
);

-- Issues table with separated fields
CREATE TABLE bts_issues (
    id VARCHAR(255) PRIMARY KEY,
    `key` VARCHAR(50) NOT NULL UNIQUE,
    self VARCHAR(500),
    summary TEXT,
    
    -- Status info (both ID and name for easy reading)
    status_id VARCHAR(100),
    status_name VARCHAR(255),
    
    -- Project info
    project_id VARCHAR(100),
    project_key VARCHAR(50),
    project_name VARCHAR(255),
    
    -- User assignments
    assignee_id VARCHAR(100),
    assignee_name VARCHAR(255),
    reporter_id VARCHAR(100),
    reporter_name VARCHAR(255),
    
    -- Issue details
    issue_type_id VARCHAR(100),
    issue_type_name VARCHAR(255),
    priority_id VARCHAR(100),
    priority_name VARCHAR(255),
    
    -- Dates
    created DATETIME,
    updated DATETIME,
    resolved_date DATETIME,
    
    -- Time tracking
    time_estimate INT,
    time_original_estimate INT,
    
    -- Description and labels
    description TEXT,
    labels JSON,
    
    -- Additional fields
    components JSON,
    fix_versions JSON,
    attachments JSON,
    subtasks JSON,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_key (`key`),
    INDEX idx_status_id (status_id),
    INDEX idx_status_name (status_name),
    INDEX idx_project_id (project_id),
    INDEX idx_project_key (project_key),
    INDEX idx_assignee_id (assignee_id),
    INDEX idx_reporter_id (reporter_id),
    INDEX idx_issue_type_id (issue_type_id),
    INDEX idx_priority_id (priority_id),
    INDEX idx_created (created),
    INDEX idx_updated (updated),
    INDEX idx_resolved_date (resolved_date),
    
    -- Foreign keys
    FOREIGN KEY (status_id) REFERENCES bts_statuses(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES bts_projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES bts_users(id) ON DELETE SET NULL,
    FOREIGN KEY (reporter_id) REFERENCES bts_users(id) ON DELETE SET NULL
);

-- Labels table
CREATE TABLE bts_labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    issue_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES bts_issues(id) ON DELETE CASCADE,
    UNIQUE KEY unique_issue_label (issue_id, name),
    INDEX idx_issue_id (issue_id),
    INDEX idx_name (name)
);

-- Changelogs table
CREATE TABLE bts_changelogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    issue_id VARCHAR(255) NOT NULL,
    author_id VARCHAR(255),
    author_name VARCHAR(255),
    created DATETIME NOT NULL,
    items JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES bts_issues(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES bts_users(id) ON DELETE SET NULL,
    INDEX idx_issue_id (issue_id),
    INDEX idx_author_id (author_id),
    INDEX idx_created (created)
);

-- Worklogs table
CREATE TABLE bts_worklogs (
    id VARCHAR(255) PRIMARY KEY,
    issue_id VARCHAR(255) NOT NULL,
    author_id VARCHAR(255),
    author_name VARCHAR(255),
    comment TEXT,
    time_spent VARCHAR(100),
    time_spent_seconds INT,
    created DATETIME,
    started DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES bts_issues(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES bts_users(id) ON DELETE SET NULL,
    INDEX idx_issue_id (issue_id),
    INDEX idx_author_id (author_id),
    INDEX idx_created (created)
);

-- Subtasks table
CREATE TABLE bts_subtasks (
    id VARCHAR(255) PRIMARY KEY,
    `key` VARCHAR(50) NOT NULL,
    summary TEXT,
    parent_issue_id VARCHAR(255) NOT NULL,
    issue_type_id VARCHAR(100),
    status_id VARCHAR(100),
    status_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_issue_id) REFERENCES bts_issues(id) ON DELETE CASCADE,
    FOREIGN KEY (status_id) REFERENCES bts_statuses(id) ON DELETE SET NULL,
    INDEX idx_parent_issue_id (parent_issue_id),
    INDEX idx_status_id (status_id),
    INDEX idx_key (`key`)
);

-- Set character set and collation
ALTER DATABASE issue_tracking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SELECT 'Company database schema created successfully!' as message;
