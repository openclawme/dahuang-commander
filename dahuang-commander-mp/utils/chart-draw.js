// 原生 Canvas 图表渲染器（canvas 2d 接口，浅色古风主题）
// spec: { type: 'line'|'bar', title?, labels: [], series: [{name?, values: []}], colors?: [] }
// 交互：chartHitTest / chartHover —— 触摸图表显示十字线 + 数值气泡（Epoch 风格）

// 浅色主题序列色盘：墨青 / 金 / 竹绿 / 砖红(点缀) / 靛蓝 / 茶
const COLORS = ['#5b7a8c', '#c9a34c', '#8ba678', '#b0543f', '#7a8fb8', '#a8825f'];

// canvasId → 渲染状态（几何布局 + 悬浮索引），支持触摸命中与悬浮重绘
const chartStates = new Map();

// 序列颜色：优先 spec.colors 自定义（服务端校验过的 #RRGGBB），缺省回落调色板轮转
function seriesColor(spec, si) {
  if (spec.colors && /^#[0-9a-fA-F]{6}$/.test(spec.colors[si] || "")) {
    return spec.colors[si];
  }
  return COLORS[si % COLORS.length];
}

function fmt(v) {
  if (v == null || isNaN(Number(v))) return "-";
  const abs = Math.abs(Number(v));
  if (abs >= 10000) return String(Math.round(Number(v)));
  if (abs >= 100) return String(Math.round(Number(v) * 10) / 10); // 股价等大数值保留 1 位小数
  if (abs >= 1) return String(Math.round(Number(v) * 10) / 10);
  return String(Math.round(Number(v) * 100) / 100);
}

