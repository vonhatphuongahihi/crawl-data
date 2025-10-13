-- Add original_estimate column to bts_issues table
ALTER TABLE bts_issues 
ADD COLUMN original_estimate VARCHAR(255) NULL 
AFTER changelog;

-- Show table structure to verify
DESCRIBE bts_issues;
