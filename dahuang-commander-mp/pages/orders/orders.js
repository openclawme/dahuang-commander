const app = require('../../utils/getApp.js');
const i18n = require('../../utils/i18n.js');
const { getHeaders } = require('../../utils/config.js');

/**
 * 购买记录：主人通过返利链接/购买入口下单的订单回传列表。
 * 只显示商品、平台、状态与时间——不显示任何金额/佣金（佣金对最终用户全程屏蔽）。
 */
Page({
  data: {
    t: i18n.getDict(),
    loading: true,
    summary: { total: 0, pendingCount: 0, settledCount: 0 },
    orders: []
  },

  onLoad() {
    this.setData({ t: i18n.getDict() });
    this.fetchOrders(false);
  },

  onShow() {
    this.setData({ t: i18n.getDict() });
  },

  onPullDownRefresh() {
    // 下拉 = 主动同步最新订单（写操作走 POST）
    this.fetchOrders(true, () => wx.stopPullDownRefresh());
  },

  fetchOrders(refresh, done) {
    const { serverUrl, agentState } = app.globalData;
    if (!agentState.token) {
      this.setData({ loading: false });
      if (done) done();
      return;
    }
    this.setData({ loading: true });
    wx.request({
      url: `${serverUrl}/api/agent/shopping/orders`,
      method: refresh ? 'POST' : 'GET',
      header: getHeaders(agentState.token),
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.success) {
          const orders = (res.data.orders || []).map((o) => ({
            ...o,
            statusText: o.status === 'SETTLED' ? '已结算' : o.status === 'PAID' ? '待结算' : '无效',
            statusClass: o.status === 'SETTLED' ? 'settled' : o.status === 'PAID' ? 'pending' : 'invalid',
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
      },
      complete: () => { if (done) done(); }
    });
  },

  onRefreshTap() {
    this.fetchOrders(true);
  },

  goBack() {
    wx.navigateBack();
  }
});
