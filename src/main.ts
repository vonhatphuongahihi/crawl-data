#!/usr/bin/env node

import { Command } from 'commander';
import { MCPJiraCrawler, CrawlConfig } from './scripts/mcpJiraCrawler.js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const program = new Command();

program
    .name('mcp-jira-crawler')
    .description('MCP-based Jira data crawler')
    .version('1.0.0');

program
    .command('crawl')
    .description('Crawl Jira data using MCP server')
    .requiredOption('-u, --url <url>', 'Jira URL')
    .requiredOption('-e, --email <email>', 'Jira username/email')
    .requiredOption('-t, --token <token>', 'Jira API token')
    .option('-p, --projects <projects>', 'Comma-separated list of project keys to crawl')
    .option('-b, --batch-size <size>', 'Batch size for processing issues', '50')
    .option('-m, --max-issues <max>', 'Maximum number of issues to crawl per project')
    .option('--include-archived', 'Include archived projects', false)
    .option('--include-changelog', 'Include changelog data', true)
    .option('--include-worklog', 'Include worklog data', false)
    .option('--include-attachments', 'Download attachments', false)
    .option('-o, --output <dir>', 'Output directory for reports and attachments', './output')
    .action(async (options) => {
        try {
            const config: CrawlConfig = {
                jiraUrl: options.url,
                username: options.email,
                apiToken: options.token,
                projectKeys: options.projects ? options.projects.split(',').map((p: string) => p.trim()) : undefined,
                batchSize: parseInt(options.batchSize),
                maxIssues: options.maxIssues ? parseInt(options.maxIssues) : 1000,
                includeArchivedProjects: options.includeArchived,
                includeChangelog: options.includeChangelog,
                includeWorklog: options.includeWorklog,
                includeAttachments: options.includeAttachments,
                outputDir: options.output
            };

            console.log('🚀 Starting MCP Jira Crawler...');
            console.log('📋 Configuration:');
            console.log(`   Jira URL: ${config.jiraUrl}`);
            console.log(`   Username: ${config.username}`);
            console.log(`   Projects: ${config.projectKeys ? config.projectKeys.join(', ') : 'All projects'}`);
            console.log(`   Batch Size: ${config.batchSize}`);
            console.log(`   Max Issues: ${config.maxIssues || 'No limit'}`);
            console.log(`   Include Archived: ${config.includeArchivedProjects}`);
            console.log(`   Include Changelog: ${config.includeChangelog}`);
            console.log(`   Include Worklog: ${config.includeWorklog}`);
            console.log(`   Include Attachments: ${config.includeAttachments}`);
            console.log(`   Output Directory: ${config.outputDir}`);

            const crawler = new MCPJiraCrawler(config);
            await crawler.start();

            const progress = crawler.getProgress();
            const errors = crawler.getErrors();

            console.log('\n🎉 Crawling completed!');
            console.log(`📊 Final Statistics:`);
            console.log(`   Projects: ${progress.completedProjects}/${progress.totalProjects}`);
            console.log(`   Issues: ${progress.completedIssues}/${progress.totalIssues}`);
            console.log(`   Errors: ${errors.length}`);

            if (progress.endTime && progress.startTime) {
                const duration = progress.endTime.getTime() - progress.startTime.getTime();
                const minutes = Math.floor(duration / 60000);
                const seconds = Math.floor((duration % 60000) / 1000);
                console.log(`   Duration: ${minutes}m ${seconds}s`);
            }

            if (errors.length > 0) {
                console.log('\n⚠️  Errors encountered:');
                errors.forEach((error, index) => {
                    console.log(`   ${index + 1}. ${error}`);
                });
            }

            process.exit(0);

        } catch (error) {
            console.error('❌ Crawling failed:', error);
            process.exit(1);
        }
    });

program
    .command('config')
    .description('Show current configuration')
    .action(() => {
        console.log('📋 Current Configuration:');
        console.log(`   JIRA_URL: ${process.env['JIRA_URL'] || 'Not set'}`);
        console.log(`   JIRA_USERNAME: ${process.env['JIRA_USERNAME'] || 'Not set'}`);
        console.log(`   JIRA_API_TOKEN: ${process.env['JIRA_API_TOKEN'] ? '***' : 'Not set'}`);
        console.log(`   DB_HOST: ${process.env['DB_HOST'] || 'localhost'}`);
        console.log(`   DB_PORT: ${process.env['DB_PORT'] || '3306'}`);
        console.log(`   DB_USER: ${process.env['DB_USER'] || 'root'}`);
        console.log(`   DB_PASSWORD: ${process.env['DB_PASSWORD'] ? '***' : 'Not set'}`);
        console.log(`   DB_NAME: ${process.env['DB_NAME'] || 'issue_tracking_db'}`);
    });

program
    .command('test-connection')
    .description('Test connection to Jira and database')
    .requiredOption('-u, --url <url>', 'Jira URL')
    .requiredOption('-e, --email <email>', 'Jira username/email')
    .requiredOption('-t, --token <token>', 'Jira API token')
    .action(async (options) => {
        try {
            console.log('🔌 Testing connections...');

            // Test Jira connection
            console.log('📡 Testing Jira connection...');
            const { MCPJiraService } = await import('./services/mcpJiraService');
            const jiraService = new MCPJiraService(options.url, options.email, options.token);

            await jiraService.connect();
            console.log('✅ Jira connection successful');

            // Test getting projects
            const projects = await jiraService.getAllProjects();
            console.log(`📁 Found ${projects.length} projects`);

            await jiraService.disconnect();
            console.log('✅ Jira test completed');

            // Test database connection
            console.log('🗄️  Testing database connection...');
            const { DatabaseService } = await import('./services/databaseService');
            const dbService = new DatabaseService();

            // Test a simple query
            const lastIssue = await dbService.getLastUpdatedIssue();
            console.log(`📊 Database connection successful. Last updated issue: ${lastIssue?.key || 'None'}`);

            await dbService.close();
            console.log('✅ Database test completed');

            console.log('\n🎉 All connections successful!');

        } catch (error) {
            console.error('❌ Connection test failed:', error);
            process.exit(1);
        }
    });

program
    .command('setup-db')
    .description('Setup local database with schema')
    .action(async () => {
        try {
            console.log('🗄️  Setting up local database...');

            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const execAsync = promisify(exec);

            // Read and execute SQL file
            const sqlPath = path.join(__dirname, '..', 'local-database.sql');

            // Execute SQL
            await execAsync(`mysql -u root -p < "${sqlPath}"`);

            console.log('✅ Database setup completed');
            console.log('📋 Database: issue_tracking_db');
            console.log('📋 Tables created:');
            console.log('   - bts_issues');
            console.log('   - bts_users');
            console.log('   - bts_projects');
            console.log('   - bts_statuses');
            console.log('   - bts_components');
            console.log('   - bts_changelogs');
            console.log('   - bts_subtasks');
            console.log('   - fix_versions');
            console.log('   - bts_labels');
            console.log('   - bts_issue_fix_versions');
            console.log('   - bts_snapshot_issues');

        } catch (error) {
            console.error('❌ Database setup failed:', error);
            console.log('💡 Make sure MySQL is running and you have the correct credentials');
            console.log('💡 You can manually run: mysql -u root -p < local-database.sql');
            process.exit(1);
        }
    });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Parse command line arguments
program.parse();

