-- Add author_code column to bts_comments table
ALTER TABLE bts_comments ADD COLUMN author_code VARCHAR(255) NULL AFTER author_name;
