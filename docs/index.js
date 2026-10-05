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
async function findThreadBySearch(guildId, parentId, userId) {
  var _a2, _b2, _c2, _d;
  const RestAPI = getRest();
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await RestAPI.get({
      url: `/guilds/${guildId}/messages/search`,
      query: { channel_id: parentId, mentions: userId, include_nsfw: true }
    });
    if (res.status === 202) {
      await new Promise((r) => {
        var _a3;
        return setTimeout(r, ((_a3 = res.body) == null ? void 0 : _a3.retry_after) ? res.body.retry_after * 1e3 : 1e3);
      });
      continue;
    }
    const hits = ((_b2 = (_a2 = res.body) == null ? void 0 : _a2.messages) != null ? _b2 : []).flat();
    for (const m of hits) {
      if ((_c2 = m.thread) == null ? void 0 : _c2.id) return m.thread.id;
    }
    const ChannelStore = metro.findByProps("getChannel", "getMutableGuildChannelsForGuild");
    for (const m of hits) {
      const ch = (_d = ChannelStore == null ? void 0 : ChannelStore.getChannel) == null ? void 0 : _d.call(ChannelStore, m.channel_id);
      if (ch && THREAD_TYPES.includes(ch.type)) return m.channel_id;
    }
    const other = hits.find((m) => m.channel_id !== parentId);
    if (other) return other.channel_id;
    return null;
  }
  return null;
}
async function findThreadByName(guildId, parentId, user) {
  var _a2, _b2, _c2, _d;
  const RestAPI = getRest();
  const needles = [user.id, user.username, user.globalName, user.global_name].filter(Boolean).map((s) => s.toLowerCase());
  const matches = (t) => {
    var _a3;
    const name = ((_a3 = t.name) != null ? _a3 : "").toLowerCase();
    return needles.some((n) => name.includes(n));
  };
  try {
    const active = await RestAPI.get({ url: `/guilds/${guildId}/threads/active` });
    const t = ((_b2 = (_a2 = active.body) == null ? void 0 : _a2.threads) != null ? _b2 : []).find((t2) => t2.parent_id === parentId && matches(t2));
    if (t) return t.id;
  } catch (e) {
    _vendetta.logger.log("[ViewThread] active threads failed: " + String(e));
  }
  try {
    const arch = await RestAPI.get({
      url: `/channels/${parentId}/threads/archived/public`,
      query: { limit: 100 }
    });
    const t = ((_d = (_c2 = arch.body) == null ? void 0 : _c2.threads) != null ? _d : []).find(matches);
    if (t) return t.id;
  } catch (e) {
    _vendetta.logger.log("[ViewThread] archived threads failed: " + String(e));
  }
  return null;
}
async function viewThread(guildId, user) {
  const parentId = plugin.storage.threadChannelId;
  if (!parentId) {
    toasts.showToast("View Thread: set the thread channel ID in plugin settings", assets.getAssetIDByName("Small"));
    return;
  }
  try {
    let threadId = await findThreadBySearch(guildId, parentId, user.id);
    if (!threadId) threadId = await findThreadByName(guildId, parentId, user);
    if (!threadId) {
      toasts.showToast(`No thread found for ${user.username}`, assets.getAssetIDByName("Small"));
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
