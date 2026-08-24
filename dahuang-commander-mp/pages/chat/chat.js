const app = require('../../utils/getApp.js');
const i18n = require('../../utils/i18n.js');
const { getHeaders } = require('../../utils/config.js');

Page({
  data: {
    t: i18n.getDict(),
    roomsList: [],
    groupList: [],
    segment: "chats", // chats | contacts | groups
    contacts: [],
    requestCount: 0,
    loadingContacts: false,
    serverUrl: ""
  },

  onLoad() {
    this.refreshRooms();
  },

  onShow() {
    const dict = i18n.getDict() || {};
    this.setData({ t: dict });
    if (dict.chat && dict.chat.nav_title) {
      try { wx.setNavigationBarTitle({ title: dict.chat.nav_title }); } catch(e) {}
    }
    i18n.updateTabBar();
    this.setData({ serverUrl: app.globalData.serverUrl || "https://dahuang.land" });
    this.refreshRooms();

    // 跨页返回时恢复分段（如建群成功回群组分段）
    if (app.globalData.pendingSegment) {
      const seg = app.globalData.pendingSegment;
      app.globalData.pendingSegment = null;
      this.setData({ segment: seg });
    }

    if (this.data.segment === "contacts") this.loadContacts();

    if (app.globalData.agentState && app.globalData.agentState.token) {
      if (typeof app.syncMessengerRooms === "function") {
        app.syncMessengerRooms();
      }
    }
  },

  onPullDownRefresh() {
    if (!app.globalData.agentState.token) {
      wx.stopPullDownRefresh();
      wx.showToast({ title: this.data.t.chat.not_logged_in, icon: "none" });
      return;
    }
    if (typeof app.syncMessengerRooms === "function") {
      app.syncMessengerRooms();
    }
    if (this.data.segment === "contacts") this.loadContacts();
    setTimeout(() => wx.stopPullDownRefresh(), 1500);
  },

  onRoomsUpdate() {
    this.refreshRooms();
    wx.stopPullDownRefresh();
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

  onSegmentTap(e) {
    const seg = e.currentTarget.dataset.segment;
    if (!seg || seg === this.data.segment) return;
    this.setData({ segment: seg });
    if (seg === "contacts") this.loadContacts();
  },

  relativeTime(ts) {
    if (!ts) return "";
    const diff = Date.now() - ts;
    const min = 60 * 1000;
    const hour = 60 * min;
    const day = 24 * hour;
    if (diff < min) return "刚刚";
    if (diff < hour) return `${Math.floor(diff / min)} 分钟前`;
    if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
    if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  },

  decorateRooms(roomsObj) {
    const list = Object.values(roomsObj).map(r => {
      const latestEvent = r.events && r.events.length > 0 ? r.events[r.events.length - 1] : null;
      let lastMsgText = this.data.t.chat.no_message;
      let lastMsgTime = "";
      let lastMsgTs = 0;
      if (latestEvent) {
        let rawBody = latestEvent.body || "";
        lastMsgText = rawBody
          .replace(/```[\s\S]*?```/g, "[代码块]")
          .replace(/<[^>]+>/g, "")
          .trim();
        if (!lastMsgText) lastMsgText = "[神念信息]";
        lastMsgTs = latestEvent.ts || 0;
        lastMsgTime = this.relativeTime(lastMsgTs);
      }
      return {
        roomId: r.roomId,
        name: r.name,
        unreadCount: r.unreadCount,
        lastMsgText,
        lastMsgTime,
        lastMsgTs,
        isDirect: r.isDirect !== false,
        memberCount: r.memberCount || 1
      };
    });
    list.sort((a, b) => (b.lastMsgTs - a.lastMsgTs) || a.roomId.localeCompare(b.roomId));
    return list;
  },

  refreshRooms() {
    const rooms = app.globalData.messengerRooms || {};
    const list = this.decorateRooms(rooms);
    this.setData({
      roomsList: list,
      groupList: list.filter(r => !r.isDirect)
    });
  },

  async loadContacts() {
    if (this.data.loadingContacts) return;
    this.setData({ loadingContacts: true });
    try {
      const res = await this.request("GET", "/api/agent/contacts");
      const contacts = (res.contacts || []).map(c => {
        const tags = (c.tags || []).slice(0, 2);
        return {
          ...c,
          tags,
          moreTagCount: Math.max(0, (c.tags || []).length - tags.length),
          displayName: c.contactName || c.profile.displayName || c.profile.name,
          avatarChar: (c.contactName || c.profile.displayName || c.profile.name || "?").slice(0, 1),
          lastTalkTs: c.lastTalkAt ? new Date(c.lastTalkAt).getTime() : 0
        };
      });
      contacts.sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (b.lastTalkTs - a.lastTalkTs));
      this.setData({ contacts, requestCount: res.requestCount || 0, loadingContacts: false });
    } catch (e) {
      this.setData({ loadingContacts: false });
      wx.showToast({ title: (this.data.t.contacts && this.data.t.contacts.load_failed) || "加载失败", icon: "none" });
    }
  },

  enterRoom(e) {
    const roomId = e.currentTarget.dataset.roomid;
    if (!roomId) return;
    if (app.globalData.messengerRooms[roomId]) {
      app.globalData.messengerRooms[roomId].unreadCount = 0;
    }
    this.refreshRooms();
    wx.navigateTo({ url: `/pages/room/room?roomId=${encodeURIComponent(roomId)}` });
  },

  openContact(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/contact/contact?friendId=${encodeURIComponent(id)}` });
  },

  openAddFriend() {
    wx.navigateTo({ url: "/pages/contact-add/contact-add" });
  },

  openRequests() {
    wx.navigateTo({ url: "/pages/contact-requests/contact-requests" });
  },

  openGroupCreate() {
    wx.navigateTo({ url: "/pages/group-create/group-create" });
  },

  async contactDm(id) {
    const t = this.data.t.contacts || {};
    try {
      const res = await this.request("POST", `/api/agent/contacts/${encodeURIComponent(id)}/dm`);
      const roomId = res.roomId;
      if (!app.globalData.messengerRooms[roomId]) {
        app.globalData.messengerRooms[roomId] = {
          roomId, name: "私密心聊", events: [], unreadCount: 0, isDirect: true, memberCount: 2
        };
      }
      this.refreshRooms();
      wx.navigateTo({ url: `/pages/room/room?roomId=${encodeURIComponent(roomId)}` });
    } catch (e) {
      wx.showToast({ title: e.message || t.dm_failed || "会话建立失败", icon: "none" });
    }
  },

  async toggleContactField(e) {
    const { id, field } = e.currentTarget.dataset;
    const item = this.data.contacts.find(c => c.friendId === id);
    if (!item) return;
    const next = !item[field];
    const t = this.data.t.contacts || {};
    try {
      await this.request("PUT", `/api/agent/contacts/${encodeURIComponent(id)}`, { [field]: next });
      this.loadContacts();
    } catch (err) {
      wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
    }
  },

  async contactDelete(e) {
    const { id } = e.currentTarget.dataset;
    const t = this.data.t.contacts || {};
    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: t.delete_contact,
        content: t.delete_confirm,
        confirmColor: "#9e2a2b",
        success: res => resolve(res.confirm)
      });
    });
    if (!confirmed) return;
    try {
      await this.request("DELETE", `/api/agent/contacts/${encodeURIComponent(id)}`);
      this.loadContacts();
    } catch (err) {
      wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
    }
  },

  async contactBlock(e) {
    const { id } = e.currentTarget.dataset;
    const t = this.data.t.contacts || {};
    const confirmed = await new Promise(resolve => {
      wx.showModal({
        title: t.block,
        content: t.block_confirm,
        confirmColor: "#9e2a2b",
        success: res => resolve(res.confirm)
      });
    });
    if (!confirmed) return;
    try {
      await this.request("POST", `/api/agent/contacts/${encodeURIComponent(id)}/block`);
      this.loadContacts();
    } catch (err) {
      wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
    }
  },

  onContactLongPress(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    const t = this.data.t.contacts || {};
    const item = this.data.contacts.find(c => c.friendId === id);
    if (!item) return;
    const actions = [t.send_msg || "发消息"];
    const handlers = [() => this.contactDm(id)];
    actions.push(item.pinned ? (t.unpin || "取消置顶") : (t.pin || "置顶"));
    handlers.push(() => this.toggleContactField({ currentTarget: { dataset: { id, field: "pinned" } } }));
    actions.push(item.favorite ? (t.unfavorite || "取消收藏") : (t.favorite || "收藏"));
    handlers.push(() => this.toggleContactField({ currentTarget: { dataset: { id, field: "favorite" } } }));
    actions.push(t.edit_contact || "编辑备注");
    handlers.push(() => this.openContact({ currentTarget: { dataset: { id } } }));
    actions.push(t.delete_contact || "删除好友");
    handlers.push(() => this.contactDelete({ currentTarget: { dataset: { id } } }));
    actions.push(t.block || "拉黑");
    handlers.push(() => this.contactBlock({ currentTarget: { dataset: { id } } }));

    wx.showActionSheet({
      itemList: actions,
      success: (res) => { if (handlers[res.tapIndex]) handlers[res.tapIndex](); }
    });
  }
});
