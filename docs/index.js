(function () {
function require(id) {
  switch (id) {
    case "@vendetta": return vendetta;
    case "@vendetta/patcher": return vendetta.patcher;
    case "@vendetta/metro": return vendetta.metro;
    case "@vendetta/metro/common": return vendetta.metro.common;
    case "@vendetta/utils": return vendetta.utils;
    case "@vendetta/ui": return vendetta.ui;
    case "@vendetta/ui/assets": return vendetta.ui.assets;
    case "@vendetta/ui/toasts": return vendetta.ui.toasts;
    case "@vendetta/ui/components": return vendetta.ui.components;
    case "@vendetta/storage": return vendetta.storage;
    case "@vendetta/plugin": return vendetta.plugin;
    case "@vendetta/commands": return vendetta.commands;
    default: throw new Error("[ViewThread] Unknown module: " + id);
  }
}
var module = { exports: {} };
var exports = module.exports;
'use strict';

Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: 'Module' } });

const metro = require('@vendetta/metro');
const patcher = require('@vendetta/patcher');
const plugin = require('@vendetta/plugin');
const _vendetta = require('@vendetta');
const common = require('@vendetta/metro/common');
const utils = require('@vendetta/utils');
const assets = require('@vendetta/ui/assets');
const toasts = require('@vendetta/ui/toasts');
const components = require('@vendetta/ui/components');
const storage = require('@vendetta/storage');

const { FormSection, FormInput, FormText, FormRow, FormSwitchRow } = components.Forms;

// ---- options ----
const MAX_LIST = 12;      // threads shown in list mode (newest first)
const PREVIEW_COUNT = 3;  // recent messages shown per thread in list mode

function Settings() {
  storage.useProxy(plugin.storage);
  const h = common.React.createElement;
  let modeRow = null;
  if (FormSwitchRow) {
    modeRow = h(FormSwitchRow, {
      label: "Show thread list",
      subLabel: "Off: open the most recent thread automatically. On: list every thread found for that user, with recent messages and dates, and pick one.",
      value: !!plugin.storage.listMode,
      onValueChange: (v) => plugin.storage.listMode = !!v
    });
  } else if (FormRow) {
    modeRow = h(FormRow, {
      label: "Mode: " + (plugin.storage.listMode ? "show thread list" : "open most recent thread"),
      subLabel: "Tap to switch",
      onPress: () => plugin.storage.listMode = !plugin.storage.listMode
    });
  }
  return h(
    FormSection,
    { title: "View Thread", android_noDivider: true },
    h(FormInput, {
      title: "Thread channel ID",
      placeholder: "ID of the channel where the bot creates threads",
      value: plugin.storage.threadChannelId,
      onChange: (v) => plugin.storage.threadChannelId = v.trim()
    }),
    modeRow,
    h(FormText, { style: { paddingHorizontal: 16, paddingBottom: 8 } }, 'Long-press a message and tap "View thread". Enable Developer Mode, then long-press the channel and use Copy Channel ID.')
  );
}

var _a, _b, _c;
const ActionSheetModule = metro.findByProps("ActionSheetRow");
const ActionSheet = metro.findByProps("openLazy", "hideActionSheet");
const { ActionSheetRow } = ActionSheetModule;
const ThreadIcon = (_c = (_b = (_a = assets.getAssetIDByName("ic_thread")) != null ? _a : assets.getAssetIDByName("ThreadIcon")) != null ? _b : assets.getAssetIDByName("ic_search")) != null ? _c : assets.getAssetIDByName("search");
const THREAD_TYPES = [10, 11, 12];

