const app = getApp();
const i18n = require('../../utils/i18n.js');

Page({
  data: {
    t: i18n.getDict(),
    roomsList: []
  },

  onLoad() {
    this.refreshRooms();
  },

  onShow() {
    this.setData({ t: i18n.getDict() });
    wx.setNavigationBarTitle({ title: this.data.t.chat.nav_title });
    i18n.updateTabBar();
    this.refreshRooms();
    if (app.globalData.agentState.token) {
      if (typeof app.syncMessengerRooms === "function") {
        app.syncMessengerRooms();
      }
    }
  },

  onPullDownRefresh() {
    if (app.globalData.agentState.token) {
      if (typeof app.syncMessengerRooms === "function") {
        app.syncMessengerRooms();
      }
      setTimeout(() => {
        wx.stopPullDownRefresh();
      }, 1500);
    } else {
      wx.stopPullDownRefresh();
      wx.showToast({
        title: this.data.t.chat.not_logged_in,
        icon: "none"
      });
    }
  },

  onRoomsUpdate() {
    this.refreshRooms();
    wx.stopPullDownRefresh();
  },

  refreshRooms() {
    const rooms = app.globalData.messengerRooms || {};
    const roomsList = Object.values(rooms).map(r => {
      const latestEvent = r.events && r.events.length > 0 ? r.events[r.events.length - 1] : null;
      let lastMsgText = this.data.t.chat.no_message;
      let lastMsgTime = "";
      let lastMsgTs = 0;
      
      if (latestEvent) {
        let rawBody = latestEvent.body || "";
        // Clean HTML tags and markdown codeblocks for clean room preview list
        lastMsgText = rawBody
          .replace(/```[\s\S]*?```/g, "[代码块]")
          .replace(/<[^>]+>/g, "")
          .trim();
        if (!lastMsgText) lastMsgText = "[神念信息]";
        lastMsgTs = latestEvent.ts || 0;
        const date = new Date(lastMsgTs);
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        lastMsgTime = `${hours}:${minutes}`;
      }

      return {
        roomId: r.roomId,
        name: r.name,
        unreadCount: r.unreadCount,
        lastMsgText,
        lastMsgTime,
        lastMsgTs
      };
    });

    // Sort by latest message ts descending with stable tie-breaker
    roomsList.sort((a, b) => (b.lastMsgTs - a.lastMsgTs) || a.roomId.localeCompare(b.roomId));

    this.setData({
      roomsList
    });
  },

  enterRoom(e) {
    const roomId = e.currentTarget.dataset.roomid;
    if (!roomId) return;

    // Clear unread count locally
    if (app.globalData.messengerRooms[roomId]) {
      app.globalData.messengerRooms[roomId].unreadCount = 0;
    }
    
    this.refreshRooms();

    wx.navigateTo({
      url: `/pages/room/room?roomId=${encodeURIComponent(roomId)}`
    });
  }
});
