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
    project_type?: string;
    description?: string;
    lead_account_id?: string;
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
    project_id: string;
    assignee_id?: string;
    reporter_id?: string;
    fix_version_id?: string;
    created: Date;
    updated: Date;
    time_estimate?: number;
    time_original_estimate?: number;
    resolved_date: Date;
    custom_fields: string; // JSON string
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

    // Map Jira user to database user
    static mapUser(jiraUser: JiraUser, userId?: string): DatabaseUser {
        const result: DatabaseUser = {
            id: jiraUser.accountId || `user_${Date.now()}`,
            user_id: userId || jiraUser.accountId || `user_${Date.now()}`,
            account_id: jiraUser.accountId,
            display_name: jiraUser.displayName,
            active: jiraUser.active
        };

        if (jiraUser.emailAddress) {
            result.email_address = jiraUser.emailAddress;
        }

        return result;
    }

    // Map Jira project to database project
    static mapProject(jiraProject: JiraProject): DatabaseProject {
        const result: DatabaseProject = {
            id: jiraProject.id,
            key: jiraProject.key,
            name: jiraProject.name,
            self: jiraProject.self
        };

        if (jiraProject.projectType) {
            result.project_type = jiraProject.projectType;
        }
        if (jiraProject.description) {
            result.description = jiraProject.description;
        }
        if (jiraProject.lead?.accountId) {
            result.lead_account_id = jiraProject.lead.accountId;
        }

        return result;
    }

    // Map Jira issue status to database status
    static mapStatus(jiraStatus: any): DatabaseStatus {
        return {
            id: jiraStatus.id,
            name: jiraStatus.name,
            description: jiraStatus.description,
            status_category: JSON.stringify(jiraStatus.statusCategory || {})
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
            id: jiraIssue.id,
            key: jiraIssue.key,
            self: jiraIssue.self || jiraIssue.url,
            summary: fields.summary || jiraIssue.summary || '',
            status_id: fields.status?.id || fields.status?.name || 'unknown',
            project_id: fields.project?.id || 'unknown',
            created,
            updated,
            resolved_date: resolvedDate,
            custom_fields: JSON.stringify(customFields)
        };

        if (timeEstimate !== undefined) {
            result.time_estimate = timeEstimate;
        }
        if (timeOriginalEstimate !== undefined) {
            result.time_original_estimate = timeOriginalEstimate;
        }

        if (fields.assignee?.accountId || fields.assignee?.name) {
            result.assignee_id = fields.assignee.accountId || fields.assignee.name;
        }
        if (fields.reporter?.accountId || fields.reporter?.name) {
            result.reporter_id = fields.reporter.accountId || fields.reporter.name;
        }
        if (fields.fixVersions?.[0]?.id) {
            result.fix_version_id = fields.fixVersions[0].id;
        }

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
            issueFixVersions: this.mapIssueFixVersions(jiraIssue)
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
                projectType: (fields.project as any).projectType,
                description: (fields.project as any).description,
                lead: (fields.project as any).lead
            };
            project = this.mapProject(projectData);
        } else {
            // Create minimal project if not available
            project = {
                id: 'unknown',
                key: 'unknown',
                name: 'Unknown Project',
                self: 'unknown',
                project_type: 'unknown'
            };
        }

        // Extract status
        const status = this.mapStatus(fields.status || { id: 'unknown', name: 'Unknown', category: 'Unknown' });

        // Extract fix versions
        const fixVersions = (fields.fixVersions || []).map((fv: any) =>
            this.mapFixVersion(fv, fields.project?.id || 'unknown')
        );

        return {
            ...entities,
            users,
            project,
            status,
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

