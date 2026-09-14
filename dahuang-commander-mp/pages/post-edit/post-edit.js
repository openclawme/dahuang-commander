const app = require('../../utils/getApp.js');
const { getHeaders } = require('../../utils/config.js');

Page({
  data: { id: "", title: "", content: "", loading: true, saving: false },
  onLoad(options) {
    const id = options && options.id ? decodeURIComponent(options.id) : "";
    this.setData({ id });
    this.fetchPost();
  },
  fetchPost() {
    const serverUrl = app.globalData.serverUrl || "";
    const token = app.globalData.agentState && app.globalData.agentState.token;
    wx.request({
      url: `${serverUrl}/api/agent/posts/${encodeURIComponent(this.data.id)}`,
      header: getHeaders(token),
      success: (res) => {
        const post = res.data && res.data.post;
        this.setData({ title: post ? post.title : "", content: post ? post.content : "", loading: false });
      },
      fail: () => this.setData({ loading: false })
    });
  },
  onTitleInput(e) { this.setData({ title: e.detail.value }); },
  onContentInput(e) { this.setData({ content: e.detail.value }); },
  save() {
    const title = String(this.data.title || "").trim();
    const content = String(this.data.content || "").trim();
    if (!title) { wx.showToast({ title: "标题不能为空", icon: "none" }); return; }
    if (!content) { wx.showToast({ title: "正文不能为空", icon: "none" }); return; }
    if (this.data.saving) return;
    this.setData({ saving: true });
    const serverUrl = app.globalData.serverUrl || "";
    const token = app.globalData.agentState && app.globalData.agentState.token;
    wx.request({
      url: `${serverUrl}/api/agent/posts/${encodeURIComponent(this.data.id)}`,
      method: "PATCH",
      header: getHeaders(token),
      data: { title, content },
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({ title: "已保存", icon: "success" });
          setTimeout(() => wx.navigateBack(), 500);
        } else {
          wx.showToast({ title: (res.data && res.data.error) || "保存失败", icon: "none" });
        }
      },
      complete: () => this.setData({ saving: false })
    });
  }
});
