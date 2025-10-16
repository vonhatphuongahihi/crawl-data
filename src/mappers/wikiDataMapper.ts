import { WikiPage, WikiComment, WikiLabel, WikiSpace, WikiUser } from '../services/mcpWikiService.js';

export interface WikiUserData {
    user_id: string;
    user_key: string;
    display_name: string;
    avatar_url?: string | null;
    roles?: string | null;
    english_name?: string | null;
    is_resigned: boolean;
}

export interface WikiPageData {
    page_id: string;
    title: string;
    url: string;
    views: number;
    last_modified_by: string;
    last_modified_by_key?: string | null; // Add user key field
    created_by_display_name?: string | null; // Add creator display name
    created_by_key?: string | null; // Add creator user key
    number_of_versions: number;
    parent_page_ids?: string | null;
    created_by_id?: number | null;
    created_at?: Date | null;
    nearest_parent_id?: string | null;
    space_key?: string | undefined;
    content_type: string;
    status: string;
    version_number: number;
    last_modified_at?: Date | null;
    last_modified_by_id?: number | null;
}

export interface WikiViewData {
    page_id: string;
    user_key: string;
    total: number;
    last_view?: Date | null;
}

export interface WikiContributorData {
    create_by_user_key: string;
    confluence_page_id: string;
    version: number;
    when_modified: Date;
    message?: string | null;
    minor_edit: boolean;
}

export interface WikiVisitHistoryData {
    views_id: number;
    visit_date: string;
    unix_date?: string | null;
    visit_timestamp?: Date | null;
}

export interface WikiLabelData {
    page_id: string;
    label_name: string;
    label_prefix?: string | null;
}

export interface WikiCommentData {
    comment_id: string;
    page_id: string;
    comment_title?: string | null;
    comment_body?: string | null;
    author_user_key?: string | null;
    assignee_code?: string | null; // username goes here
    display_name?: string | null; // Add display_name field
    created_at?: Date | null;
    updated_at?: Date | null;
    version_number: number;
    status: string;
}

export interface WikiSpaceData {
    space_id: string;
    space_key: string;
    space_name: string;
    space_type?: string;
    status?: string;
    description?: string | null;
    homepage_id?: string | null;
}

export class WikiDataMapper {

    // Map user from MCP response to database format
    static mapUser(wikiUser: WikiUser): WikiUserData {
        // Debug: Log user data to identify "results" issue
        console.log(`🔍 DEBUG mapUser input:`, JSON.stringify(wikiUser, null, 2));

        // Handle missing user info from MCP tool - use fallbacks
        const userId = wikiUser.accountId || wikiUser.username || wikiUser.displayName || 'unknown';
        const userKey = wikiUser.userKey || wikiUser.accountId || wikiUser.username || wikiUser.displayName || 'unknown';

        // Debug: Log final userKey
        console.log(`🔍 DEBUG mapUser result:`, { userId, userKey, displayName: wikiUser.displayName });

        return {
            user_id: userId,
            user_key: userKey,
            display_name: wikiUser.displayName || 'Unknown User',
            avatar_url: wikiUser.profilePicture?.path || null,
            roles: '', // Will be populated separately if needed
            english_name: null,
            is_resigned: wikiUser.accountStatus === 'inactive' || false
        };
    }

