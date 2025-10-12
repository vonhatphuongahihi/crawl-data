import MCPWikiService from './dist/services/mcpWikiService.js';

async function testGetAllPages() {
    try {
        console.log('🚀 Testing get ALL pages...');

        const mcpService = new MCPWikiService('', '', '');
        await mcpService.connect();
        console.log('🔌 MCP connected');

        // Test 1: Get all pages from all spaces
        console.log('\n📄 Test 1: Getting ALL pages from ALL spaces...');
        const allPages = await mcpService.getAllPages(50); // Batch size 50
        console.log(`✅ Found ${allPages.length} total pages from all spaces`);

        if (allPages.length > 0) {
            console.log('\n📋 Sample pages:');
            allPages.slice(0, 3).forEach((page, index) => {
                console.log(`   ${index + 1}. ${page.title} (${page.id}) - Space: ${page.space?.key}`);
            });
        }

        // Test 2: Get all pages from specific space
        console.log('\n📄 Test 2: Getting ALL pages from NVN space...');
        const nvnPages = await mcpService.getAllPagesFromSpace('NVN', 50);
        console.log(`✅ Found ${nvnPages.length} pages in NVN space`);

        // Test 3: Get all spaces with pagination
        console.log('\n🌐 Test 3: Getting ALL spaces with pagination...');
        const allSpaces = await mcpService.getAllSpaces(50);
        console.log(`✅ Found ${allSpaces.length} unique spaces`);

        console.log('\n🏁 All tests completed successfully!');

        await mcpService.disconnect();
        console.log('🔌 MCP disconnected');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testGetAllPages();
