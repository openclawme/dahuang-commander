/**
 * 购物能力共享模块：商品卡片格式化 + 去购买（返利链接生成）
 * 佣金数据永不进入小程序任何展示（服务端已白名单过滤）
 */
const app = require('./getApp.js');
const { getHeaders } = require('./config.js');

/** 金额格式化为 2 位小数并去尾零（"19.90"→"19.9"，"88"→"88"） */
function fmtYuan(n) {
  const v = Number(n);
  if (!isFinite(v)) return '0';
  return String(Math.round(v * 100) / 100);
}

/** 商品卡片展示字段（价格文本预格式化，WXML 直接用） */
function decorateGoods(goods) {
  if (!Array.isArray(goods) || goods.length === 0) return undefined;
  return goods.map((g) => ({
    ...g,
    priceText: fmtYuan(g.afterCouponYuan),
    originText: fmtYuan(g.priceYuan),
    couponText: fmtYuan(g.couponYuan),
    platformText: g.platform === 'pdd' ? '拼多多' : '京东'
  }));
}

/**
 * 去购买：调服务端生成购买链接。
 * 成功 → { ok: true, url }；拼多多未授权 → { ok: true, needsAuthority: true, url, hint }
 * 失败 → { ok: false, msg }
 */
function requestRebateLink(platform, goodsId) {
  const { serverUrl, agentState } = app.globalData;
  if (!agentState.token) return Promise.resolve({ ok: false, msg: '未登录' });
  return new Promise((resolve) => {
    wx.request({
      url: `${serverUrl}/api/agent/shopping/rebate-link`,
      method: 'POST',
      data: { platform, goodsId },
      header: getHeaders(agentState.token),
      success: (res) => {
        const d = res.data || {};
        if (res.statusCode === 200 && d.success) {
          resolve({ ok: true, url: d.url, needsAuthority: d.needsAuthority === true, hint: d.authorityHint });
        } else if (res.statusCode === 410) {
          resolve({ ok: false, msg: '商品缓存已过期，请重新搜索后再试' });
        } else {
          resolve({ ok: false, msg: d.error || '生成购买链接失败' });
        }
      },
      fail: () => resolve({ ok: false, msg: '网络失败' })
    });
  });
}

/** 展示购买结果：弹窗 + 复制链接（小程序 webview 受业务域名限制，复制引导去官方 App 打开最稳） */
function showBuyResult(result) {
  if (!result.ok) {
    wx.showToast({ title: result.msg, icon: 'none' });
    return;
  }
  if (result.needsAuthority) {
    wx.showModal({
      title: '拼多多首次授权',
      content: `${result.hint || '拼多多首次使用需授权备案'}，复制链接后在拼多多内确认一次即可`,
      confirmText: '复制授权链接',
      cancelText: '取消',
      success: (r) => {
        if (r.confirm) {
          wx.setClipboardData({
            data: result.url,
            success: () => wx.showToast({ title: '已复制，去拼多多确认授权', icon: 'none' })
          });
        }
      }
    });
    return;
  }
  wx.showModal({
    title: '购买链接已生成',
    content: result.url,
    confirmText: '复制链接',
    cancelText: '关闭',
    success: (r) => {
      if (r.confirm) {
        wx.setClipboardData({
          data: result.url,
          success: () => wx.showToast({ title: '已复制，去官方 App 打开下单', icon: 'none' })
        });
      }
    }
  });
}

module.exports = { decorateGoods, requestRebateLink, showBuyResult, fmtYuan };
