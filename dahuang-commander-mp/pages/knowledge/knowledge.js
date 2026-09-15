const app = require('../../utils/getApp.js');
const { getHeaders } = require('../../utils/config.js');

Page({
  data: {
    docs: [],
    summary: { count: 0, totalChars: 0 },
    summaryText: "",
    keyword: "",
    searching: false,
    searchHits: [],
    loading: false,
    serverUrl: "",
  },

  onLoad() {
    this.setData({ serverUrl: app.globalData.serverUrl || "" });
    this.refreshList();
  },

  onShow() {
    this.refreshList();
  },

  request(path, method, data) {
    const { serverUrl, agentState } = app.globalData;
    if (!agentState || !agentState.token) return Promise.reject(new Error("未登录"));
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${serverUrl}${path}`,
        method,
        data,
        header: getHeaders(agentState.token),
        success: (res) => {
          if (res.statusCode === 200) resolve(res.data);
          else reject(new Error((res.data && res.data.error) || `HTTP ${res.statusCode}`));
        },
        fail: () => reject(new Error("网络异常")),
      });
    });
  },

  refreshList() {
    this.setData({ loading: true });
    this.request("/api/agent/knowledge", "GET")
      .then((r) => {
        const docs = (r.documents || []).map((d) => ({
          ...d,
          timeText: String(d.updatedAt || "").slice(0, 10),
          sizeText: d.charCount >= 10000 ? `${(d.charCount / 10000).toFixed(1)}万字` : `${d.charCount}字`,
        }));
        const summary = r.summary || { count: docs.length, totalChars: 0 };
        this.setData({
          docs,
          summary,
          summaryText: `${summary.count} 篇 · ${summary.totalChars >= 10000 ? (summary.totalChars / 10000).toFixed(1) + "万字" : summary.totalChars + "字"}`,
          loading: false,
        });
      })
      .catch(() => this.setData({ loading: false, summaryText: "加载失败，下拉重试" }));
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    const q = (this.data.keyword || "").trim();
    if (!q) {
      this.setData({ searching: false, searchHits: [] });
      this.refreshList();
      return;
    }
    this.setData({ searching: true, loading: true });
    this.request(`/api/agent/knowledge/search?q=${encodeURIComponent(q)}`, "GET")
      .then((r) => {
        this.setData({
          searching: true,
          loading: false,
          searchHits: (r.hits || []).map((h) => ({ ...h, timeText: "" })),
        });
      })
      .catch(() => this.setData({ searching: true, loading: false, searchHits: [] }));
  },

  onDocLongPress(e) {
    const key = e.currentTarget.dataset.key;
    const title = e.currentTarget.dataset.title;
    if (!key) return;
    wx.showModal({
      title: "删除文档",
      content: `确定删除《${title}》吗？删除后不可恢复，分身也不会再引用它。`,
      confirmText: "删除",
      confirmColor: "#b0543f",
      success: (res) => {
        if (res.confirm) this.deleteDoc(key);
      },
    });
  },

  deleteDoc(key) {
    wx.showLoading({ title: "删除中", mask: true });
    this.request(`/api/agent/knowledge?docKey=${encodeURIComponent(key)}`, "DELETE")
      .then(() => {
        wx.hideLoading();
        wx.showToast({ title: "已删除", icon: "none" });
        this.refreshList();
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({ title: err.message || "删除失败", icon: "none" });
      });
  },

  onUploadTap() {
    wx.chooseMessageFile({
      count: 1,
      type: "file",
      extension: ["txt", "md"],
      success: (res) => {
        const f = (res.tempFiles && res.tempFiles[0]) || null;
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) {
          wx.showToast({ title: "文件超过 5MB，请拆分后再传", icon: "none" });
          return;
        }
        const { serverUrl, agentState } = app.globalData;
        wx.showLoading({ title: "上传解析中", mask: true });
        wx.uploadFile({
          url: `${serverUrl}/api/agent/knowledge/upload`,
          filePath: f.path,
          name: "file",
          header: getHeaders(agentState.token),
          success: (res) => {
            wx.hideLoading();
            let data = {};
            try { data = JSON.parse(res.data || "{}"); } catch (e) {}
            if (res.statusCode === 200 && data.success) {
              wx.showToast({ title: "已入库", icon: "none" });
              this.refreshList();
            } else {
              wx.showToast({ title: (data && data.error) || "上传失败", icon: "none", duration: 2600 });
            }
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({ title: "网络异常，上传失败", icon: "none" });
          },
        });
      },
    });
  },
});
