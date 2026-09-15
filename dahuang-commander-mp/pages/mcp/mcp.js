const app = require('../../utils/getApp.js');
const { getHeaders } = require('../../utils/config.js');

Page({
  data: {
    loading: true,
    enabled: false,
    servers: [],
    errorText: "",
    serverUrl: "",
  },

  onLoad() {
    this.setData({ serverUrl: app.globalData.serverUrl || "" });
    this.refresh();
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const { serverUrl, agentState } = app.globalData;
    if (!agentState || !agentState.token) {
      this.setData({ loading: false, errorText: "未登录" });
      return;
    }
    this.setData({ loading: true, errorText: "" });
    wx.request({
      url: `${serverUrl}/api/agent/mcp/status`,
      method: "GET",
      header: getHeaders(agentState.token),
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.success) {
          this.setData({
            loading: false,
            enabled: !!res.data.enabled,
            servers: (res.data.servers || []).map((s) => ({
              ...s,
              loadedText: s.lastLoadedAt ? "最近加载 " + this.timeText(s.lastLoadedAt) : "尚未加载（将在下一次任务时自动连接）",
            })),
          });
        } else {
          this.setData({ loading: false, errorText: (res.data && res.data.error) || "加载失败" });
        }
      },
      fail: () => this.setData({ loading: false, errorText: "网络异常" }),
    });
  },

  timeText(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  },

  onCopyHost(e) {
    const host = e.currentTarget.dataset.host;
    if (!host) return;
    wx.setClipboardData({ data: host });
  },
});
