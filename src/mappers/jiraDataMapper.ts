import { JiraProject, JiraUser, JiraSearchResult } from '../services/mcpJiraService.js';

export interface DatabaseUser {
    id: string;
    user_id: string;
    account_id: string;
    display_name: string;
    email_address?: string;
    active: boolean;
}

export interface DatabaseProject {
    id: string;
    key: string;
    name: string;
    self: string;
    project_type_key?: string;
    archived?: boolean;
    project_category_self?: string;
    project_category_id?: string;
    project_category_name?: string;
    project_category_description?: string;
}

export interface DatabaseStatus {
    id: string;
    name: string;
    description?: string;
    status_category: string;
}

export interface DatabaseComponent {
    id: string;
    name: string;
    description?: string;
    self: string;
    issue_id: string;
}

export interface DatabaseFixVersion {
    id: string;
    self: string;
    name: string;
    description?: string;
    archived: boolean;
    released: boolean;
    release_date?: Date;
    project_id: string;
}

export interface DatabaseIssue {
    id: string;
    key: string;
    self: string;
    summary: string;
    status_id: string;
    status_name?: string;
    project_id: string;
    project_key?: string;
    project_name?: string;
    assignee_id?: string;
    assignee_name?: string;
    reporter_id?: string;
    reporter_name?: string;
    issue_type_id?: string;
    issue_type_name?: string;
    priority_id?: string;
    priority_name?: string;
    created: Date;
    updated: Date;
    time_estimate?: number;
    time_original_estimate?: number;
    resolved_date: Date;
    description?: string;
    labels?: string; // JSON string
    components?: string; // JSON string
    fix_versions?: string; // JSON string
    attachments?: string; // JSON string
    subtasks?: string; // JSON string
}

export interface DatabaseChangelog {
    id: string;
    issue_id: string;
    created: Date;
    author_id: string;
    items: string; // JSON string
}

export interface DatabaseSubtask {
    id: string;
    name: string;
    self: string;
    issue_id: string;
}

export interface DatabaseLabel {
    issue_id: string;
    label_name: string;
}

export interface DatabaseIssueFixVersion {
    issue_id: string;
    fix_version_id: string;
}

export class JiraDataMapper {
    // Helper function to convert undefined to null for MySQL compatibility
    private static nullify(value: any): any {
        return value === undefined ? null : value;
    }

    // Map Jira user to database user
    static mapUser(jiraUser: JiraUser, userId?: string): DatabaseUser {
        // Handle company MCP server format where accountId might be null but name/email exist
        const userIdentifier = jiraUser.accountId || jiraUser.name || `user_${Date.now()}`;
        const userEmail = jiraUser.emailAddress || (jiraUser as any).email;
        const userDisplayName = jiraUser.displayName || jiraUser.name;

        const result: DatabaseUser = {
            id: this.nullify(userIdentifier),
            user_id: this.nullify(userId) || this.nullify(userIdentifier),
            account_id: this.nullify(jiraUser.accountId),
            display_name: this.nullify(userDisplayName),
            email_address: this.nullify(userEmail),
            active: this.nullify(jiraUser.active)
        };

        return result;
    }

    // Map Jira project to database project
    static mapProject(jiraProject: JiraProject): DatabaseProject {
        const result: DatabaseProject = {
            id: this.nullify(jiraProject.id),
            key: this.nullify(jiraProject.key),
            name: this.nullify(jiraProject.name),
            self: this.nullify(jiraProject.self),
            project_type_key: this.nullify(jiraProject.projectTypeKey),
            archived: jiraProject.archived ?? false,
            project_category_self: this.nullify(jiraProject.projectCategory?.self),
            project_category_id: this.nullify(jiraProject.projectCategory?.id),
            project_category_name: this.nullify(jiraProject.projectCategory?.name),
            project_category_description: this.nullify(jiraProject.projectCategory?.description)
        };

        return result;
    }

    // Map Jira issue status to database status
    static mapStatus(jiraStatus: any): DatabaseStatus {
        return {
            // Use name as id if id is null (for company MCP server compatibility)
            id: this.nullify(jiraStatus.id || jiraStatus.name),
            name: this.nullify(jiraStatus.name),
            description: this.nullify(jiraStatus.description),
            status_category: this.nullify(JSON.stringify(jiraStatus.statusCategory || {}))
        };
    }

    // Map Jira component to database component
    static mapComponent(jiraComponent: any, issueId: string): DatabaseComponent {
        return {
            id: jiraComponent.id,
            name: jiraComponent.name,
            description: jiraComponent.description,
            self: jiraComponent.self,
            issue_id: issueId
        };
    }

    // Map Jira fix version to database fix version
    static mapFixVersion(jiraFixVersion: any, projectId: string): DatabaseFixVersion {
        return {
            id: jiraFixVersion.id,
            self: jiraFixVersion.self,
            name: jiraFixVersion.name,
            description: jiraFixVersion.description,
            archived: jiraFixVersion.archived,
            released: jiraFixVersion.released,
            release_date: jiraFixVersion.releaseDate ? new Date(jiraFixVersion.releaseDate) : new Date(),
            project_id: projectId
        };
    }

