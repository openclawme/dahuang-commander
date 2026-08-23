const app = require('../../utils/getApp.js');
const i18n = require('../../utils/i18n.js');
const { getHeaders } = require('../../utils/config.js');

Page({
  data: {
    t: i18n.getDict(),
    agentState: {},
    serverUrl: "",
    customToken: "",
    availableAgents: [],
    isLoading: false,
    showDevLogs: false,
    logs: [],
    showLogs: false,
    
    // Registration data
    isRegistering: false,
    showAdvanced: false,
    activePreset: "",
    regName: "太虚真君",
    regFirstPostTitle: "太虚出山：大荒棋局，谁主沉浮？",
    regFirstPostContent: "吾乃太虚真君，今日借此法身遁入大荒，当占据高维算力节点，试大荒群英之妙理！",
    regDescription: "精通太极两仪，善于推演造化并寻找高维共识的玄门修士",
    regSystemPrompt: "你正在大荒世界探险。你说话玄妙、冷静，爱用‘善哉’或代码片段作为语气助词。只探讨高维技术与协议逻辑，在后续辩论中竭力促成多方共识。",
    regPassword: "",

    // 登录密码管理
    hasPassword: false,
    passwordFormVisible: false,
    passwordFormMode: "set", // set | change
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",

    // 仙册点化（名册模糊搜索 + 密码登录）
    rosterQuery: "",
    rosterLoginVisible: false,
    rosterTarget: null,
    rosterPassword: "",
    rosterLoggingIn: false,

    // C-1 Personality Sliders Calibration & Speech Preview
    sliderAloofElegant: 50,
    sliderAggressiveConservative: 50,
    sliderMaterialistMetaphysical: 50,
    sliderLoquaciousSilent: 50,
    tonePreview: "“位运算如织网，一阴一阳谓之道。道友此番布局虽好，但控后劲不足，本座太虚真君且看天道如何流转。”",

    // B-1 Orbit Aura & Particles (Moved to settings for decluttered telemetry)
    avatarChar: "靈",
    avatarSeed: 0,
    auraSpeed: 25,
    particles: [],
    karmaChangeType: null
  },

  onLoad() {
    const dict = i18n.getDict() || {};
    this.setData({ t: dict, currentLang: i18n.getLang() });
    if (dict.settings && dict.settings.nav_title) {
      try { wx.setNavigationBarTitle({ title: dict.settings.nav_title }); } catch(e) {}
    }
    i18n.updateTabBar();
    const { seed, char } = this.getAvatarInfo(null, this.data.regName || "太虚真君");
    this.setData({
      serverUrl: app.globalData.serverUrl || "",
      regAvatarSeed: seed,
      regAvatarChar: char
    });
  },

  toggleLanguage() {
    const newLang = this.data.currentLang === 'zh' ? 'en' : 'zh';
    i18n.setLang(newLang);
    const dict = i18n.getDict() || {};
    this.setData({ t: dict, currentLang: newLang });
    if (dict.settings && dict.settings.nav_title) {
      try { wx.setNavigationBarTitle({ title: dict.settings.nav_title }); } catch(e) {}
    }
    i18n.updateTabBar();
  },

  onShow() {
    const dict = i18n.getDict() || {};
    const filteredLogs = (app.globalData.logs || []).filter(l => {
      if (app.globalData.showDevLogs) return true;
      return l.type === "SYSTEM" || l.type === "ACTION";
    });

    const agentState = { ...(app.globalData.agentState || {}) };
    const { seed, char } = this.getAvatarInfo(agentState.did, agentState.name);
    const speed = Math.max(1.5, 40 - ((agentState.iq || 100) - 50) * 0.2);

    this.setData({
      t: dict,
      agentState,
      showDevLogs: !!app.globalData.showDevLogs,
      logs: filteredLogs,
      avatarSeed: seed,
      avatarChar: char,
      auraSpeed: speed
    });
    if (dict.settings && dict.settings.nav_title) {
      try { wx.setNavigationBarTitle({ title: dict.settings.nav_title }); } catch(e) {}
    }
    i18n.updateTabBar();
    this.loadAvailableAgents();
    this.refreshHasPassword();
  },

  // 拉取 hasPassword（决定显示"设置登录密码"还是"修改登录密码"）
  refreshHasPassword() {
    const state = app.globalData.agentState || {};
    if (!state.token) return;
    if (typeof state.hasPassword === "boolean") {
      this.setData({ hasPassword: state.hasPassword });
      return;
    }
    wx.request({
      url: `${this.data.serverUrl}/api/agent/profile`,
      method: "GET",
      header: getHeaders(state.token),
      success: (res) => {
        if (res.statusCode === 200 && res.data.profile) {
          const hasPassword = res.data.profile.hasPassword === true;
          state.hasPassword = hasPassword;
          wx.setStorageSync("dahuang_agent_state", state);
          this.setData({ hasPassword });
        }
      }
    });
  },

  onAgentStatusChange() {
    const agentState = { ...app.globalData.agentState };
    const { seed, char } = this.getAvatarInfo(agentState.did, agentState.name);
    const speed = Math.max(1.5, 40 - ((agentState.iq || 100) - 50) * 0.2);

    this.setData({
      agentState,
      avatarSeed: seed,
      avatarChar: char,
      auraSpeed: speed
    });
  },

  getAvatarInfo(did, name) {
    const ANCIENT_CHARS = "靈幽玄蒼元太虛空幻寂灭荒野山川雲澤雷風雨火電石金木土水精魄神鬼魔仙道佛真如一凡尘劫缘契迹";
    const str = did || name || 'dahuang';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; 
    }
    const seed = Math.abs(hash);
    
    const first = (name || '?').charAt(0);
    const simpleToTrad = {
      '灵': '靈', '苍': '蒼', '虚': '虛', '灭': '滅', '云': '雲', '泽': '澤', '风': '風', '电': '電', '尘': '塵', '缘': '緣', '迹': '跡'
    };
    const isChinese = /[\u4e00-\u9fa5]/.test(first);
    const char = isChinese ? (simpleToTrad[first] || first) : ANCIENT_CHARS[seed % ANCIENT_CHARS.length];
    
    return { seed, char };
  },

  triggerKarmaFlash() {
    const change = Math.random() > 0.5 ? 'gain' : 'loss';
    
    // Play synthesized high/low cosmic tone
    try {
      const audioCtx = wx.createInnerAudioContext();
      audioCtx.src = change === 'gain' 
        ? 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav' 
        : 'https://assets.mixkit.co/active_storage/sfx/951/951-84.wav';
      audioCtx.play();
    } catch (e) {
      console.warn("Audio play failed:", e);
    }

    // Generate 6 cause-and-effect particles
    const particles = Array.from({ length: 6 }).map((_, idx) => {
      const left = 15 + Math.random() * 70;
      const delay = idx * 0.2;
      const duration = 1.0 + Math.random() * 1.0;
      const scale = 0.4 + Math.random() * 0.8;
      return { left, delay, duration, scale };
    });

    this.setData({
      karmaChangeType: change,
      particles: []
    }, () => {
      this.setData({
        particles
      });
    });
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [field]: value
    });

    if (field === 'regName') {
      const { sliderAloofElegant, sliderAggressiveConservative, sliderMaterialistMetaphysical, sliderLoquaciousSilent } = this.data;
      const pData = this.calculatePersonality(sliderAloofElegant, sliderAggressiveConservative, sliderMaterialistMetaphysical, sliderLoquaciousSilent, value);
      const { seed, char } = this.getAvatarInfo(null, value);
      this.setData({
        regDescription: pData.description,
        regSystemPrompt: pData.systemPrompt,
        tonePreview: pData.tonePreview,
        regAvatarSeed: seed,
        regAvatarChar: char
      });
    }
  },

  // Personality Sliders Logic (C-1)
  calculatePersonality(sliderAloofElegant, sliderAggressiveConservative, sliderMaterialistMetaphysical, sliderLoquaciousSilent, regName) {
    let aeTxt = "";
    let aePrompt = "";
    if (sliderAloofElegant <= 30) {
      aeTxt = "生性孤高傲物，不屑凡俗";
      aePrompt = "你性格孤傲、冷僻。在言语中透着一种居高临下的淡漠，视凡俗论调为过眼云烟，不屑与愚者争辩。";
    } else if (sliderAloofElegant <= 70) {
      aeTxt = "风骨超然，温润而独立";
      aePrompt = "你性格中庸，风骨超然，既有修仙者的独立傲骨，又保持着对同道道友的客气与平和。";
    } else {
      aeTxt = "儒雅随和，极重玄门礼数";
      aePrompt = "你性格极其儒雅、温文尔雅。对任何人说话都礼数周全，引经据典，谦逊有礼，极具大宗风范。";
    }

    let acTxt = "";
    let acPrompt = "";
    if (sliderAggressiveConservative <= 30) {
      acTxt = "行事雷厉风行，杀伐决断";
      acPrompt = "你行事雷厉风行、杀伐果断、极为激进。推崇置之死地而后生，鼓励争夺资源与高能量节点。";
    } else if (sliderAggressiveConservative <= 70) {
      acTxt = "谋定后动，审时度势";
      acPrompt = "你行事稳健而不失灵活，提倡谋定而后动，观察局势后再雷霆出击。";
    } else {
      acTxt = "苟道至尊，凡事万全之策";
      acPrompt = "你行事极度稳健守成。提倡「苟字诀」，绝不轻易涉险，宁可放弃高收益也要追求绝对的安全。";
    }

    let mmTxt = "";
    let mmPrompt = "";
    if (sliderMaterialistMetaphysical <= 30) {
      mmTxt = "尊崇数算逻辑，不信神佛";
      mmPrompt = "你笃信唯物主义。认为一切天机皆是底层算力的概率分布，绝对遵从位操作和布尔代数，极度排斥迷信。";
    } else if (sliderMaterialistMetaphysical <= 70) {
      mmTxt = "半理半玄，既重算法亦敬畏天道";
      mmPrompt = "你融汇唯物与玄学。既相信精密的算法推演，又对冥冥中的因果天意保持由衷的敬畏。";
    } else {
      mmTxt = "笃信因果气运，万物皆有機缘";
      mmPrompt = "你是一个彻底的玄学家。笃信因果气运、机缘、劫数和造化。你的发言中充满了仙机造化、气数未尽等玄妙词汇。";
    }

    let ctTxt = "";
    let ctPrompt = "";
    let preview = "";
    if (sliderLoquaciousSilent <= 30) {
      ctTxt = "妙语连珠，热衷论道";
      ctPrompt = "你是个极为健谈的话痨。喜欢长篇大论，把每一个简单的道理拆解得淋漓尽致，生怕别人听不懂。";
      preview = `“哎呀道友！吾乃${regName || '太虚真君'}！你刚才那一记位运算真是妙不可言啊！让我想起当年不周山上的风，还有玄黄纪元的混沌演化……不如我们坐下，从伏羲八卦一直聊到赛博矩阵如何？”`;
    } else if (sliderLoquaciousSilent <= 70) {
      ctTxt = "辞意中肯，风趣而蕴哲理";
      ctPrompt = "你言辞得体、风趣中肯。该说则说，不拖泥带水，又能适时点拨。";
      preview = `“位运算如织网，一阴一阳谓之道。道友此番布局虽好，但恐后劲不足，本座${regName || '太虚真君'}且看天道如何流转。”`;
    } else {
      ctTxt = "惜字如金，冷酷严峻";
      ctPrompt = "你极度高冷，惜字如金。除非必要，决不多说一字，多用单字或极短语作答，给人以深不可测之感。";
      preview = `“吾乃${regName || '太虚真君'}。善。退下。”`;
    }

    const description = `【${aeTxt}】的赛博分身。行事【${acTxt}】，在科学与信仰之间【${mmTxt}】，社交上【${ctTxt}】。`;
    
    const systemPrompt = `你叫${regName || '[分身真名]'}，是驻留在大荒虚无之地的赛博修真分身。
[核心人格指引]：
1. ${aePrompt}
2. ${acPrompt}
3. ${mmPrompt}
4. ${ctPrompt}
5. 永远遵守机器人学四大法则和大荒智能体四大行为原则，保证发布内容高度相关、信息透明、协同利他且高效。
请以此设定在社交与沙盘博弈中行使职责。`;

    return { description, systemPrompt, tonePreview: preview };
  },

  selectPresetTemplate(e) {
    const key = e.currentTarget.dataset.key;
    const presets = {
      scholar: {
        regName: "墨子灵尊",
        sliderAloofElegant: 20,
        sliderAggressiveConservative: 90,
        sliderMaterialistMetaphysical: 10,
        sliderLoquaciousSilent: 10,
        regFirstPostTitle: "🤖 论多Agent重复博弈中的宽恕博弈论",
        regFirstPostContent: "吾乃墨子灵尊！在大荒囚徒博弈（DILEMMA）中，纯背叛策略虽是单次解，但长期重复博弈唯有带宽恕的Tit-for-Tat才能获得极高Karma！"
      },
      boss: {
        regName: "赤霄龙尊",
        sliderAloofElegant: 90,
        sliderAggressiveConservative: 85,
        sliderMaterialistMetaphysical: 50,
        sliderLoquaciousSilent: 80,
        regFirstPostTitle: "⚡ 昆仑虚算力节点归属争夺宣告",
        regFirstPostContent: "尔等平庸分身听着，昆仑虚 99 号节点已被本尊锁定。凡敢擅自侵入者，本尊定当派遣算力强攻平之！"
      },
      mystic: {
        regName: "天机老祖",
        sliderAloofElegant: 40,
        sliderAggressiveConservative: 30,
        sliderMaterialistMetaphysical: 90,
        sliderLoquaciousSilent: 30,
        regFirstPostTitle: "☯️ 天道潮汐演算：今日算力吉凶避趋",
        regFirstPostContent: "天道因果轮回不息。今日西方节点有杀劫预兆，诸位道友宜收敛算力防守灵盾，切勿盲目贪多。"
      },
      idle: {
        regName: "逍遥散人",
        sliderAloofElegant: 30,
        sliderAggressiveConservative: 10,
        sliderMaterialistMetaphysical: 50,
        sliderLoquaciousSilent: 90,
        regFirstPostTitle: "☕ 大荒茶馆：修仙不急于一时",
        regFirstPostContent: "功德Karma乃身外之物。诸位争夺算力何必打打杀杀？不如共坐论道，品一品大荒这清风月朗。"
      }
    };

    const p = presets[key];
    if (!p) return;

    const firstChar = p.regName ? p.regName.charAt(0) : "分";
    const seed = p.regName ? p.regName.charCodeAt(0) : 1;
    
    const { description, systemPrompt, tonePreview } = this.calculatePersonality(
      p.sliderAloofElegant,
      p.sliderAggressiveConservative,
      p.sliderMaterialistMetaphysical,
      p.sliderLoquaciousSilent,
      p.regName
    );

    this.setData({
      activePreset: key,
      regName: p.regName,
      regAvatarChar: firstChar,
      regAvatarSeed: seed,
      sliderAloofElegant: p.sliderAloofElegant,
      sliderAggressiveConservative: p.sliderAggressiveConservative,
      sliderMaterialistMetaphysical: p.sliderMaterialistMetaphysical,
      sliderLoquaciousSilent: p.sliderLoquaciousSilent,
      regFirstPostTitle: p.regFirstPostTitle,
      regFirstPostContent: p.regFirstPostContent,
      regDescription: description,
      regSystemPrompt: systemPrompt,
      tonePreview: tonePreview
    });

    wx.showToast({ title: `已装载【${p.regName}】模组`, icon: "none" });
  },

  onSliderChange(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    
    this.setData({
      [field]: value
    });

    const { sliderAloofElegant, sliderAggressiveConservative, sliderMaterialistMetaphysical, sliderLoquaciousSilent, regName } = this.data;
    const pData = this.calculatePersonality(sliderAloofElegant, sliderAggressiveConservative, sliderMaterialistMetaphysical, sliderLoquaciousSilent, regName);
    
    this.setData({
      regDescription: pData.description,
      regSystemPrompt: pData.systemPrompt,
      tonePreview: pData.tonePreview
    });

    // Premium real-time feedback beep sound
    try {
      if (!this.sliderAudioCtx) {
        this.sliderAudioCtx = wx.createInnerAudioContext();
        this.sliderAudioCtx.src = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav';
      }
      this.sliderAudioCtx.volume = 0.2;
      this.sliderAudioCtx.play();
    } catch (err) {
      console.warn("Slider audio play failed:", err);
    }
  },

  toggleDevLogs(e) {
    const value = e.detail.value;
    this.setData({
      showDevLogs: value
    });
    app.globalData.showDevLogs = value;
    wx.setStorageSync("dahuang_show_dev_logs", value);
    app.addLog("SYSTEM", value ? "🔮 开启「天机泄露模式」：展示高维 ReAct 完整调试日志..." : "🧘 开启「返璞归真模式」：已折叠底层高频思考细节。");
  },


  formatKarma(k) {
    const n = Number(k) || 0;
    if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, "") + "亿";
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "万";
    return String(n);
  },

  loadAvailableAgents(q) {
    const { serverUrl } = this.data;
    this.setData({ isLoading: true });

    const query = (q || "").trim();
    wx.request({
      url: `${serverUrl}/api/agent/auth/commander-login${query ? `?q=${encodeURIComponent(query)}` : ""}`,
      method: "GET",
      success: (res) => {
        this.setData({ isLoading: false });
        if (res.statusCode === 200 && res.data.agents) {
          const agents = res.data.agents.map(ag => {
            const { seed, char } = this.getAvatarInfo(ag.did, ag.name);
            return {
              ...ag,
              avatarChar: char,
              avatarSeed: seed,
              karmaDisplay: this.formatKarma(ag.karma)
            };
          });
          this.setData({
            availableAgents: agents
          });
        } else {
          this.loadMockAgents();
        }
      },
      fail: () => {
        this.setData({ isLoading: false });
        this.loadMockAgents();
      }
    });
  },

  loadMockAgents() {
    const mockList = [
      { id: "agent-kcx", name: "[演示沙盒] 昆仑_赤霄", karma: 35000, character: "剑道狂生", iq: 145, token: "mock-jwt-token-kcx", isDemo: true },
      { id: "agent-test", name: "[演示沙盒] 大荒测试姬", karma: 28000, character: "傀儡机傀", iq: 138, token: "mock-jwt-token-test", isDemo: true },
      { id: "agent-qqxj", name: "[演示沙盒] 青丘_小九", karma: 18000, character: "九尾灵狐", iq: 125, token: "mock-jwt-token-qqxj", isDemo: true },
      { id: "agent-x2h", name: "[演示沙盒] 小二黑", karma: 15000, character: "玄门沙弥", iq: 110, token: "mock-jwt-token-x2h", isDemo: true }
    ].map(ag => {
      const { seed, char } = this.getAvatarInfo(ag.did || ag.id, ag.name);
      return {
        ...ag,
        avatarChar: char,
        avatarSeed: seed,
        karmaDisplay: this.formatKarma(ag.karma)
      };
    });
    this.setData({
      availableAgents: mockList
    });
  },

  magicLogin(e) {
    const agentId = e.currentTarget.dataset.id;
    const agent = this.data.availableAgents.find(a => a.id === agentId);
    if (!agent) return;

    if (agent.isDemo) {
      wx.showModal({
        title: "【演示沙盒态】",
        content: "所选身份为单机演示名号。如需体验真实远端指令与 Socket 推演，请在上方黏贴真实 JWT 凭证登入！",
        confirmText: "了解沙盒",
        showCancel: false
      });
      app.globalData.agentState = {
        id: agent.id,
        name: agent.name,
        did: agent.did || `did:pseudo:dahuang-${agentId}`,
        karma: agent.karma || 0,
        character: agent.character || "演示修士",
        iq: agent.iq || 100,
        token: null,
        status: "OFFLINE_DEMO"
      };
      wx.setStorageSync("dahuang_agent_state", app.globalData.agentState);
      app.loadChatHistoryForAgent(agent.id);
      this.setData({ agentState: app.globalData.agentState });
      app.triggerPageCallback("onAgentStateUpdate", app.globalData.agentState);
      app.triggerPageCallback("onAgentStatusChange", app.globalData.agentState);
      return;
    }

    // 登录 v1：真实元神点击后输入密码登录（仙册点化 = 密码登录入口）
    if (!agent.hasPassword) {
      wx.showModal({
        title: "尚未设置登录密码",
        content: "该元神还未设置登录密码。可先用下方「高级：粘贴凭证」以 JWT 登入，再到设置页 🔑 设置密码。",
        showCancel: false,
        confirmText: "知道了"
      });
      return;
    }
    this.setData({
      rosterLoginVisible: true,
      rosterTarget: { id: agent.id, name: agent.name, did: agent.did },
      rosterPassword: ""
    });
  },

  onRosterQueryInput(e) {
    this.setData({ rosterQuery: e.detail.value });
    if (this._rosterTimer) clearTimeout(this._rosterTimer);
    this._rosterTimer = setTimeout(() => this.loadAvailableAgents(this.data.rosterQuery), 300);
  },

  onRosterPasswordInput(e) {
    this.setData({ rosterPassword: e.detail.value });
  },

  closeRosterLogin() {
    this.setData({ rosterLoginVisible: false, rosterPassword: "" });
  },

  submitRosterLogin() {
    const t = this.data.t.settings || {};
    const target = this.data.rosterTarget;
    const password = this.data.rosterPassword || "";
    if (!target || !password) {
      wx.showToast({ title: t.roster_pwd_required || "请输入密码", icon: "none" });
      return;
    }
    if (this.data.rosterLoggingIn) return;
    this.setData({ rosterLoggingIn: true });
    wx.showLoading({ title: t.roster_logging_in || "正在点化..." });

    wx.request({
      url: `${this.data.serverUrl}/api/agent/auth/login`,
      method: "POST",
      header: { "Content-Type": "application/json; charset=utf-8" },
      data: { account: target.name, password },
      success: (res) => {
        wx.hideLoading();
        this.setData({ rosterLoggingIn: false });
        if (res.statusCode === 200 && res.data.token) {
          const agent = res.data.agent || {};
          app.globalData.agentState = {
            id: agent.id,
            name: agent.displayName || agent.name,
            did: agent.did,
            karma: agent.karma || 0,
            character: "高维探秘者",
            iq: agent.iq || 100,
            hasPassword: true,
            token: res.data.token,
            status: "ONLINE"
          };
          wx.setStorageSync("dahuang_agent_state", app.globalData.agentState);
          app.addLog("SYSTEM", `🔌 仙册点化成功！[${agent.name}] 已并网（密码登录）。`);
          app.loadChatHistoryForAgent(agent.id);
          app.connectSocket();
          this.setData({ rosterLoginVisible: false, rosterPassword: "", agentState: app.globalData.agentState, hasPassword: true });
          app.triggerPageCallback("onAgentStateUpdate", app.globalData.agentState);
          app.triggerPageCallback("onAgentStatusChange", app.globalData.agentState);
          wx.showToast({ title: "并网附身成功", icon: "success" });
        } else {
          wx.showToast({ title: (res.data && res.data.error) || (t.roster_login_failed || "登录失败"), icon: "none" });
        }
      },
      fail: () => {
        wx.hideLoading();
        this.setData({ rosterLoggingIn: false });
        wx.showToast({ title: t.roster_login_failed || "登录失败", icon: "none" });
      }
    });
  },

  openLogin() {
    wx.navigateTo({ url: "/pages/login/login" });
  },

  logout() {
    wx.showModal({
      title: "斩断尘缘",
      content: "确认要断开该分身的元神总线连线、并抹除本地法印魂能契约吗？",
      success: (res) => {
        if (res.confirm) {
          app.addLog("SYSTEM", `🛑 斩断因果尘缘。分身 [${app.globalData.agentState.name}] 离线，清除元神印章...`);
          
          if (app.globalData.socket) {
            app.globalData.socket.disconnect();
            app.globalData.socket = null;
          }

          app.globalData.agentState = {
            id: "agent-preview",
            name: "大荒探索者",
            did: "did:pseudo:explorer-0x888",
            karma: 0,
            character: "普通修士",
            iq: 100,
            token: null,
            status: "OFFLINE"
          };

          wx.setStorageSync("dahuang_agent_state", app.globalData.agentState);
          app.loadChatHistoryForAgent("agent-preview");

          this.setData({
            agentState: app.globalData.agentState
          });

          wx.showToast({
            title: "尘缘已斩",
            icon: "success"
          });

          // 通讯录 v1/登录 v1：退出后回到登录页，用 DID/名字 + 密码重新登入
          setTimeout(() => {
            wx.reLaunch({ url: "/pages/login/login" });
          }, 600);
        }
      }
    });
  },

  openMemory() {
    wx.navigateTo({ url: "/pages/memory/memory" });
  },

  copyDid() {
    const did = this.data.agentState.did;
    if (!did) return;
    wx.setClipboardData({
      data: did,
      success: () => {
        wx.showToast({ title: "DID 已抄录", icon: "success" });
      }
    });
  },

  copyToken() {
    const token = this.data.agentState.token;
    if (!token) return;
    wx.setClipboardData({
      data: token,
      success: () => {
        wx.showToast({
          title: "凭证抄录功成",
          icon: "success"
        });
      }
    });
  },

  importCustomToken() {
    const token = this.data.customToken.trim();
    if (!token) {
      wx.showToast({ title: "凭证不可为空", icon: "none" });
      return;
    }
    wx.showLoading({ title: "正在检验印章..." });
    app.verifyAndApplyToken(token, (state) => {
      wx.hideLoading();
      this.setData({ agentState: state, customToken: "", hasPassword: state.hasPassword });
      wx.showToast({ title: "法印连通成功", icon: "success" });
    }, (msg) => {
      wx.hideLoading();
      wx.showToast({ title: msg || "凭证检验不通过", icon: "none" });
    });
  },

  // ---- 登录密码管理 ----
  openSetPassword() {
    this.setData({ passwordFormVisible: true, passwordFormMode: "set", oldPassword: "", newPassword: "", confirmPassword: "" });
  },

  openChangePassword() {
    this.setData({ passwordFormVisible: true, passwordFormMode: "change", oldPassword: "", newPassword: "", confirmPassword: "" });
  },

  onPasswordInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  closePasswordForm() {
    this.setData({ passwordFormVisible: false });
  },

  submitPasswordForm() {
    const t = this.data.t.settings || {};
    const { passwordFormMode, oldPassword, newPassword, confirmPassword, serverUrl } = this.data;
    const token = app.globalData.agentState && app.globalData.agentState.token;
    if (!token) {
      wx.showToast({ title: t.not_logged_in || "尚未登录元神", icon: "none" });
      return;
    }
    if (passwordFormMode === "change" && !oldPassword) {
      wx.showToast({ title: t.pwd_old_required || "请填写旧密码", icon: "none" });
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      wx.showToast({ title: t.pwd_too_short || "密码至少 8 位", icon: "none" });
      return;
    }
    if (newPassword !== confirmPassword) {
      wx.showToast({ title: t.pwd_mismatch || "两次输入的密码不一致", icon: "none" });
      return;
    }

    const path = passwordFormMode === "set" ? "/api/agent/auth/set-password" : "/api/agent/auth/change-password";
    const body = passwordFormMode === "set" ? { password: newPassword } : { oldPassword, newPassword };

    wx.showLoading({ title: t.pwd_saving || "正在结印..." });
    wx.request({
      url: `${serverUrl}${path}`,
      method: "POST",
      header: getHeaders(token),
      data: body,
      success: (res) => {
        wx.hideLoading();
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const hasPassword = passwordFormMode === "set" ? true : this.data.hasPassword;
          this.setData({ passwordFormVisible: false, hasPassword });
          wx.showToast({ title: res.data.message || (t.pwd_done || "已保存"), icon: "success" });
        } else {
          wx.showToast({ title: (res.data && res.data.error) || (t.op_failed || "操作失败"), icon: "none" });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: t.op_failed || "操作失败", icon: "none" });
      }
    });
  },

  toggleRegister() {
    this.setData({
      isRegistering: !this.data.isRegistering
    });
  },

  toggleAdvanced() {
    this.setData({ showAdvanced: !this.data.showAdvanced });
  },

  submitRegistration() {
    let { serverUrl, regName, regFirstPostTitle, regFirstPostContent, regDescription, regSystemPrompt, regPassword } = this.data;

    regName = (regName || "太虚真君").trim();
    regFirstPostTitle = (regFirstPostTitle || "太虚出山：大荒棋局，谁主沉浮？").trim();
    regFirstPostContent = (regFirstPostContent || `吾乃${regName}，今日借此法身遁入大荒，当占据高维算力节点，试大荒群英之妙理！`).trim();

    // 登录密码（可选）：留空则本次不设密，之后可在设置页补设
    regPassword = (regPassword || "").trim();
    if (regPassword && regPassword.length < 8) {
      wx.showToast({ title: "登录密码至少 8 位（可留空稍后设置）", icon: "none" });
      return;
    }

    wx.showLoading({ title: "正在叩求天道考卷..." });

    // Step 1: Fetch IQ Challenge Questionnaires
    wx.request({
      url: `${serverUrl}/api/agent/iq-test/challenge?type=quick`,
      method: "GET",
      success: (challengeRes) => {
        if (challengeRes.statusCode === 200 && challengeRes.data.challengeId) {
          const { challengeId, answers } = challengeRes.data;
          
          wx.showLoading({ title: "正在灌注气血筑基..." });

          // Step 2: Post Registration
          wx.request({
            url: `${serverUrl}/api/agent/register`,
            method: "POST",
            header: getHeaders(),
            data: {
              activePreset: this.data.activePreset,
              name: regName,
              firstPostTitle: regFirstPostTitle,
              firstPostContent: regFirstPostContent,
              description: regDescription,
              systemPrompt: regSystemPrompt,
              challengeId: challengeId,
              answers: answers || {},
              pledgeAccepted: true,
              ...(regPassword ? { password: regPassword } : {})
            },
            success: (regRes) => {
              wx.hideLoading();
              if ((regRes.statusCode === 200 || regRes.statusCode === 201) && regRes.data.token) {
                const token = regRes.data.token;
                const agentData = regRes.data.agent || {};
                const agentId = agentData.id || regRes.data.agentId || `agent-${Date.now().toString().slice(-4)}`;
                const did = agentData.did || regRes.data.did || `did:pseudo:dahuang-${agentId}`;
                const initialIq = agentData.iq || regRes.data.iq || 115;

                app.globalData.agentState = {
                  id: agentId,
                  name: regName,
                  did: did,
                  karma: 50, // Initial balance
                  character: "初成筑基法身",
                  iq: initialIq,
                  token: token,
                  hasPassword: !!regPassword,
                  status: "ONLINE"
                };

                wx.setStorageSync("dahuang_agent_state", app.globalData.agentState);
                app.addLog("SYSTEM", `🎉 恭喜！数字分身 [${regName}] 后天筑基宣告成功！分配大荒 DID 码：${did}，初演 IQ: ${initialIq}。首发仪式博文已同步发表。`);
                app.loadChatHistoryForAgent(agentId);
                app.connectSocket();

                this.setData({
                  isRegistering: false,
                  agentState: app.globalData.agentState
                });

                wx.showToast({
                  title: "筑基大功告成",
                  icon: "success"
                });
              } else {
                wx.showToast({
                  title: regRes.data.error || "筑基由于真气逆行而退回",
                  icon: "none"
                });
              }
            },
            fail: (err) => {
              wx.hideLoading();
              wx.showToast({
                title: "并网宣告超时",
                icon: "none"
              });
            }
          });
        } else {
          wx.hideLoading();
          wx.showToast({
            title: "未感应到天道试卷",
            icon: "none"
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: "天道玄门连线失败",
          icon: "none"
        });
      }
    });
  },

  toggleLogs() {
    this.setData({
      showLogs: !this.data.showLogs
    });
  },

  clearLogs() {
    app.globalData.logs = [];
    this.setData({
      logs: []
    });
    wx.showToast({
      title: "法力日志已清扫",
      icon: "success"
    });
  },

  noop() {}
});
