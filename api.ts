import axios, { AxiosResponse } from "axios";
import { logVisitHistory } from "../utils/wikiCommon";
import { parse } from "csv-parse";
import { camelCase } from "es-toolkit/string";
import { differenceWith, groupBy } from "es-toolkit/array";
import { TUserProfile, TVisitHistory } from "../../types/WikiTypes";
import { queryWikiUserByID } from "../daos/WIKI/queries/queryWikiUserByID";
import { createManyUserByUserKeys } from "../daos/WIKI/inserts/upsertWIKIUsers";
import Bottleneck from "bottleneck";

const headers = {
    "content-type": "application/json",
    Authorization: `Bearer ${process.env.WIKI_TOKEN}`,
};

const limiter = new Bottleneck({
    minTime: 500, // 100ms between requests (10 per second)
    maxConcurrent: 2, // Max 10 concurrent requests
});

export const getUserByUserKey = async (userKey: string) => {
    return limiter.schedule(() =>
        axios.get(`https://wiki.com/rest/api/user?key=${userKey}`, {
            headers,
        })
    ) as Promise<AxiosResponse<TUserProfile>>;
};

export const getWikiPageInfo = async (pageId: string) => {
    const pageInfoResponse = await limiter.schedule(() =>
        axios.get(`https://wiki.com/rest/api/content/${pageId}`, {
            headers,
        })
    );
    return pageInfoResponse.data;
};

export const getWikiViewInfo = async (pageId: string) => {
    const viewsResponse = await limiter.schedule(() =>
        axios.get(
            `https://wiki.com/rest/viewtracker/1.0/visits/contents/${pageId}/total`,
            { headers }
        )
    );
    return viewsResponse.data;
};

export const getWikiChildrenPage = async (pageId: string) => {
    const childrenResponse = await limiter.schedule(() =>
        axios.get(
            `https://wiki.com/rest/api/content/${pageId}/child/page?limit=1000`,
            { headers }
        )
    );
    return childrenResponse.data;
};

export const getWikiPageVersion = async (pageId: string) => {
    const versions = await limiter.schedule(() =>
        axios.get(
            `https://wiki.com/rest/experimental/content/${pageId}/version`,
            {
                headers,
            }
        )
    );
    return versions.data;
};

export const getWikiViewHistory = async (pageId: string) => {
    const views = await limiter.schedule(() =>
        axios.get(
            `https://wiki.com/rest/viewtracker/1.0/report/contents/${pageId}/visitors?limit=1000&startDate=2021-01-01&endDate=2026-01-01`,
            { headers }
        )
    );
    return views.data;
};

export const getVisitHistoryByUserName = async (pageId: string) => {
    try {
        logVisitHistory("info", "Getting visits...");
        const visitHistory = await limiter.schedule(() =>
            axios(
                `https://wiki.com/rest/viewtracker/1.0/visits/contents/${pageId}?startDate=2021-01-01&endDate=2026-01-01`,
                { headers }
            )
        );
        const parser = parse(visitHistory.data, {
            columns: (header) => header.map((column: string) => camelCase(column)),
        });
        const visits: TVisitHistory[] = [];

        logVisitHistory("info", "Processing visits...");

        for await (const record of parser) {
            visits.push({
                ...record,
                username: record.username,
            });
        }
        return groupBy(visits, (visit) => visit.username);
    } catch (err) {
        logVisitHistory("error", err);
    }
};

export const getPageInfo = async (pageId: string) => {
    try {
        const pageInfo = await getWikiPageInfo(pageId);
        const views = await getWikiViewInfo(pageId);
        const childrenResponse = await getWikiChildrenPage(pageId);
        const childPageIds = childrenResponse.results.map((child: any) => child.id);

        return {
            pageId: pageInfo.id,
            title: pageInfo.title,
            url: `https://wiki.com${pageInfo._links.webui}`,
            views: views.count,
            lastModifiedBy: pageInfo.version.by.displayName,
            createdBy: {
                username: pageInfo.history.createdBy.username,
                userKey: pageInfo.history.createdBy.userKey,
                displayName: pageInfo.history.createdBy.displayName,
            },
            numberOfVersions: pageInfo.version.number,
            childPageIds: childPageIds,
            createdAt: pageInfo.history.createdDate,
        };
    } catch (error) {
        console.error(`Error fetching data for pageId ${pageId}:`, error);
        throw error;
    }
};

export function mapVisitHistoryToUserKey(
    visitByUserId: Record<string, TVisitHistory[]>,
    users: { userId: string; userKey: string }[]
) {
    const visitByUserKey: Record<string, TVisitHistory[]> = {};
    users.forEach((user) => {
        visitByUserKey[user.userKey] =
            visitByUserId[user.userId] ||
            visitByUserId[user.userId.toUpperCase()] ||
            visitByUserId[user.userId.toLowerCase()];
    });
    return visitByUserKey;
}

export async function getVisitHistoryByUserKey(
    pageId: string,
    userKeys: string[]
) {
    try {
        const visitHistoryByUserName = await getVisitHistoryByUserName(pageId);
        if (!visitHistoryByUserName) {
            logVisitHistory("info", "NO Visit History, exit...");
            return;
        }
        const userNames = Object.keys(visitHistoryByUserName);

        let foundUsers = await queryWikiUserByID(userNames);

        const notExistUserKey = differenceWith(
            userKeys,
            foundUsers.map((t) => t.userKey),
            (a, b) => a.toLowerCase() === b.toLowerCase()
        );

        const insertedUsers = await createManyUserByUserKeys(notExistUserKey);
        if (!insertedUsers) {
            logVisitHistory("error", "Fail to insert users");
            return;
        }
        foundUsers = [
            ...foundUsers,
            ...insertedUsers.map((u) => ({
                userId: u.userId,
                userKey: u.userKey,
            })),
        ];

        logVisitHistory("info", `Inserted ${insertedUsers.length} new users`);

        return mapVisitHistoryToUserKey(visitHistoryByUserName, foundUsers);
    } catch (err) {
        logVisitHistory("error", "Error in getting visit history", err);
    }
}
