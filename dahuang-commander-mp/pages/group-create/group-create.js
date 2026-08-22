const app = require('../../utils/getApp.js');
const i18n = require('../../utils/i18n.js');
const { getHeaders } = require('../../utils/config.js');

Page({
  data: {
    t: i18n.getDict(),
    serverUrl: "",
    groupName: "",
    friends: [],
    selected: {}, // friendId -> true
    selectedCount: 0,
    creating: false
  },

  onLoad() {
    this.setData({ t: i18n.getDict() });
  },

  onShow() {
    this.setData({ serverUrl: app.globalData.serverUrl || "https://dahuang.land" });
    this.loadFriends();
  },

  request(method, path, data) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.data.serverUrl}${path}`,
        method,
        header: getHeaders(app.globalData.agentState.token),
        data,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
          else reject(new Error((res.data && (res.data.error || res.data.message)) || `HTTP ${res.statusCode}`));
        },
        fail: (err) => reject(new Error(err.errMsg || "网络请求失败"))
      });
    });
  },

  async loadFriends() {
    try {
      const res = await this.request("GET", "/api/agent/contacts");
      this.setData({
        friends: (res.contacts || []).map(c => ({
          friendId: c.friendId,
          displayName: c.contactName || c.profile.displayName || c.profile.name,
          avatarChar: (c.contactName || c.profile.displayName || c.profile.name || "?").slice(0, 1)
        }))
      });
    } catch (e) {
      wx.showToast({ title: (this.data.t.contacts && this.data.t.contacts.load_failed) || "加载失败", icon: "none" });
    }
  },

  onNameInput(e) {
    this.setData({ groupName: e.detail.value });
  },

  onPick(e) {
    const { id } = e.currentTarget.dataset;
    const selected = { ...this.data.selected };
    if (selected[id]) delete selected[id];
    else selected[id] = true;
    this.setData({ selected, selectedCount: Object.keys(selected).length });
  },

  async createGroup() {
    const t = this.data.t.contacts || {};
    if (this.data.creating) return;
    const invitees = Object.keys(this.data.selected);
    if (!this.data.groupName.trim()) {
      wx.showToast({ title: t.group_name_ph, icon: "none" });
      return;
    }
    if (invitees.length < 2) {
      wx.showToast({ title: t.group_pick, icon: "none" });
      return;
    }
    this.setData({ creating: true });
    try {
      const res = await this.request("POST", "/api/agent/contacts/groups", {
        name: this.data.groupName.trim(),
        invitees
      });
      const roomId = res.roomId;
      if (roomId && !app.globalData.messengerRooms[roomId]) {
        app.globalData.messengerRooms[roomId] = {
          roomId, name: this.data.groupName.trim(), events: [], unreadCount: 0,
          isDirect: false, memberCount: invitees.length + 1
        };
      }
      app.globalData.pendingSegment = "groups";
      this.setData({ creating: false });
      wx.showToast({ title: res.message || t.group_created, icon: "success" });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (e) {
      this.setData({ creating: false });
      wx.showToast({ title: e.message || t.op_failed, icon: "none" });
    }
  },

  noop() {}
});
