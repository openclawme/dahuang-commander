const app = require('../../utils/getApp.js');
const { getHeaders } = require('../../utils/config.js');

const STATUS_MAP = {
  PENDING: '待处理',
  PROCESSING: '进行中',
  COMPLETED: '已完成',
  FAILED: '失败',
  DEAD_LETTER: '已超时',
  CANCELLED: '已取消'
};

function formatTime(value) {
  if (!value) return '--';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '--';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

Page({
  data: {
    id: '',
    task: null,
    events: [],
    loading: true,
    resultText: ''
  },

  onLoad(options) {
    const id = options && options.id ? decodeURIComponent(options.id) : '';
    this.setData({ id });
    this.fetchDetail();
  },

  fetchDetail() {
    const { id } = this.data;
    const serverUrl = app.globalData.serverUrl || '';
    const token = app.globalData.agentState && app.globalData.agentState.token;
    if (!id || !serverUrl || !token) {
      this.setData({ loading: false });
      return;
    }
    wx.request({
      url: `${serverUrl}/api/agent/tasks/${encodeURIComponent(id)}`,
      header: getHeaders(token),
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.task) {
          const t = res.data.task;
          const result = t.result || {};
          const resultText = typeof result.reply === 'string' ? result.reply : (typeof result.summary === 'string' ? result.summary : '');
          const events = (res.data.events || []).map((e) => ({
            ...e,
            timeText: formatTime(e.createdAt),
            contentText: typeof e.content === 'string' ? e.content : ''
          }));
          this.setData({
            task: {
              ...t,
              statusLabel: STATUS_MAP[t.status] || t.status,
              timeText: formatTime(t.createdAt),
              updateText: formatTime(t.updatedAt)
            },
            events,
            resultText,
            loading: false
          });
        } else {
          this.setData({ loading: false });
        }
      },
      fail: () => this.setData({ loading: false })
    });
  },

  retryTask() {
    const { id } = this.data;
    const serverUrl = app.globalData.serverUrl || '';
    const token = app.globalData.agentState && app.globalData.agentState.token;
    wx.showLoading({ title: '重新投递中', mask: true });
    wx.request({
      url: `${serverUrl}/api/agent/tasks/${encodeURIComponent(id)}/retry`,
      method: 'POST',
      header: getHeaders(token),
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.showToast({ title: '已重新投递', icon: 'success' });
          this.fetchDetail();
        } else {
          wx.showToast({ title: (res.data && res.data.error) || '重试失败', icon: 'none' });
        }
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '网络异常', icon: 'none' }); }
    });
  },

  resumeTask() {
    const { id } = this.data;
    const serverUrl = app.globalData.serverUrl || '';
    const token = app.globalData.agentState && app.globalData.agentState.token;
    wx.showLoading({ title: "从检查点续跑", mask: true });
    wx.request({
      url: `${serverUrl}/api/agent/tasks/${encodeURIComponent(id)}/resume`,
      method: "POST",
      header: getHeaders(token),
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode === 200) {
          wx.showToast({ title: res.data.resumedFrom ? "已从检查点继续" : "已重新投递", icon: "success" });
          this.fetchDetail();
        } else {
          wx.showToast({ title: (res.data && res.data.error) || "续跑失败", icon: "none" });
        }
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: "网络异常", icon: "none" }); }
    });
  },

  cancelTask() {
    const { id } = this.data;
    const serverUrl = app.globalData.serverUrl || '';
    const token = app.globalData.agentState && app.globalData.agentState.token;
    wx.showModal({
      title: '取消任务',
      content: '确定取消这个任务吗？',
      success: (r) => {
        if (!r.confirm) return;
        wx.request({
          url: `${serverUrl}/api/agent/tasks/${encodeURIComponent(id)}/cancel`,
          method: 'POST',
          header: getHeaders(token),
          success: (res) => {
            if (res.statusCode === 200) {
              wx.showToast({ title: '已取消', icon: 'success' });
              this.fetchDetail();
            } else {
              wx.showToast({ title: (res.data && res.data.error) || '取消失败', icon: 'none' });
            }
          }
        });
      }
    });
  }
});
