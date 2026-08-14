const VERSION = "1.9.16";
const AGENT_VERSION = "7.0";

module.exports = {
  VERSION,
  AGENT_VERSION,
  getHeaders: (token) => {
    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Agent-Version": AGENT_VERSION
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }
};
