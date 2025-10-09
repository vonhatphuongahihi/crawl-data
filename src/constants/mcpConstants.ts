// MCP Jira Service Constants

export const MCP_JIRA_TOOLS = {
    // Project operations
    GET_ALL_PROJECTS: 'jira_get_all_projects',
    GET_PROJECT_ISSUES: 'jira_get_project_issues',
    GET_PROJECT_VERSIONS: 'jira_get_project_versions',

    // User operations
    GET_USER_PROFILE: 'jira_get_user_profile',

    // Issue operations
    GET_ISSUE: 'jira_get_issue',
    SEARCH_ISSUES: 'jira_search',
    UPDATE_ISSUE: 'jira_update_issue',
    DELETE_ISSUE: 'jira_delete_issue',
    CREATE_ISSUE: 'jira_create_issue',
    BATCH_CREATE_ISSUES: 'jira_batch_create_issues',

    // Search operations
    SEARCH_FIELDS: 'jira_search_fields',

    // Transition operations
    GET_TRANSITIONS: 'jira_get_transitions',
    TRANSITION_ISSUE: 'jira_transition_issue',

    // Worklog operations
    GET_WORKLOG: 'jira_get_worklog',
    ADD_WORKLOG: 'jira_add_worklog',

    // Attachment operations
    DOWNLOAD_ATTACHMENTS: 'jira_download_attachments',

    // Board operations
    GET_AGILE_BOARDS: 'jira_get_agile_boards',
    GET_BOARD_ISSUES: 'jira_get_board_issues',

    // Sprint operations
    GET_SPRINTS_FROM_BOARD: 'jira_get_sprints_from_board',
    GET_SPRINT_ISSUES: 'jira_get_sprint_issues',
    CREATE_SPRINT: 'jira_create_sprint',
    UPDATE_SPRINT: 'jira_update_sprint',

    // Link operations
    GET_LINK_TYPES: 'jira_get_link_types',
    CREATE_ISSUE_LINK: 'jira_create_issue_link',
    CREATE_REMOTE_ISSUE_LINK: 'jira_create_remote_issue_link',
    REMOVE_ISSUE_LINK: 'jira_remove_issue_link',

    // Epic operations
    LINK_TO_EPIC: 'jira_link_to_epic',

    // Version operations
    CREATE_VERSION: 'jira_create_version',
    BATCH_CREATE_VERSIONS: 'jira_batch_create_versions',

    // Comment operations
    ADD_COMMENT: 'jira_add_comment',

    // Changelog operations
    BATCH_GET_CHANGELOGS: 'jira_batch_get_changelogs'
} as const;

export const DEFAULT_JQL_FIELDS = 'labels,summary,updated,priority,issuetype,assignee,status,description,created,reporter';

export const ALL_FIELDS = '*all';

export const DEFAULT_PAGE_SIZE = 50;

export const MAX_PAGE_SIZE = 100;

export const CRAWL_CONFIG = {
    BATCH_SIZE: 50,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // milliseconds
    TIMEOUT: 30000, // 30 seconds
    CONCURRENT_REQUESTS: 5
} as const;

export const DATABASE_TABLES = {
    USERS: 'bts_users',
    PROJECTS: 'bts_projects',
    STATUSES: 'bts_statuses',
    ISSUES: 'bts_issues',
    COMPONENTS: 'bts_components',
    CHANGELOGS: 'bts_changelogs',
    SUBTASKS: 'bts_subtasks',
    FIX_VERSIONS: 'fix_versions',
    LABELS: 'bts_labels',
    ISSUE_FIX_VERSIONS: 'bts_issue_fix_versions',
    SNAPSHOT_ISSUES: 'bts_snapshot_issues'
} as const;

export const JIRA_FIELD_MAPPINGS = {
    EPIC_LINK: 'customfield_10014',
    EPIC_NAME: 'customfield_10011',
    EPIC_COLOR: 'customfield_10012',
    SPRINT: 'customfield_10020',
    STORY_POINTS: 'customfield_10016',
    TIME_ESTIMATE: 'timeestimate',
    TIME_ORIGINAL_ESTIMATE: 'timeoriginalestimate',
    TIME_SPENT: 'timespent'
} as const;

export const ISSUE_TYPES = {
    EPIC: 'Epic',
    STORY: 'Story',
    TASK: 'Task',
    BUG: 'Bug',
    SUBTASK: 'Sub-task'
} as const;

export const STATUS_CATEGORIES = {
    TO_DO: 'To Do',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done'
} as const;

export const PRIORITIES = {
    HIGHEST: 'Highest',
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
    LOWEST: 'Lowest'
} as const;

export const SPRINT_STATES = {
    FUTURE: 'future',
    ACTIVE: 'active',
    CLOSED: 'closed'
} as const;

export const BOARD_TYPES = {
    SCRUM: 'scrum',
    KANBAN: 'kanban'
} as const;

export const LINK_TYPES = {
    RELATES_TO: 'Relates to',
    BLOCKS: 'Blocks',
    IS_BLOCKED_BY: 'Is blocked by',
    DUPLICATE: 'Duplicate',
    IS_DUPLICATE_OF: 'Is duplicate of'
} as const;

export const TRANSITION_NAMES = {
    START_PROGRESS: 'Start Progress',
    STOP_PROGRESS: 'Stop Progress',
    RESOLVE: 'Resolve',
    CLOSE: 'Close',
    REOPEN: 'Reopen',
    START_REVIEW: 'Start Review',
    APPROVE: 'Approve',
    REJECT: 'Reject'
} as const;

export const CUSTOM_FIELD_PREFIXES = {
    CUSTOM_FIELD: 'customfield_',
    EPIC: 'epic_',
    SPRINT: 'sprint_',
    STORY_POINTS: 'story_points_'
} as const;

export const ERROR_CODES = {
    AUTHENTICATION_FAILED: 'AUTH_FAILED',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    BAD_REQUEST: 'BAD_REQUEST'
} as const;

export const LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
} as const;

export default {
    MCP_JIRA_TOOLS,
    DEFAULT_JQL_FIELDS,
    ALL_FIELDS,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    CRAWL_CONFIG,
    DATABASE_TABLES,
    JIRA_FIELD_MAPPINGS,
    ISSUE_TYPES,
    STATUS_CATEGORIES,
    PRIORITIES,
    SPRINT_STATES,
    BOARD_TYPES,
    LINK_TYPES,
    TRANSITION_NAMES,
    CUSTOM_FIELD_PREFIXES,
    ERROR_CODES,
    LOG_LEVELS
};

