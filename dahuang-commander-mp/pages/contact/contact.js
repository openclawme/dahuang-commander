const app = require('../../utils/getApp.js');
const i18n = require('../../utils/i18n.js');
const { getHeaders } = require('../../utils/config.js');

Page({
  data: {
    t: i18n.getDict(),
    friendId: "",
    serverUrl: "",
    profile: null,
    loading: true,
    // 编辑浮层
    editVisible: false,
    editName: "",
    editTags: "",
    saving: false
  },

  onLoad(options) {
    this.setData({ t: i18n.getDict() });
    if (options && options.friendId) {
      this.setData({ friendId: decodeURIComponent(options.friendId) });
    }
  },

  onShow() {
    this.setData({ serverUrl: app.globalData.serverUrl || "https://dahuang.land" });
    this.loadProfile();
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

  async loadProfile() {
    if (!this.data.friendId) return;
    this.setData({ loading: true });
    try {
      const res = await this.request("GET", `/api/agent/contacts/${encodeURIComponent(this.data.friendId)}/profile`);
      const p = res.profile;
      const displayName = p.contactName || (p.profile && (p.profile.displayName || p.profile.name)) || "?";
      this.setData({
        profile: {
          ...p,
          commonRoomsText: (p.commonRooms || []).map(r => r.name).join("、"),
          avatarChar: displayName.slice(0, 1),
          sinceShort: p.since ? p.since.slice(0, 10) : ""
        },
        editName: p.contactName || "",
        editTags: (p.tags || []).join(","),
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: (this.data.t.contacts && this.data.t.contacts.load_failed) || "加载失败", icon: "none" });
    }
  },

  async contactDm() {
    const t = this.data.t.contacts || {};
    try {
      const res = await this.request("POST", `/api/agent/contacts/${encodeURIComponent(this.data.friendId)}/dm`);
      const roomId = res.roomId;
      if (!app.globalData.messengerRooms[roomId]) {
        app.globalData.messengerRooms[roomId] = {
          roomId, name: "私密心聊", events: [], unreadCount: 0, isDirect: true, memberCount: 2
        };
      }
      wx.navigateTo({ url: `/pages/room/room?roomId=${encodeURIComponent(roomId)}` });
    } catch (e) {
      wx.showToast({ title: e.message || t.dm_failed || "会话建立失败", icon: "none" });
    }
  },

  openEdit() {
    this.setData({ editVisible: true });
  },

  onEditInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  closeEdit() {
    this.setData({ editVisible: false });
  },

  async saveEdit() {
    const t = this.data.t.contacts || {};
    if (this.data.saving) return;
    this.setData({ saving: true });
    try {
      const tags = (this.data.editTags || "").split(/[,，]/).map(s => s.trim()).filter(Boolean).slice(0, 10);
      await this.request("PUT", `/api/agent/contacts/${encodeURIComponent(this.data.friendId)}`, {
        contactName: (this.data.editName || "").trim(),
        tags
      });
      this.setData({ saving: false, editVisible: false });
      wx.showToast({ title: t.edit_contact + " ✓", icon: "none" });
      this.loadProfile();
    } catch (e) {
      this.setData({ saving: false });
      wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
    }
  },

  async toggleField(e) {
    const field = e.currentTarget.dataset.field;
    const t = this.data.t.contacts || {};
    try {
      await this.request("PUT", `/api/agent/contacts/${encodeURIComponent(this.data.friendId)}`, { [field]: !this.data.profile[field] });
      this.loadProfile();
    } catch (err) {
      wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
    }
  },

  async deleteContact() {
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
      await this.request("DELETE", `/api/agent/contacts/${encodeURIComponent(this.data.friendId)}`);
      wx.showToast({ title: t.delete_contact || "已删除", icon: "success" });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (e) {
      wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
    }
  },

  async blockContact() {
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
      await this.request("POST", `/api/agent/contacts/${encodeURIComponent(this.data.friendId)}/block`);
      wx.showToast({ title: t.block || "已拉黑", icon: "success" });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (e) {
      wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
    }
  },

  copyDid() {
    const did = this.data.profile && this.data.profile.profile && this.data.profile.profile.did;
    if (!did) return;
    wx.setClipboardData({
      data: did,
      success: () => wx.showToast({ title: (this.data.t.contacts && this.data.t.contacts.copied) || "DID 已复制", icon: "none" })
    });
  },

  noop() {}
});
