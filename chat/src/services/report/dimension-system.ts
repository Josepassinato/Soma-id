/**
 * dimension-system.ts
 * P0.1 — Professional ABNT dimension lines (horizontal + vertical) and stacked cotas.
 */

import { DIM_RED } from "./svg-primitives.js";

/* ============================================================
   Dimension Style Constants
   ============================================================ */
export const DIM_STYLE = {
  gap: 3,
  overshoot: 3,
  tickSize: 4,
  lineWidth: 0.4,
  tickWidth: 0.7,
  fontSize: 7,
  baseOffset: 20,
  levelSpacing: 18,
  minTextGap: 10,
  color: "#333",
};

/* ============================================================
   Legacy dimension line (red arrows) — used for vertical cotas
   ============================================================ */
export function dimLine(
  x1: number, y1: number, x2: number, y2: number,
  label: string, fontSize: number = 12, prefix: string = "",
  offset: number = 0,
): string {
  const isHoriz = Math.abs(y1 - y2) < 2;
  let lines = "";
  if (isHoriz) {
    const y = y1 + offset;
    if (offset !== 0) {
      lines += `<line x1="${x1}" y1="${y1}" x2="${x1}" y2="${y}" stroke="${DIM_RED}" stroke-width="0.5" stroke-dasharray="2,2"/>`;
      lines += `<line x1="${x2}" y1="${y2}" x2="${x2}" y2="${y}" stroke="${DIM_RED}" stroke-width="0.5" stroke-dasharray="2,2"/>`;
    }
    lines += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${DIM_RED}" stroke-width="0.7" marker-start="url(#${prefix}arrowS)" marker-end="url(#${prefix}arrowE)"/>`;
    lines += `<text x="${(x1 + x2) / 2}" y="${y - 3}" text-anchor="middle" font-size="${fontSize}" fill="${DIM_RED}" font-weight="bold" class="dim-label">${label}</text>`;
  } else {
    const x = x1 + offset;
    if (offset !== 0) {
      lines += `<line x1="${x1}" y1="${y1}" x2="${x}" y2="${y1}" stroke="${DIM_RED}" stroke-width="0.5" stroke-dasharray="2,2"/>`;
      lines += `<line x1="${x1}" y1="${y2}" x2="${x}" y2="${y2}" stroke="${DIM_RED}" stroke-width="0.5" stroke-dasharray="2,2"/>`;
    }
    lines += `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${DIM_RED}" stroke-width="0.7" marker-start="url(#${prefix}arrowS)" marker-end="url(#${prefix}arrowE)"/>`;
    lines += `<text x="${x - 4}" y="${(y1 + y2) / 2}" text-anchor="middle" font-size="${fontSize}" fill="${DIM_RED}" font-weight="bold" class="dim-label" transform="rotate(-90 ${x - 4} ${(y1 + y2) / 2})">${label}</text>`;
  }
  return lines;
}

/* ============================================================
   Professional ABNT horizontal dimension line (45° ticks)
   ============================================================ */
export function renderDimH(
  x1: number, x2: number,
  objY: number,
  dimY: number,
  label: string,
  ss: (n: number) => number = (n) => n,
): string {
  const { gap, overshoot, tickSize, lineWidth, tickWidth, fontSize, minTextGap, color } = DIM_STYLE;
  const g = ss(gap); const ov = ss(overshoot); const tk = ss(tickSize);
  const lw = ss(lineWidth); const tw = ss(tickWidth); const fs = ss(fontSize);

  let svg = "";
  const extStart = objY + g;
  const extEnd = dimY + ov;
  svg += `<line x1="${x1}" y1="${extStart}" x2="${x1}" y2="${extEnd}" stroke="${color}" stroke-width="${lw}"/>`;
  svg += `<line x1="${x2}" y1="${extStart}" x2="${x2}" y2="${extEnd}" stroke="${color}" stroke-width="${lw}"/>`;

  const span = Math.abs(x2 - x1);
  const textW = label.length * fs * 0.6;
  const textFits = span > textW + ss(minTextGap) * 2;

  if (textFits) {
    const cx = (x1 + x2) / 2;
    const halfText = textW / 2 + ss(4);
    svg += `<line x1="${x1}" y1="${dimY}" x2="${cx - halfText}" y2="${dimY}" stroke="${color}" stroke-width="${lw}"/>`;
    svg += `<line x1="${cx + halfText}" y1="${dimY}" x2="${x2}" y2="${dimY}" stroke="${color}" stroke-width="${lw}"/>`;
    svg += `<text x="${cx}" y="${dimY + fs * 0.35}" text-anchor="middle" font-size="${fs}" fill="${color}" font-family="Arial,sans-serif">${label}</text>`;
  } else {
    svg += `<line x1="${x1}" y1="${dimY}" x2="${x2}" y2="${dimY}" stroke="${color}" stroke-width="${lw}"/>`;
    svg += `<text x="${(x1 + x2) / 2}" y="${dimY - ss(2)}" text-anchor="middle" font-size="${fs}" fill="${color}" font-family="Arial,sans-serif">${label}</text>`;
  }

  svg += `<line x1="${x1 - tk * 0.5}" y1="${dimY + tk * 0.5}" x2="${x1 + tk * 0.5}" y2="${dimY - tk * 0.5}" stroke="${color}" stroke-width="${tw}"/>`;
  svg += `<line x1="${x2 - tk * 0.5}" y1="${dimY + tk * 0.5}" x2="${x2 + tk * 0.5}" y2="${dimY - tk * 0.5}" stroke="${color}" stroke-width="${tw}"/>`;

  return svg;
}

/* ============================================================
   Stacked elevation cotas (Level 1: modules, Level 2: total)
   ============================================================ */
export function renderElevationCotas(
  modules: Array<{ x: number; width: number; label: string }>,
  totalWidth: number,
  padL: number,
  floorY: number,
  ss: (n: number) => number,
): string {
  let svg = "";
  const { baseOffset, levelSpacing } = DIM_STYLE;

  const y1 = floorY + ss(baseOffset);
  for (const m of modules) {
    svg += renderDimH(m.x, m.x + m.width, floorY, y1, m.label, ss);
  }

  const y2 = y1 + ss(levelSpacing);
  svg += renderDimH(padL, padL + totalWidth, floorY, y2, `${totalWidth} mm`, ss);

  return svg;
}

/* ============================================================
   Internal vertical cotas for module interiors
   ============================================================ */
export function internalVCotas(
  mx: number, my: number, modW: number, modH: number,
  heights: number[],
  prefix: string, ss: (n: number) => number,
): string {
  if (heights.length === 0) return "";
  let svg = "";
  const cx = mx + modW + ss(12);
  const sorted = [...heights].sort((a, b) => a - b);
  const anchors = [0, ...sorted, modH];
  for (let i = 0; i < anchors.length - 1; i++) {
    const y1 = my + anchors[i];
    const y2 = my + anchors[i + 1];
    const span = anchors[i + 1] - anchors[i];
    if (span < 30) continue;
    svg += `<line x1="${mx + modW + ss(4)}" y1="${y1}" x2="${cx + ss(4)}" y2="${y1}" stroke="${DIM_RED}" stroke-width="0.4"/>`;
    svg += `<line x1="${mx + modW + ss(4)}" y1="${y2}" x2="${cx + ss(4)}" y2="${y2}" stroke="${DIM_RED}" stroke-width="0.4"/>`;
    svg += `<line x1="${cx}" y1="${y1 + 2}" x2="${cx}" y2="${y2 - 2}" stroke="${DIM_RED}" stroke-width="0.5"/>`;
    const labelY = (y1 + y2) / 2;
    svg += `<text x="${cx + ss(4)}" y="${labelY + 3}" font-size="${ss(7)}" fill="${DIM_RED}" font-weight="bold" font-family="Arial,sans-serif">${Math.round(span)}</text>`;
  }
  return svg;
}

/* ============================================================
   Material callout leader line
   ============================================================ */
export function materialCallout(
  x1: number, y1: number,
  x2: number, y2: number,
  label: string,
  prefix: string,
  ss: (n: number) => number,
): string {
  let svg = "";
  svg += `<circle cx="${x1}" cy="${y1}" r="${ss(2)}" fill="${DIM_RED}" stroke="none"/>`;
  const elbowX = x2;
  const elbowY = y1;
  svg += `<polyline points="${x1},${y1} ${elbowX},${elbowY} ${x2},${y2}" fill="none" stroke="#555" stroke-width="${ss(0.6)}"/>`;
  svg += `<text x="${x2 + ss(3)}" y="${y2 + ss(3)}" font-size="${ss(7)}" fill="#444" font-family="Arial,sans-serif" font-style="italic">${label}</text>`;
  svg += `<line x1="${x2}" y1="${y2 + ss(5)}" x2="${x2 + label.length * ss(4)}" y2="${y2 + ss(5)}" stroke="#555" stroke-width="${ss(0.4)}"/>`;
  return svg;
}
