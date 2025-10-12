@echo off
echo Recreating bts_issues table with simplified schema...

set MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 9.4\bin\mysql.exe"
echo Enter MySQL root password:
%MYSQL_PATH% -u root -p < recreate-issues-table.sql

if %ERRORLEVEL% EQU 0 (
    echo ✅ bts_issues table recreated successfully!
    echo 📋 Table now has simplified schema: status_id, assignee_id, reporter_id, changelog (no components, fix_versions, etc.)
) else (
    echo ❌ Failed to recreate table. Please check your MySQL configuration.
)

pause