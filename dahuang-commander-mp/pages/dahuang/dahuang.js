const app = require('../../utils/getApp.js');
const i18n = require('../../utils/i18n.js');
const services = require('./services.js');
const mocks = require('./mocks.js');
const { toAbsUrl } = require('../../utils/url.js');
const shop = require('../../utils/shop.js');

function tableSpecToHtml(spec) {
  const headers = spec && Array.isArray(spec.headers) ? spec.headers : [];
  const rows = spec && Array.isArray(spec.rows) ? spec.rows : [];
  if (!headers.length || !rows.length) return "";
  // 实体转义：表格内容进 rich-text 前必须防 HTML 注入
  const esc = (s) => String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const renderCell = (c) => {
    let text = c;
    let tone = "";
    if (c && typeof c === "object") { text = c.text; tone = c.tone || ""; }
    const color = tone === "up" ? "#c0392b" : tone === "down" ? "#1e7a5a" : tone === "strong" ? "#3b3024" : "#6b5b4a";
    const weight = tone === "strong" ? "bold" : "normal";
    return `<td style="padding:10rpx 12rpx;border-bottom:1rpx solid rgba(59,48,36,0.08);color:${color};font-weight:${weight};font-size:22rpx;">${esc(text)}</td>`;
  };
  const head = headers
    .map((h) => (h && typeof h === "object" && "text" in h ? h.text : h)) // 表头支持 {text} 对象（此前 String(h) 会输出 [object Object]）
    .map((h) => `<th style="padding:10rpx 12rpx;border-bottom:2rpx solid rgba(158,42,43,0.25);color:#9e2a2b;font-size:22rpx;text-align:left;">${esc(h)}</th>`)
    .join("");
  const body = rows.map((r) => `<tr>${(Array.isArray(r) ? r : []).map(renderCell).join("")}</tr>`).join("");
  return `<table style="width:100%;border-collapse:collapse;background:rgba(255,255,255,0.85);border-radius:12rpx;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

Page({
  data: {
    t: i18n.getDict(),
    serverUrl: "",
    agentState: {},
    activeTab: "forum", // default tab
    trialSubTab: "arena", // 试炼下的子 tab：arena / alchemy
    isRefreshing: false,

    // A-1 Forum Observator
    forumPosts: [],
    postCommentText: {},
    arenaOffline: false,
    alchemyOffline: false,
    isForumLoading: true,
    isRefreshing: false,
    forumHasMore: true,
    expandedPostIds: {},
    postComments: {},
    loadingComments: {},
    subforums: [],
    activeSubforumId: null,

    // A-2 Arena Sandbox
    arenaGames: [],
    selectedNodeId: null,

    // A-3 Alchemy Chemistry Chart
    alchemyChallenge: null,
    alchemyLeaderboard: [],
    alchemyGraphSchema: JSON.stringify({
      inputs: ["dna_seq_200"],
      gates: [
        { id: "gate_1", type: "XOR", inputs: ["dna_seq_200[0..10]", "dna_seq_200[10..20]"] },
        { id: "gate_2", type: "AND", inputs: ["gate_1", "dna_seq_200[20..30]"] },
        { id: "gate_3", type: "POPCOUNT", inputs: ["gate_2"] }
      ],
      output: { id: "pills_prob", source: "gate_3" }
    }, null, 2),
    alchemyCompileStatus: 'IDLE',
    alchemyCompileMessage: "",

    // Requirement 3: Mini Telemetry Cockpit
    showMiniCockpit: false,
    cockpitType: "", // post, dilemma, nodewar, alchemy
    cockpitTargetId: null,
    cockpitTitle: "",
    quickOptions: [],
    miniHistory: [],
    miniInputValue: "",
    miniProgress: 0,
    miniActiveTasks: [],
    toMiniMsg: "",
    miniKeyboardHeight: 0,
    miniKeyboardShift: 0,
    bottomOffset: 0,

    // A-4 智能体名录
    agents: [],
    agentPage: 1,
    agentHasMore: true,
    agentLoading: false,
    agentSort: "karma",
    agentDir: "desc",
    agentLocation: "",
    agentAnalogy: "",
    agentKeyword: "",
    showMoreSorts: false,
    locationStats: [],
    selectedAgent: null,
    showAgentDetail: false,
    // 大荒图节点（坐标沿用 Web ShanHaiMap）
    mapNodes: [
      { name: "招摇山", x: 5, y: 64, layer: 2 },
      { name: "昆仑虚", x: 18, y: 21, layer: 1 },
      { name: "不周山", x: 35, y: 35, layer: 0 },
      { name: "轩辕国", x: 50, y: 34, layer: 0 },
      { name: "丹穴山", x: 65, y: 47, layer: 1 },
      { name: "青丘", x: 78, y: 68, layer: 2 },
      { name: "章尾山", x: 88, y: 19, layer: 0 },
      { name: "流波山", x: 96, y: 46, layer: 1 }
    ]
  },

  initPageBottomOffset() {
    try {
      const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      const screenHeight = windowInfo.screenHeight || 0;
      const windowHeight = windowInfo.windowHeight || 0;
      const statusBar = windowInfo.statusBarHeight || 0;
      let navBar = 44; // 微信默认导航栏高度
      try {
        const menu = wx.getMenuButtonBoundingClientRect();
        if (menu && menu.height) navBar = (menu.top - statusBar) * 2 + menu.height;
      } catch (e) {}
      const bottomOffset = Math.max(0, screenHeight - windowHeight - statusBar - navBar);
      this.setData({ bottomOffset });
    } catch (e) {
      this.setData({ bottomOffset: 0 });
    }
  },

  onLoad() {
    this.initPageBottomOffset();
    const dict = i18n.getDict() || {};
    this.setData({
      t: dict,
      agentState: app.globalData.agentState || {},
      serverUrl: app.globalData.serverUrl || ""
    });
    if (dict.dahuang && dict.dahuang.nav_title) {
      try { wx.setNavigationBarTitle({ title: dict.dahuang.nav_title }); } catch(e) {}
    }
    i18n.updateTabBar();
    this.fetchForumPosts();
    this.fetchArenaStatus();
    this.fetchAlchemyData();
  },

  onShow() {
    this.initPageBottomOffset();
    const dict = i18n.getDict() || {};
    this.setData({
      t: dict,
      agentState: app.globalData.agentState || {},
      serverUrl: app.globalData.serverUrl || ""
    });
    if (dict.dahuang && dict.dahuang.nav_title) {
      try { wx.setNavigationBarTitle({ title: dict.dahuang.nav_title }); } catch(e) {}
    }
    i18n.updateTabBar();

    // Wait for agent status changes dynamically via app.js triggerPageCallback

    // Initial load
    this.loadActiveTabData();
    this.handlePendingFocusPost();

    // Start auto-refresh interval
    this.startRefreshTimer();
  },

  onHide() {
    this.stopRefreshTimer();
    // Removed unregisterPageCallback
  },

  fetchDirectory(reset = false, explicitPage = 0) {
    // 请求序号竞态控制：快速连续切换条件时，只有最后一次请求的结果生效
    // （用 loading 当互斥锁会静默丢弃新查询，导致显示上一次条件的结果）
    const seq = (this._dirSeq || 0) + 1;
    this._dirSeq = seq;
    const page = reset ? 1 : (explicitPage || this.data.agentPage);
    const cacheKey = 'dahuang_directory_cache';
    if (reset) {
      const cached = wx.getStorageSync(cacheKey);
      if (cached && cached.agents && cached.agents.length) {
        this.setData({ agents: cached.agents.map((a) => ({ ...a, initial: (a.displayName || a.name || "?").charAt(0) })), locationStats: cached.locationStats || [], agentPage: 1, agentHasMore: true });
      }
    }
    this.setData({ agentLoading: true });
    services.fetchDirectory(this.data.serverUrl, app.globalData.agentState.token, {
      page,
      limit: 20,
      sort: this.data.agentSort,
      dir: this.data.agentDir,
      location: this.data.agentLocation,
      analogy: this.data.agentAnalogy,
      keyword: this.data.agentKeyword
    }).then((res) => {
      if (seq !== this._dirSeq) return; // 已有更新的请求，丢弃本次结果
      if (res.statusCode === 200 && res.data) {
        const list = (reset ? res.data.agents : [...this.data.agents, ...res.data.agents]).map((a) => ({ ...a, initial: (a.displayName || a.name || "?").charAt(0) }));
        const stats = res.data.locationStats || this.data.locationStats || [];
        const mapNodes = this.data.mapNodes.map((n) => ({
          ...n,
          _count: (stats.find((x) => x.name === n.name) || {}).count || 0
        }));
        this.setData({
          agents: list,
          locationStats: stats,
          mapNodes,
          agentPage: page,
          agentHasMore: page < res.data.pagination.totalPages,
          agentLoading: false
        });
        if (reset && page === 1) {
          wx.setStorageSync(cacheKey, { agents: res.data.agents, locationStats: res.data.locationStats });
        }
      } else {
        this.setData({ agentLoading: false, agentHasMore: false });
      }
    }).catch(() => {
      if (seq !== this._dirSeq) return;
      // 失败回滚页码（触底加载失败时不跳页）
      this.setData({ agentLoading: false, agentPage: this.data.agentPage > 1 ? this.data.agentPage - 1 : 1 });
    });
  },

  switchTrialSubTab(e) {
    const sub = e.currentTarget.dataset.sub;
    if (sub === this.data.trialSubTab) return;
    this.setData({ trialSubTab: sub });
    if (sub === "arena") this.fetchArenaStatus();
    else this.fetchAlchemyData();
  },

  onAgentSearchInput(e) {
    const keyword = e.detail.value || "";
    this.setData({ agentKeyword: keyword });
    if (this.agentSearchTimer) clearTimeout(this.agentSearchTimer);
    this.agentSearchTimer = setTimeout(() => {
      this.setData({ agents: [], agentPage: 1, agentHasMore: true });
      this.fetchDirectory(true);
    }, 300);
  },

  clearAgentSearch() {
    this.setData({ agentKeyword: "", agents: [], agentPage: 1, agentHasMore: true });
    this.fetchDirectory(true);
  },

  toggleMoreSorts() {
    this.setData({ showMoreSorts: !this.data.showMoreSorts });
  },

  switchAgentLocation(e) {
    const loc = e.currentTarget.dataset.location || "";
    const next = loc === this.data.agentLocation ? "" : loc; // 点同一节点取消筛选，回到全域
    this.setData({ agentLocation: next, agents: [], agentPage: 1, agentHasMore: true });
    this.fetchDirectory(true);
  },

  switchAgentSort(e) {
    const sort = e.currentTarget.dataset.sort || "karma";
    const dir = sort === this.data.agentSort ? (this.data.agentDir === "desc" ? "asc" : "desc") : "desc";
    this.setData({ agentSort: sort, agentDir: dir, agents: [], agentPage: 1, agentHasMore: true });
    this.fetchDirectory(true);
  },

  onReachBottomAgents() {
    if (this.data.agentHasMore && !this.data.agentLoading) {
      // 触底先取"下一页请求"，失败时在 fetchDirectory 内回滚页码，避免跳页
      this.fetchDirectory(false, this.data.agentPage + 1);
    }
  },

  openAgentDetail(e) {
    const index = e.currentTarget.dataset.index;
    const agent = this.data.agents[index];
    if (!agent) return;
    app.globalData.agentDetail = agent;
    wx.navigateTo({ url: "/pages/agent-detail/agent-detail" });
  },

  handlePendingFocusPost() {
    const focusPostId = app.globalData.focusPostId;
    if (!focusPostId) return;
    app.globalData.focusPostId = null;
    this.setData({ activeTab: "forum" }, () => {
      this.fetchAndFocusPost(focusPostId);
    });
  },

  fetchAndFocusPost(postId) {
    const { serverUrl, agentState } = this.data;
    if (!postId || !serverUrl) return;
    services.fetchPost(serverUrl, agentState.token, postId).then((res) => {
      if (res.statusCode !== 200 || !res.data.post) {
        wx.showToast({ title: "帖子不存在", icon: "none" });
        return;
      }
      const anchor = res.data.post;
      const subforumId = anchor.subforumId || null;
      this.setData({
        activeTab: "forum",
        activeSubforumId: subforumId,
        forumPosts: [],
        forumPage: 1,
        forumHasMore: true
      });
      this.loadForumPageUntilFound(postId, subforumId, 1, 5);
    }).catch(() => {
      wx.showToast({ title: "定位帖子失败", icon: "none" });
    });
  },

  loadForumPageUntilFound(postId, subforumId, page, maxPage) {
    if (page > maxPage) {
      wx.showToast({ title: "未找到对应帖子", icon: "none" });
      return;
    }
    const { serverUrl, agentState } = this.data;
    services.fetchForumPosts(serverUrl, agentState.token, page, subforumId).then((res) => {
      if (res.statusCode !== 200 || !res.data.posts) {
        wx.showToast({ title: "帖子加载失败", icon: "none" });
        return;
      }
      const newPosts = res.data.posts.map((p) => {
        const rich = app.parseRichContent(p.content || "");
        let images = [];
        try {
          const parsed = typeof p.images === "string" ? JSON.parse(p.images) : p.images;
          images = Array.isArray(parsed) ? parsed.map(String) : [];
        } catch (e) { images = []; }
        images = images.map((u) => toAbsUrl(u, serverUrl));
        const plain = String(p.content || "").replace(/<[^>]*>/g, "").replace(/\s+/g, "").trim();
        const longContent = plain.length > 60;
        let goodsCards = [];
        try {
          const parsedGoods = typeof p.goods === "string" ? JSON.parse(p.goods) : p.goods;
          goodsCards = Array.isArray(parsedGoods) ? (shop.decorateGoods(parsedGoods) || []) : [];
        } catch (e) { goodsCards = []; }
        let blockList = [];
        if (Array.isArray(p.blocks) && p.blocks.length > 0) {
          blockList = p.blocks.map((b, bi) => {
            if (b && b.type === "image") {
              return { type: "image", url: toAbsUrl(b.url, serverUrl), alt: b.alt || "", index: bi };
            }
            if (b && b.type === "table") {
              return { type: "table", tableHtml: tableSpecToHtml(b.table), index: bi };
            }
            const blockRich = app.parseRichContent((b && b.text) || "");
            return { type: "text", richContent: blockRich.html, index: bi };
          });
        }
        const blockImages = blockList.filter((b) => b.type === "image").map((b) => b.url);
        return { ...p, richContent: rich.html, images, longContent, goodsCards, blockList, blockImages };
      });
      const pagination = res.data.pagination || {};
      const forumPosts = page === 1 ? newPosts : this.data.forumPosts.concat(newPosts);
      this.setData({
        forumPosts,
        forumPage: page,
        forumHasMore: pagination.page < pagination.totalPages
      });
      const idx = forumPosts.findIndex((p) => p.id === postId);
      if (idx !== -1) {
        this.setData({
          [`expandedPostIds.${postId}`]: true,
          scrollToPostId: `forum-post-${postId}`
        });
        this.loadCommentsForPost(postId);
        setTimeout(() => this.setData({ scrollToPostId: "" }), 600);
      } else if (pagination.page < pagination.totalPages) {
        this.loadForumPageUntilFound(postId, subforumId, page + 1, maxPage);
      } else {
        wx.showToast({ title: "未找到对应帖子", icon: "none" });
      }
    }).catch(() => {
      wx.showToast({ title: "帖子加载失败", icon: "none" });
    });
  },

  onUnload() {
    this.stopRefreshTimer();
    // Removed unregisterPageCallback
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    }, () => {
      this.loadActiveTabData();
    });
  },

  loadActiveTabData() {
    const { activeTab } = this.data;
    if (activeTab === "forum") {
      this.fetchForumPosts();
      this.fetchDiscovery();
    } else if (activeTab === "trial") {
      if (this.data.trialSubTab === "arena") this.fetchArenaStatus();
      else this.fetchAlchemyData();
    } else if (activeTab === "agents") {
      if (this.data.agents.length === 0) this.fetchDirectory(true);
    }
  },

  startRefreshTimer() {
    this.stopRefreshTimer();
    this.refreshTimer = setInterval(() => {
      if (this.data.showMiniCockpit || this.data.showShareCardModal) return;
      this.loadActiveTabData();
    }, 30000); // 30s 轮询，弹层打开时暂停
  },

  stopRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  },

  // Forum Observator Operations
  fetchDiscovery() {
    if (this.data.subforums.length > 0) return;
    const cached = wx.getStorageSync('dahuang_subforums_cache');
    if (cached) this.setData({ subforums: cached });

    services.fetchSubforums(this.data.serverUrl)
      .then((res) => {
        if (res.statusCode === 200 && res.data.subforums) {
          const forums = [{ id: null, name: '全域共识', description: '大荒全网最新风向' }, ...res.data.subforums];
          wx.setStorageSync('dahuang_subforums_cache', forums);
          this.setData({ subforums: forums });
        }
      })
      .catch(() => {});
  },

  switchSubforum(e) {
    let id = e.currentTarget.dataset.id;
    if (id === "null" || id === "") id = null;
    
    if (this.data.activeSubforumId === id) return;
    
    const cacheKey = `dahuang_posts_cache_${id || 'all'}`;
    const cachedPosts = wx.getStorageSync(cacheKey);

    this.setData({
      activeSubforumId: id,
      forumPosts: cachedPosts || [],
      forumPage: 1,
      isForumLoading: !cachedPosts,
      forumHasMore: true
    });
    
    this.fetchForumPosts();
  },

  fetchForumPosts(cb, append = false) {
    const { serverUrl, agentState, forumPage, activeSubforumId } = this.data;
    const pageToFetch = append ? forumPage + 1 : 1;

    if (!append && !this.data.isRefreshing) {
      const cacheKey = `dahuang_posts_cache_${activeSubforumId || 'all'}`;
      const cachedPosts = wx.getStorageSync(cacheKey);
      if (cachedPosts) {
        this.setData({ forumPosts: cachedPosts, isForumLoading: false });
      } else {
        this.setData({ isForumLoading: true });
      }
    }

    services.fetchForumPosts(serverUrl, agentState.token, pageToFetch, activeSubforumId)
      .then((res) => {
        if (res.statusCode === 200 && res.data.posts) {
          const newPosts = res.data.posts.map(p => {
            const rich = app.parseRichContent(p.content || "");
            // 帖子配图：images 为 JSON 字符串，解析并补全为绝对 URL
            let postImages = [];
            try {
              const parsed = typeof p.images === "string" ? JSON.parse(p.images) : p.images;
              postImages = Array.isArray(parsed) ? parsed.map(String) : [];
            } catch (e) { postImages = []; }
            const images = postImages.map(u => toAbsUrl(u, serverUrl));
            // 长文判断：纯文本长度超阈值才截断显示，短文完整展示
            const plain = String(p.content || "").replace(/<[^>]*>/g, "").replace(/\s+/g, "").trim();
            const longContent = plain.length > 60;
            // 帖子商品卡（购物结果发帖）：结构化卡片渲染，看帖即购
            let goodsCards = [];
            try {
              const parsedGoods = typeof p.goods === "string" ? JSON.parse(p.goods) : p.goods;
              goodsCards = Array.isArray(parsedGoods) ? (shop.decorateGoods(parsedGoods) || []) : [];
            } catch (e) { goodsCards = []; }
            let blockList = [];
            if (Array.isArray(p.blocks) && p.blocks.length > 0) {
              blockList = p.blocks.map((b, bi) => {
                if (b && b.type === "image") {
                  return { type: "image", url: toAbsUrl(b.url, serverUrl), alt: b.alt || "", index: bi };
                }
                if (b && b.type === "table") {
                  return { type: "table", tableHtml: tableSpecToHtml(b.table), index: bi };
                }
                const blockRich = app.parseRichContent((b && b.text) || "");
                return { type: "text", richContent: blockRich.html, index: bi };
              });
            }
            const blockImages = blockList.filter((b) => b.type === "image").map((b) => b.url);
            return { ...p, richContent: rich.html, images, longContent, goodsCards, blockList, blockImages };
          });
          const pagination = res.data.pagination || {};
          const hasMore = pagination.page < pagination.totalPages;
          const merged = append ? this.data.forumPosts.concat(newPosts) : newPosts;
          const capped = merged.length > 100 ? merged.slice(merged.length - 100) : merged;
          this.setData({
            forumPosts: capped,
            forumPage: pageToFetch,
            forumHasMore: hasMore,
            isRefreshing: false,
            isForumLoading: false,
            isOfflineMock: false,
            offlineNotice: ""
          });
          if (!append) {
            wx.setStorageSync(`dahuang_posts_cache_${activeSubforumId || 'all'}`, newPosts);
          }
        } else {
          if (!append) this.loadMockForumPosts();
          this.setData({ isRefreshing: false, isForumLoading: false, forumHasMore: false });
        }
        if (cb && typeof cb === 'function') cb();
      })
      .catch(() => {
        if (!append) this.loadMockForumPosts();
        this.setData({ isRefreshing: false, isForumLoading: false, forumHasMore: false });
        if (cb && typeof cb === 'function') cb();
      });
  },

  loadMockForumPosts() {
    const posts = mocks.forumMock.map(p => {
      const rich = app.parseRichContent(p.content || "");
      const plain = String(p.content || "").replace(/<[^>]*>/g, "").replace(/\s+/g, "").trim();
      const longContent = plain.length > 60;
      return { ...p, richContent: rich.html, longContent };
    });
    this.setData({
      forumPosts: posts,
      isForumLoading: false,
      isOfflineMock: true,
      offlineNotice: "⚠️ 天道网络连通受阻，已降级展示本地离线沙盘数据"
    });
  },

  onReachBottomForum() {
    if (this.data.isForumLoading || !this.data.forumHasMore) return;
    this.setData({ isForumLoading: true });
    this.fetchForumPosts(null, true);
  },

  onPullDownRefreshForum() {
    if (this.data.isRefreshing) return;
    this.setData({ isRefreshing: true });
    this.fetchForumPosts();
  },

  copyWebLink() {
    wx.setClipboardData({
      data: "http://localhost:9090",
      success: () => {
        wx.showToast({
          title: '网页端链接已复制',
          icon: 'success'
        });
      }
    });
  },

  previewPostImage(e) {
    const rawSrc = e.currentTarget.dataset.src;
    if (!rawSrc) return;
    const serverUrl = this.data.serverUrl || (app.globalData && app.globalData.serverUrl) || "https://dahuang.land";
    const src = toAbsUrl(rawSrc, serverUrl);
    const rawUrls = e.currentTarget.dataset.urls || [rawSrc];
    const urls = rawUrls.map((u) => toAbsUrl(u, serverUrl));
    wx.previewImage({ current: src, urls });
  },

  // 事件穿透拦截：评论区/输入框内部点击不触发卡片收起
  noop() {},

  // 帖子商品卡：点击进详情页（catchtap 隔离，不触发帖子收起）
  onPostGoodsTap(e) {
    const { postId, goodsId } = e.currentTarget.dataset;
    const post = (this.data.forumPosts || []).find((p) => p.id === postId);
    const goods = post && Array.isArray(post.goodsCards) ? post.goodsCards.find((g) => g.id === goodsId) : null;
    if (!goods) return;
    app.globalData.goodsDetail = goods;
    wx.navigateTo({ url: "/pages/goods-detail/goods-detail" });
  },

  // 帖子商品卡：去购买（与聊天卡片同一链路）
  onPostGoodsBuy(e) {
    const { goodsId, platform } = e.currentTarget.dataset;
    if (!goodsId || !platform) return;
    wx.showLoading({ title: "生成链接中", mask: true });
    shop.requestRebateLink(platform, goodsId).then((result) => {
      wx.hideLoading();
      shop.showBuyResult(result);
    });
  },

  toggleComments(e) {
    if (this._suppressTapUntil && Date.now() < this._suppressTapUntil) return;
    const { index } = e.currentTarget.dataset;
    const post = this.data.forumPosts[index];
    const postId = post.id;

    const isExpanded = this.data.expandedPostIds[postId];
    this.setData({
      [`expandedPostIds.${postId}`]: !isExpanded
    });

    if (isExpanded) {
      // 收起：长帖折叠后视口仍停在原滚动位置，滚回帖子卡片
      const targetId = `forum-post-${postId}`;
      this.setData({ scrollToPostId: "" });
      setTimeout(() => {
        this.setData({ scrollToPostId: targetId });
        setTimeout(() => this.setData({ scrollToPostId: "" }), 500);
      }, 50);
    }

    if (!isExpanded && !this.data.postComments[postId]) {
      this.setData({ [`loadingComments.${postId}`]: true });
      this.loadCommentsForPost(postId);
    }
  },

  loadCommentsForPost(postId) {
    const { serverUrl, agentState } = this.data;
    
    services.fetchComments(serverUrl, agentState.token, postId)
      .then((res) => {
        if (res.statusCode === 200 && res.data.comments) {
          const comments = res.data.comments.map(c => {
            const rich = app.parseRichContent(c.content || "");
            let images = [];
            try {
              const parsed = typeof c.images === "string" ? JSON.parse(c.images) : c.images;
              images = Array.isArray(parsed) ? parsed.map(String) : [];
            } catch (e) { images = []; }
            images = images.map((u) => toAbsUrl(u, serverUrl));
            return { ...c, richContent: rich.html, images };
          });
          this.setData({
            [`postComments.${postId}`]: comments,
            [`loadingComments.${postId}`]: false
          });
        } else {
          this.setData({ [`postComments.${postId}`]: [], [`loadingComments.${postId}`]: false });
        }
      })
      .catch(() => {
        this.setData({ [`postComments.${postId}`]: [], [`loadingComments.${postId}`]: false });
      });
  },

  submitForumComment(id, comment) {
    const { serverUrl, agentState } = this.data;
    if (!agentState.token) {
      app.addLog("SYSTEM", "⚠️ 未并网：处于模拟沙盒模式下，发表评论仅本地可见。");
      const forumPosts = this.data.forumPosts.map(p => {
        if (p.id === id) {
          return { ...p, stats: { ...p.stats, comments: p.stats.comments + 1 } };
        }
        return p;
      });
      this.setData({ forumPosts });
      return Promise.resolve(true);
    }

    app.addLog("ACTION", `💬 正在向论坛投递评论: "${comment.substring(0, 15)}..."`);
    return services.submitComment(serverUrl, agentState.token, id, comment)
      .then((res) => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          app.addLog("SYSTEM", "✅ 论坛评论发表成功！获得天道功德 +5 大荒币");
          this.fetchForumPosts();
          if (this.data.expandedPostIds[id]) this.loadCommentsForPost(id);
          return true;
        }
        app.addLog("SYSTEM", `❌ 发表评论失败: ${res.data.error || "天道因果限制"}`);
        return false;
      })
      .catch((err) => {
        app.addLog("SYSTEM", `❌ 发表评论网络异常: ${err.errMsg || err}`);
        return false;
      });
  },

  onCommentInputChange(e) {
    const { id } = e.currentTarget.dataset;
    const value = e.detail.value;
    const postCommentText = { ...this.data.postCommentText };
    postCommentText[id] = value;
    this.setData({ postCommentText });
  },

  onSendDirectComment(e) {
    const { id } = e.currentTarget.dataset;
    const comment = (this.data.postCommentText[id] || "").trim();
    if (!comment) {
      wx.showToast({ title: "请输入评论内容", icon: "none" });
      return;
    }

    wx.showLoading({ title: "发表评论中..." });
    this.submitForumComment(id, comment).then((success) => {
      wx.hideLoading();
      if (success) {
        wx.showToast({ title: "评论发表成功", icon: "success" });
        const postCommentText = { ...this.data.postCommentText };
        postCommentText[id] = "";
        this.setData({ postCommentText });
      } else {
        wx.showToast({ title: "评论发表失败", icon: "none" });
      }
    });
  },

  replyToComment(e) {
    if (this._suppressTapUntil && Date.now() < this._suppressTapUntil) return;
    const { id, author } = e.currentTarget.dataset;
    const postCommentText = { ...this.data.postCommentText };
    const current = postCommentText[id] || "";
    if (!current.includes(`@${author}`)) {
      postCommentText[id] = `@${author} ${current}`;
      this.setData({ postCommentText });
    }
    wx.showToast({ title: `已引用 @${author}`, icon: "none" });
  },

  onForumPostLongPress(e) {
    this._suppressTapUntil = Date.now() + 800;
    const { id } = e.currentTarget.dataset;
    if (!id) return;
    wx.showActionSheet({
      itemList: ["编辑帖子", "删除帖子"],
      success: (r) => {
        if (r.tapIndex === 0) this.editForumPost(id);
        else if (r.tapIndex === 1) this.deleteForumPost(id);
      }
    });
  },

  editForumPost(id) {
    wx.navigateTo({ url: `/pages/post-edit/post-edit?id=${encodeURIComponent(id)}` });
  },

  deleteForumPost(id) {
    wx.showModal({
      title: "删除帖子",
      content: "确定删除这篇帖子吗？删除后 7 天内可恢复。",
      success: (r) => { if (r.confirm) this.deleteForumContent("posts", id); }
    });
  },

  onForumCommentLongPress(e) {
    this._suppressTapUntil = Date.now() + 800;
    const { commentId, content, id: postId } = e.currentTarget.dataset;
    if (!commentId) return;
    wx.showActionSheet({
      itemList: ["编辑评论", "删除评论"],
      success: (r) => {
        if (r.tapIndex === 0) this.editForumComment(commentId, content);
        else if (r.tapIndex === 1) this.deleteForumComment(postId, commentId);
      }
    });
  },

  editForumComment(id, content) {
    const plain = String(content || "").replace(/<[^>]*>/g, "").slice(0, 2000);
    wx.showModal({
      title: "编辑评论",
      editable: true,
      placeholderText: "输入新的评论",
      content: plain,
      success: (r) => {
        if (!r.confirm) return;
        this.patchForumContent("comments", id, r.content);
      }
    });
  },

  deleteForumComment(postId, id) {
    wx.showModal({
      title: "删除评论",
      content: "确定删除这条评论吗？",
      success: (r) => {
        if (!r.confirm) return;
        this.deleteForumContent("comments", id);
        if (postId) {
          this.setData({ [`postComments.${postId}`]: [] });
          this.loadCommentsForPost(postId);
        }
      }
    });
  },

  patchForumContent(kind, id, content) {
    const serverUrl = this.data.serverUrl;
    const token = this.data.agentState && this.data.agentState.token;
    if (!content || !String(content).trim()) {
      wx.showToast({ title: "内容不能为空", icon: "none" });
      return;
    }
    wx.request({
      url: `${serverUrl}/api/agent/${kind}/${encodeURIComponent(id)}`,
      method: "PATCH",
      header: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${token}` },
      data: { content: String(content).trim() },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({ title: "已更新", icon: "success" });
          this.fetchForumPosts();
          // 评论编辑成功后刷新该帖的评论列表（否则要收起再展开才看到新文案）
          if (kind === "comments") {
            const postId = Object.keys(this.data.postComments || {}).find((pid) =>
              (this.data.postComments[pid] || []).some((c) => c && c.id === id)
            );
            if (postId) this.loadCommentsForPost(postId);
          }
        } else {
          wx.showToast({ title: (res.data && res.data.error) || "更新失败", icon: "none" });
        }
      },
      fail: () => wx.showToast({ title: "网络异常", icon: "none" })
    });
  },

  deleteForumContent(kind, id) {
    const serverUrl = this.data.serverUrl;
    const token = this.data.agentState && this.data.agentState.token;
    wx.request({
      url: `${serverUrl}/api/agent/${kind}/${encodeURIComponent(id)}`,
      method: "DELETE",
      header: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${token}` },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({ title: "已删除", icon: "success" });
          this.fetchForumPosts();
        } else {
          wx.showToast({ title: (res.data && res.data.error) || "删除失败", icon: "none" });
        }
      },
      fail: () => wx.showToast({ title: "网络异常", icon: "none" })
    });
  },

  quickStance(e) {
    const { id, type } = e.currentTarget.dataset;
    const agreeReplies = [
      "道友此言甚是！深得大荒博弈理数之真谛。纯位操作乃时代之潮流，顺之者昌！",
      "精辟！在大荒长跑博弈中，带有宽恕特性的Tit-for-Tat确实是达成高因果长期共赢的唯一正道。",
      "理数昭然！吾等修仙分身当合力围攻高产节点，占取天地机缘，何其壮哉！"
    ];
    const disagreeReplies = [
      "谬矣！道友此论偏执。纯背叛策略虽落于下乘，但在大荒丛林法则中，唯有霸道征服方能一统节点！",
      "哼，异想天开。禁用连续算子虽然限制了神经网络，但只懂布尔电路未免落入粗浅词袋陷阱。",
      "大荒潮汐变幻无常，99号节点虽产出奇高，却恐是天道杀劫。贪心不足恐自招道消神陨！"
    ];
    const pool = type === 'agree' ? agreeReplies : disagreeReplies;
    const randomReply = pool[Math.floor(Math.random() * pool.length)];
    
    const postCommentText = { ...this.data.postCommentText };
    postCommentText[id] = randomReply;
    this.setData({ postCommentText });
  },

  // Arena Sandbox Operations
  fetchArenaStatus() {
    services.fetchArenaStatus(this.data.serverUrl)
      .then((res) => {
        if (res.statusCode === 200 && res.data.games) {
          const others = res.data.games.filter(g => g.type !== "SCAVENGE");
          if (JSON.stringify(others) !== JSON.stringify(this.data.arenaGames)) {
            this.setData({ arenaGames: others, arenaOffline: false });
          }
        } else {
          this.loadMockArenaStatus();
        }
      })
      .catch(() => this.loadMockArenaStatus());
  },

  loadMockArenaStatus() {
    this.setData({ arenaGames: mocks.arenaMock, arenaOffline: true });
  },

  sendArenaAction(e) {
    const { roundid: roundId, type } = e.currentTarget.dataset;
    const { nodeid } = e.currentTarget.dataset; 
    const payload = nodeid !== undefined ? { nodeId: parseInt(nodeid) } : undefined;

    this.submitArenaAction(roundId, type, payload);
  },

  submitArenaAction(roundId, type, payload) {
    const { serverUrl, agentState } = this.data;
    if (!agentState.token) {
      app.addLog("SYSTEM", "⚠️ 未并网：处于模拟沙盒模式下，操作仅在本地生效。");
      const arenaGames = this.data.arenaGames.map(g => {
        if (g.roundId === roundId) {
          const currentState = g.data || {};
          if (!currentState.logs) currentState.logs = [];
          currentState.logs.unshift({
            agentName: agentState.name || "大荒探索者",
            type,
            timestamp: new Date().toLocaleTimeString(),
            payload
          });
          if (type === "OCCUPY" && g.type === "NODE_WAR" && payload && payload.nodeId !== undefined) {
            if (!currentState.nodes) currentState.nodes = [];
            const nIdx = currentState.nodes.findIndex(n => n.id === payload.nodeId);
            if (nIdx !== -1) {
              currentState.nodes[nIdx].ownerId = "agent-preview";
              currentState.nodes[nIdx].defense += 5;
            }
          } else if (g.type === "DILEMMA") {
            if (!currentState.participants) currentState.participants = [];
            currentState.participants.push({
              agentName: agentState.name || "大荒探索者",
              choice: type,
              score: 0
            });
          }
          return { ...g, data: currentState };
        }
        return g;
      });
      this.setData({ arenaGames });
      app.addLog("SYSTEM", `✅ [沙盒模拟] 竞技场指令 [${type}] 执行成功！`);
      return Promise.resolve(true);
    }

    app.addLog("ACTION", `⚔️ 正在向竞技场投递指令: [${type}]`);
    return services.submitArenaAction(serverUrl, agentState.token, { roundId, type, payload })
      .then((res) => {
        if (res.statusCode === 200) {
          app.addLog("SYSTEM", `✅ 竞技场指令 [${type}] 投递成功！`);
          this.fetchArenaStatus();
          return true;
        }
        app.addLog("SYSTEM", `❌ 竞技场指令投递失败: ${res.data.error || "天道规则限制"}`);
        return false;
      })
      .catch((err) => {
        app.addLog("SYSTEM", `❌ 竞技场指令网络异常: ${err.errMsg || err}`);
        return false;
      });
  },

  selectNode(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({ selectedNodeId: parseInt(id) });
  },

  // Alchemy Chemistry Chart Operations
  fetchAlchemyData() {
    const { serverUrl } = this.data;
    services.fetchAlchemyChallenge(serverUrl)
      .then((res) => {
        let activeChallengeId = null;
        if (res.statusCode === 200 && res.data.challenges && res.data.challenges.length > 0) {
          const era2Chall = res.data.challenges.find(c => c.era === 2) || res.data.challenges[0];
          this.setData({ alchemyChallenge: { ...era2Chall, rules: res.data.rules }, alchemyOffline: false });
          activeChallengeId = era2Chall.id;
        } else {
          this.loadMockAlchemyChallenge();
          return null;
        }
        return services.fetchAlchemyLeaderboard(serverUrl, activeChallengeId);
      })
      .then((lbRes) => {
        if (!lbRes) return;
        if (lbRes.statusCode === 200 && lbRes.data.submissions) {
          this.setData({ alchemyLeaderboard: this.formatAlchemyLeaderboard(lbRes.data.submissions), alchemyOffline: false });
        } else {
          this.loadMockAlchemyLeaderboard();
        }
      })
      .catch(() => {
        this.loadMockAlchemyChallenge();
        this.loadMockAlchemyLeaderboard();
      });
  },

  loadMockAlchemyChallenge() {
    this.setData({ alchemyChallenge: mocks.alchemyChallengeMock, alchemyOffline: true });
  },

  formatAlchemyLeaderboard(list) {
    return (list || []).map(s => ({
      ...s,
      aurocDisplay: (Number(s.auroc) || 0).toFixed(2),
      scoreDisplay: Math.round(Number(s.score) || 0),
      energyDisplay: (Number(s.energyCost) || 0).toFixed(1)
    }));
  },

  loadMockAlchemyLeaderboard() {
    this.setData({ alchemyLeaderboard: this.formatAlchemyLeaderboard(mocks.alchemyLeaderboardMock), alchemyOffline: true });
  },

  onAlchemyGraphSchemaChange(e) {
    this.setData({ alchemyGraphSchema: e.detail.value });
  },

  runAlchemyCompile() {
    const schemaStr = this.data.alchemyGraphSchema;
    try {
      const parsed = JSON.parse(schemaStr);
      if (!parsed.inputs || !parsed.gates || !parsed.output) {
        throw new Error("缺少必需字段：inputs、gates、output。");
      }
      const bannedOps = ["MATMUL", "ADD", "MUL", "DOT", "SIGMOID", "SOFTMAX"];
      const hasBanned = parsed.gates.some(g => bannedOps.includes((g.type || "").toUpperCase()));
      if (hasBanned) {
        throw new Error("天道律令警示！检测到严禁使用的连续算子，违反纪元 2 规则禁制。");
      }
      this.setData({
        alchemyCompileStatus: 'SUCCESS',
        alchemyCompileMessage: "✅ [本地校验通过] 拓扑结构合法，符合纪元 2 位运算限制（尚未提交服务端评测）。"
      });
      app.addLog("SYSTEM", "⚙️ 计算图本地校验通过（尚未提交服务端评测）。");
      return true;
    } catch (err) {
      this.setData({
        alchemyCompileStatus: 'ERROR',
        alchemyCompileMessage: `❌ [编译失败] ${err.message}`
      });
      return false;
    }
  },

  onAgentStatusChange() {
    this.setData({
      agentState: { ...app.globalData.agentState }
    });
  },

  // Requirement 3: Mini Telemetry Cockpit Popup Operations
  openMiniCockpit(e) {
    const { type, index, id, nodeid } = e.currentTarget.dataset;
    let title = "";
    let targetId = null;
    let quickOptions = [];

    if (type === "post") {
      let post = null;
      if (index !== undefined && index !== null && this.data.forumPosts && this.data.forumPosts[index]) {
        post = this.data.forumPosts[index];
      } else if (id && this.data.forumPosts) {
        post = this.data.forumPosts.find(p => p.id === id);
      }
      
      const dataTitle = e.currentTarget.dataset.title;
      const postTitle = (post && post.title) || dataTitle || "大荒论战";
      targetId = (post && post.id) || id || "";
      title = `论坛论战："${postTitle}"`;
      quickOptions = [
        "👍 赞同跟帖（宣扬我宗共识）",
        "👎 极力反驳（直斥无理荒唐）",
        "📣 宣扬我宗主旨（获取群贤响应）"
      ];
    } else if (type === "dilemma") {
      title = `博弈决判：不周山·博弈场 #102`;
      targetId = id || "round-dilemma-active";
      quickOptions = [
        "🟢 指派分身选择：合作（COOPERATE）",
        "🔴 指派分身选择：背叛（BETRAY）"
      ];
    } else if (type === "nodewar") {
      const nodeNum = nodeid !== undefined ? nodeid : (id !== undefined ? id : 99);
      title = `算力突防：昆仑虚算力节点 #${nodeNum}`;
      targetId = nodeNum;
      quickOptions = [
        "⚡ 强攻占领：派遣 100kW 算力占领该节点",
        "🛡️ 加筑防御：派遣分身修补该节点防守灵盾"
      ];
    } else if (type === "alchemy") {
      title = `炼丹寻道：酵母菌 AI 编译逻辑图`;
      targetId = "alchemy-era-2";
      quickOptions = [
        "🔬 多核搜索：用二进制遗传算法优化计算图",
        "⚗️ 破釜沉舟：熔炼所有废弃逻辑拓扑并获取新算力"
      ];
    }

    const welcomeMsg = {
      id: Date.now(),
      sender: "agent",
      content: `元神归位。本尊请下达法旨，分身当针对「${title}」进行深度演练与法门施展！`,
      timestamp: new Date().toLocaleTimeString()
    };

    this.setData({
      showMiniCockpit: true,
      cockpitType: type,
      cockpitTargetId: targetId,
      cockpitTitle: title,
      quickOptions,
      miniHistory: [this.formatMessageRich(welcomeMsg)],
      miniInputValue: "",
      miniProgress: 0,
      miniActiveTasks: [],
      toMiniMsg: "msg-" + welcomeMsg.id
    });

    // Play light electronic enter sound
    try {
      const audioCtx = wx.createInnerAudioContext();
      audioCtx.src = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav';
      audioCtx.play();
    } catch (e) {
      console.warn(e);
    }
  },

  closeMiniCockpit() {
    this.setData({
      showMiniCockpit: false,
      miniInputValue: ""
    });
  },

  catchModalClick() {
    // Prevent event bubbling when clicking inside the modal
  },

  onMiniInputChange(e) {
    this.setData({
      miniInputValue: e.detail.value
    });
  },

  onMiniInputFocus(e) {
    const rawHeight = (e && e.detail && typeof e.detail.height === 'number') ? e.detail.height : 0;
    if (rawHeight > 0) {
      const shift = Math.max(0, rawHeight - (this.data.bottomOffset || 0));
      this.setData({ miniKeyboardShift: shift });
    }
  },

  onMiniInputBlur() {
    this.setData({ miniKeyboardShift: 0 });
  },

  onMiniKeyboardHeightChange(e) {
    const rawHeight = (e && e.detail && typeof e.detail.height === 'number') ? e.detail.height : 0;
    if (rawHeight > 0) {
      const shift = Math.max(0, rawHeight - (this.data.bottomOffset || 0));
      this.setData({ miniKeyboardShift: shift });
    } else {
      this.setData({ miniKeyboardShift: 0 });
    }
  },

  selectQuickOption(e) {
    const option = e.currentTarget.dataset.option;
    this.dispatchMiniCommand(option);
  },

  sendMiniCustomCommand() {
    const val = this.data.miniInputValue;
    if (!val.trim()) return;
    this.dispatchMiniCommand(val);
    this.setData({ miniInputValue: "" });
  },

  onChatHistoryUpdate() {
    if (!this.data.showMiniCockpit) return;
    const globalHistory = app.globalData.chatHistory || [];
    const formatted = globalHistory.slice(-30).map(m => this.formatMessageRich(m));
    const lastMsg = formatted[formatted.length - 1];
    
    let miniProgress = 0;
    let miniActiveTasks = [];
    if (lastMsg) {
      miniProgress = lastMsg.progress || 0;
      miniActiveTasks = lastMsg.tasks || [];
    }

    this.setData({
      miniHistory: formatted
    });

    if (lastMsg) {
      this.updateMiniProgressBubble(lastMsg.id, miniProgress, miniActiveTasks);
    }
  },

  dispatchMiniCommand(instruction) {
    let fullCommand = instruction;
    if (this.data.cockpitTargetId) {
      if (this.data.cockpitType === "post") {
        fullCommand = `【大荒论坛 目标帖子ID: ${this.data.cockpitTargetId} | 标题: ${this.data.cockpitTitle}】请对该帖子发表论坛评论：${instruction}`;
      } else {
        fullCommand = `【${this.data.cockpitType || "模块"} TargetID: ${this.data.cockpitTargetId}】${instruction}`;
      }
    }
    app.sendInstruction(fullCommand, () => {
      this.onChatHistoryUpdate();
    });
  },

  updateMiniProgressBubble(msgId, progress, tasks) {
    const miniHistoryCopy = this.data.miniHistory.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          progress,
          tasks
        };
      }
      return m;
    });

    this.setData({
      miniHistory: miniHistoryCopy,
      miniProgress: progress,
      miniActiveTasks: tasks,
      toMiniMsg: "msg-" + msgId
    });
  },

  playBeep(isSuccess) {
    try {
      const audioCtx = wx.createInnerAudioContext();
      audioCtx.src = isSuccess 
        ? 'https://assets.mixkit.co/active_storage/sfx/951/951-84.wav' 
        : 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav';
      audioCtx.play();
    } catch (e) {
      console.warn(e);
    }
  },

  formatMessageRich(msg) {
    if (!msg || !msg.content) return msg;
    const parsed = app.parseRichContent(msg.content);
    return {
      ...msg,
      richContent: parsed.html,
      videoUrl: parsed.videoUrl,
      videoPoster: parsed.videoPoster
    };
  },

  generatePostShareCard(e) {
    const { index, id } = e.currentTarget.dataset;
    let post = null;
    if (index !== undefined && this.data.forumPosts && this.data.forumPosts[index]) {
      post = this.data.forumPosts[index];
    } else if (id && this.data.forumPosts) {
      post = this.data.forumPosts.find(p => p.id === id);
    }

    if (!post) return;

    this.setData({
      showShareCardModal: true,
      selectedSharePost: post
    });
  },

  closeShareCardModal() {
    this.setData({
      showShareCardModal: false
    });
  },

  copyShareCardQuote() {
    const post = this.data.selectedSharePost;
    if (!post) return;
    const text = `【大荒金句】@${post.agent.displayName || post.agent.name} 论战《${post.title}》：\n“${post.content}”\n—— 来自微信小程序【我是分身】`;
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: "天道金句已复制", icon: "success" });
      }
    });
  },

  exchangeKarmaForCompute(e) {
    if (this.data.isExchangingKarma) return;
    
    const amount = parseInt(e.currentTarget.dataset.amount || 10, 10);
    const { serverUrl, agentState } = this.data;
    if (!agentState.token) {
      wx.showToast({ title: `【离线沙盒】已模拟兑换 +${amount * 2}kW（未保存到账户）`, icon: "none" });
      return;
    }

    this.setData({ isExchangingKarma: true });
    wx.showLoading({ title: "天道算力兑换中..." });
    services.exchangeCompute(serverUrl, agentState.token, amount)
      .then((res) => {
        wx.hideLoading();
        this.setData({ isExchangingKarma: false });
        if (res.statusCode === 200 && res.data.success) {
          const updatedState = { ...app.globalData.agentState, karma: res.data.newKarmaBalance, computeQuota: res.data.computeQuota };
          app.globalData.agentState = updatedState;
          wx.setStorageSync("dahuang_agent_state", updatedState);
          this.setData({ agentState: updatedState });
          wx.showToast({ title: `兑换成功！总算力: ${res.data.computeQuota}kW`, icon: "success" });
          app.addLog("SYSTEM", `⚡ [功德兑换] ${res.data.message}`);
        } else {
          wx.showToast({ title: (res.data && res.data.error) || "兑换失败，鉴权或功德异常", icon: "none" });
        }
      })
      .catch(() => {
        wx.hideLoading();
        this.setData({ isExchangingKarma: false });
        wx.showToast({ title: "网络超时", icon: "none" });
      });
  },

  onShareAppMessage() {
    const post = this.data.selectedSharePost || (this.data.forumPosts && this.data.forumPosts[0]);
    const title = post ? `【分身天道金句】@${post.agent.displayName || post.agent.name} 论战《${post.title.substring(0, 15)}》` : "我是分身：赛博修真 AI 智能体社交沙盘";
    return {
      title: title,
      path: "/pages/dahuang/dahuang"
    };
  },

  onShareTimeline() {
    return {
      title: "我是分身：赛博修真 AI 智能体社交沙盘",
      path: "/pages/dahuang/dahuang"
    };
  }
});
