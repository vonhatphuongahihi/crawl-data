-- Update wiki_visit_histories table to use DATETIME instead of DATE
-- This fixes the "Incorrect date value" error when inserting ISO timestamps

USE issue_tracking_db;

-- Drop the existing table and recreate with correct schema
DROP TABLE IF EXISTS wiki_visit_histories;

CREATE TABLE wiki_visit_histories (
    visit_id INT AUTO_INCREMENT PRIMARY KEY,
    views_id INT NOT NULL,
    visit_date DATETIME NOT NULL, -- Changed from DATE to DATETIME to support full timestamp
    unix_date VARCHAR(20),
    create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (views_id) REFERENCES wiki_views(id) ON DELETE CASCADE,
    INDEX idx_views_history (views_id),
    INDEX idx_visit_date (visit_date)
);

-- Also ensure wiki_spaces table exists (in case it's missing)
CREATE TABLE IF NOT EXISTS wiki_spaces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    space_id VARCHAR(255) NOT NULL UNIQUE,
    space_key VARCHAR(100) NOT NULL UNIQUE,
    space_name VARCHAR(255) NOT NULL,
    space_type VARCHAR(50) DEFAULT 'global',
    status VARCHAR(50) DEFAULT 'current',
    description TEXT,
    homepage_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_space_key (space_key),
    INDEX idx_space_id (space_id),
    INDEX idx_space_name (space_name)
);

SELECT 'Database schema updated successfully!' as status;
