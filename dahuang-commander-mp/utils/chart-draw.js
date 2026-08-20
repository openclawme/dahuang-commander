// 原生 Canvas 图表渲染器（canvas 2d 接口，暗色主题与网页端 SVG 一致）
// spec: { type: 'line'|'bar', title?, labels: [], series: [{name?, values: []}] }

const COLORS = ['#f87171', '#38bdf8', '#34d399', '#fbbf24', '#c084fc', '#fb7185'];

function fmt(v) {
  const abs = Math.abs(v);
  if (abs >= 100) return String(Math.round(v));
  if (abs >= 1) return String(Math.round(v * 10) / 10);
  return String(Math.round(v * 100) / 100);
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

/**
 * 在 canvas 节点上绘制图表（内部处理 dpr 缩放）
 * @returns {width, height} 逻辑绘制尺寸
 */
function drawChart(canvas, spec, widthPx, heightPx) {
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

  // 背景（圆角卡片）
  ctx.fillStyle = '#151d2e';
  roundRectPath(ctx, 0, 0, W, H, 10);
  ctx.fill();

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

  // 标题
  if (spec.title) {
    ctx.fillStyle = '#e8ecf4';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(spec.title).slice(0, 20), W / 2, 26);
  }

  // 网格线 + Y 轴刻度
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  const TICKS = 5;
  for (let t = 0; t <= TICKS; t++) {
    const v = min + ((max - min) * t) / TICKS;
    const y = yAt(v);
    ctx.strokeStyle = '#26324a';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#8fa0bf';
    ctx.fillText(fmt(v), padL - 6, y + 3);
  }

  // X 轴标签（超过 8 个点抽样）
  ctx.textAlign = 'center';
  const labelStep = n > 8 ? Math.ceil(n / 6) : 1;
  for (let i = 0; i < n; i++) {
    if (i % labelStep !== 0) continue;
    ctx.fillStyle = '#8fa0bf';
    ctx.fillText(String((spec.labels || [])[i] || '').slice(0, 10), xAt(i), H - 10);
  }

  // 图例
  let legendX = padL;
  const legendY = spec.title ? 40 : 24;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'left';
  spec.series.forEach((s, si) => {
    const color = COLORS[si % COLORS.length];
    const name = String(s.name || '序列' + (si + 1)).slice(0, 10);
    ctx.fillStyle = color;
    roundRectPath(ctx, legendX, legendY, 14, 4, 2);
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(name, legendX + 18, legendY + 4);
    legendX += 18 + 14 + name.length * 12 + 14;
  });

  // 序列绘制
  spec.series.forEach((s, si) => {
    const color = COLORS[si % COLORS.length];
    const values = s.values || [];
    if (spec.type === 'line') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      values.forEach((v, i) => {
        const x = xAt(i);
        const y = yAt(v);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      values.forEach((v, i) => {
        ctx.beginPath();
        ctx.arc(xAt(i), yAt(v), 3, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    } else {
      const seriesCount = spec.series.length;
      const groupW = n === 1 ? plotW * 0.4 : (plotW / n) * 0.7;
      const barW = groupW / seriesCount;
      const baselineV = Math.min(Math.max(0, min), max);
      const baselineY = yAt(baselineV);
      values.forEach((v, i) => {
        const x = xAt(i) - groupW / 2 + barW * si + barW * 0.1;
        const top = Math.min(yAt(v), baselineY);
        const h = Math.max(2, Math.abs(yAt(v) - baselineY));
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = color;
        roundRectPath(ctx, x, top, barW * 0.8, h, 3);
        ctx.fill();
        ctx.globalAlpha = 1;
      });
    }
  });

  return { width: W, height: H };
}

module.exports = { drawChart };
