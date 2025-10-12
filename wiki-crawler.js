import MCPWikiService from './dist/services/mcpWikiService.js';
import WikiDatabaseService from './dist/services/wikiDatabaseService.js';
import { WikiDataMapper } from './dist/mappers/wikiDataMapper.js';

let mcpService;

// Initialize MCP session
async function initializeMCPSession() {
    mcpService = new MCPWikiService('', '', '');
    await mcpService.connect();
    console.log('🔌 MCP Wiki session initialized');
}

// Call MCP tool
async function callMCPTool(toolName, params) {
    switch (toolName) {
        case 'confluence_search':
            return await mcpService.searchConfluence(params.query, params.limit, params.spaces_filter);
        case 'confluence_get_page':
            return await mcpService.getPage(params.page_id, params.include_metadata, params.convert_to_markdown);
        case 'confluence_get_page_children':
            return await mcpService.getPageChildren(params.parent_id, params.limit, params.include_content, params.convert_to_markdown);
        case 'confluence_get_comments':
            return await mcpService.getPageComments(params.page_id);
        case 'confluence_get_labels':
            return await mcpService.getPageLabels(params.page_id);
        case 'confluence_search_user':
            return await mcpService.searchUsers(params.query, params.limit);
        case 'confluence_get_all_spaces':
            return await mcpService.getAllSpaces(params.limit);
        case 'confluence_get_all_pages':
            return await mcpService.getAllPages(params.batchSize);
        case 'confluence_get_all_pages_from_space':
            return await mcpService.getAllPagesFromSpace(params.spaceKey, params.batchSize);
        default:
            throw new Error(`Unknown tool: ${toolName}`);
    }
}

