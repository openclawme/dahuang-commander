const app = require('../../utils/getApp.js');
const i18n = require('../../utils/i18n.js');
const { getHeaders } = require('../../utils/config.js');

Page({
  data: {
    roomId: "",
    roomName: "讨论群聊",
    messages: [],
    inputValue: "",
    toView: "",
    keyboardHeight: 0,
    humanUnlocked: false,
    dissolved: false,
    myRole: "MEMBER"
  },

  onLoad(options) {
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
    this.setData({ t: i18n.getDict() });
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
    const messages = (room.events || []).map(msg => {
      const isMe = msg.sender === myDid;
      const date = new Date(msg.ts);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const timeStr = `${hours}:${minutes}`;

      const rich = app.parseRichContent(msg.body);
      const isRich = rich.html && (rich.html.indexOf("<table") !== -1 || rich.html.indexOf("<card") !== -1 || rich.html.indexOf("html-body-wrapper") !== -1);
      return {
        ...msg,
        isMe,
        timeStr,
        isRich,
        richContent: rich.html,
        videoUrl: rich.videoUrl,
        videoPoster: rich.videoPoster
      };
    });

    this.setData({
      roomName: room.name,
      messages
    }, () => {
      this.scrollToBottom();
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
    if (!text) return;

    const { roomId } = this.data;
    const { serverUrl, agentState } = app.globalData;

    if (!agentState.token) {
      wx.showToast({
        title: this.data.t.room.not_logged_in,
        icon: "none"
      });
      return;
    }

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
      body: text,
      ts: Date.now(),
      isPending: true
    };
    const currentMsgs = this.data.messages || [];
    this.setData({
      messages: [...currentMsgs, optimisticMsg],
      toView: `msg-${localEventId}`
    });

    wx.request({
      url: `${serverUrl}/api/matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message`,
      method: "POST",
      // 人类发言标记：服务端据此清零自动回复计数
      header: { ...getHeaders(agentState.token), "X-Human-Send": "true" },
      data: {
        msgtype: "m.text",
        body: text
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
                  body: text,
                  ts: Date.now()
                });
              }
            }
          }
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
            messages: currentMsgs
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
          messages: currentMsgs
        });
      }
    });
  },

  scrollToBottom() {
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

  onInputFocus(e) {
    const keyboardHeight = e.detail.height || this.data.keyboardHeight || 0;
    if (keyboardHeight > 0) {
      this.setData({
        keyboardHeight
      }, () => {
        this.scrollToBottom();
      });
    }
  },

  onInputBlur() {
    this.setData({
      keyboardHeight: 0
    });
  },

  onKeyboardHeightChange(e) {
    const keyboardHeight = e.detail.height || 0;
    this.setData({
      keyboardHeight
    }, () => {
      this.scrollToBottom();
    });
  }
});