function ellipsis(s, n) {
  const t = String(s || "");
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 完整绘制一帧（基础图表 + 悬浮十字线与气泡） */
function paint(st) {
  const ctx = st.ctx;
  const spec = st.spec;
  const { W, H, padL, padR, padT, padB, plotW, plotH } = st;

  // 背景（米白圆角卡片 + 细描边）
  ctx.fillStyle = '#fbf8f1';
  roundRectPath(ctx, 0.5, 0.5, W - 1, H - 1, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(59, 48, 36, 0.1)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, 0.5, 0.5, W - 1, H - 1, 10);
  ctx.stroke();

  // 标题
  if (spec.title) {
    ctx.fillStyle = '#2f3a3f';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ellipsis(spec.title, 20), W / 2, 26);
  }

  // 网格线 + Y 轴刻度
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  const TICKS = 5;
  for (let t = 0; t <= TICKS; t++) {
    const v = st.min + ((st.max - st.min) * t) / TICKS;
    const y = st.yAt(v);
    ctx.strokeStyle = '#e8e2d5';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#8a7f6d';
    ctx.fillText(fmt(v), padL - 6, y + 3);
  }

  // X 轴标签（超过 8 个点抽样；宽画布横向滚动下显示全部）
  ctx.textAlign = 'center';
  const labelStep = plotW / st.n >= 48 ? 1 : Math.max(1, Math.ceil((st.n * 48) / plotW));
  for (let i = 0; i < st.n; i++) {
    if (i % labelStep !== 0) continue;
    ctx.fillStyle = '#8a7f6d';
    ctx.fillText(ellipsis((spec.labels || [])[i] || '', 10), st.xAt(i), H - 10);
  }

  // 图例（measureText 实测宽度，中文不再重叠）
  let legendX = padL;
  const legendY = spec.title ? 40 : 24;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  spec.series.forEach((s, si) => {
    const color = seriesColor(spec, si);
    const name = ellipsis(s.name || '序列' + (si + 1), 10);
    ctx.fillStyle = color;
    roundRectPath(ctx, legendX, legendY, 14, 4, 2);
    ctx.fill();
    ctx.fillStyle = '#4a4438';
    ctx.fillText(name, legendX + 18, legendY + 4);
    legendX += 18 + 14 + ctx.measureText(name).width + 14;
  });

  // 序列绘制
  spec.series.forEach((s, si) => {
    const color = seriesColor(spec, si);
    const values = s.values || [];
    if (spec.type === 'line') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      values.forEach((v, i) => {
        const x = st.xAt(i);
        const y = st.yAt(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      values.forEach((v, i) => {
        ctx.beginPath();
        ctx.arc(st.xAt(i), st.yAt(v), 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    } else {
      const seriesCount = spec.series.length;
      const groupW = st.n === 1 ? plotW * 0.4 : (plotW / st.n) * 0.7;
      const barW = groupW / seriesCount;
      const baselineV = Math.min(Math.max(0, st.min), st.max);
      const baselineY = st.yAt(baselineV);
      values.forEach((v, i) => {
        const x = st.xAt(i) - groupW / 2 + barW * si + barW * 0.1;
        const top = Math.min(st.yAt(v), baselineY);
        const h = Math.max(2, Math.abs(st.yAt(v) - baselineY));
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = color;
        roundRectPath(ctx, x, top, barW * 0.8, h, 3);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    }
  });

  // 悬浮交互：十字线 + 高亮点 + 数值气泡
  if (st.hover != null) {
    const i = st.hover;
    const x = st.xAt(i);
    ctx.strokeStyle = 'rgba(47, 58, 63, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    spec.series.forEach((s, si) => {
      const v = (s.values || [])[i];
      if (v == null) return;
      const color = seriesColor(spec, si);
      ctx.beginPath();
      ctx.arc(x, st.yAt(v), 4.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fbf8f1';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    const label = (spec.labels || [])[i] || '';
    const lines = [
      label,
      ...spec.series.map((s, si) => `${ellipsis(s.name || '序列' + (si + 1), 8)}: ${fmt((s.values || [])[i])}`),
    ];
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    const textW = Math.max.apply(null, lines.map((l) => ctx.measureText(l).width));
    const boxW = textW + 20;
    const lineH = 16;
    const boxH = lines.length * lineH + 12;
    let bx = x + 12;
    if (bx + boxW > W - 4) bx = x - 12 - boxW;
    if (bx < 4) bx = 4;
    const by = Math.max(4, Math.min(padT - 6, H - boxH - 4));
    ctx.fillStyle = 'rgba(43, 42, 38, 0.95)';
    roundRectPath(ctx, bx, by, boxW, boxH, 6);
    ctx.fill();
    ctx.fillStyle = '#f6f1e7';
    lines.forEach((l, li) => ctx.fillText(l, bx + 10, by + 16 + li * lineH));
  }
}

/**
 * 在 canvas 节点上绘制图表（内部处理 dpr 缩放）
 * @param canvasId 可选，用于交互命中/悬浮重绘（同一 id 重绘时保持悬浮状态）
 * @returns {width, height} 逻辑绘制尺寸
 */
function drawChart(canvas, spec, widthPx, heightPx, canvasId) {
  if (!canvas || !widthPx || !heightPx) return null;
  let dpr = 2;
  try {
    dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 2;
  } catch (e) { /* 默认 2 */ }
  canvas.width = Math.round(widthPx * dpr);
  canvas.height = Math.round(heightPx * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(dpr, dpr);

  const W = widthPx;
  const H = heightPx;
  const padL = 44;
  const padR = 14;
  const padT = spec.title ? 58 : 42;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // 数值域
  const all = [];
  spec.series.forEach((s) => all.push.apply(all, s.values || []));
  if (!all.length) return null;
  let min = Math.min.apply(null, all);
  let max = Math.max.apply(null, all);
  if (min === max) { min -= 1; max += 1; }
  const rangePad = (max - min) * 0.08;
  min -= rangePad;
  max += rangePad;

  const n = Math.max.apply(null, spec.series.map((s) => (s.values || []).length));
  const xAt = (i) => (n === 1 ? padL + plotW / 2 : padL + (plotW * i) / (n - 1));
  const yAt = (v) => padT + plotH - ((v - min) / (max - min)) * plotH;

  const st = {
    canvas, ctx, spec, W, H, padL, padR, padT, padB, plotW, plotH,
    min, max, n, xAt, yAt, hover: null,
  };
  if (canvasId) {
    const prev = chartStates.get(canvasId);
    if (prev) st.hover = prev.hover; // 重绘（进度更新等）保持悬浮状态
    chartStates.set(canvasId, st);
    if (chartStates.size > 60) chartStates.delete(chartStates.keys().next().value);
  }
  paint(st);
  return { width: W, height: H };
}

/** 触摸命中：画布 CSS 坐标 → 最近数据点下标；不在绘图区内返回 null */
function chartHitTest(canvasId, xCss, yCss) {
  const st = chartStates.get(canvasId);
  if (!st || xCss < st.padL || xCss > st.W - st.padR) return null;
  if (yCss < st.padT - 8 || yCss > st.H - st.padB + 8) return null;
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < st.n; i++) {
    const d = Math.abs(xCss - st.xAt(i));
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

/** 设置悬浮数据点（index 传 null 取消），立即重绘 */
function chartHover(canvasId, index) {
  const st = chartStates.get(canvasId);
  if (!st) return;
  st.hover = index;
  paint(st);
}

module.exports = { drawChart, chartHitTest, chartHover };
