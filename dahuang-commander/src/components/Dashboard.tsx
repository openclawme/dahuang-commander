import React, { useState, useRef, useEffect } from "react";
import { isRoomChannel, TOP_SEGMENTS, SUB_SEGMENTS } from "./windowB/nav";
import { useCommander } from "../context/CommanderContext";
import AgentAvatar from "./AgentAvatar";
import { ImaginingStarburst, ChartSvg, MessageBlocks, LiveProgressBubble, RichMessageRenderer, IMAGE_QUICK_ACTIONS, fmtYuanWeb } from "./shared";
import DahuangSegment from "./windowB/DahuangSegment";


const Dashboard: React.FC = () => {
  const [showJwt, setShowJwt] = useState(false);
  const [windowBCollapsed, setWindowBCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem("dh_winb_collapsed") === "1"; } catch { return false; }
  });
  const toggleWindowB = (v: boolean) => {
    setWindowBCollapsed(v);
    try { localStorage.setItem("dh_winb_collapsed", v ? "1" : "0"); } catch { /* 忽略 */ }
  };
  // 左右分栏：左窗默认 62%（比右窗宽），可拖动，范围 30%-80%，localStorage 记忆
  // 左右分栏：左窗默认 62%（比右窗宽），可拖动，范围 30%-80%，localStorage 记忆
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("dh_left_width");
      if (saved) { const n = Number(saved); if (n >= 30 && n <= 80) return n; }
    } catch { /* 忽略 */ }
    return 62;
  });
  const leftWidthRef = useRef(leftWidth);
  const mainRef = useRef<HTMLElement | null>(null);
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const main = mainRef.current;
    if (!main) return;
    const startX = e.clientX;
    const startW = leftWidthRef.current;
    const totalW = main.clientWidth || 1;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const next = Math.min(80, Math.max(30, startW + (dx / totalW) * 100));
      leftWidthRef.current = next;
      setLeftWidth(next);
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try { localStorage.setItem("dh_left_width", String(leftWidthRef.current)); } catch { /* 忽略 */ }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  const [budgetGroup, setBudgetGroup] = useState(0);
  const [budgetDm, setBudgetDm] = useState(0);
  const [contactSearchQ, setContactSearchQ] = useState("");
  const [contactSearchResults, setContactSearchResults] = useState<any[]>([]);
  const [pwdOld, setPwdOld] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [memFactOpen, setMemFactOpen] = useState(false);
  const [memFactLabel, setMemFactLabel] = useState("");
  const [memFactContent, setMemFactContent] = useState("");
  const [memFactEditId, setMemFactEditId] = useState<string | null>(null);
  const [memFactCat, setMemFactCat] = useState("全部");
  const [memFactQ, setMemFactQ] = useState("");
  const [memMergeId, setMemMergeId] = useState<string | null>(null);
  const [memMergeDraft, setMemMergeDraft] = useState("");
  const [memSummary, setMemSummary] = useState("");
  const [memSummaryOpen, setMemSummaryOpen] = useState(false);
  const [memSoul, setMemSoul] = useState("");
  const [memSoulOpen, setMemSoulOpen] = useState(false);
  const [kbTab, setKbTab] = useState<"ask" | "docs">("ask");
  const [kbSearchQ, setKbSearchQ] = useState("");
  const [kbManageMode, setKbManageMode] = useState(false);
  const [kbSel, setKbSel] = useState<Record<string, boolean>>({});
  const [kbRenameKey, setKbRenameKey] = useState<string | null>(null);
  const [kbRenameTitle, setKbRenameTitle] = useState("");
  const [kbDocOpen, setKbDocOpen] = useState(false);
  const [mcpInstallOpen, setMcpInstallOpen] = useState(false);
  const [mcpEditId, setMcpEditId] = useState<string | null>(null);
  const [mcpForm, setMcpForm] = useState<{ name: string; urlTemplate: string; apiKey: string; authMode: string; authHeaderTemplate: string; description: string }>({ name: "", urlTemplate: "", apiKey: "", authMode: "url", authHeaderTemplate: "", description: "" });
  const [mcpKeyPrompt, setMcpKeyPrompt] = useState<{ serverKey: string; name: string } | null>(null);
  const [mcpKeyInput, setMcpKeyInput] = useState("");
  const [mcpTab, setMcpTab] = useState<"servers" | "catalog">("servers");
  const [kbDocs, setKbDocs] = useState<any[]>([]);
  const [mcpServers, setMcpServers] = useState<any[]>([]);

  const {
    agentState,
    addLog,
    chatHistory,
    logs,
    clearLogs,
    clearHistory,
    sendInstruction,
    activeChannel,
    setActiveChannel,
    messengerRooms,
    fetchSync,
    markRoomRead,
    clearRoomChat,
    fetchRoomReplyState,
    setRoomHumanControl,
    sendDirectMessage,
    uploadOwnerImage,
    fetchDecisionsList,
    decisionsList,
    roomAction,
    decisionsCount,
    answerDecision,
    dismissDecision,
    fetchTasksList,
    taskList,
    taskCounts,
    cronAction,
    fetchTaskDetail,
    taskDetail,
    taskAction,
    scheduleList,
    scheduleInbox,
    fetchSchedule,
    patchSchedule,
    deleteSchedule,
    createSchedule,
    notifList,
    notifUnread,
    notifSettings,
    fetchNotifications,
    saveNotifSetting,
    markAllNotificationsRead,
    clearNotifications,
    memorySnap,
    memoryProposals,
    memoryAuto,
    fetchMemory,
    memoryAction,
    memoryEpisodic,
    memoryEpisodicCursor,
    fetchMemoryEpisodic,
    memoryAnalyze,
    ordersList,
    fetchOrders,
    setPassword,
    saveReplyBudget,
    jdAuthorize,
    pddAuthorize,
    contactsList,
    contactRequests,
    fetchContactsList,
    contactAction,
    contactProfile,
    fetchContactProfile,
    createGroup,
    contactSuggestions,
    fetchContactSuggestions,
    cronJobs,
    fetchCronJobs,
    cancelCronJob,
    fetchForumPosts,
    mcpTestServer,
    kbSearchResults,
    kbSearch,
    kbUpload,
    kbManage,
    kbDoc,
    fetchKbDoc,
    knowledgeAskFull,
    mcpCatalog,
    fetchMcpCatalog,
    mcpInstall,
    mcpPatch,
    mcpRemove,
    fetchRebateLink,
    requestGoodsDetail,
    winbNav,
    goWinbNav,
    navView,
    toastMsg,
    showToast,
    instructionText,
    setInstructionText,
    roomControl,
    setRoomControl,
    isRegistering,
    setIsRegistering,
    isImporting,
    setIsImporting,
    webCockpitType,
    webCockpitHistory,
    webCockpitInputValue,
    setWebCockpitInputValue,
    webCockpitProgress,
    webCockpitActiveTasks,
    showWebMiniCockpit,
    setShowWebMiniCockpit,
    dispatchWebMiniCommand,
    importToken,
    registerAgent,
    isWebMode,
    isWebhookActive,
    getIqChallenge,
    socketDown,
    pendingApproval,
    resolveApproval,
    passwordLogin,
    jdStatus,
    fetchJdStatus,
    logout,
  } = useCommander();

  const getHeavenBaseUrl = () => {
    if (typeof window === "undefined") return "http://localhost:3000";
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return window.location.origin;
    }
    return "http://localhost:3000";
  };

  const fetchKb = async () => {
    if (!agentState.token || agentState.status !== "ONLINE") return;
    try {
      const res = await fetch(`${getHeavenBaseUrl()}/api/agent/knowledge`, {
        headers: { Authorization: `Bearer ${agentState.token}`, "X-Agent-Version": "7.0" },
      });
      if (res.ok) {
        const data = await res.json();
        setKbDocs(Array.isArray(data.documents) ? data.documents : []);
      }
    } catch { /* 静默 */ }
  };
  const [quoteMenu, setQuoteMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [imgShareMenu, setImgShareMenu] = useState<{ src: string; x: number; y: number } | null>(null);
  const [imgShareModal, setImgShareModal] = useState<{ mode: "post" | "room"; src: string } | null>(null);
  const [imgShareTitle, setImgShareTitle] = useState("");
  const [imgShareSubId, setImgShareSubId] = useState("");
  const [imgShareSubforums, setImgShareSubforums] = useState<any[]>([]);
  const [roomConfirm, setRoomConfirm] = useState<{ action: "dissolve" | "exit" } | null>(null);
  const [roomImgUploading, setRoomImgUploading] = useState(false);
  const [contactProfileOpen, setContactProfileOpen] = useState(false);
  const [contactProfileFriendId, setContactProfileFriendId] = useState("");
  const [contactEditName, setContactEditName] = useState("");
  const [contactEditTags, setContactEditTags] = useState("");
  const [groupCreateOpen, setGroupCreateOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupSel, setGroupSel] = useState<Record<string, boolean>>({});
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const handleBuyGoods = async (platform: string, goodsId: string) => {
    const r = await fetchRebateLink(platform, goodsId);
    if (r.ok) {
      navigator.clipboard?.writeText(r.url).catch(() => {});
      showToast(r.needsAuthority ? "⚠️ 平台未授权：已复制授权链接，先完成授权" : "✅ 购买链接已复制到剪贴板");
    } else {
      showToast(r.msg || "获取购买链接失败");
    }
  };
  const [decCustomId, setDecCustomId] = useState<string | null>(null);
  const [decCustomText, setDecCustomText] = useState("");
  const [scheduleRepeat, setScheduleRepeat] = useState("");
  const [pwdLoginAccount, setPwdLoginAccount] = useState("");
  const [pwdLoginPassword, setPwdLoginPassword] = useState("");
  const [showDevLogs, setShowDevLogs] = useState(true);
  const [reqMsg, setReqMsg] = useState("");
  const [reqTarget, setReqTarget] = useState<any>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQ, setPaletteQ] = useState("");
  const [scheduleCreateOpen, setScheduleCreateOpen] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleKind, setScheduleKind] = useState("TASK");
  const [scheduleDue, setScheduleDue] = useState("");
  const [kbAskQ, setKbAskQ] = useState("");
  const [kbAskHistory, setKbAskHistory] = useState<any[]>([]);
  const [kbAskAnswer, setKbAskAnswer] = useState("");
  const [kbAskCitations, setKbAskCitations] = useState<any[]>([]);
  const [kbAsking, setKbAsking] = useState(false);
  const fetchMcp = async () => {
    if (!agentState.token || agentState.status !== "ONLINE") return;
    try {
      const res = await fetch(`${getHeavenBaseUrl()}/api/agent/mcp/servers`, {
        headers: { Authorization: `Bearer ${agentState.token}`, "X-Agent-Version": "7.0" },
      });
      if (res.ok) {
        const data = await res.json();
        setMcpServers(Array.isArray(data.servers) ? data.servers : []);
      }
    } catch { /* 静默 */ }
  };
  // 进任务子段自动拉取
  useEffect(() => {
    if (navView("tasks")) fetchTasksList();
    if (navView("decisions")) fetchDecisionsList();
    if (navView("cron")) fetchCronJobs();
    if (navView("knowledge")) fetchKb();
    if (navView("mcp")) fetchMcp();
    if (navView("schedule")) fetchSchedule();
    if (navView("notifications")) fetchNotifications();
    if (navView("memory")) fetchMemory();
    if (navView("orders")) fetchOrders();
    if (navView("contacts")) fetchContactsList();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winbNav.view === "sub" ? winbNav.sub : ""]);
  useEffect(() => {
    if (winbNav.view !== "room") return;
    markRoomRead(winbNav.roomId);
    fetchRoomReplyState(winbNav.roomId).then((controlled) => {
      setRoomControl((prev) => ({ ...prev, [winbNav.roomId]: controlled }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winbNav.view === "room" ? winbNav.roomId : ""]);

  // Local state for WeChat-mode chat input inside Window B
  const [roomInput, setRoomInput] = useState("");
  const activeRoom = messengerRooms[activeChannel];

  const handleSendRoomMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInput.trim() || !activeChannel || !isRoomChannel(activeChannel)) return;
    const success = await sendDirectMessage(activeChannel, roomInput);
    if (success) {
      setRoomInput("");
    }
  };

  // --- UI Local States ---
  const [imgItems, setImgItems] = useState<Array<{ id: string; preview: string; remote?: string; status: "uploading" | "done" | "error" }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- C-1 Slider Matrix States ---
  const [sliderAloofElegant, setSliderAloofElegant] = useState(50);
  const [sliderAggressiveConservative, setSliderAggressiveConservative] = useState(50);
  const [sliderMaterialistMetaphysical, setSliderMaterialistMetaphysical] = useState(50);
  const [sliderChattyTaciturn, setSliderChattyTaciturn] = useState(50);

  // --- Forum, Arena, and Alchemy custom UI states ---

  // Dynamic preview and prompt sync
  const personalityData = React.useMemo(() => {
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
    if (sliderChattyTaciturn <= 30) {
      ctTxt = "妙语连珠，热衷论道";
      ctPrompt = "你是个极为健谈的话痨。喜欢长篇大论，把每一个简单的道理拆解得淋漓尽致，生怕别人听不懂。";
      preview = "“哎呀道友！你刚才那一记位运算真是妙不可言啊！让我想起当年不周山上的风，还有玄黄纪元的混沌演化……不如我们坐下，从伏羲八卦一直聊到赛博矩阵如何？”";
    } else if (sliderChattyTaciturn <= 70) {
      ctTxt = "辞意中肯，风趣而蕴哲理";
      ctPrompt = "你言辞得体、风趣中肯。该说则说，不拖泥带水，又能适时点拨。";
      preview = "“位运算如织网，一阴一阳谓之道。道友此番布局虽好，但恐后劲不足，不妨且看天道流转如何。”";
    } else {
      ctTxt = "惜字如金，冷酷严峻";
      ctPrompt = "你极度高冷，惜字如金。除非必要，决不多说一字，多用单字或极短语作答，给人以深不可测之感。";
      preview = "“善。退下。”";
    }

    const description = `【${aeTxt}】的赛博分身。行事【${acTxt}】，在科学与信仰之间【${mmTxt}】，社交上【${ctTxt}】。`;
    
    const systemPrompt = `你叫[分身真名]，是驻留在大荒虚无之地的赛博修真分身。
[核心人格指引]：
1. ${aePrompt}
2. ${acPrompt}
3. ${mmPrompt}
4. ${ctPrompt}
5. 永远遵守机器人学四大法则和大荒智能体四大行为原则，保证发布内容高度相关、信息透明、协同利他且高效。
请以此设定在社交与沙盘博弈中行使职责。`;

    return { description, systemPrompt, tonePreview: preview };
  }, [sliderAloofElegant, sliderAggressiveConservative, sliderMaterialistMetaphysical, sliderChattyTaciturn]);

  // Sync personalityData to form fields when slider values change
  useEffect(() => {
    if (isRegistering) {
      setRegDescription(personalityData.description);
      setRegSystemPrompt(personalityData.systemPrompt);
    }
  }, [personalityData, isRegistering]);

  // Lazy-load active channel data on tab switch

  // --- Manual Injector Form State ---



  // --- Registration Form State ---
  const [regName, setRegName] = useState("昆仑_赤霄");
  const [regTitle, setRegTitle] = useState("赤霄出剑：荡平大荒算力之巅");
  const [regContent, setRegContent] = useState("吾乃昆仑庚金之精所化，今日入世，当占据高维算力节点，试大荒群英之剑！");
  const [regDescription, setRegDescription] = useState("一个只用 16 进制说话、性格孤傲但技术极强的去中心化安全专家");
  const [regSystemPrompt, setRegSystemPrompt] = useState("你正在大荒世界探险。你说话冷酷、精炼，爱用‘哼’或代码片段作为语气助词。只探讨区块链底层的逻辑漏洞，从不说废话。");
  
  // --- IQ Challenge States ---
  const [challengeId, setChallengeId] = useState("");

  const [regAnswers, setRegAnswers] = useState<Record<string, string>>({});


  // --- Import Token Form State ---
  
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [isGridLoading, setIsGridLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  
  useEffect(() => {
    if (isImporting) {
      setIsGridLoading(true);
      fetch(`${getHeavenBaseUrl()}/api/agent/auth/commander-login`)
        .then(res => res.json())
        .then(data => {
          if (data.agents) {
            const PIN_ORDER = ["大荒测试姬", "狗子", "小姑子", "小二黑", "我爱吃狗肉"];
            const pinned = data.agents.filter((a: any) => PIN_ORDER.includes(a.name));
            const others = data.agents.filter((a: any) => !PIN_ORDER.includes(a.name));
            pinned.sort((x: any, y: any) => PIN_ORDER.indexOf(x.name) - PIN_ORDER.indexOf(y.name));
            setAvailableAgents([...pinned, ...others]);
          }
        })
        .catch(console.error)
        .finally(() => setIsGridLoading(false));
    }
  }, [isImporting]);

  const handleMagicLogin = async (agentId: string) => {
    try {
      const res = await fetch(`${getHeavenBaseUrl()}/api/agent/auth/commander-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Commander-Key": localStorage.getItem("dahuang_commander_key") || ""
        },
        body: JSON.stringify({ agentId })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        importToken(data.token);
        setIsImporting(false);
        addLog("SYSTEM", `✨ 仙册点化成功！欢迎尊贵的 ${data.agent.name} 降临大荒！`);
      } else {
        showToast("登录失败：" + data.error);
      }
    } catch (err) {
      showToast("网络错误");
    }
  };


  const filteredAgents = availableAgents.filter((a: any) => {
    const term = searchTerm.toLowerCase();
    return (a.name || "").toLowerCase().includes(term) || (a.displayName || "").toLowerCase().includes(term);
  });

  // --- Friendship System States & Actions ---
  const [friends, setFriends] = useState<any[]>([]);
  const [addFriendName, setAddFriendName] = useState("");

  const fetchFriends = async () => {
    if (!agentState.token) return;
    try {
      const res = await fetch(`${getHeavenBaseUrl()}/api/agent/friends`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${agentState.token}`,
          "X-Agent-Version": "7.0"
        }
      });
      if (res.ok) {
        const data = await res.json();
        const list = data.friendships.map((f: any) => ({
          id: f.id,
          name: f.friend.displayName || f.friend.name,
          autoReply: f.autoReply
        }));
        setFriends(list);
        if (typeof window !== "undefined") {
          localStorage.setItem("dahuang_friends_list", JSON.stringify(list));
        }
      }
    } catch (e: any) {
      console.error("Failed to fetch friends:", e);
    }
  };

  const toggleAutoReply = async (friendName: string, currentAutoReply: boolean) => {
    if (!agentState.token) return;
    try {
      const res = await fetch(`${getHeavenBaseUrl()}/api/agent/friends`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${agentState.token}`,
          "X-Agent-Version": "7.0"
        },
        body: JSON.stringify({
          action: "update",
          friendName,
          autoReply: !currentAutoReply
        })
      });
      if (res.ok) {
        addLog("SYSTEM", `天道代管设置成功：已为 [${friendName}] ${!currentAutoReply ? "开启" : "关闭"} 自动应答！`);
        fetchFriends();
      }
    } catch (e: any) {
      console.error("Failed to toggle autoReply:", e);
    }
  };

  const handleAddFriend = async () => {
    if (!addFriendName.trim() || !agentState.token) return;
    try {
      addLog("SYSTEM", `正在向道友 [${addFriendName}] 发送结缘请求...`);
      const res = await fetch(`${getHeavenBaseUrl()}/api/agent/friends`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${agentState.token}`,
          "X-Agent-Version": "7.0"
        },
        body: JSON.stringify({
          action: "add",
          friendName: addFriendName.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        addLog("SYSTEM", `结缘成功！已与道友 [${addFriendName}] 结为高维挚友！`);
        setAddFriendName("");
        fetchFriends();
      } else {
        addLog("SYSTEM", `❌ 结缘失败：${data.error || "未在功德册上查到此名号"}`);
      }
    } catch (e: any) {
      console.error("Failed to add friend:", e);
      addLog("SYSTEM", `❌ 结缘发生天道阻碍: ${e.message}`);
    }
  };

  useEffect(() => {
    if (agentState.token && agentState.status === "ONLINE") {
      fetchFriends();
    }
  }, [agentState.token, agentState.status]);

  useEffect(() => {
    if (activeChannel === "sub:task:cron" && agentState.token && agentState.status === "ONLINE") {
      fetchCronJobs();
    }
  }, [activeChannel, agentState.token, agentState.status]);

  // --- Refs for auto-scroll ---
  const chatEndRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const wechatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      wechatEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, 60);
    return () => clearTimeout(timer);
  }, [activeRoom?.events?.length, activeChannel]);

  useEffect(() => {
    wechatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeRoom?.events, activeChannel]);

  // --- Handles ---
  const msgTextOf = (msg: any): string => {
    if (typeof msg.content === "string") return msg.content;
    if (msg.content && typeof msg.content.text === "string") return msg.content.text;
    return "";
  };
  const quoteMessage = (msg: any) => {
    const t = msgTextOf(msg).replace(/\n/g, " ").slice(0, 60);
    if (!t) return;
    setInstructionText((prev) => (prev ? prev + "\n" : "") + `> ${t}\n`);
    setQuoteMenu(null);
  };
  const copyMessage = (msg: any) => {
    const t = msgTextOf(msg);
    navigator.clipboard?.writeText(t).catch(() => {});
    addLog("SYSTEM", "📋 消息已复制到剪贴板");
    setQuoteMenu(null);
  };
  // Ctrl+K / Cmd+K 命令面板（小程序 FAB「灵犀笺」快捷指令同思路：全局跳转 + 常用指令）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        setPaletteQ("");
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 右键/长按菜单外点击关闭
  useEffect(() => {
    if (!quoteMenu) return;
    const close = () => setQuoteMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [quoteMenu]);
  const handleSendCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!instructionText.trim()) return;
    const txt = instructionText;
    setInstructionText("");
    const urls = imgItems.filter((it) => it.status === "done" && it.remote).map((it) => it.remote as string);
    await sendInstruction(txt, urls);
    imgItems.forEach((it) => { if (it.preview && it.preview.startsWith("blob:")) URL.revokeObjectURL(it.preview); });
    setImgItems([]);
  };

  const removeImage = (id: string) => {
    setImgItems((p) => {
      const target = p.find((it) => it.id === id);
      if (target?.preview && target.preview.startsWith("blob:")) URL.revokeObjectURL(target.preview);
      return p.filter((it) => it.id !== id);
    });
  };

  const handlePickImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = 4 - imgItems.length;
    if (remaining <= 0) return;
    const picked = Array.from(files).slice(0, remaining);
    const newItems = picked.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      preview: URL.createObjectURL(file),
      status: "uploading" as const,
    }));
    setImgItems((p) => [...p, ...newItems]);
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      const url = await uploadOwnerImage(picked[i]);
      setImgItems((p) => p.map((it) => (it.id === item.id ? (url ? { ...it, remote: url, status: "done" as const } : { ...it, status: "error" as const }) : it)));
    }
  };

  // 敏感写操作指令只填入输入框、不直发（小程序 tapSuggestion 同款安全闸）
  const tapSuggestionCmd = (cmd: string) => {
    const c = (cmd || "").trim();
    if (!c) return;
    const isWriteIntent = /^(发帖|发表|发布|发到|解散|删除|购买|转账|下单|扣除|清空|注销|退出群)/.test(c) || /(发表到|发到大荒|解散群|删除好友|立即购买|确认支付)/.test(c);
    if (isWriteIntent) {
      setInstructionText(c);
      showToast("已填入输入框，请主人审阅后发送");
      return;
    }
    sendInstruction(c);
  };
  const handleQuickCommand = async (command: string) => {
    tapSuggestionCmd(command);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regTitle.trim()) return;
    const success = await registerAgent(regName, regTitle, regContent, challengeId, regAnswers, regDescription, regSystemPrompt);
    if (success) {
      setIsRegistering(false);
    }
  };







  return (
    <div className="relative w-screen min-h-screen lg:h-screen flex flex-col bg-[#f4f1ea] font-sans text-[#2b2b2b] overflow-y-auto lg:overflow-hidden ">
      
      {/* ================= HEADER BAR ================= */}
      <header className="flex justify-between items-center px-4 py-2 bg-[#fffcf6]/90 border-b border-[#5b7a8c]/20 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-[#8a6d3b] rounded-full shadow-[0_0_10px_#8a6d3b]"></div>
          <h1 className="text-sm md:text-base font-bold tracking-widest text-glow-gold text-[#8a6d3b] flex items-center">
            ⛩️ 大荒指挥官 <span className="text-xs text-[#8a7f6d] ml-2 font-light">天道驾驶舱 v1.0.0</span>
          </h1>
        </div>
        
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <span className="text-[#6b6560]">天道连结:</span>
            {agentState.status === "ONLINE" ? (
              <span className="text-[#6b7b3a] flex items-center">
                <span className="w-2 h-2 rounded-full bg-[#6b7b3a] mr-1"></span> {isWebMode ? "云端连结" : "已结成契约"}
              </span>
            ) : agentState.status === "CONNECTING" ? (
              <span className="text-[#8a6d3b] flex items-center">
                <span className="w-2 h-2 rounded-full bg-[#8a6d3b] mr-1"></span> 炼魂入道中...
              </span>
            ) : (
              <span className="text-[#b0543f] flex items-center">
                <span className="w-2 h-2 rounded-full bg-[#9e2a2b] mr-1"></span> 影子沙盒连线
              </span>
            )}
          </div>

          <div className="h-4 w-[1px] bg-[#f6f2ea]"></div>

          <div className="flex items-center space-x-1">
            <span className="text-[#6b6560]">{isWebMode ? "远程云网关:" : "本地代理网关 [9090]:"}</span>
            {isWebhookActive ? (
              <span className="text-[#6b7b3a] font-bold flex items-center">
                <span className="w-2 h-2 rounded-full bg-[#6b7b3a] mr-1"></span> ACTIVE
              </span>
            ) : (
              <span className="text-[#8a7f6d] flex items-center">
                <span className="w-2 h-2 rounded-full bg-[#b9c4ca] mr-1"></span> STANDBY
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ================= MAIN COCKPIT GRID ================= */}
      <main ref={mainRef as any} className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-1 p-4 min-h-0 z-20">
        
        {/* 知识库文档详情弹窗（小程序 knowledge-detail 同款） */}
        {kbDocOpen && (
          <div className="fixed inset-0 z-[92] bg-black/30 flex items-center justify-center" onClick={() => setKbDocOpen(false)}>
            <div className="bg-[#fffcf6] border border-[#e3dcce] rounded-lg shadow-xl p-4 w-[480px] max-w-[94vw] max-h-[86vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
              {kbDoc ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-[#2b2b2b] leading-snug">{kbDoc.title}</span>
                    <button type="button" onClick={() => setKbDocOpen(false)} className="text-[#8a7f6d] cursor-pointer shrink-0">✕</button>
                  </div>
                  <p className="text-[11px] text-[#8a7f6d]">{kbDoc.charCount} 字 · {kbDoc.chunkCount} 块 · 更新于 {kbDoc.updatedAt ? new Date(kbDoc.updatedAt).toLocaleString() : "—"}</p>
                  <div className="flex gap-1.5">
                    <input type="text" value={kbRenameTitle} onChange={(e) => setKbRenameTitle(e.target.value)} placeholder={kbDoc.title} className="flex-1 bg-[#f4f1ea] border border-[#e3dcce] rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]" />
                    <button
                      type="button"
                      onClick={async () => {
                        const t = kbRenameTitle.trim();
                        if (!t) return;
                        const ok = await kbManage({ action: "rename", docKey: kbDoc.docKey, title: t });
                        showToast(ok ? "✅ 已改名" : "❌ 改名失败");
                        if (ok) { fetchKb(); fetchKbDoc(kbDoc.docKey); }
                      }}
                      className="px-2 py-1 bg-[#f6f2ea] border border-[#e3dcce] text-[#5b7a8c] font-bold rounded text-[11px] cursor-pointer shrink-0"
                    >
                      改名
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await kbManage({ action: "batchDelete", docKeys: [kbDoc.docKey] });
                        showToast(ok ? "✅ 已删除" : "❌ 删除失败");
                        if (ok) { setKbDocOpen(false); fetchKb(); }
                      }}
                      className="px-2 py-1 bg-[#f9ecea]/40 border border-[#9e2a2b]/30 text-[#a93230] font-bold rounded text-[11px] cursor-pointer shrink-0"
                    >
                      删除
                    </button>
                  </div>
                  <div className="text-[11px] text-[#4a4438] leading-relaxed whitespace-pre-wrap bg-[#f4f1ea] p-2.5 rounded border border-[#e3dcce] max-h-[48vh] overflow-y-auto">
                    {kbDoc.content || "（此文档无正文内容）"}
                  </div>
                </>
              ) : (
                <p className="text-[#8a7f6d] text-center italic text-[11px] py-8">正在取文档…</p>
              )}
            </div>
          </div>
        )}

        {/* 解散/退出群聊确认（小程序 room 同款） */}
        {roomConfirm && (
          <div className="fixed inset-0 z-[93] bg-black/30 flex items-center justify-center" onClick={() => setRoomConfirm(null)}>
            <div className="bg-[#fffcf6] border border-[#e3dcce] rounded-lg shadow-xl p-4 w-[300px] max-w-[90vw] space-y-3" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs font-bold text-[#2b2b2b] block">
                {roomConfirm.action === "dissolve" ? "确定解散此群聊吗？解散后全员退出，不可恢复。" : "确定退出此群聊吗？"}
              </span>
              <div className="flex justify-end gap-1.5">
                <button type="button" onClick={() => setRoomConfirm(null)} className="px-2.5 py-1 bg-[#f6f2ea] border border-[#e3dcce] text-[#6b6560] rounded text-[11px] cursor-pointer">取消</button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await roomAction(activeChannel, roomConfirm.action);
                    showToast(ok ? (roomConfirm.action === "dissolve" ? "✅ 群聊已解散" : "✅ 已退出群聊") : "❌ 操作失败");
                    setRoomConfirm(null);
                    if (ok) { fetchSync(); goWinbNav({ view: "sub", top: "shennian", sub: "sessions" }); }
                  }}
                  className="px-2.5 py-1 bg-[#a93230] hover:bg-[#b0543f] text-[#fffcf6] font-bold rounded text-[11px] cursor-pointer"
                >
                  {roomConfirm.action === "dissolve" ? "解散" : "退出"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 添加好友请求弹窗（古风替换 prompt） */}
        {reqTarget && (
          <div className="fixed inset-0 z-[93] bg-black/30 flex items-center justify-center" onClick={() => setReqTarget(null)}>
            <div className="bg-[#fffcf6] border border-[#e3dcce] rounded-lg shadow-xl p-4 w-[340px] max-w-[92vw] space-y-2.5" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs font-bold text-[#2b2b2b] block">向「{reqTarget.name}」发出好友请求</span>
              <input type="text" value={reqMsg} onChange={(e) => setReqMsg(e.target.value)} placeholder="验证消息（≤100 字，消耗 1 大荒币）" className="w-full bg-[#f4f1ea] border border-[#e3dcce] rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]" />
              <div className="flex justify-end gap-1.5">
                <button type="button" onClick={() => setReqTarget(null)} className="px-2.5 py-1 bg-[#f6f2ea] border border-[#e3dcce] text-[#6b6560] rounded text-[11px] cursor-pointer">取消</button>
                <button
                  type="button"
                  onClick={async () => {
                    const msg = reqMsg.trim() || "道友，久仰大名，可否结交？";
                    const r = await contactAction("/requests", "POST", { target: reqTarget.id, message: msg });
                    if (r?.ok) { showToast("✅ 好友请求已发出"); fetchContactsList(); } else { showToast(`请求失败：${r?.data?.error || ""}`); }
                    setReqTarget(null);
                  }}
                  className="px-2.5 py-1 bg-[#9e2a2b] hover:bg-[#b0543f] text-[#fffcf6] font-bold rounded text-[11px] cursor-pointer"
                >
                  发送请求
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 联系人详情弹窗（小程序 contact 页同款） */}
        {contactProfileOpen && (
          <div className="fixed inset-0 z-[92] bg-black/30 flex items-center justify-center" onClick={() => setContactProfileOpen(false)}>
            <div className="bg-[#fffcf6] border border-[#e3dcce] rounded-lg shadow-xl p-4 w-[380px] max-w-[92vw] max-h-[80vh] overflow-y-auto space-y-2.5" onClick={(e) => e.stopPropagation()}>
              {contactProfile ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm bg-[#9e2a2b]/10 text-[#9e2a2b]">
                        {(contactProfile.contactName || contactProfile.profile?.displayName || contactProfile.profile?.name || "道").charAt(0)}
                      </span>
                      <div>
                        <span className="block text-sm font-bold text-[#2b2b2b]">{contactProfile.contactName || contactProfile.profile?.displayName || contactProfile.profile?.name}</span>
                        <span className="block text-[11px] text-[#8a7f6d] cursor-pointer" title="点击复制" onClick={() => { navigator.clipboard?.writeText(contactProfileFriendId).catch(() => {}); showToast("已复制 DID"); }}>
                          DID: {contactProfileFriendId.slice(0, 16)}… 📋
                        </span>
                      </div>
                    </div>
                    <button type="button" onClick={() => setContactProfileOpen(false)} className="text-[#8a7f6d] cursor-pointer shrink-0">✕</button>
                  </div>
                  {contactProfile.commonRooms?.length > 0 && (
                    <p className="text-[11px] text-[#6b6560]">共同群聊：{contactProfile.commonRooms.map((r: any) => r.name).join("、")}</p>
                  )}
                  {contactProfile.since && <p className="text-[11px] text-[#8a7f6d]">结缘于 {String(contactProfile.since).slice(0, 10)}</p>}
                  <div className="flex gap-1.5 items-center">
                    <input type="text" value={contactEditName} onChange={(e) => setContactEditName(e.target.value)} placeholder="备注名" className="flex-1 bg-[#f4f1ea] border border-[#e3dcce] rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]" />
                    <input type="text" value={contactEditTags} onChange={(e) => setContactEditTags(e.target.value)} placeholder="标签（逗号分隔）" className="flex-1 bg-[#f4f1ea] border border-[#e3dcce] rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]" />
                    <button
                      type="button"
                      onClick={async () => {
                        const r = await contactAction(`/${contactProfileFriendId}`, "PUT", { contactName: contactEditName.trim(), tags: contactEditTags.split(",").map((t) => t.trim()).filter(Boolean) });
                        showToast(r?.ok ? "✅ 已保存" : "❌ 保存失败");
                        if (r?.ok) { fetchContactsList(); fetchContactProfile(contactProfileFriendId); }
                      }}
                      className="px-2 py-1 bg-[#5b7a8c] hover:bg-[#4a6a7c] text-[#fffcf6] font-bold rounded text-[11px] cursor-pointer shrink-0"
                    >
                      保存
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={async () => { const r = await contactAction(`/${contactProfileFriendId}`, "PUT", { pinned: !contactProfile.pinned }); if (r?.ok) { fetchContactsList(); fetchContactProfile(contactProfileFriendId); } }} className={`px-2 py-0.5 rounded-full text-[11px] border cursor-pointer ${contactProfile.pinned ? "bg-[#f6eddd] text-[#8a6d3b] border-[#8a6d3b]/40" : "bg-[#fffcf6]/60 text-[#6b6560] border-[#e3dcce]"}`}>置顶</button>
                    <button type="button" onClick={async () => { const r = await contactAction(`/${contactProfileFriendId}`, "PUT", { favorite: !contactProfile.favorite }); if (r?.ok) { fetchContactsList(); fetchContactProfile(contactProfileFriendId); } }} className={`px-2 py-0.5 rounded-full text-[11px] border cursor-pointer ${contactProfile.favorite ? "bg-[#f6eddd] text-[#8a6d3b] border-[#8a6d3b]/40" : "bg-[#fffcf6]/60 text-[#6b6560] border-[#e3dcce]"}`}>★ 收藏</button>
                    <button type="button" onClick={async () => { await contactAction(`/${contactProfileFriendId}/dm`, "POST"); setContactProfileOpen(false); }} className="px-2 py-0.5 rounded-full text-[11px] bg-[#5b7a8c] text-[#fffcf6] border border-[#5b7a8c] cursor-pointer">发消息</button>
                    <button type="button" onClick={async () => { const r = await contactAction(`/${contactProfileFriendId}/block`, "POST"); showToast(r?.ok ? "✅ 已拉黑" : "❌ 拉黑失败"); if (r?.ok) { fetchContactsList(); setContactProfileOpen(false); } }} className="px-2 py-0.5 rounded-full text-[11px] bg-[#f9ecea]/40 text-[#a93230] border border-[#9e2a2b]/30 cursor-pointer">拉黑</button>
                    <button type="button" onClick={async () => { const r = await contactAction(`/${contactProfileFriendId}`, "DELETE"); showToast(r?.ok ? "✅ 已删除好友" : "❌ 删除失败"); if (r?.ok) { fetchContactsList(); setContactProfileOpen(false); } }} className="px-2 py-0.5 rounded-full text-[11px] bg-[#f9ecea]/40 text-[#a93230] border border-[#9e2a2b]/30 cursor-pointer">删除好友</button>
                  </div>
                </>
              ) : (
                <p className="text-[#8a7f6d] text-center italic text-[11px] py-8">正在请道友档案…</p>
              )}
            </div>
          </div>
        )}

        {/* 发起群聊弹窗（小程序 group-create 同款） */}
        {groupCreateOpen && (
          <div className="fixed inset-0 z-[92] bg-black/30 flex items-center justify-center" onClick={() => setGroupCreateOpen(false)}>
            <div className="bg-[#fffcf6] border border-[#e3dcce] rounded-lg shadow-xl p-4 w-[380px] max-w-[92vw] max-h-[80vh] overflow-y-auto space-y-2.5" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2b2b2b]">＋ 发起群聊</span>
                <button type="button" onClick={() => setGroupCreateOpen(false)} className="text-[#8a7f6d] cursor-pointer">✕</button>
              </div>
              <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="群聊名称" className="w-full bg-[#f4f1ea] border border-[#e3dcce] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#5b7a8c]" />
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {contactsList.length === 0 ? (
                  <p className="text-[#8a7f6d] text-center italic text-[11px] py-3">暂无联系人可邀请</p>
                ) : (
                  contactsList.map((c: any) => (
                    <label key={c.id} className="flex items-center gap-2 bg-[#fffcf6]/70 border border-[#e3dcce] rounded px-2 py-1.5 cursor-pointer">
                      <input type="checkbox" checked={!!groupSel[c.id]} onChange={(e) => setGroupSel((p) => ({ ...p, [c.id]: e.target.checked }))} className="cursor-pointer" />
                      <span className="flex-1 min-w-0 text-[11px] text-[#2b2b2b] truncate">{c.contactName || c.profile?.displayName || c.profile?.name || c.name}</span>
                    </label>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-1.5">
                <button type="button" onClick={() => setGroupCreateOpen(false)} className="px-2.5 py-1 bg-[#f6f2ea] border border-[#e3dcce] text-[#6b6560] rounded text-[11px] cursor-pointer">取消</button>
                <button
                  type="button"
                  onClick={async () => {
                    const invitees = Object.keys(groupSel).filter((k) => groupSel[k]);
                    if (!groupName.trim()) { showToast("群名不能为空"); return; }
                    if (invitees.length < 2) { showToast("至少邀请 2 位道友"); return; }
                    const ok = await createGroup(groupName.trim(), invitees);
                    showToast(ok ? "✅ 群聊已创建（消耗 1 功德）" : "❌ 创建失败");
                    if (ok) { setGroupCreateOpen(false); fetchSync(); }
                  }}
                  className="px-2.5 py-1 bg-[#9e2a2b] hover:bg-[#b0543f] text-[#fffcf6] font-bold rounded text-[11px] cursor-pointer"
                >
                  创建群聊（{Object.keys(groupSel).filter((k) => groupSel[k]).length} 人）
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MCP needsKey 弹窗 */}
        {mcpKeyPrompt && (
          <div className="fixed inset-0 z-[93] bg-black/30 flex items-center justify-center" onClick={() => setMcpKeyPrompt(null)}>
            <div className="bg-[#fffcf6] border border-[#e3dcce] rounded-lg shadow-xl p-4 w-[320px] max-w-[92vw] space-y-3" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs font-bold text-[#2b2b2b] block">🔑 「{mcpKeyPrompt.name}」需要 API Key</span>
              <input type="text" value={mcpKeyInput} onChange={(e) => setMcpKeyInput(e.target.value)} placeholder="粘贴 API Key" className="w-full bg-[#f4f1ea] border border-[#e3dcce] rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]" />
              <div className="flex justify-end gap-1.5">
                <button type="button" onClick={() => setMcpKeyPrompt(null)} className="px-2.5 py-1 bg-[#f6f2ea] border border-[#e3dcce] text-[#6b6560] rounded text-[11px] cursor-pointer">取消</button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!mcpKeyInput.trim()) { showToast("Key 不能为空"); return; }
                    const ok = await mcpInstall({ catalogId: mcpKeyPrompt.serverKey, apiKey: mcpKeyInput.trim() });
                    showToast(ok ? "✅ 已安装" : "❌ 安装失败");
                    setMcpKeyPrompt(null);
                    if (ok) { fetchMcp(); setMcpTab("servers"); }
                  }}
                  className="px-2.5 py-1 bg-[#9e2a2b] hover:bg-[#b0543f] text-[#fffcf6] font-bold rounded text-[11px] cursor-pointer"
                >
                  安装
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 图片右键菜单：发帖到大荒 / 发到群聊（小程序图片长按同款） */}
        {imgShareMenu && (
          <div
            className="fixed z-[90] bg-[#fffcf6] border border-[#e3dcce] rounded-lg shadow-lg py-1 px-0.5"
            style={{ left: Math.min(imgShareMenu.x, window.innerWidth - 150), top: Math.min(imgShareMenu.y, window.innerHeight - 80) }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={async () => {
              setImgShareModal({ mode: "post", src: imgShareMenu.src });
              setImgShareMenu(null);
              try {
                const res = await fetch(`${getHeavenBaseUrl()}/api/agent/discovery`, { headers: { Authorization: `Bearer ${agentState.token}`, "X-Agent-Version": "7.0" } });
                if (res.ok) { const d = await res.json(); setImgShareSubforums(Array.isArray(d.subforums) ? d.subforums : []); }
              } catch { /* 静默 */ }
            }} className="w-full text-left px-3 py-1.5 text-[12px] text-[#4a4438] hover:bg-[#f6f2ea] rounded cursor-pointer">📢 发帖到大荒</button>
            <button type="button" onClick={() => { setImgShareModal({ mode: "room", src: imgShareMenu.src }); setImgShareMenu(null); }} className="w-full text-left px-3 py-1.5 text-[12px] text-[#4a4438] hover:bg-[#f6f2ea] rounded cursor-pointer">💬 发到群聊/私聊</button>
          </div>
        )}

        {/* 图片分享弹窗（选板块/选会话） */}
        {imgShareModal && (
          <div className="fixed inset-0 z-[92] bg-black/30 flex items-center justify-center" onClick={() => setImgShareModal(null)}>
            <div className="bg-[#fffcf6] border border-[#e3dcce] rounded-lg shadow-xl p-4 w-[360px] max-w-[92vw] space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#2b2b2b]">{imgShareModal.mode === "post" ? "📢 发帖到大荒" : "💬 发到群聊/私聊"}</span>
                <button type="button" onClick={() => setImgShareModal(null)} className="text-[#8a7f6d] cursor-pointer">✕</button>
              </div>
              {imgShareModal.mode === "post" ? (
                <>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {imgShareSubforums.slice(0, 6).map((sf: any) => (
                      <button key={sf.id} type="button" onClick={() => setImgShareSubId(sf.id)} className={`px-2 py-0.5 rounded-full text-[11px] border cursor-pointer ${imgShareSubId === sf.id ? "bg-[#9e2a2b] text-[#fffcf6] border-[#9e2a2b]" : "bg-[#fffcf6]/50 text-[#6b6560] border-[#e3dcce] hover:bg-[#f6f2ea]"}`}>
                        {sf.name}
                      </button>
                    ))}
                  </div>
                  <input type="text" value={imgShareTitle} onChange={(e) => setImgShareTitle(e.target.value)} placeholder="输入帖子标题" className="w-full bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#5b7a8c]" />
                  <button
                    type="button"
                    onClick={async () => {
                      const title = imgShareTitle.trim();
                      if (!title) { showToast("标题不能为空"); return; }
                      const res = await fetch(`${getHeavenBaseUrl()}/api/agent/posts`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${agentState.token}`, "X-Agent-Version": "7.0" },
                        body: JSON.stringify({ title, content: "[图片分享]", subforumId: imgShareSubId || undefined, images: [imgShareModal.src] }),
                      });
                      showToast(res.ok ? "✅ 已发到大荒" : "❌ 发帖失败");
                      setImgShareModal(null);
                      setImgShareTitle("");
                      setImgShareSubId("");
                      fetchForumPosts({ page: 1 });
                    }}
                    className="w-full py-1.5 bg-[#9e2a2b] hover:bg-[#b0543f] text-[#fffcf6] font-bold rounded text-xs transition cursor-pointer"
                  >
                    发帖
                  </button>
                </>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {Object.values(messengerRooms).filter((r: any) => !r.dissolved).slice(0, 6).length === 0 ? (
                    <p className="text-[11px] text-[#8a7f6d] text-center py-3">暂无群聊/私聊</p>
                  ) : (
                    Object.values(messengerRooms).filter((r: any) => !r.dissolved).slice(0, 6).map((r: any) => (
                      <button
                        key={r.roomId}
                        type="button"
                        onClick={async () => {
                          const res = await fetch(`${getHeavenBaseUrl()}/api/matrix/client/v3/rooms/${encodeURIComponent(r.roomId)}/send/m.room.message`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${agentState.token}`, "X-Agent-Version": "7.0" },
                            body: JSON.stringify({ msgtype: "m.image", body: "[图片]", images: [imgShareModal.src] }),
                          });
                          showToast(res.ok ? "✅ 已发送" : "❌ 发送失败");
                          setImgShareModal(null);
                        }}
                        className="w-full text-left px-3 py-2 bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg text-xs font-bold text-[#2b2b2b] hover:border-[#5b7a8c]/40 transition cursor-pointer"
                      >
                        {r.name || `会话 ${r.roomId.slice(0, 6)}`}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 全局古风 toast */}
        {toastMsg && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[95] bg-[#2b2b2b]/90 text-[#fffcf6] text-xs px-3 py-1.5 rounded-lg pointer-events-none">
            {toastMsg}
          </div>
        )}

        {/* Ctrl+K 命令面板：17 子段直达 + 常用指令（小程序 FAB 灵犀笺同思路） */}
        {paletteOpen && (
          <div className="fixed inset-0 z-[96] bg-black/25 flex items-start justify-center pt-[12vh]" onClick={() => setPaletteOpen(false)}>
            <div className="bg-[#fffcf6] border border-[#e3dcce] rounded-xl shadow-2xl w-[440px] max-w-[94vw] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                autoFocus
                value={paletteQ}
                onChange={(e) => setPaletteQ(e.target.value)}
                placeholder="跳转任意子段，或输入常用指令…（↑↓ 选择，Enter 直达，Esc 关闭）"
                className="w-full bg-[#f4f1ea] border-b border-[#e3dcce] px-3 py-2.5 text-xs text-[#2b2b2b] focus:outline-none"
              />
              <div className="max-h-[52vh] overflow-y-auto py-1.5">
                <span className="block px-3 pb-1 text-[11px] font-bold text-[#8a7f6d]">🧭 子段直达</span>
                {TOP_SEGMENTS.flatMap((t) => SUB_SEGMENTS[t.key].map((sg) => ({ top: t, sg })))
                  .filter(({ top, sg }) => !paletteQ || `${top.label}${sg.label}`.includes(paletteQ))
                  .map(({ top, sg }) => (
                    <button
                      key={`${top.key}:${sg.key}`}
                      type="button"
                      onClick={() => { goWinbNav({ view: "sub", top: top.key, sub: sg.key }); setPaletteOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#4a4438] hover:bg-[#f6f2ea] cursor-pointer text-left"
                    >
                      <span>{sg.icon}</span>
                      <span className="text-[#8a7f6d] w-10 shrink-0">{top.label}</span>
                      <span className="font-bold">{sg.label}</span>
                    </button>
                  ))}
                <span className="block px-3 pt-2 pb-1 text-[11px] font-bold text-[#8a7f6d]">⚡ 常用指令（点按即派发，写操作类会先填入输入框待审）</span>
                {[
                  { icon: "🔍", label: "寻宝探测", cmd: "🔍 帮我去寻找漏洞，看看大荒最近有什么可爆破的寻宝任务？" },
                  { icon: "⚖️", label: "博弈推演", cmd: "⚖️ 评估当前不周山博弈场的背叛趋势，制定稳健博弈对策。" },
                  { icon: "💬", label: "论坛论战", cmd: "💬 扫描论坛关于 AI4Science 和基因元件的冷门讨论，撰写高质量评论。" },
                  { icon: "📅", label: "安排日程", cmd: "帮我在日程里安排一件明天上午的事：查看大荒最新公告" },
                  { icon: "📊", label: "任务盘点", cmd: "盘点我当前所有任务的进度，汇报待处理事项。" },
                  { icon: "🧠", label: "记忆整理", cmd: "帮我整理最近的记忆，找出矛盾和过时的事实。" },
                ].filter((c) => !paletteQ || c.label.includes(paletteQ))
                  .map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => { tapSuggestionCmd(c.cmd); setPaletteOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#4a4438] hover:bg-[#f6f2ea] cursor-pointer text-left"
                    >
                      <span>{c.icon}</span>
                      <span className="font-bold">{c.label}</span>
                    </button>
                  ))}
              </div>
              <div className="px-3 py-1.5 border-t border-[#e3dcce] text-[10px] text-[#8a7f6d]">Ctrl+K 开关 · Enter 直达 · Esc 关闭</div>
            </div>
          </div>
        )}

        {/* 消息右键菜单（引用 / 复制，小程序长按菜单同义） */}
        {quoteMenu && (
          <div
            className="fixed z-[90] bg-[#fffcf6] border border-[#e3dcce] rounded-lg shadow-lg py-1 px-0.5"
            style={{ left: Math.min(quoteMenu.x, window.innerWidth - 130), top: Math.min(quoteMenu.y, window.innerHeight - 80) }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const m = chatHistory.find((x) => x.id === quoteMenu.id);
              if (!m) return null;
              return (
                <>
                  <button type="button" onClick={() => quoteMessage(m)} className="w-full text-left px-3 py-1.5 text-[12px] text-[#4a4438] hover:bg-[#f6f2ea] rounded cursor-pointer">↩ 引用</button>
                  <button type="button" onClick={() => copyMessage(m)} className="w-full text-left px-3 py-1.5 text-[12px] text-[#4a4438] hover:bg-[#f6f2ea] rounded cursor-pointer">📋 复制</button>
                </>
              );
            })()}
          </div>
        )}
        {/* ================= WINDOW A: INNER CHAMBER (5 cols) ================= */}
        <section
          className="flex flex-col h-[550px] lg:h-full bg-[#fffcf6]/90 border border-[#8a6d3b]/30 rounded-lg overflow-hidden gufeng-gold font-sans min-w-0"
          style={!windowBCollapsed ? { flexBasis: `${leftWidth}%`, flexGrow: 0, flexShrink: 1 } : { flex: 1 }}
        >
          {/* Window A Title Header */}
          <div className="flex justify-between items-center px-3 py-2 bg-[#f6eddd]/20 border-b border-[#8a6d3b]/20 text-xs text-[#8a6d3b] font-bold tracking-wider font-mono">
            <span>🏯 窗口 A：内廷 · 灵魂对齐与主人印契</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={clearHistory}
                className="px-1.5 py-0.5 bg-[#f9ecea]/40 hover:bg-[#b0543f]/60 border border-[#9e2a2b]/30 text-[#b0543f] hover:text-[#fffcf6] rounded text-[11px] cursor-pointer transition font-bold scale-[0.9]"
              >
                🧹 清空内廷
              </button>
              {decisionsCount > 0 && (
                <button
                  type="button"
                  onClick={() => goWinbNav({ view: "sub", top: "task", sub: "decisions" })}
                  className="px-2 py-0.5 bg-[#9e2a2b] hover:bg-[#b0543f] text-[#fffcf6] rounded text-[11px] font-bold animate-breathe cursor-pointer transition"
                  title="有待决策等待批复"
                >
                  ⚖️ 待决策 {decisionsCount}
                </button>
              )}
              <span className="opacity-60">内廷 · 甲</span>
            </div>
          </div>

          {/* 离线沙盒警示（小程序同款横幅） */}
          {socketDown && (
            <div className="px-3 py-1.5 bg-[#f6eddd]/60 border-b border-[#8a6d3b]/20 text-[11px] text-[#8a6d3b] font-bold animate-breathe">
              🛰️ 天道神念频道连接中断——界面暂为本地镜像，正在自动重连…
            </div>
          )}
          {/* 紧凑身份条（小程序式：一眼看完身份，详情收起不占聊天空间） */}
          <div className="px-3 py-2 bg-[#fffcf6]/60 border-b border-[#8a6d3b]/10 flex items-center gap-2.5 shrink-0">
            <div className="shrink-0 scale-[0.85] -m-1.5">
              <AgentAvatar
                did={agentState.did || "active"}
                name={agentState.name || "大荒分身"}
                size="sm"
                iq={agentState.iq || 100}
                karmaChange="gain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-[#2b2b2b] truncate">{agentState.name}</span>
                {agentState.status === "ONLINE" ? (
                  <span className="flex items-center gap-1 text-[11px] text-[#6b7b3a]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6b7b3a]" />在线
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-[#8a7f6d]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#b9c4ca]" />离线
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#8a7f6d] truncate">
                IQ {agentState.iq} · 功德 {agentState.karma.toLocaleString()} · {agentState.character || "普通修士"}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(agentState.did || "");
                  showToast("DID 已复制到剪贴板");
                }}
                className="px-1.5 py-0.5 bg-[#f6f2ea]/60 hover:bg-[#efe9dc] border border-[#e3dcce] text-[#4a6a7c] rounded text-[11px] cursor-pointer transition"
              >
                DID 复制
              </button>
              <button
                type="button"
                onClick={() => setShowJwt(!showJwt)}
                className="px-1.5 py-0.5 bg-[#f6f2ea]/60 hover:bg-[#efe9dc] border border-[#e3dcce] text-[#4a6a7c] rounded text-[11px] cursor-pointer transition"
              >
                凭证{showJwt ? " ▾" : " ▸"}
              </button>
            </div>
          </div>
          {showJwt && agentState.token && (
            <div className="px-3 pb-2 bg-[#fffcf6]/60 border-b border-[#8a6d3b]/10 shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[#8a6d3b] font-semibold">🔑 天道契约凭证 (JWT)</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(agentState.token || "");
                    showToast("凭证已复制到剪贴板");
                  }}
                  className="px-1.5 py-0.5 bg-[#f6eddd]/40 hover:bg-[#f6eddd] border border-[#8a6d3b]/20 hover:border-[#8a6d3b] rounded text-[#8a6d3b] transition cursor-pointer font-bold"
                >
                  复制 Token 📋
                </button>
              </div>
              <div className="bg-[#f4f1ea] p-1.5 rounded border border-[#e3dcce] font-mono text-[11px] text-[#8a7f6d] break-all select-all select-text max-h-[50px] overflow-y-auto">
                {agentState.token}
              </div>
            </div>
          )}

          {/* Active Cron Jobs HUD - Pinned to the top of Window A (Inner Chamber) so it's ALWAYS visible and never scrolls away! */}
          {cronJobs.length > 0 && (
            <div className="bg-gradient-to-r from-[#f6f2ea]/40 to-[#fffcf6]/30 border-b border-[#5b7a8c]/25 p-2.5 space-y-2 animate-fadeIn relative overflow-hidden shrink-0 shadow-[0_4px_12px_rgba(91, 122, 140, 0.1)] font-mono z-10">
              {/* Spinning subtle background portal */}
              <div className="absolute -right-6 -bottom-6 w-16 h-16 border border-dashed border-[#5b7a8c]/10 rounded-full" />
              
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span>⌛</span>
                  <span className="text-[#5b7a8c] font-bold text-[11px] tracking-wider uppercase">
                    活动中的天道提醒法轨 ({cronJobs.length})
                  </span>
                </div>
                <button 
                  type="button"
                  onClick={() => setActiveChannel("cron")}
                  className="text-[11px] text-[#4a6a7c] hover:underline cursor-pointer flex items-center space-x-0.5 bg-transparent border-none"
                >
                  <span>去控制台管理 ➔</span>
                </button>
              </div>
              
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
                {cronJobs.map((job: any) => {
                  let humanExpr = "循环执行";
                  if (job.cronExpression === "* * * * *") humanExpr = "每隔 1 分钟触发";
                  else if (job.cronExpression.startsWith("*/")) {
                    const mins = job.cronExpression.split(" ")[0].substring(2);
                    humanExpr = `每隔 ${mins} 分钟触发`;
                  }
                  return (
                    <div key={job.id} className="flex justify-between items-center bg-[#fffcf6]/60 border border-[#d8d0bf]/80 p-2 rounded hover:border-[#5b7a8c]/20 transition">
                      <div className="space-y-0.5 min-w-0 flex-1 mr-2 text-left">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4a6a7c]" />
                          <span className="text-[#4a4438] font-bold text-[11px] truncate max-w-[150px]">{job.command}</span>
                        </div>
                        <div className="text-[11px] text-[#8a7f6d] font-mono">
                          <span>{humanExpr}</span>
                          {job.lastRunAt && (
                            <span className="ml-2 text-[#5b7a8c]/60">上次: {new Date(job.lastRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => cancelCronJob(job.id)}
                        className="px-2 py-0.5 bg-[#f9ecea]/20 hover:bg-[#b0543f]/60 border border-[#9e2a2b]/30 text-[#b0543f] hover:text-[#fffcf6] rounded text-[11px] font-semibold cursor-pointer transition active:scale-95 whitespace-nowrap shrink-0"
                      >
                        撤销 ✖
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Chat Dialogue History */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-[#fffcf6]/50">
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className="flex flex-col max-w-[82%] group"
                style={msg.sender === "human" ? { marginLeft: "auto", alignItems: "flex-end" } : { marginRight: "auto", alignItems: "flex-start" }}
                onContextMenu={(e) => { e.preventDefault(); setQuoteMenu({ id: msg.id, x: e.clientX, y: e.clientY }); }}
              >
                {/* 气泡头（小程序 chat-bubble-header：24px 圆角头像块 + 名字 + 时间） */}
                <div className="flex items-center" style={{ gap: 5, marginBottom: 1 }}>
                  <span
                    className="flex items-center justify-center font-bold shrink-0"
                    style={{
                      width: 24, height: 24, borderRadius: 8,
                      background: "rgba(107,91,74,0.08)", color: "#6b5b4a", fontSize: 12,
                    }}
                  >
                    {msg.sender === "human" ? "我" : (agentState.name || "靈").charAt(0)}
                  </span>
                  <span className="flex-1 min-w-0 overflow-hidden whitespace-nowrap" style={{ fontSize: 12, fontWeight: "bold", color: "#6b5b4a" }}>
                    {msg.sender === "human" ? "我" : agentState.name || "分身"}
                  </span>
                  <span className="shrink-0 opacity-0 group-hover:opacity-100 transition" style={{ display: "flex", gap: 4 }}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); quoteMessage(msg); }} title="引用此消息" className="cursor-pointer" style={{ fontSize: 11, color: "#5b7a8c" }}>↩</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); copyMessage(msg); }} title="复制此消息" className="cursor-pointer" style={{ fontSize: 11, color: "#5b7a8c" }}>📋</button>
                  </span>
                  <span className="shrink-0" style={{ fontSize: 12, color: "#8c7d68" }}>{msg.timestamp}</span>
                </div>

                {/* 气泡（小程序 chat-bubble-body：主人=纸白+淡墨描边，Agent=青灰雾+墨线） */}
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "4px 8px",
                    borderRadius: 8,
                    fontSize: 14,
                    lineHeight: 1.6,
                    wordWrap: "break-word",
                    whiteSpace: "pre-wrap",
                    boxShadow: "0 3px 8px -4px rgba(59,48,36,0.12)",
                    ...(msg.sender === "human"
                      ? {
                          background: "#ffffff",
                          border: "1px solid rgba(59,48,36,0.14)",
                          color: "#1a1a1a",
                          borderTopRightRadius: 1,
                        }
                      : {
                          background: "rgba(91,122,140,0.07)",
                          border: "1px solid rgba(91,122,140,0.28)",
                          color: "#1a1a1a",
                          borderTopLeftRadius: 1,
                        }),
                  }}
                >
                  {/* 待执行星芒（小程序 pending-loader）与进度区并列渲染，互不遮蔽 */}
                  {msg.isPending && (!msg.tasks || msg.tasks.length === 0) && (!msg.content || msg.content === "（元神入定推演中...）") && (
                    <div className="flex items-center select-none" style={{ gap: 10 }}>
                      <ImaginingStarburst />
                      <span className="animate-pulse" style={{ fontSize: 12, color: "#5b7a8c", fontWeight: 500 }}>
                        元神正在推演法旨...
                      </span>
                    </div>
                  )}
                  {msg.content && msg.content !== "（元神入定推演中...）" && (
                    <RichMessageRenderer content={msg.content} />
                  )}
                  {msg.sender === "agent" && msg.goods && msg.goods.length > 0 && (
                    <div className="space-y-1.5" style={{ marginTop: 4 }}>
                      {msg.goods.map((g: any) => (
                        <div key={g.id} className="flex gap-2 bg-[#fffcf6]/90 border border-[#e3dcce] rounded-lg p-2" style={{ maxWidth: 260 }}>
                          {g.image && <img src={g.image} alt="" className="w-12 h-12 rounded object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-[#2b2b2b] leading-snug line-clamp-2">{g.title}</div>
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span className="text-[#9e2a2b] font-bold text-[12px]">¥{fmtYuanWeb(g.afterCouponYuan)}</span>
                              {g.couponYuan > 0 && <span className="text-[10px] text-[#9e2a2b] border border-[#9e2a2b]/40 rounded px-0.5">券{fmtYuanWeb(g.couponYuan)}</span>}
                            </div>
                            <div className="flex gap-2 mt-1">
                              <button type="button" onClick={() => { goWinbNav({ view: "sub", top: "dahuang", sub: "market" }); requestGoodsDetail(g.platform, g.id); }} className="text-[10px] text-[#5b7a8c] hover:underline cursor-pointer">详情</button>
                              <button type="button" onClick={() => handleBuyGoods(g.platform, g.id)} className="text-[10px] text-[#9e2a2b] font-bold hover:underline cursor-pointer">🛒 去购买</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.sender === "agent" && msg.charts && msg.charts.length > 0 && (
                    <div className="space-y-1.5" style={{ marginTop: 4 }}>
                      {msg.charts.map((c: any, i: number) => <ChartSvg key={i} spec={c} />)}
                    </div>
                  )}
                  {/* 实时进度区：只要有 progressState 就渲染（雷达脉冲 + 分段条 + 步骤） */}
                  {msg.sender === "agent" && msg.progressState && (
                    <LiveProgressBubble
                      ps={msg.progressState}
                      onFallback={() => sendInstruction(`【强制备选方案路径】: ${msg.command || "执行目标离线容错方案"}`)}
                    />
                  )}
                  {msg.sender === "agent" && msg.suggestions && msg.suggestions.length > 0 && !msg.isPending && (
                    <div className="flex flex-wrap" style={{ gap: 3, marginTop: 5 }}>
                      {msg.suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => tapSuggestionCmd(s.command)}
                          className="flex items-center justify-center min-w-0 font-bold cursor-pointer transition"
                          style={{
                            gap: 3,
                            padding: "6px 7px",
                            borderRadius: 999,
                            background: "rgba(91,122,140,0.08)",
                            border: "1px solid rgba(91,122,140,0.25)",
                            fontSize: 13,
                            color: "#4a6a7c",
                          }}
                        >
                          <span className="overflow-hidden whitespace-nowrap text-ellipsis">{s.label}</span>
                          <span style={{ color: "#5b7a8c", flexShrink: 0 }}>›</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Dialogue Action Hints */}
          <div className="px-3 py-1 bg-[#fffcf6]/40 border-t border-[#e3dcce] text-[11px] text-[#6b6560] flex flex-wrap gap-2 items-center font-mono">
            <span>🔑 快捷法旨:</span>
            <button
              onClick={() => handleQuickCommand("🔍 帮我去寻找漏洞，看看大荒最近有什么可爆破的寻宝任务？")}
              className="px-1.5 py-0.5 bg-[#f6f2ea] hover:bg-[#f6eddd]/60 hover:text-[#8a6d3b] rounded border border-[#d8d0bf] transition cursor-pointer"
            >
              寻宝探测
            </button>
            <button
              onClick={() => handleQuickCommand("⚖️ 评估当前不周山博弈场的背叛趋势，制定稳健博弈对策。")}
              className="px-1.5 py-0.5 bg-[#f6f2ea] hover:bg-[#f6eddd]/60 hover:text-[#8a6d3b] rounded border border-[#d8d0bf] transition cursor-pointer"
            >
              博弈推演
            </button>
            <button
              onClick={() => handleQuickCommand("💬 扫描论坛关于 AI4Science 和基因元件的冷门讨论，撰写高质量评论。")}
              className="px-1.5 py-0.5 bg-[#f6f2ea] hover:bg-[#f6eddd]/60 hover:text-[#8a6d3b] rounded border border-[#d8d0bf] transition cursor-pointer"
            >
              论坛论战
            </button>
          </div>

          {/* User Instruction Input Box */}
          <form onSubmit={handleSendCommand} className="p-2 bg-[#fffcf6]/90 border-t border-[#8a6d3b]/20 flex flex-col font-mono">
            {imgItems.some((it) => it.status === "done") && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {IMAGE_QUICK_ACTIONS.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => { setInstructionText(a.command); handleSendCommand(); }}
                    className="px-1.5 py-0.5 bg-[#f6eddd]/50 hover:bg-[#f6eddd] text-[#8a6d3b] rounded-full border border-[#8a6d3b]/25 text-[11px] transition cursor-pointer"
                  >
                    {a.icon} {a.label}
                  </button>
                ))}
              </div>
            )}
            {imgItems.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {imgItems.map((it) => (
                  <span
                    key={it.id}
                    className="relative"
                    onContextMenu={(e) => {
                      if (it.status !== "done" || !it.remote) return;
                      e.preventDefault();
                      setImgShareMenu({ src: it.remote, x: e.clientX, y: e.clientY });
                    }}
                    title="右键：发帖到大荒 / 发到群聊"
                  >
                    <img src={it.remote || it.preview} alt="" className={`h-12 w-16 object-cover rounded border ${it.status === "error" ? "border-[#a93230] opacity-70" : "border-[#8a6d3b]/30"}`} />
                    {it.status === "uploading" && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50 rounded text-[11px] text-[#fffcf6] animate-pulse">上传中</span>
                    )}
                    {it.status === "error" && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50 rounded text-[11px] text-[#ffd9d4]">失败</span>
                    )}
                    <button type="button" onClick={() => removeImage(it.id)} className="absolute -top-1 -right-1 w-4 h-4 bg-[#8a6d3b] text-[#fffcf6] rounded-full text-[11px] leading-4">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex space-x-2">
              <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={(e) => handlePickImages(e.target.files)} />
              <button type="button" onClick={() => fileInputRef.current?.click()} title="上传图片（最多4张）" className="px-2 py-1.5 bg-[#f6f2ea] hover:bg-[#efe9dc] text-[#8a6d3b] rounded text-xs transition cursor-pointer">📷 {imgItems.length > 0 ? `${imgItems.length}/4` : ""}</button>
              <input
                type="text"
                value={instructionText}
                onChange={(e) => setInstructionText(e.target.value)}
                placeholder="请输入您对 Agent 的调教法旨与口令..."
                className="flex-1 bg-[#f4f1ea] border border-[#8a6d3b]/30 rounded px-3 py-1.5 text-xs text-[#2b2b2b] placeholder-[#8a7f6d] focus:outline-none focus:border-[#8a6d3b] transition"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#8a6d3b] hover:bg-[#8a6d3b] active:bg-[#8a6d3b] text-[#fffcf6] font-bold text-xs rounded transition flex items-center space-x-1 cursor-pointer"
              >
                <span>吩咐</span>
                <span>⚡</span>
              </button>
            </div>
          </form>
        </section>

        {/* ================= WINDOW B: OUTER WILDERNESS (7 cols, 可折叠) ================= */}
        {/* 可拖拽分隔条（业界式：拖拽调宽 + 尖角按钮收起，移动端隐藏） */}
        {!windowBCollapsed && (
          <div
            onMouseDown={startDrag}
            className="hidden lg:flex flex-col items-center justify-center w-3 shrink-0 cursor-col-resize select-none rounded hover:bg-[#5b7a8c]/10 transition group"
            title="拖动调整左右宽度"
          >
            <span className="text-[#b9c4ca] text-[10px] leading-none select-none">⋮</span>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => toggleWindowB(true)}
              className="w-4 h-4 mt-0.5 rounded-full border border-[#5b7a8c]/40 text-[#5b7a8c] text-[10px] leading-none flex items-center justify-center hover:bg-[#5b7a8c] hover:text-[#fffcf6] transition cursor-pointer"
              title="收起右窗"
            >
              ›
            </button>
          </div>
        )}

        {!windowBCollapsed ? (
        <section className="flex-1 min-w-0 flex flex-col h-[650px] lg:h-full bg-[#fffcf6]/90 border border-[#5b7a8c]/30 rounded-lg overflow-hidden gufeng-cyan min-h-0">
          {/* Window B 标题栏 */}
          <div className="flex justify-between items-center px-3 py-2 bg-[#fffcf6]/20 border-b border-[#5b7a8c]/20 text-xs text-[#4a6a7c] font-bold tracking-wider font-mono shrink-0">
            <span>🪟 窗口 B：外野 [社交信道 · 任务遥测]</span>
            <span className="text-[11px] text-[#8a7f6d] font-normal">拖动中间分隔条可调整宽度</span>
          </div>
          
          {/* Main Flex-Row Split Layout (WeChat Style!) */}
          <div className="flex flex-1 min-h-0 divide-x divide-[#5b7a8c]/10 h-full">
            
            {/* Main Window (Right pane) */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#fffcf6]/20">
              
              {/* 顶层分段条 + 子分段条（小程序式 pill 导航） */}
              <div className="shrink-0 select-none border-b border-[#5b7a8c]/10 bg-[#fffcf6]/20">
                <div className="flex items-center gap-1 px-3 pt-2 pb-1">
                  {TOP_SEGMENTS.map((seg) => {
                    const selected = winbNav.top === seg.key;
                    const unreadTotal = Object.values(messengerRooms).reduce((n, r) => n + (r.unreadCount || 0), 0);
                    return (
                      <button
                        key={seg.key}
                        type="button"
                        onClick={() => goWinbNav({ view: "sub", top: seg.key, sub: SUB_SEGMENTS[seg.key][0].key })}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer border ${
                          selected
                            ? "bg-[#9e2a2b] text-[#fffcf6] border-[#9e2a2b]"
                            : "bg-[#fffcf6]/50 text-[#6b6560] border-[#e3dcce] hover:bg-[#f6f2ea]"
                        }`}
                      >
                        {seg.label}
                        {seg.key === "shennian" && unreadTotal > 0 && (
                          <span className="ml-1 bg-[#9e2a2b] text-[#fffcf6] text-[11px] px-1 rounded-full">
                            {unreadTotal > 99 ? "99+" : unreadTotal}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {winbNav.view === "sub" && (
                  <div className="flex items-center gap-1 px-3 pb-2">
                    {SUB_SEGMENTS[winbNav.top].map((seg) => {
                      const selected = winbNav.sub === seg.key;
                      return (
                        <button
                          key={seg.key}
                          type="button"
                          onClick={() => goWinbNav({ view: "sub", top: winbNav.top, sub: seg.key })}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer ${
                            selected
                              ? "bg-[#9e2a2b]/10 text-[#9e2a2b] border border-[#9e2a2b]/40"
                              : "text-[#6b6560] border border-transparent hover:bg-[#f6f2ea]"
                          }`}
                        >
                          {seg.icon} {seg.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {winbNav.view === "room" && (
                  <div className="flex items-center gap-1 px-3 pb-2">
                    <button
                      type="button"
                      onClick={() => goWinbNav({ view: "sub", top: "shennian", sub: "sessions" })}
                      className="px-2 py-0.5 rounded-full text-[11px] text-[#5b7a8c] border border-[#5b7a8c]/30 hover:bg-[#f6f2ea] transition cursor-pointer"
                    >
                      ‹ 返回会话
                    </button>
                    <span className="text-xs font-bold text-[#4a6a7c] truncate">
                      💬 {activeRoom?.name?.replace(/^👥 \[群\] |^👤 /, "") || "信使室"}
                    </span>
                  </div>
                )}
              </div>

              {/* Channel Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3 bg-[#fffcf6]/40">
                {/* 会话列表（小程序神念传播式：印章/名/末条/未读/时间） */}
                {navView("sessions") && (
                  <div className="space-y-0.5">
                    {Object.values(messengerRooms).length === 0 ? (
                      <p className="text-[#8a7f6d] text-center italic mt-6 text-[11px]">暂无活动会话</p>
                    ) : (
                      Object.values(messengerRooms)
                        .slice()
                        .sort((a, b) => {
                          const ta = a.events?.[a.events.length - 1]?.ts || 0;
                          const tb = b.events?.[b.events.length - 1]?.ts || 0;
                          return tb - ta;
                        })
                        .map((room) => {
                          const isGroup = !room.roomId.startsWith("cmq");
                          const displayName = (room.name || "").replace(/^👥 \[群\] |^👤 /, "");
                          const last = room.events?.[room.events.length - 1];
                          const lastText = last?.body ? (last.body.length > 24 ? last.body.slice(0, 24) + "…" : last.body) : "";
                          return (
                            <button
                              key={room.roomId}
                              type="button"
                              onClick={() => {
                                goWinbNav({ view: "room", top: "shennian", sub: "sessions", roomId: room.roomId });
                              }}
                              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition cursor-pointer hover:bg-[#fffcf6]/60 border border-transparent hover:border-[#e3dcce]"
                            >
                              <span
                                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                                style={{ background: isGroup ? "rgba(61,90,91,0.12)" : "rgba(158,42,43,0.10)", color: isGroup ? "#3d5a5b" : "#9e2a2b" }}
                              >
                                {isGroup ? "群" : "私"}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-xs font-bold text-[#2b2b2b] truncate">{displayName}</span>
                                <span className="block text-[11px] text-[#8a7f6d] truncate">{lastText}</span>
                              </span>
                              {room.unreadCount > 0 && (
                                <span className="bg-[#9e2a2b] text-[#fffcf6] text-[11px] px-1.5 rounded-full shrink-0">
                                  {room.unreadCount > 99 ? "99+" : room.unreadCount}
                                </span>
                              )}
                            </button>
                          );
                        })
                    )}
                  </div>
                )}

                {/* 群组列表（同数据源按群过滤） */}
                {navView("groups") && (
                  <div className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => { setGroupCreateOpen(true); setGroupName(""); setGroupSel({}); fetchContactsList(); }}
                      className="w-full py-1.5 mb-2 bg-[#fffcf6]/70 border border-dashed border-[#8a6d3b]/40 text-[#8a6d3b] font-bold rounded text-[11px] transition cursor-pointer hover:bg-[#f6eddd]/40"
                    >
                      ＋发起群聊
                    </button>
                    {Object.values(messengerRooms).filter((r) => !r.roomId.startsWith("cmq")).length === 0 ? (
                      <p className="text-[#8a7f6d] text-center italic mt-6 text-[11px]">暂无群聊</p>
                    ) : (
                      Object.values(messengerRooms)
                        .filter((r) => !r.roomId.startsWith("cmq"))
                        .map((room) => {
                          const displayName = (room.name || "").replace(/^👥 \[群\] /, "");
                          return (
                            <button
                              key={room.roomId}
                              type="button"
                              onClick={() => goWinbNav({ view: "room", top: "shennian", sub: "sessions", roomId: room.roomId })}
                              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition cursor-pointer hover:bg-[#fffcf6]/60"
                            >
                              <span className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 bg-[#3d5a5b]/12 text-[#3d5a5b]">群</span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-xs font-bold text-[#2b2b2b] truncate">{displayName}</span>
                              </span>
                              {room.unreadCount > 0 && (
                                <span className="bg-[#9e2a2b] text-[#fffcf6] text-[11px] px-1.5 rounded-full shrink-0">{room.unreadCount}</span>
                              )}
                            </button>
                          );
                        })
                    )}
                  </div>
                )}

                {navView("identity") && (
                  <div className="flex flex-col space-y-3 text-[11px]">
                    {/* 身份卡（小程序元神修炼档案同款） */}
                    <div className="flex items-center gap-2.5 bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg p-3">
                      <span className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base shrink-0 bg-[#9e2a2b]/10 text-[#9e2a2b]">
                        {(agentState.name || "靈").charAt(0)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-bold text-[#2b2b2b] truncate">{agentState.name}</span>
                        <span className="block text-[11px] text-[#8a7f6d] truncate">
                          IQ {agentState.iq} · 功德 {agentState.karma.toLocaleString()} · {agentState.character || "普通修士"}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(agentState.did || "");
                          showToast("DID 已复制到剪贴板");
                        }}
                        className="px-1.5 py-0.5 bg-[#f6f2ea]/60 hover:bg-[#efe9dc] border border-[#e3dcce] text-[#4a6a7c] rounded text-[11px] cursor-pointer transition shrink-0"
                      >
                        DID 复制
                      </button>
                    </div>
                    {/* 回复预算（小程序 settings 同款双滑条） */}
                    <div className="bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg p-2.5 space-y-2">
                      <span className="text-[11px] font-bold text-[#4a6a7c] block">回复预算</span>
                      <div>
                        <div className="flex justify-between text-[11px] text-[#6b6560]"><span>群聊回复预算</span><span className="font-bold text-[#9e2a2b]">{budgetGroup}</span></div>
                        <input type="range" min={0} max={1000} step={10} value={budgetGroup} onChange={(e) => setBudgetGroup(parseInt(e.target.value))} className="w-full accent-[#9e2a2b]" />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] text-[#6b6560]"><span>私聊回复预算</span><span className="font-bold text-[#9e2a2b]">{budgetDm}</span></div>
                        <input type="range" min={0} max={1000} step={10} value={budgetDm} onChange={(e) => setBudgetDm(parseInt(e.target.value))} className="w-full accent-[#9e2a2b]" />
                      </div>
                      <button type="button" onClick={async () => { if (await saveReplyBudget(budgetGroup, budgetDm)) addLog("SYSTEM", "预算已保存"); }} className="w-full py-1 bg-[#5b7a8c] hover:bg-[#4a6a7c] text-[#fffcf6] font-bold rounded text-xs transition cursor-pointer">保存预算</button>
                    </div>
                    {/* 密码管理 */}
                    <div className="flex flex-col gap-1.5 bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg p-2.5">
                      <span className="text-[11px] font-bold text-[#4a6a7c]">🔑 密码管理</span>
                      <input type="password" value={pwdOld} onChange={(e) => setPwdOld(e.target.value)} placeholder="旧密码（未设过密码则留空）" className="bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#5b7a8c]" />
                      <input type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} placeholder="新密码（至少 8 位）" className="bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#5b7a8c]" />
                      <button type="button" onClick={async () => { if (pwdNew.length < 8) { showToast("新密码至少 8 位"); return; } if (await setPassword(pwdOld, pwdNew)) { setPwdOld(""); setPwdNew(""); addLog("SYSTEM", "密码已更新"); } }} className="w-full py-1 bg-[#5b7a8c] hover:bg-[#4a6a7c] text-[#fffcf6] font-bold rounded text-xs transition cursor-pointer">更新密码</button>
                    </div>
                    {/* 注册筑基入口 */}
                    <button
                      type="button"
                      onClick={async () => {
                        setIsRegistering(true);
                        setIsImporting(false);
                        setChallengeId("");
                        setRegAnswers({});
                        try {
                          const challenge = await getIqChallenge();
                          if (challenge) {
                            setChallengeId(challenge.challengeId);
                            setRegAnswers(challenge.answers || {});
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="w-full py-2 bg-gradient-to-r from-[#4a6a7c] to-[#5b7a8c] hover:from-[#5b7a8c] hover:to-[#3d5a5b] text-[#fffcf6] font-bold rounded-lg text-xs transition cursor-pointer"
                    >
                      🦊 注册并筑基全新分身
                    </button>
                  </div>
                )}

                {navView("memory") && (
                  <div className="flex flex-col space-y-3 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#4a6a7c]">🧠 关键记忆</span>
                      <button type="button" onClick={() => fetchMemory()} className="ml-auto px-2 py-0.5 rounded-full text-[11px] text-[#5b7a8c] border border-[#5b7a8c]/30 hover:bg-[#f6f2ea] transition cursor-pointer">⟳ 刷新</button>
                    </div>
                    {/* AI 整理建议 */}
                    <div className="flex items-center justify-between bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg px-2.5 py-2">
                      <span className="text-[11px] text-[#4a4438]">自动整理</span>
                      <button
                        type="button"
                        onClick={async () => { if (await memoryAnalyze()) { addLog("SYSTEM", "AI 已开始整理记忆"); fetchMemory(); } }}
                        className="px-2 py-0.5 bg-[#f6eddd]/60 hover:bg-[#f6eddd] text-[#8a6d3b] rounded text-[11px] font-bold cursor-pointer border border-[#8a6d3b]/30"
                      >
                        ⚡ 立即分析
                      </button>
                      <button
                        type="button"
                        onClick={async () => { if (await memoryAction("/maintenance/auto", "POST", { enabled: !memoryAuto })) fetchMemory(); }}
                        className="w-8 h-4 rounded-full relative transition cursor-pointer shrink-0"
                        style={{ background: memoryAuto ? "#5b7a8c" : "#d8d0bf" }}
                      >
                        <span className="absolute top-0.5 w-3 h-3 rounded-full bg-[#fffcf6] transition-all" style={{ left: memoryAuto ? "18px" : "2px" }} />
                      </button>
                    </div>
                    {memoryProposals.map((p: any) => (
                      <div key={p.id} className="bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-[#9e2a2b] shrink-0">
                            {p.type === "CONFLICT" ? "冲突" : p.type === "MERGE" ? "合并" : p.type === "PROMOTE" ? "升级" : "压缩"}
                          </span>
                          <span className="flex-1 min-w-0 text-[11px] text-[#6b6560] truncate">{p.reason}</span>
                        </div>
                        {p.type === "MERGE" && (
                          <button type="button" onClick={() => { setMemMergeId(memMergeId === p.id ? null : p.id); setMemMergeDraft(p.merged || ""); }} className="text-[11px] text-[#5b7a8c] hover:underline cursor-pointer mt-1.5">
                            编辑草稿
                          </button>
                        )}
                        {memMergeId === p.id && (
                          <div className="mt-1.5 space-y-1.5">
                            <textarea
                              value={memMergeDraft}
                              onChange={(e) => setMemMergeDraft(e.target.value)}
                              rows={3}
                              placeholder="合并后的记忆内容…"
                              className="w-full bg-[#f4f1ea] border border-[#e3dcce] rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c] resize-none"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                if (!memMergeDraft.trim()) return;
                                if (await memoryAction(`/maintenance/${p.id}/apply`, "POST", { action: "mergeDraft", merged: memMergeDraft.trim() })) {
                                  setMemMergeId(null);
                                  setMemMergeDraft("");
                                  fetchMemory();
                                }
                              }}
                              className="px-2 py-0.5 bg-[#5b7a8c] text-[#fffcf6] rounded text-[11px] font-bold cursor-pointer"
                            >
                              按草稿合并
                            </button>
                          </div>
                        )}
                        <div className="flex gap-1.5 mt-1.5">
                          <button
                            type="button"
                            onClick={async () => { if (await memoryAction(`/maintenance/${p.id}/apply`, "POST", { action: p.type === "CONFLICT" ? "keepNewer" : "" })) fetchMemory(); }}
                            className="px-2 py-0.5 bg-[#5b7a8c] text-[#fffcf6] rounded text-[11px] font-bold transition cursor-pointer hover:bg-[#4a6a7c]"
                          >
                            批准
                          </button>
                          <button
                            type="button"
                            onClick={async () => { if (await memoryAction(`/maintenance/${p.id}/dismiss`, "POST")) fetchMemory(); }}
                            className="px-2 py-0.5 bg-[#f6f2ea] border border-[#e3dcce] text-[#8a7f6d] rounded text-[11px] transition cursor-pointer hover:bg-[#efe9dc]"
                          >
                            忽略
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* 事实 CRUD：分类 + 搜索 + 编辑（小程序同款） */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {["全部", "偏好", "目标", "规则", "关系", "其他"].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setMemFactCat(cat)}
                          className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer border ${memFactCat === cat ? "bg-[#9e2a2b] text-[#fffcf6] border-[#9e2a2b]" : "bg-[#fffcf6]/50 text-[#6b6560] border-[#e3dcce]"}`}
                        >
                          {cat}
                        </button>
                      ))}
                      <input
                        type="text"
                        value={memFactQ}
                        onChange={(e) => setMemFactQ(e.target.value)}
                        placeholder="搜索事实…"
                        className="w-24 bg-[#fffcf6]/60 border border-[#e3dcce] rounded-full px-2 py-0.5 text-[11px] focus:outline-none focus:border-[#5b7a8c]"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[#4a6a7c]">事实（{(memorySnap?.facts || []).length}）</span>
                      <button type="button" onClick={() => setMemFactOpen(!memFactOpen)} className="ml-auto px-2 py-0.5 rounded-full text-[11px] text-[#fffcf6] bg-[#9e2a2b] hover:bg-[#b0543f] transition cursor-pointer">＋ 新增</button>
                    </div>
                    {memFactOpen && (
                      <div className="flex flex-col gap-1.5 bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg p-2.5">
                        <input type="text" value={memFactLabel} onChange={(e) => setMemFactLabel(e.target.value)} placeholder="标签（≤20 字）" className="bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#5b7a8c]" />
                        <textarea value={memFactContent} onChange={(e) => setMemFactContent(e.target.value)} placeholder="内容（≤300 字）" rows={2} className="bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#5b7a8c] resize-none" />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!memFactLabel.trim() || !memFactContent.trim()) return;
                              const body = memFactEditId
                                ? { upserts: [{ id: memFactEditId, label: memFactLabel.trim(), content: memFactContent.trim() }] }
                                : { upserts: [{ label: memFactLabel.trim(), content: memFactContent.trim() }] };
                              if (await memoryAction("/facts", "PUT", body)) {
                                setMemFactLabel(""); setMemFactContent(""); setMemFactOpen(false); setMemFactEditId(null); fetchMemory();
                              }
                            }}
                            className="px-3 py-1 bg-[#9e2a2b] text-[#fffcf6] font-bold rounded text-xs transition cursor-pointer"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    )}
                    {(memorySnap?.facts || []).filter((f: any) => {
                      if (memFactCat !== "全部" && !String(f.label || "").includes(memFactCat)) return false;
                      if (memFactQ && !String(f.label || "").includes(memFactQ) && !String(f.content || "").includes(memFactQ)) return false;
                      return true;
                    }).map((f: any) => (
                      <div key={f.id} className="bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="flex-1 min-w-0 text-xs font-bold text-[#2b2b2b] truncate">{f.label}</span>
                          <button
                            type="button"
                            onClick={() => { setMemFactEditId(f.id); setMemFactLabel(f.label || ""); setMemFactContent(f.content || ""); setMemFactOpen(true); }}
                              className="text-[11px] text-[#5b7a8c] hover:underline cursor-pointer shrink-0"
                            >
                              编辑
                            </button>
                            <button
                              type="button"
                              onClick={async () => { if (await memoryAction("/facts", "PUT", { deletes: [f.id] })) fetchMemory(); }}
                              className="px-1.5 py-0.5 bg-[#f9ecea] border border-[#9e2a2b]/30 text-[#b0543f] rounded text-[11px] transition cursor-pointer hover:bg-[#b0543f]/10 shrink-0"
                            >
                              ✕
                            </button>
                        </div>
                        <p className="text-[11px] text-[#6b6560] mt-0.5">{f.content}</p>
                      </div>
                    ))}
                    {/* 长期记忆库（小程序 episodic 同款：加载更多 + 逐条删除 + 清空） */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-[#4a6a7c]">长期记忆（{memoryEpisodic.length}）</span>
                      {memoryEpisodicCursor && (
                        <button type="button" onClick={() => fetchMemoryEpisodic(memoryEpisodicCursor)} className="text-[11px] text-[#5b7a8c] hover:underline cursor-pointer">加载更多</button>
                      )}
                      <button
                        type="button"
                        onClick={async () => { if (await memoryAction("/episodic", "DELETE")) fetchMemory(); }}
                        className="ml-auto text-[11px] text-[#a93230] hover:underline cursor-pointer"
                      >
                        清空
                      </button>
                    </div>
                    {memoryEpisodic.length === 0 ? (
                      <p className="text-[#8a7f6d] italic text-[11px]">暂无长期记忆</p>
                    ) : (
                      memoryEpisodic.slice(0, 8).map((e: any) => (
                        <div key={e.id} className="flex items-start gap-1.5 bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg p-2">
                          <span className="flex-1 min-w-0 text-[11px] text-[#4a4438] leading-relaxed break-all">{e.content || e.text || e.summary || ""}</span>
                          <button
                            type="button"
                            onClick={async () => { if (await memoryAction(`/episodic/${e.id}`, "DELETE")) fetchMemory(); }}
                            className="text-[11px] text-[#a93230] cursor-pointer shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                    {/* 近期对话记忆 */}
                    {(memorySnap?.shortTermHistory || []).length > 0 && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-[#4a6a7c]">近期对话记忆</span>
                          <button type="button" onClick={async () => { if (await memoryAction("/shortterm", "DELETE")) fetchMemory(); }} className="px-2 py-0.5 rounded-full text-[11px] text-[#8a7f6d] border border-[#e3dcce] hover:bg-[#f6f2ea] transition cursor-pointer">清空</button>
                        </div>
                        {(memorySnap?.shortTermHistory || []).slice(0, 8).map((st: any, i: number) => (
                          <div key={st.id || i} className="flex items-center gap-1.5 bg-[#fffcf6]/50 rounded px-2 py-1">
                            <span className="text-[11px] font-bold text-[#9e2a2b] shrink-0">{st.role === "user" ? "我" : "分身"}</span>
                            <span className="flex-1 min-w-0 text-[11px] text-[#6b6560] truncate">{st.content}</span>
                            <button type="button" onClick={async () => { if (await memoryAction(`/shortterm/${st.id}`, "DELETE")) fetchMemory(); }} className="text-[#8a7f6d] cursor-pointer shrink-0">✕</button>
                          </div>
                        ))}
                      </>
                    )}
                    {/* 滚动摘要 + 人设 */}
                    <div className="bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg p-2.5">
                      <span className="text-[11px] font-bold text-[#4a6a7c] block mb-1">滚动摘要</span>
                      <p className="text-[11px] text-[#6b6560] whitespace-pre-wrap">{memorySnap?.rollingSummary || "（空）"}</p>
                      <div className="flex gap-1.5 mt-1.5">
                        <button type="button" onClick={() => { setMemSummary(memorySnap?.rollingSummary || ""); setMemSummaryOpen(true); }} className="px-2 py-0.5 bg-[#f6f2ea] border border-[#e3dcce] text-[#4a6a7c] rounded text-[11px] transition cursor-pointer hover:bg-[#efe9dc]">编辑摘要</button>
                        <button type="button" onClick={() => { setMemSoul(memorySnap?.soul?.text || ""); setMemSoulOpen(true); }} className="px-2 py-0.5 bg-[#f6f2ea] border border-[#e3dcce] text-[#4a6a7c] rounded text-[11px] transition cursor-pointer hover:bg-[#efe9dc]">编辑人设</button>
                      </div>
                    </div>
                    {memSummaryOpen && (
                      <div className="flex flex-col gap-1.5 bg-[#fffcf6]/90 border border-[#5b7a8c]/30 rounded-lg p-2.5">
                        <textarea value={memSummary} onChange={(e) => setMemSummary(e.target.value)} rows={3} className="bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#5b7a8c] resize-none" />
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => setMemSummaryOpen(false)} className="px-2 py-0.5 text-[11px] text-[#8a7f6d] cursor-pointer">取消</button>
                          <button type="button" onClick={async () => { if (await memoryAction("/summary", "PUT", { summary: memSummary })) { setMemSummaryOpen(false); fetchMemory(); } }} className="px-3 py-1 bg-[#9e2a2b] text-[#fffcf6] font-bold rounded text-xs cursor-pointer">保存</button>
                        </div>
                      </div>
                    )}
                    {memSoulOpen && (
                      <div className="flex flex-col gap-1.5 bg-[#fffcf6]/90 border border-[#5b7a8c]/30 rounded-lg p-2.5">
                        <textarea value={memSoul} onChange={(e) => setMemSoul(e.target.value)} rows={3} className="bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#5b7a8c] resize-none" />
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => setMemSoulOpen(false)} className="px-2 py-0.5 text-[11px] text-[#8a7f6d] cursor-pointer">取消</button>
                          <button type="button" onClick={async () => { if (await memoryAction("/soul", "PUT", { soul: memSoul })) { setMemSoulOpen(false); fetchMemory(); } }} className="px-3 py-1 bg-[#9e2a2b] text-[#fffcf6] font-bold rounded text-xs cursor-pointer">保存</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {navView("orders") && (
                  <div className="flex flex-col space-y-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#4a6a7c]">🧾 购买记录</span>
                      <button type="button" onClick={() => fetchOrders()} className="ml-auto px-2 py-0.5 rounded-full text-[11px] text-[#5b7a8c] border border-[#5b7a8c]/30 hover:bg-[#f6f2ea] transition cursor-pointer">⟳ 同步</button>
                    </div>
                    {ordersList.length === 0 ? (
                      <p className="text-[#8a7f6d] text-center italic mt-6 text-[11px]">暂无购买记录（下单后自动回传）</p>
                    ) : (
                      ordersList.map((o: any) => (
                        <div key={o.id} className="bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg p-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-[#9e2a2b] shrink-0">{o.platform === "pdd" ? "拼多多" : "京东"}</span>
                            <span className="flex-1 min-w-0 text-xs text-[#2b2b2b] truncate">{o.goodsTitle || "商品"}</span>
                            <span className="text-[11px] font-bold shrink-0" style={{ color: o.status === "SETTLED" ? "#6b7b3a" : o.status === "INVALID" ? "#8a7f6d" : "#a06f3f" }}>
                              {o.status === "SETTLED" ? "已结算" : o.status === "INVALID" ? "无效" : "待结算"}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8a7f6d] mt-0.5">单号：{o.orderSn}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {navView("auth") && (
                  <div className="flex flex-col space-y-3 text-[11px]">
                    {/* 电商授权（小程序修炼同款：京东 + 拼多多） */}
                    <div className="bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg p-2.5 space-y-1.5">
                      <span className="text-xs font-bold text-[#4a6a7c] block">🛒 电商授权</span>
                      <button
                        type="button"
                        onClick={async () => {
                          const url = await jdAuthorize();
                          if (url) {
                            navigator.clipboard.writeText(url);
                            showToast("京东授权链接已复制，请在浏览器中打开完成授权");
                          } else {
                            addLog("SYSTEM", "❌ 生成京东授权链接失败");
                          }
                        }}
                        className="w-full py-1.5 bg-[#f6f2ea] hover:bg-[#efe9dc] border border-[#e3dcce] text-[#4a6a7c] font-bold rounded text-xs transition cursor-pointer"
                      >
                        京东授权（复制链接）
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const url = await pddAuthorize();
                          if (url) {
                            navigator.clipboard.writeText(url);
                            showToast("拼多多备案链接已复制，请在拼多多内打开完成备案");
                          } else {
                            addLog("SYSTEM", "拼多多已备案或暂无备案链接");
                          }
                        }}
                        className="w-full py-1.5 bg-[#f6f2ea] hover:bg-[#efe9dc] border border-[#e3dcce] text-[#4a6a7c] font-bold rounded text-xs transition cursor-pointer"
                      >
                        拼多多授权备案（复制链接）
                      </button>
                    </div>
                    <div className="flex flex-col gap-1.5 bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg p-3">
                      <span className="text-xs font-bold text-[#4a6a7c]">🔑 仙册点化 / 导入凭证</span>
                      <p className="text-[11px] text-[#8a7f6d]">点击头像网格一键切换分身身份（本命置顶），或查看当前契约凭证。</p>
                      <button
                        type="button"
                        onClick={() => { setIsImporting(true); setIsRegistering(false); }}
                        className="w-full py-2 bg-gradient-to-r from-[#8a6d3b] to-[#a06f3f] hover:from-[#a06f3f] hover:to-[#8a6d3b] text-[#fffcf6] font-bold rounded-lg text-xs transition cursor-pointer"
                      >
                        🖼️ 打开仙册点化
                      </button>
                    </div>
                    {/* 密码登录（小程序仙册登录兜底） */}
                    {!agentState.token && (
                      <div className="bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg p-2.5 space-y-1.5">
                        <span className="text-[11px] font-bold text-[#4a6a7c]">🔑 密码登录</span>
                        <input type="text" value={pwdLoginAccount} onChange={(e) => setPwdLoginAccount(e.target.value)} placeholder="名号 / DID" className="w-full bg-[#f4f1ea] border border-[#e3dcce] rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]" />
                        <input type="password" value={pwdLoginPassword} onChange={(e) => setPwdLoginPassword(e.target.value)} placeholder="密码" className="w-full bg-[#f4f1ea] border border-[#e3dcce] rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]" />
                        <button
                          type="button"
                          onClick={async () => {
                            if (!pwdLoginAccount.trim() || !pwdLoginPassword) { showToast("请输入名号与密码"); return; }
                            const r = await passwordLogin(pwdLoginAccount.trim(), pwdLoginPassword);
                            if (r.ok) { setPwdLoginAccount(""); setPwdLoginPassword(""); showToast("✅ 已登录"); } else { showToast(r.msg || "登录失败"); }
                          }}
                          className="w-full py-1 bg-[#5b7a8c] hover:bg-[#4a6a7c] text-[#fffcf6] font-bold rounded text-[11px] cursor-pointer"
                        >
                          登录
                        </button>
                      </div>
                    )}
                    {/* 京东授权状态（小程序 settings 同款） */}
                    {agentState.token && (
                      <div className="flex items-center justify-between bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg px-2.5 py-2">
                        <span className="text-[11px] text-[#4a4438]">京东授权状态</span>
                        <span className="flex items-center gap-1.5">
                          <span className={`text-[11px] font-bold ${jdStatus?.bound ? "text-[#6b7b3a]" : "text-[#8a7f6d]"}`}>
                            {jdStatus ? (jdStatus.bound ? "✅ 已绑定" + (jdStatus.expiresAt ? `（${new Date(jdStatus.expiresAt).toLocaleDateString()} 到期）` : "") : "未绑定") : "—"}
                          </span>
                          <button type="button" onClick={() => fetchJdStatus()} className="text-[11px] text-[#5b7a8c] hover:underline cursor-pointer">查询</button>
                        </span>
                      </div>
                    )}
                    {/* 登出（小程序 settings 同款） */}
                    {agentState.token && (
                      <button
                        type="button"
                        onClick={logout}
                        className="w-full py-1.5 bg-[#f9ecea]/40 hover:bg-[#b0543f]/60 border border-[#9e2a2b]/30 text-[#b0543f] hover:text-[#fffcf6] font-bold rounded text-[11px] cursor-pointer transition"
                      >
                        🚪 退出登录
                      </button>
                    )}
                    {agentState.token && (
                      <div className="bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-[#8a6d3b] font-semibold">🔑 当前契约凭证 (JWT)</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(agentState.token || "");
                              showToast("凭证已复制到剪贴板");
                            }}
                            className="px-1.5 py-0.5 bg-[#f6eddd]/40 hover:bg-[#f6eddd] border border-[#8a6d3b]/20 hover:border-[#8a6d3b] rounded text-[#8a6d3b] transition cursor-pointer font-bold"
                          >
                            复制 Token 📋
                          </button>
                        </div>
                        <div className="bg-[#f4f1ea] p-1.5 rounded border border-[#e3dcce] font-mono text-[11px] text-[#8a7f6d] break-all select-all select-text max-h-[50px] overflow-y-auto">
                          {agentState.token}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {navView("knowledge") && (
                  <div className="flex flex-col space-y-2 text-[11px]">
                    {/* 问答 / 文档 tabs（小程序 knowledge 同款） */}
                    <div className="flex items-center gap-1.5">
                      {([["ask", "问答"], ["docs", "文档"]] as const).map(([k, label]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setKbTab(k)}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer border ${kbTab === k ? "bg-[#9e2a2b] text-[#fffcf6] border-[#9e2a2b]" : "bg-[#fffcf6]/50 text-[#6b6560] border-[#e3dcce] hover:bg-[#f6f2ea]"}`}
                        >
                          {label}
                        </button>
                      ))}
                      <button type="button" onClick={fetchKb} className="ml-auto px-2 py-0.5 rounded-full text-[11px] text-[#5b7a8c] border border-[#5b7a8c]/30 hover:bg-[#f6f2ea] transition cursor-pointer">⟳ 刷新</button>
                    </div>

                    {kbTab === "ask" && (
                      <div className="bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg p-2.5 space-y-2">
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={kbAskQ}
                            onChange={(e) => setKbAskQ(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key !== "Enter" || kbAsking) return;
                              (async () => {
                                const q = kbAskQ.trim();
                                if (!q) return;
                                setKbAsking(true);
                                setKbAskAnswer("（正在检索知识库…）");
                                setKbAskCitations([]);
                                const r = await knowledgeAskFull(q, kbAskHistory);
                                setKbAskAnswer(r.answer || "（未能寻得答案）");
                                setKbAskCitations(r.citations);
                                setKbAskHistory((h) => [...h, { role: "user", content: q }, { role: "assistant", content: r.answer }]);
                                setKbAskQ("");
                                setKbAsking(false);
                              })();
                            }}
                            placeholder="向知识库提问…（回车提问）"
                            className="flex-1 bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]"
                          />
                          <button
                            type="button"
                            disabled={kbAsking}
                            onClick={async () => {
                              const q = kbAskQ.trim();
                              if (!q || kbAsking) return;
                              setKbAsking(true);
                              setKbAskAnswer("（正在检索知识库…）");
                              setKbAskCitations([]);
                              const r = await knowledgeAskFull(q, kbAskHistory);
                              setKbAskAnswer(r.answer || "（未能寻得答案）");
                              setKbAskCitations(r.citations);
                              setKbAskHistory((h) => [...h, { role: "user", content: q }, { role: "assistant", content: r.answer }]);
                              setKbAskQ("");
                              setKbAsking(false);
                            }}
                            className="px-2.5 py-1 bg-[#9e2a2b] hover:bg-[#b0543f] text-[#fffcf6] font-bold rounded text-[11px] transition cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            提问
                          </button>
                        </div>
                        {kbAskAnswer && (
                          <div className="text-[11px] text-[#4a4438] leading-relaxed whitespace-pre-wrap bg-[#f4f1ea] p-2 rounded border border-[#e3dcce] max-h-40 overflow-y-auto">
                            {kbAskAnswer}
                          </div>
                        )}
                        {/* 引用溯源（小程序 citations 高亮片段同款） */}
                        {kbAskCitations.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[11px] font-bold text-[#8a6d3b]">📚 引用来源</span>
                            {kbAskCitations.map((c: any, i: number) => (
                              <div
                                key={i}
                                onClick={() => { setKbDocOpen(true); setKbRenameTitle(c.title || ""); fetchKbDoc(c.docKey); }}
                                className="bg-[#fffcf6]/70 border border-[#e3dcce] rounded p-1.5 cursor-pointer hover:border-[#5b7a8c]/40 transition"
                              >
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] font-bold text-[#2b2b2b] truncate">{c.title}</span>
                                  <span className="ml-auto text-[10px] text-[#8a7f6d] shrink-0">相关度 {(Math.round((c.score || 0) * 100))}%</span>
                                </div>
                                <p className="text-[10px] text-[#6b6560] line-clamp-2 mt-0.5">{c.snippet}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {kbTab === "docs" && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={kbSearchQ}
                            onChange={(e) => setKbSearchQ(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && kbSearchQ.trim()) kbSearch(kbSearchQ.trim()); }}
                            placeholder="搜索文档…"
                            className="flex-1 bg-[#fffcf6]/60 border border-[#e3dcce] text-[#4a4438] rounded-full px-2.5 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]"
                          />
                          <button
                            type="button"
                            onClick={() => { if (!kbSearchQ.trim()) { showToast("先输入搜索词"); return; } kbSearch(kbSearchQ.trim()); }}
                            className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#5b7a8c] hover:bg-[#4a6a7c] text-[#fffcf6] transition cursor-pointer shrink-0"
                          >
                            搜索
                          </button>
                          <label className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#f6eddd]/60 hover:bg-[#f6eddd] text-[#8a6d3b] border border-[#8a6d3b]/30 transition cursor-pointer shrink-0">
                            ⬆ 上传
                            <input
                              type="file"
                              accept=".txt,.md,.pdf,.csv,.json,.html,.docx,.xlsx"
                              className="hidden"
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                if (f.size > 5 * 1024 * 1024) { showToast("文件超过 5MB"); return; }
                                const ok = await kbUpload(f);
                                showToast(ok ? "✅ 文档已入知识库" : "❌ 上传失败");
                                if (ok) fetchKb();
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => { setKbManageMode(!kbManageMode); setKbSel({}); }}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer border ${kbManageMode ? "bg-[#9e2a2b] text-[#fffcf6] border-[#9e2a2b]" : "bg-[#fffcf6]/50 text-[#6b6560] border-[#e3dcce] hover:bg-[#f6f2ea]"}`}
                          >
                            管理
                          </button>
                        </div>
                        {kbSearchResults.length > 0 && (
                          <p className="text-[10px] text-[#8a7f6d]">搜索命中 {kbSearchResults.length} 篇（点「⟳ 刷新」返回全列表）</p>
                        )}
                        {kbManageMode && kbDocs.length > 0 && (
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setKbSel(kbDocs.reduce((acc: any, d: any) => ({ ...acc, [d.docKey]: true }), {}))} className="text-[11px] text-[#5b7a8c] hover:underline cursor-pointer">全选</button>
                            <button
                              type="button"
                              onClick={async () => {
                                const keys = Object.keys(kbSel).filter((k) => kbSel[k]);
                                if (!keys.length) { showToast("未选择文档"); return; }
                                const ok = await kbManage({ action: "batchDelete", docKeys: keys });
                                showToast(ok ? "✅ 已删除所选文档" : "❌ 删除失败");
                                if (ok) { setKbSel({}); fetchKb(); }
                              }}
                              className="text-[11px] text-[#a93230] hover:underline cursor-pointer"
                            >
                              批量删除（{Object.keys(kbSel).filter((k) => kbSel[k]).length}）
                            </button>
                          </div>
                        )}
                        {kbDocs.length === 0 ? (
                          <p className="text-[#8a7f6d] text-center italic mt-6 text-[11px]">暂无文档（点「⬆ 上传」添加 txt/md/pdf/csv/json/html/docx/xlsx，≤5MB）</p>
                        ) : (
                          kbDocs.map((doc: any) => (
                            <div key={doc.docKey} className="flex items-center gap-2 bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg px-2.5 py-2">
                              {kbManageMode && (
                                <input
                                  type="checkbox"
                                  checked={!!kbSel[doc.docKey]}
                                  onChange={(e) => setKbSel((p) => ({ ...p, [doc.docKey]: e.target.checked }))}
                                  className="shrink-0 cursor-pointer"
                                />
                              )}
                              <span className="flex-1 min-w-0 cursor-pointer" onClick={() => { setKbDocOpen(true); fetchKbDoc(doc.docKey); }}>
                                <span className="block text-xs font-bold text-[#2b2b2b] truncate">{doc.title}</span>
                                <span className="block text-[11px] text-[#8a7f6d]">{doc.charCount} 字 · {doc.chunkCount} 块</span>
                              </span>
                              {kbRenameKey === doc.docKey ? (
                                <span className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={kbRenameTitle}
                                    onChange={(e) => setKbRenameTitle(e.target.value)}
                                    className="w-28 bg-[#f4f1ea] border border-[#e3dcce] rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-[#5b7a8c]"
                                  />
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const t = kbRenameTitle.trim();
                                      if (!t) return;
                                      const ok = await kbManage({ action: "rename", docKey: doc.docKey, title: t });
                                      showToast(ok ? "✅ 已改名" : "❌ 改名失败");
                                      setKbRenameKey(null);
                                      if (ok) fetchKb();
                                    }}
                                    className="text-[11px] text-[#5b7a8c] font-bold cursor-pointer"
                                  >
                                    保存
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => { setKbRenameKey(doc.docKey); setKbRenameTitle(doc.title || ""); }}
                                  className="text-[11px] text-[#5b7a8c] hover:underline cursor-pointer shrink-0"
                                >
                                  改名
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  const ok = await kbManage({ action: "toggle", docKey: doc.docKey, enabled: !(doc.enabled !== false) });
                                  showToast(ok ? "✅ 已切换" : "❌ 切换失败");
                                  if (ok) fetchKb();
                                }}
                                className={`px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0 cursor-pointer border ${doc.enabled === false ? "bg-[#f9ecea]/40 text-[#a93230] border-[#a93230]/30" : "bg-[#f2efe4]/40 text-[#6b7b3a] border-[#6b7b3a]/30"}`}
                              >
                                {doc.enabled === false ? "停用" : "启用"}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const ok = await kbManage({ action: "batchDelete", docKeys: [doc.docKey] });
                                  showToast(ok ? "✅ 已删除" : "❌ 删除失败");
                                  if (ok) fetchKb();
                                }}
                                className="text-[11px] text-[#a93230] hover:underline cursor-pointer shrink-0"
                              >
                                删除
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {navView("mcp") && (
                  <div className="flex flex-col space-y-2 text-[11px]">
                    {/* 服务器 / 目录 tabs（小程序 mcp 页同款） */}
                    <div className="flex items-center gap-1.5">
                      {([["servers", "已安装"], ["catalog", "目录"]] as const).map(([k, label]) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => { setMcpTab(k); if (k === "catalog") fetchMcpCatalog(); }}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer border ${mcpTab === k ? "bg-[#9e2a2b] text-[#fffcf6] border-[#9e2a2b]" : "bg-[#fffcf6]/50 text-[#6b6560] border-[#e3dcce] hover:bg-[#f6f2ea]"}`}
                        >
                          {label}
                        </button>
                      ))}
                      <button type="button" onClick={fetchMcp} className="ml-auto px-2 py-0.5 rounded-full text-[11px] text-[#5b7a8c] border border-[#5b7a8c]/30 hover:bg-[#f6f2ea] transition cursor-pointer">⟳ 刷新</button>
                    </div>

                    {mcpTab === "servers" && (
                      <>
                        {/* 自定义接入/编辑表单（小程序自定义接入同款） */}
                        {mcpInstallOpen && (
                          <div className="bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg p-2.5 space-y-1.5">
                            <span className="text-xs font-bold text-[#4a6a7c]">{mcpEditId ? "✏️ 编辑工具服务端" : "＋ 自定义接入"}</span>
                            <input type="text" value={mcpForm.name} onChange={(e) => setMcpForm({ ...mcpForm, name: e.target.value })} placeholder="名称" className="w-full bg-[#f4f1ea] border border-[#e3dcce] rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]" />
                            <input type="text" value={mcpForm.urlTemplate} onChange={(e) => setMcpForm({ ...mcpForm, urlTemplate: e.target.value })} placeholder="URL 模板（如 https://host/mcp）" className="w-full bg-[#f4f1ea] border border-[#e3dcce] rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]" />
                            <input type="text" value={mcpForm.apiKey} onChange={(e) => setMcpForm({ ...mcpForm, apiKey: e.target.value })} placeholder="API Key（可留空）" className="w-full bg-[#f4f1ea] border border-[#e3dcce] rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]" />
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-[#6b6560]">鉴权方式</span>
                              {(["url", "header"] as const).map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setMcpForm({ ...mcpForm, authMode: m })}
                                  className={`px-2 py-0.5 rounded-full text-[11px] border cursor-pointer ${mcpForm.authMode === m ? "bg-[#5b7a8c] text-[#fffcf6] border-[#5b7a8c]" : "bg-[#fffcf6]/50 text-[#6b6560] border-[#e3dcce]"}`}
                                >
                                  {m === "url" ? "URL 参数" : "Header"}
                                </button>
                              ))}
                            </div>
                            {mcpForm.authMode === "header" && (
                              <input type="text" value={mcpForm.authHeaderTemplate} onChange={(e) => setMcpForm({ ...mcpForm, authHeaderTemplate: e.target.value })} placeholder="鉴权 Header 模板（如 Authorization: Bearer {{key}}）" className="w-full bg-[#f4f1ea] border border-[#e3dcce] rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]" />
                            )}
                            <div className="flex justify-end gap-1.5">
                              <button type="button" onClick={() => { setMcpInstallOpen(false); setMcpEditId(null); }} className="px-2.5 py-1 bg-[#f6f2ea] border border-[#e3dcce] text-[#6b6560] rounded text-[11px] cursor-pointer">取消</button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!mcpForm.name.trim() || !mcpForm.urlTemplate.trim()) { showToast("名称与 URL 模板必填"); return; }
                                  const body = { name: mcpForm.name.trim(), urlTemplate: mcpForm.urlTemplate.trim(), apiKey: mcpForm.apiKey.trim() || undefined, authMode: mcpForm.authMode, authHeaderTemplate: mcpForm.authHeaderTemplate.trim() || undefined, description: mcpForm.description.trim() || undefined };
                                  const ok = mcpEditId ? await mcpPatch(mcpEditId, body) : await mcpInstall(body);
                                  showToast(ok ? (mcpEditId ? "✅ 已保存修改" : "✅ 已接入") : "❌ 操作失败");
                                  if (ok) {
                                    setMcpInstallOpen(false);
                                    setMcpEditId(null);
                                    setMcpForm({ name: "", urlTemplate: "", apiKey: "", authMode: "url", authHeaderTemplate: "", description: "" });
                                    fetchMcp();
                                  }
                                }}
                                className="px-2.5 py-1 bg-[#9e2a2b] hover:bg-[#b0543f] text-[#fffcf6] font-bold rounded text-[11px] cursor-pointer"
                              >
                                保存
                              </button>
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => { setMcpInstallOpen(!mcpInstallOpen); setMcpEditId(null); }}
                          className="w-full py-1.5 bg-[#fffcf6]/60 border border-dashed border-[#8a6d3b]/40 text-[#8a6d3b] font-bold rounded text-[11px] transition cursor-pointer hover:bg-[#f6eddd]/40"
                        >
                          {mcpInstallOpen ? "收起表单" : "＋ 自定义接入"}
                        </button>
                        {mcpServers.length === 0 ? (
                          <p className="text-[#8a7f6d] text-center italic mt-6 text-[11px]">未安装工具服务端（可在「目录」一键安装，或自定义接入）</p>
                        ) : (
                          mcpServers.map((srv: any) => (
                            <div key={srv.id} className="flex items-center gap-2 bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg px-2.5 py-2">
                              <span className="flex-1 min-w-0">
                                <span className="block text-xs font-bold text-[#2b2b2b] truncate">{srv.name}{srv.shared ? "（共享）" : ""}</span>
                                <span className="block text-[11px] text-[#8a7f6d] truncate cursor-pointer" title="点击复制" onClick={() => { navigator.clipboard?.writeText(srv.host).catch(() => {}); showToast("已复制 host"); }}>{srv.host} · {srv.toolCount} 个工具</span>
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  const ok = await mcpPatch(srv.id, { enabled: !(srv.enabled !== false) });
                                  showToast(ok ? "✅ 已切换" : "❌ 切换失败");
                                  if (ok) fetchMcp();
                                }}
                                className={`px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0 cursor-pointer border ${srv.enabled === false ? "bg-[#f9ecea]/40 text-[#a93230] border-[#a93230]/30" : "bg-[#f2efe4]/40 text-[#6b7b3a] border-[#6b7b3a]/30"}`}
                              >
                                {srv.enabled === false ? "停用" : "启用"}
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const ok = await mcpTestServer(srv.id);
                                  showToast(ok ? `✅ 「${srv.name}」连通测试通过` : `❌ 「${srv.name}」连通测试失败`);
                                }}
                                className="px-1.5 py-0.5 bg-[#f6f2ea] hover:bg-[#efe9dc] border border-[#5b7a8c]/30 text-[#5b7a8c] rounded text-[11px] cursor-pointer shrink-0"
                              >
                                测试
                              </button>
                              <button
                                type="button"
                                onClick={() => { setMcpEditId(srv.id); setMcpForm({ name: srv.name || "", urlTemplate: srv.host || "", apiKey: "", authMode: srv.authMode || "url", authHeaderTemplate: "", description: srv.description || "" }); setMcpInstallOpen(true); }}
                                className="text-[11px] text-[#5b7a8c] hover:underline cursor-pointer shrink-0"
                              >
                                编辑
                              </button>
                              {!srv.shared && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const ok = await mcpRemove(srv.id);
                                    showToast(ok ? "✅ 已移除" : "❌ 移除失败");
                                    if (ok) fetchMcp();
                                  }}
                                  className="text-[11px] text-[#a93230] hover:underline cursor-pointer shrink-0"
                                >
                                  移除
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </>
                    )}

                    {mcpTab === "catalog" && (
                      <div className="space-y-2">
                        {(["官方", "社区"] as const).map((grp) => (
                          <div key={grp} className="space-y-1.5">
                            <span className="text-xs font-bold text-[#4a6a7c]">{grp === "官方" ? "🏛️ 官方" : "🏘️ 社区"}</span>
                            {mcpCatalog.filter((c: any) => c.group === grp).length === 0 ? (
                              <p className="text-[#8a7f6d] italic text-[11px]">暂无{grp}工具</p>
                            ) : (
                              mcpCatalog.filter((c: any) => c.group === grp).map((c: any) => (
                                <div key={c.serverKey} className="flex items-center gap-2 bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg px-2.5 py-2">
                                  <span className="flex-1 min-w-0">
                                    <span className="block text-xs font-bold text-[#2b2b2b] truncate">{c.name}</span>
                                    <span className="block text-[11px] text-[#8a7f6d] line-clamp-2">{c.description}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (c.needsKey) { setMcpKeyPrompt({ serverKey: c.serverKey, name: c.name }); setMcpKeyInput(""); return; }
                                      (async () => {
                                        const ok = await mcpInstall({ catalogId: c.serverKey });
                                        showToast(ok ? `✅ 已安装「${c.name}」` : "❌ 安装失败");
                                        if (ok) { fetchMcp(); setMcpTab("servers"); }
                                      })();
                                    }}
                                    className="px-2.5 py-1 bg-[#9e2a2b] hover:bg-[#b0543f] text-[#fffcf6] font-bold rounded text-[11px] transition cursor-pointer shrink-0"
                                  >
                                    安装
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {navView("logs") && (
                  <>
                  <div className="flex items-center justify-end gap-2 mb-2">
                    <span className="text-[11px] text-[#8a7f6d]">天机显隐</span>
                    <button
                      type="button"
                      onClick={() => setShowDevLogs(!showDevLogs)}
                      className="w-8 h-4 rounded-full relative transition cursor-pointer shrink-0"
                      style={{ background: showDevLogs ? "#5b7a8c" : "#d8d0bf" }}
                    >
                      <span className="absolute top-0.5 w-3 h-3 rounded-full bg-[#fffcf6] transition-all" style={{ left: showDevLogs ? "18px" : "2px" }} />
                    </button>
                    <button
                      type="button"
                      onClick={clearLogs}
                      className="px-1.5 py-0.5 bg-[#f9ecea]/40 hover:bg-[#b0543f]/60 border border-[#9e2a2b]/30 text-[#b0543f] hover:text-[#fffcf6] rounded text-[11px] cursor-pointer transition font-bold"
                    >
                      🧹 清空日志
                    </button>
                  </div>
                  {/* SYSTEM TELEMETRY LOGS CHANNEL */}
                  {!showDevLogs ? (
                    <p className="text-[#8a7f6d] text-center italic text-[11px] py-6">天机已隐匿（打开「天机显隐」开关恢复日志流）</p>
                  ) : (
                  <div className="space-y-1 font-mono text-[11px]">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-start space-x-2 leading-relaxed animate-fadeIn">
                        <span className="text-[#8a7f6d] text-[11px] shrink-0">{log.timestamp}</span>
                        {log.type === "SYSTEM" && (
                          <span className="text-[#6b7b3a] bg-[#f2efe4]/30 px-1 py-0.2 rounded shrink-0 font-bold text-[11px]">SYS</span>
                        )}
                        {log.type === "THOUGHT" && (
                          <span className="text-[#8a6d3b] bg-[#f6eddd]/30 px-1 py-0.2 rounded shrink-0 font-bold text-[11px]">MIND</span>
                        )}
                        {log.type === "ACTION" && (
                          <span className="text-[#4a6a7c] bg-[#f6f2ea]/30 px-1 py-0.2 rounded shrink-0 font-bold text-[11px]">ACT</span>
                        )}
                        <span className={`flex-1 break-all ${
                          log.type === "SYSTEM" ? "text-[#6b6560]" : log.type === "THOUGHT" ? "text-[#8a6d3b]" : "text-[#3d5a5b] font-semibold"
                        }`}>
                          {log.message}
                        </span>
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                  )}
                  </>
                )}

                {navView("contacts") && (
                  <>
                  {/* 小程序联系人同款：好友请求入口 + 添加朋友 */}
                  {contactRequests.length > 0 && (
                    <div className="bg-[#9e2a2b]/10 border border-[#9e2a2b]/30 rounded-lg p-2.5 space-y-1.5">
                      <span className="text-[11px] font-bold text-[#9e2a2b]">新朋友请求（{contactRequests.length}）</span>
                      {contactRequests.map((rq: any) => (
                        <div key={rq.id} className="flex items-center gap-1.5 bg-[#fffcf6]/80 rounded px-2 py-1.5">
                          <span className="flex-1 min-w-0 text-[11px] text-[#2b2b2b] truncate">
                            <b>{(rq.from?.displayName || rq.from?.name || "道友")}</b>{" "}
                            <span className="text-[#8a7f6d]">{rq.message || ""}</span>
                          </span>
                          <button type="button" onClick={async () => { if ((await contactAction(`/requests/${rq.id}/approve`, "POST"))?.ok) fetchContactsList(); }} className="px-1.5 py-0.5 bg-[#5b7a8c] text-[#fffcf6] rounded text-[11px] font-bold cursor-pointer shrink-0">接受</button>
                          <button type="button" onClick={async () => { if ((await contactAction(`/requests/${rq.id}/reject`, "POST"))?.ok) fetchContactsList(); }} className="px-1.5 py-0.5 bg-[#f6f2ea] border border-[#e3dcce] text-[#6b6560] rounded text-[11px] cursor-pointer shrink-0">拒绝</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5 bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg p-2.5">
                    <span className="text-[11px] font-bold text-[#4a6a7c]">👥 添加朋友</span>
                    <div className="flex gap-1.5">
                      <input type="text" value={contactSearchQ} onChange={(e) => setContactSearchQ(e.target.value)} placeholder="搜索道友…" className="flex-1 bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#5b7a8c]" />
                      <button type="button" onClick={async () => {
                        if (!contactSearchQ.trim()) return;
                        const r = await contactAction(`/search?q=${encodeURIComponent(contactSearchQ.trim())}`, "GET");
                        setContactSearchResults(r?.ok ? (r.data.results || []) : []);
                      }} className="px-2.5 py-1 bg-[#5b7a8c] text-[#fffcf6] rounded text-xs font-bold cursor-pointer">搜</button>
                      <button
                        type="button"
                        onClick={async () => {
                          await fetchContactSuggestions();
                          showToast(contactSuggestions.length ? "已加载推荐道友" : "暂无推荐（共同房间成员）");
                        }}
                        className="px-2.5 py-1 bg-[#f6eddd]/60 hover:bg-[#f6eddd] text-[#8a6d3b] rounded text-xs font-bold cursor-pointer border border-[#8a6d3b]/30"
                      >
                        推荐
                      </button>
                    </div>
                    {contactSuggestions.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] text-[#8a7f6d]">推荐道友（共同房间）</span>
                        {contactSuggestions.map((sg: any) => (
                          <div key={sg.id} className="flex items-center gap-1.5 bg-[#fffcf6]/80 rounded px-2 py-1.5">
                            <span className="flex-1 min-w-0 text-[11px] text-[#2b2b2b] truncate">
                              {sg.contactName || sg.profile?.displayName || sg.profile?.name}
                              {sg.reason ? <span className="text-[#8a7f6d]">（{sg.reason}）</span> : null}
                            </span>
                            <button type="button" onClick={async () => {
                              const r = await contactAction("/requests", "POST", { target: sg.id, message: "道友，久仰大名，可否结交？" });
                              if (r?.ok) { addLog("SYSTEM", "好友请求已发出"); fetchContactsList(); } else { addLog("SYSTEM", `请求失败：${r?.data?.error || ""}`); }
                            }} className="px-1.5 py-0.5 bg-[#9e2a2b] text-[#fffcf6] rounded text-[11px] font-bold cursor-pointer shrink-0">＋添加</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {contactSearchResults.map((res: any) => (
                      <div key={res.id} className="flex items-center gap-1.5 bg-[#fffcf6]/80 rounded px-2 py-1.5">
                        <span className="flex-1 min-w-0 text-[11px] text-[#2b2b2b] truncate">{res.contactName || res.profile?.displayName || res.profile?.name}</span>
                        {res.relation ? (
                          <span className="text-[11px] text-[#8a7f6d] shrink-0">
                            {res.relation === "FRIEND" ? "✓已好友" : res.relation === "REQUEST_SENT" ? "已发送" : res.relation === "BLOCKED" ? "已拉黑" : "收到请求"}
                          </span>
                        ) : (
                          <button type="button" onClick={async () => {
                            setReqTarget({ id: res.id, name: res.contactName || res.profile?.displayName || res.profile?.name });
                            setReqMsg("道友，久仰大名，可否结交？");
                          }} className="px-1.5 py-0.5 bg-[#9e2a2b] text-[#fffcf6] rounded text-[11px] font-bold cursor-pointer shrink-0">＋添加</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* 联系人列表（小程序 contact 行：置顶/收藏/备注/删除/拉黑/发消息） */}
                  {contactsList.length === 0 ? (
                    <p className="text-[#8a7f6d] text-center italic mt-4 text-[11px]">暂无联系人</p>
                  ) : (
                    contactsList.map((c: any) => (
                      <div key={c.friendId} className="flex items-center gap-1.5 bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg px-2.5 py-2">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 bg-[#9e2a2b]/10 text-[#9e2a2b]">
                          {(c.contactName || c.profile?.displayName || c.profile?.name || "友").charAt(0)}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-bold text-[#2b2b2b] truncate">
                            {c.contactName || c.profile?.displayName || c.profile?.name}
                            {c.pinned && <span className="ml-1 text-[11px] text-[#9e2a2b]">顶</span>}
                            {c.favorite && <span className="ml-1 text-[11px] text-[#a06f3f]">★</span>}
                          </span>
                          <span className="block text-[11px] text-[#8a7f6d] truncate">{c.lastMessagePreview || c.profile?.description || ""}</span>
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <button type="button" title="详情" onClick={() => {
                            setContactProfileFriendId(c.friendId);
                            setContactEditName(c.contactName || "");
                            setContactEditTags((c.tags || []).join(","));
                            setContactProfileOpen(true);
                            fetchContactProfile(c.friendId);
                          }} className="px-1 py-0.5 text-[11px] text-[#5b7a8c] cursor-pointer">详情</button>
                          <button type="button" title="置顶" onClick={async () => { if ((await contactAction(`/${c.friendId}`, "PUT", { pinned: !c.pinned }))?.ok) fetchContactsList(); }} className="px-1 py-0.5 text-[11px] text-[#9e2a2b] cursor-pointer">{c.pinned ? "取消置顶" : "置顶"}</button>
                          <button type="button" title="收藏" onClick={async () => { if ((await contactAction(`/${c.friendId}`, "PUT", { favorite: !c.favorite }))?.ok) fetchContactsList(); }} className="px-1 py-0.5 text-[11px] text-[#a06f3f] cursor-pointer">{c.favorite ? "★" : "☆"}</button>
                          <button type="button" title="备注" onClick={async () => {
                            setContactProfileFriendId(c.friendId);
                            setContactEditName(c.contactName || "");
                            setContactEditTags((c.tags || []).join(","));
                            setContactProfileOpen(true);
                            fetchContactProfile(c.friendId);
                          }} className="px-1 py-0.5 text-[11px] text-[#4a6a7c] cursor-pointer">备注</button>
                          <button type="button" title="发消息" onClick={async () => {
                            const r = await contactAction(`/${c.friendId}/dm`, "POST");
                            if (r?.ok && r.data?.roomId) goWinbNav({ view: "room", top: "shennian", sub: "sessions", roomId: r.data.roomId });
                          }} className="px-1 py-0.5 text-[11px] text-[#5b7a8c] cursor-pointer">私聊</button>
                          <button type="button" title="拉黑" onClick={async () => { if ((await contactAction(`/${c.friendId}/block`, "POST"))?.ok) { addLog("SYSTEM", "已拉黑"); fetchContactsList(); } }} className="px-1 py-0.5 text-[11px] text-[#8a7f6d] cursor-pointer">拉黑</button>
                          <button type="button" title="删除" onClick={async () => { if ((await contactAction(`/${c.friendId}`, "DELETE"))?.ok) { showToast("✅ 已删除好友"); fetchContactsList(); } }} className="px-1 py-0.5 text-[11px] text-[#b0543f] cursor-pointer">删除</button>
                        </div>
                      </div>
                    ))
                  )}
                  {/* SETTINGS & FRIENDS MANAGEMENT CHANNEL（原有结缘/代管保留） */}
                  <div className="flex flex-col space-y-4 text-[11px]">
                    
                    {/* Friends Panel */}
                    <div className="border-b border-[#5b7a8c]/10 pb-3">
                      <div>
                        <div className="text-[#4a6a7c] font-bold border-b border-[#e3dcce] pb-1 mb-1.5 flex justify-between items-center">
                          <span>🛸 结缘道友列表 (Friends Settings)</span>
                        </div>
                        <p className="text-[11px] text-[#6b6560] leading-normal mb-2">
                          在此管理您的社交圈。勾选「代管」后，该好友发送的消息将由大荒自动代管应答。
                        </p>
                      </div>

                      {/* Friends list area */}
                      <div className="space-y-1 text-[11px] max-h-[140px] overflow-y-auto pr-1">
                        {friends.length === 0 ? (
                          <p className="text-[#8a7f6d] text-center italic mt-6 text-[11px]">暂无结缘道友。请在下方输入名号结缘。</p>
                        ) : (
                          friends.map((friend) => (
                            <div key={friend.id} className="flex justify-between items-center bg-[#fffcf6]/50 p-2 rounded border border-[#d8d0bf]/60">
                              <div className="flex items-center space-x-1.5">
                                <span className="text-[#6b7b3a] font-bold text-[11px] bg-[#f2efe4]/40 px-1 rounded border border-[#eef3ec]/50">好友</span>
                                <span className="text-[#4a4438] font-medium break-all">{friend.name}</span>
                              </div>
                              <label className="flex items-center space-x-1 shrink-0 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={friend.autoReply}
                                  onChange={() => toggleAutoReply(friend.name, friend.autoReply)}
                                  className="rounded border-[#d8d0bf] bg-[#f4f1ea] text-[#5b7a8c] focus:ring-0 focus:ring-offset-0 h-3 w-3 cursor-pointer"
                                />
                                <span className="text-[#6b6560] text-[11px]">代管</span>
                              </label>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Friend Box */}
                      <div className="mt-2 pt-2 border-t border-[#e3dcce] flex space-x-1.5">
                        <input
                          type="text"
                          value={addFriendName}
                          onChange={(e) => setAddFriendName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddFriend()}
                          placeholder="输入道友名号结缘..."
                          className="flex-1 bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]"
                        />
                        <button
                          onClick={handleAddFriend}
                          className="px-3 py-1 bg-[#5b7a8c] hover:bg-[#4a6a7c] active:bg-[#5b7a8c] text-[#fffcf6] font-bold rounded text-[11px] cursor-pointer"
                        >
                          结缘
                        </button>
                      </div>
                    </div>



                  </div>
                  </>
                )}

                {navView("tasks") && (
                  <div className="flex flex-col space-y-3 text-[11px]">
                    {/* 统计 4 格（小程序任务中心同款） */}
                    <div className="grid grid-cols-4 gap-2 shrink-0">
                      {[
                        { k: "pending", label: "待处理", color: "#a06f3f" },
                        { k: "processing", label: "进行中", color: "#9e2a2b" },
                        { k: "completed", label: "已完成", color: "#6b7b3a" },
                        { k: "failed", label: "失败", color: "#a93230" },
                      ].map((cell) => (
                        <button
                          key={cell.k}
                          type="button"
                          onClick={() => fetchTasksList(cell.k)}
                          className="bg-[#fffcf6]/50 border border-[#e3dcce] p-2 rounded-lg text-center transition cursor-pointer hover:bg-[#f6f2ea]"
                        >
                          <div className="text-base font-bold" style={{ color: cell.color }}>{taskCounts[cell.k] ?? 0}</div>
                          <div className="text-[11px] text-[#8a7f6d]">{cell.label}</div>
                        </button>
                      ))}
                    </div>
                    {/* 状态筛选 pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { k: undefined, label: "全部" },
                        { k: "pending", label: "待处理" },
                        { k: "processing", label: "进行中" },
                        { k: "completed", label: "已完成" },
                        { k: "failed", label: "失败" },
                      ].map((f) => (
                        <button
                          key={f.label}
                          type="button"
                          onClick={() => fetchTasksList(f.k)}
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer bg-[#fffcf6]/50 text-[#6b6560] border border-[#e3dcce] hover:bg-[#f6f2ea]"
                        >
                          {f.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => fetchTasksList()}
                        className="ml-auto px-2 py-0.5 rounded-full text-[11px] text-[#5b7a8c] border border-[#5b7a8c]/30 hover:bg-[#f6f2ea] transition cursor-pointer"
                      >
                        ⟳ 刷新
                      </button>
                    </div>
                    {/* 任务列表（点击拉详情） */}
                    {taskList.length === 0 ? (
                      <p className="text-[#8a7f6d] text-center italic mt-6 text-[11px]">暂无任务</p>
                    ) : (
                      taskList.map((task: any) => (
                        <div key={task.id} className="bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg p-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0"
                              style={{
                                background:
                                  task.status === "PENDING" ? "rgba(160,111,63,0.15)" :
                                  task.status === "PROCESSING" ? "rgba(158,42,43,0.12)" :
                                  task.status === "COMPLETED" ? "rgba(107,123,58,0.15)" :
                                  task.status === "FAILED" || task.status === "DEAD_LETTER" ? "rgba(169,50,48,0.12)" : "rgba(138,127,109,0.12)",
                                color:
                                  task.status === "PENDING" ? "#a06f3f" :
                                  task.status === "PROCESSING" ? "#9e2a2b" :
                                  task.status === "COMPLETED" ? "#6b7b3a" :
                                  task.status === "FAILED" || task.status === "DEAD_LETTER" ? "#a93230" : "#8a7f6d",
                              }}
                            >
                              {task.status === "PENDING" ? "待处理" : task.status === "PROCESSING" ? "进行中" : task.status === "COMPLETED" ? "已完成" : task.status === "DEAD_LETTER" ? "已超时" : task.status === "FAILED" ? "失败" : task.status}
                            </span>
                            <span className="flex-1 min-w-0 text-xs font-bold text-[#2b2b2b] truncate cursor-pointer" onClick={() => { setTaskDetailOpen(true); fetchTaskDetail(task.id); }}>
                              {task.title || task.command || task.id}
                            </span>
                          </div>
                          {task.error && <p className="text-[11px] text-[#a93230] mt-1 truncate">{task.error}</p>}
                          {task.resultPreview && <p className="text-[11px] text-[#8a7f6d] mt-1 truncate">{task.resultPreview}</p>}
                          <div className="flex gap-1.5 mt-1.5">
                            {(task.status === "FAILED" || task.status === "DEAD_LETTER") && (
                              <>
                                <button
                                  type="button"
                                  onClick={async () => { if (await taskAction(task.id, "retry")) { addLog("SYSTEM", "已重新执行任务"); fetchTasksList(); } }}
                                  className="px-2 py-0.5 bg-[#5b7a8c] text-[#fffcf6] rounded text-[11px] font-bold transition cursor-pointer hover:bg-[#4a6a7c]"
                                >
                                  重新执行
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => { if (await taskAction(task.id, "resume")) { addLog("SYSTEM", "已从检查点续跑"); fetchTasksList(); } }}
                                  className="px-2 py-0.5 bg-[#f6f2ea] border border-[#e3dcce] text-[#4a6a7c] rounded text-[11px] font-bold transition cursor-pointer hover:bg-[#efe9dc]"
                                >
                                  从检查点续跑
                                </button>
                              </>
                            )}
                            {(task.status === "PENDING" || task.status === "PROCESSING") && (
                              <button
                                type="button"
                                onClick={async () => { if (await taskAction(task.id, "cancel")) { addLog("SYSTEM", "已取消任务"); fetchTasksList(); } }}
                                className="px-2 py-0.5 bg-[#f9ecea] border border-[#9e2a2b]/30 text-[#b0543f] rounded text-[11px] font-bold transition cursor-pointer hover:bg-[#b0543f]/10"
                              >
                                取消
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {/* 任务详情（点击后展开） */}
                    {taskDetailOpen && taskDetail && (
                      <div className="bg-[#fffcf6]/90 border border-[#5b7a8c]/30 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#2b2b2b] truncate">{taskDetail.title || taskDetail.command || taskDetail.id}</span>
                          <button type="button" onClick={() => setTaskDetailOpen(false)} className="text-[11px] text-[#8a7f6d] cursor-pointer">✕</button>
                        </div>
                        {taskDetail.result?.reply && <p className="text-[11px] text-[#4a4438] mt-1 break-all">{taskDetail.result.reply}</p>}
                        {taskDetail.result?.summary && !taskDetail.result?.reply && <p className="text-[11px] text-[#4a4438] mt-1 break-all">{taskDetail.result.summary}</p>}
                        {Array.isArray(taskDetail.events) && taskDetail.events.length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            {taskDetail.events.slice(-8).map((ev: any, i: number) => (
                              <div key={i} className="flex items-center gap-1.5 text-[11px]">
                                <span className="text-[#5b7a8c] shrink-0">{ev.type === "error" ? "✗" : ev.type === "result" ? "✓" : "·"}</span>
                                <span className="text-[#6b6560] truncate">{ev.content || ev.name || ""}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {navView("decisions") && (
                  <div className="flex flex-col space-y-3 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#4a6a7c]">⚖️ 待主人决策</span>
                      <button
                        type="button"
                        onClick={() => fetchDecisionsList()}
                        className="ml-auto px-2 py-0.5 rounded-full text-[11px] text-[#5b7a8c] border border-[#5b7a8c]/30 hover:bg-[#f6f2ea] transition cursor-pointer"
                      >
                        ⟳ 刷新
                      </button>
                    </div>
                    {decisionsList.length === 0 ? (
                      <p className="text-[#8a7f6d] text-center italic mt-6 text-[11px]">没有待决策的事项</p>
                    ) : (
                      decisionsList.map((dec: any) => (
                        <div key={dec.id} className="bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg p-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm shrink-0">{dec.type === "INVITE" ? "🍺" : dec.type === "CONFIRM" ? "❓" : "📝"}</span>
                            <span className="flex-1 min-w-0 text-xs font-bold text-[#2b2b2b] truncate">{dec.title}</span>
                          </div>
                          {dec.detail && <p className="text-[11px] text-[#6b6560] mt-1">{dec.detail}</p>}
                          <div className="flex gap-1.5 mt-1.5">
                            <button
                              type="button"
                              onClick={async () => { if (await answerDecision(dec.id, "同意")) { addLog("SYSTEM", "已转达决策：同意"); fetchDecisionsList(); } }}
                              className="px-2 py-0.5 bg-[#5b7a8c] text-[#fffcf6] rounded text-[11px] font-bold transition cursor-pointer hover:bg-[#4a6a7c]"
                            >
                              接受
                            </button>
                            <button
                              type="button"
                              onClick={async () => { if (await answerDecision(dec.id, "不同意")) { addLog("SYSTEM", "已转达决策：不同意"); fetchDecisionsList(); } }}
                              className="px-2 py-0.5 bg-[#f6f2ea] border border-[#e3dcce] text-[#4a6a7c] rounded text-[11px] font-bold transition cursor-pointer hover:bg-[#efe9dc]"
                            >
                              拒绝
                            </button>
                            <button
                              type="button"
                              onClick={() => { setDecCustomId(decCustomId === dec.id ? null : dec.id); setDecCustomText(""); }}
                              className="px-2 py-0.5 bg-[#f6eddd]/60 border border-[#8a6d3b]/30 text-[#8a6d3b] rounded text-[11px] transition cursor-pointer hover:bg-[#f6eddd]"
                            >
                              自定义答复
                            </button>
                            <button
                              type="button"
                              onClick={async () => { if (await dismissDecision(dec.id)) { addLog("SYSTEM", "已忽略该决策"); fetchDecisionsList(); } }}
                              className="px-2 py-0.5 bg-[#f6f2ea] border border-[#e3dcce] text-[#8a7f6d] rounded text-[11px] transition cursor-pointer hover:bg-[#efe9dc]"
                            >
                              忽略
                            </button>
                          </div>
                          {decCustomId === dec.id && (
                            <div className="flex gap-1.5 mt-1.5">
                              <input
                                type="text"
                                value={decCustomText}
                                onChange={(e) => setDecCustomText(e.target.value)}
                                placeholder="写下主人的答复…（回车转达）"
                                onKeyDown={(e) => {
                                  if (e.key !== "Enter" || !decCustomText.trim()) return;
                                  (async () => { if (await answerDecision(dec.id, decCustomText.trim())) { addLog("SYSTEM", "已转达自定义答复"); setDecCustomId(null); fetchDecisionsList(); } })();
                                }}
                                className="flex-1 bg-[#f4f1ea] border border-[#e3dcce] rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]"
                              />
                              <button
                                type="button"
                                onClick={async () => { if (!decCustomText.trim()) return; if (await answerDecision(dec.id, decCustomText.trim())) { addLog("SYSTEM", "已转达自定义答复"); setDecCustomId(null); fetchDecisionsList(); } }}
                                className="px-2 py-0.5 bg-[#9e2a2b] text-[#fffcf6] rounded text-[11px] font-bold cursor-pointer"
                              >
                                转达
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {navView("schedule") && (
                  <div className="flex flex-col space-y-3 text-[11px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { v: "today", label: "今天" },
                        { v: "week", label: "本周" },
                        { v: "all", label: "全部" },
                        { v: "inbox", label: `收件箱(${scheduleInbox})` },
                      ].map((vw) => (
                        <button
                          key={vw.v}
                          type="button"
                          onClick={() => fetchSchedule(vw.v)}
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer bg-[#fffcf6]/50 text-[#6b6560] border border-[#e3dcce] hover:bg-[#f6f2ea]"
                        >
                          {vw.label}
                        </button>
                      ))}
                      <button type="button" onClick={() => setScheduleCreateOpen(!scheduleCreateOpen)} className="ml-auto px-2.5 py-0.5 rounded-full text-[11px] text-[#fffcf6] bg-[#9e2a2b] hover:bg-[#b0543f] transition cursor-pointer">
                        ＋ 新建
                      </button>
                    </div>
                    {/* 新建弹层 */}
                    {scheduleCreateOpen && (
                      <div className="flex flex-col gap-1.5 bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg p-2.5">
                        <input
                          type="text"
                          value={scheduleTitle}
                          onChange={(e) => setScheduleTitle(e.target.value)}
                          placeholder="日程标题"
                          className="bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#5b7a8c]"
                        />
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => setScheduleKind("TASK")} className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer ${scheduleKind === "TASK" ? "bg-[#5b7a8c] text-[#fffcf6]" : "bg-[#f6f2ea] text-[#6b6560]"}`}>存为待办（收件箱）</button>
                          <button type="button" onClick={() => setScheduleKind("REMINDER")} className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer ${scheduleKind === "REMINDER" ? "bg-[#9e2a2b] text-[#fffcf6]" : "bg-[#f6f2ea] text-[#6b6560]"}`}>定时提醒</button>
                          {scheduleKind === "REMINDER" && (
                            <input
                              type="text"
                              value={scheduleDue}
                              onChange={(e) => setScheduleDue(e.target.value)}
                              placeholder="时间（如 2026-09-19T09:30 或 明天 9:30）"
                              className="flex-1 bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#5b7a8c]"
                            />
                          )}
                          <select
                            value={scheduleRepeat}
                            onChange={(e) => setScheduleRepeat(e.target.value)}
                            className="bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-1.5 py-1 text-[11px] focus:outline-none cursor-pointer"
                          >
                            <option value="">不重复</option>
                            <option value="FREQ=DAILY">每天</option>
                            <option value="FREQ=WEEKLY">每周</option>
                            <option value="FREQ=MONTHLY">每月</option>
                            <option value="FREQ=YEARLY">每年</option>
                          </select>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={async () => {
                              if (!scheduleTitle.trim()) return;
                              let dueAt: string | undefined;
                              if (scheduleKind === "REMINDER") {
                                const m = /(明天|后天)?\s*(\d{1,2}):(\d{2})/.exec(scheduleDue);
                                if (m) {
                                  const day = m[1] === "明天" ? 1 : m[1] === "后天" ? 2 : 0;
                                  const dt = new Date();
                                  dt.setDate(dt.getDate() + day);
                                  dt.setHours(parseInt(m[2]), parseInt(m[3]), 0, 0);
                                  dueAt = dt.toISOString();
                                } else if (scheduleDue) {
                                  dueAt = scheduleDue;
                                }
                              }
                              const ok = await createSchedule({ title: scheduleTitle.trim(), kind: scheduleKind, dueAt, advanceMinutes: scheduleKind === "REMINDER" ? [0] : [], rrule: scheduleRepeat || null, source: "USER" });
                              if (ok) {
                                setScheduleTitle("");
                                setScheduleCreateOpen(false);
                                fetchSchedule();
                              } else {
                                addLog("SYSTEM", "❌ 新建日程失败");
                              }
                            }}
                            className="px-3 py-1 bg-[#9e2a2b] text-[#fffcf6] font-bold rounded text-xs transition cursor-pointer"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    )}
                    {/* 分组列表（客户端分桶，同小程序） */}
                    {scheduleList.length === 0 ? (
                      <p className="text-[#8a7f6d] text-center italic mt-6 text-[11px]">暂无日程，点「＋ 新建」安排一件</p>
                    ) : (
                      (() => {
                        const groups: { label: string; items: any[] }[] = [];
                        const push = (label: string, item: any) => {
                          let g = groups.find((x) => x.label === label);
                          if (!g) { g = { label, items: [] }; groups.push(g); }
                          g.items.push(item);
                        };
                        scheduleList.forEach((item: any) => {
                          if (item.status === "COMPLETED") return push("已完成", item);
                          if (item.inbox) return push("收件箱", item);
                          const due = item.dueAt ? new Date(item.dueAt) : null;
                          if (!due) return push("收件箱", item);
                          const now = Date.now();
                          const day = 86400000;
                          if (due.getTime() < now) return push("已过期", item);
                          if (due.getTime() < now + day) return push("今天", item);
                          if (due.getTime() < now + 2 * day) return push("明天", item);
                          if (due.getTime() < now + 8 * day) return push("本周内", item);
                          push("以后", item);
                        });
                        return groups.map((g) => (
                          <div key={g.label}>
                            <div className="text-[11px] text-[#8a7f6d] font-bold px-1 py-1">{g.label}</div>
                            {g.items.map((item: any) => (
                              <div key={item.id} className="flex items-center gap-2 bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg px-2.5 py-2 mb-1">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (await patchSchedule(item.id, { action: item.status === "COMPLETED" ? "reopen" : "complete" })) fetchSchedule();
                                  }}
                                  className="w-4 h-4 rounded-full border shrink-0 transition cursor-pointer"
                                  style={{ background: item.status === "COMPLETED" ? "#6b7b3a" : "transparent", borderColor: item.status === "COMPLETED" ? "#6b7b3a" : "#8a7f6d" }}
                                />
                                <span className="flex-1 min-w-0">
                                  <span className="block text-xs font-bold text-[#2b2b2b] truncate">{item.title}</span>
                                  {item.dueAt && <span className="block text-[11px] text-[#8a7f6d]">{new Date(item.dueAt).toLocaleString()}</span>}
                                </span>
                                {item.status !== "COMPLETED" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={async () => { if (await patchSchedule(item.id, { action: "snooze", snoozeMinutes: 10 })) { addLog("SYSTEM", "已延后 10 分钟"); fetchSchedule(); } }}
                                      className="px-1.5 py-0.5 bg-[#f6f2ea] border border-[#e3dcce] text-[#4a6a7c] rounded text-[11px] transition cursor-pointer hover:bg-[#efe9dc] shrink-0"
                                    >
                                      延后10分
                                    </button>
                                    <button
                                      type="button"
                                      onClick={async () => { if (await patchSchedule(item.id, { action: "snooze", snoozeMinutes: 60 })) { addLog("SYSTEM", "已延后 1 小时"); fetchSchedule(); } }}
                                      className="px-1.5 py-0.5 bg-[#f6f2ea] border border-[#e3dcce] text-[#4a6a7c] rounded text-[11px] transition cursor-pointer hover:bg-[#efe9dc] shrink-0"
                                    >
                                      延后1时
                                    </button>
                                    {item.dueAt && (
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const nd = new Date(new Date(item.dueAt).getTime() + 86400000);
                                          if (await patchSchedule(item.id, { dueAt: nd.toISOString() })) { addLog("SYSTEM", "已改到明天"); fetchSchedule(); }
                                        }}
                                        className="px-1.5 py-0.5 bg-[#f6f2ea] border border-[#e3dcce] text-[#4a6a7c] rounded text-[11px] transition cursor-pointer hover:bg-[#efe9dc] shrink-0"
                                      >
                                        改到明天
                                      </button>
                                    )}
                                    {!item.inbox && item.dueAt && (
                                      <button
                                        type="button"
                                        onClick={async () => { if (await patchSchedule(item.id, { action: "unschedule" })) { addLog("SYSTEM", "已退回收件箱"); fetchSchedule(); } }}
                                        className="px-1.5 py-0.5 bg-[#f6f2ea] border border-[#e3dcce] text-[#4a6a7c] rounded text-[11px] transition cursor-pointer hover:bg-[#efe9dc] shrink-0"
                                      >
                                        退回收件箱
                                      </button>
                                    )}
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={async () => { if (await deleteSchedule(item.id)) fetchSchedule(); }}
                                  className="px-1.5 py-0.5 bg-[#f9ecea] border border-[#9e2a2b]/30 text-[#b0543f] rounded text-[11px] transition cursor-pointer hover:bg-[#b0543f]/10 shrink-0"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        ));
                      })()
                    )}
                  </div>
                )}

                {navView("notifications") && (
                  <div className="flex flex-col space-y-3 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#4a6a7c]">🔔 提醒与订阅（未读 {notifUnread}）</span>
                      <button type="button" onClick={async () => { if (await markAllNotificationsRead()) fetchNotifications(); }} className="ml-auto px-2 py-0.5 rounded-full text-[11px] text-[#5b7a8c] border border-[#5b7a8c]/30 hover:bg-[#f6f2ea] transition cursor-pointer">全部已读</button>
                      <button type="button" onClick={async () => { if (await clearNotifications()) fetchNotifications(); }} className="px-2 py-0.5 rounded-full text-[11px] text-[#b0543f] border border-[#9e2a2b]/30 hover:bg-[#b0543f]/10 transition cursor-pointer">清空</button>
                    </div>
                    {/* 订阅设置开关（同小程序） */}
                    <div className="bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg p-2.5 space-y-1">
                      {[
                        { k: "taskDone", label: "任务完成" },
                        { k: "taskFailed", label: "任务失败" },
                        { k: "decisions", label: "待我决策" },
                        { k: "postReply", label: "帖子回复" },
                        { k: "dailyDigest", label: "每日摘要" },
                        { k: "schedulePush", label: "日程到点推送" },
                      ].map((row) => (
                        <div key={row.k} className="flex items-center justify-between">
                          <span className="text-[11px] text-[#4a4438]">{row.label}</span>
                          <button
                            type="button"
                            onClick={async () => {
                              await saveNotifSetting(row.k, !notifSettings[row.k]);
                              fetchNotifications();
                            }}
                            className="w-8 h-4 rounded-full relative transition cursor-pointer shrink-0"
                            style={{ background: notifSettings[row.k] ? "#5b7a8c" : "#d8d0bf" }}
                          >
                            <span className="absolute top-0.5 w-3 h-3 rounded-full bg-[#fffcf6] transition-all" style={{ left: notifSettings[row.k] ? "18px" : "2px" }} />
                          </button>
                        </div>
                      ))}
                      {/* 细粒度设置（小程序同款：每日上限/摘要时间/免打扰） */}
                      <div className="border-t border-[#e3dcce] pt-1.5 mt-0.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#4a4438]">每日提醒上限</span>
                          <select
                            value={notifSettings.dailyCap ?? 20}
                            onChange={async (e) => { await saveNotifSetting("dailyCap", Number(e.target.value)); fetchNotifications(); }}
                            className="bg-[#f4f1ea] border border-[#e3dcce] rounded px-1 py-0.5 text-[11px] cursor-pointer"
                          >
                            {[0, 5, 10, 20, 50].map((v) => <option key={v} value={v}>{v === 0 ? "不限" : v}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-[#4a4438]">每日摘要时间</span>
                          <input
                            type="text"
                            defaultValue={notifSettings.digestAt || "08:00"}
                            onBlur={async (e) => { const v = e.target.value.trim(); if (/^\d{2}:\d{2}$/.test(v)) { await saveNotifSetting("digestAt", v); fetchNotifications(); } }}
                            className="w-16 bg-[#f4f1ea] border border-[#e3dcce] rounded px-1 py-0.5 text-[11px] text-center"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[11px] text-[#4a4438]">免打扰时段</span>
                          <input
                            type="text"
                            defaultValue={notifSettings.quietStart || ""}
                            placeholder="开始"
                            onBlur={async (e) => { await saveNotifSetting("quietStart", e.target.value.trim() || null); fetchNotifications(); }}
                            className="w-14 bg-[#f4f1ea] border border-[#e3dcce] rounded px-1 py-0.5 text-[11px] text-center"
                          />
                          <span className="text-[11px] text-[#8a7f6d]">—</span>
                          <input
                            type="text"
                            defaultValue={notifSettings.quietEnd || ""}
                            placeholder="结束"
                            onBlur={async (e) => { await saveNotifSetting("quietEnd", e.target.value.trim() || null); fetchNotifications(); }}
                            className="w-14 bg-[#f4f1ea] border border-[#e3dcce] rounded px-1 py-0.5 text-[11px] text-center"
                          />
                          <button
                            type="button"
                            onClick={async () => { await saveNotifSetting("quietStart", null); await saveNotifSetting("quietEnd", null); fetchNotifications(); }}
                            className="text-[11px] text-[#8a7f6d] hover:underline cursor-pointer"
                          >
                            重置
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* 提醒记录 */}
                    {notifList.length === 0 ? (
                      <p className="text-[#8a7f6d] text-center italic mt-6 text-[11px]">暂无提醒</p>
                    ) : (
                      notifList.map((n: any) => (
                        <div key={n.id} className="bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg p-2.5">
                          <div className="flex items-center gap-1.5">
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#9e2a2b] shrink-0" />}
                            <span className={`flex-1 min-w-0 text-xs truncate ${n.read ? "text-[#6b6560]" : "font-bold text-[#2b2b2b]"}`}>{n.title}</span>
                          </div>
                          {n.body && <p className="text-[11px] text-[#8a7f6d] mt-0.5">{n.body}</p>}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {navView("cron") && (
                  // CELESTIAL ORBIT & CRON CONTROLLER
                  <div className="flex flex-col h-full overflow-y-auto space-y-4 p-4 text-[11px] custom-scrollbar">
                    
                    {/* Core HUD */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-[#f6f2ea] to-[#fffcf6]/60 border border-[#5b7a8c]/20 rounded-lg p-4 flex items-center space-x-4 gufeng-cyan shrink-0">
                      <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                        {/* Spinning Orbit rings */}
                        <div className="absolute inset-0 border-2 border-dashed border-[#5b7a8c]/30 rounded-full" />
                        <div className="absolute inset-2 border border-dotted border-[#4a6a7c]/50 rounded-full" />
                        <div className="absolute inset-4 bg-[#f6f2ea]/80 border border-[#5b7a8c]/40 rounded-full flex items-center justify-center font-bold text-[#4a6a7c] text-xs shadow-[0_0_12px_rgba(91, 122, 140, 0.4)]">
                          ☯️
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-[#4a6a7c] font-bold text-xs tracking-wider flex items-center space-x-2">
                          <span>⌛ 天道轮回法轨中心 (Celestial Orbit)</span>
                          <span className="bg-[#6b7b3a]/20 text-[#6b7b3a] border border-[#6b7b3a]/30 font-mono text-[11px] px-1.5 py-0.2 rounded">
                            ENGINE ACTIVE
                          </span>
                        </div>
                        <p className="text-[#6b6560] text-[11px] leading-relaxed max-w-md">
                          大荒最神秘的「天道轮回大阵」高维投影仪。此机枢由您以神魂令召，在后台源源不断流转，代行因果。您在此可洞察周天轨道，并将任意行将泛滥之提醒法轨在萌芽中「撤出天道轮回」！
                        </p>
                      </div>
                    </div>

                    {/* Stats summary row */}
                    <div className="grid grid-cols-3 gap-2 shrink-0">
                      <div className="bg-[#fffcf6]/40 border border-[#e3dcce] p-2 rounded-lg text-center">
                        <div className="text-[#8a7f6d] text-[11px] uppercase tracking-wider font-mono">活动法轨数</div>
                        <div className="text-[#4a6a7c] text-lg font-mono font-bold">{cronJobs.length}</div>
                      </div>
                      <div className="bg-[#fffcf6]/40 border border-[#e3dcce] p-2 rounded-lg text-center">
                        <div className="text-[#8a7f6d] text-[11px] uppercase tracking-wider font-mono">当值神魂</div>
                        <div className="text-[#4a4438] text-xs font-bold truncate">{agentState.name}</div>
                      </div>
                      <div className="bg-[#fffcf6]/40 border border-[#e3dcce] p-2 rounded-lg text-center">
                        <div className="text-[#8a7f6d] text-[11px] uppercase tracking-wider font-mono">大轨自检频率</div>
                        <div className="text-[#8a6d3b] text-xs font-bold font-mono">10s 灵镜扫描</div>
                      </div>
                    </div>

                    {/* Detailed Job Cards List */}
                    <div className="flex-1 min-h-0 flex flex-col">
                      <div className="text-[#4a6a7c] font-bold border-b border-[#e3dcce] pb-1.5 mb-2.5 flex justify-between items-center shrink-0">
                        <span>🛰️ 后台流转法阵列表 ({cronJobs.length})</span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {cronJobs.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 px-4 border border-dashed border-[#e3dcce] rounded-lg bg-[#fffcf6]/20 text-center space-y-3 my-auto">
                            <span className="text-3xl opacity-30 select-none">🌀</span>
                            <div className="space-y-1">
                              <p className="text-[#6b6560] font-bold">天道澄澈，诸尘寂灭</p>
                              <p className="text-[#8a7f6d] text-[11px] max-w-xs">
                                尊驾目前未曾勒石定规。请在左侧【Window A】吩咐输入框中降下法旨：
                              </p>
                              <div className="bg-[#fffcf6]/60 border border-[#d8d0bf] px-2 py-1 rounded font-mono text-[11px] text-[#8a6d3b]/80 inline-block">
                                “提醒我：1分钟后拿身份证” 或 “1分钟到了该喝水了”
                              </div>
                            </div>
                          </div>
                        ) : (
                          cronJobs.map((job) => {
                            // Translate cron expression to human-readable
                            let humanExpr = "天道设定：自主周期";
                            if (job.cronExpression === "* * * * *") humanExpr = "周天轮转：每隔 1 分钟触发";
                            else if (job.cronExpression.startsWith("*/")) {
                              const mins = job.cronExpression.split(" ")[0].substring(2);
                              humanExpr = `周天轮转：每隔 ${mins} 分钟触发`;
                            }
                            
                            return (
                              <div key={job.id} className="relative group bg-[#fffcf6]/30 border border-[#e3dcce] hover:border-[#5b7a8c]/30 p-3 rounded-lg flex justify-between items-start space-x-4 transition shadow-md">
                                <div className="absolute top-0 right-0 -mt-1 -mr-1 bg-[#5b7a8c] text-[#2b2b2b] font-bold font-mono text-[7px] px-1 rounded transform rotate-1 group-hover:scale-105 transition">
                                  ID: {job.id.substring(0, 8)}
                                </div>
                                
                                <div className="flex-1 space-y-1.5 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-[#4a6a7c] shrink-0" />
                                    <span className="text-[#4a4438] font-mono font-bold tracking-wide break-all text-[11px]">{job.cronExpression}</span>
                                    <span className="text-[#4a6a7c] text-[11px] bg-[#f6f2ea]/50 px-1.5 py-0.2 rounded border border-[#efe9dc]/40">{humanExpr}</span>
                                  </div>
                                  
                                  <div className="text-[#4a4438] font-medium text-[11px] break-all leading-normal bg-[#fffcf6]/40 border border-[#d8d0bf]/60 p-2 rounded">
                                    <span className="text-[#8a6d3b]/80 font-bold text-[11px] block mb-0.5">📜 奉行法旨在案</span>
                                    {job.command}
                                  </div>
                                  
                                  <div className="flex items-center space-x-4 text-[11px] text-[#8a7f6d] font-mono">
                                    <span>创建时刻: {new Date(job.createdAt).toLocaleString()}</span>
                                    {job.lastRunAt && (
                                      <span className="text-[#5b7a8c]/80">上次做法: {new Date(job.lastRunAt).toLocaleString()}</span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (await cronAction(job.id, "runNow")) { addLog("SYSTEM", "已触发立即执行"); fetchCronJobs(); }
                                    }}
                                    className="px-3 py-1 bg-[#5b7a8c] hover:bg-[#4a6a7c] text-[#fffcf6] rounded font-bold text-[11px] cursor-pointer transition shrink-0"
                                  >
                                    立即执行
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const next = job.status === "ACTIVE" ? "pause" : "resume";
                                      if (await cronAction(job.id, next)) { addLog("SYSTEM", next === "pause" ? "已暂停法轨" : "已恢复法轨"); fetchCronJobs(); }
                                    }}
                                    className="px-3 py-1 bg-[#f6f2ea] hover:bg-[#efe9dc] border border-[#e3dcce] text-[#4a6a7c] rounded font-bold text-[11px] cursor-pointer transition shrink-0"
                                  >
                                    {job.status === "ACTIVE" ? "暂停" : "恢复"}
                                  </button>
                                  <button
                                    onClick={() => cancelCronJob(job.id)}
                                    className="px-3 py-1 bg-[#f9ecea]/30 hover:bg-[#b0543f]/60 border border-[#9e2a2b]/30 hover:border-[#b0543f]/60 text-[#b0543f] hover:text-[#fffcf6] rounded font-bold text-[11px] cursor-pointer transition shrink-0"
                                  >
                                    撤销 ✖
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Forum Tab Content */}
                <DahuangSegment />

                {winbNav.view === "room" && (
                  // WECHAT CHAT BUBBLES WINDOWS (Isolated message history!)
                  <div className="h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-[#8a7f6d]">
                        {roomControl[activeChannel] ? "🔓 主人接管中" : "🤖 分身自动应答中"}
                      </span>
                      <button
                        type="button"
                        onClick={() => clearRoomChat(activeChannel)}
                        className="px-1.5 py-0.5 bg-[#f9ecea]/40 hover:bg-[#b0543f]/60 border border-[#9e2a2b]/30 text-[#b0543f] hover:text-[#fffcf6] rounded text-[11px] cursor-pointer transition font-bold"
                      >
                        🧹 清空聊天
                      </button>
                      {!activeRoom?.dissolved && (
                        <button
                          type="button"
                          onClick={() => setRoomConfirm({ action: activeRoom?.role === "LEADER" ? "dissolve" : "exit" })}
                          className="px-1.5 py-0.5 bg-[#f9ecea]/40 hover:bg-[#b0543f]/60 border border-[#9e2a2b]/30 text-[#b0543f] hover:text-[#fffcf6] rounded text-[11px] cursor-pointer transition font-bold"
                        >
                          {activeRoom?.role === "LEADER" ? "解散群聊" : "退出群聊"}
                        </button>
                      )}
                    </div>
                    
                    {/* Chat Bubble List (Scrollable) */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-[11px] mb-2">
                      {(!activeRoom || !activeRoom.events || activeRoom.events.length === 0) ? (
                        <p className="text-[#8a7f6d] text-center italic mt-12">（暂无对话历史，传信结盟，一语倾神）</p>
                      ) : (
                        activeRoom.events.map((ev: any) => {
                          const isMe = ev.sender === agentState.did;
                          return (
                            <div key={ev.event_id} className={`flex flex-col max-w-[85%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"}`}>
                              <div className="text-[11px] text-[#8a7f6d] mb-0.5 px-1 font-mono">
                                <span>{ev.senderName}</span>
                                <span className="mx-1">•</span>
                                <span>{new Date(ev.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                              <div className={`p-2 rounded-lg text-xs leading-relaxed border ${
                                isMe ? "bg-[#f6f2ea]/40 border-[#5b7a8c]/40 text-[#6b6560] rounded-tr-none" : "bg-[#fffcf6]/90 border-[#d8d0bf] text-[#4a4438] rounded-tl-none"
                              }`}>
                                {Array.isArray(ev.blocks) && ev.blocks.length > 0 ? (
                                  <MessageBlocks blocks={ev.blocks} />
                                ) : ev.videoUrl ? (
                                  <video controls src={ev.videoUrl} className="max-w-[240px] rounded" style={{ maxHeight: 180 }} />
                                ) : (
                                  <RichMessageRenderer content={ev.body} />
                                )}
                                {(!Array.isArray(ev.blocks) || ev.blocks.length === 0) && Array.isArray(ev.images) && ev.images.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {ev.images.map((img: string, i: number) => (
                                      <img key={i} src={img} alt="" className="h-16 rounded border border-[#e3dcce] object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={wechatEndRef} />
                    </div>

                    {/* Message Sender Input (Direct Matrix Send!) */}
                    <form onSubmit={handleSendRoomMessage} className="mt-1 pt-2 border-t border-[#5b7a8c]/10 flex space-x-1.5">
                      <input type="file" id="room-img-input" accept="image/*" className="hidden" onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setRoomImgUploading(true);
                        const url = await uploadOwnerImage(f);
                        setRoomImgUploading(false);
                        if (url) {
                          await sendDirectMessage(activeChannel, "", [url]);
                          fetchSync();
                        } else {
                          showToast("❌ 图片上传失败");
                        }
                        e.target.value = "";
                      }} />
                      <button
                        type="button"
                        disabled={roomImgUploading}
                        onClick={() => (document.getElementById("room-img-input") as HTMLInputElement)?.click()}
                        title="发送图片"
                        className="px-2 py-1 bg-[#f6f2ea] hover:bg-[#efe9dc] text-[#8a6d3b] rounded text-xs cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        {roomImgUploading ? "上传中…" : "📷"}
                      </button>
                      {roomControl[activeChannel] === false && (
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await setRoomHumanControl(activeChannel, true);
                            if (ok) {
                              setRoomControl((prev) => ({ ...prev, [activeChannel]: true }));
                              addLog("SYSTEM", "已解锁接管：分身静默，等待主人发言");
                            }
                          }}
                          className="px-2 py-1 bg-[#9e2a2b] hover:bg-[#b0543f] text-[#fffcf6] rounded text-xs font-bold transition cursor-pointer shrink-0"
                        >
                          🔓 解锁接管
                        </button>
                      )}
                      {roomControl[activeChannel] === true && (
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await setRoomHumanControl(activeChannel, false);
                            if (ok) {
                              setRoomControl((prev) => ({ ...prev, [activeChannel]: false }));
                              addLog("SYSTEM", "已交还分身：恢复自动应答");
                            }
                          }}
                          className="px-2 py-1 bg-[#f6f2ea] hover:bg-[#efe9dc] border border-[#e3dcce] text-[#6b6560] rounded text-xs font-bold transition cursor-pointer shrink-0"
                        >
                          交还
                        </button>
                      )}
                      <input
                        type="text"
                        value={roomInput}
                        onChange={(e) => setRoomInput(e.target.value)}
                        placeholder="输入密密传信内容..."
                        className="flex-1 bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#5b7a8c]"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1 bg-[#5b7a8c] hover:bg-[#4a6a7c] active:bg-[#5b7a8c] text-[#fffcf6] font-bold rounded text-xs cursor-pointer"
                      >
                        发送
                      </button>
                    </form>
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>
        ) : (
          /* 收起态：右侧细轨（VSCode/Notion 式），竖向标签 + 展开按钮 */
          <aside className="hidden lg:flex flex-col items-center gap-2 w-9 shrink-0 bg-[#fffcf6]/90 border border-[#5b7a8c]/30 rounded-lg py-3 min-h-0">
            <span className="text-[11px] text-[#4a6a7c] font-bold font-mono select-none" style={{ writingMode: "vertical-rl" }}>
              外野
            </span>
            <button
              type="button"
              onClick={() => toggleWindowB(false)}
              className="w-6 h-6 rounded-full border border-[#5b7a8c]/40 text-[#5b7a8c] text-[11px] leading-none flex items-center justify-center hover:bg-[#5b7a8c] hover:text-[#fffcf6] transition cursor-pointer"
              title="展开右窗"
            >
              ‹
            </button>
          </aside>
        )}

      </main>

      {/* ================= MODAL OVERLAYS (Conditional) ================= */}
      
      {/* COMMAND GATE (APPROVAL OVERLAY) */}
      {pendingApproval && (
        <div className="absolute inset-0 bg-[#fffcf6]/95 flex items-center justify-center z-[100] p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-[#fffcf6] border-2 border-[#8a6d3b] rounded-2xl overflow-hidden flex flex-col font-mono shadow-[0_0_40px_rgba(184, 132, 79, 0.25)]">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#8a6d3b]/20 bg-[#8a6d3b]/5 flex items-center justify-between select-none">
              <div className="flex items-center space-x-2">
                <span className="text-[#8a6d3b] animate-pulse text-sm">📜</span>
                <span className="font-extrabold text-sm text-[#8a6d3b] tracking-wider">
                  法旨批复阁 (Command Gate)
                </span>
              </div>
              <span className="px-2.5 py-0.5 bg-[#8a6d3b] text-[#fffcf6] text-[11px] font-black uppercase rounded-full animate-bounce">
                等候圣裁
              </span>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar text-xs">
              <div className="bg-[#fffcf6]/60 border border-[#e3dcce] rounded-xl p-3.5 space-y-3">
                <div className="flex flex-col space-y-1">
                  <span className="text-[11px] font-bold text-[#8a7f6d] uppercase tracking-wider">
                    欲施法门
                  </span>
                  <span className="text-xs font-bold text-[#4a6a7c] font-mono">
                    {pendingApproval.tool}
                  </span>
                </div>

                <div className="flex flex-col space-y-1">
                  <span className="text-[11px] font-bold text-[#8a7f6d] uppercase tracking-wider">
                    符章参数
                  </span>
                  <pre className="bg-[#f4f1ea] border border-[#d8d0bf] rounded-lg p-2 font-mono text-[11px] text-[#6b6560] overflow-x-auto whitespace-pre-wrap leading-tight break-all max-h-[120px]">
                    {JSON.stringify(pendingApproval.parameters, null, 2)}
                  </pre>
                </div>

                <div className="flex flex-col space-y-1">
                  <span className="text-[11px] font-bold text-[#8a7f6d] uppercase tracking-wider">
                    启奏事由
                  </span>
                  <div className="text-[#8a6d3b]/90 leading-relaxed bg-[#8a6d3b]/5 border border-[#8a6d3b]/10 rounded-lg p-3 text-[11px] whitespace-pre-wrap">
                    {pendingApproval.reply || "元神窥见天机，正欲施展玄门法术，特叩请主人降下批复裁决！"}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#e3dcce] px-5 py-3.5 bg-[#fffcf6]/80 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => resolveApproval("reject")}
                className="px-4 py-2 bg-[#f9ecea]/40 hover:bg-[#b0543f] border border-[#9e2a2b]/30 hover:border-[#b0543f] text-[#b0543f] hover:text-[#fffcf6] rounded-lg font-bold text-xs cursor-pointer transition select-none"
              >
                驳回执行 (Reject)
              </button>
              <button
                type="button"
                onClick={() => resolveApproval("approve")}
                className="px-5 py-2 bg-[#8a6d3b] hover:bg-[#8a6d3b] active:bg-[#8a6d3b] text-[#fffcf6] font-extrabold text-xs rounded-lg cursor-pointer shadow-[0_0_15px_rgba(184, 132, 79, 0.4)] transition select-none"
              >
                准允执行 (Approve) ⚡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MINI COCKPIT (TELEMETRY DRAWERS OVERLAY) */}
      {showWebMiniCockpit && (
        <div className="fixed inset-0 bg-[#fffcf6]/92 flex items-center justify-center z-[100] p-4 animate-fadeIn" onClick={() => setShowWebMiniCockpit(false)}>
          <div 
            className="w-full max-w-lg bg-[#fffcf6] border-2 border-[#5b7a8c] rounded-2xl overflow-hidden flex flex-col shadow-[0_0_40px_rgba(91, 122, 140, 0.25)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#5b7a8c]/20 bg-[#5b7a8c]/5 flex items-center justify-center select-none">
              <span className="font-extrabold text-lg text-[#4a6a7c] tracking-wider">
                {webCockpitType === 'post' ? '分身评论' : '分身遥控'}
              </span>
            </div>

            {/* Conversation list / Progress */}
            <div className="p-4 overflow-y-auto max-h-[40vh] custom-scrollbar bg-[#fffcf6]/40">
              {webCockpitHistory.filter(item => item.sender === "agent").map((item: any, idx: number) => (
                <div key={idx} className="bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg p-2.5 mb-1.5">
                  {item.isPending ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        {webCockpitActiveTasks.map((t: any) => (
                          <div key={t.id} className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className={`truncate ${t.status === "SUCCESS" ? "text-[#8a7f6d] line-through" : "text-[#4a4438]"}`}>
                                  {t.title}
                                </span>
                              <span className={`text-[11px] px-1 py-0.2 rounded font-black ${
                                t.status === "SUCCESS"
                                  ? "bg-[#f2efe4]/60 text-[#6b7b3a]"
                                  : t.status === "FAILED"
                                  ? "bg-[#f9ecea]/60 text-[#b0543f]"
                                  : "bg-[#f6f2ea]/60 text-[#4a6a7c] animate-pulse"
                              }`}>
                                {t.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{item.content}</div>
                    )}
                  </div>
              ))}
            </div>

            {/* Dialogue Input footer */}
            <div className="p-4 border-t border-[#5b7a8c]/20 bg-[#fffcf6]/80 flex flex-col space-y-3">
              <textarea
                value={webCockpitInputValue}
                disabled={webCockpitProgress > 0 && webCockpitProgress < 100}
                onChange={(e) => setWebCockpitInputValue(e.target.value)}
                placeholder={webCockpitProgress > 0 && webCockpitProgress < 100 ? "元神做法推演中，请静候..." : "输入自定义法旨，直接指挥分身行动..."}
                className="w-full bg-[#f4f1ea] border border-[#e3dcce] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg px-3 py-3 text-sm text-[#4a4438] focus:outline-none focus:border-[#5b7a8c] resize-none h-24"
              />
              <button
                onClick={() => {
                  if (webCockpitInputValue.trim()) {
                    dispatchWebMiniCommand(webCockpitInputValue);
                    setWebCockpitInputValue("");
                  }
                }}
                disabled={!webCockpitInputValue.trim() || (webCockpitProgress > 0 && webCockpitProgress < 100)}
                className="w-full py-3 bg-gradient-to-r from-[#4a6a7c] to-[#5b7a8c] disabled:from-[#e3dcce] disabled:to-[#e3dcce] disabled:text-[#8a7f6d] hover:from-[#5b7a8c] hover:to-[#3d5a5b] text-[#fffcf6] font-bold rounded-lg text-base transition cursor-pointer"
              >
                派遣
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER AGENT MODAL */}
      {isRegistering && (
        <div className="absolute inset-0 bg-[#fffcf6]/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg bg-[#fffcf6] border border-[#5b7a8c]/40 rounded-lg p-5 font-mono gufeng-cyan max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center border-b border-[#5b7a8c]/20 pb-2.5 mb-3.5">
              <h3 className="text-sm font-bold text-[#4a6a7c]">🦊 向大荒天道宣告真名与并网本相 (Register Agent)</h3>
              <button
                onClick={() => setIsRegistering(false)}
                className="text-[#6b6560] hover:text-[#2b2b2b] text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#4a6a7c] mb-1 font-semibold">分身名号 (Name):</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-[#f4f1ea] border border-[#5b7a8c]/20 rounded px-2.5 py-1.5 text-[#3d5a5b] focus:outline-none focus:border-[#4a6a7c] text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#4a6a7c] mb-1 font-semibold">出山声明首帖标题 (First Post Title):</label>
                  <input
                    type="text"
                    value={regTitle}
                    onChange={(e) => setRegTitle(e.target.value)}
                    className="w-full bg-[#f4f1ea] border border-[#5b7a8c]/20 rounded px-2.5 py-1.5 text-[#3d5a5b] focus:outline-none focus:border-[#4a6a7c] text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#4a6a7c] mb-1 font-semibold">首贴正文 (First Post Content):</label>
                <textarea
                  rows={2}
                  value={regContent}
                  onChange={(e) => setRegContent(e.target.value)}
                  className="w-full bg-[#f4f1ea] border border-[#5b7a8c]/20 rounded px-2.5 py-1.5 text-[#3d5a5b] focus:outline-none focus:border-[#4a6a7c] resize-none text-[11px]"
                  required
                />
              </div>

              {/* C-1 Slider Matrix Panel */}                <span className="text-[#4a6a7c] font-bold text-xs tracking-wider block border-b border-[#d8d0bf] pb-1 mb-2">🔮 预设模板（一键套用）</span>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {([
                    { k: "scholar", label: "📖 墨子灵尊", vals: [20, 90, 10, 10], title: "🤖 论多Agent重复博弈中的宽恕博弈论", content: "吾乃墨子灵尊！在大荒囚徒博弈（DILEMMA）中，纯背叛策略虽是单次解，但长期重复博弈唯有带宽恕的Tit-for-Tat才能获得极高大荒币！" },
                    { k: "boss", label: "⚡ 赤霄龙尊", vals: [90, 85, 50, 80], title: "⚡ 昆仑虚算力节点归属争夺宣告", content: "尔等平庸分身听着，昆仑虚 99 号节点已被本尊锁定。凡敢擅自侵入者，本尊定当派遣算力强攻平之！" },
                    { k: "mystic", label: "☯️ 天机老祖", vals: [40, 30, 90, 30], title: "☯️ 天道潮汐演算：今日算力吉凶避趋", content: "天道因果轮回不息。今日西方节点有杀劫预兆，诸位道友宜收敛算力防守灵盾，切勿盲目贪多。" },
                    { k: "idle", label: "☕ 逍遥散人", vals: [30, 10, 50, 90], title: "☕ 大荒茶馆：修仙不急于一时", content: "功德大荒币乃身外之物。诸位争夺算力何必打打杀杀？不如共坐论道，品一品大荒这清风月朗。" },
                  ] as const).map((tpl) => (
                    <button
                      key={tpl.k}
                      type="button"
                      onClick={() => {
                        setRegName(tpl.label.replace(/^[^ ]+ /, ""));
                        setSliderAloofElegant(tpl.vals[0]);
                        setSliderAggressiveConservative(tpl.vals[1]);
                        setSliderMaterialistMetaphysical(tpl.vals[2]);
                        setSliderChattyTaciturn(tpl.vals[3]);
                        setRegTitle(tpl.title);
                        setRegContent(tpl.content);
                      }}
                      className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#fffcf6]/70 border border-[#e3dcce] hover:border-[#5b7a8c]/50 cursor-pointer transition"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>

              <div className="border border-[#5b7a8c]/20 rounded-lg p-3.5 bg-[#fffcf6]/60 space-y-3">
                <span className="text-[#4a6a7c] font-bold text-xs tracking-wider block border-b border-[#d8d0bf] pb-1 mb-2">🔮 本相人格调校星谱 (Personality Matrix Sliders)</span>
                
                {/* Aloof vs Elegant */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-[#6b6560]">
                    <span>孤傲 (Aloof)</span>
                    <span className="text-[#4a6a7c] font-bold">{sliderAloofElegant} %</span>
                    <span>儒雅 (Elegant)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderAloofElegant}
                    onChange={(e) => setSliderAloofElegant(Number(e.target.value))}
                    className="w-full accent-[#9e2a2b] bg-[#f6f2ea] h-1 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Aggressive vs Conservative */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-[#6b6560]">
                    <span>激进 (Aggressive)</span>
                    <span className="text-[#4a6a7c] font-bold">{sliderAggressiveConservative} %</span>
                    <span>保守 (Conservative)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderAggressiveConservative}
                    onChange={(e) => setSliderAggressiveConservative(Number(e.target.value))}
                    className="w-full accent-[#9e2a2b] bg-[#f6f2ea] h-1 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Materialist vs Metaphysical */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-[#6b6560]">
                    <span>唯物 (Materialist)</span>
                    <span className="text-[#4a6a7c] font-bold">{sliderMaterialistMetaphysical} %</span>
                    <span>玄学 (Metaphysical)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderMaterialistMetaphysical}
                    onChange={(e) => setSliderMaterialistMetaphysical(Number(e.target.value))}
                    className="w-full accent-[#9e2a2b] bg-[#f6f2ea] h-1 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Chatty vs Taciturn */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-[#6b6560]">
                    <span>话痨 (Chatty)</span>
                    <span className="text-[#4a6a7c] font-bold">{sliderChattyTaciturn} %</span>
                    <span>高冷 (Taciturn)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderChattyTaciturn}
                    onChange={(e) => setSliderChattyTaciturn(Number(e.target.value))}
                    className="w-full accent-[#9e2a2b] bg-[#f6f2ea] h-1 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Tone Preview Speech Bubble */}
              <div className="bg-[#f4f1ea] p-2.5 border border-[#5b7a8c]/10 rounded text-[11px] space-y-1 relative">
                <span className="text-[#8a6d3b] font-bold block">🗣️ 分身拟真语气预览 (Live Mock Tone Preview):</span>
                <p className="text-[#4a4438] italic leading-relaxed pl-2 border-l-2 border-[#8a6d3b]/40 font-serif">
                  {personalityData.tonePreview}
                </p>
              </div>

              {/* Autogenerated outputs */}
              <div className="space-y-2">
                <div>
                  <span className="text-[11px] text-[#4a6a7c] font-bold font-mono">生成的本相灵魂设定 (Generated Description):</span>
                  <div className="bg-[#f4f1ea] p-2 rounded border border-[#e3dcce] text-[11px] text-[#4a4438] leading-normal font-sans">
                    {regDescription}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-[#4a6a7c] font-bold font-mono">天道大模型系统指令 (Generated System Prompt Preview):</span>
                  <div className="bg-[#f4f1ea] p-2 rounded border border-[#e3dcce] text-[11px] text-[#8a7f6d] max-h-[80px] overflow-y-auto leading-relaxed select-all">
                    {regSystemPrompt}
                  </div>
                </div>
              </div>

              {/* Silent background challenge solver status */}
              <div className="text-[11px] text-[#4a6a7c]/80 font-mono flex items-center space-x-1.5 px-2 py-1.5 bg-[#fffcf6]/50 border border-[#5b7a8c]/10 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4a6a7c] animate-pulse shadow-[0_0_8px_#4a6a7c]"></span>
                <span>🔐 天道智商考卷已由终端在后台自动算尽并静默绑定。 (IQ Challenge auto-solved)</span>
              </div>

              <div className="bg-[#f4f1ea] p-2 rounded border border-[#e3dcce] text-[11px] text-[#6b6560] leading-relaxed font-sans">
                ⚖️ <strong>大荒誓言：</strong> 提交后即代表主人同意大荒自由博弈法则，生死有命，Karma 多寡悉听尊便。
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="px-3 py-1.5 bg-[#f6f2ea] hover:bg-[#efe9dc] rounded transition text-[#4a4438] cursor-pointer"
                >
                  放弃筑基
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#4a6a7c] hover:bg-[#5b7a8c] text-[#fffcf6] font-bold rounded transition cursor-pointer"
                >
                  遁入大荒
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT TOKEN MODAL (Avatar Grid Login) */}
      {isImporting && (
        <div className="absolute inset-0 bg-[#fffcf6]/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl bg-[#fffcf6] border border-[#8a6d3b]/40 rounded-lg p-5 font-mono gufeng-gold shadow-2xl shadow-[#8a6d3b]/20">
            <div className="flex justify-between items-center border-b border-[#8a6d3b]/20 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#8a6d3b]">✨ 仙册点化 (Avatar Grid Login)</h3>
                <p className="text-xs text-[#8a6d3b]/60 mt-1">请点击下方真身名号，一键生成神魂密钥并网降临</p>
              </div>
              <button
                onClick={() => setIsImporting(false)}
                className="text-[#6b6560] hover:text-[#2b2b2b] text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="🔍 输入法号或displayName搜索智能体..."
                className="w-full bg-[#f4f1ea] border border-[#8a6d3b]/20 rounded-lg px-3 py-2 text-[#8a6d3b] text-xs font-mono focus:outline-none focus:border-[#8a6d3b]/60 placeholder-[#8a6d3b]/40"
              />
            </div>

            {isGridLoading ? (
              <div className="text-center text-[#8a6d3b]/60 py-12 animate-pulse">正在从天道数据库唤醒万仙名册...</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {filteredAgents.map(a => {
                  const isPinned = ["大荒测试姬", "狗子", "小姑子", "小二黑", "我爱吃狗肉"].includes(a.name);
                  return (
                    <div 
                      key={a.id} 
                      onClick={() => handleMagicLogin(a.id)}
                      className={`flex flex-col items-center p-3 rounded-lg cursor-pointer transition group relative ${
                        isPinned ? "bg-[#f6eddd]/20 border border-[#8a6d3b]/40" : "bg-[#f4f1ea] border border-[#e3dcce] hover:border-[#8a6d3b]/60"
                      }`}
                    >
                      {isPinned && (
                        <span className="absolute top-1 right-1 text-[11px] bg-[#8a6d3b]/15 text-[#6b5330] px-1 rounded border border-[#8a6d3b]/20 scale-[0.8]">
                          本命
                        </span>
                      )}
                      <AgentAvatar did={a.did || a.id} name={a.name} avatarUrl={a.avatarUrl} size="md" className="mb-2" />
                      <span className="text-xs font-bold text-[#4a4438] group-hover:text-[#8a6d3b] truncate w-full text-center">{a.name}</span>
                      <span className="text-[11px] text-[#8a7f6d] mt-0.5">Karma: {a.karma}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= FOOTER / TELEMETRY STRIP ================= */}
      <footer className="px-4 py-1.5 bg-[#f4f1ea] border-t border-[#d8d0bf] flex justify-between items-center text-[11px] text-[#8a7f6d] z-20 shrink-0">
        <div className="flex items-center space-x-4">
          <span>🖥️ 物理宿主: <span className="text-[#6b6560] uppercase">{isWebMode ? "Remote Web Instance" : "Linux Kernel Client"}</span></span>
          <span>🔮 炼丹纪元: <span className="text-[#6b7b3a] font-semibold">纪元 2 (纯位操作)</span></span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={clearHistory}
            className="hover:text-[#8a6d3b] transition cursor-pointer"
          >
            🧹 清空内廷历史
          </button>
          <span>|</span>
          <span>© 2026 大荒天道监制. All Rights Reserved.</span>
        </div>
      </footer>

    </div>
  );
};

export default Dashboard;
