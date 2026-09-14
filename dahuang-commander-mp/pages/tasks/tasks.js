const app = require('../../utils/getApp.js');
const { getHeaders } = require('../../utils/config.js');

const STATUS_MAP = {
  PENDING: { label: '待处理', cls: 'pending' },
  PROCESSING: { label: '进行中', cls: 'processing' },
  COMPLETED: { label: '已完成', cls: 'completed' },
  FAILED: { label: '失败', cls: 'failed' },
  DEAD_LETTER: { label: '已超时', cls: 'failed' },
  CANCELLED: { label: '已取消', cls: 'cancelled' }
};

function formatTime(value) {
  if (!value) return '--';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '--';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

Page({
  data: {
    filter: 'processing',
    tasks: [],
    counts: { pending: 0, processing: 0, completed: 0, failed: 0, total: 0 },
    loading: false,
    page: 1,
    hasMore: true,
    cronJobs: [],
    cronLoading: false
  },

  onLoad() {
    this.fetchAll();
  },

  onShow() {
    this.fetchAll();
  },

  onPullDownRefresh() {
    this.fetchAll(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) this.fetchTasks(false);
  },

  fetchAll(cb) {
    this.fetchTasks(true, cb);
    this.fetchCronJobs();
  },

  fetchTasks(reset, cb) {
    const token = app.globalData.agentState && app.globalData.agentState.token;
    const serverUrl = app.globalData.serverUrl || '';
    if (!token || !serverUrl) {
      this.setData({ loading: false });
      if (cb) cb();
      return;
    }
    const page = reset ? 1 : this.data.page + 1;
    this.setData({ loading: true });
    wx.request({
      url: `${serverUrl}/api/agent/tasks?status=${this.data.filter}&page=${page}&limit=20`,
      header: getHeaders(token),
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const list = (res.data.tasks || []).map((t) => ({
            ...t,
            statusLabel: (STATUS_MAP[t.status] || { label: t.status }).label,
            statusCls: (STATUS_MAP[t.status] || { cls: 'pending' }).cls,
            timeText: formatTime(t.createdAt)
          }));
          const tasks = reset ? list : this.data.tasks.concat(list);
          const pagination = res.data.pagination || {};
          this.setData({
            tasks,
            counts: res.data.counts || this.data.counts,
            page,
            hasMore: page < (pagination.totalPages || 1)
          });
        }
      },
      complete: () => {
        this.setData({ loading: false });
        if (cb) cb();
      }
    });
  },

  fetchCronJobs() {
    const token = app.globalData.agentState && app.globalData.agentState.token;
    const serverUrl = app.globalData.serverUrl || '';
    if (!token || !serverUrl) return;
    this.setData({ cronLoading: true });
    wx.request({
      url: `${serverUrl}/api/agent/cron?status=all`,
      header: getHeaders(token),
      success: (res) => {
        if (res.statusCode === 200 && res.data && Array.isArray(res.data.cronJobs)) {
          this.setData({
            cronJobs: res.data.cronJobs.map((j) => ({
              ...j,
              statusLabel: j.status === 'ACTIVE' ? '运行中' : '已暂停',
              timeText: formatTime(j.lastRunAt || j.createdAt)
            }))
          });
        }
      },
      complete: () => this.setData({ cronLoading: false })
    });
  },

  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter || 'all';
    if (filter === this.data.filter) return;
    this.setData({ filter, tasks: [], page: 1, hasMore: true });
    if (filter === 'cron') {
      this.fetchCronJobs();
    } else {
      this.fetchTasks(true);
    }
  },

  openTaskDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/task-detail/task-detail?id=${encodeURIComponent(id)}` });
  },

  retryTask(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
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
          this.fetchTasks(true);
        } else {
          wx.showToast({ title: (res.data && res.data.error) || '重试失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '网络异常', icon: 'none' });
      }
    });
  },

  cancelTask(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
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
              this.fetchTasks(true);
            } else {
              wx.showToast({ title: (res.data && res.data.error) || '取消失败', icon: 'none' });
            }
          }
        });
      }
    });
  },

  cronAction(e) {
    const id = e.currentTarget.dataset.id;
    const action = e.currentTarget.dataset.action;
    if (!id || !action) return;
    const serverUrl = app.globalData.serverUrl || '';
    const token = app.globalData.agentState && app.globalData.agentState.token;
    wx.request({
      url: `${serverUrl}/api/agent/cron`,
      method: 'PATCH',
      header: getHeaders(token),
      data: { jobId: id, action },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({ title: res.data.message || '操作成功', icon: 'none' });
          this.fetchCronJobs();
        } else {
          wx.showToast({ title: (res.data && res.data.error) || '操作失败', icon: 'none' });
        }
      }
    });
  }
});
