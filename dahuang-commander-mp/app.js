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
    console.log("===我是分身微信小程序 v1.4.1 (修补 HTML 重复 style 属性) ===");
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
          const isAuto = !!(
            m.isAutoReply || 
            m.isAutoReply === "true" ||
            (m.id && (m.id.startsWith("cron-") || m.id.startsWith("auto-") || m.id.startsWith("bg-"))) ||
            (m.content && (
              m.content.indexOf("分身自治") !== -1 ||
              m.content.indexOf("自治提示") !== -1 ||
              m.content.indexOf("自治日志") !== -1 ||
              m.content.indexOf("自治") !== -1 ||
              m.content.indexOf("代管") !== -1 ||
              m.content.indexOf("群聊") !== -1 ||
              m.content.indexOf("信使传音") !== -1
            ))
          );
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
    const isAutonomous = !!(
      data.isAutoReply || 
      data.isAutoReply === "true" ||
      (data.requestId && (data.requestId.startsWith("cron-") || data.requestId.startsWith("auto-") || data.requestId.startsWith("bg-"))) ||
      (data.reply && (
        data.reply.indexOf("分身自治") !== -1 ||
        data.reply.indexOf("自治提示") !== -1 ||
        data.reply.indexOf("自治日志") !== -1 ||
        data.reply.indexOf("自治") !== -1 ||
        data.reply.indexOf("代管") !== -1 ||
        data.reply.indexOf("群聊") !== -1 ||
        data.reply.indexOf("信使传音") !== -1
      ))
    );
    
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
              const isAuto = !!(
                n.isAutoReply || 
                n.isAutoReply === "true" ||
                (n.requestId && (n.requestId.startsWith("cron-") || n.requestId.startsWith("auto-") || n.requestId.startsWith("bg-"))) ||
                (n.reply && (
                  n.reply.indexOf("分身自治") !== -1 ||
                  n.reply.indexOf("自治提示") !== -1 ||
                  n.reply.indexOf("自治日志") !== -1 ||
                  n.reply.indexOf("自治") !== -1 ||
                  n.reply.indexOf("代管") !== -1 ||
                  n.reply.indexOf("群聊") !== -1 ||
                  n.reply.indexOf("信使传音") !== -1
                ))
              );
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
  },

  parseRichContent(content) {
    if (!content) return { html: "", videoUrl: "", videoPoster: "" };

    let html = content;

    // A. Unescape HTML entities robustly with a recursive loop (handles multiple escape layers like &amp;amp;lt;)
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

    // B. Clean up triple-backtick markdown blocks robustly
    html = html
      .replace(/```html/gi, "")
      .replace(/```xml/gi, "")
      .replace(/```/g, "");

    // C. Map <body> to <div> to retain its background, padding, and container styling without breaking rich-text
    html = html.replace(/<body([^>]*)>/gi, (_, attrs) => {
      let existingStyle = "";
      let styleMatch = attrs.match(/style=["']([^"']*)["']/i);
      if (styleMatch) {
        existingStyle = styleMatch[1].trim();
        if (existingStyle && !existingStyle.endsWith(";")) existingStyle += ";";
      }
      let cleanedAttrs = attrs.replace(/style=["']([^"']*)["']/gi, "");
      return `<div class="html-body-wrapper" style="border-radius: 12rpx; margin: 10rpx 0; overflow: hidden; ${existingStyle}" ${cleanedAttrs}>`;
    });
    html = html.replace(/<\/body>/gi, "</div>");

    // Clean up other wrapper tags that break WeChat's rich-text
    html = html
      .replace(/<!DOCTYPE[^>]*>/gi, "")
      .replace(/<\/?html[^>]*>/gi, "")
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
      .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "")
      .replace(/<meta[^>]*>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

    let videoUrl = "";
    let videoPoster = "";

    // 1. Extract video tag if any: <video src="url" poster="poster"/>
    const videoMatch = html.match(/<video[^>]+src=["']([^"']+)["'][^>]*>/i);
    if (videoMatch) {
      videoUrl = videoMatch[1];
      const posterMatch = html.match(/<video[^>]+poster=["']([^"']+)["'][^>]*>/i);
      if (posterMatch) {
        videoPoster = posterMatch[1];
      }
      // Remove video tag so it doesn't try to render inside standard rich-text which is unsupported
      html = html.replace(/<video[^>]*>([\s\S]*?<\/video>)?/gi, "");
    }

    // 2. Format custom markdowns and tags to standard styled HTML nodes for WeChat's rich-text:
    
    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fbbf24; font-weight: bold;">$1</strong>');
    
    // Code: `code`
    html = html.replace(/`(.*?)`/g, '<code style="background-color: #020617; color: #34d399; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 11px; border: 1px solid #10b981;">$1</code>');

    // Custom tag: <badge color="cyan|amber|emerald|rose">text</badge>
    html = html.replace(/<badge\s+color="(\w+)"\s*>(.*?)<\/badge>/g, (_, color, text) => {
      let bg = "#1e293b";
      let border = "#334155";
      let textColor = "#94a3b8";
      if (color === "cyan") {
        bg = "#083344";
        border = "#155e75";
        textColor = "#22d3ee";
      } else if (color === "amber") {
        bg = "#451a03";
        border = "#78350f";
        textColor = "#fbbf24";
      } else if (color === "emerald") {
        bg = "#064e3b";
        border = "#065f46";
        textColor = "#34d399";
      } else if (color === "rose") {
        bg = "#4c0519";
        border = "#9f1239";
        textColor = "#f43f5e";
      }
      return `<span style="display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: bold; font-family: monospace; background-color: ${bg}; border: 1px solid ${border}; color: ${textColor}; margin: 0 2px;">${text}</span>`;
    });

    // Custom tag: <card type="info|success|warning|error" title="...">content</card>
    html = html.replace(/<card\s+type="(\w+)"\s+title="(.*?)"\s*>(.*?)<\/card>/gs, (_, type, title, body) => {
      let borderColor = "#1e293b";
      let bg = "#0f172a";
      let titleColor = "#cbd5e1";
      if (type === "info") {
        borderColor = "#155e75";
        bg = "#083344";
        titleColor = "#22d3ee";
      } else if (type === "success") {
        borderColor = "#065f46";
        bg = "#064e3b";
        titleColor = "#34d399";
      } else if (type === "warning") {
        borderColor = "#78350f";
        bg = "#451a03";
        titleColor = "#fbbf24";
      } else if (type === "error") {
        borderColor = "#9f1239";
        bg = "#4c0519";
        titleColor = "#f43f5e";
      }
      return `
        <div style="margin: 8px 0; padding: 10px; border-radius: 8px; border: 1px solid ${borderColor}; background-color: ${bg}; font-family: monospace;">
          <div style="font-weight: bold; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 6px; color: ${titleColor}; font-size: 11px;">⚙️ ${title}</div>
          <div style="color: #cbd5e1; font-size: 11px; line-height: 1.5;">${body}</div>
        </div>
      `;
    });

    // 3. Inject standard inline styling for native HTML tags:
    
    // Images: img -> styled img
    html = html.replace(/<img([^>]+)>/gi, (_, attrs) => {
      let cleanedAttrs = attrs.replace(/style=["']([^"']*)["']/gi, "");
      return `<img style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #b45309; margin: 6px 0;" ${cleanedAttrs}>`;
    });

    // Tables: table -> styled table
    html = html.replace(/<table([^>]*)>/gi, (_, attrs) => {
      let existingStyle = "";
      let styleMatch = attrs.match(/style=["']([^"']*)["']/i);
      if (styleMatch) {
        existingStyle = styleMatch[1].trim();
        if (existingStyle && !existingStyle.endsWith(";")) existingStyle += ";";
      }
      let cleanedAttrs = attrs.replace(/style=["']([^"']*)["']/gi, "");
      
      // Detect if the table is light themed (explicitly has white or bright background)
      let isLight = false;
      if (existingStyle.match(/(background|background-color)\s*:\s*([^;]*)/i)) {
        const bgVal = RegExp.$2.toLowerCase();
        if (bgVal.includes("white") || bgVal.includes("#fff") || bgVal.includes("#fef") || bgVal.includes("#fdf") || bgVal.includes("rgba(255") || bgVal.includes("rgb(255")) {
          isLight = true;
        }
      }
      
      // Default text color and border based on the table's background theme
      let defaultColor = isLight ? "color: #1e293b;" : "color: #cbd5e1;";
      let defaultBg = isLight ? "background-color: #ffffff;" : "background-color: #0b0f19;";
      let defaultBorder = isLight ? "border: 1px solid rgba(100,116,139,0.3);" : "border: 1px solid #1e293b;";
      
      return `
        <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 10px 0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          <table style="width: 100%; border-collapse: collapse; margin: 0; overflow: hidden; ${defaultBg} ${defaultBorder} ${defaultColor} ${existingStyle}" ${cleanedAttrs}>
      `;
    });

    // Close the table container div
    html = html.replace(/<\/table>/gi, "</table></div>");

    // Table Headers: th -> styled th
    html = html.replace(/<th\b([^>]*)>/gi, (_, attrs) => {
      let existingStyle = "";
      let styleMatch = attrs.match(/style=["']([^"']*)["']/i);
      if (styleMatch) {
        existingStyle = styleMatch[1].trim();
        if (existingStyle && !existingStyle.endsWith(";")) existingStyle += ";";
      }
      let cleanedAttrs = attrs.replace(/style=["']([^"']*)["']/gi, "");
      
      let headerColor = "";
      if (!existingStyle.includes("color")) {
        headerColor = "color: inherit;";
      }
      
      return `<th style="padding: 10px; font-weight: bold; font-family: monospace; font-size: 11px; text-align: left; border-bottom: 2px solid rgba(100,116,139,0.3); ${headerColor} ${existingStyle}" ${cleanedAttrs}>`;
    });

    // Table Cells: td -> styled td
    html = html.replace(/<td\b([^>]*)>/gi, (_, attrs) => {
      let existingStyle = "";
      let styleMatch = attrs.match(/style=["']([^"']*)["']/i);
      if (styleMatch) {
        existingStyle = styleMatch[1].trim();
        if (existingStyle && !existingStyle.endsWith(";")) existingStyle += ";";
      }
      let cleanedAttrs = attrs.replace(/style=["']([^"']*)["']/gi, "");
      
      let cellColor = "";
      if (!existingStyle.includes("color")) {
        cellColor = "color: inherit;";
      }
      
      return `<td style="padding: 10px; border-bottom: 1px solid rgba(100,116,139,0.15); font-size: 11px; ${cellColor} ${existingStyle}" ${cleanedAttrs}>`;
    });

    // Blockquotes: blockquote -> styled blockquote
    html = html.replace(/<blockquote([^>]*)>/gi, (_, attrs) => {
      let cleanedAttrs = attrs.replace(/style=["']([^"']*)["']/gi, "");
      return `<blockquote style="border-left: 3px solid #f59e0b; background-color: #1c1917; padding: 6px 12px; margin: 6px 0; border-radius: 4px; color: #cbd5e1; font-style: italic;" ${cleanedAttrs}>`;
    });

    if (html.indexOf("<div") === -1 && html.indexOf("<p") === -1 && html.indexOf("<table") === -1) {
      html = html.split("\n").join("<br/>");
    }

    return {
      html,
      videoUrl,
      videoPoster
    };
  }
});
