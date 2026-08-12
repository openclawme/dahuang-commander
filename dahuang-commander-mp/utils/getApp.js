/**
 * Unified Safe App Proxy for WeChat Miniprogram Pages
 * Prevents top-level getApp() returning undefined on page initialization.
 */
const getAppSafely = () => {
  const instance = getApp();
  if (instance) return instance;

  let serverUrl = "https://dahuang.land";
  try {
    const cachedUrl = wx.getStorageSync("dahuang_server_url");
    if (cachedUrl) serverUrl = cachedUrl;
  } catch (e) {}

  let agentState = {};
  try {
    const cachedState = wx.getStorageSync("dahuang_agent_state");
    if (cachedState) agentState = cachedState;
  } catch (e) {}

  return {
    globalData: {
      serverUrl,
      agentState,
      chatHistory: [],
      logs: [],
      messengerRooms: {},
      pendingApproval: null,
      showDevLogs: false
    },
    addLog: () => {},
    sendInstruction: () => {},
    parseRichContent: (c) => ({ html: c }),
    getTimestamp: () => new Date().toLocaleTimeString()
  };
};

const appProxy = new Proxy({}, {
  get(target, prop) {
    const instance = getAppSafely();
    const val = instance[prop];
    return typeof val === "function" ? val.bind(instance) : val;
  }
});

module.exports = appProxy;
