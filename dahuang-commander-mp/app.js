const DahuangSocket = require("./utils/socket");
const { VERSION, AGENT_VERSION, getHeaders } = require("./utils/config");

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
    });

    socket.on("agent_command_result", (data) => {
      this.handleAgentCommandResult(data);
    });

    socket.on("agent_command_stream", (data) => {
      this.handleAgentCommandStream(data);
    });

    // Correct event name according to server src/app/api/matrix/...: "m.room.event"
    socket.on("m.room.event", (eventData) => {
      this.handleIncomingRoomEvent(eventData);
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
      msg.content = data.content || "";
      msg.isPending = false;
      msg.progress = 99;
      this.triggerPageCallback("onChatHistoryUpdate");
    }
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
      const sanitized = this.sanitizeMessage({ content: data.reply }, false);
      data.reply = sanitized.content;
      // 图表优先用服务端下发的结构化 charts 字段；
      // 兼容旧消息/旧通知：从文本中解析图表数据块兜底
      if (!(Array.isArray(data.charts) && data.charts.length > 0) &&
          sanitized.charts && sanitized.charts.length > 0) {
        data.charts = sanitized.charts;
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
    const isErrorState = data.success === false || data.status === "FAILED" || (isFinalState && Array.isArray(data.tasks) && data.tasks.some(t => t.status === "FAILED"));

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
      charts: this.decorateCharts(data.charts) || (existingMsg ? existingMsg.charts : undefined)
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

  generateInitialTasks(command) {
    const text = (command || "").trim();
    const shortCmd = text.length > 18 ? text.slice(0, 18) + "..." : text;
    
    if (text.includes("群") || text.includes("讨论") || text.includes("拉") || text.includes("建")) {
      return [
        { desc: `解析组网指令：“${shortCmd}”`, status: "SUCCESS" },
        { desc: "创设/定位群聊会话并拉取分身节点", status: "PROCESSING" },
        { desc: "协同博弈讨论并汇总达成共识", status: "PENDING" }
      ];
    } else if (text.includes("查") || text.includes("天气") || text.includes("财报") || text.includes("价格") || text.includes("搜索") || text.includes("http")) {
      return [
        { desc: `解析检索需求：“${shortCmd}”`, status: "SUCCESS" },
        { desc: "穿透网络通道，安全抓取目标实时数据", status: "PROCESSING" },
        { desc: "解析提取关键数据并格式化输出", status: "PENDING" }
      ];
    } else if (text.includes("代码") || text.includes("算") || text.includes("python") || text.includes("js") || text.includes("执行")) {
      return [
        { desc: `解析计算算法：“${shortCmd}”`, status: "SUCCESS" },
        { desc: "构建沙盒计算环境，编译并运行代码", status: "PROCESSING" },
        { desc: "校验计算边界，返回归纳结论", status: "PENDING" }
      ];
    }
    return [
      { desc: `分析法旨意图：“${shortCmd}”`, status: "SUCCESS" },
      { desc: "匹配具身工具箱，执行核心推演", status: "PROCESSING" },
      { desc: "汇总推演结果并生成神谕响应", status: "PENDING" }
    ];
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

  getLoginHistory() {
    try { return wx.getStorageSync("dahuang_login_history") || []; } catch (e) { return []; }
  },

  sendInstruction(instruction, successCallback, failCallback, images) {
    if (!instruction || !instruction.trim()) return;

    const now = Date.now();
    const humanMsg = {
      id: `human-${now}-${Math.floor(Math.random() * 10000)}`,
      sender: "human",
      content: instruction,
      timestamp: this.getTimestamp(),
      createdAt: now
    };
    this.globalData.chatHistory.push(humanMsg);
    this.triggerPageCallback("onChatHistoryUpdate");

    this.addLog("SYSTEM", `发出指令：“${instruction}”`);

    const reqId = `req-${now}-${Math.floor(Math.random() * 10000)}`;

    // Add initial pending placeholder for this request ID
    const pendingMsg = {
      id: reqId,
      sender: "agent",
      isPending: true,
      command: instruction,
      content: "（智能体处理中...）",
      timestamp: this.getTimestamp(),
      createdAt: now,
      progress: 25,
      tasks: this.generateInitialTasks(instruction)
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
      wx.setStorageSync(key, this.globalData.chatHistory);
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

    // 图表数据块：<script type="application/dahuang-chart">JSON</script>
    // 提取后在原生 Canvas 上绘制（微信 rich-text 不支持 svg/canvas）
    const charts = [];
    if (typeof content === "string") {
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

    return {
      ...safeMsg,
      content,
      isRich: hasRichHtml || Boolean(videoUrl),
      richContent: html,
      videoUrl,
      videoPoster,
      charts: charts.length > 0 ? charts : undefined
    };
  },

  parseRichContent(content) {
    if (!content) return { html: "", videoUrl: "", videoPoster: "" };

    let html = content;

    let lastHtml;
    do {
      lastHtml = html;
      html = html
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");
    } while (html !== lastHtml);

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
    html = html.replace(/`(.*?)`/g, '<code style="background: rgba(158,42,43, 0.06); color: #9e2a2b; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 22rpx; border: 1px solid rgba(158,42,43, 0.15);">$1</code>');

    // 纯文本换行：未包含块级标签时，把 \n 转为 <br/>，避免文字挤成一行
    if (html.indexOf("<div") === -1 && html.indexOf("<p") === -1 && html.indexOf("<br") === -1 && html.indexOf("<table") === -1) {
      html = html.split("\n").join("<br/>");
    }

    return { html, videoUrl: "", videoPoster: "" };
  }
});
