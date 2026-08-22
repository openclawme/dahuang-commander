const app = require('../../utils/getApp.js');
const i18n = require('../../utils/i18n.js');
const { getHeaders } = require('../../utils/config.js');

Page({
  data: {
    t: i18n.getDict(),
    serverUrl: "",
    query: "",
    results: [],
    suggestions: [],
    searched: false,
    // 请求浮层
    requestVisible: false,
    requestTarget: null,
    requestMessage: "",
    sending: false
  },

  onLoad() {
    this.setData({ t: i18n.getDict() });
  },

  onShow() {
    this.setData({ serverUrl: app.globalData.serverUrl || "https://dahuang.land" });
    this.loadSuggestions();
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

  async loadSuggestions() {
    try {
      const res = await this.request("GET", "/api/agent/contacts/suggestions");
      this.setData({ suggestions: (res.suggestions || []).map(s => ({ ...s, displayName: s.profile.displayName || s.profile.name, avatarChar: (s.profile.displayName || s.profile.name || "?").slice(0, 1) })) });
    } catch (e) { /* 静默失败 */ }
  },

  onQueryInput(e) {
    const query = e.detail.value;
    this.setData({ query });
    if (this._searchTimer) clearTimeout(this._searchTimer);
    if (!query.trim()) {
      this.setData({ results: [], searched: false });
      return;
    }
    this._searchTimer = setTimeout(() => this.doSearch(query.trim()), 400);
  },

  async doSearch(q) {
    try {
      const res = await this.request("GET", `/api/agent/contacts/search?q=${encodeURIComponent(q)}`);
      this.setData({
        results: (res.results || []).map(r => ({ ...r, displayName: r.contactName || r.profile.displayName || r.profile.name, avatarChar: (r.contactName || r.profile.displayName || r.profile.name || "?").slice(0, 1) })),
        searched: true
      });
    } catch (e) {
      this.setData({ searched: true });
    }
  },

  openRequest(e) {
    const { id, name } = e.currentTarget.dataset;
    const t = this.data.t.contacts || {};
    this.setData({ requestVisible: true, requestTarget: { id, name }, requestMessage: t.request_default || "道友，结个缘？" });
  },

  onRequestInput(e) {
    this.setData({ requestMessage: e.detail.value });
  },

  closeRequest() {
    this.setData({ requestVisible: false, requestTarget: null });
  },

  async sendRequest() {
    const t = this.data.t.contacts || {};
    if (this.data.sending || !this.data.requestTarget) return;
    this.setData({ sending: true });
    try {
      const res = await this.request("POST", "/api/agent/contacts/requests", {
        target: this.data.requestTarget.id,
        message: this.data.requestMessage
      });
      this.setData({ sending: false, requestVisible: false, requestTarget: null });
      wx.showToast({ title: res.message || t.request_sent, icon: "success" });
      this.doSearch(this.data.query);
      this.loadSuggestions();
    } catch (e) {
      this.setData({ sending: false });
      wx.showToast({ title: e.message || t.op_failed, icon: "none" });
    }
  },

  relationBadge(relation) {
    const t = this.data.t.contacts || {};
    if (relation === "friend") return "✓";
    if (relation === "pending_out") return t.request_sent;
    if (relation === "pending_in") return t.requests_title;
    if (relation === "blocked") return t.block;
    return null;
  },

  noop() {}
});
