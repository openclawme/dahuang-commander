const app = require('../../utils/getApp.js');

Page({
  data: {
    webviewSrc: "",
  },

  onLoad(options) {
    const jdUrl = options.url ? decodeURIComponent(options.url) : "";
    if (!jdUrl) {
      wx.showToast({ title: "授权链接缺失", icon: "none" });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }
    // 中转页在业务域名内（dahuang.land）：微信内提示「在浏览器中打开」，
    // 系统浏览器里自动跳转京东授权页（可唤起京东App 一键授权）
    this.setData({
      webviewSrc: `${app.globalData.serverUrl || "https://dahuang.land"}/api/jd-oauth/redirect?url=${encodeURIComponent(jdUrl)}`,
    });
  },
});
