const app = require('../../utils/getApp.js');
const { getHeaders } = require('../../utils/config.js');

/** 高亮：把文本按关键词切分，命中词包金底 span（返回 rich-text nodes） */
function buildHighlightNodes(text, terms) {
  const src = String(text || "");
  const ts = (terms || []).filter(Boolean);
  if (!ts.length) return [{ type: "text", text: src }];
  const esc = ts.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(${esc})`, "gi");
  const nodes = [];
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    if (m.index > last) nodes.push({ type: "text", text: src.slice(last, m.index) });
    nodes.push({ name: "span", attrs: { class: "kb-hl" }, children: [{ type: "text", text: m[0] }] });
    last = m.index + m[0].length;
    if (m.index === re.lastIndex) re.lastIndex += 1;
  }
  if (last < src.length) nodes.push({ type: "text", text: src.slice(last) });
  return nodes.length ? nodes : [{ type: "text", text: src }];
}

Page({
  data: {
    tab: "docs", // docs | qa（本地记忆上次停留）
    docs: [],
    summaryText: "",
    // 文档页
    keyword: "",
    searching: false,
    searchHits: [],
    searchTerms: [],
    manageMode: false,
    selectedKeys: {},
    selectedCount: 0,
    loading: false,
    // 问答页
    qaMessages: [], // {role: 'user'|'assistant', content, citations?}
    qaInput: "",
    qaLoading: false,
    qaScrollTo: "",
    serverUrl: "",
  },

  onLoad() {
    this.setData({ serverUrl: app.globalData.serverUrl || "" });
    let tab = "docs";
    try { tab = wx.getStorageSync("kbTab") || "docs"; } catch (e) {}
    if (tab !== "qa" && tab !== "docs") tab = "docs";
    this.setData({ tab });
    this.refreshList();
  },

  onShow() {
    this.refreshList();
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab });
    try { wx.setStorageSync("kbTab", tab); } catch (err) {}
  },

  /** 空事件：拦截 switch 点击冒泡到卡片（避免开关误触进详情） */
  noop() {},

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

  // ============ 文档列表 ============
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
          summaryText: `${summary.count} / 100 篇 · ${summary.totalChars >= 10000 ? (summary.totalChars / 10000).toFixed(1) + "万字" : summary.totalChars + "字"}`,
          loading: false,
        });
      })
      .catch(() => this.setData({ loading: false, summaryText: "加载失败" }));
  },

  // ============ 文档页：搜索（去重+高亮） ============
  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    const q = (this.data.keyword || "").trim();
    if (!q) {
      this.setData({ searching: false, searchHits: [], searchTerms: [] });
      return;
    }
    this.setData({ searching: true, loading: true });
    this.request(`/api/agent/knowledge/search?q=${encodeURIComponent(q)}`, "GET")
      .then((r) => {
        const terms = q.split(/\s+/).filter(Boolean);
        this.setData({
          searching: true,
          loading: false,
          searchTerms: terms,
          searchHits: (r.hits || []).map((h) => ({
            ...h,
            snippetNodes: buildHighlightNodes(h.snippet, terms),
            titleNodes: buildHighlightNodes(h.title, terms),
            scoreText: Math.round(h.score * 100) + "%",
          })),
        });
      })
      .catch(() => this.setData({ searching: true, loading: false, searchHits: [] }));
  },

  clearSearch() {
    this.setData({ keyword: "", searching: false, searchHits: [], searchTerms: [] });
  },

  onHitTap(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    wx.navigateTo({ url: `/pages/knowledge-detail/knowledge-detail?docKey=${encodeURIComponent(key)}` });
  },

  // ============ 文档页：管理模式（多选/批量删除） ============
  toggleManage() {
    const next = !this.data.manageMode;
    this.setData({ manageMode: next, selectedKeys: {}, selectedCount: 0 });
  },

  onDocTap(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    if (this.data.manageMode) {
      const selectedKeys = { ...this.data.selectedKeys };
      if (selectedKeys[key]) delete selectedKeys[key];
      else selectedKeys[key] = true;
      this.setData({ selectedKeys, selectedCount: Object.keys(selectedKeys).length });
      return;
    }
    wx.navigateTo({ url: `/pages/knowledge-detail/knowledge-detail?docKey=${encodeURIComponent(key)}` });
  },

  onSelectAll() {
    const selectedKeys = {};
    this.data.docs.forEach((d) => { selectedKeys[d.docKey] = true; });
    this.setData({ selectedKeys, selectedCount: Object.keys(selectedKeys).length });
  },

  onBatchDelete() {
    const keys = Object.keys(this.data.selectedKeys);
    if (!keys.length) return;
    wx.showModal({
      title: "批量删除",
      content: `确定删除 ${keys.length} 篇文档吗？删除后不可恢复。`,
      confirmText: "删除",
      confirmColor: "#b0543f",
      success: (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: "删除中", mask: true });
        this.request("/api/agent/knowledge/manage", "POST", { action: "batchDelete", docKeys: keys })
          .then((r) => {
            wx.hideLoading();
            wx.showToast({ title: r.message || "已删除", icon: "none" });
            this.setData({ manageMode: false, selectedKeys: {}, selectedCount: 0 });
            this.refreshList();
          })
          .catch((err) => {
            wx.hideLoading();
            wx.showToast({ title: err.message || "删除失败", icon: "none" });
          });
      },
    });
  },

  // ============ 文档页：启用开关 ============
  onToggleEnabled(e) {
    const key = e.currentTarget.dataset.key;
    const enabled = e.detail.value;
    this.request("/api/agent/knowledge/manage", "POST", { action: "toggle", docKey: key, enabled })
      .then(() => {
        wx.showToast({ title: enabled ? "已启用，参与问答" : "已停用，不再被引用", icon: "none" });
        this.refreshList();
      })
      .catch((err) => {
        wx.showToast({ title: err.message || "操作失败", icon: "none" });
        this.refreshList();
      });
  },

  // ============ 问答页 ============
  onQaInput(e) {
    this.setData({ qaInput: e.detail.value });
  },

  sendQa() {
    const q = (this.data.qaInput || "").trim();
    if (!q || this.data.qaLoading) return;
    const qaMessages = this.data.qaMessages.concat([{ role: "user", content: q }]);
    this.setData({ qaInput: "", qaMessages, qaLoading: true, qaScrollTo: `qa-${qaMessages.length - 1}` });

    const history = qaMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));

    this.request("/api/agent/knowledge/ask", "POST", { question: q, history })
      .then((r) => {
        const terms = q.split(/\s+/).filter(Boolean);
        const citations = (r.citations || []).map((c) => ({
          ...c,
          snippetNodes: buildHighlightNodes(c.snippet, terms),
        }));
        const msgs = this.data.qaMessages.concat([
          { role: "assistant", content: r.answer || "（无回答）", citations },
        ]);
        this.setData({ qaMessages: msgs, qaLoading: false, qaScrollTo: `qa-${msgs.length - 1}` });
      })
      .catch((err) => {
        const msgs = this.data.qaMessages.concat([{ role: "assistant", content: `问答失败：${err.message || "请稍后再试"}`, citations: [] }]);
        this.setData({ qaMessages: msgs, qaLoading: false, qaScrollTo: `qa-${msgs.length - 1}` });
      });
  },

  clearQa() {
    wx.showModal({
      title: "清空会话",
      content: "只清空问答对话，不影响知识库文档。",
      confirmText: "清空",
      confirmColor: "#b0543f",
      success: (res) => {
        if (res.confirm) this.setData({ qaMessages: [], qaInput: "" });
      },
    });
  },

  onCitationTap(e) {
    const key = e.currentTarget.dataset.key;
    if (!key) return;
    wx.navigateTo({ url: `/pages/knowledge-detail/knowledge-detail?docKey=${encodeURIComponent(key)}` });
  },

  // ============ 上传 ============
  onUploadTap() {
    wx.chooseMessageFile({
      count: 1,
      type: "file",
      extension: ["txt", "md", "pdf", "csv", "json", "html", "docx", "xlsx"],
      success: (res) => {
        const f = (res.tempFiles && res.tempFiles[0]) || null;
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) {
          wx.showToast({ title: "文件超过 5MB，请拆分后再传", icon: "none" });
          return;
        }
        wx.showModal({
          title: "给文档起个名字",
          editable: true,
          placeholderText: "不填则使用文件名",
          content: (f.name || "").replace(/\.[^.]+$/, "").replace(/^tmp_[A-Za-z0-9]+$/, "文档 " + new Date().toLocaleDateString()),
          success: (m) => {
            if (!m.confirm) return;
            this.doUpload(f, (m.content || "").trim());
          },
        });
      },
    });
  },

  doUpload(f, title) {
    const { serverUrl, agentState } = app.globalData;
    wx.showLoading({ title: "上传解析中", mask: true });
    wx.uploadFile({
      url: `${serverUrl}/api/agent/knowledge/upload`,
      filePath: f.path,
      name: "file",
      formData: title ? { title } : {},
      header: {
        Authorization: `Bearer ${agentState.token}`,
        "X-Agent-Version": "7.0",
      },
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
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: (err && err.errMsg && err.errMsg.indexOf("domain") !== -1)
            ? "域名未配置：请在后台把 dahuang.land 加入 uploadFile 合法域名"
            : "网络异常，上传失败",
          icon: "none",
          duration: 3000,
        });
      },
    });
  },
});
