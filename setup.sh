#!/bin/bash

echo "🚀 MCP Jira Crawler Setup"
echo "========================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your configuration before continuing!"
    echo "   - JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN"
    echo "   - DB_PASSWORD (MySQL password)"
    echo ""
    read -p "Press Enter after editing .env file..."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build project
echo "🔨 Building project..."
npm run build

# Setup database (optional)
echo "🗄️  Database setup..."
echo "Run these commands to setup MySQL database:"
echo "   mysql -u root -p -e \"CREATE DATABASE IF NOT EXISTS issue_tracking_db;\""
echo "   mysql -u root -p issue_tracking_db < local-database.sql"
echo ""

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Start MCP server:"
echo "   docker run --rm -p 9000:9000 --env-file .env mcp-atlassian:latest --transport streamable-http --port 9000 -vv"
echo ""
echo "2. Run crawler (in another terminal):"
echo "   npm run crawl:manual"
echo ""
echo "📖 See SETUP_GUIDE.md for detailed instructions"
