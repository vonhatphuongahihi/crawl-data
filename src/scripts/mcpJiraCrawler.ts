import fs from 'fs';
import path from 'path';
import { MCPJiraService } from '../services/mcpJiraService.js';
import { DatabaseService } from '../services/databaseService.js';
import { JiraDataMapper } from '../mappers/jiraDataMapper.js';
import {
    CRAWL_CONFIG,
    ALL_FIELDS,
    DEFAULT_PAGE_SIZE
} from '../constants/mcpConstants.js';

export interface CrawlConfig {
    jiraUrl: string;
    username: string;
    apiToken: string;
    projectKeys?: string[];
    includeArchivedProjects?: boolean;
    batchSize?: number;
    maxIssues?: number;
    includeChangelog?: boolean;
    includeWorklog?: boolean;
    includeAttachments?: boolean;
    outputDir?: string;
}

export interface CrawlProgress {
    totalProjects: number;
    completedProjects: number;
    totalIssues: number;
    completedIssues: number;
    currentProject?: string;
    currentIssue?: string;
    errors: string[];
    startTime: Date;
    endTime?: Date;
}

export class MCPJiraCrawler {
    private jiraService: MCPJiraService;
    private databaseService: DatabaseService;
    private config: CrawlConfig;
    private progress: CrawlProgress;

    constructor(config: CrawlConfig) {
        this.config = {
            batchSize: CRAWL_CONFIG.BATCH_SIZE,
            includeArchivedProjects: false,
            includeChangelog: true,
            includeWorklog: false,
            includeAttachments: false,
            outputDir: './output',
            ...config
        };

        this.jiraService = new MCPJiraService(
            this.config.jiraUrl,
            this.config.username,
            this.config.apiToken
        );

        this.databaseService = new DatabaseService();

        this.progress = {
            totalProjects: 0,
            completedProjects: 0,
            totalIssues: 0,
            completedIssues: 0,
            errors: [],
            startTime: new Date()
        };
    }

    async start(): Promise<void> {
        console.log('🚀 Starting MCP Jira Crawler...');
        console.log(`📊 Configuration:`, {
            jiraUrl: this.config.jiraUrl,
            username: this.config.username,
            projectKeys: this.config.projectKeys || 'All projects',
            batchSize: this.config.batchSize,
            maxIssues: this.config.maxIssues || 'No limit',
            includeChangelog: this.config.includeChangelog,
            includeWorklog: this.config.includeWorklog,
            includeAttachments: this.config.includeAttachments
        });

        try {
            // Connect to MCP service
            console.log('🔌 Connecting to MCP Jira service...');
            await this.jiraService.connect();
            console.log('✅ Connected to MCP Jira service');

            // Create output directory
            if (this.config.outputDir) {
                await fs.promises.mkdir(this.config.outputDir, { recursive: true });
            }

            // Get projects to crawl
            const projects = await this.getProjectsToCrawl();
            this.progress.totalProjects = projects.length;
            console.log(`📁 Found ${projects.length} projects to crawl`);

            // Crawl each project
            for (const project of projects) {
                await this.crawlProject(project);
                this.progress.completedProjects++;
                this.logProgress();
            }

            console.log('🎉 Crawling completed successfully!');
            this.progress.endTime = new Date();
            await this.saveCrawlReport();

        } catch (error) {
            console.error('❌ Crawling failed:', error);
            this.progress.errors.push(`Crawling failed: ${error}`);
            throw error;
        } finally {
            // Cleanup
            await this.cleanup();
        }
    }

    private async getProjectsToCrawl() {
        console.log('🔍 Fetching projects...');

        const allProjects = await this.jiraService.getAllProjects(
            this.config.includeArchivedProjects
        );

        if (this.config.projectKeys && this.config.projectKeys.length > 0) {
            return allProjects.filter(project =>
                this.config.projectKeys!.includes(project.key)
            );
        }

        return allProjects;
    }

