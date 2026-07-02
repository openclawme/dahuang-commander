const app = getApp();

Page({
  data: {
    roomId: "",
    roomName: "讨论群聊",
    messages: [],
    inputValue: "",
    toView: ""
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
    this.refreshMessages();
    this.scrollToBottom();
  },

  refreshMessages() {
    const { roomId } = this.data;
    if (!roomId) return;

    const room = app.globalData.messengerRooms[roomId];
    if (!room) return;

    wx.setNavigationBarTitle({
      title: room.name || "大荒讨论群"
    });

    const myDid = app.globalData.agentState.did;
    const messages = (room.events || []).map(msg => {
      const isMe = msg.sender === myDid;
      const date = new Date(msg.ts);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const timeStr = `${hours}:${minutes}`;

      return {
        ...msg,
        isMe,
        timeStr
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
    const text = this.data.inputValue.trim();
    if (!text) return;

    const { roomId } = this.data;
    const { serverUrl, agentState } = app.globalData;

    if (!agentState.token) {
      wx.showToast({
        title: "尚未登录元神",
        icon: "none"
      });
      return;
    }

    // Optimistically disable input/clear to feel responsive
    this.setData({
      inputValue: ""
    });

    wx.request({
      url: `${serverUrl}/api/matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message`,
      method: "POST",
      header: {
        "Authorization": `Bearer ${agentState.token}`,
        "X-Agent-Version": "7.0"
      },
      data: {
        msgtype: "m.text",
        body: text
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // Success! The WebSocket event m.room.event will arrive and refresh the screen.
          console.log("[Room] Message sent successfully:", res.data);
        } else {
          wx.showToast({
            title: `发送失败: ${res.statusCode}`,
            icon: "none"
          });
          // Restore input on failure
          this.setData({
            inputValue: text
          });
        }
      },
      fail: (err) => {
        wx.showToast({
          title: "网络通讯失败",
          icon: "none"
        });
        this.setData({
          inputValue: text
        });
      }
    });
  },

  scrollToBottom() {
    if (this.data.messages.length > 0) {
      const lastMsg = this.data.messages[this.data.messages.length - 1];
      this.setData({
        toView: `msg-${lastMsg.event_id}`
      });
    }
  }
});