    // Map Jira issue to database issue
    static mapIssue(jiraIssue: any): DatabaseIssue {
        // Handle both formats: with fields wrapper and without
        const fields = jiraIssue.fields || jiraIssue;

        // Extract custom fields (exclude standard fields)
        const customFields: any = {};
        const standardFields = [
            'summary', 'description', 'status', 'assignee', 'reporter', 'labels',
            'priority', 'created', 'updated', 'issuetype', 'project', 'fixVersions',
            'components', 'customfield_10014', 'customfield_10011'
        ];

        if (fields && typeof fields === 'object') {
            for (const [key, value] of Object.entries(fields)) {
                if (!standardFields.includes(key) && key.startsWith('customfield_')) {
                    customFields[key] = value;
                }
            }
        }

        // Parse time estimates
        let timeEstimate: number | undefined;
        let timeOriginalEstimate: number | undefined;

        if (fields['timeestimate']) {
            timeEstimate = typeof fields['timeestimate'] === 'string'
                ? parseInt(fields['timeestimate'])
                : fields['timeestimate'];
        }

        if (fields['timeoriginalestimate']) {
            timeOriginalEstimate = typeof fields['timeoriginalestimate'] === 'string'
                ? parseInt(fields['timeoriginalestimate'])
                : fields['timeoriginalestimate'];
        }

        // Parse dates
        const created = new Date(fields.created || jiraIssue.created);
        const updated = new Date(fields.updated || jiraIssue.updated);
        const resolvedDate = new Date(fields.updated || jiraIssue.updated); // Use updated as resolved date

        const result: DatabaseIssue = {
            id: this.nullify(jiraIssue.id),
            key: this.nullify(jiraIssue.key),
            self: this.nullify(jiraIssue.self || jiraIssue.url),
            summary: this.nullify(fields.summary || jiraIssue.summary || ''),
            // Use name as id if id is null (for company MCP server compatibility)
            status_id: this.nullify(fields.status?.id || fields.status?.name || 'unknown'),
            status_name: this.nullify(fields.status?.name),
            project_id: this.nullify(fields.project?.id || 'unknown'),
            project_key: this.nullify(fields.project?.key),
            project_name: this.nullify(fields.project?.name),
            created,
            updated,
            resolved_date: resolvedDate,
            description: this.nullify(fields.description),
            // Use name as id if id is null (for company MCP server compatibility)
            issue_type_id: this.nullify(fields.issuetype?.id || fields.issue_type?.id || fields.issuetype?.name || fields.issue_type?.name),
            issue_type_name: this.nullify(fields.issuetype?.name || fields.issue_type?.name),
            // Use name as id if id is null (for company MCP server compatibility)
            priority_id: this.nullify(fields.priority?.id || fields.priority?.name),
            priority_name: this.nullify(fields.priority?.name),
            labels: this.nullify(JSON.stringify(fields.labels || [])),
            components: this.nullify(JSON.stringify(fields.components || [])),
            fix_versions: this.nullify(JSON.stringify(fields.fixVersions || [])),
            attachments: this.nullify(JSON.stringify(fields.attachments || [])),
            subtasks: this.nullify(JSON.stringify(fields.subtasks || []))
        };

        if (timeEstimate !== undefined) {
            result.time_estimate = timeEstimate;
        }
        if (timeOriginalEstimate !== undefined) {
            result.time_original_estimate = timeOriginalEstimate;
        }

        if (fields.assignee?.accountId || fields.assignee?.name) {
            result.assignee_id = this.nullify(fields.assignee.accountId || fields.assignee.name);
            result.assignee_name = this.nullify(fields.assignee.display_name);
        }
        if (fields.reporter?.accountId || fields.reporter?.name) {
            result.reporter_id = this.nullify(fields.reporter.accountId || fields.reporter.name);
            result.reporter_name = this.nullify(fields.reporter.display_name);
        }
        // fix_versions is already handled as JSON field above

        return result;
    }

    // Map Jira changelog to database changelog
    static mapChangelog(jiraChangelog: any, issueId: string): DatabaseChangelog {
        return {
            id: jiraChangelog.id,
            issue_id: issueId,
            created: new Date(jiraChangelog.created),
            author_id: jiraChangelog.authorId,
            items: JSON.stringify(jiraChangelog.items || [])
        };
    }

    // Map Jira subtask to database subtask
    static mapSubtask(jiraSubtask: any, issueId: string): DatabaseSubtask {
        return {
            id: jiraSubtask.id,
            name: jiraSubtask.name,
            self: jiraSubtask.self,
            issue_id: issueId
        };
    }

    // Map Jira issue labels to database labels
    static mapLabels(jiraIssue: any): DatabaseLabel[] {
        const fields = jiraIssue.fields || jiraIssue;
        if (!fields || !fields.labels) {
            return [];
        }
        return fields.labels.map((label: string) => ({
            issue_id: jiraIssue.id,
            label_name: label
        }));
    }

