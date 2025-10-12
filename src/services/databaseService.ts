import { Pool, PoolConnection } from 'mysql2/promise';
import { createDatabaseConnection, localDatabaseConfig } from '../config/database.js';
import {
    DatabaseUser,
    DatabaseProject,
    DatabaseStatus,
    DatabaseComponent,
    DatabaseFixVersion,
    DatabaseIssue,
    DatabaseChangelog,
    DatabaseSubtask,
    DatabaseLabel,
    DatabaseIssueFixVersion
} from '../mappers/jiraDataMapper.js';

export class DatabaseService {
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

    // Save users
    async saveUsers(users: DatabaseUser[]): Promise<void> {
        if (users.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const user of users) {
                await this.insertOrUpdate(connection, 'bts_users', user, [
                    'account_id', 'display_name', 'email_address', 'active'
                ]);
            }

            await connection.commit();
            console.log(`Saved ${users.length} users to database`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving users:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save projects
    async saveProjects(projects: DatabaseProject[]): Promise<void> {
        if (projects.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const project of projects) {
                await this.insertOrUpdate(connection, 'bts_projects', project, [
                    'name', 'project_type_key', 'archived', 'project_category_self',
                    'project_category_id', 'project_category_name', 'project_category_description'
                ]);
            }

            await connection.commit();
            console.log(`Saved ${projects.length} projects to database`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving projects:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save statuses
    async saveStatuses(statuses: DatabaseStatus[]): Promise<void> {
        if (statuses.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const status of statuses) {
                await this.insertOrUpdate(connection, 'bts_statuses', status, [
                    'name', 'description', 'status_category'
                ]);
            }

            await connection.commit();
            console.log(`Saved ${statuses.length} statuses to database`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving statuses:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save fix versions
    async saveFixVersions(fixVersions: DatabaseFixVersion[]): Promise<void> {
        if (fixVersions.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const fixVersion of fixVersions) {
                await this.insertOrUpdate(connection, 'fix_versions', fixVersion, [
                    'name', 'description', 'archived', 'released', 'release_date'
                ]);
            }

            await connection.commit();
            console.log(`Saved ${fixVersions.length} fix versions to database`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving fix versions:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save issues
    async saveIssues(issues: DatabaseIssue[]): Promise<void> {
        if (issues.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const issue of issues) {
                await this.insertOrUpdate(connection, 'bts_issues', issue, [
                    'summary', 'status_name', 'assignee_name',
                    'reporter_name', 'project_key', 'project_name',
                    'issue_type_name', 'priority_name', 'updated', 'description',
                    'labels', 'subtasks', 'changelog'
                ]);
            }

            await connection.commit();
            console.log(`Saved ${issues.length} issues to database`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving issues:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save components
    async saveComponents(components: DatabaseComponent[]): Promise<void> {
        if (components.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const component of components) {
                await this.insertOrUpdate(connection, 'bts_components', component, [
                    'name', 'description', 'self'
                ]);
            }

            await connection.commit();
            console.log(`Saved ${components.length} components to database`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving components:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save labels
    async saveLabels(labels: DatabaseLabel[]): Promise<void> {
        if (labels.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            // Delete existing labels for these issues
            const issueIds = [...new Set(labels.map(l => l.issue_id))];
            if (issueIds.length > 0) {
                const placeholders = issueIds.map(() => '?').join(',');
                await connection.execute(
                    `DELETE FROM bts_labels WHERE issue_id IN (${placeholders})`,
                    issueIds
                );
            }

            // Insert new labels
            for (const label of labels) {
                await this.insertOrUpdate(connection, 'bts_labels', label);
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

    // Save issue fix versions
    async saveIssueFixVersions(issueFixVersions: DatabaseIssueFixVersion[]): Promise<void> {
        if (issueFixVersions.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            // Delete existing fix versions for these issues
            const issueIds = [...new Set(issueFixVersions.map(iv => iv.issue_id))];
            if (issueIds.length > 0) {
                const placeholders = issueIds.map(() => '?').join(',');
                await connection.execute(
                    `DELETE FROM bts_issue_fix_versions WHERE issue_id IN (${placeholders})`,
                    issueIds
                );
            }

            // Insert new fix versions
            for (const issueFixVersion of issueFixVersions) {
                await this.insertOrUpdate(connection, 'bts_issue_fix_versions', issueFixVersion);
            }

            await connection.commit();
            console.log(`Saved ${issueFixVersions.length} issue fix versions to database`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving issue fix versions:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save changelogs
    async saveChangelogs(changelogs: DatabaseChangelog[]): Promise<void> {
        if (changelogs.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const changelog of changelogs) {
                await this.insertOrUpdate(connection, 'bts_changelogs', changelog, [
                    'created', 'author_id', 'items'
                ]);
            }

            await connection.commit();
            console.log(`Saved ${changelogs.length} changelogs to database`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving changelogs:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save subtasks
    async saveSubtasks(subtasks: DatabaseSubtask[]): Promise<void> {
        if (subtasks.length === 0) return;

        const connection = await this.pool.getConnection();
        try {
            await connection.beginTransaction();

            for (const subtask of subtasks) {
                await this.insertOrUpdate(connection, 'bts_subtasks', subtask, [
                    'name', 'self'
                ]);
            }

            await connection.commit();
            console.log(`Saved ${subtasks.length} subtasks to database`);
        } catch (error) {
            await connection.rollback();
            console.error('Error saving subtasks:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Save all entities at once
    async saveAllEntities(entities: {
        users: DatabaseUser[];
        projects: DatabaseProject[];
        fixVersions: DatabaseFixVersion[];
        issues: DatabaseIssue[];
        components: DatabaseComponent[];
        labels: DatabaseLabel[];
        issueFixVersions: DatabaseIssueFixVersion[];
        changelogs?: DatabaseChangelog[];
        subtasks?: DatabaseSubtask[];
    }): Promise<void> {
        console.log('Saving all entities to database...');

        try {
            // Save in dependency order
            await this.saveUsers(entities.users);
            await this.saveProjects(entities.projects);
            // Status is now handled directly in issues as status_name
            await this.saveFixVersions(entities.fixVersions);
            await this.saveIssues(entities.issues);
            await this.saveComponents(entities.components);
            await this.saveLabels(entities.labels);
            await this.saveIssueFixVersions(entities.issueFixVersions);

            if (entities.changelogs) {
                await this.saveChangelogs(entities.changelogs);
            }

            if (entities.subtasks) {
                await this.saveSubtasks(entities.subtasks);
            }

            console.log('Successfully saved all entities to database');
        } catch (error) {
            console.error('Error saving entities:', error);
            throw error;
        }
    }

    // Get project by key
    async getProjectByKey(projectKey: string): Promise<DatabaseProject | null> {
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM bts_projects WHERE `key` = ?',
                [projectKey]
            );

            const projects = rows as DatabaseProject[];
            return projects.length > 0 ? projects[0] || null : null;
        } finally {
            connection.release();
        }
    }

    // Get issue by key
    async getIssueByKey(issueKey: string): Promise<DatabaseIssue | null> {
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM bts_issues WHERE `key` = ?',
                [issueKey]
            );

            const issues = rows as DatabaseIssue[];
            return issues.length > 0 ? issues[0] || null : null;
        } finally {
            connection.release();
        }
    }

    // Get count of issues by project
    async getIssueCountByProject(projectKey: string): Promise<number> {
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.execute(
                'SELECT COUNT(*) as count FROM bts_issues bi JOIN bts_projects bp ON bi.project_id = bp.id WHERE bp.`key` = ?',
                [projectKey]
            );

            const result = rows as any[];
            return result[0]?.count || 0;
        } finally {
            connection.release();
        }
    }

    // Check if issue exists
    async issueExists(issueKey: string): Promise<boolean> {
        const issue = await this.getIssueByKey(issueKey);
        return issue !== null;
    }

    // Get last updated issue
    async getLastUpdatedIssue(): Promise<DatabaseIssue | null> {
        const connection = await this.pool.getConnection();
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM bts_issues ORDER BY updated DESC LIMIT 1'
            );

            const issues = rows as DatabaseIssue[];
            return issues.length > 0 ? issues[0] || null : null;
        } finally {
            connection.release();
        }
    }
}

export default DatabaseService;

