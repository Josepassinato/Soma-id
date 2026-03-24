/**
 * html-report.ts
 * Generates a standalone 12-prancha HTML technical report with SVG drawings.
 * Zero external dependencies — all CSS inline, print-friendly.
 * Professional industrial carpentry documentation (Promob/CAD style).
 */

import type { EngineResults, BlueprintModule, Sheet, InterferenceConflict } from "./engine-bridge.js";
import type { ParsedBriefing } from "../types.js";
import { generateBudget, type BudgetResult } from "./budget-generator.js";

/* ============================================================
   Constants
   ============================================================ */
let TOTAL_PRANCHAS = 13; // recalculated dynamically in generateHtmlReport
const GOLD = "#c9a84c";
const DIM_RED = "#cc0000";
const HDR_BG = "#333333";
const HDR_FG = "#ffffff";
const STROKE = "#333333";
const LIGHT_FILL = "#f5f5f5";

const MOD_FILLS: Record<string, string> = {
  base: "#E8E8E8",
  upper: "#D0D0D0",
  freestanding: "#D0E0F0",
  island: "#E0D8C8",
  vanity: "#D8E0D0",
  gun_safe: "#D0C8C0",
};

/* Material colors — Boa Vista palette */
const MAT_COLORS: Record<string, string> = {
  bv_lana: "#e0d5c1",
  bv_lord: "#50617D",
  mdf_6mm: "#d0d0d0",
  mdf_branco: "#f5f5f0",
};

/* Piece-type colors for nesting */
const PIECE_TYPE_COLORS: Record<string, string> = {
  lateral: "#B3D9FF",
  tampo: "#B8E6B8",
  base: "#B8E6B8",
  fundo: "#D0D0D0",
  porta: "#C9A84C",
  prateleira: "#E8DCC8",
  frente_gaveta: "#A0826D",
  divisoria: "#D4C5F9",
  default: "#E3F2FD",
};

const PIECE_COLORS = [
  "#E3F2FD", "#FFF3E0", "#E8F5E9", "#FCE4EC",
  "#F3E5F5", "#FFF8E1", "#E0F7FA", "#FBE9E7",
];

const ZONE_COLORS = [
  "#E8F0FE", "#FFF3E0", "#E8F5E9", "#FCE4EC",
  "#F3E5F5", "#FFF8E1", "#E0F7FA", "#FBE9E7",
];

