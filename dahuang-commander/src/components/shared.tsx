import { useState, useEffect } from "react";

// --- Neon Cyberpunk Task Visualizer Panel ---
// --- Rich HTML-Like Dialogue Renderer ---
// --- Claude "Imagining..." 同款放射星芒：暖珊瑚色 8 条不等长光芒，缓慢旋转 + 呼吸 ---
function ImaginingStarburst() {
  const rays = [
    { h: 17, a: 0 }, { h: 11, a: 45 }, { h: 14, a: 90 }, { h: 9, a: 135 },
    { h: 16, a: 180 }, { h: 10, a: 225 }, { h: 13, a: 270 }, { h: 8, a: 315 },
  ];
  return (
    <>
      <style>{`
        @keyframes starburstbreathe { 0%, 100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.12); opacity: 1; } }
        @keyframes starburstspin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
      <span className="inline-block w-4 h-4 shrink-0 animate-[starburstbreathe_2.4s_ease-in-out_infinite]">
        <span className="relative block w-full h-full animate-[starburstspin_6s_linear_infinite]">
          {rays.map((r) => (
            <span
              key={r.a}
              className="absolute rounded-full"
              style={{
                left: "50%",
                top: "50%",
                width: 2.5,
                marginLeft: -1.25,
                height: r.h,
                marginTop: -r.h,
                background: "linear-gradient(to top, rgba(217,119,87,0.95), rgba(217,119,87,0.2))",
                transformOrigin: "50% 100%",
                transform: `rotate(${r.a}deg)`,
              }}
            />
          ))}
        </span>
      </span>
    </>
  );
}

// --- 浅色古风 SVG 图表（与小程序 Canvas 同款视觉，修复网页端图表丢失） ---
function ChartSvg({ spec }: { spec: any }) {
  if (!spec || !Array.isArray(spec.series)) return null;
  const W = 520;
  const H = 300;
  const padL = 44, padR = 14, padT = spec.title ? 58 : 42, padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const series = (spec.series || [])
    .map((s: any) => (s && Array.isArray(s.values) ? { ...s, values: s.values.filter((v: any) => typeof v === "number" && Number.isFinite(v)) } : null))
    .filter((s: any) => s && s.values.length > 0);
  if (!series.length) return null;
  const colors = ["#5b7a8c", "#c9a34c", "#8ba678", "#b0543f", "#7a8fb8", "#a8825f"];
  const colorOf = (si: number) => (/^#[0-9a-fA-F]{6}$/.test(spec.colors?.[si] || "") ? spec.colors[si] : colors[si % colors.length]);
  const all: number[] = [];
  series.forEach((s: any) => { all.push(...s.values); });
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.08;
  min -= pad; max += pad;
  const n = Math.max(...series.map((s: any) => s.values.length));
  const xAt = (i: number) => (n === 1 ? padL + plotW / 2 : padL + (plotW * i) / (n - 1));
  const yAt = (v: number) => padT + plotH - ((v - min) / (max - min)) * plotH;
  const fmt = (v: number) => {
    const a = Math.abs(v);
    if (a >= 10000) return String(Math.round(v));
    if (a >= 1) return String(Math.round(v * 10) / 10);
    return String(Math.round(v * 100) / 100);
  };
  const ell = (s: unknown, m: number) => (String(s || "").length > m ? String(s).slice(0, m) + "…" : String(s || ""));
  const labelStep = plotW / n >= 48 ? 1 : Math.max(1, Math.ceil((n * 48) / plotW));
  let legendX = padL;
  const legendY = spec.title ? 40 : 24;
  return (
    <div className="w-full my-1 rounded-xl bg-[#fbf8f1] border border-[#3b3024]/10 p-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label={spec.title || "图表"}>
        {Array.from({ length: 6 }, (_, t) => {
          const v = min + ((max - min) * t) / 5;
          const y = yAt(v);
          return (
            <g key={`g${t}`}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e8e2d5" strokeDasharray="4 4" />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={10} fill="#8a7f6d">{fmt(v)}</text>
            </g>
          );
        })}
        {Array.from({ length: n }, (_, i) =>
          i % labelStep === 0 ? (
            <text key={`x${i}`} x={xAt(i)} y={H - 10} textAnchor="middle" fontSize={10} fill="#8a7f6d">{ell((spec.labels || [])[i], 10)}</text>
          ) : null
        )}
        {series.map((s: any, si: number) => {
          const name = ell(s.name || `序列${si + 1}`, 6);
          const item = (
            <g key={`l${si}`} transform={`translate(${legendX}, ${legendY})`}>
              <rect width={14} height={4} rx={2} fill={colorOf(si)} />
              <text x={18} y={4} fontSize={10} fill="#4a4438">{name}</text>
            </g>
          );
          // 固定步进 + 短名截断：多序列图例不再因宽度估算溢出被裁
          legendX += 96;
          return item;
        })}
        {series.map((s: any, si: number) => {
          const c = colorOf(si);
          if (spec.type === "bar") {
            const groupW = n === 1 ? plotW * 0.4 : (plotW / n) * 0.7;
            const barW = groupW / series.length;
            const baseline = Math.min(Math.max(0, min), max);
            const bY = yAt(baseline);
            return (
              <g key={`b${si}`} fill={c} fillOpacity={0.92}>
                {s.values.map((v: number, i: number) => {
                  const x = xAt(i) - groupW / 2 + barW * si + barW * 0.1;
                  const top = Math.min(yAt(v), bY);
                  const h = Math.max(2, Math.abs(yAt(v) - bY));
                  return <rect key={`b${si}-${i}`} x={x} y={top} width={barW * 0.8} height={h} rx={3} />;
                })}
              </g>
            );
          }
          const pts = s.values.map((v: number, i: number) => `${xAt(i)},${yAt(v)}`).join(" ");
          return (
            <g key={`p${si}`}>
              <polyline points={pts} fill="none" stroke={c} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v: number, i: number) => (
                <circle key={`p${si}-${i}`} cx={xAt(i)} cy={yAt(v)} r={3} fill={c} />
              ))}
            </g>
          );
        })}
        {spec.title && <text x={W / 2} y={26} textAnchor="middle" fontSize={15} fontWeight="bold" fill="#2f3a3f">{ell(spec.title, 20)}</text>}
      </svg>
    </div>
  );
}

// --- 实时进度气泡（agent_progress 状态机驱动；秒表 + 伪进度爬升，画面永远在动） ---
/** 集市频道（小程序 market CHANNELS 同款） */
const MARKET_CHANNELS = [
  { key: "jtk_hongbao", label: "外卖红包", sub: "美团·饿了么", kind: "jtk" },
  { key: "jtk_travel", label: "出行酒店", sub: "打车·酒店", kind: "jtk" },
  { key: "jtk_deal", label: "电商捡漏", sub: "淘宝·京东·拼多多", kind: "jtk" },
  { key: "guess", label: "猜你喜欢", sub: "京东精选", kind: "feed" },
  { key: "bigcoupon", label: "大额券", sub: "京东精选", kind: "feed" },
  { key: "nine9", label: "9.9包邮", sub: "京东精选", kind: "feed" },
  { key: "pdd_subsidy", label: "百亿补贴", sub: "拼多多", kind: "feed" },
  { key: "pdd_seckill", label: "秒杀", sub: "拼多多", kind: "feed" },
];

const fmtYuanWeb = (n: number): string => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return v >= 100 ? String(Math.round(v)) : String(Math.round(v * 100) / 100);
};

/** 图片快捷指令（小程序 imageQuickActions 同款） */
const IMAGE_QUICK_ACTIONS = [
  { icon: "识", label: "这是什么？", command: "这是什么？请识别图片中的主要内容。" },
  { icon: "文", label: "提取文字", command: "请提取图片中的文字。" },
  { icon: "物", label: "识别植物/动物", command: "请识别图片中的植物或动物，并给出候选和判定依据。" },
  { icon: "译", label: "翻译图中文字", command: "请翻译图片中的文字。" },
  { icon: "总", label: "总结图片", command: "请总结这张图片的内容。" },
];

/** 图文混排 blocks 渲染（小程序 buildMessageSegments 同款规则）：
 *  有结构化 blocks 就严格按顺序渲染（text→富文本 / image→图片），
 *  表格与图表标记由 RichMessageRenderer 内部处理。 */
function MessageBlocks({ blocks }: { blocks: any[] }) {
  return (
    <div className="space-y-1.5">
      {blocks.map((b: any, i: number) => {
        if (b && b.type === "image" && b.url) {
          return (
            <img key={i} src={b.url} alt="" className="max-w-full rounded border border-[#e3dcce] object-contain bg-[#f4f1ea]" style={{ maxHeight: 240 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          );
        }
        const text = (b && (b.text ?? b.content)) || "";
        if (!text) return null;
        return <div key={i} className="text-[11px] text-[#4a4438] leading-relaxed break-words whitespace-pre-wrap"><RichMessageRenderer content={text} /></div>;
      })}
    </div>
  );
}

function LiveProgressBubble({ ps, onFallback }: { ps: NonNullable<import("../context/CommanderContext").ChatMessage["progressState"]>; onFallback?: () => void }) {
  const [, setTick] = useState(0);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      // 性能：最后事件超过 60s（已归档/停滞）即停止秒表，避免长期 1Hz 重渲染
      if (Date.now() - ps.lastUpdateAt > 60000) { clearInterval(t); return; }
      setTick((x) => x + 1);
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = Date.now();
  const elapsedSec = Math.max(0, Math.floor((now - ps.startedAt) / 1000));
  const steps = ps.steps || [];
  const doneCount = steps.filter((s) => s.status === "SUCCESS" || s.status === "FAILED").length;
  const realPct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
  const idleSec = Math.max(0, (now - ps.lastUpdateAt) / 1000);
  const creep = Math.max(0, Math.min(2 * Math.floor(idleSec / 5), 90 - Math.min(realPct, 90)));
  const pct = Math.min(90, Math.max(realPct + creep, steps.length ? 2 : 0));
  const active = steps.find((s) => s.id === ps.activeStepId || s.status === "RUNNING");

  // 状态行文案：与小程序 index.js buildPsDisplay 逐字一致
  let statusLine = "";
  if (ps.phase === "synthesize") statusLine = "正在整理回复…";
  else if (ps.phase === "understanding" && steps.length === 0) statusLine = "正在理解你的指令…";
  else if (active) statusLine = active.desc;
  else if (steps.length > 0) statusLine = "正在推进…";
  else statusLine = "正在理解你的指令…";

  const stalled = idleSec > 30 && ps.phase !== "synthesize";
  const mm = Math.floor(elapsedSec / 60);
  const ss = String(elapsedSec % 60).padStart(2, "0");

  // 分段（与小程序一致：done 墨青 / failed 红 / active 墨青流动 / pending 淡墨青）
  const segClass = (s: any) =>
    s.status === "SUCCESS"
      ? "seg-done"
      : s.status === "FAILED"
      ? "seg-failed"
      : s.active
      ? "seg-active"
      : "seg-pending";
  const markClass = (s: any) =>
    s.status === "SUCCESS"
      ? "mark-done"
      : s.status === "FAILED"
      ? "mark-failed"
      : s.active
      ? "mark-running"
      : "mark-pending";
  const markChar = (s: any) =>
    s.status === "SUCCESS" ? "✓" : s.status === "FAILED" ? "✗" : s.active ? "⟳" : "○";

  return (
    <div className="w-full select-none" style={{ marginTop: 7, paddingTop: 7, borderTop: "1px solid rgba(59,48,36,0.1)" }}>
      <style>{`
        @keyframes seg-flow { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes ind-slide { 0% { left: -40%; } 100% { left: 100%; } }
        @keyframes radar-expand {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.85; }
          100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
        }
      `}</style>

      {/* 状态行（小程序 ps-status-row：雷达脉冲 + 状态文案 + 秒表） */}
      <div className="flex items-center" style={{ gap: 5, marginBottom: 5 }}>
        <div className="radar-pulse" style={{ position: "relative", width: 16, height: 16, flexShrink: 0 }}>
          {[0, 0.6, 1.2].map((d, i) => (
            <span
              key={i}
              className="radar-ring"
              style={{
                position: "absolute", left: "50%", top: "50%", width: 11, height: 11,
                borderRadius: "50%", border: "1px solid #5b7a8c", opacity: 0,
                animation: `radar-expand 1.8s ease-out infinite`, animationDelay: `${d}s`,
              }}
            />
          ))}
          <span style={{ position: "absolute", left: "50%", top: "50%", width: 4, height: 4, borderRadius: "50%", background: "#5b7a8c", transform: "translate(-50%,-50%)" }} />
        </div>
        <span className="flex-1 min-w-0 truncate" style={{ fontSize: 12, color: "#4a6a7c", fontWeight: "bold" }}>{statusLine}</span>
        <span style={{ fontSize: 10, color: "#9aa3a8", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>⏱ {mm}:{ss}</span>
        {typeof ps.tokensUsed === "number" && (
          <span style={{ fontSize: 10, color: "#9aa3a8", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
            🜁 {ps.tokensUsed.toLocaleString()} tokens
          </span>
        )}
      </div>

      {/* 分段进度条（ps-bar：高 5px、3px 间距、圆角；有步骤分段，无步骤整条流动） */}
      {steps.length > 0 ? (
        <div className="flex" style={{ gap: 3, height: 5, marginBottom: 4 }}>
          {steps.map((s) => (
            <div
              key={s.id}
              style={{ width: `${100 / steps.length}%` }}
              className={`h-full rounded-full ${segClass({ ...s, active: s.id === ps.activeStepId || s.status === "RUNNING" })}`}
            />
          ))}
        </div>
      ) : (
        <div style={{ position: "relative", height: 5, marginBottom: 4, background: "rgba(91,122,140,0.12)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{
            position: "absolute", top: 0, bottom: 0, width: "40%", borderRadius: 999,
            background: "linear-gradient(90deg, rgba(91,122,140,0.25), rgba(91,122,140,0.85), rgba(91,122,140,0.25))",
            animation: "ind-slide 1.6s ease-in-out infinite",
          }} />
        </div>
      )}

      {/* 元信息行（ps-meta-row：pct + 停滞提示 + 展开/收起） */}
      <div className="flex items-center" style={{ gap: 6 }}>
        <span style={{ fontSize: 10, color: "#9aa3a8" }}>{pct}%</span>
        {stalled && (
          <>
            <span style={{ fontSize: 10, color: "#d97706" }}>仍在推进中…</span>
            {onFallback && (
              <button
                type="button"
                onClick={onFallback}
                className="cursor-pointer"
                style={{ fontSize: 10, color: "#9e2a2b", background: "rgba(158,42,43,0.08)", border: "1px solid rgba(158,42,43,0.3)", borderRadius: 4, padding: "1px 6px" }}
              >
                ⚡ 强制备选方案
              </button>
            )}
          </>
        )}
        {steps.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="cursor-pointer"
            style={{ fontSize: 10, color: "#5b7a8c", marginLeft: "auto", padding: "2px 4px" }}
          >
            {expanded ? "收起步骤" : `展开 ${steps.length} 个步骤`}
          </button>
        )}
      </div>

      {/* 步骤列表（ps-steps：✓墨青 ✗红 ⟳朱砂 ○淡灰 + 描述 + 耗时） */}
      {expanded && steps.length > 0 && (
        <div style={{ marginTop: 4 }}>
          {steps.map((s) => (
            <div key={s.id} className="flex items-center" style={{ gap: 5, padding: "3px 0" }}>
              <span className={`text-center shrink-0 ${markClass({ ...s, active: s.id === ps.activeStepId || s.status === "RUNNING" })}`} style={{ width: 14, fontSize: 11 }}>
                {markChar({ ...s, active: s.id === ps.activeStepId || s.status === "RUNNING" })}
              </span>
              <span className="flex-1 min-w-0 truncate" style={{ fontSize: 11, color: "#2b2b2b" }}>{s.desc}</span>
              {s.durationMs != null && (
                <span style={{ fontSize: 10, color: "#9aa3a8", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                  {(s.durationMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 末尾详情（ps-detail） */}
      {ps.lastDetail && (
        <div style={{ fontSize: 10, color: "#7a8a93", marginTop: 3, wordBreak: "break-all" }}>↳ {ps.lastDetail}</div>
      )}

    </div>
  );
}

/** 渲染前安全清洗（review 发现：innerHTML 挡不住 onerror/onload 事件属性与 javascript: 协议）：
 *  1) 剥掉 script/iframe/object/embed；2) 剥掉所有 on* 事件属性；3) href/src 的 javascript: 协议置空。
 *  该渲染器覆盖 Agent 回复、群聊消息、论坛帖子全部渲染路径——一处清洗、全线生效。 */
function sanitizeRenderHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?(?:iframe|object|embed)[^>]*>/gi, "")
    .replace(/<([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g, (_m: string, tag: string, attrs: string, close: string) => {
      const cleaned = attrs
        .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        .replace(/(\s(?:href|src|xlink:href)\s*=\s*(?:"|')?)\s*javascript:[^"'\s>]*(?:"|')?/gi, '$1#"');
      return `<${tag}${cleaned}${close}>`;
    });
}

function RichMessageRenderer({ content }: { content: string }) {
  if (!content) return null;

  let html = content;

  // A. 单层反转义（与小程序端对齐）：双重转义内容保持转义态，防止还原成真实标签注入
  html = html.replace(/&(amp|lt|gt|quot|#0?39|apos);/gi, (_m: string, name: string): string => {
    switch (String(name).toLowerCase()) {
      case "amp": return "&";
      case "lt": return "<";
      case "gt": return ">";
      case "quot": return '"';
      default: return "'";
    }
  });

  // B0. 清理服务端位置标记：{{表格N}} / {{图表N}}
  //     （小程序端会把这些标记渲染成表格/图表，网页端没有对应渲染能力，
  //      留着就会原样显示成 {{图表1}} 这种字面量）
  html = html.replace(/\{\{\s*(?:表格|table|图表|chart)\s*[:：]?\s*\d*\s*\}\}/gi, "");

  // B. Clean up triple-backtick markdown blocks robustly
  html = html
    .replace(/```html/gi, "")
    .replace(/```xml/gi, "")
    .replace(/```/g, "");

  // C. Map <body> to <div> to retain its background, padding, and container styling without breaking browsers
  html = html.replace(/<body([^>]*)>/gi, (_: string, attrs: string): string => {
    let existingStyle = "";
    let styleMatch = attrs.match(/style=["']([^"']*)["']/i);
    if (styleMatch) {
      existingStyle = styleMatch[1].trim();
      if (existingStyle && !existingStyle.endsWith(";")) existingStyle += ";";
    }
    let cleanedAttrs = attrs.replace(/style=["']([^"']*)["']/gi, "");
    return `<div class="html-body-wrapper" style="border-radius: 8px; margin: 8px 0; overflow: hidden; ${existingStyle}" ${cleanedAttrs}>`;
  });
  html = html.replace(/<\/body>/gi, "</div>");

  // Clean up other wrapper tags that break browsers
  html = html
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // D. Upgraded Table styling with high-contrast text color if background is light-themed
  html = html.replace(/<table([^>]*)>/gi, (_: string, attrs: string): string => {
    let existingStyle = "";
    let styleMatch = attrs.match(/style=["']([^"']*)["']/i);
    if (styleMatch) {
      existingStyle = styleMatch[1].trim();
      if (existingStyle && !existingStyle.endsWith(";")) existingStyle += ";";
    }
    let cleanedAttrs = attrs.replace(/style=["']([^"']*)["']/gi, "");
    
    let isLight = false;
    if (existingStyle.match(/(background|background-color)\s*:\s*([^;]*)/i)) {
      const bgVal = RegExp.$2.toLowerCase();
      if (bgVal.includes("white") || bgVal.includes("#fff") || bgVal.includes("#fef") || bgVal.includes("#fdf") || bgVal.includes("rgba(255") || bgVal.includes("rgb(255")) {
        isLight = true;
      }
    }
    
    let defaultColor = isLight ? "color: #3b3024;" : "color: #c4b8a5;";
    let defaultBg = isLight ? "background-color: #2b2b2b;" : "background-color: #f4f1ea;";
    let defaultBorder = isLight ? "border: 1px solid rgba(100, 116, 139, 0.15);" : "border: 1px solid rgba(255, 255, 255, 0.08);";
    
    return `
      <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 10px 0; border-radius: 8px;">
        <table style="width: 100%; border-collapse: collapse; margin: 0; overflow: hidden; ${defaultBg} ${defaultBorder} ${defaultColor} ${existingStyle}" ${cleanedAttrs}>
    `;
  });

  html = html.replace(/<\/table>/gi, "</table></div>");

  // th word boundary replacement
  html = html.replace(/<th\b([^>]*)>/gi, (_: string, attrs: string): string => {
    let existingStyle = "";
    let styleMatch = attrs.match(/style=["']([^"']*)["']/i);
    if (styleMatch) {
      existingStyle = styleMatch[1].trim();
      if (existingStyle && !existingStyle.endsWith(";")) existingStyle += ";";
    }
    let cleanedAttrs = attrs.replace(/style=["']([^"']*)["']/gi, "");
    
    let headerColor = "";
    if (!existingStyle.includes("color")) {
      headerColor = "color: inherit;";
    }
    return `<th style="padding: 10px; font-weight: bold; font-family: monospace; font-size: 11px; text-align: left; border-bottom: 2px solid rgba(255, 255, 255, 0.1); ${headerColor} ${existingStyle}" ${cleanedAttrs}>`;
  });

  // td word boundary replacement
  html = html.replace(/<td\b([^>]*)>/gi, (_: string, attrs: string): string => {
    let existingStyle = "";
    let styleMatch = attrs.match(/style=["']([^"']*)["']/i);
    if (styleMatch) {
      existingStyle = styleMatch[1].trim();
      if (existingStyle && !existingStyle.endsWith(";")) existingStyle += ";";
    }
    let cleanedAttrs = attrs.replace(/style=["']([^"']*)["']/gi, "");
    
    let cellColor = "";
    if (!existingStyle.includes("color")) {
      cellColor = "color: inherit;";
    }
    return `<td style="padding: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); font-size: 11px; ${cellColor} ${existingStyle}" ${cleanedAttrs}>`;
  });

  // 0. 图片内联渲染：把图片地址渲染成真图（含平台相对路径 /api/uploads/x.jpg），不再显示裸地址
  {
    const base =
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
        ? window.location.origin
        : "http://localhost:3000";
    const resolve = (u: string): string => (/^\//.test(u) ? `${base}${u}` : u);
    // 0.1 Markdown 图片语法 ![alt](url)
    html = html.replace(
      /!\[([^\]]*)\]\(([^)\s]+)\)/g,
      (_m: string, alt: string, url: string): string => `<img src="${resolve(url)}" alt="${alt || "图"}" />`
    );
    // 0.2 暂存已有 <img>，避免被 0.3 二次替换
    const stash: string[] = [];
    html = html.replace(/<img\b[^>]*>/gi, (m: string): string => {
      stash.push(m);
      return `\u0000IMG${stash.length - 1}\u0000`;
    });
    // 0.3 裸图片地址（可被反引号或括号包裹）
    html = html.replace(
      /`?((?:https?:\/\/|\/)[^\s"'<>`]*?\.(?:png|jpe?g|gif|webp)(?:\?[^\s"'<>`]*)?)`?/gi,
      (_m: string, url: string): string => `<img src="${resolve(url)}" alt="图" />`
    );
    html = html.replace(/\u0000IMG(\d+)\u0000/g, (_m: string, i: string): string => stash[Number(i)] || "");
  }

  // 1. Markdowns: **bold** -> <strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#8a6d3b] font-bold font-sans">$1</strong>');
  
  // 2. Markdowns: `code` -> <code class="...">
  html = html.replace(/`(.*?)`/g, '<code class="bg-[#f4f1ea] text-[#6b7b3a] px-1 py-0.5 rounded font-mono text-[11px] border border-[#6b7b3a]/10">$1</code>');

  // 3. Custom tag: <badge color="cyan|amber|emerald|rose">text</badge>
  html = html.replace(/<badge\s+color="(\w+)"\s*>(.*?)<\/badge>/g, (_: string, color: string, text: string): string => {
    let classes = "";
    if (color === "cyan") classes = "bg-[#5b7a8c]/10 text-[#4a6a7c] border-[#5b7a8c]/30 shadow-[0_0_8px_rgba(91, 122, 140, 0.2)] animate-pulse";
    else if (color === "amber") classes = "bg-[#8a6d3b]/10 text-[#8a6d3b] border-[#8a6d3b]/30 shadow-[0_0_8px_rgba(184, 132, 79, 0.2)]";
    else if (color === "emerald") classes = "bg-[#6b7b3a]/10 text-[#6b7b3a] border-[#6b7b3a]/30";
    else if (color === "rose") classes = "bg-[#9e2a2b]/10 text-[#b0543f] border-[#9e2a2b]/30";
    else classes = "bg-[#8a7f6d]/10 text-[#6b6560] border-[#8a7f6d]/30";
    return `<span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border font-mono tracking-wider ${classes}">${text}</span>`;
  });

  // 4. Custom tag: <card type="info|success|warning|error" title="...">content</card>
  html = html.replace(/<card\s+type="(\w+)"\s+title="(.*?)"\s*>(.*?)<\/card>/gs, (_: string, type: string, title: string, body: string): string => {
    let border = "border-[#e3dcce]";
    let bg = "bg-[#fffcf6]/40";
    let titleColor = "text-[#4a4438]";
    let glow = "";
    if (type === "info") {
      border = "border-[#5b7a8c]/30";
      bg = "bg-[#f6f2ea]/10";
      titleColor = "text-[#4a6a7c]";
      glow = "shadow-[0_0_12px_rgba(91, 122, 140, 0.1)]";
    } else if (type === "success") {
      border = "border-[#6b7b3a]/30";
      bg = "bg-[#f2efe4]/10";
      titleColor = "text-[#6b7b3a]";
    } else if (type === "warning") {
      border = "border-[#8a6d3b]/30";
      bg = "bg-[#8a6d3b]/5";
      titleColor = "text-[#8a6d3b]";
      glow = "shadow-[0_0_12px_rgba(184, 132, 79, 0.1)]";
    } else if (type === "error") {
      border = "border-[#9e2a2b]/30";
      bg = "bg-[#f9ecea]/10";
      titleColor = "text-[#b0543f]";
    }
    return `
      <div class="my-3 p-3 border rounded-xl ${border} ${bg} ${glow} font-mono text-[11px] tracking-wide space-y-2">
        <div class="flex items-center space-x-1.5 border-b border-white/5 pb-1.5 font-bold uppercase tracking-widest ${titleColor}">
          <span>⚙️</span>
          <span>${title}</span>
        </div>
        <div class="leading-relaxed text-[#4a4438]">${body}</div>
      </div>
    `;
  });

  // 5. Convert generic newlines into <br/> unless it contains structured HTML layouts
  if (html.indexOf("<div") === -1 && html.indexOf("<p") === -1 && html.indexOf("<table") === -1) {
    html = html.split('\n').join('<br/>');
  }

  return (
    <>
      <style>{`
        .rich-message-container img {
          border: 1px solid rgba(184, 132, 79, 0.4);
          border-radius: 8px;
          margin: 8px 0;
          max-width: 100%;
          box-shadow: 0 0 12px rgba(184, 132, 79, 0.15);
          transition: transform 0.3s ease;
        }
        .rich-message-container img:hover {
          transform: scale(1.02);
        }
        .rich-message-container video {
          border: 1px solid rgba(91, 122, 140, 0.4);
          border-radius: 8px;
          margin: 8px 0;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 0 12px rgba(91, 122, 140, 0.15);
        }
        .rich-message-container table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
          background: rgba(11, 15, 25, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          overflow: hidden;
        }
        .rich-message-container th {
          background: rgba(91, 122, 140, 0.12);
          border-bottom: 1px solid rgba(91, 122, 140, 0.25);
          padding: 6px 8px;
          color: #4a6a7c;
          font-weight: bold;
          font-family: monospace;
          text-align: left;
          font-size: 11px;
        }
        .rich-message-container td {
          padding: 6px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          color: #c4b8a5;
          font-size: 11px;
        }
        .rich-message-container blockquote {
          border-left: 3px solid #8a6d3b;
          background: rgba(184, 132, 79, 0.05);
          padding: 6px 12px;
          margin: 8px 0;
          border-radius: 4px;
          color: #c4b8a5;
        }
      `}</style>
      <div 
        className="rich-message-container w-full break-words selection:bg-[#5b7a8c] selection:text-[#2b2b2b] leading-relaxed space-y-1.5 text-xs text-[#4a4438]"
        dangerouslySetInnerHTML={{ __html: sanitizeRenderHtml(html) }}
      />
    </>
  );
}


export { ImaginingStarburst, ChartSvg, MessageBlocks, LiveProgressBubble, RichMessageRenderer, sanitizeRenderHtml, MARKET_CHANNELS, IMAGE_QUICK_ACTIONS, fmtYuanWeb };
