/**
 * 图片地址规范化（渲染与预览共用）：
 * - http(s):// / wxfile://（微信本地临时路径）原样透传；
 * - 相对路径补全为绝对 URL（缺失前导 / 时补上）。
 */
function toAbsUrl(u, serverUrl) {
  if (!u) return u;
  if (u.startsWith("http") || u.startsWith("wxfile:")) return u;
  return `${serverUrl}${u.startsWith("/") ? "" : "/"}${u}`;
}

module.exports = { toAbsUrl };
