# MCP Jira Crawler Setup Script for Windows
Write-Host "🚀 MCP Jira Crawler Setup" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "📝 Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item env.example .env
    Write-Host "⚠️  Please edit .env file with your configuration before continuing!" -ForegroundColor Red
    Write-Host "   - JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN" -ForegroundColor Yellow
    Write-Host "   - DB_PASSWORD (MySQL password)" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter after editing .env file"
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install

# Build project
Write-Host "🔨 Building project..." -ForegroundColor Blue
npm run build

# Setup database instructions
Write-Host "🗄️  Database setup:" -ForegroundColor Blue
Write-Host "Run these commands to setup MySQL database:" -ForegroundColor Yellow
Write-Host "   mysql -u root -p -e `"CREATE DATABASE IF NOT EXISTS issue_tracking_db;`"" -ForegroundColor Cyan
Write-Host "   mysql -u root -p issue_tracking_db < local-database.sql" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next steps:" -ForegroundColor Green
Write-Host "1. Start MCP server:" -ForegroundColor Yellow
Write-Host "   docker run --rm -p 9000:9000 --env-file .env mcp-atlassian:latest --transport streamable-http --port 9000 -vv" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Run crawler (in another terminal):" -ForegroundColor Yellow
Write-Host "   npm run crawl:manual" -ForegroundColor Cyan
Write-Host ""
Write-Host "📖 See SETUP_GUIDE.md for detailed instructions" -ForegroundColor Blue