/* ============================================================
   Helpers
   ============================================================ */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtCost(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function modType(mod: BlueprintModule): string {
  const id = (mod.moduleId || "").toLowerCase();
  const tp = (mod.type || "").toLowerCase();
  if (id.includes("ilha") || tp.includes("island")) return "island";
  if (id.includes("bancada") || id.includes("vanity") || tp.includes("vanity")) return "vanity";
  if (id.includes("armas") || tp.includes("gun")) return "gun_safe";
  if (tp.includes("upper") || id.includes("maleiro")) return "upper";
  if (tp.includes("free")) return "freestanding";
  return "base";
}

function modFill(mod: BlueprintModule): string {
  return MOD_FILLS[modType(mod)] || MOD_FILLS.base;
}

function today(): string {
  return new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function nowFull(): string {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/* ============================================================
   SVG Marker Definitions (shared)
   ============================================================ */
function svgDefs(prefix: string = ""): string {
  return `<defs>
    <marker id="${prefix}arrowS" markerWidth="6" markerHeight="4" refX="0" refY="2" orient="auto">
      <path d="M6,0 L0,2 L6,4 Z" fill="${DIM_RED}"/>
    </marker>
    <marker id="${prefix}arrowE" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
      <path d="M0,0 L6,2 L0,4 Z" fill="${DIM_RED}"/>
    </marker>
    <marker id="${prefix}arrowBlkS" markerWidth="6" markerHeight="4" refX="0" refY="2" orient="auto">
      <path d="M6,0 L0,2 L6,4 Z" fill="${STROKE}"/>
    </marker>
    <marker id="${prefix}arrowBlkE" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
      <path d="M0,0 L6,2 L0,4 Z" fill="${STROKE}"/>
    </marker>
  </defs>`;
}

/** Small internal dimension line (thin, for shelf spacing) */
function dimLineInternal(
  x1: number, y1: number, x2: number, y2: number,
  label: string, fontSize: number = 8, prefix: string = "",
): string {
  const isHoriz = Math.abs(y1 - y2) < 2;
  let lines = "";
  const color = "#666";
  if (isHoriz) {
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="0.4" marker-start="url(#${prefix}arrowBlkS)" marker-end="url(#${prefix}arrowBlkE)"/>`;
    lines += `<text x="${(x1 + x2) / 2}" y="${y1 - 2}" text-anchor="middle" font-size="${fontSize}" fill="${color}" font-family="Arial,sans-serif">${label}</text>`;
  } else {
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="0.4" marker-start="url(#${prefix}arrowBlkS)" marker-end="url(#${prefix}arrowBlkE)"/>`;
    const midY = (y1 + y2) / 2;
    lines += `<text x="${x1 + 3}" y="${midY}" text-anchor="start" font-size="${fontSize}" fill="${color}" font-family="Arial,sans-serif" transform="rotate(-90 ${x1 + 3} ${midY})">${label}</text>`;
  }
  return lines;
}

/** Dimension line in red with arrows */
function dimLine(
  x1: number, y1: number, x2: number, y2: number,
  label: string, fontSize: number = 12, prefix: string = "",
  offset: number = 0,
): string {
  const isHoriz = Math.abs(y1 - y2) < 2;
  let lines = "";
  if (isHoriz) {
    const y = y1 + offset;
    // Extension lines
    if (offset !== 0) {
      lines += `<line x1="${x1}" y1="${y1}" x2="${x1}" y2="${y}" stroke="${DIM_RED}" stroke-width="0.5" stroke-dasharray="2,2"/>`;
      lines += `<line x1="${x2}" y1="${y2}" x2="${x2}" y2="${y}" stroke="${DIM_RED}" stroke-width="0.5" stroke-dasharray="2,2"/>`;
    }
    lines += `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${DIM_RED}" stroke-width="0.7" marker-start="url(#${prefix}arrowS)" marker-end="url(#${prefix}arrowE)"/>`;
    lines += `<text x="${(x1 + x2) / 2}" y="${y - 3}" text-anchor="middle" font-size="${fontSize}" fill="${DIM_RED}" font-weight="bold">${label}</text>`;
  } else {
    const x = x1 + offset;
    if (offset !== 0) {
      lines += `<line x1="${x1}" y1="${y1}" x2="${x}" y2="${y1}" stroke="${DIM_RED}" stroke-width="0.5" stroke-dasharray="2,2"/>`;
      lines += `<line x1="${x1}" y1="${y2}" x2="${x}" y2="${y2}" stroke="${DIM_RED}" stroke-width="0.5" stroke-dasharray="2,2"/>`;
    }
    lines += `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${DIM_RED}" stroke-width="0.7" marker-start="url(#${prefix}arrowS)" marker-end="url(#${prefix}arrowE)"/>`;
    lines += `<text x="${x - 4}" y="${(y1 + y2) / 2}" text-anchor="middle" font-size="${fontSize}" fill="${DIM_RED}" font-weight="bold" transform="rotate(-90 ${x - 4} ${(y1 + y2) / 2})">${label}</text>`;
  }
  return lines;
}

/* ============================================================
   SVG: Module Interior Detail Renderer
   ============================================================ */
function renderModuleInterior(
  moduleType: string,
  subtype: string,
  x: number, y: number,
  w: number, h: number,
  features: string[],
  materialColor: string,
  doorColor: string,
  svgPrefix: string = "",
  showInternalDims: boolean = false,
): string {
  let svg = "";
  const inset = 4;
  const ix = x + inset, iy = y + inset;
  const iw = w - inset * 2, ih = h - inset * 2;

  // Module body — solid white fill with material-tinted border
  svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FEFEFE" stroke="#222" stroke-width="2.5"/>`;

  // 18mm thickness lines on sides (panel walls)
  svg += `<rect x="${x}" y="${y}" width="5" height="${h}" fill="${materialColor}" fill-opacity="0.35" stroke="#555" stroke-width="0.8"/>`;
  svg += `<rect x="${x + w - 5}" y="${y}" width="5" height="${h}" fill="${materialColor}" fill-opacity="0.35" stroke="#555" stroke-width="0.8"/>`;
  // Top panel
  svg += `<rect x="${x}" y="${y}" width="${w}" height="5" fill="${materialColor}" fill-opacity="0.25" stroke="#555" stroke-width="0.6"/>`;
  // Bottom panel / base
  svg += `<rect x="${x}" y="${y + h - 5}" width="${w}" height="5" fill="${materialColor}" fill-opacity="0.25" stroke="#555" stroke-width="0.6"/>`;

  const sub = subtype.toLowerCase();
  const mt = moduleType.toLowerCase();

  // Type label at top of module interior — ordered so specific matches come first
  const typeLabelRules: Array<{ match: (s: string, m: string) => boolean; label: string }> = [
    { match: (s, m) => s.includes("long_garment") || (m.includes("cabideiro") && !s.includes("short")), label: "CABIDEIRO" },
    { match: (s, m) => s.includes("short_garment") || (m.includes("cabideiro") && s.includes("short")), label: "CABIDEIRO CURTO" },
    { match: (s, m) => s.includes("boot"), label: "SAPATEIRA BOTAS" },
    { match: (s, m) => s.includes("shoe") || m.includes("sapateira"), label: "SAPATEIRA" },
    { match: (s, m) => s.includes("bag") || m.includes("vitrine"), label: "VITRINE" },
    { match: (s, m) => s.includes("makeup") || m.includes("bancada") || m.includes("vanity"), label: "MAKEUP" },
    { match: (s, m) => s.includes("suitcase") || m.includes("maleiro"), label: "MALEIRO" },
    { match: (s, m) => (s.includes("case") && !s.includes("suitcase")) || m.includes("arma"), label: "ARMAS" },
    { match: (s, m) => s.includes("jewel") || m.includes("gaveteiro") || m.includes("ilha"), label: "GAVETEIRO" },
  ];
  const typeLabelText = typeLabelRules.find(r => r.match(sub, mt))?.label || "MODULO";
  const labelFs = Math.max(7, Math.min(11, iw / 8));
  svg += `<text x="${x + w / 2}" y="${iy + 12}" text-anchor="middle" font-size="${labelFs}" font-weight="bold" fill="#444" font-family="Arial,sans-serif" letter-spacing="1" paint-order="stroke" stroke="#FEFEFE" stroke-width="2.5">${typeLabelText}</text>`;

  if (sub.includes("long_garment") || (mt.includes("cabideiro") && !sub.includes("short"))) {
    // Long garments: oval bar near top, hanging garments
    const barY = iy + ih * 0.08;
    // Bar supports (L-brackets)
    svg += `<path d="M${ix + 6} ${barY - 8} L${ix + 6} ${barY} L${ix + 12} ${barY}" fill="none" stroke="#333" stroke-width="1.8"/>`;
    svg += `<path d="M${ix + iw - 6} ${barY - 8} L${ix + iw - 6} ${barY} L${ix + iw - 12} ${barY}" fill="none" stroke="#333" stroke-width="1.8"/>`;
    // Oval bar (25mm chrome)
    svg += `<line x1="${ix + 10}" y1="${barY}" x2="${ix + iw - 10}" y2="${barY}" stroke="#555" stroke-width="5" stroke-linecap="round"/>`;
    svg += `<line x1="${ix + 10}" y1="${barY}" x2="${ix + iw - 10}" y2="${barY}" stroke="#999" stroke-width="2.5" stroke-linecap="round"/>`;
    // Hangers with garments
    const hangerSpacing = Math.max(12, Math.min(20, iw / 8));
    for (let gx = ix + 16; gx < ix + iw - 10; gx += hangerSpacing) {
      const gh = ih * 0.65;
      // Hanger hook
      svg += `<path d="M${gx} ${barY - 1} L${gx} ${barY - 5} Q${gx} ${barY - 8} ${gx + 3} ${barY - 8}" fill="none" stroke="#555" stroke-width="1.5"/>`;
      // Hanger shoulders
      svg += `<path d="M${gx - 6} ${barY + 4} L${gx} ${barY - 1} L${gx + 6} ${barY + 4}" stroke="#555" stroke-width="2" fill="none"/>`;
      // Garment body
      svg += `<rect x="${gx - 5}" y="${barY + 6}" width="10" height="${gh - 10}" rx="1" fill="#d8d0c4" fill-opacity="0.6" stroke="#999" stroke-width="0.8"/>`;
      svg += `<line x1="${gx - 5}" y1="${barY + gh}" x2="${gx + 5}" y2="${barY + gh}" stroke="#999" stroke-width="0.8"/>`;
    }
    if (showInternalDims) {
      const hangH = Math.round(ih * 0.92 * h / ih);
      svg += dimLineInternal(ix - 2, barY, ix - 2, iy + ih, `${hangH}`, 7, svgPrefix);
      const topH = Math.round(ih * 0.08 * h / ih);
      svg += dimLineInternal(ix - 2, iy, ix - 2, barY, `${topH}`, 7, svgPrefix);
    }
  } else if (sub.includes("short_garment") || (mt.includes("cabideiro") && sub.includes("short"))) {
    // Short garments: bar + shelves below
    const barY = iy + ih * 0.08;
    svg += `<path d="M${ix + 6} ${barY - 8} L${ix + 6} ${barY} L${ix + 12} ${barY}" fill="none" stroke="#333" stroke-width="1.8"/>`;
    svg += `<path d="M${ix + iw - 6} ${barY - 8} L${ix + iw - 6} ${barY} L${ix + iw - 12} ${barY}" fill="none" stroke="#333" stroke-width="1.8"/>`;
    svg += `<line x1="${ix + 10}" y1="${barY}" x2="${ix + iw - 10}" y2="${barY}" stroke="#555" stroke-width="5" stroke-linecap="round"/>`;
    svg += `<line x1="${ix + 10}" y1="${barY}" x2="${ix + iw - 10}" y2="${barY}" stroke="#999" stroke-width="2.5" stroke-linecap="round"/>`;
    const hangerSpacing = Math.max(12, Math.min(20, iw / 8));
    for (let gx = ix + 16; gx < ix + iw - 10; gx += hangerSpacing) {
      const gh = ih * 0.35;
      svg += `<path d="M${gx - 5} ${barY + 4} L${gx} ${barY - 1} L${gx + 5} ${barY + 4}" stroke="#555" stroke-width="1.8" fill="none"/>`;
      svg += `<rect x="${gx - 4}" y="${barY + 6}" width="8" height="${gh - 10}" rx="1" fill="#d8d0c4" fill-opacity="0.5" stroke="#999" stroke-width="0.6"/>`;
    }
    // Shelves below
    const shelfStart = iy + ih * 0.55;
    const shelfCount = 3;
    const spacing = (ih - (shelfStart - iy) - 8) / shelfCount;
    for (let s = 0; s < shelfCount; s++) {
      const sy = shelfStart + s * spacing;
      svg += `<rect x="${ix + 6}" y="${sy}" width="${iw - 12}" height="4" fill="#b8b0a0" stroke="#666" stroke-width="1.2"/>`;
    }
    if (showInternalDims) {
      const hangMm = Math.round(ih * 0.47 * h / ih);
      svg += dimLineInternal(ix - 2, barY, ix - 2, shelfStart, `${hangMm}`, 7, svgPrefix);
      const spaceMm = Math.round(spacing * h / ih);
      for (let s = 0; s < shelfCount - 1; s++) {
        const sy1 = shelfStart + s * spacing + 4;
        const sy2 = shelfStart + (s + 1) * spacing;
        svg += dimLineInternal(ix - 2, sy1, ix - 2, sy2, `${spaceMm}`, 6, svgPrefix);
      }
    }
  } else if (sub.includes("shoe") || mt.includes("sapateira")) {
    // Shoe rack: visibly inclined shelves at 15°
    const shelfCount = Math.max(4, Math.min(10, Math.round(ih / 40)));
    const spacing = ih / (shelfCount + 1);
    for (let s = 1; s <= shelfCount; s++) {
      const sy = iy + s * spacing;
      const tilt = Math.max(6, Math.min(14, spacing * 0.35));
      // Shelf bracket
      svg += `<line x1="${ix + 6}" y1="${sy - 2}" x2="${ix + 6}" y2="${sy + tilt + 2}" stroke="#888" stroke-width="1"/>`;
      svg += `<line x1="${ix + iw - 6}" y1="${sy - 4}" x2="${ix + iw - 6}" y2="${sy + 2}" stroke="#888" stroke-width="1"/>`;
      // Inclined shelf (thick, visible)
      svg += `<line x1="${ix + 6}" y1="${sy + tilt}" x2="${ix + iw - 6}" y2="${sy}" stroke="#444" stroke-width="3"/>`;
      svg += `<line x1="${ix + 6}" y1="${sy + tilt}" x2="${ix + iw - 6}" y2="${sy}" stroke="#b8b0a0" stroke-width="1.5"/>`;
      // Shoe silhouettes (higher contrast)
      if (iw > 35) {
        const shoeW = Math.min(16, iw / 5);
        for (let sx = ix + 12; sx < ix + iw - shoeW - 4; sx += shoeW + 3) {
          const shoeY = sy + tilt * (1 - (sx - ix) / iw) - 5;
          svg += `<ellipse cx="${sx + shoeW / 2}" cy="${shoeY}" rx="${shoeW / 2}" ry="3.5" fill="#8a7a68" fill-opacity="0.6" stroke="#666" stroke-width="0.8"/>`;
        }
      }
    }
    // "15°" annotation
    if (ih > 100) {
      const annY = iy + spacing;
      svg += `<text x="${ix + iw - 10}" y="${annY + 12}" text-anchor="end" font-size="7" fill="#888" font-family="Arial,sans-serif" font-style="italic">15°</text>`;
    }
    if (showInternalDims) {
      const spaceMm = Math.round(spacing * h / ih);
      for (let s = 0; s < shelfCount; s++) {
        const sy1 = s === 0 ? iy : iy + s * spacing;
        const sy2 = iy + (s + 1) * spacing;
        svg += dimLineInternal(ix - 2, sy1, ix - 2, sy2, `${spaceMm}`, 6, svgPrefix);
      }
    }
  } else if (sub.includes("boot")) {
    // Boot rack: wider spaced inclined shelves
    const shelfCount = Math.max(3, Math.min(6, Math.round(ih / 70)));
    const spacing = ih / (shelfCount + 1);
    for (let s = 1; s <= shelfCount; s++) {
      const sy = iy + s * spacing;
      const tilt = Math.max(8, Math.min(16, spacing * 0.3));
      svg += `<line x1="${ix + 6}" y1="${sy + tilt}" x2="${ix + iw - 6}" y2="${sy}" stroke="#444" stroke-width="3"/>`;
      svg += `<line x1="${ix + 6}" y1="${sy + tilt}" x2="${ix + iw - 6}" y2="${sy}" stroke="#b8b0a0" stroke-width="1.5"/>`;
      // Boot silhouettes (higher contrast)
      if (iw > 35) {
        const bootW = Math.min(14, iw / 4);
        for (let sx = ix + 12; sx < ix + iw - bootW - 4; sx += bootW + 6) {
          svg += `<rect x="${sx}" y="${sy + tilt * 0.3 - spacing * 0.45}" width="${bootW}" height="${spacing * 0.4}" rx="2" fill="#7a6858" fill-opacity="0.5" stroke="#666" stroke-width="1"/>`;
        }
      }
    }
    if (ih > 100) {
      svg += `<text x="${ix + iw - 10}" y="${iy + spacing + 14}" text-anchor="end" font-size="7" fill="#888" font-family="Arial,sans-serif" font-style="italic">15°</text>`;
    }
    if (showInternalDims) {
      const spaceMm = Math.round(spacing * h / ih);
      for (let s = 0; s < shelfCount; s++) {
        const sy1 = s === 0 ? iy : iy + s * spacing;
        const sy2 = iy + (s + 1) * spacing;
        svg += dimLineInternal(ix - 2, sy1, ix - 2, sy2, `${spaceMm}`, 6, svgPrefix);
      }
    }
  } else if (sub.includes("bag") || mt.includes("vitrine")) {
    // Vitrine: glass shelves (dashed, teal) + LED (gold) + glass door
    const shelfCount = Math.max(3, Math.min(6, Math.round(ih / 60)));
    const spacing = ih / (shelfCount + 1);
    // Glass door outline (behind everything)
    svg += `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="none" stroke="#4A8A90" stroke-width="2" stroke-dasharray="10,4" rx="2"/>`;
    // LED strip at very top
    svg += `<line x1="${ix + 6}" y1="${iy + 6}" x2="${ix + iw - 6}" y2="${iy + 6}" stroke="#DAA520" stroke-width="3" opacity="0.85"/>`;
    svg += `<text x="${ix + iw - 8}" y="${iy + 5}" text-anchor="end" font-size="5" fill="#DAA520" font-family="Arial,sans-serif">LED</text>`;
    for (let s = 1; s <= shelfCount; s++) {
      const sy = iy + s * spacing;
      // Glass shelf (dashed teal line, thick)
      svg += `<line x1="${ix + 6}" y1="${sy}" x2="${ix + iw - 6}" y2="${sy}" stroke="#4A8A90" stroke-width="2.5" stroke-dasharray="8,3"/>`;
      // LED strip below shelf
      svg += `<line x1="${ix + 8}" y1="${sy + 3}" x2="${ix + iw - 8}" y2="${sy + 3}" stroke="#DAA520" stroke-width="1.5" opacity="0.7"/>`;
      // Bag silhouette on shelf (stronger)
      if (iw > 40) {
        const bagW = Math.min(18, iw / 3.5);
        const bagH = Math.min(spacing * 0.45, 22);
        for (let bx = ix + 12; bx < ix + iw - bagW - 4; bx += bagW + 6) {
          svg += `<rect x="${bx}" y="${sy - bagH - 5}" width="${bagW}" height="${bagH}" rx="2" fill="#c8b898" fill-opacity="0.5" stroke="#888" stroke-width="1"/>`;
          svg += `<path d="M${bx + 3} ${sy - bagH - 5} Q${bx + bagW / 2} ${sy - bagH - 12} ${bx + bagW - 3} ${sy - bagH - 5}" fill="none" stroke="#888" stroke-width="0.8"/>`;
        }
      }
    }
    if (showInternalDims) {
      const spaceMm = Math.round(spacing * h / ih);
      for (let s = 0; s < shelfCount; s++) {
        const sy1 = s === 0 ? iy : iy + s * spacing;
        const sy2 = iy + (s + 1) * spacing;
        svg += dimLineInternal(ix - 2, sy1, ix - 2, sy2, `${spaceMm}`, 6, svgPrefix);
      }
    }
  } else if (sub.includes("makeup") || mt.includes("bancada") || mt.includes("vanity")) {
    // Makeup station: mirror + LED + countertop + drawers
    const mirrorH = ih * 0.3;
    const mirrorY = iy + ih * 0.1;
    // Mirror with reflection X
    svg += `<rect x="${ix + 8}" y="${mirrorY}" width="${iw - 16}" height="${mirrorH}" fill="#D0E8F0" stroke="#3A7A84" stroke-width="2"/>`;
    svg += `<line x1="${ix + 8}" y1="${mirrorY}" x2="${ix + iw - 8}" y2="${mirrorY + mirrorH}" stroke="#90C0CC" stroke-width="0.8"/>`;
    svg += `<line x1="${ix + iw - 8}" y1="${mirrorY}" x2="${ix + 8}" y2="${mirrorY + mirrorH}" stroke="#90C0CC" stroke-width="0.8"/>`;
    svg += `<text x="${x + w / 2}" y="${mirrorY + mirrorH / 2 + 3}" text-anchor="middle" font-size="${Math.max(7, iw / 12)}" font-weight="bold" fill="#3A7A84" font-family="Arial,sans-serif" paint-order="stroke" stroke="#D0E8F0" stroke-width="2">ESPELHO</text>`;
    // LED strips (gold, thick)
    svg += `<line x1="${ix + 6}" y1="${mirrorY - 3}" x2="${ix + iw - 6}" y2="${mirrorY - 3}" stroke="#DAA520" stroke-width="3.5" opacity="0.85"/>`;
    svg += `<line x1="${ix + 6}" y1="${mirrorY + mirrorH + 3}" x2="${ix + iw - 6}" y2="${mirrorY + mirrorH + 3}" stroke="#DAA520" stroke-width="3.5" opacity="0.85"/>`;
    // Countertop (thick stone/quartz)
    const counterY = mirrorY + mirrorH + ih * 0.1;
    svg += `<rect x="${x}" y="${counterY}" width="${w}" height="7" fill="#a89878" stroke="#555" stroke-width="1.5"/>`;
    svg += `<text x="${x + w / 2}" y="${counterY - 3}" text-anchor="middle" font-size="${Math.max(6, iw / 14)}" font-weight="bold" fill="#555" font-family="Arial,sans-serif">BANCADA 850mm</text>`;
    // Drawers below counter
    const drawStart = counterY + 12;
    const drawCount = 3;
    const drawH = (iy + ih - drawStart - 6) / drawCount;
    for (let d = 0; d < drawCount; d++) {
      const dy = drawStart + d * drawH;
      svg += `<rect x="${ix + 6}" y="${dy}" width="${iw - 12}" height="${drawH - 5}" fill="${materialColor}" fill-opacity="0.15" stroke="#555" stroke-width="1.2" rx="1"/>`;
      // Handle (wider, metallic)
      svg += `<rect x="${x + w / 2 - 12}" y="${dy + drawH / 2 - 3}" width="24" height="4" rx="2" fill="#777" stroke="#555" stroke-width="0.5"/>`;
    }
    // Electrical outlet
    svg += `<circle cx="${ix + iw - 14}" cy="${counterY - 10}" r="5" fill="none" stroke="#444" stroke-width="1.5"/>`;
    svg += `<line x1="${ix + iw - 17}" y1="${counterY - 10}" x2="${ix + iw - 11}" y2="${counterY - 10}" stroke="#444" stroke-width="1.2"/>`;
    svg += `<line x1="${ix + iw - 14}" y1="${counterY - 13}" x2="${ix + iw - 14}" y2="${counterY - 7}" stroke="#444" stroke-width="1.2"/>`;
    if (showInternalDims) {
      const mirrorMm = Math.round(mirrorH * h / ih);
      svg += dimLineInternal(ix - 2, mirrorY, ix - 2, mirrorY + mirrorH, `${mirrorMm}`, 6, svgPrefix);
      const counterMm = Math.round((counterY - mirrorY - mirrorH) * h / ih);
      svg += dimLineInternal(ix - 2, mirrorY + mirrorH, ix - 2, counterY, `${counterMm}`, 6, svgPrefix);
      const drawMm = Math.round(drawH * h / ih);
      for (let d = 0; d < drawCount; d++) {
        const dy1 = drawStart + d * drawH;
        const dy2 = drawStart + (d + 1) * drawH - 5;
        svg += dimLineInternal(ix - 2, dy1, ix - 2, dy2, `${drawMm}`, 6, svgPrefix);
      }
    }
  } else if ((sub.includes("case") && !sub.includes("suitcase")) || mt.includes("arma")) {
    // Gun safe: mirror door + shelves + sensor + LED
    // Mirror door (tracejado com X)
    svg += `<rect x="${ix + 3}" y="${iy + 3}" width="${iw - 6}" height="${ih - 6}" fill="#D0E4E8" stroke="#3A7A84" stroke-width="2" stroke-dasharray="10,4"/>`;
    svg += `<line x1="${ix + 3}" y1="${iy + 3}" x2="${ix + iw - 3}" y2="${iy + ih - 3}" stroke="#90B8C0" stroke-width="1"/>`;
    svg += `<line x1="${ix + iw - 3}" y1="${iy + 3}" x2="${ix + 3}" y2="${iy + ih - 3}" stroke="#90B8C0" stroke-width="1"/>`;
    svg += `<text x="${x + w / 2}" y="${y + h / 2}" text-anchor="middle" font-size="${Math.max(7, iw / 10)}" font-weight="bold" fill="#3A7A84" font-family="Arial,sans-serif" paint-order="stroke" stroke="#D0E4E8" stroke-width="2">PORTA ESPELHO</text>`;
    // Handle (round, metallic)
    svg += `<circle cx="${ix + iw - 12}" cy="${y + h / 2}" r="5" fill="#888" stroke="#444" stroke-width="1.5"/>`;
    svg += `<circle cx="${ix + iw - 12}" cy="${y + h / 2}" r="2" fill="#555"/>`;
    // Sensor icon (top right, red, bigger)
    svg += `<circle cx="${ix + iw - 12}" cy="${iy + 14}" r="5" fill="none" stroke="#e74c3c" stroke-width="1.5"/>`;
    svg += `<circle cx="${ix + iw - 12}" cy="${iy + 14}" r="1.5" fill="#e74c3c"/>`;
    svg += `<path d="M${ix + iw - 18} ${iy + 8} Q${ix + iw - 12} ${iy + 2} ${ix + iw - 6} ${iy + 8}" fill="none" stroke="#e74c3c" stroke-width="1"/>`;
    svg += `<text x="${ix + iw - 12}" y="${iy + 26}" text-anchor="middle" font-size="6" font-weight="bold" fill="#e74c3c" font-family="Arial,sans-serif">SENSOR</text>`;
    // LED at top
    svg += `<line x1="${ix + 6}" y1="${iy + 6}" x2="${ix + iw - 20}" y2="${iy + 6}" stroke="#DAA520" stroke-width="3" opacity="0.85"/>`;
    svg += `<text x="${ix + 8}" y="${iy + 5}" font-size="5" fill="#DAA520" font-family="Arial,sans-serif">LED</text>`;
  } else if (sub.includes("jewel") || mt.includes("gaveteiro") || mt.includes("ilha")) {
    // Drawers with handles + glass top
    const drawerCount = Math.max(3, Math.min(7, Math.round(ih / 50)));
    const topH = ih * 0.1;
    // Glass top (teal, visible)
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${topH}" fill="#C0DDE8" fill-opacity="0.5" stroke="#3A7A84" stroke-width="1.8"/>`;
    svg += `<text x="${x + w / 2}" y="${y + topH * 0.65}" text-anchor="middle" font-size="${Math.max(6, iw / 14)}" font-weight="bold" fill="#3A7A84" font-family="Arial,sans-serif">VIDRO 8mm</text>`;
    const drawerH = (ih - topH - 8) / drawerCount;
    for (let d = 0; d < drawerCount; d++) {
      const dy = iy + topH + d * drawerH;
      svg += `<rect x="${ix + 6}" y="${dy}" width="${iw - 12}" height="${drawerH - 5}" fill="${materialColor}" fill-opacity="0.12" stroke="#555" stroke-width="1.2" rx="1"/>`;
      // Handle (wider, metallic)
      svg += `<rect x="${x + w / 2 - 12}" y="${dy + drawerH / 2 - 3}" width="24" height="4" rx="2" fill="#777" stroke="#555" stroke-width="0.5"/>`;
      // Velvet divider lines inside
      if (iw > 50) {
        const divCount = Math.min(4, Math.floor(iw / 25));
        for (let dv = 1; dv < divCount; dv++) {
          const dvx = ix + 6 + (iw - 12) / divCount * dv;
          svg += `<line x1="${dvx}" y1="${dy + 3}" x2="${dvx}" y2="${dy + drawerH - 8}" stroke="#8a7a6a" stroke-width="0.8" stroke-dasharray="3,2"/>`;
        }
      }
    }
    if (showInternalDims) {
      const topMm = Math.round(topH * h / ih);
      svg += dimLineInternal(ix - 2, y, ix - 2, y + topH, `${topMm}`, 6, svgPrefix);
      const drawMm = Math.round(drawerH * h / ih);
      for (let d = 0; d < Math.min(3, drawerCount); d++) {
        const dy1 = iy + topH + d * drawerH;
        const dy2 = iy + topH + (d + 1) * drawerH;
        svg += dimLineInternal(ix - 2, dy1, ix - 2, dy2, `${drawMm}`, 6, svgPrefix);
      }
    }
  } else if (sub.includes("suitcase") || mt.includes("maleiro")) {
    // Open space with suitcase silhouettes
    // Light hatching for open space
    for (let hy = iy + 10; hy < iy + ih - 15; hy += 12) {
      svg += `<line x1="${ix + 6}" y1="${hy}" x2="${ix + iw - 6}" y2="${hy}" stroke="#ddd" stroke-width="0.6"/>`;
    }
    // Bottom shelf
    svg += `<rect x="${ix + 6}" y="${iy + ih - 12}" width="${iw - 12}" height="5" fill="#b8b0a0" stroke="#666" stroke-width="1.2"/>`;
    // Suitcase silhouettes (stronger)
    if (iw > 40) {
      const sW = Math.min(iw * 0.35, 30);
      const sH = Math.min(ih * 0.45, 28);
      svg += `<rect x="${ix + iw / 2 - sW - 3}" y="${iy + ih / 2 - sH / 2}" width="${sW}" height="${sH}" rx="4" fill="#a09080" fill-opacity="0.35" stroke="#777" stroke-width="1.2"/>`;
      // Handle on suitcase
      svg += `<line x1="${ix + iw / 2 - sW / 2 - 3}" y1="${iy + ih / 2 - sH / 2 - 3}" x2="${ix + iw / 2 - sW / 2 - 3}" y2="${iy + ih / 2 - sH / 2 + 5}" stroke="#777" stroke-width="1.5"/>`;
      svg += `<rect x="${ix + iw / 2 + 3}" y="${iy + ih / 2 - sH * 0.35}" width="${sW * 0.65}" height="${sH * 0.7}" rx="3" fill="#a09080" fill-opacity="0.3" stroke="#777" stroke-width="1"/>`;
    }
    if (showInternalDims) {
      svg += dimLineInternal(ix - 2, iy, ix - 2, iy + ih, `${h}`, 7, svgPrefix);
    }
  } else {
    // Generic: shelf divisions (visible)
    const divisions = Math.max(2, Math.floor(ih / 80));
    for (let d = 1; d < divisions; d++) {
      const dy = iy + (ih / divisions) * d;
      svg += `<rect x="${ix + 6}" y="${dy}" width="${iw - 12}" height="4" fill="#b8b0a0" stroke="#666" stroke-width="1.2"/>`;
    }
    if (showInternalDims) {
      const spaceMm = Math.round(h / divisions);
      for (let d = 0; d < divisions; d++) {
        const dy1 = iy + (ih / divisions) * d;
        const dy2 = iy + (ih / divisions) * (d + 1);
        svg += dimLineInternal(ix - 2, dy1, ix - 2, dy2, `${spaceMm}`, 6, svgPrefix);
      }
    }
  }

  // Door overlay if doorColor provided and different from material
  if (doorColor && doorColor !== materialColor && (mt.includes("vitrine") || mt.includes("arma") || features.includes("door"))) {
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${doorColor}" fill-opacity="0.08" stroke="${doorColor}" stroke-width="1.5" stroke-dasharray="6,4"/>`;
  }

  // LED feature (extra, for modules that have LED but aren't vitrine/arma/makeup)
  if (features.includes("LED") && !sub.includes("makeup") && !sub.includes("case") && !sub.includes("bag")) {
    svg += `<line x1="${ix + 6}" y1="${iy + 6}" x2="${ix + iw - 6}" y2="${iy + 6}" stroke="#DAA520" stroke-width="2.5" opacity="0.8"/>`;
    svg += `<text x="${ix + iw - 8}" y="${iy + 5}" text-anchor="end" font-size="5" fill="#DAA520" font-family="Arial,sans-serif">LED</text>`;
  }

  // Sensor feature (extra, for modules not already showing sensor)
  if (features.includes("sensor") && !sub.includes("case")) {
    svg += `<circle cx="${ix + iw - 10}" cy="${iy + 10}" r="4" fill="none" stroke="#e74c3c" stroke-width="1.2"/>`;
    svg += `<circle cx="${ix + iw - 10}" cy="${iy + 10}" r="1.5" fill="#e74c3c"/>`;
  }

  return svg;
}

/** Detect subtype and features from a BlueprintModule */
function detectModuleDetails(mod: BlueprintModule): { subtype: string; features: string[] } {
  const id = (mod.moduleId || "").toLowerCase();
  const name = (mod.name || "").toLowerCase();
  const notes = (mod.notes || []).join(" ").toLowerCase();
  const all = id + " " + name + " " + notes;

  let subtype = "generic";
  const features: string[] = [];

  if (all.includes("long_garment") || (all.includes("cabideiro") && all.includes("long"))) subtype = "long_garments";
  else if (all.includes("short_garment") || (all.includes("cabideiro") && all.includes("short"))) subtype = "short_garments";
  else if (all.includes("cabideiro")) subtype = "long_garments";
  else if (all.includes("boot")) subtype = "boots";
  else if (all.includes("shoe") || all.includes("sapateir")) subtype = "shoes";
  else if (all.includes("bag") || all.includes("bolsa") || all.includes("vitrine")) subtype = "bags";
  else if (all.includes("makeup") || all.includes("bancada") || all.includes("vanity")) subtype = "makeup_station";
  else if (all.includes("arma") || all.includes("gun") || all.includes("case")) subtype = "cases";
  else if (all.includes("joia") || all.includes("jewel") || all.includes("gaveteiro") || all.includes("ilha")) subtype = "jewelry";
  else if (all.includes("mala") || all.includes("maleiro") || all.includes("suitcase") || all.includes("luggage")) subtype = "suitcases";
  else if (all.includes("prateleira") || all.includes("shelf")) subtype = "shelves";

  if (all.includes("led")) features.push("LED");
  if (all.includes("sensor")) features.push("sensor");
  if (all.includes("mirror") || all.includes("espelho")) features.push("mirror");
  if (all.includes("glass") || all.includes("vidro")) features.push("glass_door");
  if (all.includes("door") || all.includes("porta")) features.push("door");

  return { subtype, features };
}

/** Get material color from module cut list or blueprint */
function getModuleMaterialColor(mod: BlueprintModule): string {
  const mat = (mod.cutList?.[0]?.material || "").toLowerCase();
  if (mat.includes("lana") || mat.includes("areia")) return MAT_COLORS.bv_lana;
  if (mat.includes("lord")) return MAT_COLORS.bv_lord;
  if (mat.includes("branco")) return MAT_COLORS.mdf_branco;
  return MAT_COLORS.bv_lana; // default warm
}

/** Get door/external material color */
function getDoorMaterialColor(mod: BlueprintModule): string {
  // Door material is typically the second or external material
  const cuts = mod.cutList || [];
  const doorCut = cuts.find(c => (c.piece || "").toLowerCase().includes("porta") || (c.piece || "").toLowerCase().includes("front"));
  if (doorCut) {
    const mat = doorCut.material.toLowerCase();
    if (mat.includes("lord")) return MAT_COLORS.bv_lord;
    if (mat.includes("lana") || mat.includes("areia")) return MAT_COLORS.bv_lana;
  }
  return MAT_COLORS.bv_lord; // default door color
}

/* ============================================================
   SVG: Floor Plan (Top-down view)
   ============================================================ */
function renderFloorPlanSvg(briefing: ParsedBriefing, results: EngineResults): string {
  const walls = briefing.space?.walls || [];
  const zones = briefing.zones || [];
  const ceilingH = briefing.space?.ceiling_height_m || 2.8;

  // Determine room bounds from walls or fallback
  let roomW = 0;
  let roomD = 0;
  if (walls.length >= 2) {
    roomW = Math.max(...walls.map(w => w.length_m)) * 1000;
    const sorted = walls.map(w => w.length_m * 1000).sort((a, b) => b - a);
    roomD = sorted[1] || sorted[0] || 4000;
  }
  if (roomW === 0) roomW = (results.blueprint.mainWall.totalWidth || 5000);
  if (roomD === 0) roomD = roomW * 0.8;

  const scale = Math.min(800 / roomW, 500 / roomD);
  const sW = roomW * scale;
  const sD = roomD * scale;
  const padL = 100, padT = 80, padR = 100, padB = 80;
  const vbW = sW + padL + padR;
  const vbH = sD + padT + padB;

  let svg = `<svg viewBox="0 0 ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:900px;height:auto;display:block;margin:0 auto;background:#fff;">`;
  svg += svgDefs("fp_");

  // Room outline (thick walls)
  svg += `<rect x="${padL}" y="${padT}" width="${sW}" height="${sD}" fill="#FAFAFA" stroke="${STROKE}" stroke-width="4"/>`;

  // Wall labels — use actual wall IDs mapped to positions
  const wallPositions = [
    { x: padL + sW / 2, y: padT - 10, anchor: "middle" },                    // top = first wall
    { x: padL + sW + 15, y: padT + sD / 2, anchor: "start" },               // right = second wall
    { x: padL + sW / 2, y: padT + sD + 25, anchor: "middle" },              // bottom = third wall
    { x: padL - 15, y: padT + sD / 2, anchor: "end" },                       // left = fourth wall
  ];
  for (let i = 0; i < Math.min(walls.length, 4); i++) {
    const wp = wallPositions[i];
    const rawId = (walls[i].id || "").replace(/_/g, " ").replace(/\bwall\b/gi, "").trim();
    const label = rawId ? `Parede ${rawId.charAt(0).toUpperCase() + rawId.slice(1)}` : `Parede ${String.fromCharCode(65 + i)}`;
    svg += `<text x="${wp.x}" y="${wp.y}" text-anchor="${wp.anchor}" font-size="12" font-weight="bold" fill="${STROKE}">${esc(label)}</text>`;
  }

  // External dimensions
  svg += dimLine(padL, padT - 30, padL + sW, padT - 30, `${roomW} mm`, 13, "fp_");
  svg += dimLine(padL - 40, padT, padL - 40, padT + sD, `${roomD} mm`, 13, "fp_");

  // Entry point
  const entry = briefing.space?.entry_point;
  if (entry) {
    const doorW = (entry.width_m || 0.9) * 1000 * scale;
    let dx = padL + sW / 2 - doorW / 2;
    let dy = padT + sD;
    // Find which wall
    const wallIdx = walls.findIndex(w => w.id === entry.wall);
    if (wallIdx === 0) { dx = padL + sW / 2 - doorW / 2; dy = padT; }
    else if (wallIdx === 1) { dx = padL + sW; dy = padT + sD / 2 - doorW / 2; }
    else if (wallIdx === 3) { dx = padL; dy = padT + sD / 2 - doorW / 2; }

    // Door opening
    if (wallIdx === 0 || wallIdx === 2) {
      svg += `<line x1="${dx}" y1="${dy}" x2="${dx + doorW}" y2="${dy}" stroke="#fff" stroke-width="6"/>`;
      svg += `<line x1="${dx}" y1="${dy}" x2="${dx + doorW}" y2="${dy}" stroke="${STROKE}" stroke-width="2" stroke-dasharray="6,3"/>`;
      // Arc
      const arcDir = wallIdx === 2 ? -1 : 1;
      svg += `<path d="M${dx} ${dy} A${doorW} ${doorW} 0 0 ${arcDir > 0 ? 0 : 1} ${dx + doorW} ${dy + doorW * arcDir * 0.7}" fill="none" stroke="${STROKE}" stroke-width="1" stroke-dasharray="4,3"/>`;
    }
    svg += `<text x="${dx + doorW / 2}" y="${dy + (wallIdx === 0 ? -8 : 18)}" text-anchor="middle" font-size="10" fill="${STROKE}">PORTA ${((entry.width_m || 0.9) * 1000).toFixed(0)} mm</text>`;
  }

  // Zones positioned on correct walls based on module notes
  if (zones.length > 0) {
    const allMods = [...(results.blueprint.mainWall.modules || []), ...(results.blueprint.sideWall?.modules || [])];

    // Determine wall and dimensions for each zone
    const fixedZones = zones.map((z, zi) => {
      let wm = z.dimensions?.width_m || 0;
      let dm = z.dimensions?.depth_m || 0;
      let wall = "north"; // default
      let isFreestanding = false;

      // Find modules for this zone using exact "Zona:" tag from notes
      const zoneNameLower = z.name.toLowerCase();
      const zoneModules = allMods.filter(m => {
        const notes = (m.notes || []).join(" ").toLowerCase();
        // Match exact zone tag "zona: <name>" to avoid "closet dela" matching "closet dele"
        return notes.includes("zona: " + zoneNameLower) || notes.includes("zona:" + zoneNameLower);
      });

      // Map wall IDs from briefing and module notes to cardinal directions
      const mapWallToCardinal = (wallId: string): string => {
        const wl = wallId.toLowerCase();
        if (wl.includes("north") || wl === "a") return "north";
        if (wl.includes("south") || wl === "c" || wl.includes("sul")) return "south";
        if (wl.includes("east") || wl === "b") return "east";
        if (wl.includes("west") || wl === "d") return "west";
        // Map common Portuguese wall names: "principal" = first wall = north, "lateral" = second wall = east
        if (wl.includes("principal")) return "north";
        if (wl.includes("lateral")) return "east";
        // If wall is not in mainWall/sideWall, it's likely a third wall = south
        const mainWallId = (briefing.space?.walls?.[0]?.id || "").toLowerCase();
        const sideWallId = (briefing.space?.walls?.[1]?.id || "").toLowerCase();
        if (wl !== mainWallId && wl !== sideWallId) return "south";
        return "north";
      };

      if (zoneModules.length > 0) {
        const noteStr = zoneModules.map(m => (m.notes || []).join(" ").toLowerCase()).join(" ");
        if (noteStr.includes("freestanding") || noteStr.includes("ilha") || noteStr.includes("island")) {
          isFreestanding = true;
        } else {
          // Extract wall ID from "Parede: xxx" in notes
          const paredeMatch = noteStr.match(/parede:\s*([^\s;]+)/);
          if (paredeMatch) {
            wall = mapWallToCardinal(paredeMatch[1]);
          } else if (noteStr.includes("south")) wall = "south";
          else if (noteStr.includes("east")) wall = "east";
          else if (noteStr.includes("west")) wall = "west";
          else wall = "north";
        }

        const totalW = zoneModules.reduce((s, m) => s + m.width, 0);
        const maxD = Math.max(...zoneModules.map(m => m.depth));
        if (wm <= 0) wm = totalW / 1000;
        if (dm <= 0) dm = maxD / 1000;
      } else {
        // Detect freestanding from zone name
        const zn = z.name.toLowerCase();
        if (zn.includes("ilha") || zn.includes("island")) isFreestanding = true;
        else if (zn.includes("corredor")) { wall = "west"; }
        else if (zn.includes("makeup") || zn.includes("arma")) { wall = "east"; }
      }

      if (wm <= 0) wm = roomW / 1000 / zones.length;
      if (dm <= 0) dm = 0.6;

      return { ...z, _wm: wm, _dm: dm, _wall: wall, _freestanding: isFreestanding, _zi: zi };
    });

    // Group zones by wall
    const wallGroups: Record<string, typeof fixedZones> = { north: [], south: [], east: [], west: [], center: [] };
    for (const z of fixedZones) {
      if (z._freestanding) wallGroups.center.push(z);
      else wallGroups[z._wall]?.push(z) || wallGroups.north.push(z);
    }

    const margin = 6;

    // Render zones on each wall
    const renderZoneRect = (zx: number, zy: number, sw: number, sh: number, z: typeof fixedZones[0]) => {
      const color = ZONE_COLORS[z._zi % ZONE_COLORS.length];
      // Zone background
      svg += `<rect x="${zx}" y="${zy}" width="${sw}" height="${sh}" fill="${color}" stroke="${STROKE}" stroke-width="1.2" rx="2"/>`;
      // Subtle hatch
      const hSp = 12 + (z._zi % 4) * 3;
      for (let hx = 0; hx < sw + sh; hx += hSp) {
        svg += `<line x1="${zx + hx}" y1="${zy}" x2="${zx + hx - sh}" y2="${zy + sh}" stroke="${STROKE}" stroke-width="0.15" opacity="0.25"/>`;
      }
      // Zone name
      const fSize = Math.min(12, Math.min(sw, sh) / 6);
      svg += `<text x="${zx + sw / 2}" y="${zy + sh / 2 - fSize * 0.2}" text-anchor="middle" font-size="${fSize}" font-weight="bold" fill="${STROKE}" paint-order="stroke" stroke="${color}" stroke-width="3" font-family="Arial,sans-serif">${esc(z.name)}</text>`;
      const dimWmm = (z._wm * 1000).toFixed(0);
      const dimDmm = (z._dm * 1000).toFixed(0);
      svg += `<text x="${zx + sw / 2}" y="${zy + sh / 2 + fSize * 0.8}" text-anchor="middle" font-size="${fSize * 0.65}" fill="#555" paint-order="stroke" stroke="${color}" stroke-width="2" font-family="Arial,sans-serif">${dimWmm}×${dimDmm} mm</text>`;
    };

    // North wall (top) — zones extend downward
    if (wallGroups.north.length > 0) {
      const totalW = wallGroups.north.reduce((s, z) => s + z._wm, 0);
      let cx = padL + 4;
      for (const z of wallGroups.north) {
        const sw = (z._wm / totalW) * (sW - 8 - margin * (wallGroups.north.length - 1));
        const sh = Math.min(z._dm * 1000 * scale, sD * 0.4);
        renderZoneRect(cx, padT + 4, sw, sh, z);
        cx += sw + margin;
      }
    }

    // South wall (bottom) — zones extend upward
    if (wallGroups.south.length > 0) {
      const totalW = wallGroups.south.reduce((s, z) => s + z._wm, 0);
      let cx = padL + 4;
      for (const z of wallGroups.south) {
        const sw = (z._wm / totalW) * (sW - 8 - margin * (wallGroups.south.length - 1));
        const sh = Math.min(z._dm * 1000 * scale, sD * 0.4);
        renderZoneRect(cx, padT + sD - sh - 4, sw, sh, z);
        cx += sw + margin;
      }
    }

    // West wall (left) — zones extend rightward
    if (wallGroups.west.length > 0) {
      const totalH = wallGroups.west.reduce((s, z) => s + z._wm, 0);
      let cy = padT + 4;
      // Skip overlap with north/south zones
      const topOffset = wallGroups.north.length > 0 ? sD * 0.35 : 0;
      const botOffset = wallGroups.south.length > 0 ? sD * 0.35 : 0;
      cy = padT + topOffset + 4;
      const availH = sD - topOffset - botOffset - 8;
      for (const z of wallGroups.west) {
        const sh = (z._wm / totalH) * (availH - margin * (wallGroups.west.length - 1));
        const sw = Math.min(z._dm * 1000 * scale, sW * 0.25);
        renderZoneRect(padL + 4, cy, sw, sh, z);
        cy += sh + margin;
      }
    }

    // East wall (right) — zones extend leftward
    if (wallGroups.east.length > 0) {
      const totalH = wallGroups.east.reduce((s, z) => s + z._wm, 0);
      const topOffset = wallGroups.north.length > 0 ? sD * 0.35 : 0;
      const botOffset = wallGroups.south.length > 0 ? sD * 0.35 : 0;
      let cy = padT + topOffset + 4;
      const availH = sD - topOffset - botOffset - 8;
      for (const z of wallGroups.east) {
        const sh = (z._wm / totalH) * (availH - margin * (wallGroups.east.length - 1));
        const sw = Math.min(z._dm * 1000 * scale, sW * 0.25);
        renderZoneRect(padL + sW - sw - 4, cy, sw, sh, z);
        cy += sh + margin;
      }
    }

    // Freestanding (center) — positioned in room center
    if (wallGroups.center.length > 0) {
      for (const z of wallGroups.center) {
        const sw = Math.min(z._wm * 1000 * scale, sW * 0.3);
        const sh = Math.min(z._dm * 1000 * scale, sD * 0.25);
        const cx = padL + sW / 2 - sw / 2;
        const cy = padT + sD / 2 - sh / 2;
        renderZoneRect(cx, cy, sw, sh, z);
        // Dashed border for freestanding
        svg += `<rect x="${cx}" y="${cy}" width="${sw}" height="${sh}" fill="none" stroke="${GOLD}" stroke-width="1.5" stroke-dasharray="6,3" rx="2"/>`;
      }
    }
  }

  // North symbol
  const nx = padL + sW - 40, ny = padT + 25;
  svg += `<circle cx="${nx}" cy="${ny}" r="15" fill="none" stroke="${STROKE}" stroke-width="1"/>`;
  svg += `<text x="${nx}" y="${ny - 5}" text-anchor="middle" font-size="10" font-weight="bold" fill="${STROKE}">N</text>`;
  svg += `<line x1="${nx}" y1="${ny + 12}" x2="${nx}" y2="${ny - 12}" stroke="${STROKE}" stroke-width="1.5" marker-end="url(#fp_arrowBlkE)"/>`;

  // Section cut indicators
  const cuts = [
    { label: "A", x1: padL - 15, y1: padT + sD * 0.3, x2: padL + sW + 15, y2: padT + sD * 0.3 },
    { label: "B", x1: padL + sW * 0.25, y1: padT - 15, x2: padL + sW * 0.25, y2: padT + sD + 15 },
  ];
  for (const c of cuts) {
    svg += `<line x1="${c.x1}" y1="${c.y1}" x2="${c.x2}" y2="${c.y2}" stroke="#666" stroke-width="0.8" stroke-dasharray="12,4,2,4"/>`;
    svg += `<circle cx="${c.x1}" cy="${c.y1}" r="10" fill="${STROKE}" stroke="none"/>`;
    svg += `<text x="${c.x1}" y="${c.y1 + 4}" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff">${c.label}</text>`;
    svg += `<circle cx="${c.x2}" cy="${c.y2}" r="10" fill="${STROKE}" stroke="none"/>`;
    svg += `<text x="${c.x2}" y="${c.y2 + 4}" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff">${c.label}</text>`;
  }

  // Scale bar
  const scaleBarW = 1000 * scale;
  svg += `<rect x="${padL}" y="${padT + sD + 40}" width="${scaleBarW}" height="5" fill="${STROKE}"/>`;
  svg += `<text x="${padL}" y="${padT + sD + 60}" font-size="10" fill="${STROKE}">0</text>`;
  svg += `<text x="${padL + scaleBarW}" y="${padT + sD + 60}" text-anchor="end" font-size="10" fill="${STROKE}">1000 mm</text>`;

  svg += `</svg>`;
  return svg;
}

/* ============================================================
   SVG: Wall Elevation
   ============================================================ */
function renderWallSvg(
  title: string,
  totalWidth: number,
  modules: BlueprintModule[],
  wallHeight: number = 2400,
  prefix: string = "w",
): string {
  const wallW = totalWidth || 3000;
  const wallH = Math.max(wallHeight, ...modules.map(m => (m.position?.y || 0) + m.height));
  const padL = 100, padR = 60, padT = 40, padB = 80;
  const vbW = wallW + padL + padR;
  const vbH = wallH + padT + padB;

  let svg = `<svg viewBox="0 0 ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:900px;height:auto;display:block;margin:0 auto;background:#fff;">`;
  svg += svgDefs(`${prefix}_`);

  // Wall background
  svg += `<rect x="${padL}" y="${padT}" width="${wallW}" height="${wallH}" fill="#FEFEFE" stroke="${STROKE}" stroke-width="3"/>`;

  // Floor line (thick)
  svg += `<line x1="${padL - 20}" y1="${padT + wallH}" x2="${padL + wallW + 20}" y2="${padT + wallH}" stroke="${STROKE}" stroke-width="5"/>`;
  // Floor hatch
  for (let hx = padL - 20; hx < padL + wallW + 20; hx += 15) {
    svg += `<line x1="${hx}" y1="${padT + wallH}" x2="${hx - 8}" y2="${padT + wallH + 8}" stroke="${STROKE}" stroke-width="0.5"/>`;
  }

  // Ceiling line (dashed)
  svg += `<line x1="${padL - 20}" y1="${padT}" x2="${padL + wallW + 20}" y2="${padT}" stroke="#999" stroke-width="1.5" stroke-dasharray="10,5"/>`;

  // Modules
  for (const mod of modules) {
    const mx = padL + (mod.position?.x || 0);
    const my = padT + wallH - (mod.position?.y || 0) - mod.height;
    const { subtype, features } = detectModuleDetails(mod);
    const matColor = getModuleMaterialColor(mod);
    const doorCol = getDoorMaterialColor(mod);

    // Render detailed interior via renderModuleInterior
    svg += renderModuleInterior(
      mod.moduleId || mod.name || "",
      subtype, mx, my, mod.width, mod.height,
      features, matColor, doorCol,
    );

    // Module name label (below interior)
    const fontSize = Math.max(9, Math.min(14, mod.width / 12, mod.height / 10));
    svg += `<text x="${mx + mod.width / 2}" y="${my + mod.height - fontSize * 0.3}" text-anchor="middle" font-size="${fontSize}" font-weight="bold" fill="#333" font-family="Arial,sans-serif" paint-order="stroke" stroke="#fff" stroke-width="2">${esc(mod.name)}</text>`;
    svg += `<text x="${mx + mod.width / 2}" y="${my + mod.height - fontSize * 0.3 + fontSize * 0.9}" text-anchor="middle" font-size="${fontSize * 0.7}" fill="#555" font-family="Arial,sans-serif" paint-order="stroke" stroke="#fff" stroke-width="1.5">${mod.width}x${mod.height}x${mod.depth}</text>`;

    // Material label with swatch (ITEM 5)
    const matLabel = mod.cutList?.[0]?.material || "MDF 18mm";
    const matHex = getColorForMaterial(matLabel);
    const doorCut = mod.cutList?.find(c => (c.piece || "").toLowerCase().includes("porta"));
    const doorLabel = doorCut?.material || "";
    const mlY = my + 8;
    svg += `<rect x="${mx + 4}" y="${mlY}" width="8" height="8" fill="${matHex}" stroke="#999" stroke-width="0.3" rx="1"/>`;
    svg += `<text x="${mx + 15}" y="${mlY + 7}" font-size="6" fill="#666" font-family="Arial,sans-serif" paint-order="stroke" stroke="#fff" stroke-width="1">${esc(matLabel.slice(0, 20))}</text>`;
    if (doorLabel && doorLabel !== matLabel) {
      const doorHex = getColorForMaterial(doorLabel);
      svg += `<rect x="${mx + 4}" y="${mlY + 11}" width="8" height="8" fill="${doorHex}" stroke="#999" stroke-width="0.3" rx="1"/>`;
      svg += `<text x="${mx + 15}" y="${mlY + 18}" font-size="6" fill="#666" font-family="Arial,sans-serif" paint-order="stroke" stroke="#fff" stroke-width="1">Porta: ${esc(doorLabel.slice(0, 18))}</text>`;
    }

    // Module width dimension below each module
    const dimY = padT + wallH + 12;
    svg += dimLine(mx, dimY, mx + mod.width, dimY, `${mod.width}`, 10, `${prefix}_`);

    // Module height dimension (right side)
    if (mod.height > 600) {
      svg += dimLine(mx + mod.width + 8, my, mx + mod.width + 8, my + mod.height, `${mod.height}`, 9, `${prefix}_`);
    }
  }

  // Overall wall width dimension
  svg += dimLine(padL, padT + wallH + 35, padL + wallW, padT + wallH + 35, `${wallW} mm`, 14, `${prefix}_`);

  // Overall wall height dimension
  svg += dimLine(padL - 45, padT, padL - 45, padT + wallH, `${wallH} mm`, 13, `${prefix}_`);

  // Material color swatches
  const materials = new Set(modules.map(m => m.cutList?.[0]?.material || "MDF 18mm"));
  let swatchX = padL;
  for (const mat of materials) {
    svg += `<rect x="${swatchX}" y="${padT - 25}" width="12" height="12" fill="#ccc" stroke="${STROKE}" stroke-width="0.5"/>`;
    svg += `<text x="${swatchX + 16}" y="${padT - 15}" font-size="9" fill="#666" font-family="Arial,sans-serif">${esc(mat)}</text>`;
    swatchX += 120;
  }

  svg += `</svg>`;
  return svg;
}

/* ============================================================
   SVG: Wall Exploded Interior View (sem portas)
   Shows each module's internal compartments with individual dims.
   Reference: "Vista Frontal - Interior Armário" (SketchUp Layout)
   ============================================================ */
function renderWallExplodedSvg(
  title: string,
  totalWidth: number,
  modules: BlueprintModule[],
  wallHeight: number = 2400,
  prefix: string = "ex",
): string {
  const wallW = totalWidth || 3000;
  const wallH = Math.max(wallHeight, ...modules.map(m => (m.position?.y || 0) + m.height));
  const padL = 120, padR = 80, padT = 50, padB = 100;
  const vbW = wallW + padL + padR;
  const vbH = wallH + padT + padB;

  let svg = `<svg viewBox="0 0 ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:960px;height:auto;display:block;margin:0 auto;background:#fff;">`;
  svg += svgDefs(`${prefix}_`);

  // Title inside SVG
  svg += `<text x="${padL + wallW / 2}" y="${padT - 20}" text-anchor="middle" font-size="14" font-weight="bold" fill="${STROKE}" font-family="Arial,sans-serif">VISTA FRONTAL INTERIOR — ${esc(title)} (SEM PORTAS)</text>`;

  // Wall outline (dashed to indicate "open" / doors removed)
  svg += `<rect x="${padL}" y="${padT}" width="${wallW}" height="${wallH}" fill="#FDFDFD" stroke="${STROKE}" stroke-width="2" stroke-dasharray="8,4"/>`;

  // Floor line (thick) with hatch
  svg += `<line x1="${padL - 20}" y1="${padT + wallH}" x2="${padL + wallW + 20}" y2="${padT + wallH}" stroke="${STROKE}" stroke-width="5"/>`;
  for (let hx = padL - 20; hx < padL + wallW + 20; hx += 15) {
    svg += `<line x1="${hx}" y1="${padT + wallH}" x2="${hx - 8}" y2="${padT + wallH + 8}" stroke="${STROKE}" stroke-width="0.5"/>`;
  }

  // Ceiling line
  svg += `<line x1="${padL - 20}" y1="${padT}" x2="${padL + wallW + 20}" y2="${padT}" stroke="#999" stroke-width="1.5" stroke-dasharray="10,5"/>`;
  svg += `<text x="${padL - 25}" y="${padT + 4}" text-anchor="end" font-size="9" fill="#999" font-family="Arial,sans-serif">TETO</text>`;

  // Render each module interior with full internal dimensions
  for (const mod of modules) {
    const mx = padL + (mod.position?.x || 0);
    const my = padT + wallH - (mod.position?.y || 0) - mod.height;
    const { subtype, features } = detectModuleDetails(mod);
    const matColor = getModuleMaterialColor(mod);
    const doorCol = getDoorMaterialColor(mod);

    // Render interior WITH internal dims enabled
    svg += renderModuleInterior(
      mod.moduleId || mod.name || "",
      subtype, mx, my, mod.width, mod.height,
      features, matColor, doorCol,
      `${prefix}_`, true,
    );

    // Module name label (bottom of module)
    const fontSize = Math.max(9, Math.min(13, mod.width / 14));
    svg += `<text x="${mx + mod.width / 2}" y="${my + mod.height - fontSize * 0.3}" text-anchor="middle" font-size="${fontSize}" font-weight="bold" fill="#333" font-family="Arial,sans-serif" paint-order="stroke" stroke="#fff" stroke-width="2">${esc(mod.name)}</text>`;

    // Subtype label
    const subtypeLabel = subtype.replace(/_/g, " ").toUpperCase();
    svg += `<text x="${mx + mod.width / 2}" y="${my + mod.height - fontSize * 0.3 + fontSize}" text-anchor="middle" font-size="${fontSize * 0.65}" fill="#888" font-family="Arial,sans-serif" paint-order="stroke" stroke="#fff" stroke-width="1">${subtypeLabel}</text>`;

    // Module external width dim (below floor)
    const dimY = padT + wallH + 15;
    svg += dimLine(mx, dimY, mx + mod.width, dimY, `${mod.width}`, 10, `${prefix}_`);

    // Module height dim (right side of each module)
    svg += dimLine(mx + mod.width + 12, my, mx + mod.width + 12, my + mod.height, `${mod.height}`, 9, `${prefix}_`);

    // Internal width dim at top of each module
    svg += dimLine(mx + 4, my - 8, mx + mod.width - 4, my - 8, `${mod.width - 36}i`, 8, `${prefix}_`);

    // Vertical separator between modules (dashed)
    if (mod.position?.x && mod.position.x > 0) {
      svg += `<line x1="${mx}" y1="${padT}" x2="${mx}" y2="${padT + wallH}" stroke="#bbb" stroke-width="0.5" stroke-dasharray="4,4"/>`;
    }
  }

  // Overall wall width dimension
  svg += dimLine(padL, padT + wallH + 45, padL + wallW, padT + wallH + 45, `TOTAL: ${wallW} mm`, 13, `${prefix}_`);

  // Overall wall height dimension
  svg += dimLine(padL - 55, padT, padL - 55, padT + wallH, `${wallH} mm`, 12, `${prefix}_`);

  // Legend
  const legX = padL, legY = padT + wallH + 65;
  svg += `<text x="${legX}" y="${legY}" font-size="9" fill="#666" font-family="Arial,sans-serif" font-weight="bold">LEGENDA:</text>`;
  svg += `<line x1="${legX + 60}" y1="${legY - 3}" x2="${legX + 80}" y2="${legY - 3}" stroke="#666" stroke-width="3" stroke-linecap="round"/>`;
  svg += `<text x="${legX + 84}" y="${legY}" font-size="8" fill="#666" font-family="Arial,sans-serif">Barra cabideiro</text>`;
  svg += `<line x1="${legX + 160}" y1="${legY - 3}" x2="${legX + 180}" y2="${legY - 3}" stroke="#6AAAB0" stroke-width="1.2" stroke-dasharray="6,3"/>`;
  svg += `<text x="${legX + 184}" y="${legY}" font-size="8" fill="#666" font-family="Arial,sans-serif">Prateleira vidro</text>`;
  svg += `<line x1="${legX + 270}" y1="${legY - 3}" x2="${legX + 290}" y2="${legY - 3}" stroke="#FFD700" stroke-width="2"/>`;
  svg += `<text x="${legX + 294}" y="${legY}" font-size="8" fill="#666" font-family="Arial,sans-serif">Fita LED</text>`;
  svg += `<line x1="${legX + 340}" y1="${legY - 3}" x2="${legX + 360}" y2="${legY - 3}" stroke="#999" stroke-width="1.2"/>`;
  svg += `<text x="${legX + 364}" y="${legY}" font-size="8" fill="#666" font-family="Arial,sans-serif">Prateleira MDP</text>`;
  svg += `<rect x="${legX + 440}" y="${legY - 7}" width="12" height="8" fill="#E8F4F8" stroke="#6AAAB0" stroke-width="0.5"/>`;
  svg += `<text x="${legX + 456}" y="${legY}" font-size="8" fill="#666" font-family="Arial,sans-serif">Espelho</text>`;

  // "SEM PORTAS" watermark
  svg += `<text x="${padL + wallW / 2}" y="${padT + wallH / 2}" text-anchor="middle" font-size="40" fill="#eee" font-weight="900" font-family="Arial,sans-serif" opacity="0.3" transform="rotate(-30 ${padL + wallW / 2} ${padT + wallH / 2})">SEM PORTAS</text>`;

  svg += `</svg>`;
  return svg;
}

/* ============================================================
   SVG: Island 4-View
   ============================================================ */
function renderIslandSvg(
  briefing: ParsedBriefing,
  modules: BlueprintModule[],
): string {
  // Find island modules or use defaults
  const islandMods = modules.filter(m => {
    const id = (m.moduleId || "").toLowerCase();
    const nm = (m.name || "").toLowerCase();
    return id.includes("ilha") || nm.includes("ilha") || nm.includes("island");
  });

  // Dimensions from modules or briefing zones
  let iW = 1200, iH = 900, iD = 600;
  if (islandMods.length > 0) {
    iW = Math.max(...islandMods.map(m => m.width));
    iH = Math.max(...islandMods.map(m => m.height));
    iD = Math.max(...islandMods.map(m => m.depth));
  } else {
    const islandZone = (briefing.zones || []).find(z => z.name.toLowerCase().includes("ilha"));
    if (islandZone?.dimensions) {
      iW = (islandZone.dimensions.width_m || 1.2) * 1000;
      iD = (islandZone.dimensions.depth_m || 0.6) * 1000;
    }
  }

  // Get drawer categories from briefing
  const islandZone = (briefing.zones || []).find(z => z.name.toLowerCase().includes("ilha"));
  const drawerCategories = islandZone?.items
    ?.find(it => it.type === "drawers")?.categories || ["Joias", "Oculos", "Lingerie", "Pijamas", "Biquinis", "Cintos", "Acessorios"];

  const viewW = 350, viewH = 250;
  const gap = 30;
  const totalW = viewW * 2 + gap * 3;
  const totalH = viewH * 2 + gap * 3 + 40;

  let svg = `<svg viewBox="0 0 ${totalW} ${totalH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:900px;height:auto;display:block;margin:0 auto;background:#fff;">`;
  svg += svgDefs("isl_");

  const views = [
    { label: "VISTA FRONTAL", ox: gap, oy: gap + 20, w: iW, h: iH },
    { label: "VISTA POSTERIOR", ox: viewW + gap * 2, oy: gap + 20, w: iW, h: iH },
    { label: "VISTA LATERAL ESQ", ox: gap, oy: viewH + gap * 2 + 20, w: iD, h: iH },
    { label: "VISTA LATERAL DIR", ox: viewW + gap * 2, oy: viewH + gap * 2 + 20, w: iD, h: iH },
  ];

  for (const v of views) {
    const scaleX = (viewW - 60) / v.w;
    const scaleY = (viewH - 60) / v.h;
    const sc = Math.min(scaleX, scaleY);
    const rw = v.w * sc;
    const rh = v.h * sc;
    const rx = v.ox + (viewW - rw) / 2;
    const ry = v.oy + 20 + (viewH - 40 - rh) / 2;

    // Label
    svg += `<text x="${v.ox + viewW / 2}" y="${v.oy}" text-anchor="middle" font-size="11" font-weight="bold" fill="${STROKE}" font-family="Arial,sans-serif">${v.label}</text>`;

    // Main body with material color
    svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${MAT_COLORS.bv_lana}" fill-opacity="0.3" stroke="${STROKE}" stroke-width="1.5"/>`;
    // 18mm thickness lines
    svg += `<line x1="${rx + 3}" y1="${ry}" x2="${rx + 3}" y2="${ry + rh}" stroke="#aaa" stroke-width="0.5"/>`;
    svg += `<line x1="${rx + rw - 3}" y1="${ry}" x2="${rx + rw - 3}" y2="${ry + rh}" stroke="#aaa" stroke-width="0.5"/>`;

    // Glass top (dashed, blue tint) — all views
    const glassH = rh * 0.07;
    svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${glassH}" fill="#D0E8F0" fill-opacity="0.5" stroke="#6AAAB0" stroke-width="0.8" stroke-dasharray="6,3"/>`;
    svg += `<text x="${rx + rw / 2}" y="${ry + glassH * 0.7}" text-anchor="middle" font-size="7" fill="#366" font-family="Arial,sans-serif">VIDRO TEMPERADO 8mm</text>`;

    if (v.label.includes("FRONTAL") || v.label.includes("POSTERIOR")) {
      // Drawer divisions with handles and velvet dividers
      const numDrawers = Math.min(drawerCategories.length, 7);
      const drawerH = (rh * 0.86) / numDrawers;
      const startY = ry + glassH + 4;

      // Top compartment: velvet dividers
      const topH = drawerH * 0.8;
      svg += `<rect x="${rx + 3}" y="${startY}" width="${rw - 6}" height="${topH}" fill="#F5F0E8" stroke="#999" stroke-width="0.8" rx="1"/>`;
      // Velvet divider grid inside top
      const divCols = Math.min(5, Math.floor(rw / 30));
      for (let dc = 1; dc < divCols; dc++) {
        const dvx = rx + 3 + (rw - 6) / divCols * dc;
        svg += `<line x1="${dvx}" y1="${startY + 2}" x2="${dvx}" y2="${startY + topH - 2}" stroke="#c8b8a0" stroke-width="0.6" stroke-dasharray="3,2"/>`;
      }
      const divRows = 2;
      for (let dr = 1; dr < divRows; dr++) {
        const dvy = startY + topH / divRows * dr;
        svg += `<line x1="${rx + 5}" y1="${dvy}" x2="${rx + rw - 5}" y2="${dvy}" stroke="#c8b8a0" stroke-width="0.6" stroke-dasharray="3,2"/>`;
      }
      const catLabel0 = drawerCategories[0] || "Joias";
      svg += `<text x="${rx + rw / 2}" y="${startY + topH / 2 + 3}" text-anchor="middle" font-size="7" fill="#888" font-family="Arial,sans-serif">${esc(catLabel0)} (veludo)</text>`;

      // Remaining drawers
      for (let d = 1; d < numDrawers; d++) {
        const dy = startY + topH + 4 + (d - 1) * drawerH;
        svg += `<rect x="${rx + 3}" y="${dy}" width="${rw - 6}" height="${drawerH - 4}" fill="${MAT_COLORS.bv_lana}" fill-opacity="0.15" stroke="#999" stroke-width="0.8" rx="1"/>`;
        // Handle (rectangular pull)
        svg += `<rect x="${rx + rw / 2 - 12}" y="${dy + drawerH / 2 - 3}" width="24" height="3.5" rx="1.5" fill="#888"/>`;
        // Category label
        const catLabel = drawerCategories[d] || `Gaveta ${d + 1}`;
        svg += `<text x="${rx + rw / 2}" y="${dy + drawerH / 2 + 8}" text-anchor="middle" font-size="7" fill="#666" font-family="Arial,sans-serif">${esc(catLabel)}</text>`;
      }
      svg += `<text x="${rx + rw / 2}" y="${ry + rh + 14}" text-anchor="middle" font-size="7" fill="#888" font-style="italic" font-family="Arial,sans-serif">Divisores em veludo | Corredicas telescopicas soft-close</text>`;
    } else {
      // Side views — show telescopic slide cross-section
      const sideDrawers = Math.min(5, drawerCategories.length);
      const drawerH = (rh * 0.86) / sideDrawers;
      const startY = ry + glassH + 4;
      for (let d = 0; d < sideDrawers; d++) {
        const dy = startY + d * drawerH;
        svg += `<rect x="${rx + 3}" y="${dy}" width="${rw - 6}" height="${drawerH - 4}" fill="${MAT_COLORS.bv_lana}" fill-opacity="0.15" stroke="#999" stroke-width="0.8" rx="1"/>`;
        // Telescopic slide indicator (arrow showing extension)
        const slideY = dy + drawerH / 2 - 1;
        svg += `<line x1="${rx + 6}" y1="${slideY}" x2="${rx + rw - 6}" y2="${slideY}" stroke="#888" stroke-width="0.8" stroke-dasharray="4,2"/>`;
        svg += `<polygon points="${rx + rw - 8},${slideY - 3} ${rx + rw - 2},${slideY} ${rx + rw - 8},${slideY + 3}" fill="#888"/>`;
      }
      svg += `<text x="${rx + rw / 2}" y="${ry + rh + 14}" text-anchor="middle" font-size="7" fill="#888" font-style="italic" font-family="Arial,sans-serif">Corredicas telescopicas full-extension</text>`;
    }

    // Dimensions
    svg += dimLine(rx, ry + rh + 5, rx + rw, ry + rh + 5, `${v.w}`, 9, "isl_");
    svg += dimLine(rx - 12, ry, rx - 12, ry + rh, `${v.h}`, 9, "isl_");
  }

  // 5th view: VISTA SUPERIOR (top-down)
  const topViewW = totalW - gap * 2;
  const topViewH = 140;
  const topY0 = totalH;
  const newTotalH = totalH + topViewH + gap + 20;

  // Extend SVG viewBox — we'll rebuild the svg tag
  svg = svg.replace(
    `viewBox="0 0 ${totalW} ${totalH}"`,
    `viewBox="0 0 ${totalW} ${newTotalH}"`,
  );

  const tScX = (topViewW - 40) / iW;
  const tScY = (topViewH - 40) / iD;
  const tSc = Math.min(tScX, tScY);
  const tW = iW * tSc;
  const tD = iD * tSc;
  const tX = gap + (topViewW - tW) / 2;
  const tY = topY0 + 20;

  svg += `<text x="${totalW / 2}" y="${topY0 + 12}" text-anchor="middle" font-size="11" font-weight="bold" fill="${STROKE}" font-family="Arial,sans-serif">VISTA SUPERIOR (TOP-DOWN)</text>`;

  // Outer tampo outline
  svg += `<rect x="${tX}" y="${tY}" width="${tW}" height="${tD}" fill="#D0E8F0" fill-opacity="0.3" stroke="${STROKE}" stroke-width="1.5" rx="2"/>`;
  svg += `<text x="${tX + tW / 2}" y="${tY + 10}" text-anchor="middle" font-size="7" fill="#366" font-family="Arial,sans-serif">TAMPO VIDRO TEMPERADO 8mm</text>`;

  // Internal dividers (velvet)
  const topCats = drawerCategories.length > 0 ? drawerCategories : ["Joias", "Oculos"];
  const cols = Math.min(topCats.length, 6);
  const cellW = tW / cols;
  for (let c = 1; c < cols; c++) {
    const dx = tX + cellW * c;
    svg += `<line x1="${dx}" y1="${tY + 14}" x2="${dx}" y2="${tY + tD - 4}" stroke="#c8b8a0" stroke-width="0.8" stroke-dasharray="4,2"/>`;
  }
  // Category labels inside each cell
  for (let c = 0; c < cols; c++) {
    const cx = tX + cellW * c + cellW / 2;
    svg += `<text x="${cx}" y="${tY + tD / 2 + 4}" text-anchor="middle" font-size="7" fill="#888" font-family="Arial,sans-serif">${esc(topCats[c] || "")}</text>`;
  }

  // Dims
  svg += dimLine(tX, tY + tD + 6, tX + tW, tY + tD + 6, `${iW}`, 9, "isl_");
  svg += dimLine(tX - 12, tY, tX - 12, tY + tD, `${iD}`, 9, "isl_");

  svg += `</svg>`;
  return svg;
}

/* ============================================================
   SVG: Nesting Sheet
   ============================================================ */
function renderSheetSvg(sheet: Sheet, sheetIdx: number): string {
  const padL = 40, padR = 20, padT = 15, padB = 25;
  // Scale down to max 800px wide
  const maxDrawW = 800;
  const sc = Math.min(1, (maxDrawW - padL - padR) / sheet.width);
  const drawW = sheet.width * sc;
  const drawH = sheet.height * sc;
  const vbW = drawW + padL + padR;
  const vbH = drawH + padT + padB;

  let svg = `<svg viewBox="0 0 ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${maxDrawW}px;height:auto;display:block;margin:0 auto;background:#fff;">`;
  svg += svgDefs(`sh${sheetIdx}_`);

  // Sheet background
  svg += `<rect x="${padL}" y="${padT}" width="${drawW}" height="${drawH}" fill="#F8F6F0" stroke="${STROKE}" stroke-width="2"/>`;
  // Grid lines
  for (let gx = 0; gx < sheet.width; gx += 250) {
    svg += `<line x1="${padL + gx * sc}" y1="${padT}" x2="${padL + gx * sc}" y2="${padT + drawH}" stroke="#eee" stroke-width="0.3"/>`;
  }
  for (let gy = 0; gy < sheet.height; gy += 250) {
    svg += `<line x1="${padL}" y1="${padT + gy * sc}" x2="${padL + drawW}" y2="${padT + gy * sc}" stroke="#eee" stroke-width="0.3"/>`;
  }

  // Waste area hachura (draw first, items go on top)
  // We approximate waste as the full sheet minus item rects
  // Diagonal red hatch over entire sheet, items will cover
  for (let hx = 0; hx < sheet.width + sheet.height; hx += 20) {
    const x1 = padL + Math.max(0, hx - sheet.height) * sc;
    const y1 = padT + Math.min(hx, sheet.height) * sc;
    const x2 = padL + Math.min(hx, sheet.width) * sc;
    const y2 = padT + Math.max(0, hx - sheet.width) * sc;
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#e74c3c" stroke-width="0.3" opacity="0.2"/>`;
  }

  // Placed items with type-based colors
  for (let i = 0; i < sheet.items.length; i++) {
    const item = sheet.items[i];
    const ix = padL + item.x * sc;
    const iy = padT + item.y * sc;
    const iw = item.width * sc;
    const ih = item.height * sc;

    // Determine piece type color
    const pn = (item.partName || "").toLowerCase();
    let color = PIECE_TYPE_COLORS.default;
    if (pn.includes("lateral") || pn.includes("lado")) color = PIECE_TYPE_COLORS.lateral;
    else if (pn.includes("tampo") || pn.includes("base") || pn.includes("piso")) color = PIECE_TYPE_COLORS.tampo;
    else if (pn.includes("fundo") || pn.includes("costas")) color = PIECE_TYPE_COLORS.fundo;
    else if (pn.includes("porta") || pn.includes("front")) color = PIECE_TYPE_COLORS.porta;
    else if (pn.includes("prateleira") || pn.includes("shelf")) color = PIECE_TYPE_COLORS.prateleira;
    else if (pn.includes("frente") || pn.includes("gaveta")) color = PIECE_TYPE_COLORS.frente_gaveta;
    else if (pn.includes("divisor") || pn.includes("divis")) color = PIECE_TYPE_COLORS.divisoria;

    svg += `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="${color}" stroke="${STROKE}" stroke-width="0.8"/>`;

    // Grain direction — arrow inside piece
    if (item.grainDirection === "vertical" && ih > 20) {
      const arrowX = ix + iw - 8;
      svg += `<line x1="${arrowX}" y1="${iy + 6}" x2="${arrowX}" y2="${iy + ih - 6}" stroke="#666" stroke-width="0.8"/>`;
      svg += `<polygon points="${arrowX - 3},${iy + 10} ${arrowX},${iy + 5} ${arrowX + 3},${iy + 10}" fill="#666"/>`;
      svg += `<text x="${arrowX}" y="${iy + ih - 3}" text-anchor="middle" font-size="5" fill="#666">↕</text>`;
    } else if (item.grainDirection === "horizontal" && iw > 20) {
      const arrowY = iy + ih - 8;
      svg += `<line x1="${ix + 6}" y1="${arrowY}" x2="${ix + iw - 6}" y2="${arrowY}" stroke="#666" stroke-width="0.8"/>`;
      svg += `<polygon points="${ix + iw - 10},${arrowY - 3} ${ix + iw - 5},${arrowY} ${ix + iw - 10},${arrowY + 3}" fill="#666"/>`;
    }

    // Rotated indicator
    if (item.rotated && iw > 25 && ih > 15) {
      svg += `<text x="${ix + iw - 10}" y="${iy + 10}" font-size="9" fill="#e67e22" font-family="Arial,sans-serif">↻</text>`;
    }

    // Labels inside
    const fontSize = Math.max(5, Math.min(11, iw / 12, ih / 4));
    if (iw > 30 && ih > 15) {
      svg += `<text x="${ix + 3}" y="${iy + fontSize + 2}" font-size="${fontSize}" font-weight="bold" fill="#333" font-family="Arial,sans-serif">${esc(item.partName)}</text>`;
      svg += `<text x="${ix + 3}" y="${iy + fontSize * 2 + 3}" font-size="${fontSize * 0.8}" fill="#666" font-family="Arial,sans-serif">${item.width}x${item.height}</text>`;
      if (iw > 60 && ih > 30) {
        svg += `<text x="${ix + 3}" y="${iy + fontSize * 3 + 3}" font-size="${fontSize * 0.7}" fill="#888" font-family="Arial,sans-serif">${esc(item.moduleName)}</text>`;
      }
    }
  }

  // Legend at bottom
  const legendY = padT + drawH + 16;
  const legendItems = [
    { label: "Lateral", color: PIECE_TYPE_COLORS.lateral },
    { label: "Tampo/Base", color: PIECE_TYPE_COLORS.tampo },
    { label: "Fundo", color: PIECE_TYPE_COLORS.fundo },
    { label: "Porta", color: PIECE_TYPE_COLORS.porta },
    { label: "Prateleira", color: PIECE_TYPE_COLORS.prateleira },
    { label: "Fr. Gaveta", color: PIECE_TYPE_COLORS.frente_gaveta },
    { label: "Desperdicio", color: "#fff" },
  ];
  let legX = padL;
  for (const leg of legendItems) {
    if (leg.label === "Desperdicio") {
      // Hatch sample
      svg += `<rect x="${legX}" y="${legendY}" width="10" height="10" fill="#fff" stroke="#e74c3c" stroke-width="0.5"/>`;
      svg += `<line x1="${legX}" y1="${legendY + 10}" x2="${legX + 10}" y2="${legendY}" stroke="#e74c3c" stroke-width="0.5" opacity="0.5"/>`;
    } else {
      svg += `<rect x="${legX}" y="${legendY}" width="10" height="10" fill="${leg.color}" stroke="#999" stroke-width="0.5"/>`;
    }
    svg += `<text x="${legX + 13}" y="${legendY + 9}" font-size="7" fill="#555" font-family="Arial,sans-serif">${leg.label}</text>`;
    legX += 70;
  }

  // Sheet dimensions
  svg += dimLine(padL, padT + drawH + 8, padL + drawW, padT + drawH + 8, `${sheet.width} mm`, 10, `sh${sheetIdx}_`);
  svg += dimLine(padL - 15, padT, padL - 15, padT + drawH, `${sheet.height} mm`, 9, `sh${sheetIdx}_`);

  svg += `</svg>`;
  return svg;
}

/* ============================================================
   SVG: Makeup + Gun Safe area
   ============================================================ */
function renderMakeupGunSvg(briefing: ParsedBriefing, modules: BlueprintModule[]): string {
  const makeupZone = (briefing.zones || []).find(z => z.name.toLowerCase().includes("makeup"));
  const gunZone = (briefing.zones || []).find(z => z.name.toLowerCase().includes("arma"));

  const vW = 900, vH = 500;
  let svg = `<svg viewBox="0 0 ${vW} ${vH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:900px;height:auto;display:block;margin:0 auto;background:#fff;">`;
  svg += svgDefs("mg_");

  // ----- MAKEUP VANITY (left half) -----
  const mkW = 400, mkH = 420;
  const mkOx = 20, mkOy = 40;
  const vanityW = makeupZone?.dimensions?.width_m ? makeupZone.dimensions.width_m * 1000 : 1190;
  const vanityH = 2400;
  const sc = Math.min((mkW - 40) / vanityW, (mkH - 40) / vanityH);
  const rw = vanityW * sc, rh = vanityH * sc;
  const rx = mkOx + (mkW - rw) / 2, ry = mkOy + (mkH - rh) / 2;

  svg += `<text x="${mkOx + mkW / 2}" y="${mkOy - 5}" text-anchor="middle" font-size="13" font-weight="bold" fill="${STROKE}" font-family="Arial,sans-serif">AREA MAKEUP — Elevacao Frontal</text>`;

  // Wall
  svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="#FEFEFE" stroke="${STROKE}" stroke-width="1.5"/>`;

  // Mirror with X reflection lines
  const mirrorH = rh * 0.3;
  const mirrorY = ry + rh * 0.15;
  svg += `<rect x="${rx + rw * 0.1}" y="${mirrorY}" width="${rw * 0.8}" height="${mirrorH}" fill="#E8F4F8" stroke="#6AAAB0" stroke-width="1"/>`;
  // Reflection X
  svg += `<line x1="${rx + rw * 0.1}" y1="${mirrorY}" x2="${rx + rw * 0.9}" y2="${mirrorY + mirrorH}" stroke="#D0E8F0" stroke-width="0.4"/>`;
  svg += `<line x1="${rx + rw * 0.9}" y1="${mirrorY}" x2="${rx + rw * 0.1}" y2="${mirrorY + mirrorH}" stroke="#D0E8F0" stroke-width="0.4"/>`;
  svg += `<text x="${rx + rw / 2}" y="${mirrorY + mirrorH / 2 + 3}" text-anchor="middle" font-size="8" fill="#6AA" font-family="Arial,sans-serif">ESPELHO</text>`;

  // LED strips around mirror (yellow glow)
  svg += `<rect x="${rx + rw * 0.08}" y="${mirrorY - 4}" width="${rw * 0.84}" height="4" fill="#FFD700" opacity="0.8" rx="1"/>`;
  svg += `<rect x="${rx + rw * 0.08}" y="${mirrorY + mirrorH}" width="${rw * 0.84}" height="4" fill="#FFD700" opacity="0.8" rx="1"/>`;
  svg += `<rect x="${rx + rw * 0.08}" y="${mirrorY}" width="4" height="${mirrorH}" fill="#FFD700" opacity="0.6" rx="1"/>`;
  svg += `<rect x="${rx + rw * 0.9 - 4}" y="${mirrorY}" width="4" height="${mirrorH}" fill="#FFD700" opacity="0.6" rx="1"/>`;
  svg += `<text x="${rx + rw * 0.08 + rw * 0.42}" y="${mirrorY - 8}" text-anchor="middle" font-size="7" fill="#C90" font-weight="bold" font-family="Arial,sans-serif">LED 3000K</text>`;

  // Countertop
  const counterY = mirrorY + mirrorH + rh * 0.08;
  svg += `<rect x="${rx}" y="${counterY}" width="${rw}" height="${rh * 0.035}" fill="#D8D0C0" stroke="${STROKE}" stroke-width="1"/>`;
  svg += `<text x="${rx + rw / 2}" y="${counterY - 3}" text-anchor="middle" font-size="7" fill="#888" font-family="Arial,sans-serif">BANCADA 850mm</text>`;

  // Electrical outlet symbols (2 outlets on wall)
  for (let oi = 0; oi < 2; oi++) {
    const ox = rx + rw * 0.25 + oi * rw * 0.5;
    const oy = counterY - rh * 0.03;
    svg += `<rect x="${ox - 6}" y="${oy - 5}" width="12" height="10" rx="2" fill="#fff" stroke="#666" stroke-width="0.8"/>`;
    svg += `<circle cx="${ox - 2}" cy="${oy}" r="1.5" fill="#666"/>`;
    svg += `<circle cx="${ox + 2}" cy="${oy}" r="1.5" fill="#666"/>`;
    svg += `<line x1="${ox}" y1="${oy + 2}" x2="${ox}" y2="${oy + 4}" stroke="#666" stroke-width="0.8"/>`;
  }
  svg += `<text x="${rx + rw * 0.75 + 12}" y="${counterY - rh * 0.025}" font-size="6" fill="#888" font-family="Arial,sans-serif">110V</text>`;

  // Drawers below counter with handles
  const drawerStartY = counterY + rh * 0.04;
  const numDraw = 3;
  const drawH = (ry + rh - drawerStartY - rh * 0.08) / numDraw;
  for (let d = 0; d < numDraw; d++) {
    const dy = drawerStartY + d * drawH;
    svg += `<rect x="${rx + 3}" y="${dy}" width="${rw - 6}" height="${drawH - 4}" fill="${MAT_COLORS.bv_lana}" fill-opacity="0.2" stroke="#999" stroke-width="0.8" rx="1"/>`;
    svg += `<rect x="${rx + rw / 2 - 12}" y="${dy + drawH / 2 - 3}" width="24" height="3.5" rx="1.5" fill="#888"/>`;
  }

  // Dimensions
  svg += dimLine(rx, ry + rh + 8, rx + rw, ry + rh + 8, `${vanityW}`, 9, "mg_");
  svg += dimLine(rx - 15, ry, rx - 15, ry + rh, `${vanityH}`, 9, "mg_");

  // ----- GUN SAFE (right half) -----
  const gsOx = 470, gsOy = 40;
  const gsAreaW = 400, gsAreaH = 420;
  const gunW = gunZone?.dimensions?.width_m ? gunZone.dimensions.width_m * 1000 : 1360;
  const gunH = 2400;
  const gsc = Math.min((gsAreaW * 0.45 - 20) / gunW, (gsAreaH - 40) / gunH);
  const grw = gunW * gsc, grh = gunH * gsc;

  svg += `<text x="${gsOx + gsAreaW / 2}" y="${gsOy - 5}" text-anchor="middle" font-size="13" font-weight="bold" fill="${STROKE}" font-family="Arial,sans-serif">AREA ARMAS — Porta Fechada / Aberta</text>`;

  // Closed view (mirror door with reflection X + frame)
  const gx1 = gsOx + 10, gy1 = gsOy + 15;
  svg += `<rect x="${gx1}" y="${gy1}" width="${grw}" height="${grh}" fill="#E0E8E8" stroke="${STROKE}" stroke-width="1.5"/>`;
  // Mirror frame
  svg += `<rect x="${gx1 + grw * 0.04}" y="${gy1 + grh * 0.03}" width="${grw * 0.92}" height="${grh * 0.94}" fill="#D8E8F0" stroke="#6AAAB0" stroke-width="0.8"/>`;
  // Reflection X
  svg += `<line x1="${gx1 + grw * 0.04}" y1="${gy1 + grh * 0.03}" x2="${gx1 + grw * 0.96}" y2="${gy1 + grh * 0.97}" stroke="#D0E8F0" stroke-width="0.5"/>`;
  svg += `<line x1="${gx1 + grw * 0.96}" y1="${gy1 + grh * 0.03}" x2="${gx1 + grw * 0.04}" y2="${gy1 + grh * 0.97}" stroke="#D0E8F0" stroke-width="0.5"/>`;
  svg += `<text x="${gx1 + grw / 2}" y="${gy1 + grh / 2}" text-anchor="middle" font-size="9" fill="#6AA" font-family="Arial,sans-serif">PORTA ESPELHO</text>`;
  svg += `<text x="${gx1 + grw / 2}" y="${gy1 + grh + 12}" text-anchor="middle" font-size="9" font-weight="bold" fill="#444" font-family="Arial,sans-serif">FECHADA</text>`;
  // Handle
  svg += `<circle cx="${gx1 + grw * 0.9}" cy="${gy1 + grh * 0.5}" r="4" fill="#888" stroke="#666" stroke-width="0.5"/>`;
  // Moldura
  svg += `<rect x="${gx1}" y="${gy1}" width="${grw}" height="${grh}" fill="none" stroke="#888" stroke-width="2"/>`;

  // Open view (internal shelves + door rotated)
  const gx2 = gsOx + gsAreaW * 0.5 + 10, gy2 = gsOy + 15;
  svg += `<rect x="${gx2}" y="${gy2}" width="${grw}" height="${grh}" fill="#F0EDE5" stroke="${STROKE}" stroke-width="1.5"/>`;

  // Shelves with LED strips
  const shelfCount = 5;
  const shelfH = grh / (shelfCount + 1);
  for (let s = 1; s <= shelfCount; s++) {
    const sy = gy2 + s * shelfH;
    svg += `<rect x="${gx2 + 2}" y="${sy}" width="${grw - 4}" height="3" fill="#C8B8A0" stroke="#999" stroke-width="0.5"/>`;
    // LED strip above each shelf
    svg += `<rect x="${gx2 + 4}" y="${sy - 4}" width="${grw - 8}" height="2.5" fill="#FFD700" opacity="0.7" rx="1"/>`;
  }

  // Gun cases on bottom shelf (dark rectangles)
  const caseY = gy2 + shelfCount * shelfH + 4;
  const caseH = grh - shelfCount * shelfH - 10;
  const caseCount = 3;
  const caseW = (grw - 10) / caseCount;
  for (let c = 0; c < caseCount; c++) {
    svg += `<rect x="${gx2 + 4 + c * (caseW + 1)}" y="${caseY}" width="${caseW - 2}" height="${caseH}" rx="2" fill="#4a4a4a" fill-opacity="0.6" stroke="#333" stroke-width="0.5"/>`;
  }
  svg += `<text x="${gx2 + grw / 2}" y="${caseY + caseH / 2 + 3}" text-anchor="middle" font-size="6" fill="#fff" font-family="Arial,sans-serif">CASES</text>`;

  // Sensor icon (top right)
  svg += `<circle cx="${gx2 + grw - 8}" cy="${gy2 + 8}" r="4" fill="none" stroke="#e74c3c" stroke-width="1"/>`;
  svg += `<circle cx="${gx2 + grw - 8}" cy="${gy2 + 8}" r="1.5" fill="#e74c3c"/>`;
  svg += `<path d="M${gx2 + grw - 14} ${gy2 + 3} Q${gx2 + grw - 8} ${gy2 - 2} ${gx2 + grw - 2} ${gy2 + 3}" fill="none" stroke="#e74c3c" stroke-width="0.6"/>`;
  svg += `<text x="${gx2 + grw - 8}" y="${gy2 + 18}" text-anchor="middle" font-size="5" fill="#e74c3c" font-family="Arial,sans-serif">SENSOR</text>`;

  svg += `<text x="${gx2 + grw / 2}" y="${gy2 + grh + 12}" text-anchor="middle" font-size="9" font-weight="bold" fill="#444" font-family="Arial,sans-serif">ABERTA</text>`;

  // Door swing arc (90° rotation showing hinge)
  svg += `<path d="M${gx2} ${gy2} A${grw * 0.8} ${grw * 0.8} 0 0 0 ${gx2 - grw * 0.8} ${gy2 + grw * 0.8}" fill="none" stroke="${STROKE}" stroke-width="0.7" stroke-dasharray="4,3"/>`;
  // Hinge indicators
  svg += `<rect x="${gx2 - 2}" y="${gy2 + grh * 0.15}" width="4" height="8" fill="#888" rx="1"/>`;
  svg += `<rect x="${gx2 - 2}" y="${gy2 + grh * 0.5}" width="4" height="8" fill="#888" rx="1"/>`;
  svg += `<rect x="${gx2 - 2}" y="${gy2 + grh * 0.85}" width="4" height="8" fill="#888" rx="1"/>`;

  // Dimensions
  svg += dimLine(gx2, gy2 + grh + 22, gx2 + grw, gy2 + grh + 22, `${gunW}`, 9, "mg_");
  svg += dimLine(gx2 + grw + 10, gy2, gx2 + grw + 10, gy2 + grh, `${gunH}`, 9, "mg_");

  svg += `</svg>`;
  return svg;
}

/* ============================================================
   Prancha Header / Footer / Carimbo ABNT
   ============================================================ */

/** Generate project number from session ID */
function projectNumber(sessionId: string): string {
  const hash = sessionId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
  return "SOMA-" + (hash || "0001");
}

/** Scale label based on prancha type */
function scaleForPrancha(n: number): string {
  if (n >= 3 && n <= 6) return "1:20"; // elevações e vista interior
  if (n === 2) return "1:50"; // planta baixa
  return "S/E"; // sem escala (tabelas, BOM, etc)
}

function pranchaHeader(n: number, title: string, clientName: string, projectType: string, paperFormat: string = "A2 Landscape", sessionId: string = "", designer: string = ""): string {
  const projNum = projectNumber(sessionId);
  const scale = scaleForPrancha(n);
  return `
    <div class="prancha-header">
      <div class="prancha-header-left">
        <span class="prancha-logo">SOMA-ID</span>
        <span class="prancha-divider">|</span>
        <span>Cliente: ${clientName}</span>
        <span class="prancha-divider">|</span>
        <span>Projeto: ${projectType}</span>
        <span class="prancha-divider">|</span>
        <span class="prancha-proj-num">${projNum}</span>
      </div>
      <div class="prancha-header-right">
        Prancha ${String(n).padStart(2, "0")}/${TOTAL_PRANCHAS}
      </div>
    </div>
    <div class="prancha-title-bar">
      <h2>PRANCHA ${String(n).padStart(2, "0")} — ${title}</h2>
      <div class="prancha-meta">
        <span>Data: ${today()}</span>
        <span class="prancha-divider">|</span>
        <span>Formato: ${paperFormat}</span>
        <span class="prancha-divider">|</span>
        <span>Escala: ${scale}</span>
        <span class="prancha-divider">|</span>
        <span>Rev. RV.01</span>
      </div>
    </div>`;
}

/** ABNT/Promob-style carimbo (title block) — rendered as footer on each prancha */
function renderCarimbo(
  n: number,
  clientName: string,
  projectType: string,
  designer: string,
  sessionId: string,
  paperFormat: string = "A2 Landscape",
): string {
  const projNum = projectNumber(sessionId);
  const scale = scaleForPrancha(n);
  return `
  <div class="carimbo">
    <div class="carimbo-logo">
      <svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg" style="width:100px;height:auto">
        <rect x="0" y="0" width="120" height="40" fill="none"/>
        <text x="60" y="18" text-anchor="middle" font-size="16" font-weight="900" fill="#222" font-family="Arial,sans-serif" letter-spacing="2">SOMA-ID</text>
        <line x1="10" y1="22" x2="110" y2="22" stroke="${GOLD}" stroke-width="2"/>
        <text x="60" y="34" text-anchor="middle" font-size="7" fill="#888" font-family="Arial,sans-serif" letter-spacing="1">MOBILIARIO INTELIGENTE</text>
      </svg>
    </div>
    <div class="carimbo-grid">
      <div class="carimbo-cell"><span class="carimbo-label">PROJETO</span><span class="carimbo-value">${projNum}</span></div>
      <div class="carimbo-cell"><span class="carimbo-label">REVISAO</span><span class="carimbo-value">RV.01</span></div>
      <div class="carimbo-cell"><span class="carimbo-label">PRANCHA</span><span class="carimbo-value">${String(n).padStart(2, "0")}/${TOTAL_PRANCHAS}</span></div>
      <div class="carimbo-cell"><span class="carimbo-label">ESCALA</span><span class="carimbo-value">${scale}</span></div>
      <div class="carimbo-cell"><span class="carimbo-label">FORMATO</span><span class="carimbo-value">${paperFormat}</span></div>
      <div class="carimbo-cell"><span class="carimbo-label">DATA</span><span class="carimbo-value">${today()}</span></div>
      <div class="carimbo-cell wide"><span class="carimbo-label">CLIENTE</span><span class="carimbo-value">${clientName}</span></div>
      <div class="carimbo-cell wide"><span class="carimbo-label">TIPO</span><span class="carimbo-value">${projectType}</span></div>
      <div class="carimbo-cell wide"><span class="carimbo-label">DESIGNER</span><span class="carimbo-value">${designer || "-"}</span></div>
    </div>
    <div class="carimbo-sign">
      <div class="carimbo-sign-block">
        <span class="carimbo-label">Aprovado por:</span>
        <div class="carimbo-sign-line">___________________________</div>
      </div>
      <div class="carimbo-sign-block">
        <span class="carimbo-label">Data:</span>
        <div class="carimbo-sign-line">____/____/________</div>
      </div>
    </div>
    <div class="carimbo-footer-text">Gerado automaticamente por SOMA-ID Engine v2.0 &mdash; Medidas em mm</div>
  </div>`;
}

function pranchaFooter(
  n: number = 0,
  clientName: string = "",
  projectType: string = "",
  designer: string = "",
  sessionId: string = "",
  paperFormat: string = "A2 Landscape",
): string {
  if (n > 0) {
    return renderCarimbo(n, clientName, projectType, designer, sessionId, paperFormat);
  }
  return `<div class="prancha-footer">Gerado automaticamente por SOMA-ID &mdash; Escala indicada &mdash; Medidas em mm</div>`;
}

/* ============================================================
   Main Export
   ============================================================ */
export function generateHtmlReport(briefing: ParsedBriefing, results: EngineResults, sessionId: string): string {
  const s = results.summary;
  const bp = results.blueprint;
  const nest = results.nesting;
  const clientName = esc(briefing.client?.name || "Cliente");
  const projectType = esc(briefing.project?.type || "Projeto");
  const designer = esc(briefing.project?.designer || "-");
  const dateDue = esc(briefing.project?.date_due || "-");
  const dateIn = esc(briefing.project?.date_in || "-");
  const costUsd = s.estimated_cost_usd || (s as any).estimated_cost_brl / 5.5 || 0;
  const effColor = s.efficiency_percent >= 80 ? "#27ae60" : s.efficiency_percent >= 60 ? "#e6a817" : "#e74c3c";

  // Collect all modules
  const allModules = [...bp.mainWall.modules, ...(bp.sideWall?.modules || [])];

  // Collect all cut items with zone info
  const allCuts: Array<{
    piece: string; module: string; zone: string; qty: number;
    w: number; h: number; thickness: number; material: string;
    edge: string; grain: string; colorHex: string;
  }> = [];
  for (const mod of allModules) {
    const zone = detectZone(mod, briefing);
    for (const cut of mod.cutList) {
      allCuts.push({
        piece: cut.piece,
        module: mod.name,
        zone,
        qty: cut.quantity,
        w: cut.rawWidth,
        h: cut.rawHeight,
        thickness: bp.materials.thickness || 18,
        material: cut.material,
        edge: cut.edgeBand,
        grain: cut.grainDirection === "none" ? "-" : cut.grainDirection === "vertical" ? "V" : "H",
        colorHex: getColorForMaterial(cut.material),
      });
    }
  }

  // Group hardware with more detail
  const hwItems: Array<{ name: string; type: string; module: string; zone: string; qty: number; spec: string }> = [];
  const hwCount: Record<string, number> = {};
  for (const h of bp.hardwareMap) {
    hwCount[h] = (hwCount[h] || 0) + 1;
  }
  for (const [hw, count] of Object.entries(hwCount)) {
    const hwType = classifyHardware(hw);
    hwItems.push({
      name: hw,
      type: hwType.type,
      module: hwType.module,
      zone: hwType.zone,
      qty: count,
      spec: hwType.spec,
    });
  }
  // Sort by type
  hwItems.sort((a, b) => a.type.localeCompare(b.type));

  // Material palette from summary
  const materialPalette = (s as any).material_palette || [];
  const materialWarnings = (s as any).material_warnings || [];

  // Walls array for elevations
  const walls: Array<{ label: string; title: string; totalWidth: number; modules: BlueprintModule[] }> = [];
  if (bp.mainWall.modules.length > 0) {
    walls.push({ label: "A", title: "ELEVACAO PAREDE A", totalWidth: bp.mainWall.totalWidth, modules: bp.mainWall.modules });
  }
  if (bp.sideWall && bp.sideWall.modules.length > 0) {
    walls.push({ label: "B", title: "ELEVACAO PAREDE B", totalWidth: bp.sideWall.totalWidth, modules: bp.sideWall.modules });
  }

  // Additional wall from zones
  const additionalZones = (briefing.zones || []).filter(z => {
    const nm = z.name.toLowerCase();
    return !nm.includes("ilha") && !nm.includes("makeup") && !nm.includes("arma");
  });

  // Check for island, makeup, gun zones
  const hasIsland = (briefing.zones || []).some(z => z.name.toLowerCase().includes("ilha"));
  const hasMakeup = (briefing.zones || []).some(z => z.name.toLowerCase().includes("makeup"));
  const hasGun = (briefing.zones || []).some(z => z.name.toLowerCase().includes("arma"));

  // Sheet efficiency per material
  const sheetsByMaterial: Record<string, { count: number; totalEff: number }> = {};
  for (const sheet of nest.sheets) {
    const mat = sheet.material || "MDF";
    if (!sheetsByMaterial[mat]) sheetsByMaterial[mat] = { count: 0, totalEff: 0 };
    sheetsByMaterial[mat].count++;
    sheetsByMaterial[mat].totalEff += (1 - sheet.waste) * 100;
  }

  // Total m2 per material from cuts
  const m2ByMaterial: Record<string, number> = {};
  for (const c of allCuts) {
    const key = c.material || "MDF";
    m2ByMaterial[key] = (m2ByMaterial[key] || 0) + (c.w * c.h * c.qty) / 1_000_000;
  }

  // Group cuts by zone
  const cutsByZone: Record<string, typeof allCuts> = {};
  for (const c of allCuts) {
    const z = c.zone || "Geral";
    if (!cutsByZone[z]) cutsByZone[z] = [];
    cutsByZone[z].push(c);
  }

  // Generate budget
  let budget: BudgetResult | null = null;
  try { budget = generateBudget(briefing, results); } catch (_) { /* graceful fallback */ }

  // Dynamic prancha count — all 13 pranchas are always rendered in HTML
  // 01-Capa, 02-Planta, 03-ElevA, 04-ElevB, 05-ElevAdicional, 06-Interior,
  // 07-Ilha, 08-Makeup+Armas, 09-BOM, 10-Nesting, 11-Ferragens, 12-Detalhes, 13-Orcamento
  TOTAL_PRANCHAS = 13;

  // ==================== BUILD HTML ====================
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SOMA-ID — Relatorio Tecnico | ${clientName}</title>
<style>
/* === RESET & BASE === */
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;color:#222;background:#fff;line-height:1.5;font-size:13px}
.page{max-width:1000px;margin:0 auto;padding:0}

/* === PRANCHA CONTAINER === */
.prancha{background:#fff;padding:30px 40px 20px;margin:0;border-bottom:1px solid #ddd;min-height:600px}

/* === PRANCHA HEADER === */
.prancha-header{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:2px solid ${GOLD};margin-bottom:12px;font-size:12px;color:#555}
.prancha-header-left{display:flex;align-items:center;gap:8px}
.prancha-logo{font-size:18px;font-weight:900;color:#222;letter-spacing:0.08em}
.prancha-divider{color:#ccc;margin:0 4px}
.prancha-header-right{font-weight:700;color:#222;font-size:13px}

/* === PRANCHA TITLE === */
.prancha-title-bar{margin-bottom:20px}
.prancha-title-bar h2{font-size:20px;font-weight:800;color:#000;margin:0 0 4px;padding:0;border:none}
.prancha-meta{font-size:11px;color:#888}
.prancha-meta span{margin-right:4px}

/* === PRANCHA FOOTER === */
.prancha-footer{text-align:center;font-size:10px;color:#aaa;padding:12px 0 0;margin-top:20px;border-top:1px solid #eee}
.prancha-proj-num{font-weight:700;color:#222;font-size:12px;letter-spacing:0.05em}

/* === CARIMBO ABNT === */
.carimbo{margin-top:20px;border:2px solid ${STROKE};display:grid;grid-template-columns:120px 1fr auto;grid-template-rows:auto auto;gap:0;font-size:10px;background:#fff}
.carimbo-logo{grid-row:1/3;border-right:1px solid #ccc;display:flex;align-items:center;justify-content:center;padding:8px;background:#fafafa}
.carimbo-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:0;border-bottom:1px solid #ccc}
.carimbo-cell{border-right:1px solid #eee;border-bottom:1px solid #eee;padding:4px 6px;display:flex;flex-direction:column}
.carimbo-cell.wide{grid-column:span 2}
.carimbo-label{font-size:7px;color:#888;text-transform:uppercase;letter-spacing:0.06em;line-height:1.2}
.carimbo-value{font-size:11px;font-weight:700;color:#222;line-height:1.4}
.carimbo-sign{grid-column:3;grid-row:1/3;border-left:1px solid #ccc;padding:8px 12px;display:flex;flex-direction:column;justify-content:center;gap:8px;min-width:180px}
.carimbo-sign-block{display:flex;flex-direction:column;gap:2px}
.carimbo-sign-line{color:#aaa;font-size:10px;letter-spacing:0.04em;border-bottom:1px solid #ccc;padding-bottom:2px}
.carimbo-footer-text{grid-column:1/-1;text-align:center;font-size:8px;color:#aaa;padding:3px 0;border-top:1px solid #eee;background:#fafafa}

/* === GOLD BAR === */
.gold-bar{height:5px;background:linear-gradient(90deg,${GOLD},#e0c878,${GOLD})}

/* === COVER === */
.cover{text-align:center;padding:80px 40px 60px;min-height:700px;display:flex;flex-direction:column;justify-content:center;align-items:center}
.cover-logo{font-size:52px;font-weight:900;letter-spacing:0.12em;color:#222;margin-bottom:8px}
.cover-sub{font-size:16px;color:#888;letter-spacing:0.06em;margin-bottom:40px}
.cover-gold{width:120px;height:4px;background:${GOLD};margin:0 auto 40px}
.cover-info{text-align:left;display:inline-block;font-size:15px;line-height:2}
.cover-info .label{color:#888;display:inline-block;width:140px;font-size:12px;text-transform:uppercase;letter-spacing:0.04em}
.cover-info .value{font-weight:700;color:#222}
.cover-company{font-size:14px;color:#666;margin-top:40px}
.cover-id{font-size:11px;color:#aaa;margin-top:8px}

/* === TABLES === */
table{width:100%;border-collapse:collapse;font-size:12px;margin:12px 0}
th{background:${HDR_BG};color:${HDR_FG};padding:8px 10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;border:1px solid ${HDR_BG}}
td{padding:6px 10px;border:1px solid #ccc}
tr:nth-child(even) td{background:#f8f8f8}
tr.zone-header td{background:#E8E8E8;font-weight:700;font-size:12px;border-top:2px solid #999}
tr.total-row td{background:#D8D8D8;font-weight:700;border-top:2px solid ${STROKE}}

/* === METRICS === */
.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin:16px 0}
.metric{background:#f5f5f5;border-radius:6px;padding:14px;text-align:center;border-top:3px solid #ccc}
.metric .val{font-size:26px;font-weight:800}
.metric .lbl{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin-top:2px}
.metric.green{border-color:#27ae60} .metric.green .val{color:#27ae60}
.metric.blue{border-color:#2c3e50} .metric.blue .val{color:#2c3e50}
.metric.orange{border-color:#e67e22} .metric.orange .val{color:#e67e22}
.metric.purple{border-color:#8e44ad} .metric.purple .val{color:#8e44ad}
.metric.gold{border-color:${GOLD}} .metric.gold .val{color:${GOLD}}
.metric.red{border-color:#e74c3c} .metric.red .val{color:#e74c3c}

/* === EFFICIENCY BAR === */
.eff-bar{background:#ddd;border-radius:4px;height:22px;overflow:hidden;margin:8px 0}
.eff-fill{height:100%;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff}

/* === COST BOX === */
.cost-box{background:#f0fff0;border:1px solid #c3e6c3;border-radius:6px;padding:14px;text-align:center;margin:16px 0}
.cost-box .amount{font-size:28px;font-weight:800;color:#27ae60}
.cost-box .desc{font-size:11px;color:#888;margin-top:2px}

/* === SVG WRAP === */
.svg-wrap{background:#fafafa;border:1px solid #eee;border-radius:4px;padding:16px;margin:12px 0}

/* === CONFLICTS === */
.conflict-card{border-left:4px solid;border-radius:0 6px 6px 0;padding:10px 14px;margin:8px 0}
.conflict-card.critical{border-color:#e74c3c;background:#fdf0f0}
.conflict-card.warning{border-color:#e6a817;background:#fefcf0}
.conflict-card .sev{font-weight:700;font-size:11px;text-transform:uppercase}
.conflict-card.critical .sev{color:#e74c3c}
.conflict-card.warning .sev{color:#e6a817}
.conflict-card .desc{font-size:12px;margin-top:2px}
.conflict-card .meta{font-size:10px;color:#888;margin-top:3px}

/* === NOTES LIST === */
.notes-list{padding-left:20px;margin:8px 0}
.notes-list li{margin:4px 0;font-size:12px}

/* === INFO GRID === */
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin:12px 0}
.info-grid .label{color:#888;font-size:11px;text-transform:uppercase}
.info-grid .value{font-weight:600;font-size:13px}

/* === SHEET SECTION === */
.sheet-section{margin:16px 0;padding:12px 0;border-bottom:1px solid #eee}
.sheet-section h3{font-size:14px;font-weight:700;color:#333;margin:0 0 4px}

/* === PRINT === */
@media print{
  body{font-size:11px}
  .page{max-width:none;padding:0}
  .prancha{page-break-before:always;padding:15px 20px;border:none;min-height:auto}
  .prancha:first-child{page-break-before:auto}
  .no-print{display:none!important}
  .cover{min-height:auto;padding:40px 20px 30px}
  .prancha-footer{font-size:8px}
  table{font-size:10px}
  th{padding:5px 6px;font-size:9px}
  td{padding:4px 6px}
}
</style>
</head>
<body>

<div class="page">

<!-- ================================================================ -->
<!-- PRANCHA 01 — CAPA                                                -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-01">
  <div class="cover">
    <div class="cover-logo">SOMA-ID</div>
    <div class="cover-sub">Relatorio Tecnico de Projeto</div>
    <div class="cover-gold"></div>
    <div class="gold-bar" style="width:200px;margin-bottom:40px"></div>
    <div class="cover-info">
      <div><span class="label">Cliente</span><span class="value">${clientName}</span></div>
      <div><span class="label">Projeto</span><span class="value">${projectType}</span></div>
      <div><span class="label">Designer</span><span class="value">${designer}</span></div>
      <div><span class="label">Data Entrada</span><span class="value">${dateIn}</span></div>
      <div><span class="label">Data Entrega</span><span class="value">${dateDue}</span></div>
      <div><span class="label">Area Total</span><span class="value">${briefing.space?.total_area_m2 || "-"} m&sup2;</span></div>
      <div><span class="label">Pe-Direito</span><span class="value">${briefing.space?.ceiling_height_m || "-"} m</span></div>
      <div><span class="label">Materiais</span><span class="value">${esc((briefing.materials?.colors || []).join(", ") || "-")}</span></div>
      <div><span class="label">ID Sessao</span><span class="value" style="font-size:11px;color:#888">${esc(sessionId)}</span></div>
    </div>
    <div class="cover-company">B.Home Concept${briefing.client?.referral ? " | Ref: " + esc(briefing.client.referral) : ""}</div>
    <div class="cover-id">Documento gerado em ${nowFull()} | ${TOTAL_PRANCHAS} pranchas</div>
  </div>
  ${pranchaFooter()}
</div>

<!-- ================================================================ -->
<!-- PRANCHA 02 — PLANTA BAIXA (LAYOUT)                              -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-02">
  ${pranchaHeader(2, "PLANTA BAIXA (LAYOUT)", clientName, projectType, "A2 Landscape", sessionId, designer)}
  <p style="font-size:11px;color:#666;margin-bottom:8px">Vista superior do ambiente com distribuicao de zonas, cotas externas e indicacao de cortes de secao.</p>
  <div class="svg-wrap">
    ${renderFloorPlanSvg(briefing, results)}
  </div>
  <div style="margin-top:12px">
    <table>
      <tr><th>Parede</th><th>Comprimento</th><th>Caracteristicas</th></tr>
      ${(briefing.space?.walls || []).map((w, i) => `<tr><td>Parede ${["A","B","C","D"][i] || w.id}</td><td>${w.length_m ? ((w.length_m * 1000).toFixed(0) + " mm (" + w.length_m.toFixed(2) + " m)") : "-"}</td><td>${(w.features || []).join(", ") || "-"}</td></tr>`).join("")}
    </table>
  </div>
  <div style="margin-top:8px">
    <table>
      <tr><th>Zona</th><th>Largura</th><th>Profundidade</th><th>Itens Principais</th></tr>
      ${(briefing.zones || []).map(z => `<tr><td>${esc(z.name)}</td><td>${z.dimensions ? (z.dimensions.width_m * 1000).toFixed(0) + " mm" : "-"}</td><td>${z.dimensions ? (z.dimensions.depth_m * 1000).toFixed(0) + " mm" : "-"}</td><td>${(z.items || []).map(it => it.type + (it.quantity ? " (" + it.quantity + ")" : "")).join(", ") || "-"}</td></tr>`).join("")}
    </table>
  </div>
  ${pranchaFooter(2, clientName, projectType, designer, sessionId, "A2 Landscape")}
</div>

<!-- ================================================================ -->
<!-- PRANCHA 03 — ELEVACAO PAREDE A                                  -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-03">
  ${pranchaHeader(3, walls[0]?.title || "ELEVACAO PAREDE A", clientName, projectType, "A2 Landscape", sessionId, designer)}
  ${walls.length > 0 ? `
  <p style="font-size:11px;color:#666;margin-bottom:8px">Vista frontal da parede principal com modulos cotados. Materiais: ${esc(bp.materials.mdfColor || "-")} | Espessura: ${bp.materials.thickness || 18}mm</p>
  <div class="svg-wrap">
    ${renderWallSvg(walls[0].title, walls[0].totalWidth, walls[0].modules, 2400, "w03")}
  </div>
  <table>
    <tr><th>Modulo</th><th>Tipo</th><th>Largura mm</th><th>Altura mm</th><th>Profund. mm</th><th>Posicao X</th><th>Pecas</th><th>Notas</th></tr>
    ${walls[0].modules.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(m.type)}</td><td>${m.width}</td><td>${m.height}</td><td>${m.depth}</td><td>${m.position?.x || 0}</td><td>${m.cutList.length} tipos</td><td>${(m.notes || []).join("; ") || "-"}</td></tr>`).join("")}
  </table>` : `<p style="color:#888;font-style:italic">Nenhum modulo definido para Parede A.</p>`}
  ${pranchaFooter(3, clientName, projectType, designer, sessionId, "A2 Landscape")}
</div>

<!-- ================================================================ -->
<!-- PRANCHA 04 — ELEVACAO PAREDE B                                  -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-04">
  ${pranchaHeader(4, walls[1]?.title || "ELEVACAO PAREDE B", clientName, projectType, "A2 Landscape", sessionId, designer)}
  ${walls.length > 1 ? `
  <p style="font-size:11px;color:#666;margin-bottom:8px">Vista frontal da parede lateral com modulos cotados.</p>
  <div class="svg-wrap">
    ${renderWallSvg(walls[1].title, walls[1].totalWidth, walls[1].modules, 2400, "w04")}
  </div>
  <table>
    <tr><th>Modulo</th><th>Tipo</th><th>Largura mm</th><th>Altura mm</th><th>Profund. mm</th><th>Posicao X</th><th>Pecas</th><th>Notas</th></tr>
    ${walls[1].modules.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(m.type)}</td><td>${m.width}</td><td>${m.height}</td><td>${m.depth}</td><td>${m.position?.x || 0}</td><td>${m.cutList.length} tipos</td><td>${(m.notes || []).join("; ") || "-"}</td></tr>`).join("")}
  </table>` : `<p style="color:#888;font-style:italic">Parede lateral nao definida neste projeto. Caso exista uma segunda parede, os modulos apareceriam aqui com a mesma estrutura da Prancha 03.</p>`}
  ${pranchaFooter(4, clientName, projectType, designer, sessionId, "A2 Landscape")}
</div>

<!-- ================================================================ -->
<!-- PRANCHA 05 — ELEVACAO PAREDE C / CLOSET HIS                     -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-05">
  ${pranchaHeader(5, walls.length > 2 ? (walls[2]?.title || "ELEVACAO PAREDE C") : "ELEVACAO ADICIONAL", clientName, projectType, "A2 Landscape", sessionId, designer)}
  ${walls.length > 2 ? `
  <div class="svg-wrap">
    ${renderWallSvg(walls[2].title, walls[2].totalWidth, walls[2].modules, 2400, "w05")}
  </div>
  <table>
    <tr><th>Modulo</th><th>Tipo</th><th>Largura mm</th><th>Altura mm</th><th>Profund. mm</th><th>Posicao X</th><th>Pecas</th></tr>
    ${walls[2].modules.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(m.type)}</td><td>${m.width}</td><td>${m.height}</td><td>${m.depth}</td><td>${m.position?.x || 0}</td><td>${m.cutList.length} tipos</td></tr>`).join("")}
  </table>` : (() => {
    // Collect modules from additional zones not fully shown in walls 0/1
    const mainIds = new Set((walls[0]?.modules || []).map(m => m.moduleId + m.width));
    const sideIds = new Set((walls[1]?.modules || []).map(m => m.moduleId + m.width));
    const additionalMods = allModules.filter(m => {
      const notes = (m.notes || []).join(" ").toLowerCase();
      // Show modules from zones not in mainWall/sideWall already shown
      return additionalZones.some(z => notes.includes(z.name.toLowerCase()));
    });
    // Group by zone for multi-elevation rendering
    const zoneElevations: Array<{ zone: string; modules: BlueprintModule[]; totalW: number }> = [];
    for (const z of additionalZones) {
      const zoneMods = additionalMods.filter(m => {
        const notes = (m.notes || []).join(" ").toLowerCase();
        const nm = (m.name || "").toLowerCase();
        return notes.includes(z.name.toLowerCase()) || nm.includes(z.name.toLowerCase().split(" ")[0]);
      });
      if (zoneMods.length > 0) {
        // Assign sequential x positions
        let curX = 0;
        const positioned = zoneMods.map(m => {
          const pos = { ...m, position: { x: curX, y: m.position?.y || 0, z: m.position?.z || 0 } };
          curX += m.width;
          return pos;
        });
        zoneElevations.push({ zone: z.name, modules: positioned, totalW: curX });
      }
    }

    if (zoneElevations.length > 0) {
      let html = '<p style="font-size:11px;color:#666;margin-bottom:12px">Elevacoes das zonas adicionais nao exibidas nas Pranchas 03/04.</p>';
      for (const ze of zoneElevations) {
        html += '<div style="margin-bottom:20px"><h3 style="font-size:13px;font-weight:700;margin-bottom:6px;color:#333;border-bottom:1px solid #eee;padding-bottom:4px">' + esc(ze.zone) + '</h3>';
        html += '<div class="svg-wrap">' + renderWallSvg("ELEVACAO — " + ze.zone, ze.totalW, ze.modules, 2400, "w05_" + ze.zone.replace(/\s/g, "")) + '</div>';
        html += '<table><tr><th>Modulo</th><th>Tipo</th><th>Largura mm</th><th>Altura mm</th><th>Prof. mm</th><th>Pecas</th></tr>';
        for (const m of ze.modules) {
          html += '<tr><td>' + esc(m.name) + '</td><td>' + esc(m.type) + '</td><td>' + m.width + '</td><td>' + m.height + '</td><td>' + m.depth + '</td><td>' + m.cutList.length + ' tipos</td></tr>';
        }
        html += '</table></div>';
      }
      return html;
    }
    // Fallback: show table only
    let html = '<p style="font-size:11px;color:#666;margin-bottom:12px">Zonas adicionais identificadas no briefing:</p>';
    if (additionalZones.length > 0) {
      html += '<table><tr><th>Zona</th><th>Largura</th><th>Profundidade</th><th>Itens</th><th>Restricoes</th></tr>';
      for (const z of additionalZones) {
        html += '<tr><td>' + esc(z.name) + '</td><td>' + (z.dimensions ? (z.dimensions.width_m * 1000).toFixed(0) + ' mm' : '-') + '</td><td>' + (z.dimensions ? (z.dimensions.depth_m * 1000).toFixed(0) + ' mm' : '-') + '</td><td>' + ((z.items || []).map(it => esc(it.type) + (it.quantity ? ' (' + it.quantity + ')' : '')).join(', ') || '-') + '</td><td>' + ((z.constraints || []).map(c => esc(c.type) + (c.value_mm ? ' ' + c.value_mm + 'mm' : '')).join('; ') || '-') + '</td></tr>';
      }
      html += '</table>';
    } else {
      html += '<p style="color:#888;font-style:italic">Nenhuma parede ou zona adicional identificada.</p>';
    }
    return html;
  })()}
  ${pranchaFooter(5, clientName, projectType, designer, sessionId, "A2 Landscape")}
</div>

<!-- ================================================================ -->
<!-- PRANCHA 06 — VISTA INTERIOR SEM PORTAS                           -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-06">
  ${pranchaHeader(6, "VISTA FRONTAL INTERIOR (SEM PORTAS)", clientName, projectType, "A2 Landscape", sessionId, designer)}
  <p style="font-size:11px;color:#666;margin-bottom:8px">Vista frontal de cada parede mostrando compartimentos internos com cotas individuais. Portas removidas para visualizacao da organizacao interna.</p>
  ${walls.map((wall, wi) => {
    const wallRows = wall.modules.map(m => {
      const det = detectModuleDetails(m);
      return "<tr><td>" + esc(m.name) + "</td><td>" + esc(det.subtype.replace(/_/g, " ")) + "</td><td>" + m.width + "</td><td>" + m.height + "</td><td>" + m.depth + "</td><td>" + (det.features.join(", ") || "-") + "</td></tr>";
    }).join("");
    return '<div style="margin-bottom:24px"><h3 style="font-size:14px;font-weight:700;margin-bottom:8px;color:#333;border-bottom:1px solid #eee;padding-bottom:4px">' + esc(wall.title) + '</h3><div class="svg-wrap">' + renderWallExplodedSvg(wall.title, wall.totalWidth, wall.modules, 2400, "ex" + wi) + '</div><table><tr><th>Modulo</th><th>Tipo Interior</th><th>Largura mm</th><th>Altura mm</th><th>Prof. mm</th><th>Itens Internos</th></tr>' + wallRows + '</table></div>';
  }).join("")}
  ${walls.length === 0 ? '<p style="color:#888;font-style:italic">Nenhuma parede com modulos definida para vista interior.</p>' : ""}
  ${pranchaFooter(6, clientName, projectType, designer, sessionId, "A2 Landscape")}
</div>

<!-- ================================================================ -->
<!-- PRANCHA 07 — ILHA CENTRAL - 4 VISTAS                            -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-07">
  ${pranchaHeader(7, "ILHA CENTRAL — 4 VISTAS", clientName, projectType, "A3 Landscape", sessionId, designer)}
  ${hasIsland ? `
  <p style="font-size:11px;color:#666;margin-bottom:8px">Tampo em vidro temperado 8mm com divisores em veludo. Gavetas com corredicas telescopicas soft-close full extension.</p>
  <div class="svg-wrap">
    ${renderIslandSvg(briefing, allModules)}
  </div>
  <div style="margin-top:8px">
    <table>
      <tr><th>Componente</th><th>Especificacao</th></tr>
      <tr><td>Tampo</td><td>Vidro temperado 8mm com bordas polidas</td></tr>
      <tr><td>Divisores superiores</td><td>Veludo sobre MDF — Joias, Oculos</td></tr>
      <tr><td>Gavetas</td><td>Corredicas telescopicas soft-close, profundidade 500mm</td></tr>
      <tr><td>Puxadores</td><td>Perfil embutido (gola) ou puxador tubular — conforme projeto</td></tr>
      ${((briefing.zones || []).find(z => z.name.toLowerCase().includes("ilha"))?.items || []).map(it => `<tr><td>${esc(it.type)}</td><td>${(it.features || []).join(", ") || "-"}${it.categories ? " | Categorias: " + it.categories.join(", ") : ""}</td></tr>`).join("")}
    </table>
  </div>` : `
  <p style="color:#888;font-style:italic">Ilha central nao especificada neste projeto. Esta prancha mostraria 4 vistas (frontal, posterior, lateral esquerda, lateral direita) com todas as gavetas categorizadas e dimensionadas.</p>
  <div class="svg-wrap" style="text-align:center;padding:40px;color:#aaa">
    <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" style="width:300px;height:auto">
      <rect x="50" y="30" width="300" height="140" fill="#f5f5f5" stroke="#ccc" stroke-width="2" stroke-dasharray="8,4" rx="4"/>
      <text x="200" y="100" text-anchor="middle" font-size="14" fill="#aaa" font-family="Arial,sans-serif">ILHA CENTRAL</text>
      <text x="200" y="120" text-anchor="middle" font-size="10" fill="#ccc" font-family="Arial,sans-serif">Nao especificada</text>
    </svg>
  </div>`}
  ${pranchaFooter(7, clientName, projectType, designer, sessionId, "A3 Landscape")}
</div>

<!-- ================================================================ -->
<!-- PRANCHA 08 — MAKEUP + AREA ARMAS                                -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-08">
  ${pranchaHeader(8, "MAKEUP + AREA ARMAS", clientName, projectType, "A3 Landscape", sessionId, designer)}
  ${(hasMakeup || hasGun) ? `
  <p style="font-size:11px;color:#666;margin-bottom:8px">Elevacoes de areas especiais com detalhamento de iluminacao, espelhos e componentes internos.</p>
  <div class="svg-wrap">
    ${renderMakeupGunSvg(briefing, allModules)}
  </div>
  <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
    ${hasMakeup ? `<div>
      <h3 style="font-size:13px;font-weight:700;margin-bottom:6px">Area Makeup</h3>
      <table>
        <tr><th>Componente</th><th>Especificacao</th></tr>
        <tr><td>Espelho</td><td>Espelho com moldura — dimensao conforme projeto</td></tr>
        <tr><td>Iluminacao</td><td>Fita LED branco quente ao redor do espelho</td></tr>
        <tr><td>Bancada</td><td>Altura 850mm, profundidade 500mm</td></tr>
        <tr><td>Gavetas</td><td>3 gavetas com corredicas soft-close</td></tr>
        ${((briefing.zones || []).find(z => z.name.toLowerCase().includes("makeup"))?.constraints || []).map(c => `<tr><td>Restricao</td><td>${esc(c.type)}: ${c.value_mm || 0}mm rel. ${esc(c.relative_to || "-")}</td></tr>`).join("")}
      </table>
    </div>` : ""}
    ${hasGun ? `<div>
      <h3 style="font-size:13px;font-weight:700;margin-bottom:6px">Area Armas</h3>
      <table>
        <tr><th>Componente</th><th>Especificacao</th></tr>
        <tr><td>Porta</td><td>Espelho frontal com dobradicas 110&deg; soft-close</td></tr>
        <tr><td>Prateleiras</td><td>Internas com fita LED e sensor de porta</td></tr>
        <tr><td>Sensor</td><td>Acionamento automatico ao abrir porta</td></tr>
        <tr><td>Cases</td><td>Armazenamento de cases na parte inferior</td></tr>
      </table>
    </div>` : ""}
  </div>` : `
  <p style="color:#888;font-style:italic">Areas de makeup e armas nao especificadas neste projeto. Estas areas recebem detalhamento de iluminacao LED, espelhos e componentes internos quando presentes no briefing.</p>`}
  ${pranchaFooter(8, clientName, projectType, designer, sessionId, "A3 Landscape")}
</div>

<!-- ================================================================ -->
<!-- PRANCHA 09 — LISTA DE MATERIAIS (BOM)                           -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-09">
  ${pranchaHeader(9, "LISTA DE MATERIAIS (BOM)", clientName, projectType, "A3 Landscape", sessionId, designer)}
  <div class="metrics">
    <div class="metric blue"><div class="val">${s.total_modules}</div><div class="lbl">Modulos</div></div>
    <div class="metric green"><div class="val">${s.total_parts}</div><div class="lbl">Pecas Totais</div></div>
    <div class="metric orange"><div class="val">${s.total_sheets}</div><div class="lbl">Chapas</div></div>
    <div class="metric gold"><div class="val">${s.efficiency_percent}%</div><div class="lbl">Eficiencia</div></div>
    <div class="metric purple"><div class="val">${s.hardware_items}</div><div class="lbl">Ferragens</div></div>
  </div>
  <div class="cost-box">
    <div class="amount">$${fmtCost(costUsd)}</div>
    <div class="desc">Estimated material cost (USD)</div>
  </div>

  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#333">Lista Completa de Pecas</h3>
  <table>
    <tr>
      <th>#</th><th>Peca</th><th>Modulo</th><th>Zona</th><th>Qtd</th>
      <th>Largura mm</th><th>Altura mm</th><th>Esp. mm</th>
      <th>Material</th><th>Fita de Borda</th><th>Veio</th><th>Cor</th>
    </tr>
    ${(() => {
      let html = "";
      let idx = 1;
      for (const [zone, cuts] of Object.entries(cutsByZone)) {
        html += `<tr class="zone-header"><td colspan="12">${esc(zone)}</td></tr>`;
        for (const c of cuts) {
          html += `<tr>
            <td>${idx++}</td><td>${esc(c.piece)}</td><td>${esc(c.module)}</td><td>${esc(c.zone)}</td>
            <td>${c.qty}</td><td>${c.w}</td><td>${c.h}</td><td>${c.thickness}</td>
            <td>${esc(c.material)}</td><td>${esc(c.edge)}</td><td>${c.grain}</td>
            <td><span style="display:inline-block;width:14px;height:14px;background:${c.colorHex || "#ccc"};border:1px solid #999;vertical-align:middle;border-radius:2px"></span> ${esc(c.colorHex || "-")}</td>
          </tr>`;
        }
      }
      return html;
    })()}
    <tr class="total-row">
      <td colspan="4">TOTAL</td>
      <td>${allCuts.reduce((a, c) => a + c.qty, 0)}</td>
      <td colspan="7">${allCuts.length} tipos de peca | ${Object.keys(m2ByMaterial).map(k => esc(k) + ": " + m2ByMaterial[k].toFixed(2) + " m&sup2;").join(" | ")}</td>
    </tr>
  </table>
  ${pranchaFooter(9, clientName, projectType, designer, sessionId, "A3 Landscape")}
</div>

<!-- ================================================================ -->
<!-- PRANCHA 10 — PLANO DE CORTE (NESTING)                           -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-10">
  ${pranchaHeader(10, "PLANO DE CORTE (NESTING)", clientName, projectType, "A2 Landscape", sessionId, designer)}
  <div class="metrics">
    <div class="metric blue"><div class="val">${nest.totalSheets}</div><div class="lbl">Chapas Totais</div></div>
    <div class="metric green"><div class="val">${nest.totalParts}</div><div class="lbl">Pecas Encaixadas</div></div>
    <div class="metric gold"><div class="val">${nest.globalEfficiency.toFixed(1)}%</div><div class="lbl">Eficiencia Global</div></div>
    <div class="metric orange"><div class="val">${nest.totalLinearEdgeBand.toFixed(1)}m</div><div class="lbl">Fita de Borda</div></div>
    <div class="metric purple"><div class="val">${nest.estimatedMachineTime.toFixed(0)} min</div><div class="lbl">Tempo Estimado</div></div>
  </div>
  <div class="eff-bar"><div class="eff-fill" style="width:${Math.min(100, nest.globalEfficiency)}%;background:${effColor}">${nest.globalEfficiency.toFixed(1)}% eficiencia global</div></div>

  <h3 style="font-size:13px;font-weight:700;margin:16px 0 4px;color:#333">Resumo por Material</h3>
  <table>
    <tr><th>Material</th><th>Chapas</th><th>Eficiencia Media</th></tr>
    ${Object.entries(sheetsByMaterial).map(([mat, data]) => `<tr><td>${esc(mat)}</td><td>${data.count}</td><td>${(data.totalEff / data.count).toFixed(1)}%</td></tr>`).join("")}
  </table>

  ${nest.sheets.map((sheet, i) => {
    const effPct = (1 - sheet.waste) * 100;
    const eColor = effPct >= 80 ? "#27ae60" : effPct >= 60 ? "#e6a817" : "#e74c3c";
    return `
  <div class="sheet-section">
    <h3>Chapa ${sheet.id} de ${nest.totalSheets} &mdash; ${esc(sheet.material)} (Boa Vista) &mdash; Aproveitamento: ${effPct.toFixed(1)}%</h3>
    <p style="font-size:11px;color:#666">Dimensoes: ${sheet.width} x ${sheet.height} mm | Pecas: ${sheet.items.length} | Desperdicio: ${(sheet.waste * 100).toFixed(1)}%</p>
    <div class="svg-wrap">
      ${renderSheetSvg(sheet, i)}
    </div>
    <div class="eff-bar"><div class="eff-fill" style="width:${effPct}%;background:${eColor}">${effPct.toFixed(1)}%</div></div>
  </div>`;
  }).join("")}
  ${pranchaFooter(10, clientName, projectType, designer, sessionId, "A2 Landscape")}
</div>

<!-- ================================================================ -->
<!-- PRANCHA 11 — FERRAGENS                                          -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-11">
  ${pranchaHeader(11, "FERRAGENS", clientName, projectType, "A3 Landscape", sessionId, designer)}
  <div class="metrics">
    <div class="metric purple"><div class="val">${s.hardware_items}</div><div class="lbl">Total Ferragens</div></div>
    <div class="metric blue"><div class="val">${hwItems.length}</div><div class="lbl">Tipos Distintos</div></div>
  </div>

  ${hwItems.length > 0 ? `
  <table>
    <tr><th style="width:30px"></th><th>Ferragem</th><th>Tipo</th><th>Modulo</th><th>Zona</th><th>Qtd</th><th>Especificacao</th></tr>
    ${(() => {
      let html = "";
      let currentType = "";
      const hwIcon = (type: string): string => {
        const s = type.toLowerCase();
        if (s.includes("dobradica")) return '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="2" y="4" width="8" height="16" rx="1" fill="none" stroke="#555" stroke-width="1.5"/><path d="M10 8 Q16 12 10 16" fill="none" stroke="#555" stroke-width="1.5"/><circle cx="10" cy="12" r="1.5" fill="#555"/></svg>';
        if (s.includes("corredica") || s.includes("trilho")) return '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="2" y="9" width="18" height="6" rx="1" fill="none" stroke="#555" stroke-width="1.2"/><line x1="6" y1="12" x2="16" y2="12" stroke="#555" stroke-width="1"/><polygon points="18,10 22,12 18,14" fill="#555"/></svg>';
        if (s.includes("puxador")) return '<svg viewBox="0 0 24 24" width="20" height="20"><line x1="4" y1="12" x2="20" y2="12" stroke="#555" stroke-width="2" stroke-linecap="round"/><rect x="6" y="10" width="4" height="4" rx="1" fill="#888"/><rect x="14" y="10" width="4" height="4" rx="1" fill="#888"/></svg>';
        if (s.includes("led") || s.includes("iluminacao")) return '<svg viewBox="0 0 24 24" width="20" height="20"><line x1="2" y1="12" x2="22" y2="12" stroke="#FFD700" stroke-width="2"/><circle cx="6" cy="12" r="2" fill="#FFD700"/><circle cx="12" cy="12" r="2" fill="#FFD700"/><circle cx="18" cy="12" r="2" fill="#FFD700"/></svg>';
        if (s.includes("sensor")) return '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="4" fill="none" stroke="#e74c3c" stroke-width="1.5"/><circle cx="12" cy="12" r="1.5" fill="#e74c3c"/><path d="M6 6 Q12 2 18 6" fill="none" stroke="#e74c3c" stroke-width="1"/><path d="M8 8 Q12 5 16 8" fill="none" stroke="#e74c3c" stroke-width="0.8"/></svg>';
        if (s.includes("suporte")) return '<svg viewBox="0 0 24 24" width="20" height="20"><line x1="12" y1="4" x2="12" y2="16" stroke="#555" stroke-width="2"/><rect x="6" y="16" width="12" height="4" rx="1" fill="none" stroke="#555" stroke-width="1.2"/></svg>';
        if (s.includes("barra") || s.includes("cabideiro")) return '<svg viewBox="0 0 24 24" width="20" height="20"><line x1="4" y1="10" x2="20" y2="10" stroke="#555" stroke-width="2.5" stroke-linecap="round"/><circle cx="4" cy="10" r="2.5" fill="#888" stroke="#555" stroke-width="0.5"/><circle cx="20" cy="10" r="2.5" fill="#888" stroke="#555" stroke-width="0.5"/><line x1="4" y1="4" x2="4" y2="10" stroke="#555" stroke-width="1"/><line x1="20" y1="4" x2="20" y2="10" stroke="#555" stroke-width="1"/></svg>';
        return '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="#555" stroke-width="1.2"/><circle cx="12" cy="12" r="3" fill="none" stroke="#555" stroke-width="1"/></svg>';
      };
      for (const hw of hwItems) {
        if (hw.type !== currentType) {
          currentType = hw.type;
          html += '<tr class="zone-header"><td colspan="7">' + esc(currentType.toUpperCase()) + '</td></tr>';
        }
        html += '<tr><td style="text-align:center">' + hwIcon(hw.type) + '</td><td>' + esc(hw.name) + '</td><td>' + esc(hw.type) + '</td><td>' + esc(hw.module) + '</td><td>' + esc(hw.zone) + '</td><td>' + hw.qty + '</td><td>' + esc(hw.spec) + '</td></tr>';
      }
      return html;
    })()}
    <tr class="total-row"><td colspan="5">TOTAL</td><td>${bp.hardwareMap.length}</td><td></td></tr>
  </table>` : `<p style="color:#888;font-style:italic">Nenhuma ferragem listada.</p>`}
  ${pranchaFooter(11, clientName, projectType, designer, sessionId, "A3 Landscape")}
</div>

<!-- ================================================================ -->
<!-- PRANCHA 12 — DETALHES CONSTRUTIVOS                              -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-12">
  ${pranchaHeader(12, "DETALHES CONSTRUTIVOS", clientName, projectType, "A3", sessionId, designer)}

  <!-- Conflicts -->
  ${results.conflicts.length > 0 ? `
  <h3 style="font-size:14px;font-weight:700;margin:8px 0;color:#333">Conflitos de Engenharia (${results.conflicts.length})</h3>
  ${results.conflicts.map(c => {
    const isCrit = c.severity === "CRITICAL";
    return `<div class="conflict-card ${isCrit ? "critical" : "warning"}">
      <div class="sev">${isCrit ? "CRITICO" : "AVISO"} — ${esc(c.type.replace(/_/g, " "))}</div>
      <div class="desc">${esc(c.description)}</div>
      <div class="meta">Modulo(s): ${esc(c.moduleA)}${c.moduleB ? " / " + esc(c.moduleB) : ""}</div>
    </div>`;
  }).join("")}` : `
  <h3 style="font-size:14px;font-weight:700;margin:8px 0;color:#27ae60">Nenhum conflito de engenharia detectado</h3>
  <p style="font-size:12px;color:#666">O interferenceEngine validou todos os modulos e nao encontrou sobreposicoes, violacoes de contorno ou problemas ergonomicos.</p>`}

  <!-- Material Warnings -->
  ${materialWarnings.length > 0 ? `
  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#e6a817">Avisos de Material</h3>
  <ul class="notes-list">
    ${materialWarnings.map((w: string) => `<li style="color:#a67c00">${esc(w)}</li>`).join("")}
  </ul>` : ""}

  <!-- Factory Notes -->
  ${bp.factoryNotes.length > 0 ? `
  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#333">Notas de Fabrica</h3>
  <ul class="notes-list">
    ${bp.factoryNotes.map(n => `<li>${esc(n)}</li>`).join("")}
  </ul>` : ""}

  <!-- Material Palette -->
  ${materialPalette.length > 0 ? `
  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#333">Paleta de Materiais</h3>
  <table>
    <tr><th>Cor</th><th>Material</th><th>Categoria</th><th>Fabricante</th></tr>
    ${materialPalette.map((m: any) => `<tr>
      <td><span style="display:inline-block;width:18px;height:18px;background:${m.color || "#ccc"};border:1px solid #999;vertical-align:middle;border-radius:2px;margin-right:6px"></span> ${esc(m.name || "-")}</td>
      <td>${esc(m.category || "-")}</td>
      <td>${esc(m.category || "-")}</td>
      <td>${esc(m.manufacturer || "Boa Vista")}</td>
    </tr>`).join("")}
  </table>` : ""}

  <!-- Briefing Observations -->
  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#333">Observacoes do Briefing</h3>
  <div class="info-grid">
    <div><div class="label">Layout</div><div class="value">${esc(bp.layout || "-")}</div></div>
    <div><div class="label">Material Externo</div><div class="value">${esc(bp.materials.mdfColor || "-")}</div></div>
    <div><div class="label">Material Interno</div><div class="value">${esc(bp.materials.internalColor || "-")}</div></div>
    <div><div class="label">Espessura</div><div class="value">${bp.materials.thickness || 18} mm</div></div>
    <div><div class="label">Zonas no Briefing</div><div class="value">${(briefing.zones || []).length}</div></div>
    <div><div class="label">Paredes</div><div class="value">${(briefing.space?.walls || []).length}</div></div>
    <div><div class="label">Mood Board</div><div class="value">${esc(briefing.materials?.mood_board || "-")}</div></div>
    <div><div class="label">Entrada</div><div class="value">${briefing.space?.entry_point ? esc(briefing.space.entry_point.wall) + " — " + (briefing.space.entry_point.width_m * 1000).toFixed(0) + " mm" : "-"}</div></div>
  </div>

  <!-- Constraints from zones -->
  ${(() => {
    const constraints = (briefing.zones || []).flatMap(z => (z.constraints || []).map(c => ({ zone: z.name, ...c })));
    if (constraints.length === 0) return "";
    return `
  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#333">Restricoes Detectadas</h3>
  <table>
    <tr><th>Zona</th><th>Tipo</th><th>Valor</th><th>Relativo a</th></tr>
    ${constraints.map(c => `<tr><td>${esc(c.zone)}</td><td>${esc(c.type)}</td><td>${c.value_mm ? c.value_mm + " mm" : "-"}</td><td>${esc(c.relative_to || "-")}</td></tr>`).join("")}
  </table>`;
  })()}

  <!-- Assembly Order -->
  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#333">Esquema de Montagem Sugerido</h3>
  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0">
    ${allModules.map((m, i) => `<div style="display:flex;align-items:center;gap:6px">
      <div style="width:28px;height:28px;border-radius:50%;background:${GOLD};color:#fff;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center">${i + 1}</div>
      <span style="font-size:11px;font-weight:600;color:#333">${esc(m.name)}</span>
      ${i < allModules.length - 1 ? '<span style="color:#ccc;font-size:16px">→</span>' : ''}
    </div>`).join("")}
  </div>
  <p style="font-size:10px;color:#888;margin-top:4px">Montar da esquerda para a direita, fixando cada modulo a parede antes de posicionar o proximo. Conferir nivel a cada 2 modulos.</p>

  <!-- Tolerances -->
  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#333">Regras de Tolerancia</h3>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0">
    <div style="padding:10px;background:#f8f8f8;border-radius:4px;border-left:3px solid ${GOLD}">
      <div style="font-size:11px;font-weight:700;color:#333">Folga entre modulos</div>
      <div style="font-size:18px;font-weight:800;color:${GOLD}">2mm</div>
      <div style="font-size:9px;color:#888">Em ambos os lados</div>
    </div>
    <div style="padding:10px;background:#f8f8f8;border-radius:4px;border-left:3px solid ${GOLD}">
      <div style="font-size:11px;font-weight:700;color:#333">Folga piso-modulo</div>
      <div style="font-size:18px;font-weight:800;color:${GOLD}">100mm</div>
      <div style="font-size:9px;color:#888">Pe regulavel</div>
    </div>
    <div style="padding:10px;background:#f8f8f8;border-radius:4px;border-left:3px solid ${GOLD}">
      <div style="font-size:11px;font-weight:700;color:#333">Desconto parede</div>
      <div style="font-size:18px;font-weight:800;color:${GOLD}">5-10mm</div>
      <div style="font-size:9px;color:#888">Por lado encostado</div>
    </div>
    <div style="padding:10px;background:#f8f8f8;border-radius:4px;border-left:3px solid ${GOLD}">
      <div style="font-size:11px;font-weight:700;color:#333">Espessura chapa</div>
      <div style="font-size:18px;font-weight:800;color:${GOLD}">${bp.materials.thickness || 18}mm</div>
      <div style="font-size:9px;color:#888">MDP/MDF + fita de borda</div>
    </div>
  </div>

  <!-- Passage Diagram -->
  ${(() => {
    const passageConstraints = (briefing.zones || []).flatMap(z =>
      (z.constraints || []).filter(c => c.type === "min_passage").map(c => ({ zone: z.name, ...c }))
    );
    if (passageConstraints.length === 0) return "";
    return `
  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#333">Diagrama de Passagem Minima</h3>
  ${passageConstraints.map(pc => `
  <div class="svg-wrap" style="text-align:center">
    <svg viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg" style="width:350px;height:auto">
      ${svgDefs("pass_")}
      <!-- Left wall/module -->
      <rect x="40" y="10" width="30" height="100" fill="#E8E0D0" stroke="${STROKE}" stroke-width="1.5"/>
      <text x="55" y="60" text-anchor="middle" font-size="8" fill="#555" transform="rotate(-90 55 60)" font-family="Arial,sans-serif">${esc(pc.zone)}</text>
      <!-- Right wall/module -->
      <rect x="330" y="10" width="30" height="100" fill="#E8E0D0" stroke="${STROKE}" stroke-width="1.5"/>
      <text x="345" y="60" text-anchor="middle" font-size="8" fill="#555" transform="rotate(-90 345 60)" font-family="Arial,sans-serif">${esc(pc.relative_to || "Parede oposta")}</text>
      <!-- Passage arrow -->
      <line x1="75" y1="60" x2="325" y2="60" stroke="${DIM_RED}" stroke-width="1" marker-start="url(#pass_arrowS)" marker-end="url(#pass_arrowE)"/>
      <text x="200" y="55" text-anchor="middle" font-size="14" font-weight="bold" fill="${DIM_RED}" font-family="Arial,sans-serif">${pc.value_mm || 800} mm min</text>
      <!-- Person silhouette -->
      <circle cx="200" cy="75" r="6" fill="none" stroke="#888" stroke-width="0.8"/>
      <line x1="200" y1="81" x2="200" y2="98" stroke="#888" stroke-width="0.8"/>
      <line x1="192" y1="88" x2="208" y2="88" stroke="#888" stroke-width="0.8"/>
      <line x1="200" y1="98" x2="194" y2="108" stroke="#888" stroke-width="0.8"/>
      <line x1="200" y1="98" x2="206" y2="108" stroke="#888" stroke-width="0.8"/>
      <!-- Floor -->
      <line x1="30" y1="110" x2="370" y2="110" stroke="${STROKE}" stroke-width="2"/>
    </svg>
    <p style="font-size:10px;color:#888;margin-top:4px">Circulacao minima entre ${esc(pc.zone)} e ${esc(pc.relative_to || "parede oposta")}: ${pc.value_mm || 800}mm</p>
  </div>`).join("")}`;
  })()}

  <!-- Cross-section -->
  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#333">Secao Transversal — Espessura de Chapa + Fita de Borda</h3>
  <div class="svg-wrap" style="text-align:center">
    <svg viewBox="0 0 400 100" xmlns="http://www.w3.org/2000/svg" style="width:350px;height:auto">
      ${svgDefs("xs_")}
      <!-- MDP/MDF board -->
      <rect x="50" y="20" width="300" height="40" fill="${MAT_COLORS.bv_lana}" fill-opacity="0.4" stroke="${STROKE}" stroke-width="1.5"/>
      <text x="200" y="44" text-anchor="middle" font-size="11" fill="#555" font-family="Arial,sans-serif">MDP/MDF ${bp.materials.thickness || 18}mm</text>
      <!-- Edge band top -->
      <rect x="50" y="16" width="300" height="4" fill="${GOLD}" opacity="0.7"/>
      <text x="200" y="13" text-anchor="middle" font-size="8" fill="${GOLD}" font-family="Arial,sans-serif">Fita de Borda ABS</text>
      <!-- Dimension -->
      <line x1="370" y1="16" x2="370" y2="60" stroke="${DIM_RED}" stroke-width="0.7" marker-start="url(#xs_arrowS)" marker-end="url(#xs_arrowE)"/>
      <text x="385" y="40" text-anchor="middle" font-size="10" fill="${DIM_RED}" font-weight="bold" font-family="Arial,sans-serif">${bp.materials.thickness || 18}mm</text>
      <!-- Material label -->
      <text x="200" y="80" text-anchor="middle" font-size="9" fill="#888" font-family="Arial,sans-serif">Material: ${esc(bp.materials.mdfColor || "MDP")} | Interno: ${esc(bp.materials.internalColor || "MDP")}</text>
    </svg>
  </div>

  <!-- Summary -->
  <div style="margin-top:20px;padding:16px;background:#f5f5f5;border-radius:6px;border-left:4px solid ${GOLD}">
    <p style="font-size:13px;font-weight:700;margin-bottom:6px">Resumo Final</p>
    <p style="font-size:12px;color:#444">
      ${s.total_modules} modulos | ${s.total_parts} pecas | ${s.total_sheets} chapas |
      Eficiencia ${s.efficiency_percent}% | ${s.hardware_items} ferragens |
      ${s.critical_conflicts} conflitos criticos | ${s.warnings} avisos |
      Custo estimado: $${fmtCost(costUsd)}
    </p>
  </div>

  ${pranchaFooter(12, clientName, projectType, designer, sessionId, "A3")}
</div>

<!-- ================================================================ -->
<!-- PRANCHA FINAL — ORCAMENTO ESTIMADO                               -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-orcamento">
  ${pranchaHeader(TOTAL_PRANCHAS, "ORCAMENTO ESTIMADO", clientName, projectType, "A3 Landscape", sessionId, designer)}
  ${budget ? (() => {
    let html = '<p style="font-size:11px;color:#666;margin-bottom:12px">Orcamento estimado baseado nos materiais e ferragens calculados pelos engines. Valores sujeitos a confirmacao com fornecedor.</p>';

    // Summary cards
    html += '<div class="metrics">';
    html += '<div class="metric green"><div class="val">$' + fmtCost(budget.subtotalMaterial) + '</div><div class="lbl">Materiais</div></div>';
    html += '<div class="metric blue"><div class="val">$' + fmtCost(budget.subtotalFerragens) + '</div><div class="lbl">Ferragens</div></div>';
    html += '<div class="metric orange"><div class="val">$' + fmtCost(budget.subtotalMaoDeObra) + '</div><div class="lbl">Mao de Obra</div></div>';
    html += '<div class="metric gold"><div class="val">$' + fmtCost(budget.custoTotal) + '</div><div class="lbl">Custo Total</div></div>';
    html += '<div class="metric purple"><div class="val">' + Math.round(budget.margem * 100) + '%</div><div class="lbl">Margem</div></div>';
    html += '</div>';

    // Preço de Venda destaque
    html += '<div class="cost-box"><div class="amount">$' + fmtCost(budget.precoVenda) + '</div><div class="desc">Preco de Venda Sugerido (custo + ' + Math.round(budget.margem * 100) + '% margem)</div></div>';

    // Tabela materiais
    html += '<h3 style="font-size:14px;font-weight:700;margin:16px 0 8px">Materiais</h3><table><tr><th>#</th><th>Item</th><th>Qtd</th><th>Unid.</th><th>Preco Unit.</th><th>Total</th></tr>';
    budget.materiais.forEach((m, i) => {
      html += '<tr><td>' + (i + 1) + '</td><td>' + esc(m.item) + '</td><td>' + m.qtd + '</td><td>' + esc(m.unit) + '</td><td>$' + fmtCost(m.unitPrice) + '</td><td>$' + fmtCost(m.total) + '</td></tr>';
    });
    html += '<tr class="total-row"><td colspan="5">Subtotal Materiais</td><td>$' + fmtCost(budget.subtotalMaterial) + '</td></tr></table>';

    // Tabela ferragens
    html += '<h3 style="font-size:14px;font-weight:700;margin:16px 0 8px">Ferragens</h3><table><tr><th>#</th><th>Item</th><th>Qtd</th><th>Unid.</th><th>Preco Unit.</th><th>Total</th></tr>';
    budget.ferragens.forEach((f, i) => {
      html += '<tr><td>' + (i + 1) + '</td><td>' + esc(f.item) + '</td><td>' + f.qtd + '</td><td>' + esc(f.unit) + '</td><td>$' + fmtCost(f.unitPrice) + '</td><td>$' + fmtCost(f.total) + '</td></tr>';
    });
    html += '<tr class="total-row"><td colspan="5">Subtotal Ferragens</td><td>$' + fmtCost(budget.subtotalFerragens) + '</td></tr></table>';

    // Tabela mão de obra
    html += '<h3 style="font-size:14px;font-weight:700;margin:16px 0 8px">Mao de Obra</h3><table><tr><th>#</th><th>Item</th><th>Qtd</th><th>Unid.</th><th>Preco Unit.</th><th>Total</th></tr>';
    budget.maoDeObra.forEach((m, i) => {
      html += '<tr><td>' + (i + 1) + '</td><td>' + esc(m.item) + '</td><td>' + m.qtd.toFixed(1) + '</td><td>' + esc(m.unit) + '</td><td>$' + fmtCost(m.unitPrice) + '</td><td>$' + fmtCost(m.total) + '</td></tr>';
    });
    html += '<tr class="total-row"><td colspan="5">Subtotal Mao de Obra</td><td>$' + fmtCost(budget.subtotalMaoDeObra) + '</td></tr></table>';

    // Custo por módulo
    if (budget.custoPorModulo.length > 0) {
      html += '<h3 style="font-size:14px;font-weight:700;margin:16px 0 8px">Custo por Modulo</h3><table><tr><th>Modulo</th><th>Custo Estimado</th></tr>';
      budget.custoPorModulo.forEach(cm => {
        html += '<tr><td>' + esc(cm.modulo) + '</td><td>$' + fmtCost(cm.custo) + '</td></tr>';
      });
      html += '</table>';
    }

    // Custo por m²
    html += '<div style="margin-top:12px;padding:10px;background:#f5f5f5;border-radius:4px;font-size:12px"><strong>Custo por m&sup2; de chapa:</strong> $' + fmtCost(budget.custoPorM2) + '/m&sup2;</div>';

    // Disclaimer
    html += '<div style="margin-top:16px;padding:12px;background:#FFF8E1;border-left:4px solid #e6a817;border-radius:4px;font-size:11px;color:#666"><strong>Aviso:</strong> Estimated budget based on US market reference prices (2026). Values subject to confirmation with local suppliers. Shipping, taxes, and project-specific costs not included.</div>';

    return html;
  })() : '<p style="color:#888;font-style:italic">Orcamento nao disponivel. Erro no calculo.</p>'}
  ${pranchaFooter(TOTAL_PRANCHAS, clientName, projectType, designer, sessionId, "A3 Landscape")}
</div>

<!-- Final footer -->
<div style="text-align:center;padding:20px;color:#aaa;font-size:10px;border-top:2px solid ${GOLD}">
  SOMA-ID Engine v2.0 | Gerado em ${nowFull()} | Sessao: ${esc(sessionId)} | ${TOTAL_PRANCHAS} pranchas
</div>

</div><!-- .page -->
</body>
</html>`;
}

/* ============================================================
   Internal helpers
   ============================================================ */

/** Detect which zone a module belongs to based on its notes (Zona: XXX) or name/id */
function detectZone(mod: BlueprintModule, briefing: ParsedBriefing): string {
  // Primary: extract zone from module notes (set by engine-bridge during layout)
  const zoneNote = (mod.notes || []).find(n => n.startsWith("Zona:"));
  if (zoneNote) {
    const zoneName = zoneNote.replace("Zona:", "").trim();
    // Remove suffixes like "(cont.)" or "(overflow)"
    return zoneName.replace(/\s*\(cont\.\)/, "").replace(/\s*\(overflow\)/, "").trim();
  }

  const nm = (mod.name || "").toLowerCase();
  const id = (mod.moduleId || "").toLowerCase();
  const zones = briefing.zones || [];

  for (const z of zones) {
    const zn = z.name.toLowerCase();
    if (zn.includes("ilha") && (id.includes("ilha") || nm.includes("ilha"))) return z.name;
    if (zn.includes("makeup") && (id.includes("bancada") || nm.includes("makeup") || nm.includes("vanity"))) return z.name;
    if (zn.includes("arma") && (id.includes("arma") || nm.includes("arma") || nm.includes("gun"))) return z.name;
    if (zn.includes("his") && nm.includes("his")) return z.name;
  }

  if (zones.length > 0) return zones[0].name;
  return "Geral";
}

/** Color map for materials — used by getColorForMaterial and BOM */
const MATERIAL_COLOR_MAP: Record<string, string> = {
  lana: "#e0d5c1", areia: "#e0d5c1",
  lord: "#50617D", "bv_lord": "#50617D",
  branco: "#f5f5f5", "branco neve": "#f5f5f5",
  grafite: "#4a4a4a",
  carvalho: "#c5b49d",
  freijo: "#8e6c4e", "freijó": "#8e6c4e",
  noce: "#5d4037",
  sage: "#879b8a",
};

/** Get a hex color for a specific material name */
function getColorForMaterial(matName: string): string {
  const lower = matName.toLowerCase();
  // MDF 6mm (back panels) — neutral gray, no color
  if (lower.includes("mdf 6mm") || lower.includes("mdf 3mm")) return "#d0d0d0";
  for (const [key, color] of Object.entries(MATERIAL_COLOR_MAP)) {
    if (lower.includes(key)) return color;
  }
  return "#ccc";
}

/** Get a hex color for a module from the blueprint materials */
function getModuleColorHex(mod: BlueprintModule, bp: { materials: { mdfColor: string; internalColor: string } }): string {
  // Use the cut item's actual material name for accurate color
  const matName = mod.cutList?.[0]?.material || bp.materials.mdfColor || "";
  return getColorForMaterial(matName);
}

/** Classify hardware into types for the hardware table */
function classifyHardware(hw: string): { type: string; module: string; zone: string; spec: string } {
  const h = hw.toLowerCase();
  let type = "outros";
  let spec = "";

  if (h.includes("dobradica") || h.includes("hinge")) {
    type = "dobradicas";
    spec = "35mm copo, soft-close";
  } else if (h.includes("corredica") || h.includes("slide") || h.includes("telescop")) {
    type = "corredicas";
    spec = "Telescopica full-extension, soft-close";
  } else if (h.includes("puxador") || h.includes("handle") || h.includes("pull")) {
    type = "puxadores";
    spec = "Conforme projeto";
  } else if (h.includes("led") || h.includes("iluminacao") || h.includes("light")) {
    type = "iluminacao/LED";
    spec = "Fita LED branco quente 3000K";
  } else if (h.includes("sensor")) {
    type = "sensores";
    spec = "Sensor de abertura de porta";
  } else if (h.includes("suporte") || h.includes("support") || h.includes("bracket")) {
    type = "suportes";
    spec = "Suporte invisivel ou pino metalico";
  } else if (h.includes("barra") || h.includes("cabideiro") || h.includes("rod")) {
    type = "barras/cabideiros";
    spec = "Barra oval cromada 25mm";
  } else if (h.includes("trilho") || h.includes("track")) {
    type = "trilhos";
    spec = "Trilho de porta de correr";
  }

  return { type, module: "-", zone: "-", spec };
}
