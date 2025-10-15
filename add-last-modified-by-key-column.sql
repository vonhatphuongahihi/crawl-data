-- Add new columns to wiki_pages table
ALTER TABLE wiki_pages ADD COLUMN last_modified_by_key VARCHAR(255) NULL AFTER last_modified_by;
ALTER TABLE wiki_pages ADD COLUMN created_by_display_name VARCHAR(255) NULL AFTER created_by_id;
ALTER TABLE wiki_pages ADD COLUMN created_by_key VARCHAR(255) NULL AFTER created_by_display_name;
