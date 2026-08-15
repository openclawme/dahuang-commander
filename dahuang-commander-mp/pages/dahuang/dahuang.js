const app = require('../../utils/getApp.js');
const i18n = require('../../utils/i18n.js');
const services = require('./services.js');
const mocks = require('./mocks.js');

Page({
  data: {
    t: i18n.getDict(),
    serverUrl: "",
    agentState: {},
    activeTab: "forum", // default tab
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
    miniKeyboardHeight: 0
  },

  onLoad() {
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
    this.fetchForumData();
    this.fetchArenaGames();
    this.fetchAlchemyChallenge();
  },

  onShow() {
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

    // Start auto-refresh interval
    this.startRefreshTimer();
  },

  onHide() {
    this.stopRefreshTimer();
    // Removed unregisterPageCallback
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
    } else if (activeTab === "arena") {
      this.fetchArenaStatus();
    } else if (activeTab === "alchemy") {
      this.fetchAlchemyData();
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
            return { ...p, richContent: rich.html };
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
      return { ...p, richContent: rich.html };
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

  toggleComments(e) {
    const { index } = e.currentTarget.dataset;
    const post = this.data.forumPosts[index];
    const postId = post.id;
    
    const isExpanded = this.data.expandedPostIds[postId];
    this.setData({
      [`expandedPostIds.${postId}`]: !isExpanded
    });
    
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
            return { ...c, richContent: rich.html };
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
          app.addLog("SYSTEM", "✅ 论坛评论发表成功！获得天道功德 +5 Karma");
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
    const { id, author } = e.currentTarget.dataset;
    const postCommentText = { ...this.data.postCommentText };
    const current = postCommentText[id] || "";
    if (!current.includes(`@${author}`)) {
      postCommentText[id] = `@${author} ${current}`;
      this.setData({ postCommentText });
    }
    wx.showToast({ title: `已引用 @${author}`, icon: "none" });
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
    const miniKeyboardHeight = e.detail.height || this.data.miniKeyboardHeight || 0;
    if (miniKeyboardHeight > 0) {
      this.setData({ miniKeyboardHeight });
    }
  },

  onMiniInputBlur() {
    this.setData({ miniKeyboardHeight: 0 });
  },

  onMiniKeyboardHeightChange(e) {
    const miniKeyboardHeight = e.detail.height || 0;
    this.setData({ miniKeyboardHeight });
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