function openChannel(guildId, channelId) {
  var _a2;
  const path = `/channels/${guildId}/${channelId}`;
  try {
    const Router = (_a2 = metro.findByProps("transitionTo", "transitionToGuild")) != null ? _a2 : metro.findByProps("transitionTo");
    if (typeof (Router == null ? void 0 : Router.transitionTo) === "function") {
      Router.transitionTo(path);
      return true;
    }
  } catch (e) {
    _vendetta.logger.log("[ViewThread] transitionTo failed: " + String(e));
  }
  try {
    const Router = metro.findByProps("transitionToGuild");
    if (typeof (Router == null ? void 0 : Router.transitionToGuild) === "function") {
      Router.transitionToGuild(guildId, channelId);
      return true;
    }
  } catch (e) {
    _vendetta.logger.log("[ViewThread] transitionToGuild failed: " + String(e));
  }
  return false;
}
function getRest() {
  return metro.findByProps("get", "post", "del", "patch");
}
function copyToClipboard(text) {
  var _a2, _b2;
  try {
    const cb = (_a2 = common.clipboard) != null ? _a2 : metro.findByProps("setString", "getString");
    (_b2 = cb == null ? void 0 : cb.setString) == null ? void 0 : _b2.call(cb, text);
  } catch (e) {
    _vendetta.logger.log("[ViewThread] clipboard failed: " + String(e));
  }
}
const norm = (s) => String(s != null ? s : "").toLowerCase();
function getNeedles(guildId, user) {
  var _a2;
  let nick;
  try {
    const MemberStore = metro.findByProps("getNick", "getMember");
    nick = (_a2 = MemberStore == null ? void 0 : MemberStore.getNick) == null ? void 0 : _a2.call(MemberStore, guildId, user.id);
  } catch {
  }
  return [user.username, user.globalName, user.global_name, nick, user.id].filter(Boolean).map(norm);
}
async function safeGet(url, query) {
  var _a2, _b2, _c2, _d, _e, _f, _g;
  try {
    return await getRest().get({ url, query });
  } catch (e) {
    const status = (_c2 = (_b2 = e == null ? void 0 : e.status) != null ? _b2 : (_a2 = e == null ? void 0 : e.response) == null ? void 0 : _a2.status) != null ? _c2 : "ERR";
    _vendetta.logger.log(`[ViewThread] GET ${url} failed (${status}): ${String((_f = (_e = (_d = e == null ? void 0 : e.body) == null ? void 0 : _d.message) != null ? _e : e == null ? void 0 : e.message) != null ? _f : "")}`);
    return { status, body: (_g = e == null ? void 0 : e.body) != null ? _g : null, error: true };
  }
}
const st = (res) => {
  var _a2;
  return String((_a2 = res == null ? void 0 : res.status) != null ? _a2 : "?");
};

