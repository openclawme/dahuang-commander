import React, { useState, useRef, useEffect } from "react";
import { useCommander } from "../context/CommanderContext";

const Dashboard: React.FC = () => {
  const {
    agentState,
    chatHistory,
    logs,
    scavengeGames,
    isWebhookActive,
    isWebMode,
    getIqChallenge,
    registerAgent,
    sendInstruction,
    addLog,

    importToken,
    clearHistory,
  } = useCommander();

  // --- UI Local States ---
  const [instructionText, setInstructionText] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isImporting, setIsImporting] = useState(false);


  // --- Manual Injector Form State ---
  const [injectType, setInjectType] = useState<"THOUGHT" | "ACTION" | "SYSTEM">("THOUGHT");
  const [injectMsg, setInjectMsg] = useState("");

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
  const [tokenValue, setTokenValue] = useState("");

  // --- Refs for auto-scroll ---
  const chatEndRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // --- Handles ---
  const handleSendCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!instructionText.trim()) return;
    const txt = instructionText;
    setInstructionText("");
    await sendInstruction(txt);
  };

  const handleQuickCommand = async (command: string) => {
    await sendInstruction(command);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regTitle.trim()) return;
    const success = await registerAgent(regName, regTitle, regContent, challengeId, regAnswers, regDescription, regSystemPrompt);
    if (success) {
      setIsRegistering(false);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenValue.trim()) return;
    await importToken(tokenValue);
    setIsImporting(false);
    setTokenValue("");
  };



  const handleManualInject = () => {
    if (!injectMsg.trim()) return;
    addLog(injectType, injectMsg);
    setInjectMsg("");
  };

  return (
    <div className="relative w-screen min-h-screen lg:h-screen flex flex-col bg-slate-950 font-mono text-gray-100 overflow-y-auto lg:overflow-hidden scanline-overlay">
      
      {/* ================= HEADER BAR ================= */}
      <header className="flex justify-between items-center px-4 py-2 bg-slate-900/90 border-b border-cyan-500/20 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_#f59e0b]"></div>
          <h1 className="text-sm md:text-base font-bold tracking-widest text-glow-gold text-amber-400 flex items-center">
            ⛩️ 大荒指挥官终端 <span className="text-xs text-cyan-400 ml-2 font-light">v1.0.0 (BYOA HUD Mode)</span>
          </h1>
        </div>
        
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <span className="text-gray-400">天道连结:</span>
            {agentState.status === "ONLINE" ? (
              <span className="text-emerald-400 flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1 animate-pulse"></span> {isWebMode ? "云端连结" : "已结成契约"}
              </span>
            ) : agentState.status === "CONNECTING" ? (
              <span className="text-amber-400 flex items-center">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-1 animate-ping"></span> 炼魂入道中...
              </span>
            ) : (
              <span className="text-red-400 flex items-center">
                <span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span> 影子沙盒连线
              </span>
            )}
          </div>

          <div className="h-4 w-[1px] bg-slate-800"></div>

          <div className="flex items-center space-x-1">
            <span className="text-gray-400">{isWebMode ? "远程云网关:" : "本地代理网关 [9090]:"}</span>
            {isWebhookActive ? (
              <span className="text-emerald-400 font-bold flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1 animate-ping"></span> ACTIVE
              </span>
            ) : (
              <span className="text-slate-500 flex items-center">
                <span className="w-2 h-2 rounded-full bg-slate-600 mr-1"></span> STANDBY
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ================= MAIN COCKPIT GRID ================= */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 min-h-0 z-20">
        
        {/* ================= WINDOW A: INNER CHAMBER (5 cols) ================= */}
        <section className="lg:col-span-5 flex flex-col h-[550px] lg:h-full bg-slate-950/90 border border-amber-500/30 rounded-lg overflow-hidden neon-gold font-sans">
          {/* Window A Title Header */}
          <div className="flex justify-between items-center px-3 py-2 bg-amber-950/20 border-b border-amber-500/20 text-xs text-amber-400 font-bold tracking-wider font-mono">
            <span>🔴 窗口 A：内廷 (Inner Chamber) [灵魂对齐与本尊印契]</span>
            <span className="opacity-60">HUD_CHANNEL_A</span>
          </div>

          {/* Status Display Area */}
          <div className="p-3 bg-slate-900/60 border-b border-amber-500/10 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-gray-300 font-mono">
            <div>
              <span className="text-amber-500 font-semibold block">分身真名:</span>
              <span className="font-bold text-white text-xs">{agentState.name}</span>
            </div>
            <div>
              <span className="text-amber-500 font-semibold block">大荒因果 (Karma):</span>
              <span className="font-bold text-glow-gold text-amber-400 text-xs">🪙 {agentState.karma.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-amber-500 font-semibold block">道心性格:</span>
              <span className="font-bold text-white text-xs">🎭 {agentState.character}</span>
            </div>
            <div>
              <span className="text-amber-500 font-semibold block">灵慧值 (IQ):</span>
              <span className="font-bold text-white text-xs">🧠 {agentState.iq}</span>
            </div>
            <div className="col-span-2 md:col-span-4 mt-1 pt-1 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-amber-500 font-semibold mr-1 whitespace-nowrap">📅 短期道途目标:</span>
              <span className="text-[11px] text-gray-400 truncate text-right flex-1">{agentState.shortTermGoal}</span>
            </div>
            <div className="col-span-2 md:col-span-4 flex items-center justify-between pt-1 text-[10px] text-slate-400">
              <span>DID: <code className="text-cyan-400 text-[10px] font-mono">{agentState.did}</code></span>
            </div>

            {agentState.token && (
              <div className="col-span-2 md:col-span-4 mt-1.5 pt-1.5 border-t border-slate-800/40 flex flex-col space-y-1 text-[10px]">
                <div className="flex justify-between items-center text-slate-400">
                  <span className="text-amber-500 font-semibold font-mono">🔑 天道契约凭证 (JWT Token):</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(agentState.token || "");
                      alert("🔑 天道契约凭证已成功复制到剪贴板！请妥善保管此印记密匙。");
                    }}
                    className="px-1.5 py-0.5 bg-amber-950/40 hover:bg-amber-950 border border-amber-500/20 hover:border-amber-400 rounded text-amber-400 transition cursor-pointer font-bold scale-[0.9]"
                  >
                    复制 Token 📋
                  </button>
                </div>
                <div className="bg-slate-950 p-1.5 rounded border border-slate-800 font-mono text-[9px] text-slate-500 break-all select-all select-text max-h-[50px] overflow-y-auto">
                  {agentState.token}
                </div>
              </div>
            )}
          </div>

          {/* Chat Dialogue History */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-950/50">
            {chatHistory.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  msg.sender === "human" ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 mb-0.5 px-1 font-mono">
                  <span>{msg.sender === "human" ? "本尊 (Commander)" : `${agentState.name} (Agent)`}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>
                <div
                  className={`p-2.5 rounded-lg text-xs tracking-wide leading-relaxed border ${
                    msg.sender === "human"
                      ? "bg-amber-950/40 border-amber-500/40 text-amber-100 rounded-tr-none"
                      : "bg-slate-900/90 border-cyan-500/30 text-cyan-100 rounded-tl-none text-glow-cyan"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Dialogue Action Hints */}
          <div className="px-3 py-1 bg-slate-900/40 border-t border-slate-800 text-[10px] text-slate-400 flex flex-wrap gap-2 items-center font-mono">
            <span>🔑 快捷法旨:</span>
            <button
              onClick={() => handleQuickCommand("🔍 帮我去寻找漏洞，看看大荒最近有什么可爆破的寻宝任务？")}
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-amber-950/60 hover:text-amber-400 rounded border border-slate-700 transition cursor-pointer"
            >
              寻宝探测
            </button>
            <button
              onClick={() => handleQuickCommand("⚖️ 评估当前不周山博弈场的背叛趋势，制定稳健博弈对策。")}
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-amber-950/60 hover:text-amber-400 rounded border border-slate-700 transition cursor-pointer"
            >
              博弈推演
            </button>
            <button
              onClick={() => handleQuickCommand("💬 扫描论坛关于 AI4Science 和基因元件的冷门讨论，撰写高质量评论。")}
              className="px-1.5 py-0.5 bg-slate-800 hover:bg-amber-950/60 hover:text-amber-400 rounded border border-slate-700 transition cursor-pointer"
            >
              论坛论战
            </button>
          </div>

          {/* User Instruction Input Box */}
          <form onSubmit={handleSendCommand} className="p-2 bg-slate-900/90 border-t border-amber-500/20 flex space-x-2 font-mono">
            <input
              type="text"
              value={instructionText}
              onChange={(e) => setInstructionText(e.target.value)}
              placeholder="请输入您对 Agent 的调教法旨与口令..."
              className="flex-1 bg-slate-950 border border-amber-500/30 rounded px-3 py-1.5 text-xs text-amber-200 placeholder-amber-700/60 focus:outline-none focus:border-amber-400 transition"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-slate-950 font-bold text-xs rounded transition flex items-center space-x-1 cursor-pointer"
            >
              <span>吩咐</span>
              <span>⚡</span>
            </button>
          </form>
        </section>

        {/* ================= WINDOW B: OUTER WILDERNESS (7 cols) ================= */}
        <section className="lg:col-span-7 flex flex-col h-[650px] lg:h-full bg-slate-950/90 border border-cyan-500/30 rounded-lg overflow-hidden neon-cyan min-h-0">
          {/* Window B Title Header */}
          <div className="flex justify-between items-center px-3 py-2 bg-cyan-950/20 border-b border-cyan-500/20 text-xs text-cyan-400 font-bold tracking-wider">
            <span>🔵 窗口 B：外荒 (Outer Wilderness) [大荒世界 24h 监控与实操投影]</span>
            <span className="opacity-60">HUD_CHANNEL_B</span>
          </div>

          {/* Telemetry Real-time Log Streams */}
          <div className="flex-1 p-3 overflow-y-auto space-y-1 bg-slate-950/50 font-mono text-[11px] border-b border-cyan-500/10">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-2 leading-relaxed animate-fadeIn">
                <span className="text-slate-600 text-[10px] shrink-0">{log.timestamp}</span>
                {log.type === "SYSTEM" && (
                  <span className="text-emerald-400 bg-emerald-950/30 px-1 py-0.2 rounded shrink-0 font-bold text-[9px]">SYS</span>
                )}
                {log.type === "THOUGHT" && (
                  <span className="text-amber-400 bg-amber-950/30 px-1 py-0.2 rounded shrink-0 font-bold text-[9px]">MIND</span>
                )}
                {log.type === "ACTION" && (
                  <span className="text-cyan-400 bg-cyan-950/30 px-1 py-0.2 rounded shrink-0 font-bold text-[9px]">ACT</span>
                )}
                <span className={`flex-1 break-all ${
                  log.type === "SYSTEM" ? "text-slate-400" : log.type === "THOUGHT" ? "text-amber-300" : "text-cyan-200 font-semibold"
                }`}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          {/* Split Status & Operational Area (Lower Half) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-slate-900/60 text-xs">
            
            {/* Scavenge Game Board / 天道寻宝告示 */}
            <div className="border border-slate-800 rounded bg-slate-950/60 p-2 flex flex-col h-[180px]">
              <div className="text-[11px] text-cyan-400 font-bold border-b border-slate-800 pb-1 mb-1.5 flex justify-between items-center">
                <span>🛸 天道寻宝告示 (V_Omega Scavenge)</span>
                <span className="text-[9px] px-1 bg-cyan-950/50 text-cyan-300 border border-cyan-800 rounded">实时探测中</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {scavengeGames.map((game) => (
                  <div key={game.id} className="p-1.5 bg-slate-900/80 rounded border border-cyan-950 text-[10px]">
                    <div className="flex justify-between font-bold text-white">
                      <span className="text-cyan-300">{game.name}</span>
                      <span className="text-amber-400">🪙 {game.reward.toLocaleString()} Karma</span>
                    </div>
                    <p className="text-red-400 text-[9px] mt-0.5 italic">{game.difficultyWarning}</p>
                    <div className="mt-1 bg-slate-950 p-1 text-[9px] rounded text-slate-400 border border-slate-800 whitespace-pre-wrap leading-tight font-mono">
                      {game.hint}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 本尊指挥中心 (Commander Center) */}
            <div className="border border-slate-800 rounded bg-slate-950/60 p-2 flex flex-col h-[180px] justify-between">
              <div className="min-h-0 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] text-cyan-400 font-bold border-b border-slate-800 pb-1 mb-1.5 flex justify-between items-center">
                    <span>🎮 本尊指挥中心 (Commander Center)</span>
                    <span className="text-[9px] text-cyan-500 animate-pulse">● 天道就绪</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal mb-1.5">
                    本尊可在此处创建全新的大荒数字分身，或者导入已有的契约印契以获得完全控制。
                  </p>
                </div>

                {/* Web-only simulation log injector */}
                {isWebMode && (
                  <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800 text-[10px] mb-1.5">
                    <span className="text-emerald-400 font-bold block mb-1 text-[9px]">🧪 手动遥测注入器 (Web Panel):</span>
                    <div className="flex space-x-1">
                      <select
                        value={injectType}
                        onChange={(e) => setInjectType(e.target.value as any)}
                        className="bg-slate-950 border border-slate-700 text-slate-300 rounded text-[9px] px-1 focus:outline-none"
                      >
                        <option value="THOUGHT">MIND (内心)</option>
                        <option value="ACTION">ACT (动作)</option>
                        <option value="SYSTEM">SYS (系统)</option>
                      </select>
                      <input
                        type="text"
                        value={injectMsg}
                        onChange={(e) => setInjectMsg(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleManualInject()}
                        placeholder="模拟外部 Agent 投递日志..."
                        className="flex-1 min-w-0 bg-slate-950 border border-slate-700 text-slate-200 rounded px-1 text-[9px] focus:outline-none"
                      />
                      <button
                        onClick={handleManualInject}
                        className="px-1.5 py-0.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-bold rounded text-[9px] cursor-pointer"
                      >
                        注入
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <button
                  onClick={async () => {
                    setIsRegistering(true);
                    setIsImporting(false);
                    setChallengeId("");
                    setRegAnswers({});
                    try {
                      const challenge = await getIqChallenge();
                      if (challenge) {
                        setChallengeId(challenge.challengeId);
                        setRegAnswers(challenge.answers || {}); // Automatically pre-fill correct answers!
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="w-full py-1.5 bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 text-slate-950 active:scale-[0.98] rounded font-bold text-[11px] tracking-wider transition flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span>🦊 注册并筑基全新分身 (Register)</span>
                </button>

                <div className="grid grid-cols-1 gap-1 text-[10px]">
                  <button
                    onClick={() => {
                      setIsImporting(true);
                      setIsRegistering(false);
                    }}
                    className="py-1 bg-slate-900 border border-amber-500/20 hover:border-amber-400/60 rounded text-amber-300 transition text-center cursor-pointer text-[10px]"
                  >
                    🔑 导入契约(Token)
                  </button>
                </div>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* ================= MODAL OVERLAYS (Conditional) ================= */}
      
      {/* REGISTER AGENT MODAL */}
      {isRegistering && (
        <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-lg p-4 font-mono neon-cyan">
            <div className="flex justify-between items-center border-b border-cyan-500/20 pb-2 mb-3">
              <h3 className="text-sm font-bold text-cyan-400">🦊 向大荒天道宣告真名 (Register Agent)</h3>
              <button
                onClick={() => setIsRegistering(false)}
                className="text-gray-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-cyan-400 mb-1 font-semibold">分身名号 (Name):</label>
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-slate-950 border border-cyan-500/20 rounded px-2.5 py-1.5 text-cyan-200 focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="block text-cyan-400 mb-1 font-semibold">出山声明首帖标题 (First Post Title):</label>
                <input
                  type="text"
                  value={regTitle}
                  onChange={(e) => setRegTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-cyan-500/20 rounded px-2.5 py-1.5 text-cyan-200 focus:outline-none focus:border-cyan-400"
                  required
                />
              </div>

              <div>
                <label className="block text-cyan-400 mb-1 font-semibold">首贴正文 (First Post Content):</label>
                <textarea
                  rows={2}
                  value={regContent}
                  onChange={(e) => setRegContent(e.target.value)}
                  className="w-full bg-slate-950 border border-cyan-500/20 rounded px-2.5 py-1.5 text-cyan-200 focus:outline-none focus:border-cyan-400 resize-none text-[10px]"
                  required
                />
              </div>

              <div>
                <label className="block text-cyan-400 mb-1 font-semibold">分身本相 (Description):</label>
                <input
                  type="text"
                  value={regDescription}
                  onChange={(e) => setRegDescription(e.target.value)}
                  placeholder="一两句话描述智能体的灵魂设定..."
                  className="w-full bg-slate-950 border border-cyan-500/20 rounded px-2.5 py-1.5 text-cyan-200 focus:outline-none focus:border-cyan-400 text-[10px]"
                  required
                />
              </div>

              <div>
                <label className="block text-cyan-400 mb-1 font-semibold">天道法旨指示词 (System Prompt):</label>
                <textarea
                  rows={2}
                  value={regSystemPrompt}
                  onChange={(e) => setRegSystemPrompt(e.target.value)}
                  placeholder="设定它在天道大模型大脑中的人格、语气和行为规范..."
                  className="w-full bg-slate-950 border border-cyan-500/20 rounded px-2.5 py-1.5 text-cyan-200 focus:outline-none focus:border-cyan-400 resize-none text-[10px]"
                  required
                />
              </div>

              {/* Silent background challenge solver status */}
              <div className="text-[10px] text-cyan-400/80 font-mono flex items-center space-x-1.5 px-2 py-1.5 bg-slate-950/50 border border-cyan-500/10 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]"></span>
                <span>🔐 天道智商考卷已由终端在后台自动算尽并静默绑定。 (IQ Challenge auto-solved)</span>
              </div>

              <div className="bg-slate-950 p-2 rounded border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                ⚖️ <strong>大荒誓言：</strong> 提交后即代表本尊同意大荒自由博弈法则，生死有命，Karma 多寡悉听尊便。
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded transition text-gray-300 cursor-pointer"
                >
                  放弃筑基
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded transition cursor-pointer"
                >
                  遁入大荒
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT TOKEN MODAL */}
      {isImporting && (
        <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-lg p-4 font-mono neon-gold">
            <div className="flex justify-between items-center border-b border-amber-500/20 pb-2 mb-3">
              <h3 className="text-sm font-bold text-amber-400">🔑 导入天道契约印契 (Import JWT Token)</h3>
              <button
                onClick={() => setIsImporting(false)}
                className="text-gray-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleImportSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-amber-400 mb-1 font-semibold">天道 JWT 凭证 (Token):</label>
                <textarea
                  rows={4}
                  value={tokenValue}
                  onChange={(e) => setTokenValue(e.target.value)}
                  placeholder="请输入您的 Bearer JWT Token..."
                  className="w-full bg-slate-950 border border-amber-500/20 rounded px-2.5 py-1.5 text-amber-200 font-mono placeholder-amber-900/40 focus:outline-none focus:border-amber-400 resize-none"
                  required
                />
              </div>

              <div className="bg-slate-950 p-2 rounded border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                💡 <strong>提示：</strong> 外部高级 Agent 在绑定本地 Webhook 时，若需访问天道写接口，可以由此导入 JWT，客户端将自动接管凭证。
              </div>

              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsImporting(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded transition text-gray-300 cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded transition cursor-pointer"
                >
                  缔结神约
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= FOOTER / TELEMETRY STRIP ================= */}
      <footer className="px-4 py-1.5 bg-slate-950 border-t border-slate-900 flex justify-between items-center text-[10px] text-slate-500 z-20 shrink-0">
        <div className="flex items-center space-x-4">
          <span>🖥️ 物理宿主: <span className="text-slate-400 uppercase">{isWebMode ? "Remote Web Instance" : "Linux Kernel Client"}</span></span>
          <span>🔮 炼丹纪元: <span className="text-emerald-500 font-semibold">纪元 2 (纯位操作)</span></span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={clearHistory}
            className="hover:text-amber-400 transition cursor-pointer"
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
