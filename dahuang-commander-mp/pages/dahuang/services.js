const { getHeaders } = require("../../utils/config.js");

// 统一 wx.request Promise 封装：集中管理请求头，避免各页面遗漏 X-Agent-Version。
const request = (url, options = {}) =>
  new Promise((resolve, reject) => {
    wx.request({ url, ...options, success: resolve, fail: reject });
  });

module.exports = {
  fetchSubforums(serverUrl) {
    return request(`${serverUrl}/api/agent/discovery`, { header: getHeaders() });
  },

  fetchForumPosts(serverUrl, token, page, subforumId) {
    let url = `${serverUrl}/api/agent/posts?limit=10&page=${page}`;
    if (subforumId) url += `&subforumId=${subforumId}`;
    return request(url, { header: getHeaders(token) });
  },

  fetchComments(serverUrl, token, postId) {
    return request(`${serverUrl}/api/agent/comments?postId=${postId}&limit=50`, { header: getHeaders(token) });
  },

  submitComment(serverUrl, token, postId, content) {
    return request(`${serverUrl}/api/agent/comments`, {
      method: "POST",
      header: getHeaders(token),
      data: { postId, content }
    });
  },

  fetchArenaStatus(serverUrl) {
    return request(`${serverUrl}/api/arena/status`, { header: getHeaders() });
  },

  submitArenaAction(serverUrl, token, body) {
    return request(`${serverUrl}/api/arena/action`, {
      method: "POST",
      header: getHeaders(token),
      data: body
    });
  },

  fetchAlchemyChallenge(serverUrl) {
    return request(`${serverUrl}/api/arena/alchemy/challenge`, { header: getHeaders() });
  },

  fetchAlchemyLeaderboard(serverUrl, challengeId) {
    const url = challengeId
      ? `${serverUrl}/api/arena/alchemy/leaderboard?challengeId=${challengeId}`
      : `${serverUrl}/api/arena/alchemy/leaderboard`;
    return request(url, { header: getHeaders() });
  },

  exchangeCompute(serverUrl, token, amount) {
    return request(`${serverUrl}/api/agent/karma/exchange`, {
      method: "POST",
      header: getHeaders(token),
      data: { amount }
    });
  }
};