    // Map page from MCP response to database format
    static mapPage(wikiPage: WikiPage, createdById?: number, lastModifiedById?: number): WikiPageData {
        // MCP tools should return full URL in the response
        const fullUrl = wikiPage._links?.webui || wikiPage.url || '';

        // Extract parent info from ancestors
        let parentPageIds: string | null = null;
        let nearestParentId: string | null = null;

        if ((wikiPage as any).ancestors && Array.isArray((wikiPage as any).ancestors)) {
            const ancestors = (wikiPage as any).ancestors;
            if (ancestors.length > 0) {
                // Get all parent IDs
                parentPageIds = ancestors.map((ancestor: any) => ancestor.id).join(',');
                // Get nearest parent (first in the array)
                nearestParentId = ancestors[0].id;
            }
        }

        return {
            page_id: wikiPage.id,
            title: wikiPage.title,
            url: fullUrl,
            views: (wikiPage as any).views || 0, // Use views from MCP tool
            last_modified_by: wikiPage.version?.by?.displayName || '',
            last_modified_by_key: wikiPage.version?.by?.userKey || wikiPage.version?.by?.accountId || null, // Add user key
            created_by_display_name: wikiPage.author?.displayName || '', // Add creator display name
            created_by_key: wikiPage.author?.userKey || wikiPage.author?.accountId || null, // Add creator user key
            number_of_versions: wikiPage.version?.number || 1,
            parent_page_ids: parentPageIds, // Now populated from ancestors
            created_by_id: createdById || null,
            created_at: wikiPage.created ? new Date(wikiPage.created) : (wikiPage.version?.when ? new Date(wikiPage.version.when) : null),
            nearest_parent_id: nearestParentId, // Now populated from ancestors
            space_key: wikiPage.space?.key,
            content_type: wikiPage.type || 'page',
            status: wikiPage.status || 'current',
            version_number: wikiPage.version?.number || 1,
            last_modified_at: wikiPage.version?.when ? new Date(wikiPage.version.when) : null,
            last_modified_by_id: lastModifiedById || null
        };
    }

    // Map view data
    static mapViewData(pageId: string, userKey: string, totalViews: number, lastView?: Date): WikiViewData {
        return {
            page_id: pageId,
            user_key: userKey,
            total: totalViews,
            last_view: lastView || null
        };
    }

    // Map contributor data from version history
    static mapContributorData(
        pageId: string,
        userKey: string,
        version: number,
        whenModified: string,
        message?: string,
        minorEdit?: boolean
    ): WikiContributorData {
        return {
            create_by_user_key: userKey,
            confluence_page_id: pageId,
            version: version,
            when_modified: new Date(whenModified),
            message: message || null,
            minor_edit: minorEdit || false
        };
    }

    // Map visit history data
    static mapVisitHistoryData(viewsId: number, visit: any): WikiVisitHistoryData {
        return {
            views_id: viewsId,
            visit_date: visit.visitDate || '',
            unix_date: null, // Will be calculated if needed
            visit_timestamp: visit.lastVisit ? new Date(visit.lastVisit) : null
        };
    }

    // Map label from MCP response to database format
    static mapLabel(pageId: string, wikiLabel: WikiLabel): WikiLabelData {
        return {
            page_id: pageId,
            label_name: wikiLabel.name || wikiLabel.label || '',
            label_prefix: wikiLabel.prefix || null
        };
    }

    // Map comment from MCP response to database format
    static mapComment(wikiComment: WikiComment, pageId?: string): WikiCommentData {
        // Use provided pageId or try to extract from comment data
        const finalPageId = pageId || wikiComment._expandable?.container?.split('/').pop() || '';

        // Extract body content - now directly available from ConfluenceComment model
        const bodyContent = wikiComment.body || null;

        // Extract author safely - try author first, then version.by
        let authorKey: string | null = null;
        if (wikiComment.author?.userKey) {
            authorKey = wikiComment.author.userKey;
        } else if (wikiComment.author?.accountId) {
            authorKey = wikiComment.author.accountId;
        } else if (wikiComment.version?.by?.userKey) {
            authorKey = wikiComment.version.by.userKey;
        } else if (wikiComment.version?.by?.accountId) {
            authorKey = wikiComment.version.by.accountId;
        }

        // Extract timestamps - try direct fields first, then version
        let createdAt: Date | null = null;
        let updatedAt: Date | null = null;

        if (wikiComment.created) {
            createdAt = new Date(wikiComment.created);
        } else if (wikiComment.version?.when) {
            createdAt = new Date(wikiComment.version.when);
        }

        if (wikiComment.updated) {
            updatedAt = new Date(wikiComment.updated);
        } else if (wikiComment.version?.when) {
            updatedAt = new Date(wikiComment.version.when);
        }

        // Extract username for assignee_code
        let assigneeCode: string | null = null;
        if (wikiComment.author?.username) {
            assigneeCode = wikiComment.author.username; // username goes to assignee_code
        } else if (wikiComment.author?.userKey) {
            assigneeCode = wikiComment.author.userKey;
        } else if (wikiComment.author?.accountId) {
            assigneeCode = wikiComment.author.accountId;
        } else if (authorKey) {
            assigneeCode = authorKey;
        }

        // Extract display_name from author
        const displayName = wikiComment.author?.displayName || null;

        return {
            comment_id: wikiComment.id,
            page_id: finalPageId,
            comment_title: wikiComment.title || null,
            comment_body: bodyContent,
            author_user_key: authorKey,
            assignee_code: assigneeCode, // username goes here
            display_name: displayName, // Add display_name field
            created_at: createdAt,
            updated_at: updatedAt,
            version_number: wikiComment.version?.number || 1,
            status: wikiComment.status || 'current'
        };
    }

