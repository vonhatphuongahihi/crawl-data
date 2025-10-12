-- Update bts_changelogs table schema to separate status changes
-- Drop existing table and recreate with new structure

DROP TABLE IF EXISTS bts_changelogs;

CREATE TABLE bts_changelogs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    issue_id VARCHAR(255) NOT NULL,
    created TIMESTAMP NOT NULL,
    author_name VARCHAR(500) NOT NULL,
    author_email VARCHAR(255),
    from_status VARCHAR(100),
    to_status VARCHAR(100),
    from_id VARCHAR(50),
    to_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES bts_issues(issue_id) ON DELETE CASCADE,
    INDEX idx_issue_id (issue_id),
    INDEX idx_created (created),
    INDEX idx_author (author_name),
    INDEX idx_status_change (from_status, to_status)
);
