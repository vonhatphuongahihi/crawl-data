-- Company Jira Database Schema - Simplified Version
-- This schema is optimized for company MCP server data structure

SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS bts_issue_fix_versions;
DROP TABLE IF EXISTS bts_labels;
DROP TABLE IF EXISTS fix_versions;
DROP TABLE IF EXISTS bts_subtasks;
DROP TABLE IF EXISTS bts_components;
DROP TABLE IF EXISTS bts_changelogs;
DROP TABLE IF EXISTS bts_snapshot_issues;
DROP TABLE IF EXISTS bts_issues;
DROP TABLE IF EXISTS bts_statuses;
DROP TABLE IF EXISTS bts_users;
DROP TABLE IF EXISTS bts_projects;

SET FOREIGN_KEY_CHECKS = 1;

-- Create database
CREATE DATABASE IF NOT EXISTS issue_tracking_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE issue_tracking_db;

-- Users table
CREATE TABLE bts_users (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE,
    account_id VARCHAR(255),
    display_name VARCHAR(255),
    email_address VARCHAR(255),
    active BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_account_id (account_id),
    INDEX idx_display_name (display_name),
    INDEX idx_email (email_address)
);

-- Projects table with company MCP server fields
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

-- Issues table with simplified fields
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
    
    -- Foreign key constraints
    FOREIGN KEY (project_id) REFERENCES bts_projects(id) ON DELETE SET NULL
);

-- Changelogs table (for detailed changelog tracking)
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

-- Views for easier querying
CREATE VIEW v_issues_summary AS
SELECT 
    i.id,
    i.key,
    i.summary,
    i.status_name,
    i.project_name,
    i.assignee_name,
    i.reporter_name,
    i.issue_type_name,
    i.priority_name,
    i.created,
    i.updated,
    i.resolved_date
FROM bts_issues i;

CREATE VIEW v_project_issues AS
SELECT 
    p.name as project_name,
    p.key as project_key,
    COUNT(i.id) as issue_count,
    COUNT(CASE WHEN i.status_name = 'Open' THEN 1 END) as open_issues,
    COUNT(CASE WHEN i.status_name = 'Closed' THEN 1 END) as closed_issues,
    COUNT(CASE WHEN i.status_name = 'In Progress' THEN 1 END) as in_progress_issues
FROM bts_projects p
LEFT JOIN bts_issues i ON p.id = i.project_id
GROUP BY p.id, p.name, p.key;

CREATE VIEW v_user_issues AS
SELECT 
    u.display_name,
    u.email_address,
    COUNT(i.id) as assigned_issues,
    COUNT(CASE WHEN i.status_name = 'Open' THEN 1 END) as open_assigned,
    COUNT(CASE WHEN i.status_name = 'Closed' THEN 1 END) as closed_assigned
FROM bts_users u
LEFT JOIN bts_issues i ON u.display_name = i.assignee_name
GROUP BY u.id, u.display_name, u.email_address;

-- Insert default statuses
INSERT INTO bts_statuses (id, name, description, status_category) VALUES
('open', 'Open', 'Issue is open', '{"key": "new", "colorName": "blue-gray", "name": "To Do"}'),
('in_progress', 'In Progress', 'Issue is being worked on', '{"key": "indeterminate", "colorName": "yellow", "name": "In Progress"}'),
('closed', 'Closed', 'Issue is closed', '{"key": "done", "colorName": "green", "name": "Done"}'),
('hold', 'Hold', 'Issue is on hold', '{"key": "indeterminate", "colorName": "orange", "name": "On Hold"}'),
('parking_lot', 'Parking lot', 'Issue is in parking lot', '{"key": "indeterminate", "colorName": "gray", "name": "Parking lot"}');

SET FOREIGN_KEY_CHECKS = 1;
