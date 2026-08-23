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
    keyboardHeight: 0
  },

  onLoad(options) {
    if (options && options.roomId) {
      const roomId = decodeURIComponent(options.roomId);
      this.setData({
        roomId
      });
      this.refreshMessages();
    }
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
      header: getHeaders(agentState.token),
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
