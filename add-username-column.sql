-- Add username column to bts_users table
ALTER TABLE bts_users 
ADD COLUMN username VARCHAR(255) NULL 
AFTER email_address;

-- Show table structure to verify
DESCRIBE bts_users;