// snowflake -> unix ms (Number math is precise enough for display/sorting)
const toTs = (id) => Number(id) / 4194304 + 14200704e5;
const pad2 = (n) => String(n).padStart(2, "0");
function fmtDate(ms) {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "?";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

async function getChannelInfo(channelId) {
  const ChannelStore = metro.findByProps("getChannel", "getMutableGuildChannelsForGuild");
  const local = ChannelStore && ChannelStore.getChannel ? ChannelStore.getChannel(channelId) : null;
  if (local) {
    return {
      id: channelId,
      parent_id: local.parent_id,
      type: local.type,
      name: local.name,
      last_message_id: local.lastMessageId,
      archived: !!(local.threadMetadata && local.threadMetadata.archived)
    };
  }
  const res = await safeGet(`/channels/${channelId}`);
  const ch = res && res.body;
  return ch && ch.id ? {
    id: ch.id,
    parent_id: ch.parent_id,
    type: ch.type,
    name: ch.name,
    last_message_id: ch.last_message_id,
    archived: !!(ch.thread_metadata && ch.thread_metadata.archived)
  } : null;
}

// Collects EVERY thread in the thread channel that belongs to the user, newest activity first.
async function findThreads(guildId, parentId, user, diag) {
  try {
    const UserStore = metro.findByProps("getUser", "getCurrentUser");
    const real = UserStore && UserStore.getUser ? UserStore.getUser(user.id) : null;
    if (real && real.username) user = { ...user, username: real.username, globalName: real.globalName != null ? real.globalName : user.globalName };
  } catch {
  }
  diag.push(`@username=${user.username} display=${user.globalName != null ? user.globalName : user.global_name != null ? user.global_name : "?"}`);
  const clean = (s) => norm(s).replace(/[^a-z0-9À-￿]/g, "");
  const needles = getNeedles(guildId, user).map(clean).filter((n) => n.length >= 3);
  const nameMatches = (t) => {
    const name = clean(t && t.name);
    return !!name && needles.some((n) => name === n || (n.length >= 5 && name.includes(n)));
  };
  const stripEdge = (s) => s.replace(/^[^\w]+|[^\w]+$/g, "");
  const searchNames = [...new Set(
    [user.username, user.globalName != null ? user.globalName : user.global_name].filter(Boolean).map((s) => stripEdge(String(s))).filter((s) => s.length >= 2)
  )];

  const found = new Map();
  const add = (t, archived) => {
    if (!t || !t.id || found.has(t.id)) return;
    const lastId = t.last_message_id || t.lastMessageId || t.id;
    const meta = t.thread_metadata || t.threadMetadata;
    const isArchived = archived != null ? archived : t.archived != null ? t.archived : !!(meta && meta.archived);
    found.set(t.id, { id: t.id, name: t.name, archived: isArchived, ts: toTs(lastId) });
  };

  // 1. threads the client already knows about
  try {
    const ChannelStore = metro.findByProps("getChannel", "getMutableGuildChannelsForGuild");
    const all = Object.values(ChannelStore && ChannelStore.getMutableGuildChannelsForGuild ? ChannelStore.getMutableGuildChannelsForGuild(guildId) || {} : {});
    diag.push(`local channels: ${all.length}`);
    for (const c of all) {
      if (c && c.parent_id === parentId && nameMatches(c)) add(c);
    }
  } catch (e) {
    _vendetta.logger.log("[ViewThread] local lookup failed: " + String(e));
  }

  // 2. thread search by name (active and archived)
  for (const archived of [false, true]) {
    for (const q of searchNames) {
      const res = await safeGet(`/channels/${parentId}/threads/search`, {
        name: q,
        limit: 25,
        sort_by: "last_message_time",
        sort_order: "desc",
        archived
      });
      const threads = res && res.body && res.body.threads ? res.body.threads : [];
      diag.push(`thread search "${q}" archived=${archived}: status ${st(res)}, ${threads.length} results`);
      for (const t of threads) {
        if (nameMatches(t)) add(t);
      }
    }
  }

  // 3. active threads of the whole server
  const active = await safeGet(`/guilds/${guildId}/threads/active`);
  const activeThreads = active && active.body && active.body.threads ? active.body.threads : [];
  diag.push(`active threads: status ${st(active)}, ${activeThreads.length} results`);
  for (const t of activeThreads) {
    if (t.parent_id === parentId && nameMatches(t)) add(t, false);
  }

  // 4. crawl the archive, only when nothing was found yet
  if (!found.size) {
    for (const kind of ["public", "private"]) {
      let beforeTs;
      for (let page = 0; page < 10; page++) {
        const query = { limit: 100 };
        if (beforeTs) query.before = beforeTs;
        const res = await safeGet(`/channels/${parentId}/threads/archived/${kind}`, query);
        const threads = res && res.body && res.body.threads ? res.body.threads : [];
        if (page === 0) {
          diag.push(`archived ${kind}: status ${st(res)}, ${threads.length} on page 1`);
          if (threads.length) diag.push(`  sample names: ${threads.slice(0, 5).map((t2) => t2.name).join(" | ")}`);
        }
        for (const t of threads) {
          if (nameMatches(t)) add(t, true);
        }
        if (!(res && res.body && res.body.has_more) || !threads.length) break;
        const last = threads[threads.length - 1];
        beforeTs = last && last.thread_metadata ? last.thread_metadata.archive_timestamp : void 0;
        if (!beforeTs) break;
      }
    }
  }

  // 5. last resort: messages that mention the user (a thread only counts if its name matches)
  if (!found.size) {
    for (const withChannel of [true, false]) {
      const query = { mentions: user.id, include_nsfw: true };
      if (withChannel) query.channel_id = parentId;
      let res = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        res = await safeGet(`/guilds/${guildId}/messages/search`, query);
        if (res && res.status === 202) {
          await new Promise((r) => setTimeout(r, ((res.body && res.body.retry_after) != null ? res.body.retry_after : 1) * 1e3));
          continue;
        }
        break;
      }
      const hits = ((res && res.body && res.body.messages) != null ? res.body.messages : []).flat();
      diag.push(`message search${withChannel ? " in channel" : ""}: status ${st(res)}, ${hits.length} hits`);
      for (const m of hits) {
        if (m.thread && m.thread.id && nameMatches(m.thread)) add(m.thread);
      }
      for (const m of hits.slice(0, 10)) {
        const info = await getChannelInfo(m.channel_id);
        diag.push(`  hit channel ${m.channel_id} parent=${info && info.parent_id != null ? info.parent_id : "?"} type=${info && info.type != null ? info.type : "?"} name=${info && info.name != null ? info.name : "?"}`);
        if (m.channel_id !== parentId && info && info.parent_id === parentId && THREAD_TYPES.includes(info.type) && nameMatches(info)) {
          add(info);
        }
        if (m.channel_id === parentId) {
          const startInfo = await getChannelInfo(m.id);
          if (startInfo && startInfo.parent_id === parentId && THREAD_TYPES.includes(startInfo.type) && nameMatches(startInfo)) add(startInfo);
        }
      }
      if (found.size) break;
    }
  }

  const list = Array.from(found.values()).sort((a, b) => b.ts - a.ts);
  diag.push(`threads found: ${list.length}`);
  return list;
}

