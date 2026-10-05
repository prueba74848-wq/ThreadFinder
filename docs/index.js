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
      title: "Thread channel ID",
      placeholder: "ID of the channel where the bot creates threads",
      value: plugin.storage.threadChannelId,
      onChange: (v) => plugin.storage.threadChannelId = v.trim()
    }
  ), /* @__PURE__ */ common.React.createElement(FormText, { style: { paddingHorizontal: 16, paddingBottom: 8 } }, 'Long-press a message and tap "View thread". Enable Developer Mode, then long-press the channel and use Copy Channel ID.'));
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
  var _a2, _b2, _c2, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v;
  try {
    const UserStore = metro.findByProps("getUser", "getCurrentUser");
    const real = (_a2 = UserStore == null ? void 0 : UserStore.getUser) == null ? void 0 : _a2.call(UserStore, user.id);
    if (real == null ? void 0 : real.username) user = { ...user, username: real.username, globalName: (_b2 = real.globalName) != null ? _b2 : user.globalName };
  } catch {
  }
  diag.push(`@username=${user.username} display=${(_d = (_c2 = user.globalName) != null ? _c2 : user.global_name) != null ? _d : "?"}`);
  const clean = (s) => norm(s).replace(/[^a-z0-9À-￿]/g, "");
  const needles = getNeedles(guildId, user).map(clean).filter((n) => n.length >= 3);
  const nameMatches = (t) => {
    const name = clean(t == null ? void 0 : t.name);
    return !!name && needles.some((n) => name === n || name.includes(n));
  };
  const stripEdge = (s) => s.replace(/^[^\w]+|[^\w]+$/g, "");
  const searchNames = [...new Set(
    [user.username, (_e = user.globalName) != null ? _e : user.global_name].filter(Boolean).map((s) => stripEdge(String(s))).filter((s) => s.length >= 2)
  )];
  try {
    const ChannelStore = metro.findByProps("getChannel", "getMutableGuildChannelsForGuild");
    const all = Object.values((_g = (_f = ChannelStore == null ? void 0 : ChannelStore.getMutableGuildChannelsForGuild) == null ? void 0 : _f.call(ChannelStore, guildId)) != null ? _g : {});
    diag.push(`local channels: ${all.length}`);
    const t = all.find((c) => (c == null ? void 0 : c.parent_id) === parentId && nameMatches(c));
    if (t) return t.id;
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
      const threads = (_i = (_h = res == null ? void 0 : res.body) == null ? void 0 : _h.threads) != null ? _i : [];
      diag.push(`thread search "${q}" archived=${archived}: status ${st(res)}, ${threads.length} results`);
      const t = threads.find(nameMatches);
      if (t) return t.id;
    }
  }
  for (const kind of ["public", "private"]) {
    let beforeTs;
    for (let page = 0; page < 10; page++) {
      const query = { limit: 100 };
      if (beforeTs) query.before = beforeTs;
      const res = await safeGet(`/channels/${parentId}/threads/archived/${kind}`, query);
      const threads = (_k = (_j = res == null ? void 0 : res.body) == null ? void 0 : _j.threads) != null ? _k : [];
      if (page === 0) {
        diag.push(`archived ${kind}: status ${st(res)}, ${threads.length} on page 1`);
        if (threads.length) diag.push(`  sample names: ${threads.slice(0, 5).map((t2) => t2.name).join(" | ")}`);
      }
      const t = threads.find(nameMatches);
      if (t) return t.id;
      if (!((_l = res == null ? void 0 : res.body) == null ? void 0 : _l.has_more) || !threads.length) break;
      beforeTs = (_n = (_m = threads[threads.length - 1]) == null ? void 0 : _m.thread_metadata) == null ? void 0 : _n.archive_timestamp;
      if (!beforeTs) break;
    }
  }
  const active = await safeGet(`/guilds/${guildId}/threads/active`);
  const activeThreads = (_p = (_o = active == null ? void 0 : active.body) == null ? void 0 : _o.threads) != null ? _p : [];
  diag.push(`active threads: status ${st(active)}, ${activeThreads.length} results`);
  const a = activeThreads.find((t) => t.parent_id === parentId && nameMatches(t));
  if (a) return a.id;
  for (const withChannel of [true, false]) {
    const query = { mentions: user.id, include_nsfw: true };
    if (withChannel) query.channel_id = parentId;
    let res = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      res = await safeGet(`/guilds/${guildId}/messages/search`, query);
      if ((res == null ? void 0 : res.status) === 202) {
        await new Promise((r) => {
          var _a3, _b3;
          return setTimeout(r, ((_b3 = (_a3 = res.body) == null ? void 0 : _a3.retry_after) != null ? _b3 : 1) * 1e3);
        });
        continue;
      }
      break;
    }
    const hits = ((_r = (_q = res == null ? void 0 : res.body) == null ? void 0 : _q.messages) != null ? _r : []).flat();
    diag.push(`message search${withChannel ? " in channel" : ""}: status ${st(res)}, ${hits.length} hits`);
    for (const m of hits) {
      if ((_s = m.thread) == null ? void 0 : _s.id) return m.thread.id;
    }
    for (const m of hits.slice(0, 10)) {
      const info = await getChannelInfo(m.channel_id);
      diag.push(`  hit channel ${m.channel_id} parent=${(_t = info == null ? void 0 : info.parent_id) != null ? _t : "?"} type=${(_u = info == null ? void 0 : info.type) != null ? _u : "?"} name=${(_v = info == null ? void 0 : info.name) != null ? _v : "?"}`);
      if (m.channel_id !== parentId && (info == null ? void 0 : info.parent_id) === parentId && THREAD_TYPES.includes(info.type)) {
        return m.channel_id;
      }
      if (m.channel_id === parentId && await isThreadOf(m.id, parentId)) return m.id;
    }
  }
  return null;
}
async function viewThread(guildId, user) {
  const parentId = plugin.storage.threadChannelId;
  if (!parentId) {
    toasts.showToast("View Thread: set the thread channel ID in plugin settings", assets.getAssetIDByName("Small"));
    return;
  }
  const diag = [];
  try {
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
