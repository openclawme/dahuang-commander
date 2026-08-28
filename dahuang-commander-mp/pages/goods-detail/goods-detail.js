const app = require('../../utils/getApp.js');
const shop = require('../../utils/shop.js');
const { getHeaders } = require('../../utils/config.js');

Page({
  data: {
    goods: null,
    detail: null, // { gallery, detailImages, desc, categoryText, packingList, specGroups, bookIntro }
    related: [], // 类目热销推荐卡片
    buying: false
  },

  onLoad() {
    const goods = app.globalData.goodsDetail;
    if (goods) {
      // 防御：历史卡片可能未经过 decorate 格式化
      const decorated = shop.decorateGoods([goods])[0];
      this.setData({ goods: decorated });
      this.fetchDetail(decorated);
    }
  },

  onUnload() {
    // 详情数据仅本次导航有效，避免误点旧商品
    if (app.globalData.goodsDetail) app.globalData.goodsDetail = null;
  },

  // 商详大字段：轮播图 + 图文详情（佣金数据服务端已白名单过滤，不下发）
  fetchDetail(goods) {
    const { serverUrl, agentState } = app.globalData;
    if (!agentState.token || !goods) return;
    wx.request({
      url: `${serverUrl}/api/agent/shopping/goods-detail`,
      method: 'POST',
      data: { platform: goods.platform, goodsId: goods.id },
      header: getHeaders(agentState.token),
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.success && res.data.detail) {
          const d = res.data.detail;
          this.setData({
            detail: {
              ...d,
              // 轮播图为空时回退搜索主图
              gallery: (d.gallery && d.gallery.length > 0) ? d.gallery : [goods.image].filter(Boolean)
            },
            related: shop.decorateGoods(res.data.related || []) || []
          });
        }
      }
      // 详情获取失败不阻塞购买：页面仍可用
    });
  },

  // 点推荐卡片：原地切换商品（拉新详情 + 新推荐，滚动回顶部）
  onRelatedTap(e) {
    const goodsId = e.currentTarget.dataset.goodsId;
    const related = this.data.related || [];
    const card = related.find((g) => g.id === goodsId);
    if (!card) return;
    app.globalData.goodsDetail = card;
    this.setData({ goods: card, detail: null, related: [] });
    if (this.scrollToTopTimer) clearTimeout(this.scrollToTopTimer);
    this.scrollToTopTimer = setTimeout(() => {
      wx.pageScrollTo({ scrollTop: 0, duration: 200 });
      this.fetchDetail(card);
    }, 300);
  },

  previewGallery(e) {
    const urls = (this.data.detail && this.data.detail.gallery) || [];
    if (!urls.length) return;
    const current = urls[e.currentTarget.dataset.index || 0] || urls[0];
    wx.previewImage({ current, urls });
  },

  previewDetailImage(e) {
    const urls = (this.data.detail && this.data.detail.detailImages) || [];
    const src = e.currentTarget.dataset.src;
    if (!urls.length || !src) return;
    wx.previewImage({ current: src, urls });
  },

  onBuy() {
    const g = this.data.goods;
    if (!g || this.data.buying) return;
    if (this.data.detail && this.data.detail.onSale === false) {
      wx.showToast({ title: '该商品已下架，无法购买', icon: 'none' });
      return;
    }
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
