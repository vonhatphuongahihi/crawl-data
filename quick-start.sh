#!/bin/bash

# MCP Jira Crawler Quick Start Script

set -e

echo "🚀 MCP Jira Crawler Quick Start"
echo "================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your Jira credentials before continuing"
    echo "   Required: JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN, DB_PASSWORD"
    exit 1
fi

# Load environment variables
source .env

# Check required environment variables
if [ -z "$JIRA_URL" ] || [ -z "$JIRA_USERNAME" ] || [ -z "$JIRA_API_TOKEN" ]; then
    echo "❌ Missing required environment variables in .env file"
    echo "   Please set: JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building project..."
npm run build

echo "🗄️  Setting up database..."
npm run setup-db

echo "🔌 Testing connections..."
npm run test-connection -- \
  --url "$JIRA_URL" \
  --email "$JIRA_USERNAME" \
  --token "$JIRA_API_TOKEN"

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "🎯 Ready to crawl! Use one of these commands:"
echo ""
echo "   # Crawl all projects:"
echo "   npm run crawl -- --url \"$JIRA_URL\" --email \"$JIRA_USERNAME\" --token \"$JIRA_API_TOKEN\""
echo ""
echo "   # Crawl specific projects:"
echo "   npm run crawl -- --url \"$JIRA_URL\" --email \"$JIRA_USERNAME\" --token \"$JIRA_API_TOKEN\" --projects \"PROJ1,PROJ2\""
echo ""
echo "   # Crawl with advanced options:"
echo "   npm run crawl -- --url \"$JIRA_URL\" --email \"$JIRA_USERNAME\" --token \"$JIRA_API_TOKEN\" --batch-size 25 --include-changelog --include-worklog"
echo ""
echo "📚 For more options, run: npm run crawl -- --help"

