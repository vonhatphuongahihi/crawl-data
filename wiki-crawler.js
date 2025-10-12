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

        // Extract unique spaces from search results (only English spaces)
        const spaceMap = new Map();
        if (searchResult.results) {
            searchResult.results.forEach(result => {
                if (result.space) {  // Fix: space is at result level, not result.content
                    const space = result.space;

                    // Filter out Korean spaces - only keep English spaces
                    const hasKorean = /[가-힣]/.test(space.name);
                    if (hasKorean) {
                        console.log(`🚫 Skipping Korean space: ${space.key} - ${space.name}`);
                        return;
                    }

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
        console.log(`✅ Found ${spaces.length} English-only spaces (Korean spaces filtered out).`);

        // Log space structure để xem data format
        if (spaces.length > 0) {
            console.log('\n📋 Space structure example (first space):');
            console.log(JSON.stringify(spaces[0], null, 2));

            console.log('\n📋 All English space keys:');
            spaces.forEach((space, index) => {
                console.log(`   ${index + 1}. ${space.key} - ${space.name}`);
            });
        }

        // Use only English spaces (Korean spaces already filtered out)
        const filteredSpaces = spaces; // Already filtered for English-only
        console.log(`📊 Processing ${filteredSpaces.length} English spaces only`);

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

                        // Get page creator using NEW MCP tool!
                        let pageCreator = null;
                        try {
                            pageCreator = await mcpService.getPageCreator(wikiPage.id);
                            console.log(`👤 Page creator from NEW MCP tool:`, JSON.stringify(pageCreator, null, 2));
                        } catch (creatorError) {
                            console.warn(`⚠️ Could not get page creator for ${wikiPage.id}:`, creatorError);
                        }

                        // Get page views count using NEW MCP tool
                        let pageViews = null;
                        try {
                            pageViews = await mcpService.getPageViewsCount(wikiPage.id);
                            console.log(`👀 Page views from NEW MCP tool:`, JSON.stringify(pageViews, null, 2));
                        } catch (viewsError) {
                            console.warn(`⚠️ Could not get page views for ${wikiPage.id}:`, viewsError);
                        }

                        // Get page versions for contributors using NEW MCP tool
                        let pageVersions = null;
                        try {
                            pageVersions = await mcpService.getPageVersionsForContributors(wikiPage.id);
                            console.log(`📚 Page versions from NEW MCP tool:`, JSON.stringify(pageVersions, null, 2));
                        } catch (versionsError) {
                            console.warn(`⚠️ Could not get page versions for ${wikiPage.id}:`, versionsError);
                        }

                        // Get visit history using NEW MCP tool
                        let visitHistory = null;
                        try {
                            visitHistory = await mcpService.getVisitHistory(wikiPage.id);
                            console.log(`📊 Visit history from NEW MCP tool:`, JSON.stringify(visitHistory, null, 2));
                        } catch (historyError) {
                            console.warn(`⚠️ Could not get visit history for ${wikiPage.id}:`, historyError);
                        }

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
                                    // Use creator info from NEW MCP tool if available, otherwise fallback to version.by
                                    displayName: pageCreator?.displayName || detailedPage.version?.by?.displayName || 'Unknown User',
                                    accountId: pageCreator?.accountId || detailedPage.version?.by?.accountId || null,
                                    userKey: pageCreator?.userKey || detailedPage.version?.by?.userKey || null,
                                    email: pageCreator?.email || detailedPage.version?.by?.email || null,
                                    profilePicture: pageCreator?.profilePicture || detailedPage.version?.by?.profilePicture || null,
                                    isActive: pageCreator?.isActive !== false && detailedPage.version?.by?.isActive !== false,
                                    locale: pageCreator?.locale || detailedPage.version?.by?.locale || 'en'
                                },
                                when: detailedPage.version?.when || detailedPage.created || detailedPage.updated || null
                            },
                            _links: {
                                webui: detailedPage.url
                            },
                            // Add views data from MCP tool
                            views: pageViews?.total_views || 0
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

                        // Map additional data from MCP tools
                        let mappedViews = [];
                        let mappedContributors = [];
                        let mappedVisitHistories = [];
                        let visitHistoryUsers = []; // Users created from visit history

                        // Map views data if available - follow api.ts logic
                        if (pageViews && pageViews.total_views > 0) {
                            try {
                                // Step 1: Get visit history by user name (like getVisitHistoryByUserName in api.ts)
                                const visitHistoryByUserName = await mcpService.getVisitHistory(wikiPage.id);
                                console.log(`📊 Visit history by user name for ${wikiPage.id}:`, JSON.stringify(visitHistoryByUserName, null, 2));

                                if (visitHistoryByUserName && typeof visitHistoryByUserName === 'object') {
                                    const userNames = Object.keys(visitHistoryByUserName);
                                    console.log(`👥 Found ${userNames.length} users with visit history:`, userNames);

                                    // Step 2: Create views for each user (like storeWikiViews in api.ts)
                                    const viewPromises = userNames.map(async (username) => {
                                        const userVisits = visitHistoryByUserName[username];
                                        if (!userVisits || !Array.isArray(userVisits)) return null;

                                        // Get user info (try to find existing user or create new one)
                                        let userKey = username; // Default fallback
                                        let displayName = username;

                                        // Try to find user in existing users
                                        const existingUser = mappedData.users.find(u =>
                                            u.user_key === username ||
                                            u.user_id === username ||
                                            u.display_name === username
                                        );

                                        if (existingUser) {
                                            userKey = existingUser.user_key;
                                            displayName = existingUser.display_name;
                                        } else {
                                            // Create new user from visit history
                                            const newUser = {
                                                user_id: username,
                                                user_key: username,
                                                display_name: username,
                                                avatar_url: null,
                                                roles: '',
                                                english_name: null,
                                                is_resigned: false
                                            };
                                            visitHistoryUsers.push(newUser);
                                        }

                                        // Calculate total views for this user
                                        const totalViews = userVisits.length;
                                        const lastVisitDate = userVisits.length > 0 ?
                                            new Date(userVisits[userVisits.length - 1].visitDate || userVisits[userVisits.length - 1].date || new Date()) :
                                            new Date();

                                        // Create view record
                                        const viewRecord = {
                                            page_id: wikiPage.id,
                                            user_key: userKey,
                                            total: totalViews,
                                            last_view: lastVisitDate
                                        };

                                        // Create visit history records for this user
                                        const userVisitHistories = userVisits.map((visit, index) => ({
                                            views_id: 0, // Will be linked after views are saved
                                            visit_date: visit.visitDate || visit.date || new Date().toISOString(),
                                            unix_date: visit.unixDate || new Date(visit.visitDate || visit.date || new Date()).getTime().toString(),
                                            visit_id: visit.visitId || (Date.now() + index) // Generate unique ID
                                        }));

                                        return { viewRecord, userVisitHistories };
                                    });

                                    // Wait for all view records to be processed
                                    const viewResults = await Promise.all(viewPromises);

                                    // Extract views and visit histories
                                    mappedViews = viewResults
                                        .filter(result => result !== null)
                                        .map(result => result.viewRecord);

                                    mappedVisitHistories = viewResults
                                        .filter(result => result !== null)
                                        .flatMap(result => result.userVisitHistories);

                                    console.log(`✅ Created ${mappedViews.length} view records and ${mappedVisitHistories.length} visit history records`);

                                } else {
                                    console.log(`⚠️ No visit history data found for ${wikiPage.id}, using fallback`);
                                    // Fallback: create single view record with total views
                                    let viewUserKey = 'system';
                                    if (mappedData.users && mappedData.users.length > 0) {
                                        viewUserKey = mappedData.users[0].user_key;
                                    } else if (pageCreator?.userKey) {
                                        viewUserKey = pageCreator.userKey;
                                    } else if (pageCreator?.username) {
                                        viewUserKey = pageCreator.username;
                                    }

                                    mappedViews = [{
                                        page_id: wikiPage.id,
                                        user_key: viewUserKey,
                                        total: pageViews.total_views,
                                        last_view: new Date()
                                    }];
                                }

                            } catch (visitError) {
                                console.warn(`⚠️ Could not get visit history for ${wikiPage.id}:`, visitError);

                                // Fallback: create single view record with total views
                                let viewUserKey = 'system';
                                if (mappedData.users && mappedData.users.length > 0) {
                                    viewUserKey = mappedData.users[0].user_key;
                                } else if (pageCreator?.userKey) {
                                    viewUserKey = pageCreator.userKey;
                                } else if (pageCreator?.username) {
                                    viewUserKey = pageCreator.username;
                                }

                                mappedViews = [{
                                    page_id: wikiPage.id,
                                    user_key: viewUserKey,
                                    total: pageViews.total_views,
                                    last_view: new Date()
                                }];
                            }
                        }

                        // Map contributors from page versions if available
                        if (pageVersions) {
                            const contributors = [];
                            // Add creator
                            if (pageVersions.createdBy) {
                                contributors.push({
                                    create_by_user_key: pageVersions.createdBy.userKey || pageVersions.createdBy.username,
                                    confluence_page_id: wikiPage.id,
                                    version: 1,
                                    when_modified: new Date(pageVersions.createdDate)
                                });
                            }
                            // Add last updater
                            if (pageVersions.lastUpdated) {
                                contributors.push({
                                    create_by_user_key: pageVersions.lastUpdated.by.userKey || pageVersions.lastUpdated.by.username,
                                    confluence_page_id: wikiPage.id,
                                    version: pageVersions.lastUpdated.number,
                                    when_modified: new Date(pageVersions.lastUpdated.when)
                                });
                            }
                            mappedContributors = contributors;
                        }

                        // Note: Visit history mapping is now handled above in the views section

                        // Note: visitHistoryUsers are now created in the views mapping section above

                        // Combine all data
                        const allEntities = {
                            users: [...mappedData.users, ...visitHistoryUsers], // Include visit history users
                            spaces: mappedData.space ? [mappedData.space] : [],
                            pages: mappedData.page ? [mappedData.page] : [], // Fix: check if page exists
                            views: mappedViews,
                            contributors: mappedContributors,
                            visitHistories: mappedVisitHistories,
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

                            // Get user map to link created_by_id (AFTER saving users)
                            const userMap = await databaseService.getUserIdsByUserKeys(
                                allEntities.users.map(u => u.user_key)
                            );

                            console.log(`🔍 User map after saving:`, {
                                userKeys: allEntities.users.map(u => u.user_key),
                                userMapSize: userMap.size,
                                userMapEntries: Array.from(userMap.entries())
                            });

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
                                            userMapSize: userMap.size,
                                            allUserKeys: Array.from(userMap.keys())
                                        });

                                        // Use null instead of undefined for SQL
                                        page.created_by_id = createdById || null;
                                    }
                                }
                                await databaseService.savePages(validPages);
                            }

                            // Save views first (needed for visit history foreign key)
                            if (allEntities.views.length > 0) {
                                await databaseService.saveViews(allEntities.views);
                                console.log(`   ✅ Saved ${allEntities.views.length} views`);
                            }

                            // Save contributors
                            if (allEntities.contributors.length > 0) {
                                await databaseService.saveContributors(allEntities.contributors);
                                console.log(`   ✅ Saved ${allEntities.contributors.length} contributors`);
                            }

                            // Save visit histories (after views are saved)
                            if (allEntities.visitHistories.length > 0) {
                                await databaseService.saveVisitHistories(allEntities.visitHistories);
                                console.log(`   ✅ Saved ${allEntities.visitHistories.length} visit histories`);
                            }

                            // Save labels and comments
                            if (allEntities.labels.length > 0) {
                                await databaseService.saveLabels(allEntities.labels);
                                console.log(`   ✅ Saved ${allEntities.labels.length} labels`);
                            }

                            if (allEntities.comments.length > 0) {
                                await databaseService.saveComments(allEntities.comments);
                                console.log(`   ✅ Saved ${allEntities.comments.length} comments`);
                            }

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