async function loadPreviews(t) {
  const res = await safeGet(`/channels/${t.id}/messages`, { limit: PREVIEW_COUNT });
  if (!res || res.error || !Array.isArray(res.body)) throw new Error("status " + st(res));
  return res.body.map((m) => {
    const author = m.author ? m.author.global_name || m.author.username || "?" : "?";
    let text = String(m.content || "").replace(/\s+/g, " ").trim();
    if (!text) {
      text = m.attachments && m.attachments.length ? "[attachment]" : m.embeds && m.embeds.length ? "[embed]" : m.sticker_items && m.sticker_items.length ? "[sticker]" : "[no text]";
    }
    if (text.length > 80) text = text.slice(0, 80) + "…";
    return { ts: Date.parse(m.timestamp), author, text };
  });
}

function openThread(guildId, threadId, name) {
  _vendetta.logger.log(`[ViewThread] opening ${threadId} (${name != null ? name : "?"})`);
  toasts.showToast(`Thread: ${name ? name : threadId}`, assets.getAssetIDByName("Small"));
  if (!openChannel(guildId, threadId)) {
    const link = `https://discord.com/channels/${guildId}/${threadId}`;
    copyToClipboard(link);
    toasts.showToast("Couldn't open it in-app, thread link copied to clipboard", assets.getAssetIDByName("Small"));
  }
}

function threadSummary(t) {
  const lines = [`${t.archived ? "Archived" : "Active"} · last activity ${fmtDate(t.ts)}`];
  if (t.previews && t.previews.length) {
    for (const p of t.previews) lines.push(`${fmtDate(p.ts)} · ${p.author}: ${p.text}`);
  } else {
    lines.push(t.previewError ? "(couldn't load messages)" : "(no messages)");
  }
  return lines.join("\n");
}

// list mode: bottom sheet with every thread found, newest first
function ThreadList(props) {
  const h = common.React.createElement;
  const RN = common.ReactNative;
  const Wrap = ActionSheetModule && ActionSheetModule.ActionSheet ? ActionSheetModule.ActionSheet : RN.View;
  const rows = props.items.map((t) => h(FormRow, {
    key: t.id,
    label: t.name || t.id,
    subLabel: threadSummary(t),
    trailing: FormRow.Arrow ? h(FormRow.Arrow) : void 0,
    onPress: () => {
      ActionSheet.hideActionSheet();
      openThread(props.guildId, t.id, t.name);
    }
  }));
  return h(
    Wrap,
    null,
    h(
      RN.ScrollView,
      { style: { maxHeight: Math.round(RN.Dimensions.get("window").height * 0.75) } },
      h(FormSection, { title: `Threads for ${props.user.username} (${props.items.length})`, android_noDivider: true }, ...rows)
    )
  );
}

async function showList(guildId, user, threads) {
  const top = threads.slice(0, MAX_LIST);
  await Promise.all(top.map(async (t) => {
    try {
      t.previews = await loadPreviews(t);
    } catch (e) {
      t.previews = [];
      t.previewError = true;
    }
  }));
  const Comp = () => common.React.createElement(ThreadList, { guildId, user, items: top });
  try {
    ActionSheet.openLazy(Promise.resolve({ default: Comp }), "ViewThreadList", {});
  } catch (e) {
    const text = top.map((t) => `${t.name} (${t.id})\n${threadSummary(t)}`).join("\n\n");
    _vendetta.logger.log("[ViewThread] list sheet failed: " + String(e) + "\n" + text);
    copyToClipboard(text);
    toasts.showToast("Couldn't show the list, thread list copied to clipboard", assets.getAssetIDByName("Small"));
  }
}

