const app = require('../../utils/getApp.js');
const i18n = require('../../utils/i18n.js');
const { getHeaders } = require('../../utils/config.js');

Page({
  data: {
    t: i18n.getDict(),
    serverUrl: "",
    decisions: [],
    loading: true,
    // 答复浮层
    answerVisible: false,
    answerTarget: null,
    answerText: "",
    busyId: ""
  },

  onLoad() {
    this.setData({ t: i18n.getDict() });
  },

  onShow() {
    this.setData({ serverUrl: app.globalData.serverUrl || "https://dahuang.land" });
    this.loadDecisions();
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

  async loadDecisions() {
    this.setData({ loading: true });
    try {
      const res = await this.request("GET", "/api/agent/decisions");
      const decisions = (res.decisions || []).map(d => ({
        ...d,
        ts: this.relativeTime(d.createdAt),
        typeIcon: d.type === "INVITATION" ? "🍺" : d.type === "CONFIRMATION" ? "❓" : "📝"
      }));
      this.setData({ decisions, loading: false });
      app.globalData.pendingDecisionCount = res.count || 0;
      // 通知首页横幅同步
      if (typeof app.triggerPageCallback === "function") {
        app.triggerPageCallback("onPendingDecision", { count: res.count || 0 });
      }
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: (this.data.t.decisions && this.data.t.decisions.load_failed) || "加载失败", icon: "none" });
    }
  },

  openAnswer(e) {
    const { id, title, preset } = e.currentTarget.dataset;
    this.setData({ answerVisible: true, answerTarget: { id, title }, answerText: preset || "" });
  },

  onAnswerInput(e) {
    this.setData({ answerText: e.detail.value });
  },

  closeAnswer() {
    this.setData({ answerVisible: false, answerTarget: null });
  },

  async submitAnswer() {
    const t = this.data.t.decisions || {};
    const answer = (this.data.answerText || "").trim();
    if (!answer || !this.data.answerTarget) {
      wx.showToast({ title: t.answer_ph || "请输入答复", icon: "none" });
      return;
    }
    if (this.data.busyId) return;
    this.setData({ busyId: this.data.answerTarget.id });
    try {
      const res = await this.request("POST", `/api/agent/decisions/${encodeURIComponent(this.data.answerTarget.id)}/answer`, { answer });
      wx.showToast({ title: res.message || (t.done || "已答复"), icon: "success" });
      this.setData({ answerVisible: false, answerTarget: null, busyId: "" });
      this.loadDecisions();
    } catch (e) {
      this.setData({ busyId: "" });
      wx.showToast({ title: e.message || (t.op_failed || "操作失败"), icon: "none" });
    }
  },

  async dismissDecision(e) {
    const { id } = e.currentTarget.dataset;
    const t = this.data.t.decisions || {};
    if (this.data.busyId) return;
    this.setData({ busyId: id });
    try {
      await this.request("POST", `/api/agent/decisions/${encodeURIComponent(id)}/dismiss`);
      this.setData({ busyId: "" });
      this.loadDecisions();
    } catch (err) {
      this.setData({ busyId: "" });
      wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
    }
  },

  relativeTime(iso) {
    if (!iso) return "";
    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    if (diff < 60 * 1000) return "刚刚";
    if (diff < 3600 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 24 * 3600 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / (24 * 3600 * 1000))} 天前`;
  },

  noop() {}
});
