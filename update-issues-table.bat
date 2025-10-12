@echo off
echo Updating database with simplified schema...

set MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 9.4\bin\mysql.exe"
echo Enter MySQL root password:
%MYSQL_PATH% -u root -p < update-issues-table.sql

if %ERRORLEVEL% EQU 0 (
    echo ✅ Database updated successfully!
    echo 📋 New simplified schema is ready for testing.
) else (
    echo ❌ Failed to update database. Please check your MySQL configuration.
)

pause
