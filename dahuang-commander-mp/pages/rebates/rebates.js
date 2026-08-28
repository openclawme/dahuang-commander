const app = require('../../utils/getApp.js');
const i18n = require('../../utils/i18n.js');
const { getHeaders } = require('../../utils/config.js');

Page({
  data: {
    t: i18n.getDict(),
    loading: true,
    summary: { total: 0, pendingCount: 0, settledCount: 0, pendingYuan: 0, settledYuan: 0 },
    orders: []
  },

  onLoad() {
    this.setData({ t: i18n.getDict() });
    this.fetchOrders(false);
  },

  onShow() {
    this.setData({ t: i18n.getDict() });
  },

  fetchOrders(refresh) {
    const { serverUrl, agentState } = app.globalData;
    if (!agentState.token) {
      this.setData({ loading: false });
      return;
    }
    this.setData({ loading: true });
    wx.request({
      // 刷新（写操作）走 POST /orders；列表走 GET（只读）
      url: `${serverUrl}/api/agent/shopping/orders`,
      method: refresh ? 'POST' : 'GET',
      header: getHeaders(agentState.token),
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.success) {
          const orders = (res.data.orders || []).map((o) => ({
            ...o,
            statusText: o.status === 'SETTLED' ? '已结算' : o.status === 'PAID' ? '待结算' : '无效',
            platformText: o.platform === 'pdd' ? '拼多多' : '京东',
            timeText: (o.createdAt || '').slice(0, 10)
          }));
          this.setData({ summary: res.data.summary || this.data.summary, orders, loading: false });
        } else {
          this.setData({ loading: false });
          wx.showToast({ title: (res.data && res.data.error) || '加载失败', icon: 'none' });
        }
      },
      fail: () => {
        this.setData({ loading: false });
        wx.showToast({ title: '网络失败', icon: 'none' });
      }
    });
  },

  onRefresh() {
    this.fetchOrders(true);
  },

  goBack() {
    wx.navigateBack();
  }
});
