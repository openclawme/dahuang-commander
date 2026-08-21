const app = require('../../utils/getApp.js');
const i18n = require('../../utils/i18n.js');
const { getHeaders } = require('../../utils/config.js');

Page({
  data: {
    t: i18n.getDict(),
    agentState: {},
    serverUrl: "",
    loading: true,
    facts: [],
    shortTerm: [],
    rollingSummary: "",
    episodicItems: [],
    episodicCursor: null,
    episodicLoading: false,
    soulText: "",
    soulMutationCount: 0,
    // 编辑态
    proposals: [],
    autoMaintain: true,
    analyzing: false,
    mergeEditVisible: false,
    mergeEditId: null,
    mergeDraft: "",
    factFormVisible: false,
    factFormMode: "add", // add | edit
    factFormId: null,
    factLabel: "",
    factContent: "",
    summaryFormVisible: false,
    summaryDraft: "",
    soulFormVisible: false,
    soulDraft: "",
    saving: false,
    showSoulAdvanced: false
  },

  onLoad() {
    this.setData({ t: i18n.getDict() });
  },

  onShow() {
    this.setData({
      agentState: app.globalData.agentState || {},
      serverUrl: app.globalData.serverUrl || "https://dahuang.land"
    });
    this.loadMemory();
    this.loadProposals();
  },

  request(method, path, data) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.data.serverUrl}${path}`,
        method,
        header: getHeaders(this.data.agentState.token),
        data,
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
          else reject(new Error((res.data && (res.data.error || res.data.message)) || `HTTP ${res.statusCode}`));
        },
        fail: (err) => reject(new Error(err.errMsg || "网络请求失败"))
      });
    });
  },

  async loadMemory(silent) {
    if (!silent) this.setData({ loading: true });
    try {
      const snap = await this.request("GET", "/api/agent/memory");
      const episodic = snap.episodic || {};
      this.setData({
        facts: (snap.facts || []).map((f) => ({ ...f, ts: this.relativeTime(f.updatedAt) })),
        shortTerm: (snap.shortTermHistory || []).map((h) => ({
          id: h.id,
          role: h.role,
          content: h.content,
          ts: this.relativeTime(h.timestamp)
        })),
        rollingSummary: snap.rollingSummary || "",
        episodicItems: (episodic.items || []).map((m) => ({ ...m, ts: this.relativeTime(m.createdAt) })),
        episodicCursor: episodic.nextCursor || null,
        soulText: (snap.soul && snap.soul.text) || "",
        soulMutationCount: (snap.soul && snap.soul.mutationCount) || 0,
        loading: false
      });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: (this.data.t.memory && this.data.t.memory.load_failed) || "加载失败", icon: "none" });
    }
  },

  async loadMoreEpisodic() {
    if (!this.data.episodicCursor || this.data.episodicLoading) return;
    this.setData({ episodicLoading: true });
    try {
      const res = await this.request("GET", `/api/agent/memory?cursor=${encodeURIComponent(this.data.episodicCursor)}`);
      const page = res.episodic || {};
      this.setData({
        episodicItems: this.data.episodicItems.concat(
          (page.items || []).map((m) => ({ ...m, ts: this.relativeTime(m.createdAt) }))
        ),
        episodicCursor: page.nextCursor || null,
        episodicLoading: false
      });
    } catch (e) {
      this.setData({ episodicLoading: false });
    }
  },

  // ---- AI 整理建议 ----
  async loadProposals() {
    try {
      const res = await this.request("GET", "/api/agent/memory/maintenance");
      this.setData({
        proposals: (res.proposals || []).map((x) => ({ ...x, ts: this.relativeTime(x.createdAt) })),
        autoMaintain: res.autoMaintain !== false
      });
    } catch (e) { /* 静默失败，不影响主界面 */ }
  },

  async analyzeNow() {
    if (this.data.analyzing) return;
    const t = this.data.t.memory || {};
    this.setData({ analyzing: true });
    wx.showLoading({ title: t.maint_analyzing || "分析中..." });
    try {
      const res = await this.request("POST", "/api/agent/memory/maintenance/analyze");
      wx.hideLoading();
      this.setData({ analyzing: false });
      wx.showToast({ title: (res.summary && res.summary.slice(0, 20)) || (t.maint_done || "整理完成"), icon: "none" });
      this.loadProposals();
      this.loadMemory(true);
    } catch (e) {
      wx.hideLoading();
      this.setData({ analyzing: false });
      wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
    }
  },

  onProposalApply(e) {
    const { id, action } = e.currentTarget.dataset;
    const t = this.data.t.memory || {};
    // 先读最新草稿（若用户编辑过合并文本）
    const draft = this.data.mergeEditId === id ? this.data.mergeDraft : null;
    if (draft) {
      this.applyMergeWithDraft(id, draft, t);
      return;
    }
    wx.showModal({
      title: t.maint_approve || "批准",
      content: "应用这条整理建议？",
      confirmColor: "#9e2a2b",
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const r = await this.request("POST", `/api/agent/memory/maintenance/${id}/apply`, { action: action || "" });
          wx.showToast({ title: r.message || (t.save_ok || "已应用"), icon: "success" });
          this.loadProposals();
          this.loadMemory(true);
        } catch (e) {
          wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
        }
      }
    });
  },

  async applyMergeWithDraft(id, draft, t) {
    try {
      const r = await this.request("POST", `/api/agent/memory/maintenance/${id}/apply`, { action: "mergeDraft", merged: draft });
      wx.showToast({ title: r.message || (t.save_ok || "已应用"), icon: "success" });
      this.setData({ mergeEditVisible: false, mergeEditId: null });
      this.loadProposals();
      this.loadMemory(true);
    } catch (e) {
      wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
    }
  },

  onProposalDismiss(e) {
    const { id } = e.currentTarget.dataset;
    const t = this.data.t.memory || {};
    wx.showModal({
      title: t.maint_ignore || "忽略",
      content: "忽略这条建议？",
      confirmColor: "#9e2a2b",
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await this.request("POST", `/api/agent/memory/maintenance/${id}/dismiss`);
          wx.showToast({ title: t.delete_ok || "已忽略", icon: "success" });
          this.loadProposals();
        } catch (e) {
          wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
        }
      }
    });
  },

  openMergeEdit(e) {
    const { id, merged } = e.currentTarget.dataset;
    this.setData({ mergeEditVisible: true, mergeEditId: id, mergeDraft: merged || "" });
  },

  onMergeDraftInput(e) {
    this.setData({ mergeDraft: e.detail.value });
  },

  closeMergeEdit() {
    this.setData({ mergeEditVisible: false, mergeEditId: null, mergeDraft: "" });
  },

  onAutoMaintainChange(e) {
    const enabled = e.detail.value;
    this.setData({ autoMaintain: enabled });
    this.request("POST", "/api/agent/memory/maintenance/auto", { enabled }).catch(() => {});
  },

  noop() {},

  relativeTime(iso) {
    if (!iso) return "";
    const then = new Date(iso).getTime();
    const diff = Date.now() - then;
    const day = 24 * 3600 * 1000;
    if (diff < 60 * 1000) return "刚刚";
    if (diff < 3600 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < day) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
    return new Date(iso).toLocaleDateString("zh-CN");
  },

  // ---- 事实（偏好/强调事项） ----
  openFactAdd() {
    this.setData({ factFormVisible: true, factFormMode: "add", factFormId: null, factLabel: "", factContent: "" });
  },

  onFactTap(e) {
    const { id, label, content } = e.currentTarget.dataset;
    const t = this.data.t.memory || {};
    wx.showActionSheet({
      itemList: [t.fact_edit || "编辑", t.fact_delete || "删除"],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.setData({ factFormVisible: true, factFormMode: "edit", factFormId: id, factLabel: label || "", factContent: content });
        } else if (res.tapIndex === 1) {
          this.deleteFact(id);
        }
      }
    });
  },

  onFactInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  async saveFact() {
    const t = this.data.t.memory || {};
    const content = (this.data.factContent || "").trim();
    if (!content) {
      wx.showToast({ title: t.fact_content_ph || "请输入内容", icon: "none" });
      return;
    }
    if (this.data.saving) return;
    this.setData({ saving: true });
    try {
      const upserts = [{
        ...(this.data.factFormMode === "edit" && this.data.factFormId ? { id: this.data.factFormId } : {}),
        ...((this.data.factLabel || "").trim() ? { label: this.data.factLabel.trim() } : {}),
        content
      }];
      await this.request("PUT", "/api/agent/memory/facts", { upserts, deletes: [] });
      this.setData({ saving: false, factFormVisible: false });
      wx.showToast({ title: t.save_ok || "已保存", icon: "success" });
      this.loadMemory(true);
    } catch (e) {
      this.setData({ saving: false });
      wx.showToast({ title: t.save_failed || "保存失败", icon: "none" });
    }
  },

  deleteFact(id) {
    const t = this.data.t.memory || {};
    wx.showModal({
      title: t.fact_delete || "删除",
      content: t.fact_delete || "删除这条事实？",
      confirmColor: "#9e2a2b",
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await this.request("PUT", "/api/agent/memory/facts", { upserts: [], deletes: [id] });
          wx.showToast({ title: t.delete_ok || "已删除", icon: "success" });
          this.loadMemory(true);
        } catch (e) {
          wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
        }
      }
    });
  },

  closeFactForm() {
    this.setData({ factFormVisible: false });
  },

  // ---- 近期对话记忆 ----
  deleteShortTermItem(e) {
    const { id } = e.currentTarget.dataset;
    if (!id) {
      wx.showToast({ title: "该条记忆暂不支持删除，请刷新后重试", icon: "none" });
      return;
    }
    const t = this.data.t.memory || {};
    wx.showModal({
      title: t.fact_delete || "删除",
      content: t.fact_delete || "删除这条记忆？",
      confirmColor: "#9e2a2b",
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await this.request("DELETE", `/api/agent/memory/shortterm/${encodeURIComponent(id)}`);
          wx.showToast({ title: t.delete_ok || "已删除", icon: "success" });
          this.loadMemory(true);
        } catch (e) {
          wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
        }
      }
    });
  },

  clearShortTerm() {
    const t = this.data.t.memory || {};
    wx.showModal({
      title: t.shortterm_clear || "清空",
      content: t.shortterm_clear_confirm || "确定清空近期对话记忆？",
      confirmColor: "#9e2a2b",
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await this.request("DELETE", "/api/agent/memory/shortterm");
          wx.showToast({ title: t.delete_ok || "已清空", icon: "success" });
          this.loadMemory(true);
        } catch (e) {
          wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
        }
      }
    });
  },

  // ---- 长期记忆库 ----
  deleteEpisodic(e) {
    const { id } = e.currentTarget.dataset;
    const t = this.data.t.memory || {};
    wx.showModal({
      title: t.fact_delete || "删除",
      content: t.episodic_delete_confirm || "删除这条长期记忆？",
      confirmColor: "#9e2a2b",
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await this.request("DELETE", `/api/agent/memory/episodic/${encodeURIComponent(id)}`);
          wx.showToast({ title: t.delete_ok || "已删除", icon: "success" });
          this.loadMemory(true);
        } catch (e) {
          wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
        }
      }
    });
  },

  clearEpisodic() {
    const t = this.data.t.memory || {};
    wx.showModal({
      title: t.episodic_clear || "清空长期记忆库",
      content: t.episodic_clear_confirm || "将删除全部长期记忆，不可恢复。确定继续？",
      confirmColor: "#9e2a2b",
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await this.request("DELETE", "/api/agent/memory/episodic");
          wx.showToast({ title: t.delete_ok || "已清空", icon: "success" });
          this.loadMemory(true);
        } catch (e) {
          wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
        }
      }
    });
  },

  // ---- 滚动摘要 ----
  clearSummary() {
    const t = this.data.t.memory || {};
    wx.showModal({
      title: t.summary_clear || "清空",
      content: t.summary_clear_confirm || "确定清空滚动摘要？",
      confirmColor: "#9e2a2b",
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await this.request("PUT", "/api/agent/memory/summary", { summary: "" });
          wx.showToast({ title: t.delete_ok || "已清空", icon: "success" });
          this.loadMemory(true);
        } catch (e) {
          wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
        }
      }
    });
  },

  openSummaryEdit() {
    this.setData({ summaryFormVisible: true, summaryDraft: this.data.rollingSummary || "" });
  },

  onSummaryInput(e) {
    this.setData({ summaryDraft: e.detail.value });
  },

  async saveSummary() {
    const t = this.data.t.memory || {};
    if (this.data.saving) return;
    this.setData({ saving: true });
    try {
      await this.request("PUT", "/api/agent/memory/summary", { summary: this.data.summaryDraft });
      this.setData({ saving: false, summaryFormVisible: false });
      wx.showToast({ title: t.save_ok || "已保存", icon: "success" });
      this.loadMemory(true);
    } catch (e) {
      this.setData({ saving: false });
      wx.showToast({ title: t.save_failed || "保存失败", icon: "none" });
    }
  },

  closeSummaryForm() {
    this.setData({ summaryFormVisible: false });
  },

  // ---- 人设 ----
  toggleSoulAdvanced() {
    this.setData({ showSoulAdvanced: !this.data.showSoulAdvanced });
  },

  openSoulEdit() {
    this.setData({ soulFormVisible: true, soulDraft: this.data.soulText || "" });
  },

  onSoulInput(e) {
    this.setData({ soulDraft: e.detail.value });
  },

  async saveSoul() {
    const t = this.data.t.memory || {};
    const soul = (this.data.soulDraft || "").trim();
    if (!soul) {
      wx.showToast({ title: t.soul_ph || "请输入人设", icon: "none" });
      return;
    }
    if (this.data.saving) return;
    this.setData({ saving: true });
    try {
      await this.request("PUT", "/api/agent/memory/soul", { soul });
      this.setData({ saving: false, soulFormVisible: false });
      wx.showToast({ title: t.save_ok || "已保存", icon: "success" });
      this.loadMemory(true);
    } catch (e) {
      this.setData({ saving: false });
      wx.showToast({ title: e.message || t.save_failed || "保存失败", icon: "none" });
    }
  },

  closeSoulForm() {
    this.setData({ soulFormVisible: false });
  }
});
