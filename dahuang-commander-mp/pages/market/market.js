const app = require('../../utils/getApp.js');
const { getHeaders } = require('../../utils/config.js');

/** 集市频道：前三个是聚推客活动组（频次最高排最前），后五个是京东/拼多多商品频道 */
const CHANNELS = [
  { key: "jtk_hongbao", label: "外卖红包", sub: "美团·饿了么", kind: "jtk" },
  { key: "jtk_travel", label: "出行酒店", sub: "打车·酒店", kind: "jtk" },
  { key: "jtk_deal", label: "电商捡漏", sub: "淘宝·京东·拼多多", kind: "jtk" },
  { key: "guess", label: "猜你喜欢", sub: "京东精选", kind: "feed" },
  { key: "bigcoupon", label: "大额券", sub: "京东精选", kind: "feed" },
  { key: "nine9", label: "9.9包邮", sub: "京东精选", kind: "feed" },
  { key: "pdd_subsidy", label: "百亿补贴", sub: "拼多多", kind: "feed" },
  { key: "pdd_seckill", label: "秒杀", sub: "拼多多", kind: "feed" },
];

// 聚推客活动分组规则（按官方 cate_name + 名称关键词）
const JTK_GROUPS = {
  jtk_hongbao: { cates: ["美团", "饿了么", "肯德基", "麦当劳", "汉堡王", "华莱士", "瑞幸咖啡", "库迪咖啡", "奈雪的茶", "喜茶", "星巴克", "百果园", "必胜客"], words: /外卖|红包|餐|咖啡|奶茶|餐券|团购/ },
  jtk_travel: { cates: ["滴滴", "高德打车", "T3出行", "同程出行", "携程旅行", "分销酒店", "景点门票", "特价快递", "电影"], words: /打车|出行|酒店|民宿|门票|电影|快递/ },
  jtk_deal: { cates: ["京东", "拼多多", "淘宝", "唯品会", "话费充值", "电费充值", "会员充值", "流量卡"], words: /电商|补贴|充值|会员/ },
};

function fmtYuan(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return v >= 100 ? String(Math.round(v)) : String(Math.round(v * 100) / 100);
}

