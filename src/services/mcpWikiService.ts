import { EventEmitter } from 'events';

export interface MCPResponse {
    success: boolean;
    data?: any;
    error?: string;
}

export interface WikiPage {
    id: string;
    type: string;
    status: string;
    title: string;
    space?: {
        id: number;
        key: string;
        name: string;
        type: string;
        status: string;
    };
    version?: {
        by: {
            type: string;
            accountId: string;
            accountType: string;
            email?: string;
            publicName: string;
            displayName: string;
            userKey?: string;
            profilePicture?: {
                path: string;
                width: number;
                height: number;
                isDefault: boolean;
            };
            isExternalCollaborator?: boolean;
            isGuest?: boolean;
            locale?: string;
            accountStatus?: string;
        };
        when: string;
        friendlyWhen: string;
        message?: string;
        number: number;
        minorEdit?: boolean;
    };
    body?: {
        storage?: {
            value: string;
            representation: string;
        };
        view?: {
            value: string;
            representation: string;
        };
    };
    _links?: {
        webui?: string;
        self: string;
        tinyui?: string;
    };
}

export interface WikiComment {
    id: string;
    type: string;
    status: string;
    title?: string;
    version?: {
        by: {
            type: string;
            accountId: string;
            accountType: string;
            email?: string;
            publicName: string;
            displayName: string;
            userKey?: string;
        };
        when: string;
        friendlyWhen: string;
        message?: string;
        number: number;
        minorEdit?: boolean;
    };
    body?: {
        view?: {
            value: string;
            representation: string;
        };
        storage?: {
            value: string;
            representation: string;
        };
    };
    _expandable?: {
        container?: string;
    };
}

export interface WikiLabel {
    id: string;
    prefix?: string;
    name: string;
    label?: string;
}

export interface WikiSpace {
    id: number;
    key: string;
    name: string;
    type: string;
    status: string;
    _expandable?: {
        homepage?: string;
        description?: string;
    };
}

export interface WikiUser {
    accountId: string;
    accountType: string;
    email?: string | undefined;
    publicName: string;
    displayName: string;
    userKey?: string | undefined;
    profilePicture?: {
        path: string;
        width: number;
        height: number;
        isDefault: boolean;
    } | undefined;
    isExternalCollaborator?: boolean | undefined;
    isGuest?: boolean | undefined;
    locale?: string | undefined;
    accountStatus?: string | undefined;
}

export interface WikiSearchResult {
    results: Array<{
        content: WikiPage;
        title: string;
        excerpt?: string;
        url: string;
        resultGlobalContainer?: {
            title: string;
            displayUrl: string;
        };
        lastModified?: string;
        friendlyLastModified?: string;
        score?: number;
    }>;
    start: number;
    limit: number;
    size: number;
    totalSize: number;
    cqlQuery?: string;
    searchDuration?: number;
    _links?: {
        base: string;
        context: string;
        self: string;
    };
}

export class MCPWikiService extends EventEmitter {
    private mcpProcess: any = null;
    private requestId = 0;
    private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
    private sessionId: string | null = null;

    constructor(
        // @ts-ignore - Parameters stored for future use
        private __wikiUrl: string,
        // @ts-ignore - Parameters stored for future use
        private __username: string,
        // @ts-ignore - Parameters stored for future use
        private __apiToken: string
    ) {
        super();
    }

    async connect(): Promise<void> {
        console.log('🔌 Initializing MCP Wiki session...');

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
                    protocolVersion: '2024-11-05',
                    capabilities: {
                        roots: {
                            listChanged: true
                        },
                        sampling: {}
                    },
                    clientInfo: {
                        name: 'mcp-wiki-crawler',
                        version: '1.0.0'
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to initialize session: HTTP ${response.status}`);
        }

        // Extract session ID from Mcp-Session-Id header
        const mcpSessionIdHeader = response.headers.get('Mcp-Session-Id');

        if (mcpSessionIdHeader) {
            this.sessionId = mcpSessionIdHeader;
            console.log(`📋 Extracted session ID from Mcp-Session-Id header: ${this.sessionId}`);
        } else {
            this.sessionId = `mcp_wiki_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            console.log(`📋 Generated fallback session ID: ${this.sessionId}`);
        }

        console.log(`✅ MCP Wiki session initialized: ${this.sessionId}`);

        // Send initialized notification
        await this.sendInitializedNotification();

        // Wait for initialization to complete
        console.log('⏳ Waiting for initialization to complete...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✅ Ready to call Wiki tools');
    }