    // Map Jira issue fix versions to database issue fix versions
    static mapIssueFixVersions(jiraIssue: any): DatabaseIssueFixVersion[] {
        const fields = jiraIssue.fields || jiraIssue;
        return (fields.fixVersions || []).map((fixVersion: any) => ({
            issue_id: jiraIssue.id,
            fix_version_id: fixVersion.id
        }));
    }

    // Map Jira issue components to database components
    static mapIssueComponents(jiraIssue: any): DatabaseComponent[] {
        const fields = jiraIssue.fields || jiraIssue;
        return (fields.components || []).map((component: any) =>
            this.mapComponent(component, jiraIssue.id)
        );
    }

    // Extract all entities from a Jira issue
    static extractAllEntities(jiraIssue: any) {
        const entities = {
            issue: this.mapIssue(jiraIssue),
            labels: this.mapLabels(jiraIssue),
            components: this.mapIssueComponents(jiraIssue),
            issueFixVersions: this.mapIssueFixVersions(jiraIssue),
            status: null as DatabaseStatus | null
        };

        // Handle both formats: with fields wrapper and without
        const fields = jiraIssue.fields || jiraIssue;

        // Extract users
        const users: DatabaseUser[] = [];
        if (fields.assignee) {
            users.push(this.mapUser(fields.assignee));
        }
        if (fields.reporter) {
            users.push(this.mapUser(fields.reporter));
        }

        // Extract project - handle case where project might not exist
        let project: DatabaseProject;
        if (fields.project) {
            const projectData: JiraProject = {
                id: fields.project.id,
                key: fields.project.key,
                name: fields.project.name,
                self: (fields.project as any).self || fields.project.id,
                projectTypeKey: (fields.project as any).projectTypeKey,
                archived: (fields.project as any).archived,
                projectCategory: (fields.project as any).projectCategory
            };
            project = this.mapProject(projectData);
        } else {
            // Extract project key from issue key (e.g., "ADVANCED_A-112" -> "ADVANCED_A")
            const issueKey = jiraIssue.key || '';
            const projectKey = issueKey.split('-')[0] || 'unknown';

            // Create project with extracted key - this will be updated when projects are saved
            project = {
                id: projectKey, // Use project key as id since we don't have real project id
                key: projectKey,
                name: `${projectKey} Project`, // Generic name since we don't have real project name
                self: projectKey,
                project_type_key: 'unknown',
                archived: false
            };
        }

        // Extract status
        if (fields.status) {
            entities.status = this.mapStatus(fields.status);
        } else {
            // Create a default status if none exists
            entities.status = {
                id: 'unknown',
                name: 'Unknown Status',
                description: 'Unknown status',
                status_category: '{}'
            };
        }

        // Extract fix versions
        const fixVersions = (fields.fixVersions || []).map((fv: any) =>
            this.mapFixVersion(fv, fields.project?.id || 'unknown')
        );

        return {
            ...entities,
            users,
            project,
            status: entities.status,
            fixVersions
        };
    }

    // Extract all entities from search results
    static extractAllEntitiesFromSearch(searchResult: JiraSearchResult) {
        const allEntities = {
            issues: [] as DatabaseIssue[],
            users: [] as DatabaseUser[],
            projects: [] as DatabaseProject[],
            statuses: [] as DatabaseStatus[],
            fixVersions: [] as DatabaseFixVersion[],
            components: [] as DatabaseComponent[],
            labels: [] as DatabaseLabel[],
            issueFixVersions: [] as DatabaseIssueFixVersion[]
        };

        const uniqueUsers = new Map<string, DatabaseUser>();
        const uniqueProjects = new Map<string, DatabaseProject>();
        const uniqueStatuses = new Map<string, DatabaseStatus>();
        const uniqueFixVersions = new Map<string, DatabaseFixVersion>();

        for (const jiraIssue of searchResult.issues) {
            const entities = this.extractAllEntities(jiraIssue);

            // Add issue
            allEntities.issues.push(entities.issue);

            // Add unique users
            for (const user of entities.users) {
                if (!uniqueUsers.has(user.account_id)) {
                    uniqueUsers.set(user.account_id, user);
                    allEntities.users.push(user);
                }
            }

            // Add unique project
            if (!uniqueProjects.has(entities.project.id)) {
                uniqueProjects.set(entities.project.id, entities.project);
                allEntities.projects.push(entities.project);
            }

            // Add unique status
            if (!uniqueStatuses.has(entities.status.id)) {
                uniqueStatuses.set(entities.status.id, entities.status);
                allEntities.statuses.push(entities.status);
            }

            // Add unique fix versions
            for (const fixVersion of entities.fixVersions) {
                if (!uniqueFixVersions.has(fixVersion.id)) {
                    uniqueFixVersions.set(fixVersion.id, fixVersion);
                    allEntities.fixVersions.push(fixVersion);
                }
            }

            // Add components
            allEntities.components.push(...entities.components);

            // Add labels
            allEntities.labels.push(...entities.labels);

            // Add issue fix versions
            allEntities.issueFixVersions.push(...entities.issueFixVersions);
        }

        return allEntities;
    }
}

export default JiraDataMapper;

