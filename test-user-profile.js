import { MCPJiraService } from './dist/services/mcpJiraService.js';
import databaseService from './dist/services/databaseService.js';

async function testUserProfile() {
    const jiraService = new MCPJiraService();
    
    try {
        await jiraService.connect();
        console.log('✅ Connected to MCP Jira service');

        // Test with email
        const testEmail = 'ha.nhunguyen@navercorp.com';
        console.log(`\n🔍 Testing getUserProfile with email: ${testEmail}`);
        
        const userProfile = await jiraService.getUserProfile(testEmail);
        console.log('📋 User Profile Response:');
        console.log(JSON.stringify(userProfile, null, 2));

        // Test with ownerId from avatar_url
        const ownerId = 'JIRAUSER230164';
        console.log(`\n🔍 Testing getUserProfile with ownerId: ${ownerId}`);
        
        const userProfile2 = await jiraService.getUserProfile(ownerId);
        console.log('📋 User Profile Response 2:');
        console.log(JSON.stringify(userProfile2, null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await jiraService.disconnect();
    }
}

testUserProfile();
