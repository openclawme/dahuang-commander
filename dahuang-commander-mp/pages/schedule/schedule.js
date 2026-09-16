const app = require('../../utils/getApp.js');
const { getHeaders } = require('../../utils/config.js');

const KIND_MAP = {
  REMINDER: { label: '提醒', cls: 'reminder' },
  TASK: { label: '任务', cls: 'task' },
  RENEWAL: { label: '续费', cls: 'renewal' },
  BILL: { label: '账单', cls: 'bill' },
  DELIVERY: { label: '物流', cls: 'delivery' }
};

// 重复规则（业界通用 RRULE）
const REPEAT_OPTIONS = ['不重复', '每天', '每周', '每月', '每年'];
const REPEAT_RULES = [null, 'FREQ=DAILY', 'FREQ=WEEKLY', 'FREQ=MONTHLY', 'FREQ=YEARLY'];

const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function startOfDay(d) {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  return x;
}

Page({
  data: {
    view: 'week',
    groups: [],
    loading: false,
    inboxCount: 0,
    showSheet: false,
    sheetMode: 'create',
    createTitle: '',
    createDate: '',
    createTime: '',
    repeatIndex: 0,
    repeatOptions: REPEAT_OPTIONS,
    minDate: '',
    submitting: false
  },

  onLoad() {
    const now = new Date();
    this.setData({
      minDate: dayKey(now),
      createDate: dayKey(now),
      createTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`
    });
    this.fetchSchedule();
  },

  onShow() {
    this.fetchSchedule();
  },

  onPullDownRefresh() {
    this.fetchSchedule(() => wx.stopPullDownRefresh());
  },

  switchView(e) {
    const view = e.currentTarget.dataset.view;
    if (view === this.data.view) return;
    this.setData({ view }, () => this.fetchSchedule());
  },

  fetchSchedule(cb) {
    const { serverUrl, agentState } = app.globalData;
    if (!agentState.token) {
      this.setData({ groups: [], loading: false });
      if (cb) cb();
      return;
    }
    this.setData({ loading: true });
    wx.request({
      url: `${serverUrl}/api/agent/schedule?view=${encodeURIComponent(this.data.view)}&limit=200`,
      method: 'GET',
      header: getHeaders(agentState.token),
      success: (res) => {
        if (res.statusCode === 200 && Array.isArray(res.data.items)) {
          this._rawItems = res.data.items;
          this.setData({
            groups: this.groupItems(res.data.items),
            inboxCount: res.data.inboxCount || 0
          });
        } else {
          wx.showToast({ title: '读取日程失败', icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '网络通讯失败', icon: 'none' }),
      complete: () => {
        this.setData({ loading: false });
        if (cb) cb();
      }
    });
  },

  // 分组：已过期 / 今天 / 明天 / 本周内 / 以后 / 待安排（收件箱）/ 已完成
  groupItems(items) {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today.getTime() + 86400000);
    const weekEnd = new Date(today.getTime() + 7 * 86400000);
    const buckets = { overdue: [], today: [], tomorrow: [], week: [], later: [], inbox: [], done: [] };
    const labels = {
      overdue: '已过期', today: '今天', tomorrow: '明天', week: '本周内',
      later: '以后', inbox: '待安排（收件箱）', done: '已完成'
    };

    items.forEach((raw) => {
      const kind = KIND_MAP[raw.kind] || KIND_MAP.REMINDER;
      const isDone = raw.status === 'DONE';
      const due = raw.dueAt ? new Date(raw.dueAt) : null;
      const overdue = Boolean(due && !isDone && due.getTime() < Date.now());
      const item = {
        id: raw.id,
        title: raw.title,
        note: raw.note || '',
        status: raw.status,
        kind: raw.kind,
        kindLabel: kind.label,
        kindClass: kind.cls,
        overdue,
        inbox: !due,
        repeatLabel: raw.rrule ? this.repeatLabel(raw.rrule) : '',
        timeLabel: !due ? '待安排' : (raw.allDay ? '全天' : `${pad(due.getHours())}:${pad(due.getMinutes())}`)
      };
      if (isDone) { buckets.done.push(item); return; }
      if (!due) { buckets.inbox.push(item); return; }
      if (overdue) buckets.overdue.push(item);
      else if (dayKey(due) === dayKey(today)) buckets.today.push(item);
      else if (dayKey(due) === dayKey(tomorrow)) buckets.tomorrow.push(item);
      else if (due < weekEnd) buckets.week.push(item);
      else buckets.later.push(item);
    });

    const order = ['overdue', 'inbox', 'today', 'tomorrow', 'week', 'later', 'done'];
    return order
      .filter((k) => buckets[k].length > 0)
      .map((k) => ({ key: k, title: labels[k], items: buckets[k] }));
  },

  repeatLabel(rrule) {
    const idx = REPEAT_RULES.indexOf(rrule);
    if (idx > 0) return REPEAT_OPTIONS[idx];
    return '重复';
  },

  toggleDone(e) {
    const id = e.currentTarget.dataset.id;
    const status = e.currentTarget.dataset.status;
    this.patchItem(id, { action: status === 'DONE' ? 'reopen' : 'complete' });
  },

  openActions(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.findItem(id);
    if (!item) return;
    const that = this;
    if (!item.dueAt) {
      wx.showActionSheet({
        itemList: ['安排时间', '删除'],
        success: (r) => {
          if (r.tapIndex === 0) that.openArrange(id, item);
          else if (r.tapIndex === 1) that.deleteItem(id);
        }
      });
      return;
    }
    wx.showActionSheet({
      itemList: ['延后 10 分钟', '延后 1 小时', '改成明天同一时间', '取消时间（退回收件箱）', '删除'],
      success: (r) => {
        if (r.tapIndex === 0) that.patchItem(id, { action: 'snooze', snoozeMinutes: 10 });
        else if (r.tapIndex === 1) that.patchItem(id, { action: 'snooze', snoozeMinutes: 60 });
        else if (r.tapIndex === 2) {
          const due = new Date(item.dueAt);
          due.setDate(due.getDate() + 1);
          that.patchItem(id, { dueAt: due.toISOString() });
        } else if (r.tapIndex === 3) that.patchItem(id, { action: 'unschedule' });
        else if (r.tapIndex === 4) that.deleteItem(id);
      }
    });
  },

  findItem(id) {
    return (this._rawItems || []).find((x) => x.id === id) || null;
  },

  patchItem(id, body) {
    const { serverUrl, agentState } = app.globalData;
    wx.request({
      url: `${serverUrl}/api/agent/schedule/${encodeURIComponent(id)}`,
      method: 'PATCH',
      header: getHeaders(agentState.token),
      data: body,
      success: (res) => {
        if (res.statusCode === 200) this.fetchSchedule();
        else wx.showToast({ title: (res.data && res.data.error && res.data.error.message) || '操作失败', icon: 'none' });
      },
      fail: () => wx.showToast({ title: '网络通讯失败', icon: 'none' })
    });
  },

  deleteItem(id) {
    const item = this.findItem(id);
    const title = item ? item.title : "这条日程";
    wx.showModal({
      title: "删除日程",
      content: `确定删除「${title}」吗？删除后无法恢复。`,
      confirmColor: "#9e2a2b",
      success: (r) => {
        if (r.confirm) this.doDeleteItem(id);
      }
    });
  },

  doDeleteItem(id) {
    const { serverUrl, agentState } = app.globalData;
    wx.request({
      url: `${serverUrl}/api/agent/schedule/${encodeURIComponent(id)}`,
      method: 'DELETE',
      header: getHeaders(agentState.token),
      success: () => {
        wx.showToast({ title: '已删除', icon: 'none' });
        this.fetchSchedule();
      },
      fail: () => wx.showToast({ title: '网络通讯失败', icon: 'none' })
    });
  },

  // ---- 新建 ----
  openCreate() {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    this.setData({
      showSheet: true,
      sheetMode: 'create',
      createTitle: '',
      createDate: dayKey(now),
      createTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      repeatIndex: 0,
      editId: ''
    });
  },

  // 收件箱条目：安排时间
  openArrange(id, item) {
    this.setData({
      showSheet: true,
      sheetMode: 'arrange',
      editId: id,
      createTitle: item.title,
      createDate: this.data.createDate,
      createTime: this.data.createTime,
      repeatIndex: 0
    });
  },

  closeSheet() {
    this.setData({ showSheet: false });
  },

  onCreateTitle(e) { this.setData({ createTitle: e.detail.value }); },
  onCreateDate(e) { this.setData({ createDate: e.detail.value }); },
  onCreateTime(e) { this.setData({ createTime: e.detail.value }); },

  // 键盘弹起时把底部弹层整体上移（Huawei 等机型键盘会盖住 fixed 弹层）
  onSheetFocus() {},
  onSheetBlur() { this.setData({ sheetShift: 0 }); },
  onSheetKeyboard(e) {
    const h = (e && e.detail && e.detail.height) || 0;
    if (h !== this.data.sheetShift) this.setData({ sheetShift: h > 0 ? Math.min(h, 380) : 0 });
  },
  onRepeatChange(e) { this.setData({ repeatIndex: Number(e.detail.value) || 0 }); },

  submitSheet() {
    if (this.data.submitting) return;
    const { serverUrl, agentState } = app.globalData;
    const dueAt = `${this.data.createDate} ${this.data.createTime}`;
    const rrule = REPEAT_RULES[this.data.repeatIndex] || undefined;
    this.setData({ submitting: true });

    if (this.data.sheetMode === 'arrange' && this.data.editId) {
      wx.request({
        url: `${serverUrl}/api/agent/schedule/${encodeURIComponent(this.data.editId)}`,
        method: 'PATCH',
        header: getHeaders(agentState.token),
        data: { dueAt, rrule: rrule || null },
        success: (res) => {
          if (res.statusCode === 200) {
            this.setData({ showSheet: false });
            wx.showToast({ title: '已安排', icon: 'none' });
            this.fetchSchedule();
            if (app.requestScheduleSubscribe) app.requestScheduleSubscribe();
          } else {
            wx.showToast({ title: (res.data && res.data.error && res.data.error.message) || '操作失败', icon: 'none' });
          }
        },
        fail: () => wx.showToast({ title: '网络通讯失败', icon: 'none' }),
        complete: () => this.setData({ submitting: false })
      });
      return;
    }

    const title = (this.data.createTitle || '').trim();
    if (!title) {
      wx.showToast({ title: '请填写日程内容', icon: 'none' });
      this.setData({ submitting: false });
      return;
    }
    wx.request({
      url: `${serverUrl}/api/agent/schedule`,
      method: 'POST',
      header: getHeaders(agentState.token),
      data: { title, dueAt, kind: 'REMINDER', advanceMinutes: [0], rrule, source: 'USER' },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ showSheet: false });
          wx.showToast({ title: '已加入日程', icon: 'none' });
          this.fetchSchedule();
          if (app.requestScheduleSubscribe) app.requestScheduleSubscribe();
        } else {
          wx.showToast({ title: (res.data && res.data.error && res.data.error.message) || '创建失败', icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '网络通讯失败', icon: 'none' }),
      complete: () => this.setData({ submitting: false })
    });
  },

  // 新建"待安排"（进收件箱）
  submitInbox() {
    if (this.data.submitting) return;
    const { serverUrl, agentState } = app.globalData;
    const title = (this.data.createTitle || '').trim();
    if (!title) {
      wx.showToast({ title: '请填写内容', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    wx.request({
      url: `${serverUrl}/api/agent/schedule`,
      method: 'POST',
      header: getHeaders(agentState.token),
      data: { title, kind: 'TASK', source: 'USER' },
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ showSheet: false });
          wx.showToast({ title: '已放入收件箱', icon: 'none' });
          this.fetchSchedule();
        } else {
          wx.showToast({ title: (res.data && res.data.error && res.data.error.message) || '创建失败', icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '网络通讯失败', icon: 'none' }),
      complete: () => this.setData({ submitting: false })
    });
  }
});