    private async sendInitializedNotification(): Promise<void> {
        console.log('📤 Sending initialized notification...');

        const response = await fetch('http://localhost:9000/mcp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream',
                'MCP-Protocol-Version': '2024-11-05',
                'Mcp-Session-Id': this.sessionId || ''
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

    async disconnect(): Promise<void> {
        if (this.mcpProcess) {
            this.mcpProcess.kill();
            this.mcpProcess = null;
        }
    }

    private async makeRequest(tool: string, params: any = {}): Promise<MCPResponse> {
        return new Promise((resolve, reject) => {
            const id = ++this.requestId;

            // Store request for response handling
            this.pendingRequests.set(id, { resolve, reject });

            // Make HTTP request to MCP server
            const requestData = {
                jsonrpc: '2.0',
                id: id,
                method: 'tools/call',
                params: {
                    name: tool,
                    arguments: params
                }
            };

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream',
                'MCP-Protocol-Version': '2024-11-05'
            };

            // Add session ID if available
            if (this.sessionId) {
                headers['Mcp-Session-Id'] = this.sessionId;
            }

            fetch('http://localhost:9000/mcp', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestData)
            })
                .then(async response => {
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HTTP ${response.status}: ${errorText}`);
                    }

                    // Handle Server-Sent Events response
                    const responseText = await response.text();
                    console.log(`📡 Tool ${tool} response:`, responseText.substring(0, 500) + '...');

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
                                    const parsedData = JSON.parse(textContent.text);
                                    return parsedData;
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
                })
                .then((result: any) => {
                    const pendingRequest = this.pendingRequests.get(id);
                    if (pendingRequest) {
                        this.pendingRequests.delete(id);
                        pendingRequest.resolve({
                            success: true,
                            data: result
                        });
                    }
                })
                .catch(error => {
                    const pendingRequest = this.pendingRequests.get(id);
                    if (pendingRequest) {
                        this.pendingRequests.delete(id);
                        pendingRequest.reject(error);
                    }
                });

            // Timeout after 30 seconds
            setTimeout(() => {
                const pendingRequest = this.pendingRequests.get(id);
                if (pendingRequest) {
                    this.pendingRequests.delete(id);
                    pendingRequest.reject(new Error('Request timeout'));
                }
            }, 30000);
        });
    }

    // Search Confluence content using CQL
    async searchConfluence(
        query: string,
        limit: number = 50,
        spacesFilter?: string
    ): Promise<WikiSearchResult> {
        console.log(`🔍 Searching Confluence with query: "${query}", limit: ${limit}, spaces: ${spacesFilter}`);

        const response = await this.makeRequest('confluence_search', {
            query,
            limit,
            spaces_filter: spacesFilter
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to search Confluence');
        }

        console.log(`✅ Search result: ${response.data?.results?.length || 0} items found`);
        if (response.data?.results?.length > 0) {
            console.log('📋 First result structure:', JSON.stringify(response.data.results[0], null, 2));
        }

        return response.data;
    }

    // Get specific page by ID
    async getPage(
        pageId: string,
        includeMetadata: boolean = true,
        convertToMarkdown: boolean = true
    ): Promise<WikiPage> {
        console.log(`📄 Getting page: ${pageId}, metadata: ${includeMetadata}, markdown: ${convertToMarkdown}`);

        const response = await this.makeRequest('confluence_get_page', {
            page_id: pageId,
            include_metadata: includeMetadata,
            convert_to_markdown: convertToMarkdown
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to get page');
        }

        console.log(`✅ Page data retrieved for ${pageId}:`, JSON.stringify(response.data, null, 2));

        return response.data;
    }

    // Get page by title and space key
    async getPageByTitle(
        title: string,
        spaceKey: string,
        includeMetadata: boolean = true,
        convertToMarkdown: boolean = true
    ): Promise<WikiPage> {
        const response = await this.makeRequest('confluence_get_page', {
            title,
            space_key: spaceKey,
            include_metadata: includeMetadata,
            convert_to_markdown: convertToMarkdown
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to get page by title');
        }

        return response.data;
    }

    // Get child pages of a specific page
    async getPageChildren(
        parentId: string,
        limit: number = 25,
        includeContent: boolean = false,
        convertToMarkdown: boolean = true
    ): Promise<WikiPage[]> {
        console.log(`👶 Getting page children for parent: ${parentId}, limit: ${limit}`);

        const response = await this.makeRequest('confluence_get_page_children', {
            parent_id: parentId,
            limit,
            include_content: includeContent,
            convert_to_markdown: convertToMarkdown
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to get page children');
        }

        console.log(`✅ Page children result: ${response.data?.length || 0} children found`);

        return response.data || [];
    }

    // Get comments for a specific page
    async getPageComments(pageId: string): Promise<WikiComment[]> {
        console.log(`💬 Getting comments for page: ${pageId}`);

        const response = await this.makeRequest('confluence_get_comments', {
            page_id: pageId
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to get page comments');
        }

        console.log(`✅ Comments result: ${response.data?.length || 0} comments found`);
        if (response.data?.length > 0) {
            console.log('📋 First comment structure:', JSON.stringify(response.data[0], null, 2));
        }

        return response.data || [];
    }

    // Get labels for a specific page
    async getPageLabels(pageId: string): Promise<WikiLabel[]> {
        console.log(`🏷️ Getting labels for page: ${pageId}`);

        const response = await this.makeRequest('confluence_get_labels', {
            page_id: pageId
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to get page labels');
        }

        console.log(`✅ Labels result: ${response.data?.length || 0} labels found`);
        if (response.data?.length > 0) {
            console.log('📋 Labels:', JSON.stringify(response.data, null, 2));
        }

        return response.data || [];
    }

    // Search users
    async searchUsers(query: string, limit: number = 10): Promise<WikiUser[]> {
        console.log(`👥 Searching users with query: "${query}", limit: ${limit}`);

        const response = await this.makeRequest('confluence_search_user', {
            query,
            limit
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to search users');
        }

        console.log(`✅ User search result: ${response.data?.length || 0} users found`);
        if (response.data?.length > 0) {
            console.log('📋 First user structure:', JSON.stringify(response.data[0], null, 2));
        }

        return response.data || [];
    }

    // Get pages from a specific space using search
    async getPagesFromSpace(
        spaceKey: string,
        limit: number = 50
    ): Promise<WikiPage[]> {
        const cqlQuery = `space = "${spaceKey}" AND type = page`;
        const searchResult = await this.searchConfluence(cqlQuery, limit);

        return searchResult.results.map(result => result.content);
    }

    // Get all spaces (using search with CQL)
    async getAllSpaces(limit: number = 50): Promise<WikiSpace[]> {
        // Note: This would need a specific spaces search tool or use search with CQL
        // For now, we'll use a generic search approach
        try {
            const cqlQuery = 'type = page'; // Get all pages to extract unique spaces
            const searchResult = await this.searchConfluence(cqlQuery, limit);

            const spaceMap = new Map<string, WikiSpace>();

            searchResult.results.forEach(result => {
                if (result.content.space) {
                    const space = result.content.space;
                    if (!spaceMap.has(space.key)) {
                        spaceMap.set(space.key, {
                            id: space.id,
                            key: space.key,
                            name: space.name,
                            type: space.type,
                            status: space.status
                        });
                    }
                }
            });

            return Array.from(spaceMap.values());
        } catch (error) {
            console.error('Error getting spaces:', error);
            return [];
        }
    }

    // Health check
    async healthCheck(): Promise<boolean> {
        try {
            await this.searchConfluence('type = page', 1);
            return true;
        } catch (error) {
            console.error('Wiki service health check failed:', error);
            return false;
        }
    }
}

export default MCPWikiService;
