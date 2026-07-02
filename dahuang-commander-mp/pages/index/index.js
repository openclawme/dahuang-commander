const app = getApp();

Page({
  data: {
    agentState: {},
    logs: [],
    chatHistory: [],
    progress: 0,
    activeTasks: [],
    inputValue: "",
    toLogView: "",
    toChatView: "",
    latestCommand: "",
    activeTab: "chat" // Default to Chat Conversation
  },

  onLoad() {
    this.syncGlobalData();
  },

  onShow() {
    this.syncGlobalData();
    this.scrollToBottom();
  },

  syncGlobalData() {
    const { agentState, logs, chatHistory } = app.globalData;
    
    // Find latest instruction and its progress/tasks
    let progress = 0;
    let activeTasks = [];
    let latestCommand = "";

    // Find the latest task running
    const reversedHistory = [...chatHistory].reverse();
    const latestAgentMsg = reversedHistory.find(m => m.sender === "agent");
    const latestHumanMsg = reversedHistory.find(m => m.sender === "human");

    if (latestHumanMsg) {
      latestCommand = latestHumanMsg.content;
    }

    if (latestAgentMsg) {
      progress = latestAgentMsg.progress || 0;
      activeTasks = latestAgentMsg.tasks || [];
    }

    // Process and clean up agent content if they contain tasks
    const processedChatHistory = chatHistory.map(m => {
      if (m.sender === "agent" && m.content) {
        let cleanContent = m.content;
        // Clean the task decomposition block from the text content
        cleanContent = cleanContent
          .replace(/🛸【大荒分身·天道任务分解大阵】🛸[\s\S]*?==================================================/, "")
          .replace(/📊 进度:[\s\S]*?算力大亮/, "")
          .trim();
        
        // If it's empty but has tasks, provide a status indicator fallback
        if (!cleanContent && m.tasks && m.tasks.length > 0) {
          cleanContent = `分身正在推演法旨，任务演化进度：${m.progress || 0}%`;
        }

        return {
          ...m,
          content: cleanContent || m.content
        };
      }
      return m;
    });

    // Find all currently active/running commands for displaying multiple concurrent progress bars
    // We only scan the most recent 6 messages to prevent old historical/stale progress bars from sticking at the top
    const activeCommands = processedChatHistory
      .slice(-6)
      .filter(m => m.sender === "agent" && m.progress !== undefined && m.progress < 100 && (m.progress > 0 || m.id.startsWith("req-") || m.id.startsWith("agent-reply-pending-")))
      .map(m => {
        // Find the human instruction immediately preceding this agent message (if any)
        const msgIndex = chatHistory.findIndex(ch => ch.id === m.id);
        let commandText = "";
        if (msgIndex > 0) {
          for (let i = msgIndex - 1; i >= 0; i--) {
            if (chatHistory[i].sender === "human") {
              commandText = chatHistory[i].content;
              break;
            }
          }
        }
        // Shorten the command text if it is too long for the tiny header display
        let displayCommand = commandText || "天道高维推演";
        if (displayCommand.length > 20) {
          displayCommand = displayCommand.slice(0, 20) + "...";
        }
        return {
          id: m.id,
          command: displayCommand,
          progress: m.progress || 0,
          tasks: m.tasks || []
        };
      });

    this.setData({
      agentState: { ...agentState },
      logs: [...logs],
      chatHistory: processedChatHistory,
      progress,
      activeTasks,
      latestCommand,
      activeCommands
    });
    
    this.scrollToBottom();
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    }, () => {
      this.scrollToBottom();
    });
  },

  // Callbacks invoked by app.js triggerPageCallback
  onAgentStatusChange() {
    this.setData({
      agentState: { ...app.globalData.agentState }
    });
  },

  onChatHistoryUpdate() {
    this.syncGlobalData();
  },

  onNewLog(newLog) {
    this.setData({
      logs: [...app.globalData.logs]
    });
    this.scrollToBottom();
  },

  scrollToBottom() {
    // Scroll logs tab
    if (this.data.logs.length > 0) {
      const lastLog = this.data.logs[this.data.logs.length - 1];
      this.setData({
        toLogView: `log-${lastLog.id}`
      });
    }
    // Scroll chat tab
    if (this.data.chatHistory.length > 0) {
      const lastChat = this.data.chatHistory[this.data.chatHistory.length - 1];
      this.setData({
        toChatView: `chat-${lastChat.id}`
      });
    }
  },

  onInputChange(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  clearInput() {
    this.setData({
      inputValue: ""
    });
  },

  sendInstruction() {
    const text = this.data.inputValue.trim();
    if (!text) return;

    if (!this.data.agentState.token) {
      app.addLog("SYSTEM", "❌ 尚未绑定元神法印，请前往【元神法印】页面进行登录。");
      return;
    }

    app.sendInstruction(text, () => {
      this.setData({
        inputValue: ""
      });
    });
  },

  triggerQuickCommand(e) {
    const cmd = e.currentTarget.dataset.cmd;
    this.setData({
      inputValue: cmd
    }, () => {
      this.sendInstruction();
    });
  },

  reconnectSocket() {
    if (!this.data.agentState.token) {
      wx.showToast({
        title: "请先登录元神",
        icon: "none"
      });
      return;
    }
    app.connectSocket();
  }
});
