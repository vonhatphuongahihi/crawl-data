import MCPJiraService from './src/services/mcpJiraService.js';
import DatabaseService from './src/services/databaseService.js';
import JiraDataMapper from './src/mappers/jiraDataMapper.js';

let mcpService;

// Initialize MCP session
async function initializeMCPSession() {
    mcpService = new MCPJiraService('', '', '');
    await mcpService.connect();
    console.log('🔌 MCP session initialized');
}

// Call MCP tool
async function callMCPTool(toolName, params) {
    switch (toolName) {
        case 'tools/list':
            // TODO: Implement tools list call
            return [];
        case 'jira_get_all_projects':
            return await mcpService.getAllProjects(params.include_archived);
        case 'jira_get_project_issues':
            return await mcpService.getProjectIssues(params.project_key, params.limit, params.start_at);
        case 'jira_get_issue':
            return await mcpService.getIssue(params.issue_key, params.fields, params.expand);
        default:
            throw new Error(`Unknown tool: ${toolName}`);
    }
}

// All save functions are now handled by DatabaseService and JiraDataMapper

// Main crawler function
async function crawlCompanyData() {
    try {
        // Step 1: Initialize MCP session
        await initializeMCPSession();

        console.log('🔍 Step 1: Listing available tools...');
        const tools = await callMCPTool('tools/list', {});
        console.log('📋 Available tools:', tools);

        // Step 2: Get all projects (no filter)
        console.log('🔍 Step 2: Getting all projects...');
        const projects = await callMCPTool('jira_get_all_projects', {
            include_archived: false
        });
        console.log(`✅ Found ${projects.length} projects.`);

        const databaseService = new DatabaseService();
        const pageSize = 50;

        // Step 3: Loop through all projects
        for (const project of projects) {
            console.log(`\n🚀 Crawling project ${project.key} (${project.name})...`);
            let startAt = 0;

            while (true) {
                const issuesResponse = await callMCPTool('jira_get_project_issues', {
                    project_key: project.key,
                    limit: pageSize,
                    start_at: startAt
                });

                const issues = issuesResponse.issues || [];
                if (issues.length === 0) {
                    console.log(`   💤 No more issues for project ${project.key}.`);
                    break;
                }

                console.log(`   ⏳ Processing ${issues.length} issues (startAt=${startAt})...`);

                for (const issue of issues) {
                    try {
                        const detailedIssue = await callMCPTool('jira_get_issue', {
                            issue_key: issue.key,
                            fields: '*all',
                            expand: 'changelog'
                        });

                        console.log(`\n📦 Raw issue data from MCP for ${issue.key}:`);
                        console.log(JSON.stringify(detailedIssue, null, 2));

                        const mappedData = JiraDataMapper.extractAllEntities(detailedIssue);
                        console.log(`🧭 Mapped data for ${issue.key}:`);
                        console.log(JSON.stringify(mappedData, null, 2));

                        const connection = await databaseService.pool.getConnection();
                        try {
                            await connection.beginTransaction();

                            if (mappedData.users.length) {
                                await databaseService.saveUsers(mappedData.users, connection);
                            }
                            await databaseService.saveProjects([mappedData.project], connection);
                            await databaseService.saveIssues([mappedData.issue], connection);

                            console.log("💾 Ready to commit these to DB:");
                            console.log("   Users:", mappedData.users.map(u => u.display_name));
                            console.log("   Project:", mappedData.project);
                            console.log("   Issue:", mappedData.issue.key, mappedData.issue.summary);

                            await connection.commit();
                            console.log(`   ✅ Saved issue ${issue.key}`);
                        } catch (err) {
                            await connection.rollback();
                            console.error(`   ❌ Failed to process issue ${issue.key}:`, err);
                        } finally {
                            connection.release();
                        }
                    } catch (err) {
                        console.error(`   ❌ Failed to process issue ${issue.key}:`, err);
                    }

                    // Throttle để tránh rate limit MCP
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                startAt += issues.length;
                if (issues.length < pageSize) break; // hết trang
            }

            console.log(`🎉 Finished crawling project ${project.key} successfully!`);
        }

        console.log('\n🏁 All projects crawled successfully!');
    } catch (error) {
        console.error('❌ Crawling failed:', error);
    }
}

// Run crawler
crawlCompanyData();
