import { TVisitHistory } from "../../../types/WikiTypes";
import {
    getVisitHistoryByUserKey,
    getWikiViewHistory,
} from "../../services/fetchWikiPages";
import { logPage } from "../../utils/wikiCommon";
import { upsertWIKIViews } from "./inserts/upsertWIKIViews";

export const storeWikiViews = async (pageId: string) => {
    try {
        const viewsInfo = await getWikiViewHistory(pageId);
        const viewsData = viewsInfo.results as Array<{
            lastViewDateFormatted: Date;
            userKey: string;
            views: number;
        }>;
        const visitByUserKey = await getVisitHistoryByUserKey(
            pageId,
            viewsData.map((t) => t.userKey)
        );

        for (const view of viewsData) {
            console.log("======SAVE-VIEW=======", view.userKey);
            await upsertWIKIViews({
                pageId: pageId,
                userKey: view.userKey,
                total: view.views,
                lastView: new Date(view.lastViewDateFormatted),
                visitHistory: visitByUserKey?.[view.userKey] || [],
            });
        }
        logPage("info", `Insert view history page: ${pageId} successfully!`);
    } catch (err) {
        logPage("info", ">>>>>>>>>>>>>>>>>", { pageId });
        logPage("error", err);
    }
    2;
};

import axios from "axios";
import { Nullable } from "../../../types/WikiTypes";
import db from "../../../prisma/db";
import { storeWikiViews } from "./storeWikiViews";
import { logPage } from "../../utils/wikiCommon";
import { upsertWIKIPages } from "./inserts/upsertWIKIPages";
import { upsertWIKIUsers } from "./inserts/upsertWIKIUsers";

export async function storeWikiData(
    pageInfo: any,
    nearestParentId: Nullable<string>,
    parentPageIDs: string[]
) {
    try {
        const { userKey, username, displayName } = pageInfo.createdBy;
        const { id } = await upsertWIKIUsers(userKey, username, displayName);

        const parentPageIDsString = parentPageIDs ? parentPageIDs.join(",") : null;

        await upsertWIKIPages(id, pageInfo, parentPageIDsString, nearestParentId);

        await storeWikiViews(pageInfo.pageId);

        logPage(
            "info",
            `Insert view history page: ${pageInfo.pageId} successfully!`
        );
    } catch (error) {
        logPage("error", `Error saving page info to database:`, error);
        throw error;
    }
}

import { Prisma } from "@prisma/client";
import { getWikiPageVersion } from "../../services/fetchWikiPages";
import { logContributor } from "../../utils/wikiCommon";
import { queryWikiContributors } from "./queries/queryWikiContributors";
import { fetchUserByNvId } from "../../services/fetchUserByLogin";
import { createManyContributor } from "./inserts/upsertWIKIContributors";

export const storeWikiContributors = async (pageId: string) => {
    try {
        const versions = await getWikiPageVersion(pageId);
        const versionsDataSize = versions.size;

        const contributorPerPage = await queryWikiContributors(pageId);
        if (
            versionsDataSize ===
            Number(contributorPerPage?.[0]?._count.confluencePageId)
        ) {
            return logContributor("info", "Already in sync");
        }
        const users: Prisma.WikiUserCreateManyInput[] = [];
        const contributors: Prisma.WikiContributorCreateManyInput[] = [];

        if (!versions) return logContributor("info", "Versions data is empty");

        logContributor("info", "Getting info...");
        for (const contributor of versions.results) {
            contributors.push({
                createByUserKey: contributor?.by?.userKey,
                confluencePageId: pageId,
                when: contributor?.when,
                version: contributor?.number,
            });

            const emp = await fetchUserByNvId(contributor.by.username);

            users.push({
                userId: contributor?.by.username.toUpperCase(),
                userKey: contributor?.by.userKey,
                displayName: contributor?.by.displayName,
                avatarUrl: emp.photoPath,
                roles: emp.fullDeptNm,
            });
        }

        logContributor("info", "Inserting...");
        try {
            const createdContributors = await createManyContributor(
                users,
                contributors
            );

            logContributor("info", "Insert DONE!");
            return {
                createdContributors,
            };
        } catch (error) {
            logContributor("error", "Insert fail - Transaction was rollback", error);
        }
    } catch (error) {
        logContributor("error", error);
    }
};

import db from "../../../prisma/db";
import { Nullable } from "../../../types/WikiTypes";
import { getPageInfo } from "../../services/fetchWikiPages";
import { logContributor } from "../../utils/wikiCommon";
import { storeWikiContributors } from "./storeWikiContributors";
import { storeWikiData } from "./storeWikiData";

export async function crawlAndStoreWikiData(pageId: string) {
    let pageCount = 0;

    const crawlPageTreeRecursively = async (
        currentPageId: string,
        nearestParentId: Nullable<string>,
        parentPageIDs: string[] = []
    ) => {
        try {
            const pageInfo = await getPageInfo(currentPageId);

            const currentParentPageIDs = [...parentPageIDs, currentPageId];

            await storeWikiData(pageInfo, nearestParentId, currentParentPageIDs);
            pageCount++;

            logContributor("info", "Start inserting Contributor");
            await storeWikiContributors(currentPageId);

            const newParentPageIDs = currentParentPageIDs
                ? [...currentParentPageIDs, currentPageId]
                : [currentPageId];
            for (const childId of pageInfo.childPageIds) {
                await crawlPageTreeRecursively(
                    childId,
                    currentPageId,
                    newParentPageIDs
                );
            }
        } catch (error) {
            console.error(`Error crawling pageId ${currentPageId}:`, error);
        }
    };

    try {
        await crawlPageTreeRecursively(pageId, null);

        await db.wikiHistoryCrawlPages.create({
            data: {
                crawlAt: new Date().toISOString(),
                pageCrawled: pageCount,
            },
        });

        console.log(
            `Crawling and storing page data completed successfully with ${pageCount} pages`
        );
    } catch (error) {
        console.log(error);
        throw new Error(`Error crawling and storing page data: ${error}`);
    }
}
import { Prisma } from "@prisma/client";
import db from "../../../../prisma/db";

export const queryWikiContributors = async (pageId: string) => {
    return db.wikiContributor.groupBy({
        by: "confluencePageId",
        where: {
            confluencePageId: {
                contains: pageId,
            },
        },
        _count: {
            confluencePageId: true,
        },
    });
};

import db from "../../../../prisma/db";

export async function queryWikiUserByID(id: string[]) {
    return db.wikiUser.findMany({
        where: {
            userId: {
                in: id,
                mode: "insensitive",
            },
        },
        select: {
            userKey: true,
            userId: true,
        },
    });
}
