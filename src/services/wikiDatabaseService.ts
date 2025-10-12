import { Pool, PoolConnection } from 'mysql2/promise';
import { createDatabaseConnection, localDatabaseConfig } from '../config/database.js';
import {
    WikiUserData,
    WikiPageData,
    WikiViewData,
    WikiContributorData,
    WikiVisitHistoryData,
    WikiLabelData,
    WikiCommentData,
    WikiSpaceData
} from '../mappers/wikiDataMapper.js';

export class WikiDatabaseService {
    private pool: Pool;

    constructor() {
        this.pool = createDatabaseConnection(localDatabaseConfig);
    }

    async close(): Promise<void> {
        await this.pool.end();
    }

    // Generic insert or update method
    private async insertOrUpdate(
        connection: PoolConnection,
        table: string,
        data: any,
        updateColumns: string[] = []
    ): Promise<void> {
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = columns.map(() => '?').join(', ');

        // Wrap column names in backticks to handle MySQL reserved keywords
        const quotedColumns = columns.map(col => `\`${col}\``).join(', ');
        const insertQuery = `INSERT INTO ${table} (${quotedColumns}) VALUES (${placeholders})`;

        if (updateColumns.length > 0) {
            const updateClause = updateColumns.map(col => `\`${col}\` = VALUES(\`${col}\`)`).join(', ');
            const query = `${insertQuery} ON DUPLICATE KEY UPDATE ${updateClause}`;
            await connection.execute(query, values);
        } else {
            const query = `${insertQuery} ON DUPLICATE KEY UPDATE ${columns.map(col => `\`${col}\` = VALUES(\`${col}\`)`).join(', ')}`;
            await connection.execute(query, values);
        }
    }

    // Insert with IGNORE (for unique constraints) - no updates
    private async insertIgnore(
        connection: PoolConnection,
        table: string,
        data: any
    ): Promise<void> {
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = columns.map(() => '?').join(', ');

        // Wrap column names in backticks to handle MySQL reserved keywords
        const quotedColumns = columns.map(col => `\`${col}\``).join(', ');
        const query = `INSERT IGNORE INTO ${table} (${quotedColumns}) VALUES (${placeholders})`;

        await connection.execute(query, values);
    }

    // Save users (INSERT IGNORE - only insert new users, don't update existing)
    async saveUsers(users: WikiUserData[]): Promise<void> {
        if (users.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const user of users) {
                // Skip if user has no identifying information
                if (!user.user_id && !user.display_name) {
                    console.log('Skipping user with no identifying information:', user);
                    continue;
                }

                // Use INSERT IGNORE to avoid overwriting existing users
                await this.insertIgnore(connection, 'wiki_users', user);
            }

            await connection.commit();
            console.log(`Saved ${users.length} users to database (INSERT IGNORE)`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving users:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save spaces
    async saveSpaces(spaces: WikiSpaceData[]): Promise<void> {
        if (spaces.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const space of spaces) {
                await this.insertOrUpdate(connection, 'wiki_spaces', space, [
                    'space_name', 'space_type', 'status', 'description', 'homepage_id'
                ]);
            }

            await connection.commit();
            console.log(`Saved ${spaces.length} spaces to database`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving spaces:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save pages
    async savePages(pages: WikiPageData[]): Promise<void> {
        if (pages.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const page of pages) {
                await this.insertOrUpdate(connection, 'wiki_pages', page, [
                    'title', 'url', 'views', 'last_modified_by', 'number_of_versions',
                    'parent_page_ids', 'created_by_id', 'created_at', 'nearest_parent_id',
                    'space_key', 'content_type', 'status', 'version_number', 'last_modified_at'
                ]);
            }

            await connection.commit();
            console.log(`Saved ${pages.length} pages to database`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving pages:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save views
    async saveViews(views: WikiViewData[]): Promise<void> {
        if (views.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const view of views) {
                await this.insertOrUpdate(connection, 'wiki_views', view, [
                    'total', 'last_view'
                ]);
            }

            await connection.commit();
            console.log(`Saved ${views.length} views to database`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving views:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save contributors
    async saveContributors(contributors: WikiContributorData[]): Promise<void> {
        if (contributors.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const contributor of contributors) {
                await this.insertOrUpdate(connection, 'wiki_contributors', contributor, [
                    'when_modified', 'message', 'minor_edit'
                ]);
            }

            await connection.commit();
            console.log(`Saved ${contributors.length} contributors to database`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving contributors:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save visit histories
    async saveVisitHistories(visitHistories: WikiVisitHistoryData[]): Promise<void> {
        if (visitHistories.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const visitHistory of visitHistories) {
                await this.insertOrUpdate(connection, 'wiki_visit_histories', visitHistory);
            }

            await connection.commit();
            console.log(`Saved ${visitHistories.length} visit histories to database`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving visit histories:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save labels
    async saveLabels(labels: WikiLabelData[]): Promise<void> {
        if (labels.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            // Delete existing labels for these pages
            const pageIds = [...new Set(labels.map(l => l.page_id))];
            if (pageIds.length > 0) {
                const placeholders = pageIds.map(() => '?').join(',');
                await connection.execute(
                    `DELETE FROM wiki_labels WHERE page_id IN (${placeholders})`,
                    pageIds
                );
            }

            // Insert new labels
            for (const label of labels) {
                await this.insertOrUpdate(connection, 'wiki_labels', label);
            }

            await connection.commit();
            console.log(`Saved ${labels.length} labels to database`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving labels:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save comments
    async saveComments(comments: WikiCommentData[]): Promise<void> {
        if (comments.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const comment of comments) {
                await this.insertOrUpdate(connection, 'wiki_comments', comment, [
                    'comment_title', 'comment_body', 'author_user_key', 'created_at',
                    'updated_at', 'version_number', 'status'
                ]);
            }

            await connection.commit();
            console.log(`Saved ${comments.length} comments to database`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving comments:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save all entities at once
    async saveAllEntities(entities: {
        users: WikiUserData[];
        spaces: WikiSpaceData[];
        pages: WikiPageData[];
        views: WikiViewData[];
        contributors: WikiContributorData[];
        visitHistories: WikiVisitHistoryData[];
        labels: WikiLabelData[];
        comments: WikiCommentData[];
    }): Promise<void> {
        console.log('Saving all Wiki entities to database...');

        try {
            // Save in dependency order
            await this.saveUsers(entities.users);
            await this.saveSpaces(entities.spaces);
            await this.savePages(entities.pages);
            await this.saveViews(entities.views);
            await this.saveContributors(entities.contributors);
            await this.saveVisitHistories(entities.visitHistories);
            await this.saveLabels(entities.labels);
            await this.saveComments(entities.comments);

            console.log('Successfully saved all Wiki entities to database');
        } catch (error) {
            console.error('Error saving Wiki entities:', error);
            throw error;
        }
    }

    // Get user by user key
    async getUserByUserKey(userKey: string): Promise<any> {
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM wiki_users WHERE user_key = ?',
                [userKey]
            );

            const users = rows as any[];
            return users.length > 0 ? users[0] || null : null;
        } finally {
            connection.release();
        }
    }

    // Get user by user ID
    async getUserByUserId(userId: string): Promise<any> {
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM wiki_users WHERE user_id = ?',
                [userId]
            );

            const users = rows as any[];
            return users.length > 0 ? users[0] || null : null;
        } finally {
            connection.release();
        }
    }

    // Get page by page ID
    async getPageByPageId(pageId: string): Promise<any> {
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM wiki_pages WHERE page_id = ?',
                [pageId]
            );

            const pages = rows as any[];
            return pages.length > 0 ? pages[0] || null : null;
        } finally {
            connection.release();
        }
    }

    // Get space by space key
    async getSpaceBySpaceKey(spaceKey: string): Promise<any> {
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM wiki_spaces WHERE space_key = ?',
                [spaceKey]
            );

            const spaces = rows as any[];
            return spaces.length > 0 ? spaces[0] || null : null;
        } finally {
            connection.release();
        }
    }

    // Get user IDs by user keys
    async getUserIdsByUserKeys(userKeys: string[]): Promise<Map<string, number>> {
        if (userKeys.length === 0) return new Map();

        const connection = await this.pool.getConnection();
        try {
            const placeholders = userKeys.map(() => '?').join(',');
            const query = `SELECT id, user_key FROM wiki_users WHERE user_key IN (${placeholders})`;

            const [rows] = await connection.execute(query, userKeys);
            const userIdMap = new Map<string, number>();

            (rows as any[]).forEach((row: any) => {
                userIdMap.set(row.user_key, row.id);
            });

            return userIdMap;
        } finally {
            connection.release();
        }
    }

    // Get view IDs by page and user
    async getViewIdsByPageAndUser(pageId: string, userKeys: string[]): Promise<Map<string, number>> {
        if (userKeys.length === 0) return new Map();

        const connection = await this.pool.getConnection();
        try {
            const placeholders = userKeys.map(() => '?').join(',');
            const query = `SELECT id, user_key FROM wiki_views WHERE page_id = ? AND user_key IN (${placeholders})`;

            const [rows] = await connection.execute(query, [pageId, ...userKeys]);
            const viewIdMap = new Map<string, number>();

            (rows as any[]).forEach((row: any) => {
                viewIdMap.set(row.user_key, row.id);
            });

            return viewIdMap;
        } finally {
            connection.release();
        }
    }

    // Save crawl history
    async saveCrawlHistory(crawlAt: string, pageCrawled: number, successfulCrawls: number = 0, failedCrawls: number = 0, crawlDurationMs: number = 0): Promise<number> {
        const connection = await this.pool.getConnection();
        try {
            const query = `
                INSERT INTO wiki_history_crawl_pages (crawl_at, page_crawled, successful_crawls, failed_crawls, crawl_duration_ms)
                VALUES (?, ?, ?, ?, ?)
            `;

            const [result] = await connection.execute(query, [
                crawlAt,
                pageCrawled,
                successfulCrawls,
                failedCrawls,
                crawlDurationMs
            ]);

            return (result as any).insertId;
        } finally {
            connection.release();
        }
    }

    // Check if page exists
    async pageExists(pageId: string): Promise<boolean> {
        const page = await this.getPageByPageId(pageId);
        return page !== null;
    }

    // Get last updated page
    async getLastUpdatedPage(): Promise<any> {
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM wiki_pages ORDER BY last_modified_at DESC LIMIT 1'
            );

            const pages = rows as any[];
            return pages.length > 0 ? pages[0] || null : null;
        } finally {
            connection.release();
        }
    }

    // Health check
    async healthCheck(): Promise<boolean> {
        try {
            const [rows] = await this.pool.execute('SELECT 1 as health_check');
            return (rows as any[]).length > 0;
        } catch (error) {
            console.error('Wiki database health check failed:', error);
            return false;
        }
    }
}

export default WikiDatabaseService;
