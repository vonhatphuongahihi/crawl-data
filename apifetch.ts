import db from "../../../../prisma/db";

export async function upsertWIKIPages(
    dbUserId: number,
    pageInfo: any,
    parentPageIDsString: any,
    nearestParentId: any
) {
    console.log("=============UPSERT-WIKI-PAGE==============");
    try {
        await db.wikiPages.upsert({
            where: { pageId: pageInfo.pageId },
            update: {
                title: pageInfo.title,
                url: pageInfo.url,
                views: pageInfo.views,
                lastModifiedBy: pageInfo.lastModifiedBy,
                numberOfVersions: pageInfo.numberOfVersions,
                parentPageIDs: parentPageIDsString || "",
                createdById: dbUserId,
                createdAt: new Date(pageInfo.createdAt),
                nearestParentId,
            },
            create: {
                pageId: pageInfo.pageId,
                title: pageInfo.title,
                url: pageInfo.url,
                views: pageInfo.views,
                lastModifiedBy: pageInfo.lastModifiedBy,
                numberOfVersions: pageInfo.numberOfVersions,
                parentPageIDs: parentPageIDsString || "",
                createdById: dbUserId,
                createdAt: new Date(pageInfo.createdAt),
                nearestParentId,
            },
        });
    } catch (err) {
        console.log(pageInfo);
    }
}

import { Prisma } from "@prisma/client";
import db from "../../../../prisma/db";
import { TEmp, TUserProfile } from "../../../../types/WikiTypes";
import { fetchUserByNvId } from "../../../services/fetchUserByLogin";
import { getUserByUserKey } from "../../../services/fetchWikiPages";
import { logUser } from "../../../utils/wikiCommon";
import { insertEmployee } from "../../insertEmployee";
import { getEmployeeByNvId } from "../../query/getEmployee";

export const insertManyUserAndReturn = async (
    users: Prisma.WikiUserCreateManyInput[],
    skipDuplicates: boolean = true
) => {
    return db.wikiUser.createManyAndReturn({
        data: users,
        skipDuplicates,
    });
};

export async function upsertWIKIUsers(
    userKey: string,
    nvId: string,
    displayName: string
) {
    console.log("=============UPSERT-WIKI-USER==============");
    try {
        const upperCaseNvId = nvId.toUpperCase();
        const existingEmp = await getEmployeeByNvId(upperCaseNvId);
        const isResigned = displayName.includes("Unknown");
        if (!existingEmp) {
            await insertEmployee(upperCaseNvId);
        }
        const userInfo = await fetchUserByNvId(upperCaseNvId);
        const avatarUrl = userInfo.photoPath || "";
        const roles = userInfo.fullDeptNm || "";
        if (displayName.includes("Unknown")) {
            displayName = userInfo.empNm || "";
        }
        const englishName = userInfo.engNm || "";

        const wikiUser = await db.wikiUser.upsert({
            where: { userKey: userKey },
            update: {
                userId: upperCaseNvId,
                displayName,
                englishName,
                avatarUrl,
                roles,
                isResigned,
            },
            create: {
                userId: upperCaseNvId,
                userKey: userKey,
                displayName,
                avatarUrl,
                roles,
                englishName,
                isResigned,
            },
        });

        await db.employees.update({
            where: { id: upperCaseNvId },
            data: {
                isResigned,
            },
        });
        return wikiUser;
    } catch (err) {
        console.log({ userKey, nvId, displayName });
        throw err;
    }
}

export const createManyUserByUserKeys = async (userKeys: string[]) => {
    try {
        const res = await Promise.allSettled(
            userKeys.map((key) => getUserByUserKey(key))
        );

        const promiseAvatarAndRoles: Promise<TEmp>[] = [];

        const userProfiles = res.reduce<TUserProfile[]>((acc, r) => {
            if (r.status === "rejected") {
                logUser("error", `Fail to getting user profile`);
                return acc;
            }

            if (r.status === "fulfilled") {
                promiseAvatarAndRoles.push(fetchUserByNvId(r.value.data.username));
                acc.push(r.value.data);
            }
            return acc;
        }, []);

        const avatarAndRoles = (
            await Promise.allSettled(promiseAvatarAndRoles)
        ).reduce<Record<string, TEmp>>((acc, r) => {
            if (r.status === "rejected") {
                logUser("error", `Fail to getting avatar and roles`);
                return acc;
            }
            if (r.status === "fulfilled") {
                acc[r.value.empNo] = {
                    avatarUrl: r.value.avatarUrl,
                    roles: r.value.roles,
                    empNo: r.value.empNo,
                };
            }
            return acc;
        }, {});

        const listUserInfo: Prisma.WikiUserCreateManyInput[] = userProfiles.map(
            (u) => {
                const userName = u.username;
                return {
                    userId: u.username,
                    userKey: u.userKey,
                    displayName: u.displayName,
                    avatarUrl: avatarAndRoles[userName].avatarUrl || "",
                    roles: avatarAndRoles[userName].roles || "",
                };
            }
        );
        for (const user of listUserInfo) {
            await upsertWIKIUsers(user.userKey, user.userId, user.displayName);
        }
        return await insertManyUserAndReturn(listUserInfo);
    } catch (err) {
        logUser("error", "Fail to create many user by user keys");
    }
};

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
