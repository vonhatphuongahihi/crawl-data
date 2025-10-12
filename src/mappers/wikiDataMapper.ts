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
    number_of_versions: number;
    parent_page_ids?: string | null;
    created_by_id?: number | undefined;
    created_at?: Date | null;
    nearest_parent_id?: string | null;
    space_key?: string | undefined;
    content_type: string;
    status: string;
    version_number: number;
    last_modified_at?: Date | null;
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
        return {
            user_id: wikiUser.accountId,
            user_key: wikiUser.userKey || wikiUser.accountId,
            display_name: wikiUser.displayName,
            avatar_url: wikiUser.profilePicture?.path || null,
            roles: '', // Will be populated separately if needed
            english_name: null,
            is_resigned: wikiUser.accountStatus === 'inactive' || false
        };
    }

    // Map page from MCP response to database format
    static mapPage(wikiPage: WikiPage, createdById?: number): WikiPageData {
        const webuiUrl = wikiPage._links?.webui || '';
        const fullUrl = webuiUrl ? `https://wiki.n.com${webuiUrl}` : '';

        return {
            page_id: wikiPage.id,
            title: wikiPage.title,
            url: fullUrl,
            views: 0, // Will be populated from view tracking API
            last_modified_by: wikiPage.version?.by?.displayName || '',
            number_of_versions: wikiPage.version?.number || 1,
            parent_page_ids: null, // Will be populated separately
            created_by_id: createdById || undefined,
            created_at: wikiPage.version?.when ? new Date(wikiPage.version.when) : null,
            nearest_parent_id: null, // Will be populated separately
            space_key: wikiPage.space?.key,
            content_type: wikiPage.type || 'page',
            status: wikiPage.status || 'current',
            version_number: wikiPage.version?.number || 1,
            last_modified_at: wikiPage.version?.when ? new Date(wikiPage.version.when) : null
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
    static mapComment(wikiComment: WikiComment): WikiCommentData {
        const pageId = wikiComment._expandable?.container?.split('/').pop() || '';

        return {
            comment_id: wikiComment.id,
            page_id: pageId,
            comment_title: wikiComment.title || null,
            comment_body: wikiComment.body?.view?.value || wikiComment.body?.storage?.value || null,
            author_user_key: wikiComment.version?.by?.userKey || wikiComment.version?.by?.accountId || null,
            created_at: wikiComment.version?.when ? new Date(wikiComment.version.when) : null,
            updated_at: wikiComment.version?.when ? new Date(wikiComment.version.when) : null,
            version_number: wikiComment.version?.number || 1,
            status: wikiComment.status || 'current'
        };
    }

    // Map space from MCP response to database format
    static mapSpace(wikiSpace: WikiSpace): WikiSpaceData {
        return {
            space_id: wikiSpace.id.toString(),
            space_key: wikiSpace.key,
            space_name: wikiSpace.name,
            space_type: wikiSpace.type,
            status: wikiSpace.status,
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
            return this.mapPage(wikiPage, createdById);
        });
    }

    static mapMultipleLabels(pageId: string, wikiLabels: WikiLabel[]): WikiLabelData[] {
        return wikiLabels.map(label => this.mapLabel(pageId, label));
    }

    static mapMultipleComments(wikiComments: WikiComment[]): WikiCommentData[] {
        return wikiComments.map(comment => this.mapComment(comment));
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
    static extractAllEntities(wikiPage: WikiPage) {
        const entities = {
            page: this.mapPage(wikiPage),
            labels: [] as WikiLabelData[],
            comments: [] as WikiCommentData[],
            contributors: [] as WikiContributorData[],
            views: [] as WikiViewData[]
        };

        // Extract users from page
        const users: WikiUserData[] = [];
        if (wikiPage.version?.by) {
            const userData: WikiUser = {
                accountId: wikiPage.version.by.accountId,
                accountType: wikiPage.version.by.accountType,
                email: wikiPage.version.by.email,
                publicName: wikiPage.version.by.publicName,
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