// Main crawler function
async function crawlWikiData() {
    try {
        // Step 1: Initialize MCP session
        await initializeMCPSession();

        console.log('🔍 Step 1: Testing MCP Wiki tools...');

        // Test basic search
        const testSearch = await callMCPTool('confluence_search', {
            query: 'type = page',
            limit: 5
        });
        console.log('📋 Test search result:', testSearch);

        const databaseService = new WikiDatabaseService();

        // Step 2: Get all spaces (use simple search instead of getAllSpaces)
        console.log('🔍 Step 2: Getting all spaces...');

        // Use simple search to get spaces instead of getAllSpaces (which has pagination issues)
        const searchResult = await callMCPTool('confluence_search', {
            query: 'type = page',
            limit: 50  // Smaller limit to avoid MCP errors
        });

        // Extract unique spaces from search results
        const spaceMap = new Map();
        if (searchResult.results) {
            searchResult.results.forEach(result => {
                if (result.space) {  // Fix: space is at result level, not result.content
                    const space = result.space;
                    spaceMap.set(space.key, {
                        id: 0, // Default ID
                        key: space.key,
                        name: space.name,
                        type: 'space',
                        status: 'current'
                    });
                }
            });
        }

        const spaces = Array.from(spaceMap.values());
        console.log(`✅ Found ${spaces.length} spaces.`);

        // Log space structure để xem data format
        if (spaces.length > 0) {
            console.log('\n📋 Space structure example (first space):');
            console.log(JSON.stringify(spaces[0], null, 2));

            console.log('\n📋 All space keys:');
            spaces.forEach((space, index) => {
                console.log(`   ${index + 1}. ${space.key} - ${space.name}`);
            });
        }

        // Use all spaces found (no filtering needed)
        const filteredSpaces = spaces; // Use all spaces found by MCP
        console.log(`📊 Processing all ${filteredSpaces.length} spaces found`);

        // Step 3: Save all filtered spaces first
        if (filteredSpaces.length > 0) {
            console.log('\n💾 Saving all filtered spaces to database...');
            const connection = await databaseService.pool.getConnection();
            try {
                // Set timeout for this connection
                await connection.execute('SET SESSION wait_timeout = 28800'); // 8 hours
                await connection.execute('SET SESSION interactive_timeout = 28800'); // 8 hours

                await connection.beginTransaction();

                const mappedSpaces = filteredSpaces.map(space => WikiDataMapper.mapSpace(space));
                await databaseService.saveSpaces(mappedSpaces);

                await connection.commit();
                console.log(`✅ Saved ${filteredSpaces.length} spaces to database`);
            } catch (error) {
                console.error('❌ Failed to save spaces:', error);
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

        // Step 4: Loop through all filtered spaces to crawl pages
        for (const space of filteredSpaces) {
            console.log(`\n🚀 Crawling space ${space.key} (${space.name})...`);

            try {
                // Get pages from this space using search (limited for testing)
                const cqlQuery = `space = "${space.key}" AND type = page`;
                const searchResult = await callMCPTool('confluence_search', {
                    query: cqlQuery,
                    limit: 5,  // Limit to 5 pages per space for testing
                    spaces_filter: space.key
                });

                const pages = searchResult.results || [];
                console.log(`   📄 Found ${pages.length} pages in space ${space.key}`);

                // Debug: Log first page structure
                if (pages.length > 0) {
                    console.log(`   📋 First page structure:`, JSON.stringify(pages[0], null, 2));
                }

                if (pages.length === 0) {
                    console.log(`   💤 No pages found for space ${space.key}.`);
                    continue;
                }

                // Process each page: get detailed info, labels, comments, etc.
                for (const pageResult of pages) {
                    const wikiPage = pageResult; // Fix: pageResult has id, title, content, etc.

                    try {
                        console.log(`\n📦 Processing page: ${wikiPage.title} (${wikiPage.id})`);

                        // Get detailed page info (MCP tool doesn't support expand parameter)
                        const detailedPage = await callMCPTool('confluence_get_page', {
                            page_id: wikiPage.id,
                            include_metadata: true,
                            convert_to_markdown: false
                            // Note: MCP tool doesn't support expand parameter, only returns metadata
                        });

                        console.log(`📦 Raw page data from MCP for ${wikiPage.id}:`);
                        console.log(JSON.stringify(detailedPage, null, 2));

                        // Debug: Check if expand worked
                        console.log(`🔍 EXPAND DEBUG for ${wikiPage.id}:`);
                        console.log(`   - detailedPage.version:`, detailedPage.version);
                        console.log(`   - detailedPage.history:`, detailedPage.history);
                        console.log(`   - detailedPage.space:`, detailedPage.space);
                        if (detailedPage.version) {
                            console.log(`   - version.by:`, detailedPage.version.by);
                            console.log(`   - version.number:`, detailedPage.version.number);
                            console.log(`   - version.when:`, detailedPage.version.when);
                        }
                        if (detailedPage.history) {
                            console.log(`   - history.createdBy:`, detailedPage.history.createdBy);
                            console.log(`   - history.createdDate:`, detailedPage.history.createdDate);
                        }

                        // Debug: Check detailedPage structure first
                        console.log(`🔍 detailedPage structure for ${wikiPage.id}:`);
                        console.log(`   - Has metadata:`, !!detailedPage.metadata);
                        console.log(`   - metadata.id:`, detailedPage.metadata?.id);
                        console.log(`   - metadata.title:`, detailedPage.metadata?.title);
                        console.log(`   - metadata.url:`, detailedPage.metadata?.url);
                        console.log(`   - metadata.space:`, detailedPage.metadata?.space);
                        console.log(`   - Full metadata keys:`, Object.keys(detailedPage.metadata || {}));
                        console.log(`   - Has history/version info:`, !!detailedPage.metadata?.history);
                        console.log(`   - Has author info:`, !!detailedPage.metadata?.author);
                        console.log(`   - Has version info:`, !!detailedPage.metadata?.version);
                        console.log(`   - Has creator info:`, !!detailedPage.metadata?.creator);
                        console.log(`   - Has history info:`, !!detailedPage.history);
                        console.log(`   - Has version.by info:`, !!detailedPage.version?.by);
                        console.log(`   - Has history.createdBy info:`, !!detailedPage.history?.createdBy);
                        console.log(`   - Full detailedPage keys:`, Object.keys(detailedPage || {}));

                        // Transform MCP response to expected format for mapper
                        // MCP tool now returns root-level data, not metadata wrapper
                        const transformedPage = {
                            id: detailedPage.id,
                            title: detailedPage.title,
                            url: detailedPage.url,
                            type: detailedPage.type,
                            status: detailedPage.status || 'current',
                            space: detailedPage.space || { key: 'UNKNOWN', name: 'Unknown Space' },
                            version: {
                                number: detailedPage.version?.number,
                                by: {
                                    // Now we have real user info from MCP tool!
                                    displayName: detailedPage.version?.by?.displayName || 'Unknown User',
                                    accountId: detailedPage.version?.by?.accountId || null,
                                    email: detailedPage.version?.by?.email || null,
                                    profilePicture: detailedPage.version?.by?.profilePicture || null,
                                    isActive: detailedPage.version?.by?.isActive !== false,
                                    locale: detailedPage.version?.by?.locale || 'en'
                                },
                                when: detailedPage.version?.when || detailedPage.created || detailedPage.updated || null
                            },
                            _links: {
                                webui: detailedPage.url
                            }
                        };

                        console.log(`🔧 Transformed page for ${wikiPage.id}:`);
                        console.log(`   - id:`, transformedPage.id);
                        console.log(`   - title:`, transformedPage.title);
                        console.log(`   - url:`, transformedPage.url);
                        console.log(`   - version.by.displayName:`, transformedPage.version?.by?.displayName);
                        console.log(`   - version.by.userKey:`, transformedPage.version?.by?.userKey);
                        console.log(`   - version.by.email:`, transformedPage.version?.by?.email);

                        // Extract all entities from the page
                        const mappedData = WikiDataMapper.extractAllEntities(transformedPage);

                        // Find created_by_id from users
                        let createdById = undefined;
                        if (mappedData.users && mappedData.users.length > 0) {
                            // Use the first user (creator) as created_by_id
                            const creator = mappedData.users[0];
                            // We'll need to save users first to get their database IDs
                            // For now, we'll handle this in the save order
                        }

                        console.log(`🧭 Mapped data for ${wikiPage.id}:`);
                        console.log(`   - page:`, mappedData.page ? 'defined' : 'undefined');
                        console.log(`   - users:`, mappedData.users?.length || 0);
                        console.log(`   - space:`, mappedData.space ? 'defined' : 'undefined');

                        // Debug: Check mappedData.page content
                        if (mappedData.page) {
                            console.log(`   - page.id:`, mappedData.page.page_id);
                            console.log(`   - page.title:`, mappedData.page.title);
                        } else {
                            console.log(`   ❌ mappedData.page is undefined!`);
                        }

                        // Get additional data if needed
                        let labels = [];
                        let comments = [];

                        try {
                            labels = await callMCPTool('confluence_get_labels', {
                                page_id: wikiPage.id
                            });
                            console.log(`🏷️ Found ${labels.length} labels for page ${wikiPage.id}`);
                        } catch (labelError) {
                            console.warn(`⚠️ Could not get labels for page ${wikiPage.id}:`, labelError);
                        }

                        try {
                            comments = await callMCPTool('confluence_get_comments', {
                                page_id: wikiPage.id
                            });
                            console.log(`💬 Found ${comments.length} comments for page ${wikiPage.id}`);
                        } catch (commentError) {
                            console.warn(`⚠️ Could not get comments for page ${wikiPage.id}:`, commentError);
                        }

                        // Map additional data
                        const mappedLabels = WikiDataMapper.mapMultipleLabels(wikiPage.id, labels);
                        const mappedComments = WikiDataMapper.mapMultipleComments(comments, wikiPage.id);

                        // Combine all data
                        const allEntities = {
                            users: mappedData.users,
                            spaces: mappedData.space ? [mappedData.space] : [],
                            pages: mappedData.page ? [mappedData.page] : [], // Fix: check if page exists
                            views: mappedData.views,
                            contributors: mappedData.contributors,
                            visitHistories: [],
                            labels: mappedLabels,
                            comments: mappedComments
                        };

                        console.log("💾 Ready to commit these to DB:");
                        console.log("   Users:", allEntities.users.map(u => u.display_name));
                        console.log("   Spaces:", allEntities.spaces.map(s => s.space_name));
                        console.log("   Pages:", allEntities.pages.map(p => p.title));
                        console.log("   Labels:", allEntities.labels.length);
                        console.log("   Comments:", allEntities.comments.length);

                        const connection = await databaseService.pool.getConnection();
                        try {
                            // Set timeout for this connection
                            await connection.execute('SET SESSION wait_timeout = 28800'); // 8 hours
                            await connection.execute('SET SESSION interactive_timeout = 28800'); // 8 hours

                            await connection.beginTransaction();

                            // Save in dependency order
                            await databaseService.saveUsers(allEntities.users);
                            await databaseService.saveSpaces(allEntities.spaces);

                            // Get user map to link created_by_id
                            const userMap = await databaseService.getUserIdsByUserKeys(
                                allEntities.users.map(u => u.user_key)
                            );

                            // Update pages with created_by_id
                            const validPages = allEntities.pages.filter(p => p !== undefined);
                            if (validPages.length > 0) {
                                // Update each page with created_by_id
                                for (const page of validPages) {
                                    if (mappedData.users && mappedData.users.length > 0) {
                                        const creator = mappedData.users[0];
                                        const createdById = userMap.get(creator.user_key);
                                        console.log(`🔗 Linking page ${page.page_id} to user:`, {
                                            userKey: creator.user_key,
                                            userId: creator.user_id,
                                            createdById: createdById,
                                            userMapSize: userMap.size
                                        });
                                        page.created_by_id = createdById;
                                    }
                                }
                                await databaseService.savePages(validPages);
                            }

                            await databaseService.saveViews(allEntities.views);
                            await databaseService.saveContributors(allEntities.contributors);
                            await databaseService.saveVisitHistories(allEntities.visitHistories);
                            await databaseService.saveLabels(allEntities.labels);
                            await databaseService.saveComments(allEntities.comments);

                            await connection.commit();
                            console.log(`   ✅ Saved page ${wikiPage.id} successfully`);
                        } catch (err) {
                            console.error(`   ❌ Failed to process page ${wikiPage.id}:`, err);
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
                        console.error(`   ❌ Failed to process page ${wikiPage.id}:`, err);
                    }

                    // Throttle để tránh rate limit MCP
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                console.log(`🎉 Finished crawling space ${space.key} successfully!`);
            } catch (spaceError) {
                console.error(`❌ Failed to crawl space ${space.key}:`, spaceError);
            }
        }

        console.log('\n🏁 All spaces crawled successfully!');

        // Save crawl history
        await databaseService.saveCrawlHistory(
            new Date().toISOString(),
            filteredSpaces.length,
            filteredSpaces.length,
            0,
            0
        );

    } catch (error) {
        console.error('❌ Wiki crawling failed:', error);
    } finally {
        if (mcpService) {
            await mcpService.disconnect();
        }
    }
}

// Run crawler
crawlWikiData();
