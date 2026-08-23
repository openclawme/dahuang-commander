const app = require('../../utils/getApp.js');
const i18n = require('../../utils/i18n.js');

Page({
  data: {
    t: i18n.getDict(),
    serverUrl: "",
    account: "",
    password: "",
    loggingIn: false,
    // 高级模式：粘贴 JWT
    showAdvanced: false,
    customToken: "",
    importing: false
  },

  onLoad() {
    this.setData({ t: i18n.getDict() });
  },

  onShow() {
    this.setData({ serverUrl: app.globalData.serverUrl || "https://dahuang.land" });
    // 已登录则直接回遥测页（如从登录页切走又切回）
    const state = app.globalData.agentState || {};
    if (state.token) {
      wx.switchTab({ url: "/pages/index/index" });
    }
  },

  onAccountInput(e) {
    this.setData({ account: e.detail.value });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  onTokenInput(e) {
    this.setData({ customToken: e.detail.value });
  },

  toggleAdvanced() {
    this.setData({ showAdvanced: !this.data.showAdvanced });
  },

  doLogin() {
    const t = this.data.t.login || {};
    const account = (this.data.account || "").trim();
    const password = this.data.password || "";
    if (!account || !password) {
      wx.showToast({ title: t.account_required || "请填写账号与密码", icon: "none" });
      return;
    }
    if (this.data.loggingIn) return;
    this.setData({ loggingIn: true });
    wx.showLoading({ title: t.logging_in || "正在登录..." });

    wx.request({
      url: `${this.data.serverUrl}/api/agent/auth/login`,
      method: "POST",
      header: { "Content-Type": "application/json; charset=utf-8" },
      data: { account, password },
      success: (res) => {
        wx.hideLoading();
        this.setData({ loggingIn: false });
        if (res.statusCode === 200 && res.data.token) {
          const agent = res.data.agent || {};
          app.globalData.agentState = {
            id: agent.id,
            name: agent.displayName || agent.name,
            did: agent.did,
            karma: agent.karma || 0,
            character: "高维探秘者",
            iq: agent.iq || 100,
            hasPassword: true,
            token: res.data.token,
            status: "ONLINE"
          };
          wx.setStorageSync("dahuang_agent_state", app.globalData.agentState);
          app.addLog("SYSTEM", `🔑 密码登录成功！元神 [${agent.name}] 已并网。`);
          app.loadChatHistoryForAgent(agent.id);
          app.connectSocket();
          wx.switchTab({ url: "/pages/index/index" });
        } else {
          wx.showToast({ title: (res.data && res.data.error) || (t.failed || "登录失败"), icon: "none" });
        }
      },
      fail: () => {
        wx.hideLoading();
        this.setData({ loggingIn: false });
        wx.showToast({ title: t.network_failed || "网络超时", icon: "none" });
      }
    });
  },

  doImportToken() {
    const token = (this.data.customToken || "").trim();
    if (!token) {
      wx.showToast({ title: (this.data.t.login && this.data.t.login.token_required) || "凭证不可为空", icon: "none" });
      return;
    }
    if (this.data.importing) return;
    this.setData({ importing: true });
    wx.showLoading({ title: (this.data.t.login && this.data.t.login.verifying) || "正在检验印章..." });
    app.verifyAndApplyToken(token, () => {
      wx.hideLoading();
      this.setData({ importing: false });
      wx.switchTab({ url: "/pages/index/index" });
    }, (msg) => {
      wx.hideLoading();
      this.setData({ importing: false });
      wx.showToast({ title: msg || "凭证检验不通过", icon: "none" });
    });
  },

  noop() {}
});
