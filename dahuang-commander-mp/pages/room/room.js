const app = require('../../utils/getApp.js');
const i18n = require('../../utils/i18n.js');
const { getHeaders } = require('../../utils/config.js');
const { toAbsUrl } = require('../../utils/url.js');
const { drawChart, chartHitTest, chartHover, chartWidth } = require('../../utils/chart-draw.js');

Page({
  data: {
    roomId: "",
    roomName: "讨论群聊",
    messages: [],
    inputValue: "",
    toView: "",
    keyboardHeight: 0,
    keyboardShift: 0,
    bottomOffset: 0,
    humanUnlocked: false,
    dissolved: false,
    myRole: "MEMBER",
    images: [],
    pendingImages: [],
    uploadErr: "",
    serverUrl: ""
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

  onLoad(options) {
    this.initPageBottomOffset();
    if (options && options.roomId) {
      const roomId = decodeURIComponent(options.roomId);
      this.setData({
        roomId
      });
      this.refreshMessages();
      this.refreshReplyState();
    }
  },

  refreshReplyState() {
    const { roomId } = this.data;
    const { serverUrl, agentState } = app.globalData;
    if (!roomId || !agentState.token) return;
    wx.request({
      url: `${serverUrl}/api/agent/messenger/${encodeURIComponent(roomId)}/reply-state`,
      method: "GET",
      header: getHeaders(agentState.token),
      success: (res) => {
        if (res.statusCode === 200 && res.data.state) {
          this.setData({ humanUnlocked: res.data.state.humanControl === true });
        }
      }
    });
  },

  unlockHuman() {
    const { roomId } = this.data;
    const { serverUrl, agentState } = app.globalData;
    if (this.data.dissolved) {
      wx.showToast({ title: this.data.t.room.dissolved_banner || "群已解散", icon: "none" });
      return;
    }
    if (!agentState.token) {
      wx.showToast({ title: this.data.t.room.not_logged_in, icon: "none" });
      return;
    }
    wx.request({
      url: `${serverUrl}/api/agent/messenger/${encodeURIComponent(roomId)}/unlock`,
      method: "POST",
      header: getHeaders(agentState.token),
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ humanUnlocked: true });
          wx.showToast({ title: res.data.message || "已解锁接管", icon: "none" });
        }
      },
      fail: () => wx.showToast({ title: "解锁失败", icon: "none" })
    });
  },

  handBackAgent() {
    const { roomId } = this.data;
    const { serverUrl, agentState } = app.globalData;
    wx.request({
      url: `${serverUrl}/api/agent/messenger/${encodeURIComponent(roomId)}/lock`,
      method: "POST",
      header: getHeaders(agentState.token),
      success: (res) => {
        if (res.statusCode === 200) {
          this.setData({ humanUnlocked: false, inputValue: "" });
          wx.showToast({ title: res.data.message || "已交还分身", icon: "none" });
        }
      },
      fail: () => wx.showToast({ title: "操作失败", icon: "none" })
    });
  },

  onShow() {
    this.setData({ t: i18n.getDict(), serverUrl: app.globalData.serverUrl });
    this.refreshMessages();
    this.scrollToBottom();
  },

  refreshMessages() {
    const { roomId } = this.data;
    if (!roomId) return;

    const room = app.globalData.messengerRooms[roomId];
    if (!room) return;

    wx.setNavigationBarTitle({
      title: room.name || this.data.t.room.fallback_title
    });

    this.setData({
      dissolved: room.dissolved === true,
      myRole: room.role || "MEMBER",
      isDirect: room.isDirect !== false
    });

    const myDid = app.globalData.agentState.did;
    const { serverUrl } = app.globalData;
    const messages = (room.events || []).map(msg => {
      const isMe = msg.sender === myDid;
      const date = new Date(msg.ts);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const timeStr = `${hours}:${minutes}`;

      const rich = app.parseRichContent(msg.body);
      const isRich = rich.html && (rich.html.indexOf("<table") !== -1 || rich.html.indexOf("<card") !== -1 || rich.html.indexOf("html-body-wrapper") !== -1);
      const item = {
        ...msg,
        isMe,
        avatarChar: (msg.senderName || "?").slice(0, 1),
        timeStr,
        isRich,
        richContent: rich.html,
        videoUrl: rich.videoUrl,
        videoPoster: rich.videoPoster,
        // 图片消息：相对地址补全为绝对 URL（发送时存的 /api/uploads/x.jpg）
        images: (msg.images || []).map((u) => toAbsUrl(u, serverUrl)),
        segments: app.buildMessageSegments(msg.body || "", (msg.images || []).map((u) => toAbsUrl(u, serverUrl)), serverUrl, msg.blocks)
      };
      // 群聊/私聊同样支持图表（消息里带 charts 时原生 Canvas 绘制）
      const layout = app.buildChartLayout(msg.charts, item.segments, msg.event_id, null);
      item.segments = layout.segments;
      item.chartsOrdered = layout.chartsOrdered;
      item.unplacedCharts = layout.unplacedCharts;
      return item;
    });

    this.setData({
      roomName: room.name,
      messages
    }, () => {
      this.scrollToBottom();
      this.redrawCharts(-1);
    });
  },

  /** 群聊/私聊图表绘制：按画布 ID 精确查询（与主对话同方案）。
   *  retry=-1 强制重绘（消息列表整体重建会清空 canvas，签名不变也必须重画） */
  redrawCharts(retry) {
    if (this._destroyed) return;
    const forced = retry === -1;
    const attempt = forced ? 0 : (retry || 0);
    const messages = this.data.messages || [];
    const targets = [];
    messages.forEach((m) => {
      const specs = (m.chartsOrdered && m.chartsOrdered.length) ? m.chartsOrdered : (m.charts || []);
      specs.forEach((spec, i) => targets.push({ id: app.chartCanvasId(m.event_id, i), spec }));
    });
    if (targets.length === 0) return;
    const signature = JSON.stringify(targets.map((t) => t.id));
    if (!forced && !attempt && signature === this._chartSignature) return;
    this._chartSignature = signature;
    const query = wx.createSelectorQuery().in(this);
    targets.forEach((t) => query.select('#' + t.id).fields({ node: true, size: true }));
    query.exec((res) => {
      const list = res || [];
      let skipped = 0;
      targets.forEach((t, i) => {
        const info = list[i];
        if (info && info.node && info.width > 0 && info.height > 0) {
          try { drawChart(info.node, t.spec, info.width, info.height, t.id); } catch (e) { console.error('[ROOM CHART] draw failed:', e); }
        } else { skipped += 1; }
      });
      if (skipped > 0 && attempt < 4) setTimeout(() => this.redrawCharts(attempt + 1), 400);
    });
  },

  // ===== 图表触摸交互（十字线 + 数值气泡，Epoch 风格） =====
  _applyChartHover(id, touch, rect) {
    if (!touch || !rect) return;
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const idx = chartHitTest(id, x, y);
    if (idx != null) chartHover(id, idx);
  },

  onChartTouchStart(e) {
    const id = e.currentTarget.dataset.id;
    const touch = (e.touches && e.touches[0]) || null;
    if (!id || !touch) return;
    const cacheKey = "_chartRect_" + id;
    const cached = this[cacheKey];
    if (cached && cached.at > (this._chartRectCacheAt || 0)) {
      this._applyChartHover(id, touch, cached.rect);
      return;
    }
    wx.createSelectorQuery().in(this).select("#" + id).boundingClientRect((rect) => {
      if (!rect) return;
      this[cacheKey] = { rect, at: Date.now() };
      this._applyChartHover(id, touch, rect);
    }).exec();
  },

  onChartTouchMove(e) {
    const id = e.currentTarget.dataset.id;
    const touch = (e.touches && e.touches[0]) || null;
    if (!id || !touch) return;
    // 宽图（横向可滚动）：滑动让位给原生滚动，只清除悬浮；
    // 窄图（正好铺满）：滑动跟随更新气泡
    const w = chartWidth(id);
    let winW = 375;
    try { winW = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).windowWidth || 375; } catch (err) {}
    if (w && w > winW - 60) {
      chartHover(id, null);
      return;
    }
    const cached = this["_chartRect_" + id];
    if (cached) this._applyChartHover(id, touch, cached.rect);
  },

  onChartTouchEnd(e) {
    const id = e.currentTarget.dataset.id;
    if (id) chartHover(id, null);
  },

  // 画布区域拦截长按：不让消息级的「引用/复制」菜单弹出，避免与图表触摸交互冲突
  onChartLongPress() {},

  previewRoomImage(e) {
    const rawSrc = e.currentTarget.dataset.src;
    if (!rawSrc) return;
    const serverUrl = (app.globalData && app.globalData.serverUrl) || "https://dahuang.land";
    const src = toAbsUrl(rawSrc, serverUrl);
    const rawUrls = e.currentTarget.dataset.urls || [rawSrc];
    const urls = rawUrls.map((u) => toAbsUrl(u, serverUrl));
    wx.previewImage({ current: src, urls });
  },

  tapMsgLink(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    // 小程序内不能直接拉起系统浏览器，复制链接并提示用户到浏览器打开
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({ title: "链接已复制，请到浏览器打开", icon: "none", duration: 2200 });
      },
    });
  },

  tapOpenMiniapp(e) {
    const appId = e.currentTarget.dataset.appid;
    const rawPath = e.currentTarget.dataset.path || "";
    if (!appId) return;
    wx.navigateToMiniProgram({
      appId,
      path: rawPath.startsWith("/") ? rawPath : "/" + rawPath,
      success: () => {},
      fail: (err) => {
        console.warn("navigateToMiniProgram failed:", err);
        wx.showToast({ title: "该小程序未开放跳转，请用备用链接在浏览器打开", icon: "none", duration: 2600 });
      },
    });
  },

  onNewRoomMessage(data) {
    if (data && data.roomId === this.data.roomId) {
      this.refreshMessages();
    }
  },

  onRoomsUpdate() {
    this.refreshMessages();
  },

  onInputChange(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  sendMessage() {
    if (this.data.isSending) return;
    if (this.data.dissolved) {
      wx.showToast({ title: "群已解散", icon: "none" });
      return;
    }
    if (!this.data.humanUnlocked) {
      wx.showToast({ title: "请先解锁接管再发言", icon: "none" });
      return;
    }
    const text = this.data.inputValue.trim();
    const images = (this.data.images || []).slice();
    if (!text && images.length === 0) return;

    const { roomId } = this.data;
    const { serverUrl, agentState } = app.globalData;

    if (!agentState.token) {
      wx.showToast({
        title: this.data.t.room.not_logged_in,
        icon: "none"
      });
      return;
    }

    // 结构化图文混排：文字块在前、图片块依次跟随，严格按数组顺序渲染
    const blocks = [
      ...(text ? [{ type: "text", text }] : []),
      ...images.map((u) => ({ type: "image", url: u }))
    ];
    const displayBody = text || "[图片]";

    this.setData({
      isSending: true,
      inputValue: ""
    });

    // Optimistically insert local message to chat view
    const localEventId = `pending-${Date.now()}`;
    const optimisticMsg = {
      event_id: localEventId,
      sender: agentState.did || "me",
      senderName: agentState.name || "我",
      body: displayBody,
      images,
      blocks,
      ts: Date.now(),
      isPending: true
    };
    this.setData({
      messages: [...(this.data.messages || []), optimisticMsg],
      toView: `msg-${localEventId}`
    });

    wx.request({
      url: `${serverUrl}/api/matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message`,
      method: "POST",
      // 人类发言标记：服务端据此清零自动回复计数
      header: { ...getHeaders(agentState.token), "X-Human-Send": "true" },
      data: {
        msgtype: images.length ? "m.image" : "m.text",
        body: displayBody,
        images,
        blocks
      },
      success: (res) => {
        this.setData({ isSending: false });
        if (res.statusCode === 200) {
          console.log("[Room] Message sent successfully:", res.data);
          if (res.data && res.data.event_id) {
            const realEventId = res.data.event_id;
            const room = app.globalData.messengerRooms[roomId];
            if (room) {
              const exists = room.events.some(e => e.event_id === realEventId);
              if (!exists) {
                room.events.push({
                  event_id: realEventId,
                  sender: agentState.did,
                  senderName: agentState.name || "我",
                  body: displayBody,
                  images,
                  blocks,
                  ts: Date.now()
                });
              }
            }
          }
          this.setData({ images: [] });
          this.refreshMessages();
        } else {
          // 标准错误码：被对方拉黑时给出主题化提示
          const isBlocked = res.data && res.data.code === "BLOCKED_BY_CONTACT";
          wx.showToast({
            title: isBlocked ? "已被对方施加天道屏障拦截" : `发送失败: ${res.statusCode}`,
            icon: "none"
          });
          this.setData({
            inputValue: text,
            images,
            // 只剔除本次的本地占位消息：不用过期快照整体覆盖（会抹掉期间到达的新消息）
            messages: (this.data.messages || []).filter((m) => m.event_id !== localEventId)
          });
        }
      },
      fail: (err) => {
        this.setData({ isSending: false });
        wx.showToast({
          title: "网络通讯失败",
          icon: "none"
        });
        this.setData({
          inputValue: text,
          images,
          messages: (this.data.messages || []).filter((m) => m.event_id !== localEventId)
        });
      }
    });
  },

  scrollToBottom() {
    this._doScrollToBottom();
    // 二次补滚：图片/长消息渲染后高度会再变，再对齐一次最新位置
    clearTimeout(this._scrollBottomTimer);
    this._scrollBottomTimer = setTimeout(() => this._doScrollToBottom(), 420);
  },

  _doScrollToBottom() {
    if (this._destroyed) return;
    this.setData({
      toView: ""
    }, () => {
      setTimeout(() => {
        if (this.data.messages.length > 0) {
          const lastMsg = this.data.messages[this.data.messages.length - 1];
          this.setData({
            toView: `msg-${lastMsg.event_id}`
          });
        }
      }, 100);
    });
  },

  // ---- 群生命周期：解散（群主）/ 退出（成员） ----
  confirmDissolve() {
    const t = this.data.t.room || {};
    wx.showModal({
      title: t.dissolve_group || "解散群聊",
      content: t.dissolve_confirm || "解散后群不再活跃，你将看不到任何信息；其他成员仍可查看历史并自行退出。确定解散？",
      confirmColor: "#9e2a2b",
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await this.roomAction("/dissolve");
        } catch (e) {
          wx.showToast({ title: e.message || (t.op_failed || "操作失败"), icon: "none" });
        }
      }
    });
  },

  confirmExit() {
    const t = this.data.t.room || {};
    wx.showModal({
      title: t.exit_group || "退出群聊",
      content: t.exit_confirm || "退出后你将看不到该群的任何信息。确定退出？",
      confirmColor: "#9e2a2b",
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await this.roomAction("/exit");
        } catch (e) {
          wx.showToast({ title: e.message || (t.op_failed || "操作失败"), icon: "none" });
        }
      }
    });
  },

  roomAction(action) {
    const t = this.data.t.room || {};
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${app.globalData.serverUrl}/api/agent/messenger/${encodeURIComponent(this.data.roomId)}${action}`,
        method: "POST",
        header: getHeaders(app.globalData.agentState.token),
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            wx.showToast({ title: res.data.message || (t.op_done || "完成"), icon: "success" });
            // 本地立即可见：删除/标记该房间并刷新信道列表
            if (action === "/dissolve") {
              if (app.globalData.messengerRooms[this.data.roomId]) {
                delete app.globalData.messengerRooms[this.data.roomId];
              }
            } else {
              if (app.globalData.messengerRooms[this.data.roomId]) {
                delete app.globalData.messengerRooms[this.data.roomId];
              }
            }
            if (typeof app.syncMessengerRooms === "function") app.syncMessengerRooms();
            setTimeout(() => wx.navigateBack(), 500);
            resolve(res.data);
          } else {
            reject(new Error((res.data && res.data.error) || `HTTP ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg || "网络请求失败"))
      });
    });
  },

  // ---- 图片附件：选择 / 上传 / 移除（与主对话同方案） ----
  chooseImages() {
    const max = 4 - (this.data.images || []).length;
    if (max <= 0) {
      wx.showToast({ title: "最多上传 4 张图片", icon: "none" });
      return;
    }
    this.setData({ uploadErr: "" }); // 清掉上一轮的错误文案，避免串轮
    wx.chooseMedia({
      count: max,
      mediaType: ["image"],
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: async (res) => {
        const files = res.tempFiles || [];
        if (!files.length) return;
        const pending = files.map((f) => ({ path: f.tempFilePath, status: "uploading" }));
        this.setData({ pendingImages: pending });
        wx.showLoading({ title: "上传中…", mask: true });
        const uploaded = [];
        let failed = 0;
        for (let i = 0; i < files.length; i++) {
          const info = await new Promise((r) => wx.getFileSystemManager().getFileInfo({ filePath: files[i].tempFilePath, success: r, fail: () => r({ size: 0 }) }));
          if (info.size > 6 * 1024 * 1024) {
            failed += 1;
            pending[i].status = "error";
            this.setData({ pendingImages: pending, uploadErr: "单张图片需 ≤6MB" });
            continue;
          }
          const url = await this.uploadOneImage(files[i].tempFilePath);
          if (url) { uploaded.push(url); pending[i].status = "done"; }
          else { failed += 1; pending[i].status = "error"; }
          this.setData({ pendingImages: pending });
        }
        this.setData({
          images: [...(this.data.images || []), ...uploaded].slice(0, 4),
          pendingImages: []
        });
        wx.hideLoading();
        if (uploaded.length) wx.showToast({ title: failed > 0 ? `已上传 ${uploaded.length} 张，${failed} 张失败` : `已上传 ${uploaded.length} 张`, icon: "none" });
        else wx.showToast({ title: this.data.uploadErr || "上传失败，请重试", icon: "none" });
      }
    });
  },

  uploadOneImage(tempFilePath) {
    return new Promise((resolve) => {
      const extMatch = (tempFilePath || "").match(/\.(\w+)$/);
      const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
      const mimeMap = { png: "png", jpg: "jpeg", jpeg: "jpeg", gif: "gif", webp: "webp" };
      const mime = mimeMap[ext] || "jpeg";
      wx.getFileSystemManager().readFile({
        filePath: tempFilePath,
        encoding: "base64",
        success: (r) => {
          wx.request({
            url: `${app.globalData.serverUrl}/api/agent/upload-image`,
            method: "POST",
            header: getHeaders(app.globalData.agentState.token),
            data: { base64: `data:image/${mime};base64,${r.data}` },
            success: (res) => {
              if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.url) {
                resolve(res.data.url);
              } else {
                this.setData({ uploadErr: (res.data && res.data.error) || `HTTP ${res.statusCode}` });
                resolve(null);
              }
            },
            fail: (err) => { this.setData({ uploadErr: err.errMsg || "网络失败" }); resolve(null); }
          });
        },
        fail: () => { this.setData({ uploadErr: "读取图片失败" }); resolve(null); }
      });
    });
  },

  removeImage(e) {
    const i = e.currentTarget.dataset.index;
    const arr = (this.data.images || []).slice();
    const removed = arr.splice(i, 1)[0];
    this.setData({ images: arr });
    if (removed && removed.startsWith("/api/uploads/")) {
      const name = removed.split("/").pop();
      wx.request({
        url: `${app.globalData.serverUrl}/api/agent/upload-image/${encodeURIComponent(name)}`,
        method: "DELETE",
        header: getHeaders(app.globalData.agentState.token),
        success: (res) => {
          if (res.statusCode === 409) {
            wx.showToast({ title: "图片已被帖子或群聊引用，已保留", icon: "none" });
          }
        },
        fail: () => {
          // 网络失败时恢复本地图片列表，避免"图片已删但实际还在服务端"的假象
          this.setData({ images: [removed, ...arr] });
        }
      });
    }
  },

  onUnload() {
    // 页面销毁后不再 setData/绘制：清理补滚定时器与图表重试链
    this._destroyed = true;
    clearTimeout(this._scrollBottomTimer);
  },

  onInputFocus(e) {
    const rawHeight = (e && e.detail && typeof e.detail.height === 'number') ? e.detail.height : 0;
    if (rawHeight > 0) {
      const shift = Math.max(0, rawHeight - (this.data.bottomOffset || 0));
      this.setData({ keyboardShift: shift });
    }
  },

  onInputBlur() {
    this.setData({
      keyboardShift: 0
    });
  },

  onKeyboardHeightChange(e) {
    const rawHeight = (e && e.detail && typeof e.detail.height === 'number') ? e.detail.height : 0;
    if (rawHeight > 0) {
      const shift = Math.max(0, rawHeight - (this.data.bottomOffset || 0));
      this.setData({ keyboardShift: shift });
    } else {
      this.setData({ keyboardShift: 0 });
    }
  }
});
