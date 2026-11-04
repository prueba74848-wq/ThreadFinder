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

const { FormSection, FormInput, FormText } = components.Forms;
function Settings() {
  storage.useProxy(plugin.storage);
  return /* @__PURE__ */ common.React.createElement(FormSection, { title: "View Thread", android_noDivider: true }, /* @__PURE__ */ common.React.createElement(
    FormInput,
    {
      title: "Thread channel ID(s)",
      placeholder: "One ID per server, separated by commas",
      value: plugin.storage.threadChannelId,
      onChange: (v) => plugin.storage.threadChannelId = v
    }
  ), /* @__PURE__ */ common.React.createElement(FormText, { style: { paddingHorizontal: 16, paddingBottom: 8 } }, 'One thread channel per server: paste the IDs separated by commas (example: 123456789012345678, 234567890123456789). The plugin uses the one that belongs to the server you are in. If a channel cannot be matched to its server automatically, write it as serverId:channelId. Long-press a message and tap "View thread". Enable Developer Mode, then long-press a channel and use Copy Channel ID.'));
}

var _a, _b, _c;
const ActionSheet = metro.findByProps("openLazy", "hideActionSheet");
const { ActionSheetRow } = metro.findByProps("ActionSheetRow");
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
  // primary = identifies one account (username, id); secondary = display names, which are not unique
  return {
    primary: [user.username, user.id].filter(Boolean).map(norm),
    secondary: [user.globalName, user.global_name, nick].filter(Boolean).map(norm)
  };
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
async function getChannelInfo(channelId) {
  var _a2;
  const ChannelStore = metro.findByProps("getChannel", "getMutableGuildChannelsForGuild");
  const local = (_a2 = ChannelStore == null ? void 0 : ChannelStore.getChannel) == null ? void 0 : _a2.call(ChannelStore, channelId);
  if (local) return { parent_id: local.parent_id, type: local.type, name: local.name };
  const res = await safeGet(`/channels/${channelId}`);
  const ch = res == null ? void 0 : res.body;
  return (ch == null ? void 0 : ch.id) ? { parent_id: ch.parent_id, type: ch.type, name: ch.name } : null;
}
async function isThreadOf(channelId, parentId) {
  const info = await getChannelInfo(channelId);
  return !!info && info.parent_id === parentId && THREAD_TYPES.includes(info.type);
}
async function findThread(guildId, parentId, user, diag) {
  try {
    const UserStore = metro.findByProps("getUser", "getCurrentUser");
    const real = UserStore && UserStore.getUser ? UserStore.getUser(user.id) : null;
    if (real && real.username) user = { ...user, username: real.username, globalName: real.globalName != null ? real.globalName : user.globalName };
  } catch {
  }
  diag.push(`@username=${user.username} display=${user.globalName != null ? user.globalName : (user.global_name != null ? user.global_name : "?")}`);
  const clean = (s) => norm(s).replace(/[^a-z0-9À-￿]/g, "");
  const { primary: p0, secondary: s0 } = getNeedles(guildId, user);
  const primary = [...new Set(p0.map(clean).filter((n) => n.length >= 2))];
  const secondary = [...new Set(s0.map(clean).filter((n) => n.length >= 3))].filter((n) => !primary.includes(n));
  // 4 = exact username/id, 3 = exact display name/nickname, 1 = partial match.
  // Partial matches are only used when they are the ONLY candidate, never "first one wins".
  const score = (t) => {
    const name = clean(t && t.name);
    if (!name) return 0;
    if (primary.includes(name)) return 4;
    if (secondary.includes(name)) return 3;
    return [...primary, ...secondary].some((n) => n.length >= 5 && name.includes(n)) ? 1 : 0;
  };
  const seen = new Map();
  const consider = (list) => {
    for (const t of list) {
      if (!t || !t.id) continue;
      const s = score(t);
      if (s && (!seen.has(t.id) || seen.get(t.id).score < s)) seen.set(t.id, { score: s, name: t.name });
    }
  };
  const pickExact = () => {
    let best = null;
    for (const [id, v] of seen) {
      if (v.score >= 3 && (!best || v.score > best.score)) best = { id, score: v.score };
    }
    return best ? best.id : null;
  };
  const inParent = (t) => !t.parent_id || t.parent_id === parentId;
  const stripEdge = (s) => s.replace(/^[^\w]+|[^\w]+$/g, "");
  const searchNames = [...new Set(
    [user.username, user.globalName != null ? user.globalName : user.global_name].filter(Boolean).map((s) => stripEdge(String(s))).filter((s) => s.length >= 2)
  )];
  let hit;
  try {
    const ChannelStore = metro.findByProps("getChannel", "getMutableGuildChannelsForGuild");
    const all = Object.values((ChannelStore && ChannelStore.getMutableGuildChannelsForGuild ? ChannelStore.getMutableGuildChannelsForGuild(guildId) : null) || {});
    diag.push(`local channels: ${all.length}`);
    consider(all.filter((c) => c && c.parent_id === parentId));
    if (hit = pickExact()) return hit;
  } catch (e) {
    _vendetta.logger.log("[ViewThread] local lookup failed: " + String(e));
  }
  for (const archived of [false, true]) {
    for (const q of searchNames) {
      const res = await safeGet(`/channels/${parentId}/threads/search`, {
        name: q,
        limit: 25,
        sort_by: "last_message_time",
        sort_order: "desc",
        archived
      });
      const threads = ((res && res.body && res.body.threads) || []).filter(inParent);
      diag.push(`thread search "${q}" archived=${archived}: status ${st(res)}, ${threads.length} results`);
      consider(threads);
      if (hit = pickExact()) return hit;
    }
  }
  for (const kind of ["public", "private"]) {
    let beforeTs;
    for (let page = 0; page < 10; page++) {
      const query = { limit: 100 };
      if (beforeTs) query.before = beforeTs;
      const res = await safeGet(`/channels/${parentId}/threads/archived/${kind}`, query);
      const threads = ((res && res.body && res.body.threads) || []).filter(inParent);
      if (page === 0) {
        diag.push(`archived ${kind}: status ${st(res)}, ${threads.length} on page 1`);
        if (threads.length) diag.push(`  sample names: ${threads.slice(0, 5).map((t2) => t2.name).join(" | ")}`);
      }
      consider(threads);
      if (hit = pickExact()) return hit;
      if (!(res && res.body && res.body.has_more) || !threads.length) break;
      const last = threads[threads.length - 1];
      beforeTs = last && last.thread_metadata ? last.thread_metadata.archive_timestamp : undefined;
      if (!beforeTs) break;
    }
  }
  const active = await safeGet(`/guilds/${guildId}/threads/active`);
  const activeThreads = (active && active.body && active.body.threads) || [];
  diag.push(`active threads: status ${st(active)}, ${activeThreads.length} results`);
  consider(activeThreads.filter((t) => t.parent_id === parentId));
  if (hit = pickExact()) return hit;
  for (const withChannel of [true, false]) {
    const query = { mentions: user.id, include_nsfw: true };
    if (withChannel) query.channel_id = parentId;
    let res = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await safeGet(`/guilds/${guildId}/messages/search`, query);
      if (res && res.status === 202) {
        await new Promise((r) => setTimeout(r, ((res.body && res.body.retry_after) || 1) * 1e3));
        continue;
      }
      break;
    }
    const hits = ((res && res.body && res.body.messages) || []).flat();
    diag.push(`message search${withChannel ? " in channel" : ""}: status ${st(res)}, ${hits.length} hits`);
    consider(hits.map((m) => m.thread).filter((t) => t && inParent(t)));
    if (hit = pickExact()) return hit;
    for (const m of hits.slice(0, 10)) {
      const info = await getChannelInfo(m.channel_id);
      diag.push(`  hit channel ${m.channel_id} parent=${info && info.parent_id != null ? info.parent_id : "?"} type=${info && info.type != null ? info.type : "?"} name=${info && info.name != null ? info.name : "?"}`);
      if (m.channel_id !== parentId && info && info.parent_id === parentId && THREAD_TYPES.includes(info.type)) {
        consider([{ id: m.channel_id, name: info.name }]);
      }
      if (m.channel_id === parentId) {
        const startInfo = await getChannelInfo(m.id);
        if (startInfo && startInfo.parent_id === parentId && THREAD_TYPES.includes(startInfo.type)) {
          consider([{ id: m.id, name: startInfo.name }]);
        }
      }
    }
    if (hit = pickExact()) return hit;
  }
  // nothing exact: a partial match is accepted only if it is the single candidate
  const partial = [...seen].filter(([, v]) => v.score < 3);
  if (partial.length === 1) {
    diag.push(`only partial match used: ${partial[0][1].name} (${partial[0][0]})`);
    return partial[0][0];
  }
  if (partial.length > 1) {
    diag.push(`ambiguous partial matches, not opening any: ${partial.map(([id, v]) => `${v.name} (${id})`).join(" | ")}`);
  }
  return null;
}
// ---- multi-server support: the setting can hold one thread channel per server ----
const channelGuildCache = new Map();
async function getChannelGuild(channelId) {
  if (channelGuildCache.has(channelId)) return channelGuildCache.get(channelId);
  let guild;
  try {
    const ChannelStore = metro.findByProps("getChannel", "getMutableGuildChannelsForGuild");
    const local = ChannelStore && ChannelStore.getChannel ? ChannelStore.getChannel(channelId) : null;
    if (local && local.guild_id) guild = local.guild_id;
  } catch {
  }
  if (!guild) {
    const res = await safeGet(`/channels/${channelId}`);
    if (res && res.body && res.body.guild_id) guild = res.body.guild_id;
  }
  if (guild) channelGuildCache.set(channelId, guild);
  return guild;
}
// accepts "channelId" or "serverId:channelId", separated by commas, spaces or new lines
function parseChannelEntries(raw) {
  const out = [];
  for (const tok of String(raw != null ? raw : "").split(/[\s,;]+/)) {
    if (!tok) continue;
    const pair = /^(\d{15,25})[:=](\d{15,25})$/.exec(tok);
    if (pair) out.push({ guildId: pair[1], channelId: pair[2] });
    else if (/^\d{15,25}$/.test(tok)) out.push({ channelId: tok });
  }
  return out;
}
async function resolveParentId(guildId, raw, diag) {
  const entries = parseChannelEntries(raw);
  diag.push(`configured thread channels: ${entries.length}`);
  for (const e of entries) {
    if (e.guildId === guildId) return e.channelId;
  }
  const unresolved = [];
  for (const e of entries) {
    if (e.guildId) continue;
    const g = await getChannelGuild(e.channelId);
    diag.push(`  channel ${e.channelId} -> server ${g != null ? g : "?"}`);
    if (g === guildId) return e.channelId;
    if (!g) unresolved.push(e);
  }
  // a single channel whose server could not be determined: use it, like before
  if (entries.length === 1 && unresolved.length === 1) return unresolved[0].channelId;
  return null;
}
async function viewThread(guildId, user) {
  const raw = plugin.storage.threadChannelId;
  if (!raw || !String(raw).trim()) {
    toasts.showToast("View Thread: set the thread channel ID(s) in plugin settings", assets.getAssetIDByName("Small"));
    return;
  }
  const diag = [];
  try {
    const parentId = await resolveParentId(guildId, raw, diag);
    if (!parentId) {
      const report = `[ViewThread] No thread channel configured for server ${guildId}
` + diag.join("\n");
      _vendetta.logger.log(report);
      copyToClipboard(report);
      toasts.showToast("View Thread: no thread channel set for this server (debug info copied to clipboard)", assets.getAssetIDByName("Small"));
      return;
    }
    const threadId = await findThread(guildId, parentId, user, diag);
    if (!threadId) {
      const report = `[ViewThread] No thread for ${user.username} (${user.id})
guild ${guildId}, thread channel ${parentId}
` + diag.join("\n");
      _vendetta.logger.log(report);
      copyToClipboard(report);
      toasts.showToast(`No thread for ${user.username} (debug info copied to clipboard)`, assets.getAssetIDByName("Small"));
      return;
    }
    const foundInfo = await getChannelInfo(threadId);
    _vendetta.logger.log(`[ViewThread] ${user.username} (${user.id}) -> ${threadId} (${foundInfo ? foundInfo.name : "?"})`);
    toasts.showToast(`Thread: ${foundInfo && foundInfo.name ? foundInfo.name : threadId}`, assets.getAssetIDByName("Small"));
    if (!openChannel(guildId, threadId)) {
      const link = `https://discord.com/channels/${guildId}/${threadId}`;
      copyToClipboard(link);
      toasts.showToast("Couldn't open it in-app, thread link copied to clipboard", assets.getAssetIDByName("Small"));
    }
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