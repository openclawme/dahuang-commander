const app = require('../../utils/getApp.js');
const { getHeaders } = require('../../utils/config.js');

Page({
  data: {
    loading: true,
    errorText: "",
    isAdmin: true,
    servers: [],           // {id,name,host,authMode,hasKey,keyHint,enabled,toolCount,lastError,lastLoadedText,toolNames,testing}
    catalog: { official: [], community: [] },
    // 添加弹层
    showAddSheet: false,
    addMode: "catalog",    // catalog | custom
    // 编辑弹层
    showEditSheet: false,
    editingId: "",
    editName: "",
    editUrl: "",
    editKey: "",
    editKeyHint: "",
    editClearKey: false,
    // 目录装 Key 弹窗
    keyModal: { show: false, target: null, key: "" },
    // 自定义表单
    custom: { name: "", url: "", key: "", authMode: "url", authHeader: "" },
    submitting: false,
  },

  onLoad() {
    this.refresh();
  },

  onShow() {
    if (!this.data.loading) this.refresh();
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

  refresh() {
    this.setData({ loading: true, errorText: "" });
    const { serverUrl, agentState } = app.globalData;
    if (!agentState || !agentState.token) {
      this.setData({ loading: false, errorText: "未登录" });
      return;
    }
    // 目录（任何登录智能体可读）始终拉取；服务端列表仅主人
    this.request("/api/agent/mcp/catalog", "GET")
      .then((r) => {
        const catalog = r.catalog || [];
        this.setData({
          catalog: {
            official: catalog.filter((c) => c.group === "官方"),
            community: catalog.filter((c) => c.group === "社区"),
          },
        });
      })
      .catch(() => {});
    this.request("/api/agent/mcp/servers", "GET")
      .then((r) => {
        this.setData({
          loading: false,
          isAdmin: true,
          servers: (r.servers || []).map((s) => ({
            ...s,
            lastLoadedText: s.lastLoadedAt ? "最近加载 " + this.timeText(new Date(s.lastLoadedAt).getTime()) : "尚未加载（下次任务自动连接）",
            testing: false,
          })),
        });
      })
      .catch((err) => {
        const msg = err.message || "";
        this.setData({
          loading: false,
          isAdmin: false,
          errorText: msg.indexOf("403") !== -1 || msg.indexOf("管理") !== -1 || msg.indexOf("未配置") !== -1 ? "仅主人可管理 MCP 工具" : msg,
        });
      });
  },

  timeText(ts) {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  },

  // ===== 启用开关 =====
  onToggleEnabled(e) {
    const id = e.currentTarget.dataset.id;
    const enabled = e.detail.value;
    this.request(`/api/agent/mcp/servers/${id}`, "PATCH", { enabled })
      .then(() => {
        wx.showToast({ title: enabled ? "已启用，下次任务生效" : "已停用", icon: "none" });
        this.refresh();
      })
      .catch((err) => {
        wx.showToast({ title: err.message || "操作失败", icon: "none" });
        this.refresh();
      });
  },

  // ===== 连接测试 =====
  onTest(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ [`servers`]: this.data.servers.map((s) => (s.id === id ? { ...s, testing: true } : s)) });
    wx.showLoading({ title: "测试连接中", mask: true });
    this.request(`/api/agent/mcp/servers/${id}/test`, "POST", {})
      .then((r) => {
        wx.hideLoading();
        wx.showToast({ title: r.ok ? `连接成功：${r.toolCount} 个工具` : `失败：${(r.error || "未知错误").slice(0, 30)}`, icon: "none", duration: 2600 });
        this.refresh();
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({ title: err.message || "测试失败", icon: "none" });
        this.refresh();
      });
  },

  // ===== 编辑 =====
  onEditOpen(e) {
    const s = this.data.servers.find((x) => x.id === e.currentTarget.dataset.id);
    if (!s) return;
    this.setData({
      showEditSheet: true,
      editingId: s.id,
      editName: s.name,
      editUrl: "",
      editKey: "",
      editKeyHint: s.keyHint || "",
      editClearKey: false,
    });
  },
  onEditInput(e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },
  onEditClearKey(e) {
    this.setData({ editClearKey: e.detail.value });
  },
  onEditSubmit() {
    if (this.data.submitting) return;
    const { editingId, editName, editKey, editKeyHint, editClearKey } = this.data;
    const body = { name: editName.trim(), keyHint: editKeyHint.trim() };
    if (editClearKey) body.clearKey = true;
    else if (editKey.trim()) body.apiKey = editKey.trim();
    this.setData({ submitting: true });
    this.request(`/api/agent/mcp/servers/${editingId}`, "PATCH", body)
      .then(() => {
        wx.showToast({ title: "已更新", icon: "none" });
        this.setData({ submitting: false, showEditSheet: false });
        this.refresh();
      })
      .catch((err) => {
        wx.showToast({ title: err.message || "更新失败", icon: "none" });
        this.setData({ submitting: false });
      });
  },

  // ===== 删除 =====
  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    const s = this.data.servers.find((x) => x.id === id);
    wx.showModal({
      title: "移除服务端",
      content: `确定移除「${s ? s.name : id}」吗？其工具将从分身能力中消失。`,
      confirmText: "移除",
      confirmColor: "#b0543f",
      success: (res) => {
        if (!res.confirm) return;
        this.request(`/api/agent/mcp/servers/${id}`, "DELETE")
          .then(() => {
            wx.showToast({ title: "已移除", icon: "none" });
            this.refresh();
          })
          .catch((err) => wx.showToast({ title: err.message || "移除失败", icon: "none" }));
      },
    });
  },

  // ===== 添加 =====
  onAddOpen() {
    wx.showActionSheet({
      itemList: ["从目录安装", "自定义接入"],
      success: (res) => {
        this.setData({ showAddSheet: true, addMode: res.tapIndex === 0 ? "catalog" : "custom" });
      },
    });
  },
  closeAddSheet() {
    this.setData({ showAddSheet: false });
  },
  closeEditSheet() {
    this.setData({ showEditSheet: false });
  },
  noop() {},

  onCatalogInstall(e) {
    const key = e.currentTarget.dataset.key;
    const entry = [...this.data.catalog.official, ...this.data.catalog.community].find((c) => c.serverKey === key);
    if (!entry) return;
    if (entry.needsKey) {
      this.setData({ keyModal: { show: true, target: entry, key: "" } });
      return;
    }
    this.doInstall(entry.serverKey, "");
  },
  onKeyModalInput(e) {
    this.setData({ "keyModal.key": e.detail.value });
  },
  onKeyModalSubmit() {
    const { target, key } = this.data.keyModal;
    if (!target || !key.trim()) {
      wx.showToast({ title: "请填写 Key", icon: "none" });
      return;
    }
    this.doInstall(target.serverKey, key.trim());
  },
  closeKeyModal() {
    this.setData({ keyModal: { show: false, target: null, key: "" } });
  },

  doInstall(catalogId, apiKey) {
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    wx.showLoading({ title: "安装中", mask: true });
    this.request("/api/agent/mcp/servers", "POST", apiKey ? { catalogId, apiKey } : { catalogId })
      .then((r) => {
        wx.hideLoading();
        wx.showToast({ title: r.message || "已安装", icon: "none" });
        this.setData({ submitting: false, showAddSheet: false, keyModal: { show: false, target: null, key: "" } });
        this.refresh();
      })
      .catch((err) => {
        wx.hideLoading();
        wx.showToast({ title: err.message || "安装失败", icon: "none", duration: 2600 });
        this.setData({ submitting: false });
      });
  },

  // ===== 自定义接入 =====
  onCustomInput(e) {
    this.setData({ [`custom.${e.currentTarget.dataset.field}`]: e.detail.value });
  },
  onCustomAuthMode(e) {
    this.setData({ "custom.authMode": e.currentTarget.dataset.value });
  },
  onCustomSubmit() {
    const { name, url, key, authMode, authHeader } = this.data.custom;
    if (!name.trim() || !url.trim()) {
      wx.showToast({ title: "名称和 URL 必填", icon: "none" });
      return;
    }
    const body = { name: name.trim(), urlTemplate: url.trim(), authMode };
    if (key.trim()) body.apiKey = key.trim();
    if (authMode === "header") body.authHeaderTemplate = authHeader.trim() || "Authorization: Bearer {key}";
    this.request("/api/agent/mcp/servers", "POST", body)
      .then(() => {
        wx.showToast({ title: "已接入", icon: "none" });
        this.setData({ showAddSheet: false, custom: { name: "", url: "", key: "", authMode: "url", authHeader: "" } });
        this.refresh();
      })
      .catch((err) => wx.showToast({ title: err.message || "接入失败", icon: "none", duration: 2600 }));
  },

  onCopyHost(e) {
    const host = e.currentTarget.dataset.host;
    if (!host) return;
    wx.setClipboardData({ data: host });
  },
});