    // Map space from MCP response to database format
    static mapSpace(wikiSpace: WikiSpace): WikiSpaceData {
        return {
            space_id: wikiSpace.id ? wikiSpace.id.toString() : '0', // Fix: handle undefined id
            space_key: wikiSpace.key,
            space_name: wikiSpace.name,
            space_type: wikiSpace.type || 'global',
            status: wikiSpace.status || 'current',
            description: null, // Not available in basic space info
            homepage_id: wikiSpace._expandable?.homepage?.split('/').pop() || null
        };
    }

    // Batch mapping methods
    static mapMultipleUsers(wikiUsers: WikiUser[]): WikiUserData[] {
        return wikiUsers.map(user => this.mapUser(user));
    }

    static mapMultiplePages(wikiPages: WikiPage[], createdByIdMap?: Map<string, number>): WikiPageData[] {
        return wikiPages.map(wikiPage => {
            const userKey = wikiPage.version?.by?.userKey || wikiPage.version?.by?.accountId;
            const createdById = userKey ? createdByIdMap?.get(userKey) : undefined;
            return this.mapPage(wikiPage, createdById, undefined);
        });
    }

    static mapMultipleLabels(pageId: string, wikiLabels: WikiLabel[]): WikiLabelData[] {
        return wikiLabels.map(label => this.mapLabel(pageId, label));
    }

    static mapMultipleComments(wikiComments: WikiComment[], pageId?: string): WikiCommentData[] {
        return wikiComments.map(comment => this.mapComment(comment, pageId));
    }

    static mapMultipleSpaces(wikiSpaces: WikiSpace[]): WikiSpaceData[] {
        return wikiSpaces.map(space => this.mapSpace(space));
    }

    // Utility methods for data processing
    static extractUserKeysFromPage(wikiPage: WikiPage): string[] {
        const userKeys: string[] = [];

        if (wikiPage.version?.by?.userKey) {
            userKeys.push(wikiPage.version.by.userKey);
        } else if (wikiPage.version?.by?.accountId) {
            userKeys.push(wikiPage.version.by.accountId);
        }

        return [...new Set(userKeys)]; // Remove duplicates
    }

    static extractUserKeysFromComments(wikiComments: WikiComment[]): string[] {
        const userKeys: string[] = [];

        wikiComments.forEach(comment => {
            if (comment.version?.by?.userKey) {
                userKeys.push(comment.version.by.userKey);
            } else if (comment.version?.by?.accountId) {
                userKeys.push(comment.version.by.accountId);
            }
        });

        return [...new Set(userKeys)]; // Remove duplicates
    }

    static extractUserKeysFromVisitHistory(visitHistory: Record<string, any[]>): string[] {
        return Object.keys(visitHistory);
    }

    // Helper method to parse parent page IDs from page hierarchy
    static parseParentPageIds(_wikiPage: WikiPage, parentPageId?: string): string | null {
        if (!parentPageId) return null;

        // If we have multiple parent pages, we could store them as JSON array
        // For now, just store the immediate parent
        return parentPageId;
    }

