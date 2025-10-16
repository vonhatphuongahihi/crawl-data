-- Add new columns to wiki_comments table
ALTER TABLE wiki_comments ADD COLUMN assignee_code VARCHAR(255) NULL AFTER author_user_key;
ALTER TABLE wiki_comments ADD COLUMN display_name VARCHAR(255) NULL AFTER assignee_code;
