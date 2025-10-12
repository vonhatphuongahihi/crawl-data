-- Update existing database to use simplified schema
-- This script will recreate the bts_issues and bts_changelogs tables

USE issue_tracking_db;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing tables that depend on bts_issues
DROP TABLE IF EXISTS bts_issue_fix_versions;
DROP TABLE IF EXISTS bts_labels;
DROP TABLE IF EXISTS bts_subtasks;
DROP TABLE IF EXISTS bts_components;
DROP TABLE IF EXISTS bts_changelogs;

-- Drop and recreate bts_issues table with simplified schema
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
    
    -- Foreign key constraints
    FOREIGN KEY (project_id) REFERENCES bts_projects(id) ON DELETE SET NULL
);

-- Create new changelogs table
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

-- Insert default statuses if they don't exist
INSERT IGNORE INTO bts_statuses (id, name, description, status_category) VALUES
('open', 'Open', 'Issue is open', '{"key": "new", "colorName": "blue-gray", "name": "To Do"}'),
('in_progress', 'In Progress', 'Issue is being worked on', '{"key": "indeterminate", "colorName": "yellow", "name": "In Progress"}'),
('closed', 'Closed', 'Issue is closed', '{"key": "done", "colorName": "green", "name": "Done"}'),
('hold', 'Hold', 'Issue is on hold', '{"key": "indeterminate", "colorName": "orange", "name": "On Hold"}'),
('parking_lot', 'Parking lot', 'Issue is in parking lot', '{"key": "indeterminate", "colorName": "gray", "name": "Parking lot"}');

SELECT 'Database updated successfully! New simplified schema is ready.' as message;
