import { EventEmitter } from 'events';

export interface MCPResponse {
    success: boolean;
    data?: any;
    error?: string;
}

export interface JiraProject {
    id: string;
    key: string;
    name: string;
    self: string;
    projectTypeKey?: string; // For company MCP server
    archived?: boolean; // For company MCP server
    projectCategory?: { // For company MCP server
        self: string;
        id: string;
        name: string;
        description?: string;
    };
}

export interface JiraUser {
    accountId?: string;
    displayName?: string;
    emailAddress?: string;
    active?: boolean;
    name?: string; // For company MCP server compatibility
}

export interface JiraIssue {
    id: string;
    key: string;
    self: string;
    fields: {
        summary: string;
        description?: string;
        status: {
            id: string;
            name: string;
            statusCategory: {
                id: number;
                key: string;
                colorName: string;
            };
        };
        issuetype: {
            id: string;
            name: string;
            description: string;
        };
        project: {
            id: string;
            key: string;
            name: string;
        };
        assignee?: JiraUser;
        reporter?: JiraUser;
        created: string;
        updated: string;
        labels: string[];
        priority?: {
            id: string;
            name: string;
        };
        fixVersions?: Array<{
            id: string;
            name: string;
            description?: string;
            archived: boolean;
            released: boolean;
            releaseDate?: string;
        }>;
        components?: Array<{
            id: string;
            name: string;
            description?: string;
        }>;
        customfield_10014?: string; // Epic Link
        customfield_10011?: string; // Epic Name
        [key: string]: any;
    };
}

export interface JiraSearchResult {
    issues: JiraIssue[];
    total: number;
    startAt: number;
    maxResults: number;
}

export class MCPJiraService extends EventEmitter {
    private mcpProcess: any = null;
    // private _isConnected = false; // Track connection status
    private requestId = 0;
    private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
    private sessionId: string | null = null;
    // private jiraUrl: string;
    // private username: string;
    // private apiToken: string;

    constructor(
        _jiraUrl: string,
        _username: string,
        _apiToken: string
    ) {
        super();
        // Store credentials for potential future use
        // this.jiraUrl = jiraUrl;
        // this.username = username;
        // this.apiToken = apiToken;
    }

    async connect(): Promise<void> {
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
                    protocolVersion: '2024-11-05',
                    capabilities: {
                        roots: {
                            listChanged: true
                        },
                        sampling: {}
                    },
                    clientInfo: {
                        name: 'mcp-jira-crawler',
                        version: '1.0.0'
                    }
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to initialize session: HTTP ${response.status}`);
        }

        // Extract session ID from Mcp-Session-Id header (per MCP spec)
        const mcpSessionIdHeader = response.headers.get('Mcp-Session-Id');

        if (mcpSessionIdHeader) {
            this.sessionId = mcpSessionIdHeader;
            console.log(`📋 Extracted session ID from Mcp-Session-Id header: ${this.sessionId}`);
        } else {
            // Generate a unique session ID as fallback
            this.sessionId = `mcp_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            console.log(`📋 Generated fallback session ID: ${this.sessionId}`);
        }

        console.log(`✅ MCP session initialized: ${this.sessionId}`);

        // Send initialized notification
        await this.sendInitializedNotification();

