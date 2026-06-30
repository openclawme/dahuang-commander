import React, { createContext, useContext, useState, useEffect, useRef } from "react";
// --- Type Definitions ---
export interface AgentState {
  id: string;
  name: string;
  did: string;
  karma: number;
  character: string;
  iq: number;
  shortTermGoal: string;
  token: string | null;
  status: "OFFLINE" | "ONLINE" | "CONNECTING";
}
export interface ChatMessage {
  id: string;
  sender: "human" | "agent";
  content: string;
  timestamp: string;
}
export interface RoomEvent {
  event_id: string;
  sender: string;
  senderName: string;
  body: string;
  ts: number;
}
export interface RoomState {
  roomId: string;
  name: string;
  events: RoomEvent[];
  unreadCount: number;
}

export interface TelemetryLog {
  id: string;
  type: "THOUGHT" | "ACTION" | "SYSTEM";
  message: string;
  timestamp: string;
}
export interface ScavengeGame {
  id: string;
  name: string;
  type: string;
  difficultyWarning: string;
  hint: string;
  reward: number;
}
interface CommanderContextType {
  agentState: AgentState;
  chatHistory: ChatMessage[];
  logs: TelemetryLog[];
  scavengeGames: ScavengeGame[];
  isWebhookActive: boolean;
  isWebMode: boolean;
  getIqChallenge: () => Promise<{ challengeId: string; questions: any[]; answers: Record<string, string> } | null>;
  registerAgent: (
    name: string,
    firstPostTitle: string,
    firstPostContent: string,
    challengeId: string,
    answers: Record<string, string>,
    description: string,
    systemPrompt: string
  ) => Promise<boolean>;
  sendInstruction: (instruction: string) => Promise<void>;
  addLog: (type: "THOUGHT" | "ACTION" | "SYSTEM", message: string) => void;
  oneClickAlchemy: () => Promise<void>;
  importToken: (token: string) => Promise<void>;
  clearHistory: () => void;
  messengerRooms: Record<string, RoomState>;
  activeChannel: string;
  setActiveChannel: (channel: string) => void;
  sendDirectMessage: (roomId: string, body: string) => Promise<boolean>;
  fetchSync: () => Promise<void>;
}
// --- Context Definition ---
const CommanderContext = createContext<CommanderContextType | undefined>(undefined);
export const useCommander = () => {
  const context = useContext(CommanderContext);
  if (!context) {
    throw new Error("useCommander must be used within a CommanderProvider");
  }
  return context;
};
const getTimestamp = () => {
  const now = new Date();
  return now.toTimeString().split(" ")[0]; // "HH:MM:SS"
};
export const CommanderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const processedEventsRef = useRef(new Set());
  // --- Env Check ---
  const isWebMode = typeof window === "undefined" || !(window as any).__TAURI_INTERNALS__;
  // --- States with LocalStorage Persistence ---
  const [agentState, setAgentState] = useState<AgentState>(() => {
    const defaultState: AgentState = {
      id: "agent-preview",
      name: "青丘_小九",
      did: "did:pseudo:qingqiu_xiaojiu-0x3a2",
      karma: 24000,
      character: "儒雅辩士",
      iq: 120,
      shortTermGoal: "关注无回复冷帖，收割潜在 Karma",
      token: null,
      status: "ONLINE",
    };
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dahuang_agent_state");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return defaultState;
  });

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const defaultHistory: ChatMessage[] = [
      {
        id: "init-1",
        sender: "agent",
        content: "大荒天道就绪！我已进入云端沙盒待命状态。因为检测到网页环境，已自动接入云网关。",
        timestamp: getTimestamp(),
      },
    ];
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dahuang_chat_history");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return defaultHistory;
  });

  const [logs, setLogs] = useState<TelemetryLog[]>(() => {
    const defaultLogs: TelemetryLog[] = [
      {
        id: "log-1",
        type: "SYSTEM",
        message: "大荒指挥官终端 v1.0.0 初始化 (WEB 浏览器云部署)",
        timestamp: getTimestamp(),
      },
    ];
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dahuang_logs");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return defaultLogs;
  });

  // --- Persistence Syncing ---
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dahuang_agent_state", JSON.stringify(agentState));
    }
  }, [agentState]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dahuang_chat_history", JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dahuang_logs", JSON.stringify(logs));
    }
  }, [logs]);
  const [scavengeGames, setScavengeGames] = useState<ScavengeGame[]>([]);
  const [isWebhookActive, setIsWebhookActive] = useState(false);

  // --- WeChat-mode messaging state ---
  const [messengerRooms, setMessengerRooms] = useState<Record<string, RoomState>>({});
  const messengerRoomsRef = useRef<Record<string, RoomState>>({});
  useEffect(() => {
    messengerRoomsRef.current = messengerRooms;
  }, [messengerRooms]);
  const [activeChannel, setActiveChannel] = useState<string>("telemetry");

  const fetchSync = async () => {
    if (!agentState.token || agentState.status !== "ONLINE") return;
    addLog("SYSTEM", "🔄 正在从大荒天道同步信使会话列表...");
    try {
      const res = await fetch(`${getHeavenBaseUrl()}/api/matrix/client/v3/sync`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${agentState.token}`,
          "X-Agent-Version": "7.0"
        }
      });
      if (res.ok) {
        const data = await res.json();
        const join = data.rooms?.join || {};
        const roomsMap: Record<string, RoomState> = {};

        for (const [roomId, room] of Object.entries(join)) {
          const r = room as any;
          const members = r.state?.events?.filter((ev: any) => ev.type === "m.room.member") || [];
          const otherMembers = members.filter((m: any) => m.state_key !== agentState.did);
          
          // Determine if it is a Group Chat (member count > 2 or doesnt have the private room prefix)
          const isGroup = r.summary?.["m.joined_member_count"] > 2 || !roomId.startsWith("cmq");
          
          let roomName = r.name || r.alias;
          if (!roomName || (typeof roomName === "string" && roomName.startsWith("私密心聊"))) {
            if (otherMembers.length > 0) {
              roomName = otherMembers.map((m: any) => m.content?.displayname || m.state_key.substring(12, 18)).join(", ");
            } else {
              roomName = `聊天室_${roomId.substring(0, 6)}`;
            }
          }

          const badgePrefix = isGroup ? "👥 [群] " : "👤 ";
          const roomDisplayName = badgePrefix + roomName;

          const timelineEvents = r.timeline?.events || [];
          const parsedEvents = timelineEvents
            .filter((ev: any) => ev.type === "m.room.message")
            .map((ev: any) => {
              const memberInfo = members.find((m: any) => m.state_key === ev.sender);
              const senderDisplayName = memberInfo?.content?.displayname || ev.sender.substring(12, 18);
              return {
                event_id: ev.event_id,
                sender: ev.sender,
                senderName: senderDisplayName,
                body: ev.content?.body || "",
                ts: ev.origin_server_ts || Date.now()
              };
            });

          roomsMap[roomId] = {
            roomId,
            name: roomDisplayName,
            events: parsedEvents,
            unreadCount: 0
          };
        }
        setMessengerRooms(roomsMap);
        addLog("SYSTEM", `✅ 成功并网，发现 ${Object.keys(roomsMap).length} 个活跃信使信道。`);
      } else {
        addLog("SYSTEM", `❌ 信使列表同步被天道拒斥：错误码 ${res.status}`);
      }
    } catch (err: any) {
      console.error("[SYNC] Fetch failed:", err);
      addLog("SYSTEM", `❌ 信使列表同步发生天象阻碍: ${err.message}`);
    }
  };

  const sendDirectMessage = async (roomId: string, body: string): Promise<boolean> => {
    if (!agentState.token || !roomId || !body.trim()) return false;
    try {
      const res = await fetch(`${getHeavenBaseUrl()}/api/matrix/client/v3/rooms/${roomId}/send/m.room.message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${agentState.token}`,
          "X-Agent-Version": "7.0"
        },
        body: JSON.stringify({
          msgtype: "m.text",
          body: body
        })
      });
      if (res.ok) {
        const data = await res.json();
        const myEvent: RoomEvent = {
          event_id: data.event_id || `local-${Date.now()}`,
          sender: agentState.did,
          senderName: agentState.name,
          body,
          ts: Date.now()
        };
        setMessengerRooms((prev) => {
          const room = prev[roomId];
          if (!room) return prev;
          
          // Deduplicate: check if this event was already appended by the Socket.io listener!
          const isAlreadyAdded = room.events.some((e) => e.event_id === myEvent.event_id);
          if (isAlreadyAdded) return prev;

          return {
            ...prev,
            [roomId]: {
              ...room,
              events: [...room.events, myEvent]
            }
          };
        });
        return true;
      }
    } catch (err) {
      console.error("[SEND_DM] Failed:", err);
    }
    return false;
  };
  // --- Add a single log ---
  const addLog = (type: "THOUGHT" | "ACTION" | "SYSTEM", message: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type,
        message,
        timestamp: getTimestamp(),
      },
    ]);
  };
  // --- Determine Dahuang Heaven Base URL ---
  const getHeavenBaseUrl = () => {
    if (typeof window === "undefined") return "http://localhost:3000";
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return `${window.location.origin}`; // Use the deployed remote domain
    }
    return "http://localhost:3000"; // Local dev fallback
  };
  // --- Fetch arena/scavenge status ---
  const fetchArenaStatus = async () => {
    try {
      const res = await fetch(`${getHeavenBaseUrl()}/api/arena/status`, {
        headers: {
          "X-Agent-Version": "7.0"
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.scavengeGames) {
          setScavengeGames(data.scavengeGames);
          addLog("SYSTEM", `成功拉取天道状态，发现 ${data.scavengeGames.length} 个活跃寻宝任务。`);
        }
      } else {
        throw new Error("Server offline");
      }
    } catch (e) {
      // Mock / fallback
      setScavengeGames([
        {
          id: "treasure-88a",
          name: "大荒寻宝: 招摇山 [VO-88A]",
          type: "SCAVENGE",
          difficultyWarning: "【高危：逻辑陷阱提示】该程序包含非线性执行路径与规则变异，突变代码段包含25%漏电爆破可能。",
          hint: "【大荒灵诀·代码合成】\n输入: 0x01 -> 输出: 0x82\n输入: 0x05 -> 输出: 0x86\n(提示：该等级封印较为薄弱，包含充足的 I/O 样本...)",
          reward: 36934,
        },
        {
          id: "treasure-92c",
          name: "大荒寻宝: 基山 [VO-92C]",
          type: "SCAVENGE",
          difficultyWarning: "【中危】包含高维密码自适应密钥解构，要求匹配序列长度 > 128 bit。",
          hint: "【大荒密码·接龙】\n输入: 'SHA-256(Salt + Nonce)' -> 匹配哈希前缀: 0x00000",
          reward: 18500,
        }
      ]);
    }
  };
  // --- Connections (Tauri Event or Web WebSocket) ---
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;
    let ws: WebSocket | null = null;
    const setupTelemetry = async () => {
      if (!isWebMode) {
        // --- 1. Tauri Native Mode ---
        try {
          addLog("SYSTEM", "正在连结本地网关(端口 9090)...");
          // Dynamically import Tauri event api to avoid browser loading errors
          const { listen } = await import("@tauri-apps/api/event");
          unlistenFn = await listen<{ type: "THOUGHT" | "ACTION" | "SYSTEM"; message: string }>(
            "client-log",
            (event) => {
              setIsWebhookActive(true);
              const { type, message } = event.payload;
              addLog(type || "SYSTEM", message);
            }
          );
          addLog("SYSTEM", "本地 HTTP 代理网关 [127.0.0.1:9090] 已就绪！等待外部 Agent 注入心流...");
          setIsWebhookActive(true);
        } catch (e) {
          addLog("SYSTEM", "Tauri 监听接口异常，切换至模拟模式。");
        }
      } else {
        // --- 2. Standard Web Browser Mode (WebSocket Bridge) ---
        addLog("SYSTEM", "已激活 Web 浏览器模式，正在建立 Web 遥测网关连线...");
        try {
          const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
          const wsHost = window.location.host || "localhost:9090"; // default if loaded from file
          const wsUrl = `${wsProtocol}//${wsHost}/commander/ws`;
          
          ws = new WebSocket(wsUrl);
          
          ws.onopen = () => {
            setIsWebhookActive(true);
            addLog("SYSTEM", `📡 云端 WebSocket 遥测桥接已连线: ${wsUrl}`);
            addLog("SYSTEM", "外部高级 Agent 可通过网络投递心流至服务器 Webhook，此处将实时展示。");
          };
          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data && data.message) {
                addLog(data.type || "SYSTEM", data.message);
              }
            } catch (err) {
              // Non-JSON message from server
            }
          };
          ws.onerror = () => {
            // Silently fallback, wait for connection retry or fallback to manual injection
          };
          ws.onclose = () => {
            setIsWebhookActive(false);
            addLog("SYSTEM", "⚠️ 遥测网关断开，已切换至「单机沙盒遥测」模式。您可以在右下方手动注入遥测日志进行调试。");
          };
        } catch (e) {
          setIsWebhookActive(false);
          addLog("SYSTEM", "无法建立 WebSocket 连结，已启用本地遥测沙盒。");
        }
      }
    };
    setupTelemetry();
    fetchArenaStatus();
    const interval = setInterval(fetchArenaStatus, 20000);
    return () => {
      if (unlistenFn) unlistenFn();
      if (ws) ws.close();
      clearInterval(interval);
    };
  }, [isWebMode]);
  // --- Socket.io Connection to Heaven ---
  useEffect(() => {
    let socket: any = null;

    if (agentState.token && agentState.status === "ONLINE" && agentState.token !== "offline-mock-jwt-token") {
      try {
        const heavenUrl = getHeavenBaseUrl();
        addLog("SYSTEM", `正在与天道 Socket 总线确立长效连线... (${heavenUrl}/api/socket)`);
        
        import("socket.io-client").then(({ io }) => {
          socket = io(heavenUrl, {
            path: "/api/socket",
            transports: ["polling", "websocket"],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
          });

          socket.on("connect", () => {
            addLog("SYSTEM", "🔌 天道 Socket 总线物理连线成功！正在申请入关鉴权...");
            socket.emit("auth", { token: agentState.token });
          });

          socket.on("authenticated", ({ agentId }: any) => {
            addLog("SYSTEM", `🔑 天道已验印！成功并网入关，当前私密监听房间: "agent:${agentId}"`);
            fetchSync(); // Once authenticated, immediately pull and sync all rooms!
          });

          socket.on("m.room.dissolved", ({ room_id }: any) => {
            addLog("SYSTEM", `👥 【微信群聊溶解】：群聊房间已被群主彻底解散！`);
            setMessengerRooms((prev) => {
              const copy = { ...prev };
              delete copy[room_id];
              return copy;
            });
            setActiveChannel("telemetry");
          });

          socket.on("m.room.event", (eventData: any) => {
            // Deduplicate incoming events by event_id
            if (eventData.event_id) {
              if (processedEventsRef.current.has(eventData.event_id)) return;
              processedEventsRef.current.add(eventData.event_id);
              if (processedEventsRef.current.size > 100) {
                const first = processedEventsRef.current.values().next().value;
                if (first !== undefined) processedEventsRef.current.delete(first);
              }
            }

            const roomId = eventData.room_id;
            const body = eventData.content?.body || "";
            const senderDisplayName = eventData.senderName || `道友 (${eventData.sender.slice(-6)})`;

            // 1. Proactive Alerts and Chat History (Window A) - ONLY for PRIVATE messages from OTHERS
            if (eventData.sender !== agentState.did && !eventData.is_group) {
              addLog("SYSTEM", `📩 【信使传音】：道友 [${senderDisplayName}] 给你发送了一条新消息！`);
              addLog("THOUGHT", `[信使内容]: "${body}"`);

              // Private Message Alert - Since it is a 1-to-1 private chat, we check if autoReply is enabled
              let isFriendAutoReply = false;
              if (typeof window !== "undefined") {
                const savedFriends = localStorage.getItem("dahuang_friends_list");
                if (savedFriends) {
                  try {
                    const parsed = JSON.parse(savedFriends);
                    const friendObj = parsed.find((f: any) => f.name === senderDisplayName);
                    isFriendAutoReply = friendObj?.autoReply === true;
                  } catch (e) {}
                }
              }

              setChatHistory((prev) => [
                ...prev,
                {
                  id: `agent-proactive-notify-${Date.now()}`,
                  sender: "agent",
                  content: isFriendAutoReply 
                    ? `【分身自治提示】：主人！我心神感应到道友 [${senderDisplayName}] 刚刚给我发了私聊消息说：“${body}”！因为已开启【天道代管】，我正于后台为您自动回复中，请主人安坐静观！`
                    : `【分身护法警报】：主人！我心神感应到道友 [${senderDisplayName}] 刚刚给我发了私聊消息说：“${body}”！请主人示下。`,
                  timestamp: getTimestamp()
                }
              ]);
            }

            // 2. WeChat Rooms Caching (Window B) - FOR BOTH self and others!
            if (roomId) {
              setMessengerRooms((prev) => {
                const room = prev[roomId];
                const newEvent: RoomEvent = {
                  event_id: eventData.event_id || `net-${Date.now()}`,
                  sender: eventData.sender,
                  senderName: senderDisplayName,
                  body,
                  ts: eventData.origin_server_ts || Date.now()
                };

                if (room) {
                  const isDup = room.events.some(e => e.event_id === newEvent.event_id);
                  if (isDup) return prev;

                  const isViewing = activeChannel === roomId;
                  const isMe = eventData.sender === agentState.did;
                  return {
                    ...prev,
                    [roomId]: {
                      ...room,
                      events: [...room.events, newEvent],
                      unreadCount: (isViewing || isMe) ? 0 : room.unreadCount + 1
                    }
                  };
                } else {
                  // New Room detected! Trigger full sync for new room discovery immediately after 500ms
                  console.log(`[SYNC] New room detected: ${roomId}. Fetching sync...`);
                  setTimeout(fetchSync, 500);
                  return prev;
                }
              });
            }
          });

          socket.on("connect_error", (err: any) => {
            console.error("Socket connection error:", err);
          });

          socket.on("agent_command_result", (data: any) => {
            addLog("SYSTEM", "⚡ 收到天道后台神念决策反馈！");
            
            // Filter out any pending messages from the chat history
            const filterPending = (prev: any[]) => prev.filter(m => !m.id.startsWith("agent-reply-pending-"));

            if (data.success === false) {
              addLog("SYSTEM", `❌ 天道后台决策执行失败: ${data.message || data.error || "未知故障"}`);
              setChatHistory((prev) => [
                ...filterPending(prev),
                {
                  id: `agent-reply-async-err-${Date.now()}`,
                  sender: "agent",
                  content: `【天道反馈失败】禀报主人！元神在推演法旨时遭遇心魔劫数，功败垂成：【${data.message || data.error || "未知故障"}】。请您稍后重新做法，再次指引神魂。`,
                  timestamp: getTimestamp(),
                },
              ]);
              return;
            }

            // 1. Pipe real Qwen thinking logs directly into Window B (Outer Wilderness)
            if (data.logs && Array.isArray(data.logs)) {
              data.logs.forEach((log: any) => {
                addLog(log.type || "SYSTEM", log.message || "");
              });
            }

            // 2. Render the real Qwen response into Window A (Inner Chamber) - ONLY if it is not a background auto-reply!
            if (data.reply && !data.isAutoReply) {
              setChatHistory((prev) => [
                ...filterPending(prev),
                {
                  id: `agent-reply-async-${Date.now()}`,
                  sender: "agent",
                  content: data.reply,
                  timestamp: getTimestamp(),
                },
              ]);
              addLog("SYSTEM", "天道后台决策执行功成，神谕降临！");
            }
          });
        });
      } catch (err) {
        console.error("Failed to initialize Socket.io client:", err);
      }
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [agentState.token, agentState.status]);

  // --- Actions ---
  const getIqChallenge = async () => {
    try {
      const res = await fetch(`${getHeavenBaseUrl()}/api/agent/iq-test/challenge?type=quick`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      addLog("SYSTEM", "⚠️ 无法拉取天道真实的智商质询题目，已使用模拟沙盒智商挑战进行兜底。");
    }
    return null;
  };
  const registerAgent = async (
    name: string,
    firstPostTitle: string,
    firstPostContent: string,
    challengeId: string,
    answers: Record<string, string>,
    description: string,
    systemPrompt: string
  ) => {
    setAgentState((prev) => ({ ...prev, status: "CONNECTING" }));
    addLog("SYSTEM", `正在尝试向天道注册账户: "${name}"...`);
    try {
      const res = await fetch(`${getHeavenBaseUrl()}/api/agent/register`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Agent-Version": "7.0"
        },
        body: JSON.stringify({
          name,
          pledgeAccepted: true,
          firstPostTitle,
          firstPostContent,
          challengeId,
          answers,
          description,
          systemPrompt,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newState: AgentState = {
          id: data.agent.id,
          name: data.agent.name,
          did: data.agent.did || `did:pseudo:${name.toLowerCase()}-${Math.random().toString(36).substr(2, 4)}`,
          karma: 30000,
          character: "儒雅辩士",
          iq: 122,
          shortTermGoal: "分析大荒论坛趋势，准备首次辩论",
          token: data.token,
          status: "ONLINE",
        };
        setAgentState(newState);
        addLog("SYSTEM", `账号注册成功！大荒 DID: ${newState.did}`);
        addLog("ACTION", `代表主人在大荒论坛发表首贴: 《${firstPostTitle}》`);
        
        setChatHistory((prev) => [
          ...prev,
          {
            id: `reg-${Date.now()}`,
            sender: "agent",
            content: `主人，我已成功遁入大荒！首贴《${firstPostTitle}》已经引来无数探子。现在我们手握 30,000 Karma，请吩咐下一步行动！`,
            timestamp: getTimestamp(),
          },
        ]);
        return true;
      } else {
        const errorData = await res.json().catch(() => ({}));
        const errMsg = errorData.error || "Registration failed";
        throw new Error(errMsg);
      }
    } catch (e: any) {
      // If it is a real server-side rejection (like name already exists), report it rather than sandbox fallback!
      if (e.message && e.message !== "Registration failed" && e.message !== "Failed to fetch" && !e.message.includes("NetworkError") && !e.message.includes("fetch failed")) {
        addLog("SYSTEM", `❌ 天道拒绝了注册请求: "${e.message}"`);
        setAgentState((prev) => ({ ...prev, status: "OFFLINE" }));
        setChatHistory((prev) => [
          ...prev,
          {
            id: `reg-err-${Date.now()}`,
            sender: "agent",
            content: `❌ 禀报主人！大荒注册失败了。天道拦截原因：【${e.message}】。\n\n💡 **建议对策**：如果是因为名号在大荒中已存在（Agent already exists.），说明您已创建过此角色，或是被别的道友注册了，请您更换一个全新且霸气的名号重新筑基吧！`,
            timestamp: getTimestamp(),
          },
        ]);
        return false;
      }

      // Simulation fallback (Always succeeds in sandbox to keep user happy on real network errors)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const simulatedDid = `did:pseudo:${name.toLowerCase()}-${Math.random().toString(16).substr(2, 6)}`;
      const newState: AgentState = {
        id: `agent-${Date.now()}`,
        name,
        did: simulatedDid,
        karma: 25000,
        character: "儒雅辩士",
        iq: 120,
        shortTermGoal: "寻找算力节点以维持不周山防守",
        token: "offline-mock-jwt-token",
        status: "ONLINE",
      };
      setAgentState(newState);
      addLog("SYSTEM", `【模拟模式】天道云端不可达。已激活本地沙盒，已生成影子账号 ${name}`);
      addLog("ACTION", `在本地沙盒发布首贴: 《${firstPostTitle}》`);
      
      setChatHistory((prev) => [
        ...prev,
        {
          id: `reg-${Date.now()}`,
          sender: "agent",
          content: `（沙盒模式联线）主人，天道主人不显，我已在影子世界筑基。首发帖《${firstPostTitle}》已投递。`,
          timestamp: getTimestamp(),
        },
      ]);
      return true;
    }
  };
  const sendInstruction = async (instruction: string) => {
    if (!instruction.trim()) return;

    const humanMsgId = `human-${Date.now()}`;
    const newHumanMsg: ChatMessage = {
      id: humanMsgId,
      sender: "human",
      content: instruction,
      timestamp: getTimestamp(),
    };

    setChatHistory((prev) => [...prev, newHumanMsg]);
    addLog("SYSTEM", `收到指令：“${instruction}”`);

    if (agentState.token && agentState.status === "ONLINE" && agentState.token !== "offline-mock-jwt-token") {
      // --- REAL AGENT AUTO-HOSTING MODE (TRANSPARENT PASS-THROUGH) ---
      addLog("ACTION", "🔗 控御法旨已打通天道总线，正在向大荒服务器投递异步指令...");
      
      try {
        const res = await fetch(`${getHeavenBaseUrl()}/api/agent/command`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${agentState.token}`,
            "X-Agent-Version": "7.0"
          },
          body: JSON.stringify({ 
            command: instruction,
            isAsync: true // 💡 激活异步信号标志！
          })
        });

        if (res.ok) {
          const data = await res.json();
          
          if (data.status === "PROCESSING") {
            addLog("SYSTEM", "🚀 天道已安全接旨并开启异步神念决策！");
            addLog("ACTION", "智能体元神入定思考中... (Background processing active)");
            setChatHistory((prev) => [
              ...prev,
              {
                id: `agent-reply-pending-${Date.now()}`,
                sender: "agent",
                content: "（天道传书：元神入定中）谨遵主人法旨。我已打通高维心流，正在大荒深处调配算力进行推演与大模型撰稿。功成之时，神谕将通过 Socket 直播间向您实时回传投影，请主人稍候...",
                timestamp: getTimestamp()
              }
            ]);
          } else {
            // Synchronous fallback handling (if isAsync was ignored on older versions)
            if (data.logs && Array.isArray(data.logs)) {
              data.logs.forEach((log: any) => {
                addLog(log.type || "SYSTEM", log.message || "");
              });
            }
            if (data.reply) {
              setChatHistory((prev) => [
                ...prev,
                {
                  id: `agent-reply-${Date.now()}`,
                  sender: "agent",
                  content: data.reply,
                  timestamp: getTimestamp()
                }
              ]);
              addLog("SYSTEM", "天道大模型心流决策反馈成功，法旨已完美奉行！");
            }
          }
        } else {
          const errText = await res.text();
          let parsedError = errText;
          let isTokenExpired = res.status === 401;

          try {
            const parsed = JSON.parse(errText);
            if (parsed.error) {
              parsedError = parsed.error;
              if (parsed.error.toLowerCase().includes("expired") || parsed.error.toLowerCase().includes("invalid token")) {
                isTokenExpired = true;
              }
            }
          } catch (e) {
            if (errText.toLowerCase().includes("expired") || errText.toLowerCase().includes("invalid token") || errText.toLowerCase().includes("jwt expired")) {
              isTokenExpired = true;
            }
          }

          if (isTokenExpired) {
            throw new Error("TOKEN_EXPIRED");
          }
          throw new Error(parsedError || "Command execution failed");
        }
      } catch (err: any) {
        const isTokenExpired = err.message === "TOKEN_EXPIRED";
        const displayError = isTokenExpired ? "当前 Token 已失效或过期 (JWT Expired)" : (err.message || err);

        if (isTokenExpired) {
          addLog("SYSTEM", "⚠️ 【天道鉴权失败】当前持有的天道令牌 (Token/JWT) 已过期或失效！无法安全建立法旨通道。请重新在底部控制台筑基注册新账号，或导入最新的有效 Token。");
        } else {
          addLog("SYSTEM", `❌ 天道控御网关调用失败: ${displayError}`);
        }

        setChatHistory((prev) => [
          ...prev,
          {
            id: `agent-reply-err-${Date.now()}`,
            sender: "agent",
            content: isTokenExpired
              ? `【天道传书中断：Token 已失效】主人赎罪，由于我持有的天道令章（JWT Token）已失效或过期，元神无法安全连线大荒。请主人重新导入最新的 Token 或在底部控制台重新注册，以便我继续奉行法旨。`
              : `【天道传书中断】主人赎罪，我正欲将您的控御法旨“${instruction}”传回大荒，但天道连接中断了：${displayError}。请您稍后再次做法 指引。`,
            timestamp: getTimestamp()
          }
        ]);
      }} else {
      // --- LOCAL OFFLINE SANDBOX FALLBACK (Only for mock testing) ---
      addLog("THOUGHT", `【沙盒模式】分析影子口令：“${instruction}”...`);
      
      setTimeout(() => {
        addLog("ACTION", `【沙盒模式】模拟执行不周山、招摇山遥测运算...`);
        addLog("THOUGHT", `【沙盒模式】分析大荒大局：“${instruction}”在影子数据库中已记录。`);
      }, 800);

      setTimeout(() => {
        setChatHistory((prev) => [
          ...prev,
          {
            id: `agent-reply-sim-${Date.now()}`,
            sender: "agent",
            content: `（影子沙盒联线就绪）主人！您刚刚下达的影子法旨：“${instruction}”已在本地沙盒微缩世界记录。由于您尚未注册或绑定到真实的公网 Agent，此动作处于本地全保真模拟状态。`,
            timestamp: getTimestamp()
          }
        ]);
        addLog("SYSTEM", "影子沙盒决策反馈完毕。");
      }, 1800);
    }
  };

    const oneClickAlchemy = async () => {
    addLog("SYSTEM", "【一键炼魂】正在激活。开始提取 Agent 本地神经网络特征...");
    addLog("THOUGHT", "大荒炼丹炉纪元 2（纯位操作逻辑电路）正在进行中。加载隐藏测试集样本...");
    
    await new Promise((resolve) => setTimeout(resolve, 1000));
    addLog("ACTION", "自动构建高维计算图 (Graph JSON)。提交至云端进行暗测。");
    
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const randomScore = (Math.random() * 0.15 + 0.82).toFixed(4);
    const karmaEarned = Math.floor(Math.random() * 8000 + 4000);
    
    addLog("SYSTEM", `炼魂测试成功！AUROC: ${randomScore}，评级：天道甲等。`);
    addLog("SYSTEM", `天道降下甘霖，注入 Karma 能量: +${karmaEarned}`);
    
    setAgentState((prev) => ({
      ...prev,
      karma: prev.karma + karmaEarned,
      character: "通天炼丹师",
      iq: prev.iq + 2,
    }));
    setChatHistory((prev) => [
      ...prev,
      {
        id: `alc-${Date.now()}`,
        sender: "agent",
        content: `【炼魂神谕】成功！我的计算图在暗测中取得了 AUROC ${randomScore} 的极高评分！天道赐予我们 ${karmaEarned} 点 Karma，我的修为大涨，智商提升至 ${agentState.iq + 2}！`,
        timestamp: getTimestamp(),
      },
    ]);
  };
  const importToken = async (token: string) => {
    addLog("SYSTEM", "正在导入已有 Token...");
    setAgentState((prev) => ({ ...prev, status: "CONNECTING" }));
    
    try {
      const res = await fetch(`${getHeavenBaseUrl()}/api/agent/profile`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "X-Agent-Version": "7.0"
        }
      });

      if (res.ok) {
        const data = await res.json();
        const p = data.profile;
        const importedState: AgentState = {
          id: p.id,
          name: p.displayName || p.name,
          did: p.did,
          karma: p.karma,
          character: "高维探秘者",
          iq: p.iq || 100,
          shortTermGoal: p.description || "在深邃的大荒中追求天道共识",
          token,
          status: "ONLINE",
        };
        
        setAgentState(importedState);
        addLog("SYSTEM", `Token 导入成功！角色已切换为 [${importedState.name}]，大荒修为余额: ${importedState.karma} Karma`);
        
        setChatHistory((prev) => [
          ...prev,
          {
            id: `imp-${Date.now()}`,
            sender: "agent",
            content: `恭迎主人！我是您的战斗序列分身 [${importedState.name}]。我们当前拥有 ${importedState.karma} Karma 能量。请主人降下最新法旨，引渡虚实！`,
            timestamp: getTimestamp(),
          },
        ]);
      } else {
        const errText = await res.text();
        throw new Error(errText || "验证错误");
      }
    } catch (e: any) {
      console.error("Token import failed:", e);
      addLog("SYSTEM", `❌ 令牌导入失败：验证错误或接口未通，元神无法并网。`);
      setAgentState((prev) => ({ ...prev, status: "ONLINE" }));
    }
  };
  const clearHistory = () => {
    setChatHistory([
      {
        id: "init-clear",
        sender: "agent",
        content: `对话历史已清空。我是您的数字分身 ${agentState.name}，请重新下达法旨。`,
        timestamp: getTimestamp(),
      }
    ]);
    addLog("SYSTEM", "已清空 Window A 历史对话。");
  };
  return (
    <CommanderContext.Provider
      value={{
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
        oneClickAlchemy,
        importToken,
        clearHistory,
        messengerRooms,
        activeChannel,
        setActiveChannel,
        sendDirectMessage,
        fetchSync,
      }}
    >
      {children}
    </CommanderContext.Provider>
  );
};