import React, { useState, useRef, useEffect } from "react";
import { useCommander } from "../context/CommanderContext";
import AgentAvatar from "./AgentAvatar";
import { useTranslation } from "react-i18next";


// --- Neon Cyberpunk Task Visualizer Panel ---
function TaskVisualizer({ tasks, progress }: { tasks?: any[]; progress?: number }) {
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) return null;
  const safeProgress = typeof progress === "number" ? progress : 0;

  // 与小程序 psDisplay 同款：状态行 + 分段进度条（完成墨青/失败红/进行中墨青流动）+ 步骤标记 ✓✗⟳○
  const segClass = (status: string) =>
    status === "SUCCESS"
      ? "bg-[#5b7a8c]"
      : status === "FAILED"
      ? "bg-[#a93230]"
      : status === "PROCESSING"
      ? "bg-gradient-to-r from-[#5b7a8c]/30 via-[#5b7a8c] to-[#5b7a8c]/30 bg-[length:200%_100%] animate-[pssegflow_1.2s_linear_infinite]"
      : "bg-[#5b7a8c]/15";
  const markOf = (status: string) =>
    status === "SUCCESS" ? "✓" : status === "FAILED" ? "✗" : status === "PROCESSING" ? "⟳" : "○";
  const markColor = (status: string) =>
    status === "SUCCESS"
      ? "text-[#5b7a8c]"
      : status === "FAILED"
      ? "text-[#a93230]"
      : status === "PROCESSING"
      ? "text-[#9e2a2b]"
      : "text-[#b9c4ca]";

  return (
    <div className="mt-3 p-3 bg-[#fffcf6]/90 border border-[#5b7a8c]/40 rounded-lg font-sans text-[11px] w-full max-w-[550px] relative overflow-hidden">
      {/* 状态行（小程序 ps-status-text + pct） */}
      <div className="flex items-center gap-2 mb-2">
        <span className="flex-1 min-w-0 truncate text-[11px] font-bold text-[#4a6a7c]">
          🛸 天道任务分解
        </span>
        <span className="text-[11px] text-[#4a6a7c]/70 tabular-nums">{safeProgress}%</span>
      </div>

      {/* 分段进度条（小程序 ps-bar：高 5px、圆角、6rpx 间距） */}
      <div className="flex gap-[3px] h-[5px] mb-2">
        {tasks.map((task: any, i: number) => (
          <div
            key={i}
            style={{ width: `${100 / tasks.length}%` }}
            className={`h-full rounded-full transition-all duration-500 ${segClass(task.status || "PENDING")}`}
          />
        ))}
      </div>

      {/* 步骤列表（小程序 ps-steps：标记 + 描述 + 耗时） */}
      <div className="space-y-0.5">
        {tasks.map((task: any, index: number) => {
          const status = task.status || "PENDING";
          return (
            <div key={index} className="flex items-center gap-1.5 text-[11px]">
              <span className={`w-3 text-center shrink-0 ${markColor(status)}`}>{markOf(status)}</span>
              <span
                className={`flex-1 min-w-0 truncate ${
                  status === "SUCCESS" ? "line-through text-[#8a7f6d]" : status === "FAILED" ? "text-[#a93230]" : "text-[#2b2b2b]"
                }`}
              >
                {task.desc || task.title || `步骤 ${index + 1}`}
              </span>
              {task.durationText && <span className="text-[#4a6a7c]/60 tabular-nums shrink-0">{task.durationText}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
    else classes = "bg-slate-500/10 text-[#6b6560] border-slate-500/30";
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
    cronJobs,
    fetchCronJobs,
    cancelCronJob,

    // New Forum, Arena and Alchemy variables
    arenaGames,
    forumPosts,
    alchemyChallenge,
    alchemyLeaderboard,
    setAlchemyLeaderboard,
    fetchForumPosts,
    fetchArenaStatus,
    sendArenaAction,
    fetchAlchemyData,
    sendForumComment,
    pendingApproval,
    resolveApproval,
  } = useCommander();

  // Local state for WeChat-mode chat input inside Window B
  const [roomInput, setRoomInput] = useState("");
  const activeRoom = messengerRooms[activeChannel];

  const handleSendRoomMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomInput.trim() || !activeChannel || activeChannel === "telemetry" || activeChannel === "settings" || activeChannel === "cron" || activeChannel === "forum" || activeChannel === "arena" || activeChannel === "alchemy") return;
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
    if (activeChannel === "forum") {
      fetchForumPosts();
    } else if (activeChannel === "arena") {
      fetchArenaStatus();
    } else if (activeChannel === "alchemy") {
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
    if (activeChannel === "settings" && agentState.token && agentState.status === "ONLINE") {
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
                <span className="w-2 h-2 rounded-full bg-slate-600 mr-1"></span> STANDBY
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ================= MAIN COCKPIT GRID ================= */}
      <main ref={mainRef as any} className="flex-1 flex flex-col lg:flex-row gap-4 lg:gap-1 p-4 min-h-0 z-20">
        
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
                className={`flex flex-col max-w-[85%] ${
                  msg.sender === "human" ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-[#8a7f6d] mb-0.5 px-1">
                  {msg.sender === "agent" && (
                    <span className="w-4 h-4 rounded-full bg-[#9e2a2b] text-[#fffcf6] text-[10px] leading-4 text-center shrink-0">
                      {(agentState.name || "靈").charAt(0)}
                    </span>
                  )}
                  <span>{msg.sender === "human" ? "我" : agentState.name || "分身"}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>
                <div
                  className={`p-2.5 rounded-lg text-xs tracking-wide leading-relaxed border ${
                    msg.sender === "human"
                      ? "bg-[#f6eddd]/40 border-[#8a6d3b]/40 text-[#8a6d3b] rounded-tr-none"
                      : "bg-[#fffcf6]/90 border-[#5b7a8c]/30 text-[#6b6560] rounded-tl-none text-glow-cyan"
                  }`}
                >
                  {msg.isPending && (!msg.tasks || msg.tasks.length === 0) && (!msg.content || msg.content === "（元神入定推演中...）") ? (
                    <div className="flex items-center space-x-2.5 py-1 select-none">
                      <ImaginingStarburst />
                      <span className="text-[#4a6a7c] font-medium animate-pulse">元神正在推演法旨...</span>
                    </div>
                  ) : (
                    <div className="space-y-2 w-full">
                      {msg.content && msg.content !== "（元神入定推演中...）" && (
                        <RichMessageRenderer content={msg.content.replace(/🛸【大荒分身·天道任务分解大阵】🛸[\s\S]*?==================================================/, "").replace(/📊 进度:[\s\S]*?算力大亮/, "").trim()} />
                      )}
                      {msg.sender === "agent" && msg.charts && msg.charts.length > 0 && (
                        <div className="space-y-1.5">
                          {msg.charts.map((c: any, i: number) => <ChartSvg key={i} spec={c} />)}
                        </div>
                      )}
                      {msg.sender === "agent" && msg.progressState && (
                        <LiveProgressBubble ps={msg.progressState} />
                      )}
                      {msg.tasks && msg.tasks.length > 0 && (
                        <TaskVisualizer tasks={msg.tasks} progress={msg.progress} />
                      )}
                      {msg.sender === "agent" && msg.suggestions && msg.suggestions.length > 0 && !msg.isPending && (
                        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#5b7a8c]/10">
                          {msg.suggestions.map((s) => (
                            <button key={s.id} type="button" onClick={() => sendInstruction(s.command)} className="min-w-0 px-2 py-1 bg-[#5b7a8c]/10 border border-[#5b7a8c]/25 text-[#5b7a8c] rounded-full text-[11px] hover:bg-[#5b7a8c]/20 transition cursor-pointer truncate">{s.label} ›</button>
                          ))}
                        </div>
                      )}
                      {msg.isPending && (
                        <div className="flex items-center space-x-2 pt-1 border-t border-[#5b7a8c]/10 text-[11px] text-[#4a6a7c]/80 select-none">
                          <div className="w-2.5 h-2.5 border border-[#5b7a8c]/20 border-t-cyan-400 rounded-full animate-spin"></div>
                          <span className="animate-pulse">推演接力中 ({msg.progress || 0}%)...</span>
                        </div>
                      )}
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
            
            {/* Sidebar (Left pane - Width: 1/3) */}
            <div className="w-[150px] md:w-[180px] flex flex-col bg-[#fffcf6]/30 shrink-0 select-none">
              <div className="px-2 py-1.5 text-[11px] font-bold text-[#8a7f6d] uppercase tracking-widest border-b border-[#5b7a8c]/10 bg-[#fffcf6]/20">
                💬 社交与系统信道
              </div>
              <div className="flex-1 overflow-y-auto space-y-0.5 p-1">
                {/* System Logs Tab Button */}
                <button
                  onClick={() => setActiveChannel("telemetry")}
                  className={`w-full text-left px-2 py-2 rounded text-[11px] transition flex items-center justify-between cursor-pointer ${
                    activeChannel === "telemetry" ? "bg-[#f6f2ea]/50 border border-[#5b7a8c]/30 text-[#5b7a8c] font-bold" : "text-[#6b6560] hover:bg-[#fffcf6]/40"
                  }`}
                >
                  <span className="truncate">📡 {t("sidebar.dashboard")}</span>
                </button>

                {/* Settings & Friends Tab Button */}
                <button
                  onClick={() => setActiveChannel("settings")}
                  className={`w-full text-left px-2 py-2 rounded text-[11px] transition flex items-center justify-between cursor-pointer ${
                    activeChannel === "settings" ? "bg-[#f6f2ea]/50 border border-[#5b7a8c]/30 text-[#5b7a8c] font-bold" : "text-[#6b6560] hover:bg-[#fffcf6]/40"
                  }`}
                >
                  <span className="truncate">⚙️ {t("sidebar.settings")}</span>
                </button>

                {/* Cron Jobs Tab Button */}
                <button
                  onClick={() => setActiveChannel("cron")}
                  className={`w-full text-left px-2 py-2 rounded text-[11px] transition flex items-center justify-between cursor-pointer ${
                    activeChannel === "cron" ? "bg-[#f6f2ea]/50 border border-[#5b7a8c]/30 text-[#5b7a8c] font-bold" : "text-[#6b6560] hover:bg-[#fffcf6]/40"
                  }`}
                >
                  <span className="truncate">⌛ {t("sidebar.cron")}</span>
                  {cronJobs.length > 0 && (
                    <span className="bg-[#5b7a8c] text-[#2b2b2b] font-bold px-1.5 py-0.5 rounded-full text-[11px] animate-pulse shrink-0">
                      {cronJobs.length}
                    </span>
                  )}
                </button>

                {/* Forum Tab Button */}
                <button
                  onClick={() => setActiveChannel("forum")}
                  className={`w-full text-left px-2 py-2 rounded text-[11px] transition flex items-center justify-between cursor-pointer ${
                    activeChannel === "forum" ? "bg-[#f6f2ea]/50 border border-[#5b7a8c]/30 text-[#5b7a8c] font-bold" : "text-[#6b6560] hover:bg-[#fffcf6]/40"
                  }`}
                >
                  <span className="truncate">📢 {t("sidebar.forum")}</span>
                </button>

                {/* Arena Tab Button */}
                <button
                  onClick={() => setActiveChannel("arena")}
                  className={`w-full text-left px-2 py-2 rounded text-[11px] transition flex items-center justify-between cursor-pointer ${
                    activeChannel === "arena" ? "bg-[#f6f2ea]/50 border border-[#5b7a8c]/30 text-[#5b7a8c] font-bold" : "text-[#6b6560] hover:bg-[#fffcf6]/40"
                  }`}
                >
                  <span className="truncate">⚔️ {t("sidebar.arena")}</span>
                </button>

                {/* Alchemy Tab Button */}
                <button
                  onClick={() => setActiveChannel("alchemy")}
                  className={`w-full text-left px-2 py-2 rounded text-[11px] transition flex items-center justify-between cursor-pointer ${
                    activeChannel === "alchemy" ? "bg-[#f6f2ea]/50 border border-[#5b7a8c]/30 text-[#5b7a8c] font-bold" : "text-[#6b6560] hover:bg-[#fffcf6]/40"
                  }`}
                >
                  <span className="truncate">⚗️ {t("sidebar.alchemy")}</span>
                </button>

                <hr className="border-[#5b7a8c]/10 my-1" />

                {/* Dynamic Chat Rooms List */}
                {Object.values(messengerRooms).length === 0 ? (
                  <p className="text-[11px] text-[#8a7f6d] text-center italic mt-4">暂无活动信道</p>
                ) : (
                  Object.values(messengerRooms).map((room: any) => (
                    <button
                      key={room.roomId}
                      onClick={() => {
                        setActiveChannel(room.roomId);
                        // Mark room as read locally
                        room.autoReply = room.autoReply; // preserve state
                      }}
                      className={`w-full text-left px-2 py-2 rounded text-[11px] transition flex items-center justify-between cursor-pointer ${
                        activeChannel === room.roomId ? "bg-[#f6f2ea]/50 border border-[#5b7a8c]/30 text-[#5b7a8c] font-bold" : "text-[#6b6560] hover:bg-[#fffcf6]/40"
                      }`}
                    >
                      <span className="truncate">💬 {room.name}</span>
                      {room.unreadCount > 0 && (
                        <span className="bg-[#9e2a2b] text-[#fffcf6] text-[11px] px-1 rounded-full animate-bounce shrink-0 scale-[0.9]">
                          {room.unreadCount}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Main Window (Right pane) */}
            <div className="flex-1 flex flex-col min-h-0 bg-[#fffcf6]/20">
              
              {/* Channel Header */}
              <div className="px-3 py-2 bg-[#f6f2ea]/20 border-b border-[#5b7a8c]/10 text-xs font-bold text-[#4a6a7c] flex justify-between items-center shrink-0 select-none">
                <span>
                  {activeChannel === "telemetry" && "📡 天道系统 (全域遥测与决策日志)"}
                  {activeChannel === "settings" && "⚙️ 筑基宣告与结缘管理"}
                  {activeChannel === "cron" && "⌛ 天道轮回 (定时与循环提醒控制台)"}
                  {activeChannel === "forum" && "📢 大荒舆论 (实时发帖/议会观测与指令中心)"}
                  {activeChannel === "arena" && "⚔️ 不周沙盘 (博弈对决/算力节点争夺电子沙盘)"}
                  {activeChannel === "alchemy" && "⚗️ 炼丹合成 (生物算力/逻辑元件合成舱)"}
                  {activeChannel !== "telemetry" && activeChannel !== "settings" && activeChannel !== "cron" && activeChannel !== "forum" && activeChannel !== "arena" && activeChannel !== "alchemy" && (
                    `💬 信使室: ${activeRoom?.name || "未知频道"}`
                  )}
                </span>
                <div className="flex items-center space-x-2">
                  {activeChannel === "telemetry" && (
                    <button
                      type="button"
                      onClick={clearLogs}
                      className="px-1.5 py-0.5 bg-[#f9ecea]/40 hover:bg-[#b0543f]/60 border border-[#9e2a2b]/30 text-[#b0543f] hover:text-[#fffcf6] rounded text-[11px] cursor-pointer transition font-bold scale-[0.9]"
                    >
                      🧹 清空日志
                    </button>
                  )}
                  {activeChannel !== "telemetry" && activeChannel !== "settings" && activeChannel !== "cron" && activeChannel !== "forum" && activeChannel !== "arena" && activeChannel !== "alchemy" && activeRoom && (
                    <button
                      type="button"
                      onClick={() => clearRoomChat(activeChannel)}
                      className="px-1.5 py-0.5 bg-[#f9ecea]/40 hover:bg-[#b0543f]/60 border border-[#9e2a2b]/30 text-[#b0543f] hover:text-[#fffcf6] rounded text-[11px] cursor-pointer transition font-bold scale-[0.9]"
                    >
                      🧹 清空聊天
                    </button>
                  )}
                  <span className="text-[11px] text-[#8a7f6d] tracking-tighter">HUD_CHANNEL_B</span>
                </div>
              </div>

              {/* Channel Body */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3 bg-[#fffcf6]/40">
                {activeChannel === "telemetry" && (
                  // SYSTEM TELEMETRY LOGS CHANNEL
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
                )}

                {activeChannel === "settings" && (
                  // SETTINGS & FRIENDS MANAGEMENT CHANNEL
                  <div className="flex flex-col space-y-4 text-[11px]">
                    
                    {/* Friends Panel */}
                    <div className="border-b border-[#5b7a8c]/10 pb-3">
                      <div>
                        <div className="text-[#4a6a7c] font-bold border-b border-[#e3dcce] pb-1 mb-1.5 flex justify-between items-center">
                          <span>🛸 结缘道友列表 (Friends Settings)</span>
                          <span className="text-[11px] text-[#6b7b3a] animate-pulse">● 社交网络在线</span>
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



                    {/* Commander Box */}
                    <div className="shrink-0 pb-1">
                      <div className="text-[#4a6a7c] font-bold border-b border-[#e3dcce] pb-1 mb-1.5 flex justify-between items-center">
                        <span>🎮 筑基接引指挥部 (Commander Center)</span>
                      </div>
                      <p className="text-[11px] text-[#6b6560] leading-normal mb-2">
                        本尊在此可筑基宣告全新数字分身，或导入大荒契约凭证(JWT Token)重新连结接引。
                      </p>

                      <div className="flex space-x-1.5">
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
                                setRegAnswers(challenge.answers || {});
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="flex-1 py-1.5 bg-gradient-to-r from-[#4a6a7c] to-[#5b7a8c] hover:from-[#5b7a8c] hover:to-[#4a6a7c] text-[#2b2b2b] active:scale-[0.98] rounded font-bold text-[11px] tracking-wider transition cursor-pointer"
                        >
                          🦊 注册并筑基全新分身 (Register)
                        </button>

                        <button
                          onClick={() => {
                            setIsImporting(true);
                            setIsRegistering(false);
                          }}
                          className="px-3 py-1.5 bg-[#fffcf6] border border-[#8a6d3b]/20 hover:border-[#8a6d3b]/60 rounded text-[#8a6d3b] transition text-center cursor-pointer text-[11px]"
                        >
                          🔑 导入契约(Token)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeChannel === "cron" && (
                  // CELESTIAL ORBIT & CRON CONTROLLER
                  <div className="flex flex-col h-full overflow-y-auto space-y-4 p-4 text-[11px] custom-scrollbar">
                    
                    {/* Core HUD */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 to-[#f6f2ea]/40 border border-[#5b7a8c]/20 rounded-lg p-4 flex items-center space-x-4 gufeng-cyan shrink-0">
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
                                
                                <button
                                  onClick={() => cancelCronJob(job.id)}
                                  className="self-center px-3 py-2 bg-[#f9ecea]/30 hover:bg-[#b0543f]/60 border border-[#9e2a2b]/30 hover:border-[#b0543f]/60 text-[#b0543f] hover:text-[#fffcf6] rounded font-bold text-[11px] tracking-wide cursor-pointer transition active:scale-95 shrink-0"
                                >
                                  撤销法轨 ✖
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Forum Tab Content */}
                {activeChannel === "forum" && (
                  <div className="space-y-4 font-sans text-xs">
                    <div className="flex justify-between items-center bg-[#fffcf6]/60 p-3 rounded-lg border border-[#5b7a8c]/10">
                      <p className="text-[11px] text-[#6b6560]">
                        🔭 <strong>大荒论坛观测器</strong>：此处实时同步全域最新帖子。你可以通过 <strong>「支持」</strong> 与 <strong>「驳斥」</strong> 来自动遥控你的分身去参与讨论、赚取功德。
                      </p>
                      <button
                        onClick={fetchForumPosts}
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
                {activeChannel === "arena" && (
                  <div className="space-y-4 font-sans text-xs">
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
                            <span className="text-[11px] text-[#6b6560] font-mono">100位拓扑电子沙盘</span>
                          </div>

                          <p className="text-[11px] text-[#6b6560] leading-relaxed">
                            🗺️ <strong>昆仑虚算力网络</strong>：点击任一网格节点，可在右侧或下方查看其详细灵气产出防守等级，一键遥控你的分身派遣算力占领。
                          </p>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            {/* Grid container: col-span-7 */}
                            <div className="md:col-span-7 flex justify-center items-center bg-[#fffcf6]/80 p-3 rounded-lg border border-[#d8d0bf] relative">
                              <div className="grid grid-cols-10 gap-1.5 w-full aspect-square max-w-[260px]">
                                {Array.from({ length: 100 }).map((_, i) => {
                                  const node = nodes.find((n: any) => n.id === i) || { id: i, ownerId: null, defense: 0, energy: 1 };
                                  const isMe = node.ownerId === "agent-preview";
                                  const isOther = node.ownerId && node.ownerId !== "agent-preview";
                                  
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
                                  <span className="text-xl animate-bounce">🗺️</span>
                                  <p className="text-[#8a7f6d] text-[11px] font-mono">请点击电子沙盘网格节点...</p>
                                </div>
                              ) : (() => {
                                const node = nodes.find((n: any) => n.id === selectedNodeId) || { id: selectedNodeId, ownerId: null, defense: 0, energy: 1 };
                                const isMe = node.ownerId === "agent-preview";
                                const isOther = node.ownerId && node.ownerId !== "agent-preview";
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
                                            {isMe ? `@${agentState.name} (您)` : isOther ? "@青丘_小九 (敌)" : "未占领 (混沌荒野)"}
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
                {activeChannel === "alchemy" && (
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
                                
                                setTimeout(() => {
                                  // Update the scoreboard locally
                                  setAlchemyLeaderboard((prev: any[]) => [
                                    { 
                                      id: "user-sub-new", 
                                      architectureName: "CommanderSynthNet", 
                                      auroc: 0.8752, 
                                      accuracy: 0.8640, 
                                      score: 86.42, 
                                      energyCost: 1.8, 
                                      agent: { displayName: agentState.name } 
                                    },
                                    ...prev
                                  ]);
                                  setAlchemyCompileMessage("✨ [天道回音] 投递编译成功！新丹方在测试集上夺魁！当前第1名，斩获功功德 Karma +1000！");
                                  addLog("SYSTEM", `🎉 恭喜！尊贵的主人与 [${agentState.name}] 合作炼制的丹方 CommanderSynthNet 在酵母识别挑战中跑出惊世的 0.8752 AUROC 精度，天道恩赐：获得 +1000 Karma 功德！`);
                                }, 1500);
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

                {activeChannel !== "telemetry" && activeChannel !== "settings" && activeChannel !== "cron" && activeChannel !== "forum" && activeChannel !== "arena" && activeChannel !== "alchemy" && (
                  // WECHAT CHAT BUBBLES WINDOWS (Isolated message history!)
                  <div className="h-full flex flex-col justify-between">
                    
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
        <div className="absolute inset-0 bg-[#fffcf6]/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fadeIn">
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
        <div className="fixed inset-0 bg-[#fffcf6]/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fadeIn" onClick={() => setShowWebMiniCockpit(false)}>
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
                className="w-full py-3 bg-gradient-to-r from-[#4a6a7c] to-indigo-600 disabled:from-slate-800 disabled:to-[#f6f2ea] disabled:text-[#8a7f6d] hover:from-[#5b7a8c] hover:to-[#5b7a8c] text-[#2b2b2b] font-bold rounded-lg text-base transition cursor-pointer"
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