async function viewThread(guildId, user) {
  const parentId = plugin.storage.threadChannelId;
  if (!parentId) {
    toasts.showToast("View Thread: set the thread channel ID in plugin settings", assets.getAssetIDByName("Small"));
    return;
  }
  const diag = [];
  try {
    const threads = await findThreads(guildId, parentId, user, diag);
    if (!threads.length) {
      const report = `[ViewThread] No thread for ${user.username} (${user.id})
guild ${guildId}, thread channel ${parentId}
` + diag.join("\n");
      _vendetta.logger.log(report);
      copyToClipboard(report);
      toasts.showToast(`No thread for ${user.username} (debug info copied to clipboard)`, assets.getAssetIDByName("Small"));
      return;
    }
    if (plugin.storage.listMode) {
      await showList(guildId, user, threads);
      return;
    }
    // auto mode: newest thread by last activity
    openThread(guildId, threads[0].id, threads[0].name);
  } catch (err) {
    const report = `[ViewThread] Error: ${String(err)}
${diag.join("\n")}`;
    _vendetta.logger.log(report);
    copyToClipboard(report);
    toasts.showToast("View Thread failed (details copied to clipboard)", assets.getAssetIDByName("Small"));
  }
}

let unpatchOpenLazy = null;
const index = {
  onLoad() {
    var _a2, _b2;
    (_b2 = (_a2 = plugin.storage).threadChannelId) != null ? _b2 : _a2.threadChannelId = "";
    if (plugin.storage.listMode === void 0) plugin.storage.listMode = false;
    unpatchOpenLazy = patcher.before("openLazy", ActionSheet, ([comp, args, msg]) => {
      var _a3;
      if (args !== "MessageLongPressActionSheet" || !(msg == null ? void 0 : msg.message)) return;
      const author = msg.message.author;
      if (!(author == null ? void 0 : author.id)) return;
      const ChannelStore = metro.findByProps("getChannel", "getMutableGuildChannelsForGuild");
      const channel = (_a3 = ChannelStore == null ? void 0 : ChannelStore.getChannel) == null ? void 0 : _a3.call(ChannelStore, msg.message.channel_id);
      const guildId = channel == null ? void 0 : channel.guild_id;
      if (!guildId) return;
      comp.then((instance) => {
        const unpatch = patcher.after("default", instance, (_, component) => {
          common.React.useEffect(() => () => {
            unpatch();
          }, []);
          const groups = utils.findInReactTree(
            component,
            (c) => {
              var _a4, _b3;
              return Array.isArray(c) && ((_b3 = (_a4 = c[0]) == null ? void 0 : _a4.type) == null ? void 0 : _b3.name) === "ActionSheetRowGroup";
            }
          );
          if (!(groups == null ? void 0 : groups.length)) {
            _vendetta.logger.warn("[ViewThread] Could not find ActionSheetRowGroups");
            return;
          }
          const button = common.React.createElement(ActionSheetRow, {
            label: "View thread",
            icon: common.React.createElement(ActionSheetRow.Icon, { source: ThreadIcon }),
            onPress: () => {
              ActionSheet.hideActionSheet();
              viewThread(guildId, author);
            }
          });
          for (const group of groups) {
            const rows = utils.findInReactTree(
              group,
              (c) => Array.isArray(c) && c.some((child) => {
                var _a4;
                return ((_a4 = child == null ? void 0 : child.type) == null ? void 0 : _a4.name) === "ActionSheetRow";
              })
            );
            if (rows) {
              rows.unshift(button);
              return;
            }
          }
          groups.splice(0, 0, common.React.createElement(ActionSheetRow.Group, null, button));
        });
      });
    });
    _vendetta.logger.log("[ViewThread] Loaded.");
  },
  onUnload() {
    unpatchOpenLazy == null ? void 0 : unpatchOpenLazy();
    unpatchOpenLazy = null;
    _vendetta.logger.log("[ViewThread] Unloaded.");
  },
  settings: Settings
};

exports.default = index;
return module.exports;
})();
