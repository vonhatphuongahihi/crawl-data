-- Drop old columns from bts_issues table
USE issue_tracking_db;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Drop old columns that are no longer needed
ALTER TABLE bts_issues 
DROP COLUMN IF EXISTS status_id,
DROP COLUMN IF EXISTS assignee_id,
DROP COLUMN IF EXISTS reporter_id,
DROP COLUMN IF EXISTS issue_type_id,
DROP COLUMN IF EXISTS priority_id,
DROP COLUMN IF EXISTS time_estimate,
DROP COLUMN IF EXISTS time_original_estimate,
DROP COLUMN IF EXISTS components,
DROP COLUMN IF EXISTS fix_versions,
DROP COLUMN IF EXISTS attachments;

-- Add changelog column if it doesn't exist
ALTER TABLE bts_issues 
ADD COLUMN IF NOT EXISTS changelog JSON;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Old columns dropped successfully! Table is now compatible with simplified schema.' as message;
