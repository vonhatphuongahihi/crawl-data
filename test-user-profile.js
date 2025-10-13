import { MCPJiraService } from './dist/services/mcpJiraService.js';
import databaseService from './dist/services/databaseService.js';

async function testUserProfile() {
    const jiraService = new MCPJiraService();

    try {
        await jiraService.connect();
        console.log('✅ Connected to MCP Jira service');

        // Test with username search (the working method)
        const username = 'NVN10356';
        console.log(`\n🔍 Testing searchUsers with username: ${username}`);

        const searchResults = await jiraService.searchUsers(username);
        console.log('📋 Search Users Response:');
        console.log(JSON.stringify(searchResults, null, 2));

        // Test with email
        const testEmail = 'ha.nhunguyen@navercorp.com';
        console.log(`\n🔍 Testing getUserProfile with email: ${testEmail}`);

        const userProfile = await jiraService.getUserProfile(testEmail);
        console.log('📋 User Profile Response:');
        console.log(JSON.stringify(userProfile, null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await jiraService.disconnect();
    }
}

testUserProfile();
