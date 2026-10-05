import { findByProps } from "@vendetta/metro";
import { before, after } from "@vendetta/patcher";
import { storage } from "@vendetta/plugin";
import { logger } from "@vendetta";
import { React, ReactNative as RN } from "@vendetta/metro/common";
import { findInReactTree } from "@vendetta/utils";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import Settings from "./Settings";

const ActionSheet = findByProps("openLazy", "hideActionSheet");
const { ActionSheetRow } = findByProps("ActionSheetRow");

const ThreadIcon =
    getAssetIDByName("ic_thread") ??
    getAssetIDByName("ThreadIcon") ??
    getAssetIDByName("ic_search") ??
    getAssetIDByName("search");

const THREAD_TYPES = [10, 11, 12];

function openChannel(guildId: string, channelId: string) {
    // Deep link is the most reliable way to navigate across Discord versions
    RN.Linking.openURL(`https://discord.com/channels/${guildId}/${channelId}`);
}

function getRest() {
    return findByProps("get", "post", "del", "patch");
}

// Strategy 1: same as doing it by hand — search the channel for messages mentioning the user
async function findThreadBySearch(guildId: string, parentId: string, userId: string): Promise<string | null> {
    const RestAPI = getRest();
    for (let attempt = 0; attempt < 3; attempt++) {
        const res = await RestAPI.get({
            url: `/guilds/${guildId}/messages/search`,
            query: { channel_id: parentId, mentions: userId, include_nsfw: true },
        });
        // 202 = search index not ready yet, retry shortly
        if (res.status === 202) {
            await new Promise((r) => setTimeout(r, res.body?.retry_after ? res.body.retry_after * 1000 : 1000));
            continue;
        }
        const hits: any[] = (res.body?.messages ?? []).flat();
        // Hit may be the thread's starter message (has .thread) or a message inside the thread
        for (const m of hits) {
            if (m.thread?.id) return m.thread.id;
        }
        const ChannelStore = findByProps("getChannel", "getMutableGuildChannelsForGuild");
        for (const m of hits) {
            const ch = ChannelStore?.getChannel?.(m.channel_id);
            if (ch && THREAD_TYPES.includes(ch.type)) return m.channel_id;
        }
        // Fall back to first hit's channel if it's not the parent itself
        const other = hits.find((m) => m.channel_id !== parentId);
        if (other) return other.channel_id;
        return null;
    }
    return null;
}

// Strategy 2: look at active + archived threads of the parent channel and match by name
async function findThreadByName(guildId: string, parentId: string, user: any): Promise<string | null> {
    const RestAPI = getRest();
    const needles = [user.id, user.username, user.globalName, user.global_name]
        .filter(Boolean)
        .map((s: string) => s.toLowerCase());

    const matches = (t: any) => {
        const name = (t.name ?? "").toLowerCase();
        return needles.some((n) => name.includes(n));
    };

    try {
        const active = await RestAPI.get({ url: `/guilds/${guildId}/threads/active` });
        const t = (active.body?.threads ?? []).find((t: any) => t.parent_id === parentId && matches(t));
        if (t) return t.id;
    } catch (e) {
        logger.log("[ViewThread] active threads failed: " + String(e));
    }

    try {
        const arch = await RestAPI.get({
            url: `/channels/${parentId}/threads/archived/public`,
            query: { limit: 100 },
        });
        const t = (arch.body?.threads ?? []).find(matches);
        if (t) return t.id;
    } catch (e) {
        logger.log("[ViewThread] archived threads failed: " + String(e));
    }
    return null;
}

async function viewThread(guildId: string, user: any) {
    const parentId: string = storage.threadChannelId;
    if (!parentId) {
        showToast("View Thread: set the thread channel ID in plugin settings", getAssetIDByName("Small"));
        return;
    }
    try {
        let threadId = await findThreadBySearch(guildId, parentId, user.id);
        if (!threadId) threadId = await findThreadByName(guildId, parentId, user);

        if (!threadId) {
            showToast(`No thread found for ${user.username}`, getAssetIDByName("Small"));
            return;
        }
        openChannel(guildId, threadId);
    } catch (err) {
        logger.log("[ViewThread] Error: " + String(err));
        showToast("View Thread failed, check logs", getAssetIDByName("Small"));
    }
}

let unpatchOpenLazy: (() => void) | null = null;

export default {
    onLoad() {
        storage.threadChannelId ??= "";

        unpatchOpenLazy = before("openLazy", ActionSheet, ([comp, args, msg]) => {
            if (args !== "MessageLongPressActionSheet" || !msg?.message) return;

            const author = msg.message.author;
            if (!author?.id) return;

            const ChannelStore = findByProps("getChannel", "getMutableGuildChannelsForGuild");
            const channel = ChannelStore?.getChannel?.(msg.message.channel_id);
            const guildId: string | undefined = channel?.guild_id;
            if (!guildId) return; // not in a server

            comp.then((instance: any) => {
                const unpatch = after("default", instance, (_: any, component: any) => {
                    React.useEffect(() => () => { unpatch(); }, []);

                    const groups: any[] = findInReactTree(
                        component,
                        (c: any) => Array.isArray(c) && c[0]?.type?.name === "ActionSheetRowGroup"
                    );
                    if (!groups?.length) {
                        logger.warn("[ViewThread] Could not find ActionSheetRowGroups");
                        return;
                    }

                    const button = React.createElement(ActionSheetRow, {
                        label: "View thread",
                        icon: React.createElement(ActionSheetRow.Icon, { source: ThreadIcon }),
                        onPress: () => {
                            ActionSheet.hideActionSheet();
                            viewThread(guildId, author);
                        },
                    });

                    // Insert at the top of the first group that contains rows
                    for (const group of groups) {
                        const rows: any[] = findInReactTree(
                            group,
                            (c: any) => Array.isArray(c) && c.some((child: any) => child?.type?.name === "ActionSheetRow")
                        );
                        if (rows) {
                            rows.unshift(button);
                            return;
                        }
                    }

                    groups.splice(0, 0, React.createElement(ActionSheetRow.Group, null, button));
                });
            });
        });

        logger.log("[ViewThread] Loaded.");
    },

    onUnload() {
        unpatchOpenLazy?.();
        unpatchOpenLazy = null;
        logger.log("[ViewThread] Unloaded.");
    },

    settings: Settings,
};
