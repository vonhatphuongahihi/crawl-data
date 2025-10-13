-- Create bts_comments table for Jira comments
CREATE TABLE IF NOT EXISTS bts_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    issue_id VARCHAR(255) NOT NULL,
    comment_id VARCHAR(255) NOT NULL UNIQUE,
    author_name VARCHAR(500) NOT NULL,
    author_email VARCHAR(255),
    body TEXT,
    created TIMESTAMP NOT NULL,
    updated TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES bts_issues(id) ON DELETE CASCADE,
    INDEX idx_issue_id (issue_id),
    INDEX idx_comment_id (comment_id),
    INDEX idx_author_name (author_name),
    INDEX idx_created (created)
);
