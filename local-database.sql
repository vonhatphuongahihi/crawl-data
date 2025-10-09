-- Local database setup for MCP Jira crawler
-- Based on jira-database.sql schema

-- Create database
CREATE DATABASE IF NOT EXISTS issue_tracking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE issue_tracking_db;

-- BTS Issues table
CREATE TABLE IF NOT EXISTS bts_issues (
    id VARCHAR(255) PRIMARY KEY,
    `key` VARCHAR(50) NOT NULL UNIQUE,
    self VARCHAR(500),
    summary TEXT,
    status_id VARCHAR(100),
    project_id VARCHAR(100),
    assignee_id VARCHAR(100),
    reporter_id VARCHAR(100),
    fix_version_id VARCHAR(100),
    created DATETIME,
    updated DATETIME,
    time_estimate INT,
    time_original_estimate INT,
    resolved_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    custom_fields JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (`key`),
    INDEX idx_project (project_id),
    INDEX idx_status (status_id),
    INDEX idx_assignee (assignee_id),
    INDEX idx_created (created)
);

-- BTS Snapshot Issues table
CREATE TABLE IF NOT EXISTS bts_snapshot_issues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    issue_id VARCHAR(255),
    snapshot_date DATETIME,
    `key` VARCHAR(50),
    self VARCHAR(500),
    summary TEXT,
    status_id VARCHAR(100),
    project_id VARCHAR(100),
    assignee_id VARCHAR(100),
    reporter_id VARCHAR(100),
    fix_version_id VARCHAR(100),
    created DATETIME,
    updated DATETIME,
    time_estimate INT,
    time_original_estimate INT,
    resolved_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    custom_fields JSON,
    FOREIGN KEY (issue_id) REFERENCES bts_issues(id) ON DELETE CASCADE,
    INDEX idx_snapshot_date_issue (snapshot_date, issue_id),
    INDEX idx_key (`key`)
);

-- BTS Users table
CREATE TABLE IF NOT EXISTS bts_users (
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
    INDEX idx_email (email_address)
);

-- BTS Projects table
CREATE TABLE IF NOT EXISTS bts_projects (
    id VARCHAR(255) PRIMARY KEY,
    `key` VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255),
    self VARCHAR(500),
    project_type VARCHAR(100),
    description TEXT,
    lead_account_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (`key`),
    INDEX idx_name (name)
);

-- BTS Statuses table
CREATE TABLE IF NOT EXISTS bts_statuses (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status_category JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name)
);

-- BTS Components table
CREATE TABLE IF NOT EXISTS bts_components (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    self VARCHAR(500),
    issue_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES bts_issues(id) ON DELETE CASCADE,
    INDEX idx_issue_id (issue_id),
    INDEX idx_name (name)
);

-- BTS Changelogs table
CREATE TABLE IF NOT EXISTS bts_changelogs (
    id VARCHAR(255) PRIMARY KEY,
    issue_id VARCHAR(255),
    created DATETIME,
    author_id VARCHAR(255),
    items JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES bts_issues(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES bts_users(id) ON DELETE CASCADE,
    INDEX idx_issue_id (issue_id),
    INDEX idx_created (created),
    INDEX idx_author (author_id)
);

-- BTS Subtasks table
CREATE TABLE IF NOT EXISTS bts_subtasks (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    self VARCHAR(500),
    issue_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES bts_issues(id) ON DELETE CASCADE,
    INDEX idx_issue_id (issue_id)
);

-- BTS Fix Versions table
CREATE TABLE IF NOT EXISTS fix_versions (
    id VARCHAR(255) PRIMARY KEY,
    self VARCHAR(500),
    name VARCHAR(255),
    description TEXT,
    archived BOOLEAN DEFAULT FALSE,
    released BOOLEAN DEFAULT FALSE,
    release_date DATETIME,
    project_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES bts_projects(id) ON DELETE CASCADE,
    INDEX idx_project_id (project_id),
    INDEX idx_name (name)
);

-- Labels table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS bts_labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    issue_id VARCHAR(255),
    label_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES bts_issues(id) ON DELETE CASCADE,
    UNIQUE KEY unique_issue_label (issue_id, label_name),
    INDEX idx_issue_id (issue_id),
    INDEX idx_label (label_name)
);

-- Fix Versions relationship table (many-to-many)
CREATE TABLE IF NOT EXISTS bts_issue_fix_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    issue_id VARCHAR(255),
    fix_version_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES bts_issues(id) ON DELETE CASCADE,
    FOREIGN KEY (fix_version_id) REFERENCES fix_versions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_issue_fix_version (issue_id, fix_version_id),
    INDEX idx_issue_id (issue_id),
    INDEX idx_fix_version_id (fix_version_id)
);

-- Add foreign key constraints to bts_issues
ALTER TABLE bts_issues 
ADD CONSTRAINT fk_assignee FOREIGN KEY (assignee_id) REFERENCES bts_users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_reporter FOREIGN KEY (reporter_id) REFERENCES bts_users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES bts_projects(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_status FOREIGN KEY (status_id) REFERENCES bts_statuses(id) ON DELETE SET NULL;