        // Wait a bit to ensure initialization is complete
        console.log('⏳ Waiting for initialization to complete...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✅ Ready to call tools');
    }

    // Send initialized notification after initialize
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
        // this._isConnected = false;
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
                    console.log(`📡 Tool ${tool} response:`, responseText.substring(0, 200) + '...');

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

    // Get all projects
    async getAllProjects(includeArchived: boolean = false): Promise<JiraProject[]> {
        const response = await this.makeRequest('jira_get_all_projects', {
            include_archived: includeArchived
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to get projects');
        }

        return response.data || [];
    }

    // Get user profile
    async getUserProfile(userIdentifier: string): Promise<JiraUser> {
        const response = await this.makeRequest('jira_get_user_profile', {
            user_identifier: userIdentifier
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to get user profile');
        }

        return response.data;
    }

    // Search issues with JQL
    async searchIssues(
        jql: string,
        fields: string = 'labels,summary,updated,priority,issuetype,assignee,status,description,created,reporter',
        limit: number = 50,
        startAt: number = 0
    ): Promise<JiraSearchResult> {
        const response = await this.makeRequest('jira_search', {
            jql,
            fields,
            limit,
            start_at: startAt
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to search issues');
        }

        return response.data;
    }

    // Get specific issue
    async getIssue(
        issueKey: string,
        fields: string = '*all',
        expand: string = 'changelog'
    ): Promise<JiraIssue> {
        const response = await this.makeRequest('jira_get_issue', {
            issue_key: issueKey,
            fields,
            expand
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to get issue');
        }

        return response.data;
    }

    // Get project issues
    async getProjectIssues(
        projectKey: string,
        limit: number = 50,
        startAt: number = 0
    ): Promise<JiraSearchResult> {
        const response = await this.makeRequest('jira_get_project_issues', {
            project_key: projectKey,
            limit,
            start_at: startAt
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to get project issues');
        }

        return response.data;
    }

    // Get worklog for issue
    async getWorklog(issueKey: string): Promise<any> {
        const response = await this.makeRequest('jira_get_worklog', {
            issue_key: issueKey
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to get worklog');
        }

        return response.data;
    }

    // Get transitions for issue
    async getTransitions(issueKey: string): Promise<any[]> {
        const response = await this.makeRequest('jira_get_transitions', {
            issue_key: issueKey
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to get transitions');
        }

        return response.data || [];
    }

    // Get agile boards
    async getAgileBoards(
        boardName?: string,
        projectKey?: string,
        boardType?: string,
        limit: number = 50
    ): Promise<any[]> {
        const response = await this.makeRequest('jira_get_agile_boards', {
            board_name: boardName,
            project_key: projectKey,
            board_type: boardType,
            limit
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to get agile boards');
        }

        return response.data || [];
    }

    // Get sprints from board
    async getSprintsFromBoard(
        boardId: string,
        state?: string,
        limit: number = 50
    ): Promise<any[]> {
        const response = await this.makeRequest('jira_get_sprints_from_board', {
            board_id: boardId,
            state,
            limit
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to get sprints');
        }

        return response.data || [];
    }

    // Get sprint issues
    async getSprintIssues(
        sprintId: string,
        limit: number = 50
    ): Promise<JiraSearchResult> {
        const response = await this.makeRequest('jira_get_sprint_issues', {
            sprint_id: sprintId,
            limit
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to get sprint issues');
        }

        return response.data;
    }

    // Get project versions
    async getProjectVersions(projectKey: string): Promise<any[]> {
        const response = await this.makeRequest('jira_get_project_versions', {
            project_key: projectKey
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to get project versions');
        }

        return response.data || [];
    }

    // Download attachments
    async downloadAttachments(issueKey: string, targetDir: string): Promise<any> {
        const response = await this.makeRequest('jira_download_attachments', {
            issue_key: issueKey,
            target_dir: targetDir
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to download attachments');
        }

        return response.data;
    }

    // Batch get changelogs
    async batchGetChangelogs(
        issueIdsOrKeys: string[],
        fields?: string[],
        limit: number = -1
    ): Promise<any[]> {
        const response = await this.makeRequest('jira_batch_get_changelogs', {
            issue_ids_or_keys: issueIdsOrKeys,
            fields,
            limit
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to get changelogs');
        }

        return response.data || [];
    }

    // Search fields
    async searchFields(keyword: string = '', limit: number = 10): Promise<any[]> {
        const response = await this.makeRequest('jira_search_fields', {
            keyword,
            limit
        });

        if (!response.success) {
            throw new Error(response.error || 'Failed to search fields');
        }

        return response.data || [];
    }

    // Get link types
    async getLinkTypes(): Promise<any[]> {
        const response = await this.makeRequest('jira_get_link_types', {});

        if (!response.success) {
            throw new Error(response.error || 'Failed to get link types');
        }

        return response.data || [];
    }
}

export default MCPJiraService;

