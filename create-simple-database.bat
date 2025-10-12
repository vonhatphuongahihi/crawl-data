@echo off
echo Creating simplified database schema...

set MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 9.4\bin\mysql.exe"
echo Enter MySQL root password:
%MYSQL_PATH% -u root -p < company-database-schema-simple.sql

if %ERRORLEVEL% EQU 0 (
    echo ✅ Database created successfully!
) else (
    echo ❌ Failed to create database. Please check your MySQL configuration.
)

pause
