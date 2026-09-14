const app = require('../../utils/getApp.js');
const { getHeaders } = require('../../utils/config.js');

function formatTime(value) {
  if (!value) return '--';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '--';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

Page({
  data: {
    notifications: [],
    failedTasks: [],
    unread: 0,
    pendingCount: 0,
    settings: { taskDone: true, taskFailed: true, decisions: true, postReply: true, dailyDigest: false, schedulePush: true, dailyCap: 20, digestAt: '08:00', quietStart: '', quietEnd: '' },
    capOptions: [0, 5, 10, 20, 50],
  },

  onShow() {
    this.loadSettings();
    this.fetchNotifications();
    this.fetchFailedTasks();
    this.setData({ pendingCount: app.globalData.pendingDecisionCount || 0 });
  },

  loadSettings() {
    let settings = this.data.settings;
    try {
      const saved = wx.getStorageSync("dahuangNotifySettings");
      if (saved && typeof saved === "object") settings = { ...settings, ...saved };
    } catch (e) {}
    this.setData({ settings });
    const serverUrl = app.globalData.serverUrl || '';
    const token = app.globalData.agentState && app.globalData.agentState.token;
    if (!serverUrl || !token) return;
    wx.request({
      url: `${serverUrl}/api/agent/notifications/settings`,
      header: getHeaders(token),
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.settings) {
          const s = res.data.settings;
          const settings = {
            taskDone: !!s.taskDone,
            taskFailed: !!s.taskFailed,
            decisions: !!s.decisions,
            postReply: !!s.postReply,
            dailyDigest: !!s.dailyDigest,
            schedulePush: s.schedulePush !== false,
            dailyCap: Number.isFinite(Number(s.dailyCap)) ? Number(s.dailyCap) : 20,
            digestAt: s.digestAt || '08:00',
            quietStart: s.quietStart || '',
            quietEnd: s.quietEnd || ''
          };
          try { wx.setStorageSync("dahuangNotifySettings", settings); } catch (e) {}
          this.setData({ settings });
        }
      }
    });
  },

  toggleSetting(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    const settings = { ...this.data.settings, [key]: !this.data.settings[key] };
    try { wx.setStorageSync("dahuangNotifySettings", settings); } catch (err) {}
    this.setData({ settings });
    const serverUrl = app.globalData.serverUrl || '';
    const token = app.globalData.agentState && app.globalData.agentState.token;
    if (!serverUrl || !token) return;
    wx.request({
      url: `${serverUrl}/api/agent/notifications/settings`,
      method: "PATCH",
      header: getHeaders(token),
      data: { [key]: settings[key] },
      fail: () => {
        const rolled = { ...this.data.settings, [key]: !settings[key] };
        try { wx.setStorageSync("dahuangNotifySettings", rolled); } catch (e) {}
        this.setData({ settings: rolled });
        wx.showToast({ title: "设置未同步，已恢复", icon: "none" });
      }
    });
  },

  fetchNotifications() {
    const serverUrl = app.globalData.serverUrl || '';
    const token = app.globalData.agentState && app.globalData.agentState.token;
    if (!serverUrl || !token) return;
    wx.request({
      url: `${serverUrl}/api/agent/notifications?limit=50`,
      header: getHeaders(token),
      success: (res) => {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.notifications)) {
          this.setData({
            notifications: res.data.notifications.map((n) => ({ ...n, timeText: formatTime(n.createdAt) })),
            unread: res.data.unread || 0
          });
        }
      }
    });
  },

  fetchFailedTasks() {
    const serverUrl = app.globalData.serverUrl || '';
    const token = app.globalData.agentState && app.globalData.agentState.token;
    if (!serverUrl || !token) return;
    wx.request({
      url: `${serverUrl}/api/agent/tasks?status=failed&page=1&limit=5`,
      header: getHeaders(token),
      success: (res) => {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.tasks)) {
          this.setData({ failedTasks: res.data.tasks.map((t) => ({ ...t, timeText: formatTime(t.createdAt) })) });
        }
      }
    });
  },

  markAllRead() {
    const serverUrl = app.globalData.serverUrl || '';
    const token = app.globalData.agentState && app.globalData.agentState.token;
    if (!serverUrl || !token) return;
    wx.request({
      url: `${serverUrl}/api/agent/notifications`,
      method: 'POST',
      header: getHeaders(token),
      data: { all: true },
      success: () => { wx.showToast({ title: '已全部标记为已读', icon: 'none' }); this.fetchNotifications(); }
    });
  },

  clearAll() {
    const serverUrl = app.globalData.serverUrl || '';
    const token = app.globalData.agentState && app.globalData.agentState.token;
    if (!serverUrl || !token) return;
    wx.showModal({
      title: '清空提醒',
      content: '确定清空全部提醒吗？',
      success: (r) => {
        if (!r.confirm) return;
        wx.request({
          url: `${serverUrl}/api/agent/notifications`,
          method: 'DELETE',
          header: getHeaders(token),
          success: () => { wx.showToast({ title: '已清空', icon: 'none' }); this.fetchNotifications(); }
        });
      }
    });
  },

  openTask(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/task-detail/task-detail?id=${encodeURIComponent(id)}` });
  },

  // 日程提醒 → 直达日程中心
  openSchedule() {
    wx.navigateTo({ url: '/pages/schedule/schedule' });
  },

  patchSetting(patch) {
    const serverUrl = app.globalData.serverUrl || '';
    const token = app.globalData.agentState && app.globalData.agentState.token;
    if (!serverUrl || !token) return;
    wx.request({
      url: `${serverUrl}/api/agent/notifications/settings`,
      method: 'PATCH',
      header: getHeaders(token),
      data: patch,
      fail: () => wx.showToast({ title: '设置未同步', icon: 'none' })
    });
  },

  onQuietStart(e) { this.setData({ 'settings.quietStart': e.detail.value }); this.patchSetting({ quietStart: e.detail.value }); },
  onQuietEnd(e) { this.setData({ 'settings.quietEnd': e.detail.value }); this.patchSetting({ quietEnd: e.detail.value }); },
  onDigestAt(e) { this.setData({ 'settings.digestAt': e.detail.value }); this.patchSetting({ digestAt: e.detail.value }); },
  onCapChange(e) {
    const cap = this.data.capOptions[Number(e.detail.value)] || 20;
    this.setData({ 'settings.dailyCap': cap });
    this.patchSetting({ dailyCap: cap });
  },
  clearQuiet() {
    this.setData({ 'settings.quietStart': '', 'settings.quietEnd': '' });
    this.patchSetting({ quietStart: null, quietEnd: null });
  },

  openDecisions() {
    wx.navigateTo({ url: '/pages/decisions/decisions' });
  }
});
