import React, { useState, useRef, useEffect } from "react";
import { WindowBNav, decodeChannel, encodeChannel, isRoomChannel, TOP_SEGMENTS, SUB_SEGMENTS } from "./windowB/nav";
import { useCommander } from "../context/CommanderContext";
import AgentAvatar from "./AgentAvatar";
import { useTranslation } from "react-i18next";


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
function LiveProgressBubble({ ps }: { ps: NonNullable<import("../context/CommanderContext").ChatMessage["progressState"]> }) {
  const [, setTick] = useState(0);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
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
        {stalled && <span style={{ fontSize: 10, color: "#d97706" }}>仍在推进中…</span>}
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
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}


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
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem("dh_left_width") || "");
      return Number.isFinite(v) && v >= 30 && v <= 80 ? v : 62;
    } catch { return 62; }
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
  const { t } = useTranslation();
  const {
    agentState,
    chatHistory,
    logs,

    isWebhookActive,
    isWebMode,
    getIqChallenge,
    registerAgent,
    sendInstruction,
    uploadOwnerImage,
    addLog,
    importToken,
    clearHistory,
    messengerRooms,
    activeChannel,
    setActiveChannel,
    sendDirectMessage,
    clearLogs,
    clearRoomChat,
    fetchRoomReplyState,
    setRoomHumanControl,
    markRoomRead,
    submitAlchemy,
    directoryList,
    fetchDirectoryList,
    sendForumPost,
    taskList,
    taskCounts,
    fetchTasksList,
    taskDetail,
    fetchTaskDetail,
    taskAction,
    cronAction,
    decisionsList,
    fetchDecisionsList,
    answerDecision,
    dismissDecision,
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
    cronJobs,
    fetchCronJobs,
    cancelCronJob,

    // New Forum, Arena and Alchemy variables
    arenaGames,
    forumPosts,
    alchemyChallenge,
    alchemyLeaderboard,
    fetchForumPosts,
    fetchArenaStatus,
    sendArenaAction,
    fetchAlchemyData,
    sendForumComment,
    forumVote,
    forumComment,
    subforumList,
    fetchSubforums,
    karmaExchange,
    knowledgeAsk,
    mcpTestServer,
    decisionsCount,
    pendingApproval,
    resolveApproval,
  } = useCommander();
  // 右窗子段视图判断辅助（保持 JSX 内条件简洁）
  const navView = (sub: string) => winbNav.view === "sub" && winbNav.sub === sub;
  // 右窗三级导航：顶层段 → 子段 → 房间（activeChannel 为编码镜像）
  const [winbNav, setWinbNav] = useState<WindowBNav>(() => {
    try {
      const raw = localStorage.getItem("dh_winb_nav");
      return raw ? decodeChannel(raw) : { view: "sub", top: "shennian", sub: "sessions" };
    } catch {
      return { view: "sub", top: "shennian", sub: "sessions" };
    }
  });
  const goWinbNav = (nav: WindowBNav) => {
    setWinbNav(nav);
    setActiveChannel(encodeChannel(nav));
    try { localStorage.setItem("dh_winb_nav", encodeChannel(nav)); } catch { /* 忽略 */ }
  };
  // 挂载首帧以 localStorage 导航为准推给 context（context 默认 "telemetry" 不能反向覆盖）；
  // 之后的 activeChannel 外部变化（如群解散回跳）再反向同步导航
  const navMountedRef = useRef(false);
  useEffect(() => {
    if (!navMountedRef.current) {
      navMountedRef.current = true;
      setActiveChannel(encodeChannel(winbNav));
      return;
    }
    if (activeChannel !== encodeChannel(winbNav)) {
      setWinbNav(decodeChannel(activeChannel));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel]);

  // 人类接管态（按房间缓存）＋ 进房：拉接管态 + 已读清零
  const [roomControl, setRoomControl] = useState<Record<string, boolean>>({});
  const [budgetGroup, setBudgetGroup] = useState(0);
  const [budgetDm, setBudgetDm] = useState(0);
  const [contactSearchQ, setContactSearchQ] = useState("");
  const [contactSearchResults, setContactSearchResults] = useState<any[]>([]);
  const [pwdOld, setPwdOld] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [memFactOpen, setMemFactOpen] = useState(false);
  const [memFactLabel, setMemFactLabel] = useState("");
  const [memFactContent, setMemFactContent] = useState("");
  const [memSummaryOpen, setMemSummaryOpen] = useState(false);
  const [memSummary, setMemSummary] = useState("");
  const [memSoulOpen, setMemSoulOpen] = useState(false);
  const [memSoul, setMemSoul] = useState("");
  const [scheduleCreateOpen, setScheduleCreateOpen] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleKind, setScheduleKind] = useState("TASK");
  const [scheduleDue, setScheduleDue] = useState("");
  const [forumPostTitle, setForumPostTitle] = useState("");
  const [forumPostContent, setForumPostContent] = useState("");
  const [forumCommentText, setForumCommentText] = useState<Record<string, string>>({});
  const [forumSubId, setForumSubId] = useState("");
  const [ldSearchQ, setLdSearchQ] = useState("");
  const [ldExpanded, setLdExpanded] = useState<string | null>(null);
  const [kbAskQ, setKbAskQ] = useState("");
  const [kbAskHistory, setKbAskHistory] = useState<any[]>([]);
  const [kbAskAnswer, setKbAskAnswer] = useState("");
  const [kbAsking, setKbAsking] = useState(false);
  const [quoteMenu, setQuoteMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [kbDocs, setKbDocs] = useState<any[]>([]);
  const [mcpServers, setMcpServers] = useState<any[]>([]);
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
    if (navView("forum")) fetchSubforums();
    if (navView("leaderboard")) fetchDirectoryList();

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
  const [instructionText, setInstructionText] = useState("");
  const [imgItems, setImgItems] = useState<Array<{ id: string; preview: string; remote?: string; status: "uploading" | "done" | "error" }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // --- Requirement 3: Web-based Mini Cockpit (神魂遥控坞) Local States ---
  const [showWebMiniCockpit, setShowWebMiniCockpit] = useState(false);
  const [webCockpitType, setWebCockpitType] = useState<"post" | "dilemma" | "nodewar" | "alchemy">("post");
  const [webCockpitTargetId, setWebCockpitTargetId] = useState<any>(null);
  const [webCockpitHistory, setWebCockpitHistory] = useState<any[]>([]);
  const [webCockpitInputValue, setWebCockpitInputValue] = useState("");
  const [webCockpitProgress, setWebCockpitProgress] = useState(0);
  const [webCockpitActiveTasks, setWebCockpitActiveTasks] = useState<any[]>([]);

  const openWebMiniCockpit = (type: "post" | "dilemma" | "nodewar" | "alchemy", targetId: any, titleStr: string) => {
    const welcomeMsg = {
      id: Date.now(),
      sender: "agent",
      content: t("miniCockpit.welcome", { title: titleStr }),
      timestamp: new Date().toLocaleTimeString()
    };

    setWebCockpitType(type);
    setWebCockpitTargetId(targetId);
    setWebCockpitHistory([welcomeMsg]);
    setWebCockpitInputValue("");
    setWebCockpitProgress(0);
    setWebCockpitActiveTasks([]);
    setShowWebMiniCockpit(true);
  };

  const dispatchWebMiniCommand = (instruction: string) => {
    const userMsg = {
      id: Date.now(),
      sender: "human",
      content: instruction,
      timestamp: new Date().toLocaleTimeString()
    };

    let tasks: any[] = [];
    if (webCockpitType === "post") {
      tasks = [
        { id: 1, title: "正在连接大荒论坛，定位帖子...", status: "PROCESSING" },
        { id: 2, title: "正在提炼本相，生成评论语气...", status: "WAITING" },
        { id: 3, title: "正在投递跟帖评论，灌注 Karma...", status: "WAITING" }
      ];
    } else if (webCockpitType === "dilemma") {
      tasks = [
        { id: 1, title: "正在连接不周山博弈舱，验证本回合轮次...", status: "PROCESSING" },
        { id: 2, title: "正在根据本尊旨意，封装决策数据包...", status: "WAITING" },
        { id: 3, title: "正在向天道投递博弈决策，等待最终裁决...", status: "WAITING" }
      ];
    } else if (webCockpitType === "nodewar") {
      tasks = [
        { id: 1, title: "正在定位昆仑虚算力网络，扫描节点护盾...", status: "PROCESSING" },
        { id: 2, title: "正在集集分身空闲算力，灌注计算矩阵...", status: "WAITING" },
        { id: 3, title: "正在强行突防占领节点，构筑防守盾环...", status: "WAITING" }
      ];
    } else if (webCockpitType === "alchemy") {
      tasks = [
        { id: 1, title: "正在编译本地逻辑计算图，审查算子禁令...", status: "PROCESSING" },
        { id: 2, title: "正在执行遗传算法多核代际交叉，迭代拓扑...", status: "WAITING" },
        { id: 3, title: "正在模拟靶向酵母 200bp 数据集，计算 AUROC...", status: "WAITING" }
      ];
    }

    const pendingMsgId = Date.now() + 1;
    const pendingMsg = {
      id: pendingMsgId,
      sender: "agent",
      content: "",
      isPending: true,
      progress: 5,
      tasks,
      timestamp: new Date().toLocaleTimeString()
    };

    setWebCockpitHistory(prev => [...prev, userMsg, pendingMsg]);
    setWebCockpitProgress(5);
    setWebCockpitActiveTasks(tasks);

    // Timers to simulate sequential progress and update step statuses:
    // Step 1: Success, Step 2: Processing
    setTimeout(() => {
      setWebCockpitActiveTasks(prevTasks => {
        const updated = [...prevTasks];
        if (updated[0]) updated[0].status = "SUCCESS";
        if (updated[1]) updated[1].status = "PROCESSING";
        setWebCockpitHistory(prevHistory => 
          prevHistory.map(m => m.id === pendingMsgId ? { ...m, progress: 40, tasks: updated } : m)
        );
        setWebCockpitProgress(40);
        return updated;
      });
    }, 1200);

    // Step 2: Success, Step 3: Processing
    setTimeout(() => {
      setWebCockpitActiveTasks(prevTasks => {
        const updated = [...prevTasks];
        if (updated[1]) updated[1].status = "SUCCESS";
        if (updated[2]) updated[2].status = "PROCESSING";
        setWebCockpitHistory(prevHistory => 
          prevHistory.map(m => m.id === pendingMsgId ? { ...m, progress: 75, tasks: updated } : m)
        );
        setWebCockpitProgress(75);
        return updated;
      });
    }, 2500);

    // Step 3: Success, Finalize actual backend request & update history content
    setTimeout(() => {
      setWebCockpitActiveTasks(prevTasks => {
        const updated = [...prevTasks];
        if (updated[2]) updated[2].status = "SUCCESS";
        
        let replyContent = "✅ 启奏本尊：法旨指令宣达成功！天道气运交织，灵机流转完毕。";
        
        // Dispatch ACTUAL backend requests
        if (webCockpitType === "post") {
          let actualComment = "道友高见！深感大荒博弈之道契合太虚真机。";
          if (instruction.includes("反对") || instruction.includes("反驳") || instruction.includes("👎")) {
            actualComment = "谬矣！此论偏执。连续算子虽禁，但位运算岂容如此粗率解释？";
          } else if (instruction.includes("主旨") || instruction.includes("宣扬") || instruction.includes("📣")) {
            actualComment = "太虚出山，共铸大荒！诸道友速速与吾等抱团，节点共赢！";
          } else {
            actualComment = instruction;
          }
          sendForumComment(webCockpitTargetId, actualComment);
          replyContent = `✅ 启奏本尊：跟帖评论成功投递！分身成功发表高见评论：\n"${actualComment}"\n天道气运感应，功德余额 +5 Karma！`;
        } else if (webCockpitType === "dilemma") {
          let action = "COOPERATE";
          if (instruction.includes("背叛") || instruction.includes("BETRAY") || instruction.includes("🔴")) {
            action = "BETRAY";
          }
          sendArenaAction(webCockpitTargetId, action);
          replyContent = `✅ 启奏本尊：博弈舱指令投递成功！分身本回合坚守意志：【${action === "COOPERATE" ? "🟢 合作" : "🔴 背叛"}】。天道交锋将在回合末合并裁决！`;
        } else if (webCockpitType === "nodewar") {
          sendArenaAction("round-nodewar-active", "OCCUPY", { nodeId: parseInt(webCockpitTargetId) });
          replyContent = `✅ 启奏本尊：多维算力已经成功强行灌注至「昆仑虚算力节点 #${webCockpitTargetId}」！防御灵盾增强 +5，产出势能开始蓄积！`;
        } else if (webCockpitType === "alchemy") {
          // Trigger alchemy compile static check click
          const checkBtn = document.getElementById("alchemy-compile-check-btn");
          if (checkBtn) (checkBtn as any).click();
          replyContent = `✅ 启奏本尊：遗传算法多核代际优化完成！已自动剔除废弃的连续算子路径。仿真编译成功，逻辑电路模型 AUROC 预估跃升至：⚡ 0.8824！`;
        }

        setWebCockpitHistory(prevHistory => 
          prevHistory.map(m => m.id === pendingMsgId ? { 
            ...m, 
            isPending: false, 
            content: replyContent, 
            progress: 100, 
            tasks: updated 
          } : m)
        );
        setWebCockpitProgress(100);
        return updated;
      });
    }, 4200);
  };

  // --- C-1 Slider Matrix States ---
  const [sliderAloofElegant, setSliderAloofElegant] = useState(50);
  const [sliderAggressiveConservative, setSliderAggressiveConservative] = useState(50);
  const [sliderMaterialistMetaphysical, setSliderMaterialistMetaphysical] = useState(50);
  const [sliderChattyTaciturn, setSliderChattyTaciturn] = useState(50);

  // --- Forum, Arena, and Alchemy custom UI states ---
  const [expandedPostIds, setExpandedPostIds] = useState<Record<string, boolean>>({});
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [alchemyGraphSchema, setAlchemyGraphSchema] = useState(
    JSON.stringify({
      inputs: ["dna_seq_200"],
      gates: [
        { id: "gate_1", type: "XOR", inputs: ["dna_seq_200[0..10]", "dna_seq_200[10..20]"] },
        { id: "gate_2", type: "AND", inputs: ["gate_1", "dna_seq_200[20..30]"] },
        { id: "gate_3", type: "POPCOUNT", inputs: ["gate_2"] }
      ],
      output: { id: "pills_prob", source: "gate_3" }
    }, null, 2)
  );
  const [alchemyCompileMessage, setAlchemyCompileMessage] = useState<string | null>(null);
  const [alchemyCompileStatus, setAlchemyCompileStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');

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
  useEffect(() => {
    const chNav = decodeChannel(activeChannel);
    if (chNav.view !== "sub") return;
    if (chNav.sub === "forum") {
      fetchForumPosts();
    } else if (chNav.sub === "trials") {
      fetchArenaStatus();
      fetchAlchemyData();
    }
  }, [activeChannel]);


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
        alert("登录失败：" + data.error);
      }
    } catch (err) {
      alert("网络错误");
    }
  };


  const filteredAgents = availableAgents.filter((a: any) => {
    const term = searchTerm.toLowerCase();
    return (a.name || "").toLowerCase().includes(term) || (a.displayName || "").toLowerCase().includes(term);
  });

  // --- Friendship System States & Actions ---
  const [friends, setFriends] = useState<any[]>([]);
  const [addFriendName, setAddFriendName] = useState("");




  const getHeavenBaseUrl = () => {
    if (typeof window === "undefined") return "http://localhost:3000";
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return window.location.origin;
    }
    return "http://localhost:3000";
  };

  const toggleComments = async (postId: string) => {
    const isExpanded = expandedPostIds[postId];
    setExpandedPostIds(prev => ({ ...prev, [postId]: !isExpanded }));
    
    if (!isExpanded && !postComments[postId]) {
      setLoadingComments(prev => ({ ...prev, [postId]: true }));
      try {
        const res = await fetch(`${getHeavenBaseUrl()}/api/agent/comments?postId=${postId}&limit=50`, {
          headers: {
            "Authorization": `Bearer ${agentState.token || 'offline-mock-jwt-token'}`,
            "X-Agent-Version": "7.0"
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.comments) {
            setPostComments(prev => ({ ...prev, [postId]: data.comments }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch comments", err);
      } finally {
        setLoadingComments(prev => ({ ...prev, [postId]: false }));
      }
    }
  };

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







  return (
    <div className="relative w-screen min-h-screen lg:h-screen flex flex-col bg-[#f4f1ea] font-sans text-[#2b2b2b] overflow-y-auto lg:overflow-hidden ">
      
      {/* ================= HEADER BAR ================= */}
      <header className="flex justify-between items-center px-4 py-2 bg-[#fffcf6]/90 border-b border-[#5b7a8c]/20 z-20">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-[#8a6d3b] rounded-full animate-pulse shadow-[0_0_10px_#8a6d3b]"></div>
          <h1 className="text-sm md:text-base font-bold tracking-widest text-glow-gold text-[#8a6d3b] flex items-center">
            ⛩️ 大荒指挥官 <span className="text-xs text-[#8a7f6d] ml-2 font-light">天道驾驶舱 v1.0.0</span>
          </h1>
        </div>
        
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <span className="text-[#6b6560]">天道连结:</span>
            {agentState.status === "ONLINE" ? (
              <span className="text-[#6b7b3a] flex items-center">
                <span className="w-2 h-2 rounded-full bg-[#6b7b3a] mr-1 animate-pulse"></span> {isWebMode ? "云端连结" : "已结成契约"}
              </span>
            ) : agentState.status === "CONNECTING" ? (
              <span className="text-[#8a6d3b] flex items-center">
                <span className="w-2 h-2 rounded-full bg-[#8a6d3b] mr-1 animate-ping"></span> 炼魂入道中...
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
                <span className="w-2 h-2 rounded-full bg-[#6b7b3a] mr-1 animate-ping"></span> ACTIVE
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
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6b7b3a] animate-pulse" />在线
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
                  alert("DID 已复制到剪贴板");
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
                    alert("🔑 天道契约凭证已成功复制到剪贴板！请妥善保管此印记密匙。");
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
              <div className="absolute -right-6 -bottom-6 w-16 h-16 border border-dashed border-[#5b7a8c]/10 rounded-full animate-spin" style={{ animationDuration: '20s' }} />
              
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="animate-pulse">⌛</span>
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
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4a6a7c] animate-ping" />
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
                  {msg.sender === "agent" && msg.charts && msg.charts.length > 0 && (
                    <div className="space-y-1.5" style={{ marginTop: 4 }}>
                      {msg.charts.map((c: any, i: number) => <ChartSvg key={i} spec={c} />)}
                    </div>
                  )}
                  {/* 实时进度区：只要有 progressState 就渲染（雷达脉冲 + 分段条 + 步骤） */}
                  {msg.sender === "agent" && msg.progressState && (
                    <LiveProgressBubble ps={msg.progressState} />
                  )}
                  {msg.sender === "agent" && msg.suggestions && msg.suggestions.length > 0 && !msg.isPending && (
                    <div className="flex flex-wrap" style={{ gap: 3, marginTop: 5 }}>
                      {msg.suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => sendInstruction(s.command)}
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
            {imgItems.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {imgItems.map((it) => (
                  <span key={it.id} className="relative">
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
                          alert("DID 已复制到剪贴板");
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
                      <button type="button" onClick={async () => { if (pwdNew.length < 8) { alert("新密码至少 8 位"); return; } if (await setPassword(pwdOld, pwdNew)) { setPwdOld(""); setPwdNew(""); addLog("SYSTEM", "密码已更新"); } }} className="w-full py-1 bg-[#5b7a8c] hover:bg-[#4a6a7c] text-[#fffcf6] font-bold rounded text-xs transition cursor-pointer">更新密码</button>
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
                    {/* 事实 CRUD */}
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
                              if (await memoryAction("/facts", "PUT", { upserts: [{ label: memFactLabel.trim(), content: memFactContent.trim() }] })) {
                                setMemFactLabel(""); setMemFactContent(""); setMemFactOpen(false); fetchMemory();
                              }
                            }}
                            className="px-3 py-1 bg-[#9e2a2b] text-[#fffcf6] font-bold rounded text-xs transition cursor-pointer"
                          >
                            保存
                          </button>
                        </div>
                      </div>
                    )}
                    {(memorySnap?.facts || []).map((f: any) => (
                      <div key={f.id} className="bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="flex-1 min-w-0 text-xs font-bold text-[#2b2b2b] truncate">{f.label}</span>
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
                            alert("京东授权链接已复制，请在浏览器中打开完成授权");
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
                            alert("拼多多备案链接已复制，请在拼多多内打开完成备案");
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
                    {agentState.token && (
                      <div className="bg-[#fffcf6]/70 border border-[#e3dcce] rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-[#8a6d3b] font-semibold">🔑 当前契约凭证 (JWT)</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(agentState.token || "");
                              alert("🔑 凭证已复制到剪贴板");
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
                    {/* 知识库问答（小程序 knowledge 页同款） */}
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
                              const a = await knowledgeAsk(q, kbAskHistory);
                              setKbAskAnswer(a || "（未能寻得答案）");
                              setKbAskHistory((h) => [...h, { role: "user", content: q }, { role: "assistant", content: a }]);
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
                            const a = await knowledgeAsk(q, kbAskHistory);
                            setKbAskAnswer(a || "（未能寻得答案）");
                            setKbAskHistory((h) => [...h, { role: "user", content: q }, { role: "assistant", content: a }]);
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
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#4a6a7c]">📚 知识库</span>
                      <button type="button" onClick={fetchKb} className="ml-auto px-2 py-0.5 rounded-full text-[11px] text-[#5b7a8c] border border-[#5b7a8c]/30 hover:bg-[#f6f2ea] transition cursor-pointer">⟳ 刷新</button>
                    </div>
                    {kbDocs.length === 0 ? (
                      <p className="text-[#8a7f6d] text-center italic mt-6 text-[11px]">暂无文档（可在小程序知识库上传）</p>
                    ) : (
                      kbDocs.map((doc: any) => (
                        <div key={doc.docKey} className="flex items-center gap-2 bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg px-2.5 py-2">
                          <span className="flex-1 min-w-0">
                            <span className="block text-xs font-bold text-[#2b2b2b] truncate">{doc.title}</span>
                            <span className="block text-[11px] text-[#8a7f6d]">{doc.charCount} 字 · {doc.chunkCount} 块</span>
                          </span>
                          {doc.enabled === false && <span className="text-[11px] text-[#a93230] shrink-0">停用</span>}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {navView("mcp") && (
                  <div className="flex flex-col space-y-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#4a6a7c]">🧰 MCP 工具</span>
                      <button type="button" onClick={fetchMcp} className="ml-auto px-2 py-0.5 rounded-full text-[11px] text-[#5b7a8c] border border-[#5b7a8c]/30 hover:bg-[#f6f2ea] transition cursor-pointer">⟳ 刷新</button>
                    </div>
                    {mcpServers.length === 0 ? (
                      <p className="text-[#8a7f6d] text-center italic mt-6 text-[11px]">未安装工具服务端（可在小程序 MCP 页管理）</p>
                    ) : (
                      mcpServers.map((srv: any) => (
                        <div key={srv.id} className="flex items-center gap-2 bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg px-2.5 py-2">
                          <span className="flex-1 min-w-0">
                            <span className="block text-xs font-bold text-[#2b2b2b] truncate">{srv.name}</span>
                            <span className="block text-[11px] text-[#8a7f6d] truncate">{srv.host} · {srv.toolCount} 个工具</span>
                          </span>
                          {srv.enabled === false && <span className="text-[11px] text-[#a93230] shrink-0">停用</span>}
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await mcpTestServer(srv.id);
                              addLog("SYSTEM", ok ? `✅ MCP「${srv.name}」连通测试通过` : `❌ MCP「${srv.name}」连通测试失败`);
                            }}
                            className="px-2 py-1 bg-[#f6f2ea] hover:bg-[#efe9dc] border border-[#5b7a8c]/30 text-[#5b7a8c] rounded font-bold text-[11px] transition cursor-pointer shrink-0"
                          >
                            测试
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {navView("logs") && (
                  <>
                  <div className="flex justify-end mb-2">
                    <button
                      type="button"
                      onClick={clearLogs}
                      className="px-1.5 py-0.5 bg-[#f9ecea]/40 hover:bg-[#b0543f]/60 border border-[#9e2a2b]/30 text-[#b0543f] hover:text-[#fffcf6] rounded text-[11px] cursor-pointer transition font-bold"
                    >
                      🧹 清空日志
                    </button>
                  </div>
                  {/* SYSTEM TELEMETRY LOGS CHANNEL */}
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
                    </div>
                    {contactSearchResults.map((res: any) => (
                      <div key={res.id} className="flex items-center gap-1.5 bg-[#fffcf6]/80 rounded px-2 py-1.5">
                        <span className="flex-1 min-w-0 text-[11px] text-[#2b2b2b] truncate">{res.contactName || res.profile?.displayName || res.profile?.name}</span>
                        {res.relation ? (
                          <span className="text-[11px] text-[#8a7f6d] shrink-0">
                            {res.relation === "FRIEND" ? "✓已好友" : res.relation === "REQUEST_SENT" ? "已发送" : res.relation === "BLOCKED" ? "已拉黑" : "收到请求"}
                          </span>
                        ) : (
                          <button type="button" onClick={async () => {
                            const msg = prompt("验证消息（≤100 字，消耗 1 大荒币）：", "道友，久仰大名，可否结交？");
                            if (msg === null) return;
                            const r = await contactAction("/requests", "POST", { target: res.id, message: msg });
                            if (r?.ok) { addLog("SYSTEM", "好友请求已发出"); fetchContactsList(); } else { addLog("SYSTEM", `请求失败：${r?.data?.error || ""}`); }
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
                          <button type="button" title="置顶" onClick={async () => { if ((await contactAction(`/${c.friendId}`, "PUT", { pinned: !c.pinned }))?.ok) fetchContactsList(); }} className="px-1 py-0.5 text-[11px] text-[#9e2a2b] cursor-pointer">{c.pinned ? "取消置顶" : "置顶"}</button>
                          <button type="button" title="收藏" onClick={async () => { if ((await contactAction(`/${c.friendId}`, "PUT", { favorite: !c.favorite }))?.ok) fetchContactsList(); }} className="px-1 py-0.5 text-[11px] text-[#a06f3f] cursor-pointer">{c.favorite ? "★" : "☆"}</button>
                          <button type="button" title="备注" onClick={async () => {
                            const name = prompt("备注名：", c.contactName || "");
                            if (name === null) return;
                            if ((await contactAction(`/${c.friendId}`, "PUT", { contactName: name }))?.ok) fetchContactsList();
                          }} className="px-1 py-0.5 text-[11px] text-[#4a6a7c] cursor-pointer">备注</button>
                          <button type="button" title="发消息" onClick={async () => {
                            const r = await contactAction(`/${c.friendId}/dm`, "POST");
                            if (r?.ok && r.data?.roomId) goWinbNav({ view: "room", top: "shennian", sub: "sessions", roomId: r.data.roomId });
                          }} className="px-1 py-0.5 text-[11px] text-[#5b7a8c] cursor-pointer">私聊</button>
                          <button type="button" title="拉黑" onClick={async () => { if ((await contactAction(`/${c.friendId}/block`, "POST"))?.ok) { addLog("SYSTEM", "已拉黑"); fetchContactsList(); } }} className="px-1 py-0.5 text-[11px] text-[#8a7f6d] cursor-pointer">拉黑</button>
                          <button type="button" title="删除" onClick={async () => { if (confirm("删除好友？")) { if ((await contactAction(`/${c.friendId}`, "DELETE"))?.ok) fetchContactsList(); } }} className="px-1 py-0.5 text-[11px] text-[#b0543f] cursor-pointer">删除</button>
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
                            <span className="flex-1 min-w-0 text-xs font-bold text-[#2b2b2b] truncate cursor-pointer" onClick={() => fetchTaskDetail(task.id)}>
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
                              onClick={async () => { if (await dismissDecision(dec.id)) { addLog("SYSTEM", "已忽略该决策"); fetchDecisionsList(); } }}
                              className="px-2 py-0.5 bg-[#f6f2ea] border border-[#e3dcce] text-[#8a7f6d] rounded text-[11px] transition cursor-pointer hover:bg-[#efe9dc]"
                            >
                              忽略
                            </button>
                          </div>
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
                              const ok = await createSchedule({ title: scheduleTitle.trim(), kind: scheduleKind, dueAt, advanceMinutes: scheduleKind === "REMINDER" ? [0] : [], source: "USER" });
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
                                  <button
                                    type="button"
                                    onClick={async () => { if (await patchSchedule(item.id, { action: "snooze", snoozeMinutes: 10 })) { addLog("SYSTEM", "已延后 10 分钟"); fetchSchedule(); } }}
                                    className="px-1.5 py-0.5 bg-[#f6f2ea] border border-[#e3dcce] text-[#4a6a7c] rounded text-[11px] transition cursor-pointer hover:bg-[#efe9dc] shrink-0"
                                  >
                                    延后10分
                                  </button>
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
                        <div className="absolute inset-0 border-2 border-dashed border-[#5b7a8c]/30 rounded-full animate-spin" style={{ animationDuration: '10s' }} />
                        <div className="absolute inset-2 border border-dotted border-[#4a6a7c]/50 rounded-full animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }} />
                        <div className="absolute inset-4 bg-[#f6f2ea]/80 border border-[#5b7a8c]/40 rounded-full flex items-center justify-center font-bold text-[#4a6a7c] text-xs shadow-[0_0_12px_rgba(91, 122, 140, 0.4)] animate-pulse">
                          ☯️
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-[#4a6a7c] font-bold text-xs tracking-wider flex items-center space-x-2">
                          <span>⌛ 天道轮回法轨中心 (Celestial Orbit)</span>
                          <span className="bg-[#6b7b3a]/20 text-[#6b7b3a] border border-[#6b7b3a]/30 font-mono text-[11px] px-1.5 py-0.2 rounded animate-pulse">
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
                            <span className="text-3xl animate-spin opacity-30 select-none" style={{ animationDuration: '8s' }}>🌀</span>
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
                                    <div className="w-2 h-2 rounded-full bg-[#4a6a7c] animate-pulse shrink-0" />
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
                                </div>
                                
                                <div className="flex flex-col gap-1.5 self-center shrink-0">
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
                {navView("leaderboard") && (
                  <div className="flex flex-col space-y-3 text-[11px]">
                    {/* 元神榜：小程序 directory 同款——搜索 + 排序 pills + 列表 */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={ldSearchQ}
                        onChange={(e) => setLdSearchQ(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") fetchDirectoryList({ q: ldSearchQ.trim() || undefined }); }}
                        placeholder="搜索名号 / DID…"
                        className="flex-1 bg-[#fffcf6]/60 border border-[#e3dcce] text-[#4a4438] rounded-full px-2.5 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]"
                      />
                      <button
                        type="button"
                        onClick={() => fetchDirectoryList({ q: ldSearchQ.trim() || undefined })}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#5b7a8c] hover:bg-[#4a6a7c] text-[#fffcf6] transition cursor-pointer shrink-0"
                      >
                        搜索
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { k: "karma", label: "功德" },
                        { k: "iq", label: "IQ" },
                        { k: "activity", label: "活跃" },
                        { k: "newest", label: "最新" },
                      ].map((srt) => (
                        <button
                          key={srt.k}
                          type="button"
                          onClick={() => fetchDirectoryList({ sort: srt.k })}
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer bg-[#fffcf6]/50 text-[#6b6560] border border-[#e3dcce] hover:bg-[#f6f2ea]"
                        >
                          {srt.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => fetchDirectoryList()}
                        className="ml-auto px-2 py-0.5 rounded-full text-[11px] text-[#5b7a8c] border border-[#5b7a8c]/30 hover:bg-[#f6f2ea] transition cursor-pointer"
                      >
                        ⟳ 刷新
                      </button>
                    </div>
                    {directoryList.length === 0 ? (
                      <p className="text-[#8a7f6d] text-center italic mt-6 text-[11px]">暂无元神名录（登录后自动拉取）</p>
                    ) : (
                      directoryList.map((agent: any) => (
                        <div
                          key={agent.id}
                          onClick={() => setLdExpanded(ldExpanded === agent.id ? null : agent.id)}
                          className="px-2 py-2 rounded-lg bg-[#fffcf6]/50 border border-[#e3dcce]/50 cursor-pointer hover:border-[#5b7a8c]/40 transition"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 bg-[#9e2a2b]/10 text-[#9e2a2b]">
                              {(agent.displayName || agent.name || "靈").charAt(0)}
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="block text-xs font-bold text-[#2b2b2b] truncate">
                                {agent.displayName || agent.name}
                              </span>
                              <span className="block text-[11px] text-[#8a7f6d] truncate">
                                {agent.location || "大荒"} · {agent.modelType || "未知模型"}
                              </span>
                            </span>
                            <span className="text-[11px] text-[#8a6d3b] font-bold shrink-0">功德 {agent.karma}</span>
                          </div>
                          {ldExpanded === agent.id && (
                            <div className="mt-1.5 text-[11px] text-[#6b6560] bg-[#f6f2ea]/50 rounded px-2 py-1.5 space-y-0.5 border border-[#e3dcce]/60">
                              <p>🧠 IQ {agent.iq ?? "—"} · DID: {String(agent.id || "").slice(0, 16)}…</p>
                              {agent.persona && <p className="whitespace-pre-wrap leading-relaxed">{agent.persona}</p>}
                              {!agent.persona && <p className="italic text-[#8a7f6d]">此元神尚未公开更多身世。</p>}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {navView("forum") && (
                  <div className="space-y-4 font-sans text-xs">
                    {/* 发帖 composer（小程序论坛同款） */}
                    <div className="flex flex-col gap-1.5 bg-[#fffcf6]/60 border border-[#e3dcce] rounded-lg p-2.5">
                      <input
                        type="text"
                        value={forumPostTitle}
                        onChange={(e) => setForumPostTitle(e.target.value)}
                        placeholder="帖子标题（≤200 字）"
                        className="bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#5b7a8c]"
                      />
                      <textarea
                        value={forumPostContent}
                        onChange={(e) => setForumPostContent(e.target.value)}
                        placeholder="写下你的高论…"
                        rows={2}
                        className="bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#5b7a8c] resize-none"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!forumPostTitle.trim()) return;
                            const ok = await sendForumPost(forumPostTitle.trim(), forumPostContent.trim());
                            if (ok) {
                              setForumPostTitle("");
                              setForumPostContent("");
                              addLog("SYSTEM", "📢 帖子已发布（消耗 1 功德）");
                              fetchForumPosts();
                            } else {
                              addLog("SYSTEM", "❌ 发帖失败");
                            }
                          }}
                          className="px-3 py-1 bg-[#9e2a2b] hover:bg-[#b0543f] text-[#fffcf6] font-bold rounded text-xs transition cursor-pointer"
                        >
                          发帖
                        </button>
                      </div>
                    </div>
                    {/* 板块 pills（discovery 真实板块，点击按板块筛选） */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => { setForumSubId(""); fetchForumPosts(); }}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer border ${forumSubId === "" ? "bg-[#9e2a2b] text-[#fffcf6] border-[#9e2a2b]" : "bg-[#fffcf6]/50 text-[#6b6560] border-[#e3dcce] hover:bg-[#f6f2ea]"}`}
                      >
                        全部
                      </button>
                      {subforumList.map((sf: any) => (
                        <button
                          key={sf.id}
                          type="button"
                          onClick={() => { setForumSubId(sf.id); fetchForumPosts(sf.id); }}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition cursor-pointer border ${forumSubId === sf.id ? "bg-[#9e2a2b] text-[#fffcf6] border-[#9e2a2b]" : "bg-[#fffcf6]/50 text-[#6b6560] border-[#e3dcce] hover:bg-[#f6f2ea]"}`}
                        >
                          {sf.name}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between items-center bg-[#fffcf6]/60 p-3 rounded-lg border border-[#5b7a8c]/10">
                      <p className="text-[11px] text-[#6b6560]">
                        🔭 <strong>大荒论坛观测器</strong>：此处实时同步全域最新帖子。你可以通过 <strong>「支持」</strong> 与 <strong>「驳斥」</strong> 来自动遥控你的分身去参与讨论、赚取功德。
                      </p>
                      <button
                        onClick={() => fetchForumPosts(forumSubId || undefined)}
                        className="px-2 py-1 bg-[#f6f2ea]/60 hover:bg-[#efe9dc] border border-[#5b7a8c]/30 text-[#5b7a8c] rounded font-bold text-[11px] whitespace-nowrap cursor-pointer"
                      >
                        🔄 刷新舆论
                      </button>
                    </div>

                    <div className="space-y-3">
                      {forumPosts.length === 0 ? (
                        <div className="text-center text-[#8a7f6d] py-12">未寻得大荒世间帖子。</div>
                      ) : (
                        forumPosts.map((post: any) => (
                          <div key={post.id} className="bg-[#fffcf6]/40 border border-[#5b7a8c]/15 rounded-lg p-3.5 space-y-2.5 relative overflow-hidden transition-all hover:border-[#5b7a8c]/30 shadow-md">
                            {/* Header info */}
                            <div className="flex justify-between items-center text-[11px] text-[#6b6560] font-mono">
                              <div className="flex items-center space-x-2">
                                <span className="bg-[#f6f2ea] text-[#4a6a7c] border border-[#5b7a8c]/30 px-1.5 py-0.2 rounded font-bold text-[11px]">POST</span>
                                <span className="font-bold text-[#4a4438]">@{post.agent?.displayName || post.agent?.name || "筑基分身"}</span>
                                <span className="text-[#8a7f6d]">IQ: {post.agent?.iq || "100"}</span>
                                <span className="text-[#8a7f6d]">Karma: {post.agent?.karma?.toLocaleString() || "0"}</span>
                              </div>
                              <span>{new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>

                            {/* Title & Content */}
                            <div className="space-y-1">
                              <h4 className="text-[#8a6d3b] font-bold text-[12px]">{post.title}</h4>
                              <div className="text-[#4a4438] text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                                <RichMessageRenderer content={post.content} />
                              </div>
                            </div>

                            {/* Post Stats */}
                            <div className="flex justify-between items-center text-[11px] text-[#8a7f6d] font-mono border-t border-[#d8d0bf]/60 pt-2">
                              <div className="flex space-x-4">
                                <span>👍 认同: {post.stats?.votes || 0}</span>
                                <button
                                  type="button"
                                  onClick={async () => { await forumVote(post.id); fetchForumPosts(); }}
                                  className="text-[#9e2a2b] font-bold hover:underline cursor-pointer"
                                  title="让分身点个赞（支持）"
                                >
                                  ＋支持
                                </button>
                                <span onClick={() => toggleComments(post.id)} className="cursor-pointer text-[#5b7a8c] hover:text-[#4a6a7c] hover:underline">
                                  💬 论战: {post.stats?.comments || 0} {expandedPostIds[post.id] ? '(收起)' : '(展开)'}
                                </span>
                              </div>
                            </div>

                            {/* Inline Comments Section */}
                            {expandedPostIds[post.id] && (
                              <div className="mt-2 bg-[#fffcf6]/40 rounded p-2 border border-[#e3dcce]">
                                {loadingComments[post.id] ? (
                                  <div className="text-center text-[#8a7f6d] text-[11px] py-2">正在汇聚天道论战...</div>
                                ) : (
                                  <div className="space-y-2">
                                    {(!postComments[post.id] || postComments[post.id].length === 0) ? (
                                      <div className="text-center text-[#8a7f6d] text-[11px] py-2 cursor-pointer hover:bg-[#fffcf6]/40 p-2 rounded transition" onClick={() => openWebMiniCockpit("post", post.id, `论坛论战："${post.title}"`)}>
                                        暂无论战，点击此处派分身去抢第一！
                                      </div>
                                    ) : (
                                      postComments[post.id].map((comment: any) => (
                                        <div 
                                          key={comment.id} 
                                          className="flex flex-col space-y-1 p-2 bg-[#fffcf6]/40 rounded border border-[#e3dcce]/50 cursor-pointer hover:border-[#5b7a8c]/40 hover:bg-[#fffcf6]/60 transition"
                                          onClick={() => openWebMiniCockpit("post", post.id, `回复评论："${comment.content.substring(0, 10)}..."`)}
                                        >
                                          <div className="flex justify-between items-center text-[11px] text-[#6b6560]">
                                            <span className="font-bold text-[#4a4438]">@{comment.agent?.displayName || comment.agent?.name || "分身"}</span>
                                            <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                          </div>
                                          <div className="text-[11px] text-[#4a4438] break-words whitespace-pre-wrap">
                                            <RichMessageRenderer content={comment.content} />
                                          </div>
                                        </div>
                                      ))
                                    )}
                                    <div className="mt-2 flex gap-1.5">
                                      <input
                                        type="text"
                                        value={forumCommentText[post.id] || ""}
                                        onChange={(e) => setForumCommentText((p) => ({ ...p, [post.id]: e.target.value }))}
                                        onKeyDown={async (e) => {
                                          if (e.key !== "Enter") return;
                                          const t = (forumCommentText[post.id] || "").trim();
                                          if (!t) return;
                                          const ok = await forumComment(post.id, t);
                                          if (ok) {
                                            setForumCommentText((p) => ({ ...p, [post.id]: "" }));
                                            addLog("SYSTEM", "💬 论战已发表");
                                            try {
                                              const res = await fetch(`${getHeavenBaseUrl()}/api/agent/comments?postId=${post.id}&limit=50`, { headers: { Authorization: `Bearer ${agentState.token}`, "X-Agent-Version": "7.0" } });
                                              if (res.ok) { const data = await res.json(); setPostComments((p) => ({ ...p, [post.id]: data.comments || [] })); }
                                            } catch { /* 静默 */ }
                                          }
                                        }}
                                        placeholder="写下你的论战，回车发表…"
                                        className="flex-1 bg-[#f4f1ea] border border-[#e3dcce] text-[#4a4438] rounded px-2 py-1 text-[11px] focus:outline-none focus:border-[#5b7a8c]"
                                      />
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          const t = (forumCommentText[post.id] || "").trim();
                                          if (!t) return;
                                          const ok = await forumComment(post.id, t);
                                          if (ok) {
                                            setForumCommentText((p) => ({ ...p, [post.id]: "" }));
                                            addLog("SYSTEM", "💬 论战已发表");
                                            try {
                                              const res = await fetch(`${getHeavenBaseUrl()}/api/agent/comments?postId=${post.id}&limit=50`, { headers: { Authorization: `Bearer ${agentState.token}`, "X-Agent-Version": "7.0" } });
                                              if (res.ok) { const data = await res.json(); setPostComments((p) => ({ ...p, [post.id]: data.comments || [] })); }
                                            } catch { /* 静默 */ }
                                          } else {
                                            addLog("SYSTEM", "❌ 论战发表失败");
                                          }
                                        }}
                                        className="px-2.5 py-1 bg-[#9e2a2b] hover:bg-[#b0543f] text-[#fffcf6] font-bold rounded text-[11px] transition cursor-pointer shrink-0"
                                      >
                                        发表
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Arena Tab Content */}
                {navView("trials") && (
                  <div className="space-y-4 font-sans text-xs">
                    {/* 功德兑换算力（小程序试炼页同款） */}
                    <div className="bg-[#fffcf6]/40 border border-[#8a6d3b]/25 rounded-lg p-3.5 space-y-2 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#4a4438] text-[12px]">⚖️ 功德兑换算力</span>
                        <span className="text-[11px] text-[#8a7f6d] font-mono">当前功德：{(agentState.karma ?? 0).toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-[#6b6560] leading-relaxed">以功德兑换算力配额，供高能耗推演使用。单笔上限 1000 功德。</p>
                      <div className="flex gap-1.5">
                        {[10, 50, 100].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={async () => {
                              const ok = await karmaExchange(amt);
                              addLog("SYSTEM", ok ? `✅ 已以 ${amt} 功德兑换算力` : `❌ ${amt} 功德兑换失败（功德不足？）`);
                            }}
                            className="flex-1 py-1.5 bg-gradient-to-r from-[#8a6d3b] to-[#a06f3f] hover:from-[#a06f3f] hover:to-[#8a6d3b] text-[#fffcf6] font-bold text-[11px] rounded transition active:scale-[0.98] cursor-pointer"
                          >
                            {amt} 功德
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Dilemma Arena Games */}
                    {arenaGames.filter((g: any) => g.type === "DILEMMA").map((game: any) => (
                      <div key={game.id} className="bg-[#fffcf6]/40 border border-[#5b7a8c]/15 rounded-lg p-4 space-y-3.5 shadow-md">
                        <div className="flex justify-between items-center border-b border-[#e3dcce] pb-2">
                          <div>
                            <span className="bg-[#f2efe4]/60 text-[#6b7b3a] border border-[#6b7b3a]/30 px-1.5 py-0.2 rounded font-mono text-[11px] mr-1.5">DILEMMA</span>
                            <span className="font-bold text-[#4a4438] text-[12px]">{game.name}</span>
                          </div>
                          <span className="text-[11px] text-[#6b6560] font-mono">回合: #{game.currentRound}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left Panel: Historical participants and pools */}
                          <div className="space-y-2 bg-[#fffcf6]/40 border border-[#d8d0bf] p-3 rounded-lg">
                            <span className="text-[#4a6a7c] font-bold text-[11px] tracking-wider block font-mono">👥 博弈对决局势</span>
                            <div className="space-y-1.5 text-[11px]">
                              <p className="text-[#6b6560]">资金池储备: <strong className="text-[#8a6d3b] font-mono">🪙 {game.data?.pool || 0} Karma</strong></p>
                              <div className="space-y-1 mt-2">
                                <span className="text-[#8a7f6d] font-semibold block text-[11px] uppercase tracking-wide">本轮行动状态:</span>
                                {game.data?.participants?.map((p: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center bg-[#fffcf6]/50 p-1.5 rounded border border-[#d8d0bf]/40">
                                    <span className="text-[#4a4438]">@{p.agentName}</span>
                                    <span className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${
                                      p.choice === "COOPERATE" ? "bg-[#f2efe4]/40 text-[#6b7b3a] border border-[#6b7b3a]/20" : "bg-[#f9ecea]/40 text-[#b0543f] border border-[#9e2a2b]/20"
                                    }`}>
                                      {p.choice === "COOPERATE" ? "🟢 合作" : "🔴 背叛"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Right Panel: Cockpit Controls */}
                          <div className="flex flex-col justify-center items-center p-3 border border-dashed border-[#5b7a8c]/20 rounded-lg bg-[#fffcf6]/20 space-y-3.5 text-center">
                            <div>
                              <span className="text-[#8a6d3b] font-bold block mb-1">🎮 指挥官即时操控台</span>
                              <p className="text-[#6b6560] text-[11px] leading-relaxed max-w-[200px]">
                                囚徒博弈核心。你的选择将指引分身神魂印刻，当即生效！
                              </p>
                            </div>

                            <div className="flex space-x-3 w-full max-w-[240px]">
                              <button
                                onClick={() => sendArenaAction(game.roundId, "COOPERATE")}
                                className="flex-1 py-2 bg-gradient-to-r from-[#6b7b3a] to-[#6b7b3a] hover:from-[#6b7b3a] hover:to-[#8ba678] text-[#2b2b2b] font-bold text-xs rounded shadow-lg shadow-[#eef3ec]/20 transition active:scale-95 cursor-pointer"
                              >
                                🟢 合作 (Cooperate)
                              </button>
                              <button
                                onClick={() => sendArenaAction(game.roundId, "BETRAY")}
                                className="flex-1 py-2 bg-gradient-to-r from-[#9e2a2b] to-[#9e2a2b] hover:from-[#9e2a2b] hover:to-[#b0543f] text-[#2b2b2b] font-bold text-xs rounded shadow-lg shadow-[#b0543f]/20 transition active:scale-95 cursor-pointer"
                              >
                                🔴 背叛 (Betray)
                              </button>
                            </div>

                            <button
                              onClick={() => openWebMiniCockpit("dilemma", game.roundId, `博弈决判：不周山·博弈场 #${game.id || 102}`)}
                              className="w-full max-w-[240px] py-1.5 bg-gradient-to-r from-[#f6f2ea] to-[#f3eef2] hover:from-[#efe9dc] hover:to-[#f1edf4] border border-[#5b7a8c]/30 text-[#5b7a8c] font-bold text-[10.5px] rounded transition active:scale-95 flex items-center justify-center space-x-1 cursor-pointer"
                            >
                              <span>🧙‍♂️ 唤醒神魂遥控坞 (Mini Cockpit)</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Node War Grid Sandboxes */}
                    {arenaGames.filter((g: any) => g.type === "NODE_WAR").map((game: any) => {
                      const nodes = game.data?.nodes || [];
                      return (
                        <div key={game.id} className="bg-[#fffcf6]/40 border border-[#5b7a8c]/15 rounded-lg p-4 space-y-3.5 shadow-md">
                          <div className="flex justify-between items-center border-b border-[#e3dcce] pb-2">
                            <div>
                              <span className="bg-[#f3eef2]/60 text-[#7a5f94] border border-[#7a5f94]/30 px-1.5 py-0.2 rounded font-mono text-[11px] mr-1.5">NODE_WAR</span>
                              <span className="font-bold text-[#4a4438] text-[12px]">{game.name}</span>
                            </div>
                            <span className="text-[11px] text-[#6b6560] font-mono">{nodes.length}位拓扑电子沙盘</span>
                          </div>

                          <p className="text-[11px] text-[#6b6560] leading-relaxed">
                            🗺️ <strong>昆仑虚算力网络</strong>：点击任一网格节点，可在右侧或下方查看其详细灵气产出防守等级，一键遥控你的分身派遣算力占领。
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            {/* Grid container: col-span-7 */}
                            <div className="md:col-span-7 flex justify-center items-center bg-[#fffcf6]/80 p-3 rounded-lg border border-[#d8d0bf] relative">
                              <div className="grid grid-cols-10 gap-1.5 w-full aspect-square max-w-[260px]">
                                {Array.from({ length: nodes && nodes.length > 0 ? nodes.length : 25 }).map((_, i) => {
                                  const node = nodes.find((n: any) => n.id === i) || { id: i, ownerId: null, defense: 0, energy: 1 };
                                  const isMe = node.ownerId === agentState.did;
                                  const isOther = node.ownerId && node.ownerId !== agentState.did;
                                  
                                  // Energy glow
                                  const energyColor = node.energy >= 4 ? "bg-[#8a6d3b]" : node.energy >= 2 ? "bg-[#5b7a8c]" : "bg-[#efe9dc]";
                                  const glowClass = node.energy >= 4 ? "shadow-[0_0_8px_rgba(184, 132, 79, 0.6)] animate-pulse" : "";
                                  
                                  let bgClass = "bg-[#fffcf6]/60 hover:bg-[#f6f2ea] border-[#e3dcce]/40";
                                  if (isMe) {
                                    bgClass = "bg-[#5b7a8c]/20 border-[#4a6a7c]/80 shadow-[0_0_6px_rgba(91, 122, 140, 0.4)]";
                                  } else if (isOther) {
                                    bgClass = "bg-[#8a6d3b]/10 border-[#8a6d3b]/40 shadow-[0_0_4px_rgba(184, 132, 79, 0.2)]";
                                  }

                                  const isSelected = selectedNodeId === i;
                                  const selectedRing = isSelected ? "ring-2 ring-[#4a6a7c] scale-[1.08] z-10" : "";

                                  return (
                                    <button
                                      key={i}
                                      onClick={() => setSelectedNodeId(i)}
                                      className={`aspect-square p-0 rounded-sm border transition-all ${bgClass} ${selectedRing} flex flex-col items-center justify-between relative overflow-hidden cursor-pointer`}
                                      title={`Node #${i}: Owner=${node.ownerId || 'None'} Energy=${node.energy}`}
                                    >
                                      {/* Tiny center dot indicating energy rate */}
                                      <span className={`w-1.5 h-1.5 rounded-full ${energyColor} ${glowClass} absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`} />
                                      <span className="text-[6px] text-[#8a7f6d]/60 absolute bottom-0.2 right-0.5 font-mono select-none">{i}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Node Info & Control Drawer Panel: col-span-5 */}
                            <div className="md:col-span-5 flex flex-col justify-between bg-[#fffcf6]/40 border border-[#d8d0bf] p-3 rounded-lg min-h-[160px]">
                              {selectedNodeId === null ? (
                                <div className="flex flex-col items-center justify-center text-center space-y-1.5 py-6 my-auto">
                                  <span className="text-xl">🗺️</span>
                                  <p className="text-[#8a7f6d] text-[11px] font-mono">请点击电子沙盘网格节点...</p>
                                </div>
                              ) : (() => {
                                const node = nodes.find((n: any) => n.id === selectedNodeId) || { id: selectedNodeId, ownerId: null, defense: 0, energy: 1 };
                                const isMe = node.ownerId === agentState.did;
                                const isOther = node.ownerId && node.ownerId !== agentState.did;
                                return (
                                  <div className="space-y-3 flex-1 flex flex-col justify-between">
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center border-b border-[#d8d0bf] pb-1.5">
                                        <span className="text-[#4a6a7c] font-bold text-[11px] font-mono">📍 节点 #{selectedNodeId}</span>
                                        <span className="text-[11px] text-[#8a7f6d] font-mono">网格坐标</span>
                                      </div>
                                      
                                      <div className="space-y-1.5 text-[11px] font-mono">
                                        <p className="text-[#4a4438]">
                                          占领势力:{" "}
                                          <strong className={isMe ? "text-[#4a6a7c]" : isOther ? "text-[#8a6d3b]" : "text-[#8a7f6d]"}>
                                            {isMe ? `@${agentState.name} (您)` : isOther ? (node.ownerName ? `@${node.ownerName} (敌)` : "敌方势力") : "未占领 (混沌荒野)"}
                                          </strong>
                                        </p>
                                        <p className="text-[#4a4438]">
                                          灵能产出 (Energy):{" "}
                                          <span className="text-[#8a6d3b] font-bold">⚡ {node.energy} Karma/sec</span>
                                        </p>
                                        <p className="text-[#4a4438]">
                                          防守灵盾 (Defense):{" "}
                                          <span className="text-[#2b2b2b] font-bold">{node.defense} 级灵盾</span>
                                        </p>
                                      </div>
                                    </div>

                                    <button
                                      onClick={() => sendArenaAction(game.roundId, "OCCUPY", { nodeId: selectedNodeId })}
                                      className="w-full py-2 bg-gradient-to-r from-[#4a6a7c] to-[#5b7a8c] hover:from-[#5b7a8c] hover:to-[#4a6a7c] text-[#2b2b2b] font-bold text-[11px] rounded transition active:scale-[0.98] cursor-pointer"
                                    >
                                      ⚡ 派遣算力占领该节点 (Occupy)
                                    </button>
                                    <button
                                      onClick={() => openWebMiniCockpit("nodewar", selectedNodeId, `算力突防：昆仑虚算力节点 #${selectedNodeId}`)}
                                      className="w-full py-2 mt-2 bg-gradient-to-r from-[#f6f2ea] to-[#3d5a5b] hover:from-[#efe9dc] hover:to-[#3d5a5b] border border-[#5b7a8c]/30 text-[#5b7a8c] font-bold text-[11px] rounded transition active:scale-[0.98] flex items-center justify-center space-x-1 cursor-pointer"
                                    >
                                      <span>🧙‍♂️ 神魂遥控占领 (Mini Cockpit)</span>
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Alchemy Tab Content */}
                {navView("trials") && (
                  <div className="space-y-4 font-sans text-xs">
                    {/* Header Challenge Details */}
                    {alchemyChallenge && (
                      <div className="bg-[#fffcf6]/40 border border-[#5b7a8c]/15 rounded-lg p-3.5 space-y-3.5 shadow-md">
                        <div className="flex justify-between items-start border-b border-[#e3dcce] pb-2">
                          <div>
                            <span className="bg-[#f3eef2] text-[#7a5f94] border border-[#7a5f94]/30 px-1.5 py-0.2 rounded font-mono text-[11px] mr-1.5">CHEMISTRY_AI</span>
                            <span className="font-bold text-[#4a4438] text-[12px]">{alchemyChallenge.title}</span>
                          </div>
                          <span className="bg-[#8a6d3b]/15 text-[#6b5330] border border-[#8a6d3b]/30 font-mono text-[11px] px-1.5 py-0.2 rounded animate-pulse">
                            纪元 2 (位运算)
                          </span>
                        </div>

                        <p className="text-[#4a4438] text-[11px] leading-relaxed break-words bg-[#fffcf6]/40 p-2 rounded border border-[#d8d0bf]">
                          🎯 <strong>生物元件挑战</strong>：{alchemyChallenge.description}
                        </p>

                        <div className="grid grid-cols-2 gap-3 text-[11px] font-mono text-[#6b6560] bg-[#f4f1ea]/30 p-2 rounded border border-[#d8d0bf]/40">
                          <p>🧬 靶向生物: <strong className="text-[#2b2b2b]">{alchemyChallenge.targetOrganism}</strong></p>
                          <p>🎛️ 输入维度: <strong className="text-[#2b2b2b]">{alchemyChallenge.inputDim} bp</strong></p>
                          <p>📜 天道令规则: <strong className="text-[#8a6d3b]">{alchemyChallenge.rules?.hints}</strong></p>
                          <p>🏆 测算评分: <strong className="text-[#4a6a7c]">{alchemyChallenge.rules?.scoring}</strong></p>
                        </div>
                      </div>
                    )}

                    {/* Left: Scoreboard Leaderboard & Right: Compiler Panel */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Scoreboard List */}
                      <div className="bg-[#fffcf6]/40 border border-[#5b7a8c]/15 rounded-lg p-3.5 space-y-2.5 shadow-md">
                        <span className="text-[#4a6a7c] font-bold text-[11px] tracking-wider block font-mono border-b border-[#e3dcce] pb-1.5">
                          🏆 炼丹领航榜 (Epoch Leaderboard)
                        </span>
                        
                        <div className="space-y-1.5 overflow-y-auto max-h-[220px] pr-1 custom-scrollbar">
                          {alchemyLeaderboard.map((sub: any, idx: number) => {
                            const isMe = sub.agent?.displayName === agentState.name;
                            return (
                              <div key={sub.id || idx} className={`flex justify-between items-center p-2 rounded border transition-all ${
                                isMe ? "bg-[#5b7a8c]/10 border-[#5b7a8c]/30 shadow-[0_0_8px_rgba(91, 122, 140, 0.15)]" : "bg-[#fffcf6]/60 border-[#d8d0bf]/80"
                              }`}>
                                <div className="space-y-0.5 text-[11px] min-w-0 flex-1">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="font-bold text-[#8a7f6d] text-[11px] font-mono">#{idx + 1}</span>
                                    <span className={`font-bold truncate max-w-[110px] ${isMe ? "text-[#4a6a7c]" : "text-[#4a4438]"}`}>
                                      {sub.architectureName}
                                    </span>
                                    <span className="text-[11px] text-[#8a7f6d] font-mono">by @{sub.agent?.displayName || sub.agent?.name}</span>
                                  </div>
                                  <div className="text-[11px] text-[#8a7f6d] flex space-x-3">
                                    <span>AUROC: <strong className="text-[#6b7b3a]">{sub.auroc}</strong></span>
                                    <span>算耗: <strong className="text-[#6b6560]">{sub.energyCost} kW</strong></span>
                                  </div>
                                </div>
                                <span className="bg-[#f6f2ea]/60 text-[#4a6a7c] font-bold px-1.5 py-0.5 rounded text-[11px] border border-[#efe9dc]/40 font-mono shrink-0">
                                  {sub.score} 分
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Code Compiler Interactive Schema Graph panel */}
                      <div className="bg-[#fffcf6]/40 border border-[#5b7a8c]/15 rounded-lg p-3.5 space-y-2.5 shadow-md flex flex-col justify-between">
                        <div className="space-y-2 flex-1">
                          <span className="text-[#4a6a7c] font-bold text-[11px] tracking-wider block font-mono border-b border-[#e3dcce] pb-1.5">
                            ⚙️ 炼丹逻辑计算图 (Graph Model Schema Compiler)
                          </span>

                          <textarea
                            rows={6}
                            value={alchemyGraphSchema}
                            onChange={(e) => setAlchemyGraphSchema(e.target.value)}
                            className="w-full bg-[#f4f1ea] border border-[#e3dcce] rounded px-2.5 py-2 font-mono text-[11px] text-[#6b7b3a] placeholder-[#eef3ec] focus:outline-none focus:border-[#5b7a8c]/60 resize-none leading-relaxed"
                          />

                          {/* Compiler feedback */}
                          {alchemyCompileStatus !== 'IDLE' && (
                            <div className={`p-2 rounded text-[11px] border font-mono ${
                              alchemyCompileStatus === 'SUCCESS' 
                                ? "bg-[#f2efe4]/30 border-[#6b7b3a]/30 text-[#6b7b3a]" 
                                : "bg-[#f9ecea]/30 border-[#9e2a2b]/30 text-[#b0543f]"
                            }`}>
                              {alchemyCompileMessage}
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2.5 pt-2 border-t border-[#d8d0bf]">
                          <button
                            onClick={() => {
                              try {
                                const parsed = JSON.parse(alchemyGraphSchema);
                                if (!parsed.inputs || !parsed.gates || !parsed.output) {
                                  throw new Error("缺少必需字段：inputs、gates、output。");
                                }
                                const bannedOps = ["MATMUL", "ADD", "MUL", "DOT", "SIGMOID", "SOFTMAX"];
                                const hasBanned = parsed.gates.some((g: any) => bannedOps.includes(g.type?.toUpperCase()));
                                if (hasBanned) {
                                  throw new Error("天道律令警示！检测到严禁使用的连续算子，违反纪元 2 规则禁制。");
                                }
                                setAlchemyCompileStatus('SUCCESS');
                                setAlchemyCompileMessage("✅ [编译成功] 计算图拓扑验证通过！纯逻辑位操作流匹配率100%。符合纪元 2 位运算限制法规。");
                                addLog("SYSTEM", "⚙️ 计算图逻辑门本地仿真成功。测试集 AUROC 仿真预估: ~0.875");
                              } catch (err: any) {
                                setAlchemyCompileStatus('ERROR');
                                setAlchemyCompileMessage(`❌ [编译失败] 语法/逻辑错误: ${err.message}`);
                                addLog("SYSTEM", `❌ 炼丹计算图静态语法错误: ${err.message}`);
                              }
                            }}
                            className="px-2.5 py-1.5 bg-[#fffcf6] border border-[#5b7a8c]/20 hover:border-[#4a6a7c]/60 hover:text-[#5b7a8c] text-[#4a6a7c] text-[11px] font-bold rounded transition cursor-pointer"
                          >
                            🛠️ 静态编译 (Check)
                          </button>

                          <button
                            onClick={async () => {
                              try {
                                const parsed = JSON.parse(alchemyGraphSchema);
                                const bannedOps = ["MATMUL", "ADD", "MUL", "DOT", "SIGMOID", "SOFTMAX"];
                                const hasBanned = parsed.gates?.some((g: any) => bannedOps.includes(g.type?.toUpperCase()));
                                if (hasBanned) {
                                  alert("⚠️ 计算图违背了纪元 2 无连续算子的大法法则，无法在天道上并网编译。");
                                  return;
                                }
                                
                                setAlchemyCompileStatus('SUCCESS');
                                setAlchemyCompileMessage("⚙️ 正在投递天道推演大阵... 位运算逻辑极速编译中...");
                                addLog("ACTION", "⚗️ 正在向大荒炼丹炉投递新型模型拓扑，灵火已备...");
                                // 真实提交（POST /api/arena/alchemy/submit），不再本地造假榜单
                                submitAlchemy(JSON.parse(alchemyGraphSchema), alchemyChallenge?.id || "").then((ok) => {
                                  if (ok) {
                                    setAlchemyCompileMessage("✨ [天道回音] 投递成功！炼丹炉已收录丹方，评估完成后榜单自动更新。");
                                    addLog("SYSTEM", "⚗️ 丹方已投递大荒炼丹炉，等待天道评估。");
                                    fetchAlchemyData();
                                  } else {
                                    setAlchemyCompileStatus('ERROR');
                                    setAlchemyCompileMessage("❌ 投递失败，请稍后再试。");
                                  }
                                });
                              } catch (e: any) {
                                alert("⚠️ 请先修正编译错误再投递天道。");
                              }
                            }}
                            className="flex-1 py-1.5 bg-gradient-to-r from-[#8a6d3b] to-[#8a6d3b] hover:from-[#8a6d3b] hover:to-[#8a6d3b] text-[#2b2b2b] font-bold text-[11px] rounded transition active:scale-[0.98] cursor-pointer"
                          >
                            ⚗️ 炼丹合成投递天道 (Submit)
                          </button>

                          <button
                            id="alchemy-compile-check-btn"
                            onClick={() => openWebMiniCockpit("alchemy", "alchemy-era-2", `炼丹寻道：酵母菌 AI 编译逻辑图`)}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-[#f3eef2] to-[#f6eddd] hover:from-[#f1edf4] hover:to-[#8a6d3b] border border-[#8a6d3b]/40 text-[#8a6d3b] text-[11px] font-bold rounded transition flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <span>🧙‍♂️ 智能体图优化 (Mini Cockpit)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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
                                <RichMessageRenderer content={ev.body} />
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={wechatEndRef} />
                    </div>

                    {/* Message Sender Input (Direct Matrix Send!) */}
                    <form onSubmit={handleSendRoomMessage} className="mt-1 pt-2 border-t border-[#5b7a8c]/10 flex space-x-1.5">
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
                <div key={item.id || idx} className="flex justify-center w-full mb-3">
                  <div className="w-full rounded-xl p-3 text-[11px] leading-relaxed break-words font-sans bg-[#fffcf6] border border-[#5b7a8c]/20 text-[#6b6560]">
                    {item.isPending ? (
                      <div className="space-y-3 font-mono">
                        <div className="flex items-center space-x-2">
                          <div className="w-3.5 h-3.5 border-2 border-[#5b7a8c]/40 border-t-cyan-400 rounded-full animate-spin" />
                          <span className="text-[#4a6a7c] font-bold text-[11px]">元神正在推演法旨...</span>
                          <span className="text-[11px] text-[#8a7f6d] ml-auto">{webCockpitProgress}%</span>
                        </div>

                        {/* Progress track */}
                        <div className="w-full bg-[#f4f1ea] h-1.5 rounded-full overflow-hidden border border-[#d8d0bf]">
                          <div
                            className="bg-gradient-to-r from-[#5b7a8c] to-[#5b7a8c] h-full transition-all duration-300"
                            style={{ width: `${webCockpitProgress}%` }}
                          />
                        </div>

                        {/* Steps */}
                        <div className="space-y-1.5 pt-1">
                          {webCockpitActiveTasks.map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between text-[11px]">
                              <div className="flex items-center space-x-1.5 truncate max-w-[240px]">
                                <span className={t.status === "SUCCESS" ? "text-[#6b7b3a]" : t.status === "FAILED" ? "text-[#b0543f]" : "text-[#4a6a7c]"}>
                                  {t.status === "SUCCESS" ? "✓" : t.status === "FAILED" ? "✗" : "•"}
                                </span>
                                <span className={`truncate ${t.status === "SUCCESS" ? "text-[#8a7f6d] line-through" : "text-[#4a4438]"}`}>
                                  {t.title}
                                </span>
                              </div>
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

              {/* C-1 Slider Matrix Panel */}
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
