@echo off
echo Creating Company Jira Database Schema...

REM MySQL path
set MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 9.4\bin\mysql.exe"

echo.
echo Enter MySQL root password: 
%MYSQL_PATH% -u root -p < company-database-schema.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Company database schema created successfully!
    echo.
    echo 📋 Database contains 8 main tables:
    echo    - bts_projects (projects)
    echo    - bts_issues (issues with separated fields)
    echo    - bts_users (users)
    echo    - bts_statuses (statuses)
    echo    - bts_labels (labels)
    echo    - bts_changelogs (changelog history)
    echo    - bts_worklogs (time tracking)
    echo    - bts_subtasks (subtasks)
    echo.
    echo 🎯 Ready to crawl company Jira data!
) else (
    echo.
    echo ❌ Error creating company database schema.
)

echo.
pause
