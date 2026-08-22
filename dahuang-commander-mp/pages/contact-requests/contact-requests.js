const app = require('../../utils/getApp.js');
const i18n = require('../../utils/i18n.js');
const { getHeaders } = require('../../utils/config.js');

Page({
  data: {
    t: i18n.getDict(),
    serverUrl: "",
    requests: [],
    loading: true,
    busyId: ""
  },

  onLoad() {
    this.setData({ t: i18n.getDict() });
  },

  onShow() {
    this.setData({ serverUrl: app.globalData.serverUrl || "https://dahuang.land" });
    this.loadRequests();
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

  async loadRequests() {
    this.setData({ loading: true });
    try {
      const res = await this.request("GET", "/api/agent/contacts/requests");
      this.setData({
        requests: (res.requests || []).map(r => ({
          ...r,
          displayName: r.from.displayName || r.from.name,
          avatarChar: (r.from.displayName || r.from.name || "?").slice(0, 1),
          ts: this.relativeTime(r.createdAt)
        })),
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: (this.data.t.contacts && this.data.t.contacts.load_failed) || "加载失败", icon: "none" });
    }
  },

  async onAction(e) {
    const { id, action } = e.currentTarget.dataset;
    const t = this.data.t.contacts || {};
    if (this.data.busyId) return;
    this.setData({ busyId: id });
    try {
      const res = await this.request("POST", `/api/agent/contacts/requests/${encodeURIComponent(id)}/${action}`);
      wx.showToast({ title: res.message || (action === "approve" ? t.accept : t.reject), icon: "success" });
      this.setData({ busyId: "" });
      this.loadRequests();
    } catch (e) {
      this.setData({ busyId: "" });
      wx.showToast({ title: e.message || t.op_failed, icon: "none" });
    }
  },

  relativeTime(iso) {
    if (!iso) return "";
    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    if (diff < 60 * 1000) return "刚刚";
    if (diff < 3600 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 24 * 3600 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 30 * 24 * 3600 * 1000) return `${Math.floor(diff / (24 * 3600 * 1000))} 天前`;
    return new Date(iso).toLocaleDateString("zh-CN");
  },

  noop() {}
});
