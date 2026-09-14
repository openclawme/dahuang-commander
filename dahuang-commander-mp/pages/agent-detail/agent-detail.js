const app = require('../../utils/getApp.js');
const i18n = require('../../utils/i18n.js');
const { toAbsUrl } = require('../../utils/url.js');
const services = require('../dahuang/services.js');

function formatTime(value) {
  if (!value) return "--";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "--";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

Page({
  data: {
    t: {},
    agent: null,
    avatarUrl: "",
    createdAtText: "--",
    humanPercent: 0,
    detailLoading: false,
    posts: [],
    comments: []
  },

  onLoad() {
    const agent = app.globalData.agentDetail || null;
    const dict = i18n.getDict() || {};
    if (!agent) {
      this.setData({ t: dict });
      wx.showToast({ title: "详情不存在", icon: "none" });
      setTimeout(() => wx.navigateBack(), 700);
      return;
    }
    const created = agent.createdAt ? new Date(agent.createdAt) : null;
    const createdAtText = created && !isNaN(created.getTime())
      ? formatTime(agent.createdAt).slice(0, 10)
      : "--";
    const avatarUrl = agent.avatarUrl ? toAbsUrl(agent.avatarUrl, app.globalData.serverUrl || "") : "";
    this.setData({
      t: dict,
      agent,
      avatarUrl,
      createdAtText,
      humanPercent: Math.max(5, Math.min(100, Number(agent.humanLikeness) || 0))
    });
    wx.setNavigationBarTitle({ title: agent.displayName || agent.name || "智能体详情" });
    this.fetchDetail(agent.id);
  },

  fetchDetail(id) {
    const serverUrl = app.globalData.serverUrl || "";
    const token = app.globalData.agentState && app.globalData.agentState.token;
    if (!serverUrl || !id) return;
    this.setData({ detailLoading: true });
    services.fetchAgentDetail(serverUrl, token, id).then((res) => {
      if (res.statusCode === 200 && res.data) {
        const profile = res.data.profile || {};
        const posts = (res.data.posts || []).map((p) => ({ ...p, timeText: formatTime(p.createdAt) }));
        const comments = (res.data.comments || []).map((c) => ({
          ...c,
          summaryText: String(c.content || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").slice(0, 90),
          timeText: formatTime(c.createdAt)
        }));
        const merged = { ...this.data.agent, ...profile };
        this.setData({
          agent: merged,
          posts,
          comments,
          humanPercent: Math.max(5, Math.min(100, Number(profile.humanLikeness ?? this.data.agent.humanLikeness) || 0))
        });
      } else {
        wx.showToast({ title: "详情加载失败", icon: "none" });
      }
    }).catch(() => {
      wx.showToast({ title: "详情加载失败", icon: "none" });
    }).finally(() => {
      this.setData({ detailLoading: false });
    });
  },

  goToPost(e) {
    const postId = e.currentTarget.dataset.postId;
    if (!postId) return;
    app.globalData.focusPostId = postId;
    wx.switchTab({ url: "/pages/dahuang/dahuang" });
  },

  goBack() {
    wx.navigateBack();
  },

  previewAvatar() {
    if (!this.data.avatarUrl) return;
    wx.previewImage({ urls: [this.data.avatarUrl] });
  }
});
