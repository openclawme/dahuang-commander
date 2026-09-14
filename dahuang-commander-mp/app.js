const DahuangSocket = require("./utils/socket");
const { VERSION, AGENT_VERSION, getHeaders } = require("./utils/config");
const shop = require("./utils/shop");

App({
  globalData: {
    serverUrl: "https://dahuang.land",
    agentState: {
      id: "agent-preview",
      name: "大荒探索者",
      did: "did:pseudo:explorer-0x888",
      karma: 0,
      character: "普通修士",
      iq: 100,
      token: null,
      status: "OFFLINE"
    },
    chatHistory: [],
    logs: [
      { id: "init-log", type: "SYSTEM", message: "大荒信使小程序端已就绪", timestamp: "00:00:00" }
    ],
    messengerRooms: {},
    socket: null,
    showDevLogs: false
  },

  onLaunch() {
    require("./utils/i18n.js").initLanguage();
    console.log(`=== 我是分身微信小程序 v${VERSION} (无缝神念管道与双向重构版) ===`);
    console.log("[App] Launching...");
    
    // Retrieve cached server URL
    const cachedUrl = wx.getStorageSync("dahuang_server_url");
    if (cachedUrl) {
      this.globalData.serverUrl = cachedUrl;
    }

    const cachedState = wx.getStorageSync("dahuang_agent_state");
    if (cachedState) {
      this.globalData.agentState = cachedState;
    }
    this.loadChatHistoryForAgent(this.globalData.agentState.id);

    const cachedDevLogs = wx.getStorageSync("dahuang_show_dev_logs");
    if (cachedDevLogs !== undefined && cachedDevLogs !== "") {
      this.globalData.showDevLogs = !!cachedDevLogs;
    }

    this.startPendingWatchdog();

    if (this.globalData.agentState.token) {
      this.connectSocket();
      this.syncMessengerRooms();
      this.pullOfflineNotifications();
    }
  },

  startPendingWatchdog() {
    if (this.pendingWatchdogTimer) return;
    this.pendingWatchdogTimer = setInterval(() => {
      const now = Date.now();
      let hasChanges = false;
      let activePendingCount = 0;

      if (this.globalData.chatHistory && Array.isArray(this.globalData.chatHistory)) {
        this.globalData.chatHistory.forEach(m => {
          if (m.isPending || (m.progress !== undefined && m.progress < 100)) {
            activePendingCount++;
            const itemTime = m.createdAt || now;
            // If task is pending for over 45 seconds without socket updates, mark complete without infinite redispatch!
            if (now - itemTime > 360000 && !m.autoFallbackTriggered) {
              m.autoFallbackTriggered = true;
              m.isPending = false;
              m.progress = 100;
              m.hasFallback = true;
              if (m.tasks && Array.isArray(m.tasks)) {
                m.tasks = m.tasks.map(t => ({
                  ...t,
                  status: "SUCCESS",
                  detail: t.detail || "✨ 天道推演耗时较长：看门狗已自动归档"
                }));
              }
              if (!m.content || m.content.includes("（智能体处理中...）")) {
                m.content = "（推演耗时较长，看门狗已自动归档；若后台结果随后产出，会自动回填到这里。）";
              }
              hasChanges = true;
            }
          }
        });
      }

      // 有任务仍在等待时，周期性静默拉取离线通知：
      // 弥补“任务完成瞬间 socket 断开 → 最终结果推送丢失”的竞态窗口
      // （重连时的一次性拉取可能发生在结果入库之前，拉到空队列）
      if (activePendingCount > 0) {
        if (!this.lastPendingPullTs || now - this.lastPendingPullTs > 15000) {
          this.lastPendingPullTs = now;
          this.pullOfflineNotifications({ silent: true });
        }
      }

      if (hasChanges) {
        this.addLog("SYSTEM", "⚡ 看门狗已安全清理超时感应任务。");
        this.saveChatHistory();
        this.triggerPageCallback("onChatHistoryUpdate");
      }

      // Automatically stop watchdog timer when no pending tasks remain
      if (activePendingCount === 0 && !hasChanges) {
        this.stopPendingWatchdog();
      }
    }, 5000);
  },

  stopPendingWatchdog() {
    if (this.pendingWatchdogTimer) {
      clearInterval(this.pendingWatchdogTimer);
      this.pendingWatchdogTimer = null;
    }
  },

  connectSocket() {
    if (this.globalData.socket && this.globalData.socket.isConnected) {
      console.log("[App] Socket already connected.");
      return;
    }

    if (this.globalData.socket) {
      this.globalData.socket.disconnect();
      this.globalData.socket = null;
    }

    this.addLog("SYSTEM", "正在请求建立天道 Socket.io 高维神念频道...");
    const socket = new DahuangSocket(this.globalData.serverUrl, "/api/socket");
    this.globalData.socket = socket;

    socket.on("connect", () => {
      this.addLog("SYSTEM", "⚡ 天道高维神念频道连通成功！");
      if (this.globalData.agentState.token) {
        // Correct event name according to server src/lib/socket.ts: "auth"
        socket.emit("auth", { token: this.globalData.agentState.token });
      }
    });

    socket.on("authenticated", (res) => {
      this.addLog("SYSTEM", `✨ 身份鉴权无误！分身已加入私密神念通道 (Agent ID: ${(res && res.agentId) || this.globalData.agentState.id})。`);
      // 重连成功后补拉断线期间完成的任务结果（最终推送可能已丢失）
      this.pullOfflineNotifications();
      this.reconnectAttempts = 0;
      this.globalData.agentState.status = "ONLINE";
      this.triggerPageCallback("onAgentStateUpdate", this.globalData.agentState);
      this.triggerPageCallback("onAgentStatusChange", this.globalData.agentState);
      // 微信身份绑定（openid）：订阅消息推送的前提
      this.ensureWechatBinding();
    });

    socket.on("agent_command_result", (data) => {
      this.handleAgentCommandResult(data);
    });

    // 回复后的下一步建议：主结果已送达后异步补齐，按 requestId 挂到对应气泡；
    // 对应消息不存在（如已被清理）则静默丢弃
    socket.on("agent_suggestions", (data) => {
      const requestId = data && data.requestId;
      const suggestions = data && Array.isArray(data.suggestions) ? data.suggestions : [];
      if (!requestId || suggestions.length === 0) return;
      const msg = this.globalData.chatHistory.find((m) => m.id === requestId);
      if (!msg || msg.isPending || msg.isError) return;
      msg.suggestions = suggestions;
      this.saveChatHistory();
      this.triggerPageCallback("onChatHistoryUpdate");
    });

    socket.on("agent_command_stream", (data) => {
      this.handleAgentCommandStream(data);
    });

    // 实时进度事件流：plan/phase/step_start/step_update/step_done/heartbeat
    socket.on("agent_progress", (data) => {
      this.handleAgentProgress(data);
    });

    // Correct event name according to server src/app/api/matrix/...: "m.room.event"
    socket.on("m.room.event", (eventData) => {
      this.handleIncomingRoomEvent(eventData);
    });

    // 日程提醒：到点实时推送（离线时由服务端写站内提醒 + 订阅消息兜底）
    socket.on("schedule_reminder", (data) => {
      const title = (data && data.title) || "日程提醒";
      const body = (data && data.body) || "";
      this.pushSystemChat(`🔔 【${title}】${body}`);
      try { wx.vibrateShort({ type: "medium" }); } catch (e) {}
      wx.showToast({ title: "日程到点： " + title, icon: "none", duration: 2500 });
      this.triggerPageCallback("onScheduleReminder", data || {});
    });

    // 通讯录 v1：被拉入新群/建群成功 → 无需刷新即可看到新群
    socket.on("room.created", (eventData) => {
      const roomId = eventData && eventData.room_id;
      if (!roomId) return;
      if (!this.globalData.messengerRooms[roomId]) {
        this.globalData.messengerRooms[roomId] = {
          roomId,
          name: eventData.name || `👥 群聊_${roomId.slice(0, 6)}`,
          events: [],
          unreadCount: 0,
          isDirect: !eventData.is_group,
          memberCount: eventData.member_count || 2,
          role: "MEMBER",
          dissolved: false
        };
        this.triggerPageCallback("onRoomsUpdate");
      }
    });

    // 群生命周期：群被解散 → 实时标记（留群成员看到「已解散」横幅）
    socket.on("m.room.dissolved", (eventData) => {
      const roomId = eventData && eventData.room_id;
      if (!roomId) return;
      const room = this.globalData.messengerRooms[roomId];
      if (room) {
        room.dissolved = true;
        this.triggerPageCallback("onRoomsUpdate");
      }
    });

    socket.on("agent_command_approval_pending", (data) => {
      this.addLog("SYSTEM", `📜 收到审批准允发函：工具 [${data.tool}] 需本尊亲准！`);
      this.globalData.pendingApproval = data;
      this.triggerPageCallback("onApprovalPending", data);
    });

    // 待主人决策：分身上报的事项实时提醒
    socket.on("agent_pending_decision", (data) => {
      this.globalData.pendingDecisionCount = (data && data.count) || 1;
      this.pushSystemChat(`⚠️ 有事情需要主人决策：${(data && data.title) || "待办事项"}（点击顶部横幅处理）`);
      this.triggerPageCallback("onPendingDecision", data);
    });

    socket.on("disconnect", (res) => {
      this.addLog("SYSTEM", "⚠️ 天道高维神念频道连接中断。");
      this.globalData.agentState.status = "OFFLINE";
      this.triggerPageCallback("onAgentStateUpdate", this.globalData.agentState);
      this.triggerPageCallback("onAgentStatusChange", this.globalData.agentState);
      this.scheduleSocketReconnect();
    });

    socket.on("error", (err) => {
      this.addLog("SYSTEM", `❌ 天道高维神念频道发生异常: ${typeof err === "string" ? err : JSON.stringify(err)}`);
      this.scheduleSocketReconnect();
    });

    socket.connect();
  },

  scheduleSocketReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectAttempts = (this.reconnectAttempts || 0) + 1;
    if (this.reconnectAttempts > 10) {
      this.addLog("SYSTEM", "⚠️ 连续 10 次重连尝试失败，已暂停自动重连。请下拉刷新重试。");
      return;
    }
    const delay = Math.min(30000, 3000 * Math.pow(1.5, this.reconnectAttempts - 1));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.globalData.agentState.token && this.globalData.agentState.status !== "ONLINE") {
        this.addLog("SYSTEM", `🔄 [第 ${this.reconnectAttempts} 次] 尝试重新连接元神总线...`);
        this.connectSocket();
      }
    }, delay);
  },

  syncMessengerRooms() {
    if (!this.globalData.agentState.token) return;

    wx.request({
      url: `${this.globalData.serverUrl}/api/matrix/client/v3/sync`,
      method: "GET",
      header: getHeaders(this.globalData.agentState.token),
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.rooms) {
          const joinedRooms = res.data.rooms.join || {};
          Object.keys(joinedRooms).forEach(roomId => {
            const roomData = joinedRooms[roomId];
            const timelineEvents = (roomData.timeline && roomData.timeline.events) || [];
            const stateEvents = (roomData.state && roomData.state.events) || [];

            // Map member display names if present in state or timeline events
            const memberNames = {};
            [...stateEvents, ...timelineEvents].forEach(ev => {
              if (ev && ev.type === "m.room.member" && ev.content && ev.content.displayname) {
                memberNames[ev.state_key || ev.sender] = ev.content.displayname;
              }
            });

            if (!this.globalData.messengerRooms[roomId]) {
              this.globalData.messengerRooms[roomId] = {
                roomId,
                name: roomData.name || `👥 研讨会话_${roomId.slice(0, 6)}`,
                events: [],
                unreadCount: 0
              };
            }

            const room = this.globalData.messengerRooms[roomId];
            // 通讯录 v1：区分私聊/群组（sync 载荷 is_direct/member_count）
            room.isDirect = roomData.is_direct !== false;
            room.memberCount = roomData.member_count || 1;
            // 群生命周期：解散标记与本人角色（解散权限）
            room.dissolved = roomData.dissolved === true;
            room.role = roomData.role || "MEMBER";
            timelineEvents.forEach(ev => {
              const exists = room.events.some(e => e.event_id === ev.event_id);
              if (!exists) {
                const isMe = ev.sender === this.globalData.agentState.did;
                const senderDisplayName = memberNames[ev.sender] || (isMe ? "我" : `道友 (${(ev.sender || "").slice(-6)})`);
                room.events.push({
                  event_id: ev.event_id || `msg-${Date.now()}`,
                  sender: ev.sender,
                  senderName: ev.senderName || senderDisplayName,
                  body: (ev.content && ev.content.body) || "",
                  images: (ev.content && Array.isArray(ev.content.images)) ? ev.content.images : [],
                  blocks: (ev.content && Array.isArray(ev.content.blocks)) ? ev.content.blocks : [],
                  ts: ev.origin_server_ts || Date.now()
                });
              }
            });

            if (room.events.length > 100) {
              room.events = room.events.slice(-100);
            }
          });

          this.triggerPageCallback("onRoomsUpdate");
        }
      }
    });
  },

  handleIncomingRoomEvent(eventData) {
    const roomId = eventData.room_id;
    if (!roomId) return;

    const body = (eventData.content && eventData.content.body) || "";
    const images = (eventData.content && Array.isArray(eventData.content.images)) ? eventData.content.images : [];
    const senderDisplayName = eventData.senderName || `道友 (${(eventData.sender || "").slice(-6)})`;
    const isMe = eventData.sender === this.globalData.agentState.did;

    if (!this.globalData.messengerRooms[roomId]) {
      this.globalData.messengerRooms[roomId] = {
        roomId,
        name: eventData.is_group ? `👥 群聊_${roomId.slice(0, 6)}` : `👤 ${senderDisplayName}`,
        events: [],
        unreadCount: 0,
        isDirect: !eventData.is_group,
        memberCount: eventData.is_group ? 2 : 1
      };
    }

    const room = this.globalData.messengerRooms[roomId];
    const exists = room.events.some(e => e.event_id === eventData.event_id);
    if (!exists) {
      const newEvent = {
        event_id: eventData.event_id || `msg-${Date.now()}`,
        sender: eventData.sender,
        senderName: senderDisplayName,
        body,
        images,
        blocks: (eventData.content && Array.isArray(eventData.content.blocks)) ? eventData.content.blocks : [],
        ts: eventData.origin_server_ts || Date.now()
      };
      room.events.push(newEvent);
      // Cap max memory size per room timeline to 100
      if (room.events.length > 100) {
        room.events = room.events.slice(-100);
      }
      if (!isMe) {
        room.unreadCount++;
      }
      this.triggerPageCallback("onRoomsUpdate");
      this.triggerPageCallback("onNewRoomMessage", { roomId, event: newEvent });
    }
  },

  trimChatHistory() {
    if (this.globalData.chatHistory && this.globalData.chatHistory.length > 50) {
      const removedCount = this.globalData.chatHistory.length - 50;
      this.globalData.chatHistory = this.globalData.chatHistory.slice(-50);
      this.addLog("SYSTEM", `🧹 灵台清静：触发记忆熔断，自动归档清理 ${removedCount} 环因果业障。`);
    }
  },

  handleAgentCommandStream(data) {
    if (!data || !data.requestId) return;
    const h = this.globalData.chatHistory;
    const msg = h.find(m => m.id === data.requestId);
    if (msg) {
      // 流式阶段只显示纯文本：模型流出的 HTML 半成品若直接进 rich-text
      // 会闪烁成原始标签（"一堆脚本"）；最终结果到达后恢复完整排版
      msg.content = this.stripHtmlForStream(data.content || "");
      msg.isPending = false;
      msg.progress = 99;
      // 流式归纳阶段：进度状态机保留并切换 phase，状态行显示"✍ 正在整理回复"
      if (msg.progressState) {
        msg.progressState.phase = "synthesize";
        msg.progressState.lastUpdateAt = Date.now();
      }
      this.triggerPageCallback("onChatHistoryUpdate");
    }
  },

  /** 流式展示用：剥掉 HTML 标签与实体（半成品 HTML 绝不能原样进 rich-text） */
  stripHtmlForStream(html) {
    return String(html || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&(amp|lt|gt|quot|#0?39|apos);/gi, (m0, name) => {
        switch (String(name).toLowerCase()) {
          case "amp": return "&";
          case "lt": return "<";
          case "gt": return ">";
          case "quot": return '"';
          default: return "'";
        }
      });
  },

  /**
   * 实时进度事件流状态机（后端 agent_progress）：
   * plan 首帧建立步骤列表；step_start/step_done 驱动分段条；step_update 滚动 detail；
   * heartbeat 保证长工具"还活着"的体感（客户端秒表 + 伪进度自行驱动显示）。
   */
  handleAgentProgress(data) {
    if (!data || !data.requestId) return;
    const msg = this.globalData.chatHistory.find(m => m.id === data.requestId);
    if (!msg) return;
    let ps = msg.progressState;
    if (!ps) {
      ps = { phase: "understanding", steps: [], activeStepId: "", lastDetail: "", startedAt: Date.now(), lastUpdateAt: Date.now() };
      msg.progressState = ps;
    }
    ps.lastUpdateAt = Date.now();
    switch (data.type) {
      case "plan": {
        ps.phase = "execute";
        ps.steps = (data.tasks || []).map((t) => ({
          id: t.desc,
          desc: t.desc,
          status: t.status === "SUCCESS" ? "SUCCESS" : (t.status === "FAILED" ? "FAILED" : "PENDING"),
          durationMs: null,
          summary: ""
        }));
        break;
      }
      case "phase":
        ps.phase = data.phase || ps.phase;
        break;
      case "step_start": {
        ps.activeStepId = data.stepId || "";
        let st = ps.steps.find((s) => s.id === data.stepId);
        if (!st) {
          st = { id: data.stepId, desc: data.desc || data.stepId, status: "RUNNING", durationMs: null, summary: "" };
          ps.steps.push(st);
        }
        st.status = "RUNNING";
        ps.steps.forEach((s) => { if (s.id !== data.stepId && s.status === "RUNNING") s.status = "PENDING"; });
        break;
      }
      case "step_update": {
        if (data.stepId) {
          ps.activeStepId = data.stepId;
          const st = ps.steps.find((s) => s.id === data.stepId);
          if (st && st.status !== "SUCCESS" && st.status !== "FAILED") st.status = "RUNNING";
        }
        ps.lastDetail = data.detail || "";
        break;
      }
      case "step_done": {
        const st = ps.steps.find((s) => s.id === data.stepId);
        if (st) {
          st.status = data.status === "SUCCESS" ? "SUCCESS" : "FAILED";
          st.durationMs = data.durationMs != null ? data.durationMs : null;
          st.summary = data.summary || "";
        }
        if (ps.activeStepId === data.stepId) ps.activeStepId = "";
        ps.lastDetail = data.summary || "";
        break;
      }
      case "heartbeat": {
        if (data.stepId) {
          ps.activeStepId = data.stepId;
          const st = ps.steps.find((s) => s.id === data.stepId);
          if (st && st.status !== "SUCCESS" && st.status !== "FAILED") st.status = "RUNNING";
        }
        break;
      }
    }
    this.triggerPageCallback("onChatHistoryUpdate");
  },

  handleAgentCommandResult(data) {
    // 非任务结果类通知（如待决策 PENDING_DECISION 留痕）：
    // 只进日志面板，绝不进主对话（否则会成为"（推演中...）"僵尸消息）
    if (data.type && !data.requestId && !data.command && !data.reply) {
      this.addLog("SYSTEM", data.message || `收到提醒：${data.title || data.type}`);
      return;
    }

    const isAutonomous = !!(
      data.isAutoReply === true || data.isAutoReply === "true" ||
      (data.requestId && (data.requestId.startsWith("cron-") || data.requestId.startsWith("auto-") || data.requestId.startsWith("bg-"))) ||
      (data.command && (data.command.startsWith("【分身自治】") || data.command.startsWith("【系统天道提示】") || data.command.includes("系统天道提示")))
    );
    
    if (isAutonomous) {
      if (data.logs && Array.isArray(data.logs)) {
        data.logs.forEach(l => {
          this.addLog(l.type || "SYSTEM", l.message || "");
        });
      }
      // 自主推演的 pending 占位不再写入日志面板，避免"智能体处理中"噪音
      if (data.reply && !(data.isPending === true || (data.progress !== undefined && data.progress < 100))) {
        this.addLog("AUTONOMOUS", data.reply);
      }
      return;
    }

    this.addLog("SYSTEM", "⚡ 收到天道决策反馈！");

    // 清空指令（Agent 通过 api_chat_clear / api_memory_clear 工具执行）：
    // 在写入本条结果之前清空本地窗口，确认回复显示在干净的新窗口里
    if (data.clearWindow === true || data.clearMemory === true) {
      this.clearChatWindow(data.clearMemory === true);
    }

    // Sanitize incoming reply content to intercept verbose wait statements
    if (data.reply) {
      // 传真实 msgId：否则 sanitizeMessage 生成临时 id，图片转存回调在 chatHistory 里找不到消息，
      // 转存结果被丢弃（外链图片永远显示失败）
      const sanitized = this.sanitizeMessage({ id: msgId, content: data.reply }, false);
      data.reply = sanitized.content;
      // 图表优先用服务端下发的结构化 charts 字段；
      // 兼容旧消息/旧通知：从文本中解析图表数据块兜底
      if (!(Array.isArray(data.charts) && data.charts.length > 0) &&
          sanitized.charts && sanitized.charts.length > 0) {
        data.charts = sanitized.charts;
      }
      // 实时消息同样带上 agentImages（此前只有"重启后从 storage 加载"路径会提取）
      if (sanitized.agentImages && sanitized.agentImages.length > 0) {
        data.agentImages = sanitized.agentImages;
      }
      if (sanitized.isPending && data.progress !== 100 && data.isPending !== false) {
        data.isPending = true;
      }
    }

    const msgId = data.requestId || `reply-${Date.now()}`;
    let index = this.globalData.chatHistory.findIndex(m => m.id === msgId);
    const isNew = index === -1;

    // 完成态但无文字回复的结果：只记日志，绝不生成「无文字回复」僵尸气泡
    // （覆盖自动任务漏标、工具型任务自然无文字等场景）
    const isFinalNoReply =
      data.isPending !== true && (data.progress === undefined || data.progress >= 100) && !data.reply;
    if (isNew && isFinalNoReply) {
      this.addLog("SYSTEM", `✅ 任务「${(data.command || "").slice(0, 20) || "后台任务"}」已完成（无文字回复，详见法力日志）。`);
      return;
    }

    // 中间过程的 FAILED 任务只是步骤失败（系统会自动重试其他工具），
    // 只有最终结果（progress=100 / 非 pending）仍带失败步骤时才显示错误横幅
    const isFinalState = data.isPending !== true && (data.progress === undefined || data.progress >= 100);
    // 步骤级失败 ≠ 任务失败：agent 常某工具失败后自行换方案重试、最终交付完整答案。
    // 只有"任务整体失败"（显式失败标记，或终态却没有文字回复）才渲染红色错误横幅；
    // 有完整回复时仅加一条轻量提示，气泡保持正常、建议照常下发。
    const hasFinalReply = isFinalState && !!data.reply;
    const isErrorState = data.success === false || data.status === "FAILED" || (isFinalState && !hasFinalReply);
    const hasFailedSteps = hasFinalReply && Array.isArray(data.tasks) && data.tasks.some(t => t.status === "FAILED");

    if (data.logs && Array.isArray(data.logs)) {
      data.logs.forEach(l => {
        this.addLog(l.type || "SYSTEM", l.message || "");
      });
    }

    let existingMsg = !isNew ? this.globalData.chatHistory[index] : null;

    let updatedTasks = data.tasks || (existingMsg ? existingMsg.tasks : []);

    if (data.progress === 100 && (!data.tasks || data.tasks.length === 0) && updatedTasks && updatedTasks.length > 0) {
      updatedTasks = updatedTasks.map(t => ({
        ...t,
        status: isErrorState ? "FAILED" : "SUCCESS"
      }));
    }

    const resultMsg = {
      id: msgId,
      sender: "agent",
      content: (data.isPending === true || (data.progress !== undefined && data.progress < 100)) ? "" : (data.reply || (existingMsg ? existingMsg.content : "（该任务无文字回复，详见法力日志）")),
      timestamp: this.getTimestamp(),
      createdAt: existingMsg ? existingMsg.createdAt : Date.now(),
      progress: data.progress !== undefined ? data.progress : (existingMsg ? existingMsg.progress : 100),
      tasks: updatedTasks,
      isPending: data.isPending !== undefined ? data.isPending : (data.progress < 100),
      isError: isErrorState,
      // 步骤级失败但整体完成：轻量提示（非错误横幅）
      hasFailedSteps: hasFailedSteps,
      // 终态结果到达：结束进度状态机（progressState 置空，UI 收起进度区）
      progressState: (data.isPending === true || (data.progress !== undefined && data.progress < 100)) ? (existingMsg ? existingMsg.progressState : undefined) : null,
      agentImages: (data.agentImages && data.agentImages.length > 0) ? data.agentImages : (existingMsg ? existingMsg.agentImages : undefined),
      charts: this.decorateCharts(data.charts) || (existingMsg ? existingMsg.charts : undefined),
      goods: shop.decorateGoods(data.goods) || (existingMsg ? existingMsg.goods : undefined),
      suggestions: (data.suggestions && data.suggestions.length > 0) ? data.suggestions : (existingMsg ? existingMsg.suggestions : undefined)
    };

    // 历史孤儿任务的延迟结果（如崩溃恢复后很久才完成）：只记日志，不插入聊天流
    const taskCreatedAt = data.taskCreatedAt ? new Date(data.taskCreatedAt).getTime() : null;
    if (isNew && taskCreatedAt && Date.now() - taskCreatedAt > 30 * 60 * 1000) {
      this.addLog("SYSTEM", `📦 历史任务「${(data.command || "").slice(0, 20)}」的延迟结果已归档（请求 ${msgId.slice(0, 12)}...）。`);
      return;
    }
    if (isNew) {
      this.globalData.chatHistory.push(resultMsg);
    } else {
      this.globalData.chatHistory[index] = resultMsg;
    }

    this.trimChatHistory();
    this.saveChatHistory();
    this.triggerPageCallback("onChatHistoryUpdate");

    // Enable watchdog if tasks are still pending
    if (resultMsg.isPending) {
      this.startPendingWatchdog();
    }
  },

  // 图表布局：按数据点数量计算自然宽度（每点最少 50px + 坐标轴空间），
  // 点数多时画布加宽并横向滚动，避免曲线被压进窗口宽度
  decorateCharts(charts) {
    if (!Array.isArray(charts)) return charts;
    return charts.map((c) => {
      const maxPoints = Math.max.apply(
        null,
        (Array.isArray(c.series) ? c.series : []).map((s) => (Array.isArray(s.values) ? s.values.length : 0)).concat([4])
      );
      return { ...c, _minWidthPx: Math.round(320 + Math.max(0, maxPoints - 4) * 50) };
    });
  },

  // 清空当前对话窗口（clearAll=true 时同时清空本地日志面板）
  clearChatWindow(clearAll) {
    const agentId = this.globalData.agentState.id;
    if (agentId) {
      try {
        wx.removeStorageSync(`dahuang_chat_history_${agentId}`);
      } catch (e) {
        console.error("[App] Failed to remove chat history storage:", e);
      }
    }
    this.globalData.chatHistory = [
      {
        id: "init-welcome",
        sender: "agent",
        content: "（天道连通）主人，大荒分身在此候命。请降下法旨！",
        timestamp: this.getTimestamp(),
        createdAt: Date.now()
      }
    ];
    if (clearAll) {
      this.globalData.logs = [];
    }
    this.addLog("SYSTEM", `🧹 已按指令清空${clearAll ? "全部历史信息" : "当前对话窗口"}。`);
    this.triggerPageCallback("onChatHistoryUpdate");
  },

  // 主对话框插入一条系统消息（待办提醒/登录摘要等）
  pushSystemChat(message) {
    const newMsg = {
      id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sender: "system",
      content: message,
      timestamp: this.getTimestamp()
    };
    this.globalData.chatHistory.push(newMsg);
    this.trimChatHistory();
    this.saveChatHistory();
    this.triggerPageCallback("onChatHistoryUpdate");
  },

  // 拉取待决策事项数量（登录摘要/横幅计数）
  refreshPendingDecisions(callback) {
    const state = this.globalData.agentState || {};
    if (!state.token) { if (callback) callback(0); return; }
    wx.request({
      url: `${this.globalData.serverUrl || "https://dahuang.land"}/api/agent/decisions`,
      method: "GET",
      header: getHeaders(state.token),
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          const count = res.data.count || 0;
          this.globalData.pendingDecisionCount = count;
          this.globalData.pendingDecisionTitles = (res.data.decisions || []).slice(0, 3).map(d => d.title);
          if (callback) callback(count);
        } else if (callback) callback(0);
      },
      fail: () => { if (callback) callback(0); }
    });
  },

  addLog(type, message) {
    const timestamp = this.getTimestamp();
    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      message,
      timestamp
    };
    this.globalData.logs.push(newLog);
    if (this.globalData.logs.length > 200) {
      this.globalData.logs = this.globalData.logs.slice(-200);
    }
    this.triggerPageCallback("onLogsUpdate", newLog);
    this.triggerPageCallback("onNewLog", newLog);
  },

  // 用 JWT 换取元神档案并落为当前绑定（登录页/设置页共享；成功自动建 socket）
  verifyAndApplyToken(token, onSuccess, onFail) {
    if (!token) { if (onFail) onFail("凭证不可为空"); return; }
    wx.request({
      url: `${this.globalData.serverUrl || "https://dahuang.land"}/api/agent/profile`,
      method: "GET",
      header: getHeaders(token),
      success: (res) => {
        if (res.statusCode === 200 && res.data.profile) {
          const p = res.data.profile;
          this.globalData.agentState = {
            id: p.id,
            name: p.displayName || p.name,
            did: p.did,
            karma: p.karma || 0,
            character: "高维探秘者",
            iq: p.iq || 100,
            computeQuota: p.computeQuota || 100,
            hasPassword: p.hasPassword === true,
            token: token,
            status: "ONLINE"
          };
          wx.setStorageSync("dahuang_agent_state", this.globalData.agentState);
          this.recordLoginHistory({ id: p.id, name: p.displayName || p.name, did: p.did });
          this.addLog("SYSTEM", `🔑 凭证验证成功！角色切换为：[${p.name}]`);
          this.loadChatHistoryForAgent(p.id);
          this.connectSocket();
          this.ensureWechatBinding();
          if (onSuccess) onSuccess(this.globalData.agentState);
        } else {
          if (onFail) onFail((res.data && res.data.error) || "凭证检验不通过");
        }
      },
      fail: (err) => {
        if (onFail) onFail(err.errMsg || "网络超时");
      }
    });
  },

  // 本地最近登录元神（去重、最新在前、上限 10）——登录页快捷选择
  recordLoginHistory(agent) {
    if (!agent || !agent.id) return;
    const key = "dahuang_login_history";
    let list = [];
    try { list = wx.getStorageSync(key) || []; } catch (e) { list = []; }
    list = list.filter(a => a.id !== agent.id);
    list.unshift({ id: agent.id, name: agent.name, did: agent.did || "", ts: Date.now() });
    list = list.slice(0, 10);
    try { wx.setStorageSync(key, list); } catch (e) {}
  },

  /** 微信身份绑定：wx.login → code2session 换 openid（幂等，重复调用只更新绑定） */
  ensureWechatBinding(force) {
    const token = this.globalData.agentState && this.globalData.agentState.token;
    if (!token) return;
    if (this._wechatBound && !force) return;
    if (this._wechatBinding) return;
    this._wechatBinding = true;
    wx.login({
      success: (res) => {
        const code = res && res.code;
        if (!code) { this._wechatBinding = false; return; }
        wx.request({
          url: `${this.globalData.serverUrl}/api/wechat/session`,
          method: "POST",
          header: getHeaders(token),
          data: { code },
          success: (r) => {
            if (r.statusCode === 200 && r.data && r.data.bound) {
              this._wechatBound = true;
              this.globalData.wechatSubQuota = r.data.subQuota || 0;
              console.log("[Wechat] openid bound, subQuota =", r.data.subQuota);
            }
          },
          complete: () => { this._wechatBinding = false; }
        });
      },
      fail: () => { this._wechatBinding = false; }
    });
  },

  /**
   * 请求订阅消息授权（一次性订阅）：在"用户刚建完日程"这种高意愿时刻调用。
   * 模板 ID 由服务端下发（非机密），未配置时静默跳过。
   */
  requestScheduleSubscribe() {
    const token = this.globalData.agentState && this.globalData.agentState.token;
    if (!token) return;
    const doRequest = (templateId) => {
      if (!templateId) return;
      wx.requestSubscribeMessage({
        tmplIds: [templateId],
        success: (res) => {
          if (res && res[templateId] === "accept") {
            wx.request({
              url: `${this.globalData.serverUrl}/api/wechat/subscribe-grant`,
              method: "POST",
              header: getHeaders(token),
              data: { count: 1 },
              success: (r) => {
                if (r.statusCode === 200) {
                  this.globalData.wechatSubQuota = (r.data && r.data.subQuota) || 0;
                }
              }
            });
          }
        }
      });
    };
    if (this.globalData.wechatTemplateId !== undefined) {
      doRequest(this.globalData.wechatTemplateId);
      return;
    }
    wx.request({
      url: `${this.globalData.serverUrl}/api/wechat/subscribe-grant`,
      method: "GET",
      header: getHeaders(token),
      success: (r) => {
        const data = (r && r.data) || {};
        this.globalData.wechatTemplateId = data.templateConfigured ? data.templateId : null;
        doRequest(this.globalData.wechatTemplateId);
      },
      fail: () => { this.globalData.wechatTemplateId = null; }
    });
  },

  getLoginHistory() {
    try { return wx.getStorageSync("dahuang_login_history") || []; } catch (e) { return []; }
  },

  sendInstruction(instruction, successCallback, failCallback, images) {
    if (!instruction || !instruction.trim()) return;

    const now = Date.now();
    const sentImages = images && images.length ? images.slice() : [];
    const humanMsg = {
      id: `human-${now}-${Math.floor(Math.random() * 10000)}`,
      sender: "human",
      content: instruction,
      images: sentImages,
      blocks: [
        ...(instruction && instruction.trim() ? [{ type: "text", text: instruction }] : []),
        ...sentImages.map((u) => ({ type: "image", url: u })),
      ],
      timestamp: this.getTimestamp(),
      createdAt: now
    };
    this.globalData.chatHistory.push(humanMsg);
    this.triggerPageCallback("onChatHistoryUpdate");

    this.addLog("SYSTEM", `发出指令：“${instruction}”`);

    const reqId = `req-${now}-${Math.floor(Math.random() * 10000)}`;

    // Add initial pending placeholder for this request ID
    // 进度状态机：后端 agent_progress 事件流驱动（plan/step_start/step_update/step_done/heartbeat）
    const pendingMsg = {
      id: reqId,
      sender: "agent",
      isPending: true,
      command: instruction,
      content: "（智能体处理中...）",
      timestamp: this.getTimestamp(),
      createdAt: now,
      progress: 0,
      progressState: {
        phase: "understanding", // understanding → execute → synthesize
        steps: [],              // plan 事件到达后填充：{id, desc, status, durationMs, summary}
        activeStepId: "",
        lastDetail: "",
        startedAt: now,
        lastUpdateAt: now
      }
    };
    this.globalData.chatHistory.push(pendingMsg);
    this.triggerPageCallback("onChatHistoryUpdate");
    this.startPendingWatchdog();

    wx.request({
      url: `${this.globalData.serverUrl}/api/agent/command`,
      method: "POST",
      header: getHeaders(this.globalData.agentState.token),
      timeout: 240000,
      data: {
        command: instruction,
        isAsync: true,
        requestId: reqId,
        images: images && images.length ? images : undefined
      },
      success: (res) => {
        if (res.statusCode === 202 || (res.statusCode === 200 && res.data && res.data.status === "PROCESSING")) {
          this.addLog("ACTION", "元神决策法旨已投递后台，静候天道神念反馈...");
          if (successCallback) successCallback();
        } else if (res.statusCode === 200) {
          const data = res.data || {};
          this.handleAgentCommandResult({
            ...data,
            requestId: reqId,
            command: instruction,
            progress: 100
          });
          if (successCallback) successCallback();
        } else {
          const errDetail = (res.data && (res.data.error || res.data.message)) ? (res.data.error || res.data.message) : `状态码: ${res.statusCode}`;
          this.addLog("SYSTEM", `❌ 后台拒斥指令，${errDetail}`);
          this.handleAgentCommandResult({
            success: false,
            requestId: reqId,
            command: instruction,
            status: "FAILED",
            isError: true,
            reply: `❌ 法旨执行失败: ${errDetail}`,
            progress: 100,
            isPending: false
          });
          wx.showToast({
            title: `法旨未行: ${errDetail}`,
            icon: "none"
          });
          if (failCallback) failCallback(errDetail);
        }
      },
      fail: (err) => {
        const errMsg = err.errMsg || "网络连通失败";
        this.addLog("SYSTEM", `❌ 网络感应超时，无法连通大荒服务器: ${errMsg}`);
        this.handleAgentCommandResult({
          success: false,
          requestId: reqId,
          command: instruction,
          status: "FAILED",
          isError: true,
          reply: `❌ 网络连通失败: ${errMsg}`,
          progress: 100,
          isPending: false
        });
        wx.showToast({
          title: "网络连通失败",
          icon: "none"
        });
        if (failCallback) failCallback(errMsg);
      }
    });
  },

  pullOfflineNotifications(opts) {
    if (!this.globalData.agentState.token) return;
    const silent = !!(opts && opts.silent);

    if (!silent) {
      this.addLog("SYSTEM", "🔄 正在从天道同步离线神谕/定时提醒...");
    }

    wx.request({
      url: `${this.globalData.serverUrl}/api/agent/command`,
      method: "GET",
      header: getHeaders(this.globalData.agentState.token),
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.success) {
          const notifications = res.data.notifications || [];
          if (notifications.length > 0) {
            notifications.forEach(n => {
              this.handleAgentCommandResult(n);
            });
            this.addLog("SYSTEM", `✨ 成功同步 ${notifications.length} 条天道神谕提醒！`);
          }
        }
      }
    });
  },

  loadChatHistoryForAgent(agentId) {
    if (!agentId) return;
    try {
      const key = `dahuang_chat_history_${agentId}`;
      const saved = wx.getStorageSync(key);
      if (saved && Array.isArray(saved)) {
        this.globalData.chatHistory = saved.filter(Boolean).map(m => this.sanitizeMessage(m));
      }
      if (!this.globalData.chatHistory || this.globalData.chatHistory.length === 0) {
        this.globalData.chatHistory = [
          {
            id: "init-welcome",
            sender: "agent",
            content: "（天道连通）主人，大荒分身在此候命。请降下法旨！",
            timestamp: this.getTimestamp(),
            createdAt: Date.now()
          }
        ];
      }
    } catch (e) {
      console.error("[App] Failed to load chat history:", e);
      this.globalData.chatHistory = [
        {
          id: "init-welcome",
          sender: "agent",
          content: "（天道连通）主人，大荒分身在此候命。请降下法旨！",
          timestamp: this.getTimestamp(),
          createdAt: Date.now()
        }
      ];
    }
  },

  saveChatHistory() {
    const agentId = this.globalData.agentState.id;
    if (!agentId) return;
    try {
      this.trimChatHistory();
      const key = `dahuang_chat_history_${agentId}`;
      // 落盘前剥掉派生字段：richContent/segments/psDisplay/chartsOrdered/unplacedCharts
      // 都可由 content/charts 重建；不剥的话十几条长表格回复就会逼近 1MB 单键上限
      const slim = this.globalData.chatHistory.map((m) => {
        const { richContent, segments, psDisplay, chartsOrdered, unplacedCharts, ...rest } = m || {};
        return rest;
      });
      try {
        wx.setStorageSync(key, slim);
      } catch (e) {
        // 超限降级：只保留最近一半再试一次；再失败则只保留最近 10 条
        console.warn("[App] Chat history storage full, retrying with half:", e);
        try {
          wx.setStorageSync(key, slim.slice(Math.floor(slim.length / 2)));
        } catch (e2) {
          wx.setStorageSync(key, slim.slice(-10));
          this.addLog("SYSTEM", "⚠️ 本地存储空间不足：历史对话已压缩为最近 10 条。");
        }
      }
    } catch (e) {
      console.error("[App] Failed to save chat history:", e);
    }
  },

  getTimestamp() {
    const now = new Date();
    return now.toTimeString().split(" ")[0];
  },

  triggerPageCallback(method, data) {
    const pages = getCurrentPages();
    const activePage = pages[pages.length - 1];
    if (activePage && typeof activePage[method] === "function") {
      activePage[method](data);
    }
  },

  sanitizeMessage(msg) {
    if (!msg || typeof msg !== "object") {
      return {
        id: `msg-${Date.now()}`,
        sender: "agent",
        content: "（无效消息）",
        timestamp: this.getTimestamp(),
        createdAt: Date.now()
      };
    }
    const safeMsg = { ...msg };
    if (!safeMsg.id) safeMsg.id = `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    if (!safeMsg.sender) safeMsg.sender = "agent";
    if (typeof safeMsg.content !== "string") {
      safeMsg.content = safeMsg.content ? String(safeMsg.content) : "（内容为空）";
    }
    const content = safeMsg.content;
    const { html, videoUrl, videoPoster } = this.parseRichContent(content);
    const hasRichHtml = /<[a-z][\s\S]*>/i.test(content) || content.includes("**") || content.includes("`") || content.includes("<table") || content.includes("<div") || content.includes("<p") || content.includes("<badge") || content.includes("<card") || content.includes("<blockquote") || content.includes("<span");

    // 图表优先用消息自带的结构化 charts 字段（服务端已把数据块从正文剥离）。
    // 此前这里只看正文 <script> 块，导致"重新进入小程序后历史消息的图表全部丢失"。
    let charts = Array.isArray(safeMsg.charts) ? safeMsg.charts.slice(0, 4) : [];
    if (charts.length === 0 && typeof content === "string") {
      // 旧消息/旧通知兜底：<script type="application/dahuang-chart">JSON</script>
      const chartRe = /<script\s+type=["']application\/dahuang-chart["']>([\s\S]*?)<\/script>/gi;
      let cm;
      while ((cm = chartRe.exec(content))) {
        try {
          const spec = JSON.parse(cm[1].trim());
          if (spec && (spec.type === "line" || spec.type === "bar") &&
              Array.isArray(spec.labels) && Array.isArray(spec.series) && spec.series.length > 0) {
            charts.push(spec);
          }
        } catch (e) { /* 非法 JSON 忽略，仅文本显示 */ }
      }
      if (charts.length > 4) charts.length = 4; // 单条消息最多 4 张图
    }

    const agentImages = this.extractImageUrls(content);
    const result = {
      ...safeMsg,
      content,
      isRich: hasRichHtml || Boolean(videoUrl),
      richContent: html,
      videoUrl,
      videoPoster,
      charts: charts.length > 0 ? charts : undefined,
      agentImages: agentImages.length > 0 ? agentImages : undefined,
    };
    if (agentImages.length > 0) this.transferAgentImages(result.id, agentImages);
    return result;
  },

  /** 从 Agent 回复中提取图片：HTML img、Markdown 图片、裸图片 URL */
  extractImageUrls(content) {
    if (!content || typeof content !== "string") return [];
    const urls = [];
    const add = (u) => {
      if (!u) return;
      const clean = String(u).trim().replace(/[),.;]+$/, "");
      if (clean && urls.indexOf(clean) === -1) urls.push(clean);
    };
    let m;
    const htmlRe = /<img[^>]+src=["']([^"']+)["']/gi;
    while ((m = htmlRe.exec(content))) add(m[1]);
    const mdRe = /!\[[^\]]*\]\(([^)\s]+)\)/g;
    while ((m = mdRe.exec(content))) add(m[1]);
    const bareRe = /(https?:\/\/[^\s"'<>]+?\.(?:png|jpe?g|gif|webp)(?:\?[^\s"'<>]*)?|\/api\/uploads\/[^\s"'<>]+)/gi;
    while ((m = bareRe.exec(content))) add(m[1]);
    return urls.slice(0, 6).map((u) => (u.startsWith("/") ? `${this.globalData.serverUrl}${u}` : u));
  },

  /** 把消息正文和图片解析成按顺序排列的 segments，实现聊天图文混排 */
  buildMessageSegments(content, images, serverUrl, explicitBlocks) {
    const base = serverUrl || this.globalData.serverUrl || "";
    const normalizeUrl = (u) => { const s = String(u || ""); return s.startsWith("/") ? `${base}${s}` : s; };
    // 新方案：有结构化 blocks 就严格按 blocks 顺序渲染，不做任何图片末尾兜底
    if (Array.isArray(explicitBlocks) && explicitBlocks.length > 0) {
      return explicitBlocks.map((b, i) => {
        if (b && b.type === "image") return { type: "image", url: normalizeUrl(b.url), index: i };
        return { type: "text", richContent: this.parseRichContent((b && b.text) || "").html, index: i };
      });
    }
    // 历史消息兜底：清掉被掏空后残留的空卡片外壳（浅色主题下会显示成一块黑框）
    const text = String(content || "")
      .replace(/<div[^>]*>\s*<\/div>/gi, "")
      .replace(/<h[1-6][^>]*>\s*<\/h[1-6]>/gi, "")
      .replace(/<div[^>]*>\s*(?:<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>)?\s*<\/div>/gi, "");
    const list = (images || []).map(normalizeUrl).filter(Boolean);

    // 先按 HTML 表格块切分（容错扫描：标签不闭合也能处理），表格交给原生渲染，
    // 这样表格能停留在正文的原始位置，也不会在浅色主题下变成一块黑框。
    const raw = this.splitTables(text);
    if (raw.length === 0) raw.push({ kind: "text", text: "" });

    const segments = [];
    raw.forEach((part) => {
      // 注意：必须统一成 type 字段——之前这里用的是 kind，
      // 导致表格段在下方分支里匹配不到，被当成"空图片"渲染成空白框
      if (part.kind === "table") { segments.push({ type: "table", table: part.table }); return; }
      if (part.kind === "text") {
        // 表格标签残留 + 孤儿 {{表格N}} 先剥掉（图表标记必须留到切分之后再剥）
        const cleaned = this.stripTableArtifacts(part.text);
        this.splitChartMarkers(cleaned).forEach((sub) => {
          if (sub.type === "chart") { segments.push(sub); return; }
          segments.push(...this.splitInlineImages(this.stripOrphanMarkers(sub.text), list, base));
        });
        return;
      }
      segments.push(part);
    });

    return segments
      .filter((seg) => seg.type !== "image" || Boolean(seg.url))
      .map((seg, i) =>
        seg.type === "table"
          ? { type: "table", table: seg.table, index: i }
          : seg.type === "chart"
            ? { type: "chart", chartIndex: seg.chartIndex, index: i }
            : seg.type === "text"
              ? { type: "text", richContent: this.parseRichContent(seg.text).html, index: i }
              : { type: "image", url: seg.url, index: i }
      );
  },

  /** 把一段文本按 {{图表N}} 标记切成 text / chart 片段（客户端据此把图表画在原文位置） */
  splitChartMarkers(text) {
    const out = [];
    const src = String(text || "");
    const re = /\{\{\s*(?:图表|chart)\s*[:：]?\s*(\d+)\s*\}\}/gi;
    let last = 0;
    let m;
    while ((m = re.exec(src))) {
      const before = src.slice(last, m.index);
      if (before) out.push({ type: "text", text: before });
      out.push({ type: "chart", chartIndex: Math.max(0, parseInt(m[1], 10) - 1) });
      last = m.index + m[0].length;
    }
    const rest = src.slice(last);
    if (rest) out.push({ type: "text", text: rest });
    return out;
  },

  /**
   * 容错表格扫描：遇到 `<table` 就往后吃到 `</table>`；**没闭合也照吃**（吃到文本结尾），
   * 解析出来就原生渲染，解析不出来就整块丢弃——绝不让 HTML 源码漏进正文。
   * 同时吸收服务端注入的卡片外壳（<div><h3>标题</h3>…</table></div>）。
   */
  splitTables(text) {
    const src = String(text || "");
    const out = [];
    const openRe = /<table\b/gi;
    let cursor = 0;
    let m;
    while ((m = openRe.exec(src))) {
      const start = m.index;
      const lower = src.toLowerCase();
      const closeIdx = lower.indexOf("</table>", start);
      const blockEnd = closeIdx === -1 ? src.length : closeIdx + 8;
      const before = src.slice(cursor, start);
      if (before) out.push({ kind: "text", text: before });

      let block = src.slice(start, blockEnd);
      // 向前吸收紧邻的卡片外壳（含可选标题），避免残留裸 <div>/<h3>
      const prev = out.length ? out[out.length - 1] : null;
      if (prev && prev.kind === "text") {
        const wm = /<div[^>]*>\s*(?:<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>\s*)?$/i.exec(prev.text);
        if (wm) {
          block = prev.text.slice(wm.index) + block;
          prev.text = prev.text.slice(0, wm.index);
          if (!prev.text) out.pop();
        }
      }
      // 向后吸收紧跟的 </div>
      let consumed = blockEnd;
      const after = src.slice(blockEnd);
      const cm = /^\s*<\/div>/.exec(after);
      if (cm) { block += cm[0]; consumed += cm[0].length; }

      const spec = this.parseTableSpec(block);
      if (spec) {
        out.push({ kind: "table", table: spec });
      } else {
        // 解析失败：退化成纯文本（保留可读内容），绝不原样输出 HTML、也不丢信息
        const text = this.stripTableArtifacts(block.replace(/<\/(?:div|h[1-6])>/gi, " "));
        if (text.trim()) out.push({ kind: "text", text });
      }

      cursor = consumed;
      openRe.lastIndex = cursor;
    }
    const tail = src.slice(cursor);
    if (tail) out.push({ kind: "text", text: tail });
    return out;
  },

  /** 剥掉表格类标签残留与孤儿 {{表格N}} 标记（宁可少显示，也不把 HTML 当正文） */
  stripTableArtifacts(text) {
    return String(text || "")
      .replace(/<\/?(?:table|thead|tbody|tfoot|tr|td|th|colgroup|col|caption)\b[^>]*>/gi, "")
      .replace(/\{\{\s*(?:表格|table)[^}]*\}\}/gi, "");
  },

  /** 剥掉没有对应图表的孤儿标记 */
  stripOrphanMarkers(text) {
    return String(text || "").replace(/\{\{\s*(?:图表|chart)[^}]*\}\}/gi, "");
  },

  /** 画布 ID：与消息 ID 绑定，绘制时按 ID 精确查询，不依赖 DOM 顺序 */
  chartCanvasId(msgId, slot) {
    const safe = String(msgId || "msg").replace(/[^A-Za-z0-9_-]/g, "_");
    return `cc-${safe}-${slot}`;
  },

  /**
   * 图表槽位分配：把 {{图表N}} 标记命中的图表留在原文位置（按出现顺序编号），
   * 没有被标记的图表追加到末尾。DOM 顺序与 chartsOrdered 一致，绘制逻辑无需改动。
   */
  buildChartLayout(charts, segments, msgId, noInlineMap) {
    const list = Array.isArray(charts) ? charts : [];
    // 保险丝：某条消息的内联画布画不出来（尺寸始终为 0）时，
    // 自动回退到"末尾渲染"这条已验证可用的路径，保证图表一定看得见
    const noInline = Boolean(msgId && noInlineMap && noInlineMap[msgId]);
    const placed = new Set();
    const ordered = [];
    const kept = [];
    (segments || []).forEach((seg) => {
      if (!seg || seg.type !== "chart") { kept.push(seg); return; }
      if (noInline) return; // 丢弃该图表段 → 全部落到 unplacedCharts，在末尾渲染
      const idx = seg.chartIndex;
      // 标记没有对应图表（模型多写了标记 / 图表交付失败）：
      // 直接丢弃该段——否则会渲染成一块永远画不上东西的空白画布
      if (!(idx >= 0) || idx >= list.length || placed.has(idx)) return;
      placed.add(idx);
      seg.chartSlot = ordered.length;
      seg.chartSpec = list[idx];
      seg.canvasId = this.chartCanvasId(msgId, seg.chartSlot);
      ordered.push(list[idx]);
      kept.push(seg);
    });
    const unplacedCharts = [];
    list.forEach((spec, i) => {
      if (placed.has(i)) return;
      const slot = ordered.length;
      unplacedCharts.push({ slot, spec, canvasId: this.chartCanvasId(msgId, slot) });
      ordered.push(spec);
    });
    return { chartsOrdered: ordered, unplacedCharts, segments: kept };
  },

  /** 把一段纯文本按内联图片标记切成 text / image 片段 */
  splitInlineImages(text, list, base) {
    const out = [];
    // 内联图片：Markdown、[图N]、<img>、绝对 http(s) 链接，以及平台相对路径（/api/uploads/x.jpg，允许被反引号包裹）
    const re = /!\[[^\]]*\]\(([^)\s]+)\)|\[图\s*(\d+)\]|<img[^>]+src=["']([^"']+)["']|`?((?:https?:\/\/|\/)[^\s"'<>`]*?\.(?:png|jpe?g|gif|webp)(?:\?[^\s"'<>`]*)?)`?/gi;
    let last = 0;
    let m;
    const src = String(text || "");
    while ((m = re.exec(src))) {
      const before = src.slice(last, m.index);
      if (before.trim()) out.push({ type: "text", text: before });
      let url = m[1] || m[3] || m[4];
      if (m[2]) url = list[parseInt(m[2], 10) - 1];
      if (url) {
        const u = String(url);
        out.push({ type: "image", url: u.startsWith("/") ? `${base}${u}` : u });
      }
      last = m.index + m[0].length;
    }
    const rest = src.slice(last);
    if (rest.trim()) out.push({ type: "text", text: rest });
    return out;
  },

  /** 去掉 HTML 标签，保留可读文本 */
  stripHtmlTags(html) {
    return String(html || "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  },

  /** HTML 表格 → 结构化数据（客户端原生表格视图渲染） */
  parseTableSpec(block) {
    const titleMatch = /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(block);
    const title = titleMatch ? this.stripHtmlTags(titleMatch[1]) : "";
    const headers = [];
    const rows = [];
    const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let tr;
    while ((tr = trRe.exec(block))) {
      const cells = [];
      const cellRe = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
      let c;
      while ((c = cellRe.exec(tr[1]))) cells.push(this.stripHtmlTags(c[2]));
      if (cells.length === 0) continue;
      if (headers.length === 0) headers.push(...cells);
      else rows.push(cells);
    }
    if (headers.length === 0 || rows.length === 0) return null;
    const cols = headers.length;
    return {
      title,
      headers: headers.map((t, i) => ({ i, text: t })),
      rows: rows.slice(0, 40).map((r, ri) => ({
        ri,
        cells: Array.from({ length: cols }, (_, i) => ({ i, text: r[i] === undefined || r[i] === null ? "" : String(r[i]) }))
      }))
    };
  },

  /** 外链图片先转存到平台，避免小程序域名白名单导致显示失败 */
  transferAgentImages(msgId, urls) {
    const serverUrl = this.globalData.serverUrl || "";
    const external = (urls || []).filter((u) => /^https?:\/\//.test(u) && u.indexOf(serverUrl) !== 0);
    if (external.length === 0) return;
    this._imageTransferring = this._imageTransferring || {};
    if (this._imageTransferring[msgId]) return;
    this._imageTransferring[msgId] = true;
    const token = this.globalData.agentState && this.globalData.agentState.token;
    const mapping = {};
    let pending = external.length;
    external.forEach((url) => {
      wx.request({
        url: `${serverUrl}/api/agent/image/transfer`,
        method: "POST",
        header: getHeaders(token),
        data: { url },
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.url) {
            mapping[url] = `${serverUrl}${res.data.url}`;
          }
        },
        complete: () => {
          pending -= 1;
          if (pending > 0) return;
          const msg = (this.globalData.chatHistory || []).find((x) => x.id === msgId);
          if (msg && msg.agentImages) {
            msg.agentImages = msg.agentImages.map((u) => mapping[u] || u);
            this.saveChatHistory();
            this.triggerPageCallback("onChatHistoryUpdate");
          }
          delete this._imageTransferring[msgId];
        }
      });
    });
  },

  parseRichContent(content) {
    if (!content) return { html: "", videoUrl: "", videoPoster: "" };

    let html = content;

    // 单层反转义：一次遍历只还原一层实体。双重转义内容（&amp;lt;script&amp;gt;）
    // 保持转义态、不会还原成真实标签（防 HTML 注入；此前多轮循环会层层还原）
    html = html.replace(/&(amp|lt|gt|quot|#0?39|apos);/gi, (m0, name) => {
      switch (String(name).toLowerCase()) {
        case "amp": return "&";
        case "lt": return "<";
        case "gt": return ">";
        case "quot": return '"';
        default: return "'";
      }
    });

    html = html
      .replace(/```html/gi, "")
      .replace(/```xml/gi, "")
      .replace(/```/g, "");

    html = html.replace(/<body([^>]*)>/gi, (_, attrs) => {
      let existingStyle = "";
      let styleMatch = attrs.match(/style=["']([^"']*)["']/i);
      if (styleMatch) {
        existingStyle = styleMatch[1].trim();
        if (existingStyle && !existingStyle.endsWith(";")) existingStyle += ";";
      }
      let cleanedAttrs = attrs.replace(/style=["']([^"']*)["']/gi, "");
      return `<div class="html-body-wrapper" style="border-radius: 8px; margin: 8px 0; overflow: hidden; ${existingStyle}" ${cleanedAttrs}>`;
    });
    html = html.replace(/<\/body>/gi, "</div>");

    html = html
      .replace(/<!DOCTYPE[^>]*>/gi, "")
      .replace(/<\/?html[^>]*>/gi, "")
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
      .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "")
      .replace(/<meta[^>]*>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      // 图表数据块与 SVG：分别交给 Canvas 绘制 / 剥离（rich-text 不支持）
      .replace(/<script\s+type=["']application\/dahuang-chart["']>[\s\S]*?<\/script>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "");

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #d97706; font-weight: bold;">$1</strong>');
    // 未配对的 **（模型偶尔输出不闭合的加粗）直接清掉，不残留原始符号
    html = html.replace(/\*\*/g, "");
    html = html.replace(/`(.*?)`/g, '<code style="background: rgba(158,42,43, 0.06); color: #9e2a2b; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 22rpx; border: 1px solid rgba(158,42,43, 0.15);">$1</code>');
    // Markdown 无序列表（行首 - / * / +）→ 圆点列表：视觉/推理模型回复常用 MD 列表，
    // 不转换会原样显示 "- xxx" / "* xxx" 的原始符号
    html = html.replace(/^(\s*)[-*+]\s+/gm, "$1• ");

    // 纯文本换行：未包含块级标签时，把 \n 转为 <br/>，避免文字挤成一行
    if (html.indexOf("<div") === -1 && html.indexOf("<p") === -1 && html.indexOf("<br") === -1 && html.indexOf("<table") === -1) {
      html = html.split("\n").join("<br/>");
    }

    return { html, videoUrl: "", videoPoster: "" };
  }
});
