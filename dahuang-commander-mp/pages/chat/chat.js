const app = getApp();
const i18n = require('../../utils/i18n.js');

Page({
  data: {
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
      app.syncMessengerRooms();
    }
  },

  onPullDownRefresh() {
    if (app.globalData.agentState.token) {
      app.syncMessengerRooms();
      // Safeguard to stop pull down refresh after 1.5s
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
        lastMsgText = latestEvent.body;
        lastMsgTs = latestEvent.ts;
        const date = new Date(latestEvent.ts);
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

    // Sort by latest message ts descending
    roomsList.sort((a, b) => b.lastMsgTs - a.lastMsgTs);

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
