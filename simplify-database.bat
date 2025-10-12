@echo off
setlocal

set MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 9.4\bin\mysql.exe"
set SCHEMA_FILE="simplify-database-schema.sql"

echo.
echo =======================================
echo  Simplifying Database Schema
echo =======================================
echo.

if not exist %MYSQL_PATH% (
    echo Error: MySQL executable not found at %MYSQL_PATH%
    echo Please update MYSQL_PATH in this script or install MySQL.
    goto :eof
)

echo Enter MySQL root password:
%MYSQL_PATH% -u root -p < %SCHEMA_FILE%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Failed to simplify database schema.
    echo Please check the error messages above and ensure MySQL is running and credentials are correct.
) else (
    echo.
    echo ✅ Database schema simplified successfully!
    echo - Dropped bts_statuses table
    echo - Simplified bts_users table (auto increment id)
    echo - Removed foreign key columns from bts_issues
    echo You can now run the crawler.
)

echo.
pause
endlocal