Page({
  data: {
    channels: CHANNELS,
    activeChannel: "jtk_hongbao",
    goods: [],
    activities: [],
    loading: false,
    loadError: "",
    keyword: "",
    searching: false,
    pddAuthNotice: false,
    orderBadge: 0,
    serverUrl: "",
    // 比价视图（搜索结果的京东/拼多多分列对比）
    cmpMode: true,
    cmpJd: [],
    cmpPdd: [],
    minJdText: "",
    minPddText: "",
    cmpWinner: "", // "jd" | "pdd"
    cmpWinnerText: "",
  },

  onLoad() {
    this.setData({ serverUrl: app.globalData.serverUrl || "" });
    this.loadChannel("jtk_hongbao");
    this.refreshOrderBadge();
    this.checkPddAuth();
  },

  onShow() {
    this.refreshOrderBadge();
  },

  request(path, method, data) {
    const { serverUrl, agentState } = app.globalData;
    if (!agentState || !agentState.token) return Promise.reject(new Error("未登录"));
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${serverUrl}${path}`,
        method,
        data,
        header: getHeaders(agentState.token),
        success: (res) => {
          if (res.statusCode === 200) resolve(res.data);
          else reject(new Error((res.data && res.data.error) || `HTTP ${res.statusCode}`));
        },
        fail: () => reject(new Error("网络异常")),
      });
    });
  },

  selectChannel(e) {
    const key = e.currentTarget.dataset.key;
    if (key === this.data.activeChannel) return;
    this.setData({ activeChannel: key, keyword: "", searching: false, loadError: "" });
    this.loadChannel(key);
  },

  loadChannel(key) {
    const ch = CHANNELS.find((c) => c.key === key);
    if (!ch) return;
    if (ch.kind === "jtk") return this.loadJtkGroup(key);
    this.setData({ loading: true });
    this.request("/api/agent/shopping/feed", "POST", { channel: key, limit: 20 })
      .then((r) => {
        const goods = (r.goods || []).map((g) => this.decorate(g));
        this.setData({
          loading: false,
          goods,
          activities: [],
          loadError: goods.length ? "" : "该频道暂无商品",
          pddAuthNotice: key.startsWith("pdd_") && r.pddAuthorityUrl,
        });
      })
      .catch((err) => this.setData({ loading: false, goods: [], loadError: err.message || "加载失败" }));
  },

  /** 聚推客活动：一次拉全量，客户端按组过滤（免每次切频道都打接口） */
  loadJtkGroup(key) {
    this.setData({ loading: !this._jtkAll, goods: [], loadError: "" });
    const apply = (all) => {
      const rule = JTK_GROUPS[key];
      const list = (all || []).filter(
        (a) => (rule.cates.indexOf(a.platform) !== -1) || rule.words.test(a.name),
      );
      this.setData({
        loading: false,
        activities: list,
        loadError: list.length ? "" : "该组暂无活动",
      });
    };
    if (this._jtkAll) return apply(this._jtkAll);
    this.request("/api/agent/shopping/jtk?action=activities", "GET")
      .then((r) => {
        this._jtkAll = r.activities || [];
        apply(this._jtkAll);
      })
      .catch((err) => this.setData({ loading: false, activities: [], loadError: err.message || "活动加载失败" }));
  },

  decorate(g) {
    return {
      ...g,
      priceText: fmtYuan(g.priceYuan),
      afterText: fmtYuan(g.afterCouponYuan),
      platformText: g.platform === "pdd" ? "拼多多" : g.platform === "jd" ? "京东" : g.platform || "",
    };
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    const keyword = (this.data.keyword || "").trim();
    if (!keyword) {
      wx.showToast({ title: "先输入想买的商品", icon: "none" });
      return;
    }
    this.setData({ searching: true, loading: true, goods: [], activities: [], loadError: "" });
    this.request("/api/agent/shopping/search", "POST", { keyword })
      .then((r) => {
        const all = (r.goods || []).map((g) => this.decorate(g));
        const jd = all.filter((g) => g.platform === "jd").sort((a, b) => a.afterCouponYuan - b.afterCouponYuan).slice(0, 5);
        const pdd = all.filter((g) => g.platform === "pdd").sort((a, b) => a.afterCouponYuan - b.afterCouponYuan).slice(0, 5);
        const minJd = jd.length ? jd[0].afterText : "";
        const minPdd = pdd.length ? pdd[0].afterText : "";
        let cmpWinner = "";
        let cmpWinnerText = "";
        if (jd.length && pdd.length) {
          cmpWinner = jd[0].afterCouponYuan <= pdd[0].afterCouponYuan ? "jd" : "pdd";
          cmpWinnerText = cmpWinner === "jd"
            ? `京东更划算，低 ${(pdd[0].afterCouponYuan - jd[0].afterCouponYuan).toFixed(2)} 元`
            : `拼多多更划算，低 ${(jd[0].afterCouponYuan - pdd[0].afterCouponYuan).toFixed(2)} 元`;
        } else if (jd.length) {
          cmpWinnerText = "拼多多暂无可比价结果";
        } else if (pdd.length) {
          cmpWinnerText = "京东暂无可比价结果";
        }
        this.setData({
          searching: true,
          loading: false,
          goods: all,
          loadError: all.length ? "" : "没搜到，换个词或问问分身",
          pddAuthNotice: !!r.pddAuthorityUrl,
          cmpJd: jd,
          cmpPdd: pdd,
          minJdText: minJd,
          minPddText: minPdd,
          cmpWinner,
          cmpWinnerText,
        });
      })
      .catch((err) => this.setData({ searching: true, loading: false, goods: [], loadError: err.message || "搜索失败" }));
  },

  /** 长句转交分身：把输入内容带回对谈页自动发送 */
  askAgent() {
    const keyword = (this.data.keyword || "").trim();
    if (!keyword) {
      wx.showToast({ title: "先输入你想买什么", icon: "none" });
      return;
    }
    app.globalData.pendingMasterCommand = `帮我看看：${keyword}`;
    wx.switchTab({ url: "/pages/index/index" });
  },

  toggleCmpMode() {
    this.setData({ cmpMode: !this.data.cmpMode });
  },

  onCmpGoodsTap(e) {
    const platform = e.currentTarget.dataset.platform;
    const idx = e.currentTarget.dataset.index;
    const list = platform === "jd" ? this.data.cmpJd : this.data.cmpPdd;
    const g = list && list[idx];
    if (!g) return;
    app.globalData.goodsDetail = g;
    wx.navigateTo({ url: "/pages/goods-detail/goods-detail" });
  },

  onGoodsTap(e) {
    const idx = e.currentTarget.dataset.index;
    const g = this.data.goods[idx];
    if (!g) return;
    app.globalData.goodsDetail = g;
    wx.navigateTo({ url: "/pages/goods-detail/goods-detail" });
  },

  onActivityTap(e) {
    const idx = e.currentTarget.dataset.index;
    const a = this.data.activities[idx];
    if (!a) return;
    wx.showLoading({ title: "生成链接", mask: true });
    this.request(`/api/agent/shopping/jtk?action=link&actId=${a.actId}`, "GET")
      .then((r) => {
        wx.hideLoading();
        const link = r.link || {};
        if (link.weAppId && link.weAppPath) {
          wx.navigateToMiniProgram({
            appId: link.weAppId,
            path: link.weAppPath.startsWith("/") ? link.weAppPath : "/" + link.weAppPath,
            fail: () => this.copyH5(link.h5),
          });
        } else if (link.h5) {
          this.copyH5(link.h5);
        } else {
          wx.showToast({ title: "该活动暂无链接", icon: "none" });
        }
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({ title: err.message || "链接生成失败", icon: "none" });
      });
  },

  copyH5(url) {
    wx.setClipboardData({
      data: url,
      success: () => wx.showToast({ title: "链接已复制，微信里打开即可", icon: "none" }),
    });
  },

  refreshOrderBadge() {
    this.request("/api/agent/shopping/orders", "GET")
      .then((r) => {
        const n = (r.summary && r.summary.pendingCount) || 0;
        if (n !== this.data.orderBadge) this.setData({ orderBadge: n });
      })
      .catch(() => {});
  },

  checkPddAuth() {
    this.request("/api/agent/shopping/pdd-authority", "GET")
      .then((r) => {
        if (r.success && r.bound !== true) this.setData({ pddAuthNotice: true });
      })
      .catch(() => {});
  },

  goAuth() {
    wx.switchTab({ url: "/pages/settings/settings" });
  },

  goOrders() {
    wx.navigateTo({ url: "/pages/orders/orders" });
  },
});
