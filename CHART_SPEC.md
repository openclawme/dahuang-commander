# 图表渲染规范（Web 与微信小程序共用契约）

本规范定义服务端下发的图表数据格式。**两端（dahuang-commander web / dahuang-commander-mp）必须按同一份 spec 渲染同一字段**，改动任何字段先改本文档并同步两端。

## spec 结构

```json
{
  "type": "line" | "bar",
  "title": "图表标题（可选，显示在顶部）",
  "labels": ["x轴标签1", "x轴标签2"],
  "series": [
    { "name": "系列名（可选，进图例）", "values": [1.2, 3.4] }
  ],
  "colors": ["#5b7a8c", "#c9a34c"]
}
```

## 规则

1. **type**：`line` 折线、`bar` 柱状；缺省按 line 处理。
2. **labels**：与 series.values 等长对齐；缺失时按序号 0..n-1。
3. **series.values**：只允许有限数值；非数值/非有限项**丢弃**（两端已一致）。全空系列丢弃，无有效系列时不渲染。
4. **colors**：`#RRGGBB` 合法值按序取用，否则回落两端统一的默认色板 `#5b7a8c, #c9a34c, #8ba678, #b0543f, #7a8fb8, #a8825f`。
5. 图例：series.name 存在时渲染；y 轴 6 档刻度 + 5 虚线网格；标签过长截断 10 字符。
6. 服务端下发：消息内图表为 `msg.charts` 数组；正文中的 `{{图表N}}` 标记由客户端渲染器剥离（mp 原位替换为图表，web 剥离后由 msg.charts 渲染）。

## 实现位置

- Web：`dahuang-commander/src/components/Dashboard.tsx` → `ChartSvg`（SVG）
- 小程序：`dahuang-commander-mp/utils/chart-draw.js`（canvas，多一个十字线悬浮气泡，属交互增强非 spec 差异）
