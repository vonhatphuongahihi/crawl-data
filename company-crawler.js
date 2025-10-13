import MCPJiraService from './dist/services/mcpJiraService.js';
import DatabaseService from './dist/services/databaseService.js';
import JiraDataMapper from './dist/mappers/jiraDataMapper.js';

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
        case 'jira_get_issue_comments':
            return await mcpService.getIssueComments(params.issue_key, params.limit);
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

        // Log project structure để xem data format
        if (projects.length > 0) {
            console.log('\n📋 Project structure example (first project):');
            console.log(JSON.stringify(projects[0], null, 2));

            console.log('\n📋 All project keys:');
            projects.forEach((project, index) => {
                console.log(`   ${index + 1}. ${project.key || project.id} - ${project.name || 'No name'}`);
            });

            // Log một vài project để xem structure
            console.log('\n📋 Sample projects structure:');
            projects.slice(0, 3).forEach((project, index) => {
                console.log(`\n--- Project ${index + 1} ---`);
                console.log('Keys:', Object.keys(project));
                console.log('Full data:', JSON.stringify(project, null, 2));
            });
        }

        const databaseService = new DatabaseService();
        const pageSize = 50;

        // Define projects to exclude by key
        const excludedProjectKeys = [
            'TESTASKDBB', 'NFREPORT', 'ADVANCED_A', 'ASKSEG', 'BPH', 'CITS',
            'CLIP_SUPPORT', 'VULNERABILITY', 'DATA_REQUEST', 'DATA_PRODUCT',
            'FACESIGNREQ', 'FASTIDQNA', 'GSS_REQUEST', 'NAVER2024',
            'N3R_PUBLIC_REQUEST', 'N3R_COUNTER', 'NBILLY_SUPPORT',
            'NELOISSUETEST', 'NGRINDER', 'NPAYGOODS', 'PCGAME', 'KERBEROS',
            'SHARED', 'SSPMO', 'VITESS_SUPPORT', 'YESSL_INQUIRY', 'DATAREVIEW',
            'NAVERAPPDATA', 'NPAYOFFLINEDESIGN', 'NPAYONLINEDESIGN',
            'NPAYOFFLINEPAYMENT', 'NAMCSUPPORT', 'CERTAPPMGMT', 'NCLOUD_PORTAL',
            'BOARD_SAMPLE', 'SMARTEDITORSUPPORT', 'MEMBERREQ'
        ];

        // Filter out excluded projects
        const filteredProjects = projects.filter(project => {
            const projectKey = project.key || '';
            const projectName = project.name || '';

            // Check if project is in excluded list
            const isExcluded = excludedProjectKeys.includes(projectKey);
            if (isExcluded) {
                console.log(`🚫 Skipping excluded project: ${projectKey} - ${projectName}`);
                return false;
            }

            return true;
        });

        console.log(`📊 After filtering: ${filteredProjects.length} projects (removed ${projects.length - filteredProjects.length} projects)`);

        // Step 3: Save all filtered projects first
        if (filteredProjects.length > 0) {
            console.log('\n💾 Saving all filtered projects to database...');
            const connection = await databaseService.pool.getConnection();
            try {
                // Set timeout for this connection
                await connection.execute('SET SESSION wait_timeout = 28800'); // 8 hours
                await connection.execute('SET SESSION interactive_timeout = 28800'); // 8 hours

                await connection.beginTransaction();

                for (const project of filteredProjects) {
                    const mappedProject = JiraDataMapper.mapProject(project);
                    await databaseService.saveProjects([mappedProject], connection);
                }

                await connection.commit();
                console.log(`✅ Saved ${filteredProjects.length} projects to database`);
            } catch (error) {
                console.error('❌ Failed to save projects:', error);
                try {
                    await connection.rollback();
                } catch (rollbackErr) {
                    console.error('❌ Rollback failed:', rollbackErr);
                }
                throw error;
            } finally {
                try {
                    connection.release();
                } catch (releaseErr) {
                    console.error('❌ Connection release failed:', releaseErr);
                }
            }
        }

        // Step 4: Loop through all filtered projects to crawl issues
        for (const project of filteredProjects) {
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
                            expand: 'changelog' // Only expand changelog
                        });

                        console.log(`\n📦 Raw issue data from MCP for ${issue.key}:`);
                        console.log(JSON.stringify(detailedIssue, null, 2));

                        // Get comments separately using dedicated tool
                        let comments = [];
                        try {
                            console.log(`💬 Getting comments for ${issue.key}...`);
                            const commentsResponse = await callMCPTool('jira_get_issue_comments', {
                                issue_key: issue.key,
                                limit: 1000 // Get all comments
                            });

                            if (Array.isArray(commentsResponse)) {
                                comments = commentsResponse;
                                console.log(`💬 Found ${comments.length} comments for ${issue.key}`);
                            } else {
                                console.log(`💬 No comments found for ${issue.key}`);
                            }
                        } catch (commentError) {
                            console.log(`💬 Error getting comments for ${issue.key}:`, commentError.message);
                        }

                        const mappedData = JiraDataMapper.extractAllEntities(detailedIssue, comments);

                        // Fix project_id in issue to use real project ID from database
                        mappedData.issue.project_id = project.id;
                        mappedData.issue.project_key = project.key;
                        mappedData.issue.project_name = project.name;

                        console.log(`🧭 Mapped data for ${issue.key}:`);
                        console.log(JSON.stringify(mappedData, null, 2));

                        const connection = await databaseService.pool.getConnection();
                        try {
                            // Set timeout for this connection
                            await connection.execute('SET SESSION wait_timeout = 28800'); // 8 hours
                            await connection.execute('SET SESSION interactive_timeout = 28800'); // 8 hours

                            await connection.beginTransaction();

                            if (mappedData.users.length) {
                                await databaseService.saveUsers(mappedData.users, connection);
                            }
                            // Don't save project here - already saved in Step 3 with full info
                            // await databaseService.saveProjects([mappedData.project], connection);

                            // Status is now handled directly in mapIssue as status_name

                            await databaseService.saveIssues([mappedData.issue], connection);

                            // Save changelogs (status changes)
                            if (mappedData.changelogs && mappedData.changelogs.length > 0) {
                                await databaseService.saveChangelogs(mappedData.changelogs, connection);
                                console.log(`   📝 Saved ${mappedData.changelogs.length} status change changelogs`);
                            }

                            // Save comments
                            if (mappedData.comments && mappedData.comments.length > 0) {
                                await databaseService.saveComments(mappedData.comments, connection);
                                console.log(`   💬 Saved ${mappedData.comments.length} comments`);
                            }

                            console.log("💾 Ready to commit these to DB:");
                            console.log("   Users:", mappedData.users.map(u => u.display_name));
                            console.log("   Project:", mappedData.project);
                            console.log("   Issue:", mappedData.issue.key, mappedData.issue.summary);
                            console.log("   Status:", mappedData.issue.status_name);
                            console.log("   Resolved Date:", mappedData.issue.resolved_date);
                            console.log("   Changelogs:", mappedData.changelogs?.length || 0);
                            console.log("   Comments:", mappedData.comments?.length || 0);

                            await connection.commit();
                            console.log(`   ✅ Saved issue ${issue.key}`);
                        } catch (err) {
                            console.error(`   ❌ Failed to process issue ${issue.key}:`, err);
                            try {
                                await connection.rollback();
                            } catch (rollbackErr) {
                                console.error(`   ❌ Rollback failed:`, rollbackErr);
                            }
                        } finally {
                            try {
                                connection.release();
                            } catch (releaseErr) {
                                console.error(`   ❌ Connection release failed:`, releaseErr);
                            }
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