    private async crawlProject(project: any): Promise<void> {
        console.log(`\n📂 Crawling project: ${project.key} - ${project.name}`);
        this.progress.currentProject = project.key;

        try {
            // Save project to database
            const projectData = JiraDataMapper.mapProject(project);
            await this.databaseService.saveProjects([projectData]);

            // Get project issues
            const issues = await this.crawlProjectIssues(project.key);
            this.progress.totalIssues += issues.length;

            console.log(`📋 Found ${issues.length} issues in project ${project.key}`);

            // Process issues in batches
            const batches = this.createBatches(issues, this.config.batchSize!);

            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                if (batch) {
                    console.log(`🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} issues)`);

                    await this.processIssueBatch(batch);
                    this.progress.completedIssues += batch.length;
                }

                // Small delay between batches to avoid overwhelming the API
                if (i < batches.length - 1) {
                    await this.sleep(1000);
                }
            }

            console.log(`✅ Completed crawling project: ${project.key}`);

        } catch (error) {
            const errorMsg = `Failed to crawl project ${project.key}: ${error}`;
            console.error(`❌ ${errorMsg}`);
            this.progress.errors.push(errorMsg);
        }
    }

    private async crawlProjectIssues(projectKey: string): Promise<any[]> {
        const allIssues: any[] = [];
        let startAt = 0;
        const limit = DEFAULT_PAGE_SIZE;

        try {
            while (true) {
                const searchResult = await this.jiraService.getProjectIssues(
                    projectKey,
                    limit,
                    startAt
                );

                if (!searchResult.issues || searchResult.issues.length === 0) {
                    break;
                }

                allIssues.push(...searchResult.issues);

                // Check if we've reached the maximum number of issues
                if (this.config.maxIssues && allIssues.length >= this.config.maxIssues) {
                    allIssues.splice(this.config.maxIssues);
                    break;
                }

                // Check if there are more issues
                if (searchResult.issues.length < limit) {
                    break;
                }

                startAt += limit;
                console.log(`📄 Fetched ${allIssues.length} issues so far...`);
            }

            return allIssues;

        } catch (error) {
            console.error(`Error fetching issues for project ${projectKey}:`, error);
            throw error;
        }
    }

    private async processIssueBatch(issues: any[]): Promise<void> {
        const allEntities = JiraDataMapper.extractAllEntitiesFromSearch({
            issues,
            total: issues.length,
            startAt: 0,
            maxResults: issues.length
        });

        // Save basic entities
        await this.databaseService.saveAllEntities(allEntities);

        // Process additional data for each issue
        for (const issue of issues) {
            this.progress.currentIssue = issue.key;

            try {
                await this.processAdditionalIssueData(issue);
            } catch (error) {
                const errorMsg = `Failed to process additional data for issue ${issue.key}: ${error}`;
                console.error(`⚠️  ${errorMsg}`);
                this.progress.errors.push(errorMsg);
            }
        }
    }

    private async processAdditionalIssueData(issue: any): Promise<void> {
        // Get detailed issue data
        const detailedIssue = await this.jiraService.getIssue(
            issue.key,
            ALL_FIELDS,
            this.config.includeChangelog ? 'changelog' : undefined
        );

        // Process changelog if requested
        if (this.config.includeChangelog && (detailedIssue as any).changelog) {
            const changelogs = (detailedIssue as any).changelog.histories.map((history: any) =>
                JiraDataMapper.mapChangelog(history, detailedIssue.id)
            );
            await this.databaseService.saveChangelogs(changelogs);
        }

        // Process worklog if requested
        if (this.config.includeWorklog) {
            try {
                await this.jiraService.getWorklog(issue.key);
                // TODO: Map and save worklog data
                console.log(`📝 Found worklog for issue ${issue.key}`);
            } catch (error) {
                console.warn(`⚠️  Could not fetch worklog for issue ${issue.key}: ${error}`);
            }
        }

        // Download attachments if requested
        if (this.config.includeAttachments) {
            try {
                const attachmentsDir = path.join(this.config.outputDir!, 'attachments', issue.key);
                await fs.promises.mkdir(attachmentsDir, { recursive: true });

                const attachments = await this.jiraService.downloadAttachments(issue.key, attachmentsDir);
                console.log(`📎 Downloaded ${attachments.downloaded?.length || 0} attachments for issue ${issue.key}`);
            } catch (error) {
                console.warn(`⚠️  Could not download attachments for issue ${issue.key}: ${error}`);
            }
        }
    }

    private createBatches<T>(items: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    private async saveCrawlReport(): Promise<void> {
        const report = {
            config: this.config,
            progress: this.progress,
            duration: this.progress.endTime
                ? this.progress.endTime.getTime() - this.progress.startTime.getTime()
                : null,
            summary: {
                totalProjects: this.progress.totalProjects,
                completedProjects: this.progress.completedProjects,
                totalIssues: this.progress.totalIssues,
                completedIssues: this.progress.completedIssues,
                errorCount: this.progress.errors.length,
                successRate: this.progress.totalIssues > 0
                    ? (this.progress.completedIssues / this.progress.totalIssues) * 100
                    : 0
            }
        };

        const reportPath = path.join(this.config.outputDir!, 'crawl-report.json');
        await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`📊 Crawl report saved to: ${reportPath}`);
    }

    private logProgress(): void {
        const projectsProgress = this.progress.totalProjects > 0
            ? (this.progress.completedProjects / this.progress.totalProjects) * 100
            : 0;

        const issuesProgress = this.progress.totalIssues > 0
            ? (this.progress.completedIssues / this.progress.totalIssues) * 100
            : 0;

        console.log(`\n📈 Progress Update:`);
        console.log(`   Projects: ${this.progress.completedProjects}/${this.progress.totalProjects} (${projectsProgress.toFixed(1)}%)`);
        console.log(`   Issues: ${this.progress.completedIssues}/${this.progress.totalIssues} (${issuesProgress.toFixed(1)}%)`);
        console.log(`   Errors: ${this.progress.errors.length}`);

        if (this.progress.currentProject) {
            console.log(`   Current Project: ${this.progress.currentProject}`);
        }
        if (this.progress.currentIssue) {
            console.log(`   Current Issue: ${this.progress.currentIssue}`);
        }
    }

    private async cleanup(): Promise<void> {
        console.log('🧹 Cleaning up...');

        try {
            await this.jiraService.disconnect();
            await this.databaseService.close();
            console.log('✅ Cleanup completed');
        } catch (error) {
            console.error('⚠️  Error during cleanup:', error);
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get current progress
    getProgress(): CrawlProgress {
        return { ...this.progress };
    }

    // Get errors
    getErrors(): string[] {
        return [...this.progress.errors];
    }
}

export default MCPJiraCrawler;

