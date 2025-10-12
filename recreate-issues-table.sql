-- Recreate bts_issues table with simplified schema (no components, fix_versions, etc.)
USE issue_tracking_db;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Drop existing bts_issues table and related tables
DROP TABLE IF EXISTS bts_issue_fix_versions;
DROP TABLE IF EXISTS bts_labels;
DROP TABLE IF EXISTS bts_subtasks;
DROP TABLE IF EXISTS bts_components;
DROP TABLE IF EXISTS bts_changelogs;
DROP TABLE IF EXISTS bts_issues;

-- Recreate bts_issues table with simplified schema
CREATE TABLE bts_issues (
    id VARCHAR(255) PRIMARY KEY,
    `key` VARCHAR(50) NOT NULL UNIQUE,
    self VARCHAR(500),
    summary TEXT,
    
    -- Status info (both ID and name)
    status_id VARCHAR(100),
    status_name VARCHAR(255),
    
    -- Project info
    project_id VARCHAR(100),
    project_key VARCHAR(50),
    project_name VARCHAR(255),
    
    -- User assignments (both ID and name)
    assignee_id VARCHAR(100),
    assignee_name VARCHAR(255),
    reporter_id VARCHAR(100),
    reporter_name VARCHAR(255),
    
    -- Issue details (name only - no ID fields as requested)
    issue_type_name VARCHAR(255),
    priority_name VARCHAR(255),
    
    -- Dates
    created DATETIME,
    updated DATETIME,
    resolved_date DATETIME,
    
    -- Description and JSON fields (only what you need)
    description TEXT,
    labels JSON,
    subtasks JSON,
    changelog JSON,
    
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
    INDEX idx_assignee_name (assignee_name),
    INDEX idx_reporter_id (reporter_id),
    INDEX idx_reporter_name (reporter_name),
    INDEX idx_issue_type_name (issue_type_name),
    INDEX idx_priority_name (priority_name),
    INDEX idx_created (created),
    INDEX idx_updated (updated),
    INDEX idx_resolved_date (resolved_date),
    
    -- Foreign key constraints
    FOREIGN KEY (status_id) REFERENCES bts_statuses(id) ON DELETE SET NULL,
    FOREIGN KEY (project_id) REFERENCES bts_projects(id) ON DELETE SET NULL,
    FOREIGN KEY (assignee_id) REFERENCES bts_users(id) ON DELETE SET NULL,
    FOREIGN KEY (reporter_id) REFERENCES bts_users(id) ON DELETE SET NULL
);

-- Recreate changelogs table
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

SELECT 'bts_issues table recreated successfully with simplified schema!' as message;
