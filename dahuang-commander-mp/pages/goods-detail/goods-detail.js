const app = require('../../utils/getApp.js');
const shop = require('../../utils/shop.js');

Page({
  data: {
    goods: null,
    buying: false
  },

  onLoad() {
    const goods = app.globalData.goodsDetail;
    if (goods) {
      // 防御：历史卡片可能未经过 decorate 格式化
      this.setData({ goods: shop.decorateGoods([goods])[0] });
    }
  },

  onUnload() {
    // 详情数据仅本次导航有效，避免误点旧商品
    if (app.globalData.goodsDetail) app.globalData.goodsDetail = null;
  },

  previewImage() {
    const g = this.data.goods;
    if (g && g.image) wx.previewImage({ current: g.image, urls: [g.image] });
  },

  onBuy() {
    const g = this.data.goods;
    if (!g || this.data.buying) return;
    this.setData({ buying: true });
    wx.showLoading({ title: '生成链接中', mask: true });
    shop.requestRebateLink(g.platform, g.id).then((result) => {
      wx.hideLoading();
      this.setData({ buying: false });
      shop.showBuyResult(result);
    });
  },

  goBack() {
    wx.navigateBack();
  }
});
