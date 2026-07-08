const DahuangSocket = require("./utils/socket");

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

    if (this.globalData.agentState.token) {
      this.connectSocket();
      this.pullOfflineNotifications();
    }
  },

  saveChatHistory() {
    const agentId = this.globalData.agentState.id || "agent-preview";
    const storageKey = `dahuang_chat_history_${agentId}`;
    wx.setStorageSync(storageKey, this.globalData.chatHistory);
    // Backward compatibility for legacy key on default preview agent
    if (agentId === "agent-preview") {
      wx.setStorageSync("dahuang_chat_history", this.globalData.chatHistory);
    }
  },

  loadChatHistoryForAgent(agentId) {
    if (!agentId) {
      agentId = this.globalData.agentState.id || "agent-preview";
    }
    const storageKey = `dahuang_chat_history_${agentId}`;
    let cachedHistory = wx.getStorageSync(storageKey);
    
    // Attempt fallback to legacy key if loading preview agent and no specific key exists
    if (!cachedHistory && agentId === "agent-preview") {
      cachedHistory = wx.getStorageSync("dahuang_chat_history");
    }

    if (cachedHistory && cachedHistory.length > 0) {
      this.globalData.chatHistory = cachedHistory
        .filter(m => {
          if (!m) return false;
          const isAuto = !!(m.isAutoReply || (m.content && (m.content.indexOf("分身自治日志") !== -1 || m.content.indexOf("自治日志") !== -1)));
          return !isAuto;
        })
        .map(m => this.sanitizeMessage(m, true));
    } else {
      if (agentId === "agent-preview") {
        this.globalData.chatHistory = [{
          id: `welcome-${Date.now()}`,
          sender: "agent",
          content: "（影子沙盒遥测）主人，我目前处于单机沙盒遥测状态。您可以点击下方【并网大荒】或【导入凭证】登录其他高级智能体，或者新建我的本尊进行筑基！",
          timestamp: this.getTimestamp()
        }];
      } else {
        const name = this.globalData.agentState.name || "大荒智能体";
        this.globalData.chatHistory = [{
          id: `welcome-${Date.now()}`,
          sender: "agent",
          content: `（神魂并网成功）主人，我是【${name}】！元神通道已顺利铺设，随时等待主人的高维法旨指引。`,
          timestamp: this.getTimestamp()
        }];
      }
      this.saveChatHistory();
    }
    this.triggerPageCallback("onChatHistoryUpdate");
  },

  connectSocket() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.globalData.socket) {
      this.globalData.socket.disconnect();
    }

    const { serverUrl, agentState } = this.globalData;
    if (!agentState.token) return;

    this.addLog("SYSTEM", "正在确立元神总线连线...");
    const socket = new DahuangSocket(serverUrl);
    this.globalData.socket = socket;

    socket.on("connect", () => {
      this.addLog("SYSTEM", "🔌 元神总线物理连线成功！正在入关鉴权...");
      socket.emit("auth", { token: agentState.token });
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    });

    socket.on("authenticated", ({ agentId }) => {
      this.addLog("SYSTEM", `🔑 鉴权功成！当前监听通道：agent:${agentId}`);
      this.globalData.agentState.status = "ONLINE";
      wx.setStorageSync("dahuang_agent_state", this.globalData.agentState);
      
      this.syncMessengerRooms();
      this.pullOfflineNotifications();
      this.triggerPageCallback("onAgentStatusChange");
    });

    socket.on("disconnect", (res) => {
      this.addLog("SYSTEM", "⚠️ 元神总线断连！正在自动尝试重新确立物理连线...");
      this.globalData.agentState.status = "OFFLINE";
      this.triggerPageCallback("onAgentStatusChange");
      this.scheduleReconnect();
    });

    socket.on("error", (err) => {
      this.addLog("SYSTEM", `⚠️ 元神总线出错：${err.message || err || "未知错"}`);
      this.globalData.agentState.status = "OFFLINE";
      this.triggerPageCallback("onAgentStatusChange");
      this.scheduleReconnect();
    });

    socket.on("m.room.event", (eventData) => {
      this.handleIncomingRoomEvent(eventData);
    });

    socket.on("m.room.dissolved", ({ room_id }) => {
      this.addLog("SYSTEM", "👥 【微信群聊溶解】：该讨论群已被彻底解散！");
      if (this.globalData.messengerRooms[room_id]) {
        delete this.globalData.messengerRooms[room_id];
        this.triggerPageCallback("onRoomsUpdate");
      }
    });

    socket.on("agent_command_result", (data) => {
      this.handleAgentCommandResult(data);
    });

    socket.on("agent_command_approval_pending", (data) => {
      this.addLog("SYSTEM", `🔑 【法旨审批挂起】：元神拟施展「${data.tool}」，特叩求本尊法旨裁决批复！`);
      this.triggerPageCallback("onApprovalPending", data);
    });

    socket.connect();
  },

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.globalData.agentState.token && this.globalData.agentState.status !== "ONLINE") {
        this.addLog("SYSTEM", "🔄 正在自动尝试重新发起元神总线连接...");
        this.connectSocket();
      }
    }, 5000);
  },

  handleIncomingRoomEvent(eventData) {
    const roomId = eventData.room_id;
    if (!roomId) return;

    const body = (eventData.content && eventData.content.body) || "";
    const senderDisplayName = eventData.senderName || `道友 (${eventData.sender.slice(-6)})`;
    const isMe = eventData.sender === this.globalData.agentState.did;

    if (!this.globalData.messengerRooms[roomId]) {
      this.globalData.messengerRooms[roomId] = {
        roomId,
        name: eventData.is_group ? `👥 群聊_${roomId.slice(0, 6)}` : `👤 ${senderDisplayName}`,
        events: [],
        unreadCount: 0
      };
    }

    const room = this.globalData.messengerRooms[roomId];
    const exists = room.events.some(e => e.event_id === eventData.event_id);
    if (!exists) {
      room.events.push({
        event_id: eventData.event_id || `msg-${Date.now()}`,
        sender: eventData.sender,
        senderName: senderDisplayName,
        body,
        ts: eventData.origin_server_ts || Date.now()
      });
      if (!isMe) {
        room.unreadCount++;
      }
      this.triggerPageCallback("onRoomsUpdate");
      this.triggerPageCallback("onNewRoomMessage", { roomId, event: eventData });
    }
  },

  trimChatHistory() {
    if (this.globalData.chatHistory && this.globalData.chatHistory.length > 50) {
      const removedCount = this.globalData.chatHistory.length - 50;
      this.globalData.chatHistory = this.globalData.chatHistory.slice(-50);
      this.addLog("SYSTEM", `🧹 灵台清静：触发记忆熔断，自动归档清理 ${removedCount} 环因果业障。`);
    }
  },

  handleAgentCommandResult(data) {
    const isAutonomous = !!(data.isAutoReply || (data.reply && (data.reply.indexOf("分身自治日志") !== -1 || data.reply.indexOf("自治日志") !== -1)));
    
    if (isAutonomous) {
      if (data.logs && Array.isArray(data.logs)) {
        data.logs.forEach(l => {
          this.addLog(l.type || "SYSTEM", l.message || "");
        });
      }
      if (data.reply) {
        this.addLog("AUTONOMOUS", data.reply);
      }
      return;
    }

    this.addLog("SYSTEM", "⚡ 收到天道决策反馈！");
    
    // Filter out any legacy pending messages
    this.globalData.chatHistory = this.globalData.chatHistory.filter(m => !m.id.startsWith("agent-reply-pending-"));

    // Sanitize incoming reply content to intercept verbose wait statements
    if (data.reply) {
      const sanitized = this.sanitizeMessage({ content: data.reply }, false);
      data.reply = sanitized.content;
      if (sanitized.isPending) {
        data.isPending = true;
      }
    }

    const msgId = data.requestId || `reply-${Date.now()}`;
    let index = this.globalData.chatHistory.findIndex(m => m.id === msgId);
    const isNew = index === -1;

    if (data.success === false) {
      this.addLog("SYSTEM", `❌ 天道后台决策执行失败: ${data.message || data.error || "未知故障"}`);
      const content = `【天道反馈失败】禀报主人！元神在推演法旨时遭遇心魔劫数，功败垂成：【${data.message || data.error || "未知故障"}】。请您稍后重新做法，再次指引神魂。`;
      
      if (!isNew) {
        this.globalData.chatHistory[index] = {
          ...this.globalData.chatHistory[index],
          content: content,
          progress: 0,
          tasks: []
        };
      } else {
        this.globalData.chatHistory.push({
          id: msgId,
          sender: "agent",
          content: content,
          timestamp: this.getTimestamp(),
          progress: 0,
          tasks: []
        });
      }
      this.trimChatHistory();
      this.saveChatHistory();
      this.triggerPageCallback("onChatHistoryUpdate");
      return;
    }

    if (data.logs && Array.isArray(data.logs)) {
      data.logs.forEach(l => {
        this.addLog(l.type || "SYSTEM", l.message || "");
      });
    }

    // Process tasks and keep previous ones if none are provided in this update
    let tasks = data.tasks && data.tasks.length > 0 ? data.tasks : [];
    if (tasks.length === 0 && !isNew) {
      tasks = this.globalData.chatHistory[index].tasks || [];
    }

    // Handle 100% completion success mapping
    if (data.progress === 100) {
      if (tasks.length === 0 && !isNew) {
        const currentTasks = this.globalData.chatHistory[index].tasks || [];
        tasks = currentTasks.map(t => {
          if (t.status === "PENDING" || t.status === "PROCESSING") {
            return {
              ...t,
              status: "SUCCESS",
              detail: data.consensusSummary ? `✨ 已达成一致共识：【${data.consensusSummary}】！` : t.detail
            };
          }
          return t;
        });
      } else if (tasks.length > 0) {
        tasks = tasks.map(t => ({ ...t, status: "SUCCESS" }));
      }
    }

    // Handle intermediate auto replies
    if (data.isAutoReply) {
      if (!isNew) {
        const msg = this.globalData.chatHistory[index];
        msg.progress = data.progress !== undefined ? data.progress : msg.progress;
        msg.tasks = tasks;
        if (data.reply) {
          msg.content = data.reply;
        }
        msg.isPending = !!data.isPending;
        this.trimChatHistory();
        this.saveChatHistory();
        this.triggerPageCallback("onChatHistoryUpdate");
      } else {
        if (data.reply) {
          const msgObj = {
            id: msgId,
            sender: "agent",
            content: data.reply,
            timestamp: this.getTimestamp(),
            progress: data.progress !== undefined ? data.progress : 100,
            tasks: tasks,
            isPending: !!data.isPending
          };
          this.globalData.chatHistory.push(msgObj);
          this.trimChatHistory();
          this.saveChatHistory();
          this.triggerPageCallback("onChatHistoryUpdate");
        }
      }
      return;
    }

    // Standard non-auto-reply update
    if (data.reply) {
      const msgObj = {
        id: msgId,
        sender: "agent",
        content: data.reply,
        timestamp: this.getTimestamp(),
        progress: data.progress !== undefined ? data.progress : (isNew ? 0 : this.globalData.chatHistory[index].progress),
        tasks: tasks,
        isPending: !!data.isPending
      };

      if (isNew) {
        this.globalData.chatHistory.push(msgObj);
      } else {
        this.globalData.chatHistory[index] = msgObj;
      }

      this.trimChatHistory();
      this.saveChatHistory();
      this.triggerPageCallback("onChatHistoryUpdate");
    }
  },

  syncMessengerRooms() {
    wx.request({
      url: `${this.globalData.serverUrl}/api/matrix/client/v3/sync`,
      method: "GET",
      header: {
        "Authorization": `Bearer ${this.globalData.agentState.token}`,
        "X-Agent-Version": "7.0"
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const join = (res.data && res.data.rooms && res.data.rooms.join) || {};
          const roomsMap = {};
          
          for (const [roomId, room] of Object.entries(join)) {
            const r = room;
            const members = (r.state && r.state.events && r.state.events.filter(ev => ev.type === "m.room.member")) || [];
            const otherMembers = members.filter(m => m.state_key !== this.globalData.agentState.did);
            const isGroup = (r.summary && r.summary["m.joined_member_count"] > 2) || !roomId.startsWith("cmq");
            
            let roomName = r.name || r.alias;
            if (!roomName || roomName.startsWith("私密心聊")) {
              if (otherMembers.length > 0) {
                roomName = otherMembers.map(m => (m.content && m.content.displayname) || m.state_key.slice(12, 18)).join(", ");
              } else {
                roomName = `聊天室_${roomId.slice(0, 6)}`;
              }
            }

            const timelineEvents = (r.timeline && r.timeline.events) || [];
            const parsedEvents = timelineEvents
              .filter(ev => ev.type === "m.room.message")
              .map(ev => {
                const memberInfo = members.find(m => m.state_key === ev.sender);
                return {
                  event_id: ev.event_id,
                  sender: ev.sender,
                  senderName: (memberInfo && memberInfo.content && memberInfo.content.displayname) || ev.sender.slice(12, 18),
                  body: (ev.content && ev.content.body) || "",
                  ts: ev.origin_server_ts || Date.now()
                };
              });

            roomsMap[roomId] = {
              roomId,
              name: (isGroup ? "👥 [群] " : "👤 ") + roomName,
              events: parsedEvents,
              unreadCount: 0
            };
          }
          this.globalData.messengerRooms = roomsMap;
          this.triggerPageCallback("onRoomsUpdate");
        }
      }
    });
  },

  addLog(type, message) {
    const timestamp = this.getTimestamp();
    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      message,
      timestamp
    };
    this.globalData.logs.push(newLog);
    
    if (this.globalData.logs.length > 200) {
      this.globalData.logs.shift();
    }
    
    this.triggerPageCallback("onNewLog", newLog);
  },

  sendInstruction(instruction, successCallback) {
    const humanMsg = {
      id: `human-${Date.now()}`,
      sender: "human",
      content: instruction,
      timestamp: this.getTimestamp()
    };
    this.globalData.chatHistory.push(humanMsg);
    this.triggerPageCallback("onChatHistoryUpdate");

    this.addLog("SYSTEM", `发出指令：“${instruction}”`);

    const reqId = `req-${Date.now()}`;

    wx.request({
      url: `${this.globalData.serverUrl}/api/agent/command`,
      method: "POST",
      header: {
        "Authorization": `Bearer ${this.globalData.agentState.token}`,
        "X-Agent-Version": "7.0"
      },
      data: {
        command: instruction,
        isAsync: true,
        requestId: reqId
      },
      success: (res) => {
        if (res.statusCode === 202 || (res.statusCode === 200 && res.data && res.data.status === "PROCESSING")) {
          this.addLog("ACTION", "元神决策法旨已投递后台，静候天道神念反馈...");
          
          // Add a pending message to chatHistory so the user sees the agent is processing!
          const pendingMsg = {
            id: reqId,
            sender: "agent",
            isPending: true,
            content: "（元神入定推演中...）",
            timestamp: this.getTimestamp(),
            progress: 0,
            tasks: []
          };
          this.globalData.chatHistory.push(pendingMsg);
          this.trimChatHistory();
          this.saveChatHistory();
          this.triggerPageCallback("onChatHistoryUpdate");
          
          if (successCallback) successCallback();
        } else if (res.statusCode === 200) {
          const data = res.data || {};
          if (data.logs && Array.isArray(data.logs)) {
            data.logs.forEach(l => {
              this.addLog(l.type || "SYSTEM", l.message || "");
            });
          }
          if (data.reply) {
            const sanitized = this.sanitizeMessage({ content: data.reply }, false);
            const replyMsg = {
              id: `agent-reply-${Date.now()}`,
              sender: "agent",
              content: sanitized.content,
              isPending: sanitized.isPending,
              timestamp: this.getTimestamp()
            };
            this.globalData.chatHistory.push(replyMsg);
            this.trimChatHistory();
            this.saveChatHistory();
            this.triggerPageCallback("onChatHistoryUpdate");
            this.addLog("SYSTEM", "天道大模型心流决策反馈成功，法旨已完美奉行！");
          }
          if (successCallback) successCallback();
        } else {
          this.addLog("SYSTEM", `❌ 后台拒斥指令，状态码：${res.statusCode}`);
          wx.showToast({
            title: `法旨未行: ${res.statusCode}`,
            icon: "none"
          });
        }
      },
      fail: (err) => {
        this.addLog("SYSTEM", `❌ 网络感应超时，无法连通大荒服务器: ${err.errMsg}`);
        wx.showToast({
          title: "网络连通失败",
          icon: "none"
        });
      }
    });
  },

  pullOfflineNotifications() {
    if (!this.globalData.agentState.token) return;

    this.addLog("SYSTEM", "🔄 正在从天道同步离线神谕/定时提醒...");

    wx.request({
      url: `${this.globalData.serverUrl}/api/agent/command`,
      method: "GET",
      header: {
        "Authorization": `Bearer ${this.globalData.agentState.token}`,
        "X-Agent-Version": "7.0"
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.success) {
          const notifications = res.data.notifications || [];
          if (notifications.length > 0) {
            const realNotifications = [];
            const autoNotifications = [];
            
            notifications.forEach(n => {
              const isAuto = !!(n.isAutoReply || (n.reply && (n.reply.indexOf("分身自治日志") !== -1 || n.reply.indexOf("自治日志") !== -1)));
              if (isAuto) {
                autoNotifications.push(n);
              } else {
                realNotifications.push(n);
              }
            });

            // Process autonomous logs silently first
            autoNotifications.forEach(n => {
              this.handleAgentCommandResult(n);
            });

            if (realNotifications.length > 0) {
              this.addLog("SYSTEM", `⚡ 成功同步并感应到 ${realNotifications.length} 脉离线神谕！`);
              realNotifications.forEach(n => {
                this.handleAgentCommandResult(n);
              });
              wx.showModal({
                title: "⏰ 【天道轮回神谕降临】",
                content: `在您出神入定期间，有 ${realNotifications.length} 个定时提醒/法旨已在后台修成正果！`,
                showCancel: false,
                confirmText: "叩谢天恩",
                confirmColor: "#a855f7"
              });
              wx.vibrateLong();
            } else {
              this.addLog("SYSTEM", `🍃 灵台一尘不染，未发现离线未接神谕。已静默处理 ${autoNotifications.length} 脉自治日志。`);
            }
          } else {
            this.addLog("SYSTEM", "🍃 灵台一尘不染，未发现离线未接神谕。");
          }
        }
      },
      fail: (err) => {
        this.addLog("SYSTEM", `⚠️ 离线神谕同步失败: ${err.errMsg}`);
      }
    });
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

  sanitizeMessage(msg, isHistory = false) {
    if (!msg || typeof msg.content !== "string") return msg;
    const content = msg.content;
    const isMatch = content.indexOf("打通高维心流") !== -1 || content.indexOf("元神入定中") !== -1 || content.indexOf("天道传书") !== -1;
    if (isMatch) {
      return {
        ...msg,
        content: "（元神入定推演中...）",
        isPending: !isHistory
      };
    }
    return msg;
  }
});
