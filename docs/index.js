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
  common.ReactNative.Linking.openURL(`https://discord.com/channels/${guildId}/${channelId}`);
}
function getRest() {
  return metro.findByProps("get", "post", "del", "patch");
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
  return [user.id, user.username, user.globalName, user.global_name, nick].filter(Boolean).map(norm);
}
async function safeGet(url, query) {
  var _a2;
  try {
    const res = await getRest().get({ url, query });
    return res;
  } catch (e) {
    _vendetta.logger.log(`[ViewThread] GET ${url} failed: ${String((_a2 = e == null ? void 0 : e.message) != null ? _a2 : e)}`);
    return null;
  }
}
async function isThreadOf(channelId, parentId) {
  var _a2;
  const ChannelStore = metro.findByProps("getChannel", "getMutableGuildChannelsForGuild");
  const local = (_a2 = ChannelStore == null ? void 0 : ChannelStore.getChannel) == null ? void 0 : _a2.call(ChannelStore, channelId);
  if (local) return local.parent_id === parentId && THREAD_TYPES.includes(local.type);
  const res = await safeGet(`/channels/${channelId}`);
  const ch = res == null ? void 0 : res.body;
  return !!ch && ch.parent_id === parentId && THREAD_TYPES.includes(ch.type);
}
async function findThread(guildId, parentId, user, diag) {
  var _a2, _b2, _c2, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m;
  const needles = getNeedles(guildId, user);
  const nameMatches = (t) => {
    const name = norm(t == null ? void 0 : t.name);
    return needles.some((n) => name.includes(n));
  };
  try {
    const ChannelStore = metro.findByProps("getChannel", "getMutableGuildChannelsForGuild");
    const all = Object.values((_b2 = (_a2 = ChannelStore == null ? void 0 : ChannelStore.getMutableGuildChannelsForGuild) == null ? void 0 : _a2.call(ChannelStore, guildId)) != null ? _b2 : {});
    const t = all.find((c) => (c == null ? void 0 : c.parent_id) === parentId && nameMatches(c));
    diag.push(`local:${all.length}`);
    if (t) return t.id;
  } catch (e) {
    _vendetta.logger.log("[ViewThread] local lookup failed: " + String(e));
  }
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
    const hits = ((_d = (_c2 = res == null ? void 0 : res.body) == null ? void 0 : _c2.messages) != null ? _d : []).flat();
    diag.push(`search${withChannel ? "(ch)" : ""}:${hits.length}`);
    for (const m of hits) {
      if ((_e = m.thread) == null ? void 0 : _e.id) return m.thread.id;
    }
    for (const m of hits.slice(0, 10)) {
      if (m.channel_id !== parentId && await isThreadOf(m.channel_id, parentId)) return m.channel_id;
      if (m.channel_id === parentId && await isThreadOf(m.id, parentId)) return m.id;
    }
  }
  for (const q of [user.username, (_f = user.globalName) != null ? _f : user.global_name].filter(Boolean)) {
    const res = await safeGet(`/channels/${parentId}/threads/search`, { name: q, limit: 25 });
    const threads = (_h = (_g = res == null ? void 0 : res.body) == null ? void 0 : _g.threads) != null ? _h : [];
    diag.push(`tsearch:${threads.length}`);
    const t = (_i = threads.find((t2) => t2.parent_id === parentId && nameMatches(t2))) != null ? _i : threads[0];
    if (t && nameMatches(t)) return t.id;
  }
  const active = await safeGet(`/guilds/${guildId}/threads/active`);
  const activeThreads = (_k = (_j = active == null ? void 0 : active.body) == null ? void 0 : _j.threads) != null ? _k : [];
  diag.push(`active:${activeThreads.length}`);
  const a = activeThreads.find((t) => t.parent_id === parentId && nameMatches(t));
  if (a) return a.id;
  const arch = await safeGet(`/channels/${parentId}/threads/archived/public`, { limit: 100 });
  const archThreads = (_m = (_l = arch == null ? void 0 : arch.body) == null ? void 0 : _l.threads) != null ? _m : [];
  diag.push(`archived:${archThreads.length}`);
  const b = archThreads.find(nameMatches);
  if (b) return b.id;
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
      _vendetta.logger.log(`[ViewThread] No thread for ${user.username} (${user.id}). ${diag.join(" ")}`);
      toasts.showToast(`No thread for ${user.username} [${diag.join(" ")}]`, assets.getAssetIDByName("Small"));
      return;
    }
    openChannel(guildId, threadId);
  } catch (err) {
    _vendetta.logger.log("[ViewThread] Error: " + String(err));
    toasts.showToast("View Thread failed, check logs", assets.getAssetIDByName("Small"));
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