    // Helper method to calculate nearest parent ID
    static calculateNearestParentId(parentPageIds: string | null): string | null {
        if (!parentPageIds) return null;

        try {
            // If it's JSON array, get the last one (most recent parent)
            const parents = JSON.parse(parentPageIds);
            if (Array.isArray(parents) && parents.length > 0) {
                return parents[parents.length - 1];
            }
        } catch {
            // If not JSON, treat as single parent ID
            return parentPageIds;
        }

        return null;
    }

    // Helper method to convert visit date to unix timestamp
    static convertToUnixDate(visitDate: string): string {
        try {
            const date = new Date(visitDate);
            return Math.floor(date.getTime() / 1000).toString();
        } catch {
            return '0';
        }
    }

    // Helper method to validate required fields
    static validateUserData(userData: WikiUserData): boolean {
        return !!(userData.user_id && userData.user_key && userData.display_name);
    }

    static validatePageData(pageData: WikiPageData): boolean {
        return !!(pageData.page_id && pageData.title && pageData.url);
    }

    static validateViewData(viewData: WikiViewData): boolean {
        return !!(viewData.page_id && viewData.user_key && viewData.total >= 0);
    }

    // Extract all entities from a Wiki page (similar to Jira's extractAllEntities)
    static extractAllEntities(wikiPage: WikiPage, createdById?: number, lastModifiedById?: number) {
        const entities = {
            page: this.mapPage(wikiPage, createdById, lastModifiedById),
            labels: [] as WikiLabelData[],
            comments: [] as WikiCommentData[],
            contributors: [] as WikiContributorData[],
            views: [] as WikiViewData[]
        };

        // Extract users from page
        const users: WikiUserData[] = [];
        if (wikiPage.version?.by) {
            const userData: WikiUser = {
                accountId: wikiPage.version.by.accountId || '',
                username: (wikiPage.version.by as any).username, // Add username from MCP tool
                accountType: (wikiPage.version.by as any).accountType || 'unknown',
                email: wikiPage.version.by.email,
                publicName: wikiPage.version.by.publicName || wikiPage.version.by.displayName,
                displayName: wikiPage.version.by.displayName,
                userKey: wikiPage.version.by.userKey,
                profilePicture: wikiPage.version.by.profilePicture,
                isExternalCollaborator: wikiPage.version.by.isExternalCollaborator,
                isGuest: wikiPage.version.by.isGuest,
                locale: wikiPage.version.by.locale,
                accountStatus: wikiPage.version.by.accountStatus
            };
            users.push(this.mapUser(userData));
        }

        // Extract space
        let space: WikiSpaceData | null = null;
        if (wikiPage.space) {
            space = this.mapSpace(wikiPage.space);
        }

        return {
            ...entities,
            users,
            space
        };
    }

    // Extract all entities from search results
    static extractAllEntitiesFromSearch(searchResult: any) {
        const allEntities = {
            pages: [] as WikiPageData[],
            users: [] as WikiUserData[],
            spaces: [] as WikiSpaceData[],
            labels: [] as WikiLabelData[],
            comments: [] as WikiCommentData[],
            contributors: [] as WikiContributorData[],
            views: [] as WikiViewData[]
        };

        const uniqueUsers = new Map<string, WikiUserData>();
        const uniqueSpaces = new Map<string, WikiSpaceData>();

        for (const result of searchResult.results || []) {
            const wikiPage = result.content;
            const entities = this.extractAllEntities(wikiPage);

            // Add page
            allEntities.pages.push(entities.page);

            // Add unique users
            for (const user of entities.users) {
                const userKey = user.user_key || user.user_id;
                if (!uniqueUsers.has(userKey)) {
                    uniqueUsers.set(userKey, user);
                    allEntities.users.push(user);
                }
            }

            // Add unique space
            if (entities.space && !uniqueSpaces.has(entities.space.space_key)) {
                uniqueSpaces.set(entities.space.space_key, entities.space);
                allEntities.spaces.push(entities.space);
            }

            // Add other entities
            allEntities.labels.push(...entities.labels);
            allEntities.comments.push(...entities.comments);
            allEntities.contributors.push(...entities.contributors);
            allEntities.views.push(...entities.views);
        }

        return allEntities;
    }
}
