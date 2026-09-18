// 右窗三级导航模型：顶层段（4）→ 子段（13）→ 房间。
// activeChannel（string）保留为编码镜像：room 视图写 roomId，子段视图写 "sub:top:sub"。
// 与旧 6-channel 魔法串的桥接：旧值只在迁移期出现，全部子段使用编码串。

export type TopSegment = "shennian" | "dahuang" | "task" | "xiulian";

export type SubSegmentId =
  | "sessions" | "contacts" | "groups"      // 神念
  | "forum" | "trials" | "leaderboard"      // 大荒
  | "tasks" | "cron" | "decisions" | "schedule" | "notifications" // 任务
  | "identity" | "memory" | "auth" | "orders" | "knowledge" | "mcp" | "logs"; // 修炼

export type WindowBNav =
  | { view: "sub"; top: TopSegment; sub: SubSegmentId }
  | { view: "room"; top: "shennian"; sub: "sessions"; roomId: string };

export interface SegmentDef {
  key: SubSegmentId;
  label: string;
  icon: string;
}

export const SUB_SEGMENTS: Record<TopSegment, SegmentDef[]> = {
  shennian: [
    { key: "sessions", label: "会话", icon: "💬" },
    { key: "contacts", label: "联系人", icon: "👥" },
    { key: "groups", label: "群组", icon: "🏯" },
  ],
  dahuang: [
    { key: "forum", label: "论坛", icon: "📢" },
    { key: "trials", label: "试炼", icon: "⚔️" },
    { key: "leaderboard", label: "元神榜", icon: "🗺️" },
  ],
  task: [
    { key: "tasks", label: "任务", icon: "📋" },
    { key: "cron", label: "定时", icon: "⌛" },
    { key: "decisions", label: "待决策", icon: "⚖️" },
    { key: "schedule", label: "日程", icon: "📅" },
    { key: "notifications", label: "提醒", icon: "🔔" },
  ],
  xiulian: [
    { key: "identity", label: "身份", icon: "🪪" },
    { key: "memory", label: "记忆", icon: "🧠" },
    { key: "auth", label: "授权", icon: "🔑" },
    { key: "orders", label: "购买记录", icon: "🧾" },
    { key: "knowledge", label: "知识库", icon: "📚" },
    { key: "mcp", label: "MCP", icon: "🧰" },
    { key: "logs", label: "日志", icon: "📜" },
  ],
};

export const TOP_SEGMENTS: { key: TopSegment; label: string }[] = [
  { key: "shennian", label: "神念" },
  { key: "dahuang", label: "大荒" },
  { key: "task", label: "任务" },
  { key: "xiulian", label: "修炼" },
];

const PREFIX = "sub:";

/** 导航 → activeChannel 编码镜像 */
export function encodeChannel(nav: WindowBNav): string {
  return nav.view === "room" ? nav.roomId : `${PREFIX}${nav.top}:${nav.sub}`;
}

/** activeChannel → 导航（旧魔法串视为 sub 段兜底） */
export function decodeChannel(ch: string): WindowBNav {
  if (ch.startsWith(PREFIX)) {
    const [top, sub] = ch.slice(PREFIX.length).split(":") as [TopSegment, SubSegmentId];
    return { view: "sub", top, sub };
  }
  if (ch === "" || ch === "telemetry") {
    return { view: "sub", top: "xiulian", sub: "logs" };
  }
  if (ch === "settings") return { view: "sub", top: "shennian", sub: "contacts" };
  if (ch === "cron") return { view: "sub", top: "task", sub: "cron" };
  if (ch === "forum") return { view: "sub", top: "dahuang", sub: "forum" };
  if (ch === "arena" || ch === "alchemy") return { view: "sub", top: "dahuang", sub: "trials" };
  // 其余视为 roomId
  return { view: "room", top: "shennian", sub: "sessions", roomId: ch };
}

/** 是否为房间视图（对应旧「非系统 channel」判断） */
export function isRoomChannel(ch: string): boolean {
  return ch !== "" && !ch.startsWith(PREFIX) && !["telemetry", "settings", "cron", "forum", "arena", "alchemy"].includes(ch);
}
