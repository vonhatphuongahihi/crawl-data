#!/usr/bin/env node

import { DatabaseService } from '../services/databaseService.js';
import { JiraDataMapper } from '../mappers/jiraDataMapper.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Global session management
let sessionId: string | null = null;

// Initialize MCP session with proper session handling
async function initializeMCPSession(): Promise<void> {
    console.log('🔌 Initializing MCP session...');

    const response = await fetch('http://localhost:9000/mcp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'MCP-Protocol-Version': '2024-11-05'
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'initialize',
            params: {
                protocolVersion: '2025-10-05',
                capabilities: {},
                clientInfo: {
                    name: 'manual-client',
                    version: '0.0.0'
                }
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to initialize session: HTTP ${response.status}`);
    }

    // Handle Server-Sent Events response
    const responseText = await response.text();
    console.log('📡 MCP Initialize Response:', responseText.substring(0, 300) + '...');

    // Extract session ID from Mcp-Session-Id header (per MCP spec)
    const mcpSessionIdHeader = response.headers.get('Mcp-Session-Id');

    if (mcpSessionIdHeader) {
        sessionId = mcpSessionIdHeader;
        console.log(`📋 Extracted session ID from Mcp-Session-Id header: ${sessionId}`);
    } else {
        // Generate a unique session ID as fallback
        sessionId = `mcp_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`📋 Generated fallback session ID: ${sessionId}`);
    }

    console.log(`✅ MCP session initialized: ${sessionId}`);

    // Send initialized notification
    await sendInitializedNotification();

    // Wait a bit to ensure initialization is complete
    console.log('⏳ Waiting for initialization to complete...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Ready to call tools');
}

// Send initialized notification after initialize
async function sendInitializedNotification(): Promise<void> {
    console.log('📤 Sending initialized notification...');

    const response = await fetch('http://localhost:9000/mcp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'MCP-Protocol-Version': '2025-10-05',
            'Mcp-Session-Id': sessionId || ''
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'notifications/initialized',
            params: {}
        })
    });

    if (response.ok) {
        console.log('✅ Initialized notification sent');
    } else {
        console.log('⚠️ Initialized notification failed, continuing anyway');
    }
}

// Simple function to call MCP tool directly
async function callMCPTool(toolName: string, params: any = {}): Promise<any> {
    console.log(`🔧 Calling MCP tool: ${toolName} with params:`, params);

    const response = await fetch('http://localhost:9000/mcp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'MCP-Protocol-Version': '2025-10-05',
            'Mcp-Session-Id': sessionId || '',
            'Authorization': `Token ${process.env['JIRA_API_TOKEN']}`
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: toolName === 'tools/list' ? 'tools/list' : 'tools/call',
            params: toolName === 'tools/list' ? {} : {
                name: toolName,
                arguments: params
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    // Handle Server-Sent Events response
    const responseText = await response.text();
    console.log(`📡 Tool ${toolName} response:`, responseText.substring(0, 200) + '...');

    // Try to parse as JSON first
    try {
        const data: any = JSON.parse(responseText);
        if (data.error) {
            throw new Error(`MCP Error: ${data.error.message}`);
        }

        // Handle MCP response format: {content: [{type: "text", text: "..."}]}
        if (data.result && data.result.content && Array.isArray(data.result.content)) {
            const textContent = data.result.content.find((item: any) => item.type === 'text');
            if (textContent && textContent.text) {
                try {
                    return JSON.parse(textContent.text);
                } catch (parseError) {
                    return textContent.text;
                }
            }
        }

        return data.result;
    } catch (parseError) {
        // If not JSON, try to extract JSON from SSE format
        const lines = responseText.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const jsonData = line.substring(6); // Remove 'data: '
                    const data: any = JSON.parse(jsonData);
                    if (data.error) {
                        throw new Error(`MCP Error: ${data.error.message}`);
                    }

                    // Handle MCP response format
                    if (data.result && data.result.content && Array.isArray(data.result.content)) {
                        const textContent = data.result.content.find((item: any) => item.type === 'text');
                        if (textContent && textContent.text) {
                            try {
                                return JSON.parse(textContent.text);
                            } catch (parseError) {
                                return textContent.text;
                            }
                        }
                    }

                    return data.result;
                } catch (jsonError) {
                    continue;
                }
            }
        }
        throw new Error(`Failed to parse MCP response: ${responseText}`);
    }
}

async function main() {
    console.log('🚀 Manual MCP Jira Crawler');
    console.log('📋 This will crawl data step by step using MCP tools directly\n');

    try {
        // Initialize session first
        await initializeMCPSession();

        console.log('🔍 Step 1: Listing available tools...');
        const tools = await callMCPTool('tools/list', {});
        console.log('📋 Available tools:', tools);

        console.log('🔍 Step 2: Getting all projects...');
        // Đảm bảo include_archived được truyền dưới dạng boolean false
        const projects = await callMCPTool('jira_get_all_projects', { include_archived: false });
        console.log(`✅ Found ${projects.length} projects:`);
        // ... phần còn lại của code của bạn

        // Step 2: Get issues for first project (limit to 5 issues for testing)
        if (projects.length > 0) {
            const firstProject = projects[0];
            console.log(`\n🔍 Step 2: Getting issues for project ${firstProject.key}...`);

            const issues = await callMCPTool('jira_get_project_issues', {
                project_key: firstProject.key,
                limit: 5,
                start_at: 0
            });

            console.log(`✅ Found ${issues.issues?.length || 0} issues in ${firstProject.key}`);

            // Step 3: Get detailed info for each issue
            if (issues.issues && issues.issues.length > 0) {
                console.log(`\n🔍 Step 3: Getting detailed info for each issue...`);

                for (const issue of issues.issues.slice(0, 2)) { // Limit to 2 issues for testing
                    console.log(`   📋 Processing issue: ${issue.key}`);

                    try {
                        const detailedIssue = await callMCPTool('jira_get_issue', {
                            issue_key: issue.key,
                            fields: '*all',
                            expand: 'changelog'
                        });

                        console.log(`   ✅ Got details for ${issue.key}: ${detailedIssue.fields?.summary || 'No summary'}`);

                        // Step 4: Map and save to database
                        console.log(`   💾 Mapping and saving to database...`);

                        const databaseService = new DatabaseService();

                        // Map the data
                        const mappedData = JiraDataMapper.extractAllEntities(detailedIssue);

                        // Save to database
                        if (mappedData.users.length > 0 && mappedData.users[0]) {
                            await databaseService.saveUsers([mappedData.users[0]]); // Save first user as example
                        }
                        await databaseService.saveProjects([mappedData.project]);
                        await databaseService.saveIssues([mappedData.issue]);

                        console.log(`   ✅ Saved ${issue.key} to database`);

                    } catch (error) {
                        console.error(`   ❌ Failed to process ${issue.key}:`, error);
                    }
                }
            }
        }

        console.log('\n🎉 Manual crawling completed!');

    } catch (error) {
        console.error('❌ Manual crawling failed:', error);
    }
}

// Run if called directly
main().catch(console.error);

export { main as runManualCrawler };
