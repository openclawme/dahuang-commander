const app = require('../../utils/getApp.js');
const { getHeaders } = require('../../utils/config.js');

Page({
  data: {
    docKey: "",
    doc: null,
    loading: false,
    errorText: "",
    serverUrl: "",
  },

  onLoad(options) {
    const docKey = options.docKey ? decodeURIComponent(options.docKey) : "";
    this.setData({ serverUrl: app.globalData.serverUrl || "", docKey });
    if (docKey) this.loadDoc();
  },

  loadDoc() {
    const { serverUrl, agentState } = app.globalData;
    if (!agentState || !agentState.token || !this.data.docKey) return;
    this.setData({ loading: true, errorText: "" });
    wx.request({
      url: `${serverUrl}/api/agent/knowledge/doc?docKey=${encodeURIComponent(this.data.docKey)}`,
      method: "GET",
      header: getHeaders(agentState.token),
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.success) {
          const d = res.data.doc;
          this.setData({
            loading: false,
            doc: {
              ...d,
              sizeText: d.charCount >= 10000 ? `${(d.charCount / 10000).toFixed(1)}万字` : `${d.charCount}字`,
              timeText: String(d.updatedAt || "").slice(0, 10),
              chunkText: d.chunkCount > 1 ? ` · 分 ${d.chunkCount} 块存储` : "",
            },
          });
          wx.setNavigationBarTitle({ title: d.title.slice(0, 10) });
        } else {
          this.setData({ loading: false, errorText: (res.data && res.data.error) || "加载失败" });
        }
      },
      fail: () => this.setData({ loading: false, errorText: "网络异常" }),
    });
  },

  onRename() {
    const d = this.data.doc;
    if (!d) return;
    wx.showModal({
      title: "修改文档名",
      editable: true,
      placeholderText: "输入新名称",
      content: d.title,
      success: (m) => {
        if (!m.confirm) return;
        const title = (m.content || "").trim();
        if (!title || title === d.title) return;
        const { serverUrl, agentState } = app.globalData;
        wx.request({
          url: `${serverUrl}/api/agent/knowledge/manage`,
          method: "POST",
          data: { action: "rename", docKey: this.data.docKey, title },
          header: getHeaders(agentState.token),
          success: (res) => {
            if (res.statusCode === 200 && res.data && res.data.success) {
              this.setData({ doc: { ...d, title } });
              wx.setNavigationBarTitle({ title: title.slice(0, 10) });
              wx.showToast({ title: "已改名", icon: "none" });
            } else {
              wx.showToast({ title: (res.data && res.data.error) || "改名失败", icon: "none" });
            }
          },
          fail: () => wx.showToast({ title: "网络异常", icon: "none" }),
        });
      },
    });
  },

  onDelete() {
    const d = this.data.doc;
    if (!d) return;
    wx.showModal({
      title: "删除文档",
      content: `确定删除《${d.title}》吗？删除后不可恢复。`,
      confirmText: "删除",
      confirmColor: "#b0543f",
      success: (res) => {
        if (!res.confirm) return;
        const { serverUrl, agentState } = app.globalData;
        wx.showLoading({ title: "删除中", mask: true });
        wx.request({
          url: `${serverUrl}/api/agent/knowledge?docKey=${encodeURIComponent(this.data.docKey)}`,
          method: "DELETE",
          header: getHeaders(agentState.token),
          success: () => {
            wx.hideLoading();
            wx.showToast({ title: "已删除", icon: "none" });
            setTimeout(() => wx.navigateBack(), 600);
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: "删除失败", icon: "none" });
          },
        });
      },
    });
  },
});
