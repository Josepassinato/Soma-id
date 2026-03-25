/**
 * html-report.ts
 * Orchestrator — composes multi-prancha HTML technical report from modular renderers.
 * P0.1: Extracted helpers into report/ submodules for maintainability.
 */

import type { EngineResults, BlueprintModule, Sheet, InterferenceConflict } from "./engine-bridge.js";
import type { ParsedBriefing } from "../types.js";

// P0.1 — Modular imports
import {
  GOLD, DIM_RED, HDR_BG, HDR_FG, STROKE, LIGHT_FILL,
  MOD_FILLS, PIECE_COLORS, ZONE_COLORS, MAT_COLORS,
  esc, fmtCost, modType, modFill, today, nowFull,
  formatProjectNumber, normalizeScale, STANDARD_SCALES,
} from "./report/svg-primitives.js";
import {
  svgDefs, getMaterialHatchId, getColorForMaterial, MATERIAL_COLOR_MAP,
} from "./report/material-patterns.js";
import {
  DIM_STYLE, dimLine, renderDimH, renderDimV,
  renderElevationCotas, renderElevationVerticalCotas,
  internalVCotas, materialCallout,
} from "./report/dimension-system.js";
import { renderMaterialLegend } from "./report/legend-renderer.js";
import {
  composeSheet, wrapViewBlock, SHEET_COMPOSITION_CSS,
  type ViewBlock,
} from "./report/sheet-composer.js";
import { PREMIUM_CSS } from "./report/premium-page-system.js";
import { resolveModuleTyping } from "./module-typing.js";

/* ============================================================
   Inline definitions removed — now imported from report/ modules
   (svg-primitives, material-patterns, dimension-system, legend-renderer)
   ============================================================ */

/* ============================================================
   Carimbo (Professional Stamp)
   ============================================================ */
function renderCarimbo(
  pranchaNum: number,
  totalPranchas: number,
  clientName: string,
  projectType: string,
  designer: string,
  scale: string,
  format: string,
  sessionId: string,
): string {
  const projectNumber = formatProjectNumber(sessionId);
  return `<div class="carimbo">
    <table>
      <tr><td colspan="4" class="carimbo-header">SOMA-ID</td></tr>
      <tr><td colspan="4" class="carimbo-sub">Sistema Inteligente de Marcenaria Industrial</td></tr>
      <tr><td class="label-col">Cliente</td><td colspan="3">${esc(clientName)}</td></tr>
      <tr><td class="label-col">Ambiente</td><td>${esc(projectType)}</td><td class="label-col">Designer</td><td>${esc(designer)}</td></tr>
      <tr><td class="label-col">Projetista</td><td>SOMA-ID Engine v2</td><td class="label-col">Verificado</td><td>—</td></tr>
      <tr><td class="label-col">Escala</td><td>${esc(scale)}</td><td class="label-col">Formato</td><td>${esc(format)}</td></tr>
      <tr><td class="label-col">Prancha</td><td style="font-weight:700">${String(pranchaNum).padStart(2, "0")} / ${String(totalPranchas).padStart(2, "0")}</td><td class="label-col">Revisao</td><td>RV.01</td></tr>
      <tr><td class="label-col">Data</td><td>${today()}</td><td class="label-col">Projeto</td><td style="font-weight:700;letter-spacing:0.04em">${esc(projectNumber)}</td></tr>
      <tr><td colspan="4" style="text-align:center;font-size:7px;color:#888;padding:2px">Este documento foi gerado automaticamente pelo sistema SOMA-ID. Medidas em milimetros.</td></tr>
    </table>
  </div>`;
}

/* ============================================================
   Module Interior Detail Renderer (restored from pre-vista-interior)
   Renders detailed interior SVG for 9 module subtypes:
   long_garment, short_garment, shoe, boot, bag/vitrine,
   makeup/vanity, gun_safe, jewel/gaveteiro, suitcase/maleiro
   ============================================================ */
function renderModuleInterior(
  moduleType: string,
  subtype: string,
  x: number, y: number,
  w: number, h: number,
  features: string[],
  materialColor: string,
  doorColor: string,
  scaleFactor: number = 1,
): string {
  let svg = "";
  // Scale stroke widths so details remain visible when SVG viewBox >> display size
  const ss = (base: number) => Math.round(base * scaleFactor * 10) / 10;
  const inset = ss(4);
  const ix = x + inset, iy = y + inset;
  const iw = w - inset * 2, ih = h - inset * 2;

  // Module body with material color
  svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${materialColor}" fill-opacity="0.25" stroke="#444" stroke-width="${ss(1.5)}"/>`;

  // 18mm thickness lines on sides
  svg += `<line x1="${x + ss(3)}" y1="${y}" x2="${x + ss(3)}" y2="${y + h}" stroke="#888" stroke-width="${ss(0.5)}"/>`;
  svg += `<line x1="${x + w - ss(3)}" y1="${y}" x2="${x + w - ss(3)}" y2="${y + h}" stroke="#888" stroke-width="${ss(0.5)}"/>`;

  const sub = subtype.toLowerCase();
  const mt = moduleType.toLowerCase();
  const fs = (size: number) => Math.round(size * scaleFactor * 10) / 10; // scaled font size

  if (sub.includes("long_garment") || (mt.includes("cabideiro") && !sub.includes("short"))) {
    // Long garments: bar near top, hanging lines with garment silhouettes
    const barY = iy + ih * 0.06;
    svg += `<line x1="${ix + ss(8)}" y1="${barY}" x2="${ix + iw - ss(8)}" y2="${barY}" stroke="#666" stroke-width="${ss(3)}" stroke-linecap="round"/>`;
    svg += `<circle cx="${ix + ss(8)}" cy="${barY}" r="${ss(4)}" fill="#999" stroke="#666" stroke-width="${ss(0.8)}"/>`;
    svg += `<circle cx="${ix + iw - ss(8)}" cy="${barY}" r="${ss(4)}" fill="#999" stroke="#666" stroke-width="${ss(0.8)}"/>`;
    const gStep = Math.max(ss(16), iw / 8);
    for (let gx = ix + ss(18); gx < ix + iw - ss(12); gx += gStep) {
      const gh = ih * 0.7;
      svg += `<path d="M${gx - ss(6)} ${barY + ss(2)} L${gx} ${barY - ss(3)} L${gx + ss(6)} ${barY + ss(2)}" stroke="#888" stroke-width="${ss(1.2)}" fill="none"/>`;
      svg += `<line x1="${gx}" y1="${barY + ss(2)}" x2="${gx}" y2="${barY + gh}" stroke="#999" stroke-width="${ss(1)}"/>`;
      svg += `<path d="M${gx - ss(8)} ${barY + gh} Q${gx} ${barY + gh + ss(8)} ${gx + ss(8)} ${barY + gh}" stroke="#999" stroke-width="${ss(0.8)}" fill="none"/>`;
    }
    svg += `<text x="${x + w / 2}" y="${y + h - ss(4)}" text-anchor="middle" font-size="${fs(9)}" font-weight="bold" fill="#555" font-family="Arial,sans-serif">CABIDEIRO</text>`;
  } else if (sub.includes("short_garment") || (mt.includes("cabideiro") && sub.includes("short"))) {
    // Short garments: bar higher, shelves below
    const barY = iy + ih * 0.06;
    svg += `<line x1="${ix + ss(8)}" y1="${barY}" x2="${ix + iw - ss(8)}" y2="${barY}" stroke="#666" stroke-width="${ss(3)}" stroke-linecap="round"/>`;
    svg += `<circle cx="${ix + ss(8)}" cy="${barY}" r="${ss(4)}" fill="#999" stroke="#666" stroke-width="${ss(0.8)}"/>`;
    svg += `<circle cx="${ix + iw - ss(8)}" cy="${barY}" r="${ss(4)}" fill="#999" stroke="#666" stroke-width="${ss(0.8)}"/>`;
    const gStep = Math.max(ss(16), iw / 8);
    for (let gx = ix + ss(18); gx < ix + iw - ss(12); gx += gStep) {
      const gh = ih * 0.4;
      svg += `<path d="M${gx - ss(6)} ${barY + ss(2)} L${gx} ${barY - ss(3)} L${gx + ss(6)} ${barY + ss(2)}" stroke="#888" stroke-width="${ss(1.2)}" fill="none"/>`;
      svg += `<line x1="${gx}" y1="${barY + ss(2)}" x2="${gx}" y2="${barY + gh}" stroke="#999" stroke-width="${ss(1)}"/>`;
    }
    const shelfStart = iy + ih * 0.55;
    const shelfCount = 3;
    const spacing = (ih - (shelfStart - iy) - ss(8)) / shelfCount;
    for (let s = 0; s < shelfCount; s++) {
      const sy = shelfStart + s * spacing;
      svg += `<rect x="${ix + ss(2)}" y="${sy}" width="${iw - ss(4)}" height="${ss(4)}" fill="#d8d0c0" stroke="#999" stroke-width="${ss(0.8)}"/>`;
    }
    svg += `<text x="${x + w / 2}" y="${y + h - ss(4)}" text-anchor="middle" font-size="${fs(9)}" font-weight="bold" fill="#555" font-family="Arial,sans-serif">CABIDEIRO CURTO</text>`;
  } else if (sub.includes("shoe") || mt.includes("sapateira")) {
    // Shoe rack: inclined shelves 15° with shoe silhouettes (ellipses)
    const shelfCount = Math.max(4, Math.min(10, Math.round(ih / ss(40))));
    const spacing = ih / (shelfCount + 1);
    for (let s = 1; s <= shelfCount; s++) {
      const sy = iy + s * spacing;
      const tilt = Math.min(ss(10), spacing * 0.3);
      svg += `<line x1="${ix}" y1="${sy + tilt}" x2="${ix + iw}" y2="${sy}" stroke="#777" stroke-width="${ss(1.5)}"/>`;
      if (iw > ss(40)) {
        const shoeW = Math.min(ss(25), iw / 5);
        for (let sx = ix + ss(8); sx < ix + iw - shoeW; sx += shoeW + ss(6)) {
          svg += `<ellipse cx="${sx + shoeW / 2}" cy="${sy + tilt * 0.5 - ss(3)}" rx="${shoeW / 2}" ry="${ss(5)}" fill="#c0b8a8" fill-opacity="0.5" stroke="#888" stroke-width="${ss(0.6)}"/>`;
        }
      }
    }
    svg += `<text x="${x + w / 2}" y="${y + ss(14)}" text-anchor="middle" font-size="${fs(9)}" font-weight="bold" fill="#555" font-family="Arial,sans-serif">SAPATEIRA</text>`;
  } else if (sub.includes("boot")) {
    // Boot rack: wider spaced inclined shelves with boot silhouettes (rectangles)
    const shelfCount = Math.max(3, Math.min(6, Math.round(ih / ss(70))));
    const spacing = ih / (shelfCount + 1);
    for (let s = 1; s <= shelfCount; s++) {
      const sy = iy + s * spacing;
      const tilt = Math.min(ss(12), spacing * 0.25);
      svg += `<line x1="${ix}" y1="${sy + tilt}" x2="${ix + iw}" y2="${sy}" stroke="#777" stroke-width="${ss(1.5)}"/>`;
      if (iw > ss(40)) {
        const bootW = Math.min(ss(20), iw / 4);
        for (let sx = ix + ss(10); sx < ix + iw - bootW; sx += bootW + ss(10)) {
          svg += `<rect x="${sx}" y="${sy + tilt * 0.3 - spacing * 0.5}" width="${bootW}" height="${spacing * 0.45}" rx="${ss(2)}" fill="#a09080" fill-opacity="0.3" stroke="#888" stroke-width="${ss(0.6)}"/>`;
        }
      }
    }
    svg += `<text x="${x + w / 2}" y="${y + ss(14)}" text-anchor="middle" font-size="${fs(9)}" font-weight="bold" fill="#555" font-family="Arial,sans-serif">SAPATEIRA BOTAS</text>`;
  } else if (sub.includes("bag") || mt.includes("vitrine")) {
    // Vitrine: glass shelves (dashed) + LED strips
    const shelfCount = Math.max(3, Math.min(6, Math.round(ih / ss(60))));
    const spacing = ih / (shelfCount + 1);
    for (let s = 1; s <= shelfCount; s++) {
      const sy = iy + s * spacing;
      svg += `<line x1="${ix + ss(2)}" y1="${sy}" x2="${ix + iw - ss(2)}" y2="${sy}" stroke="#6AAAB0" stroke-width="${ss(1.5)}" stroke-dasharray="${ss(8)},${ss(4)}"/>`;
      svg += `<line x1="${ix + ss(4)}" y1="${sy - ss(4)}" x2="${ix + iw - ss(4)}" y2="${sy - ss(4)}" stroke="#FFD700" stroke-width="${ss(2)}" opacity="0.7"/>`;
    }
    if (features.includes("glass_door") || mt.includes("vitrine")) {
      svg += `<rect x="${x + ss(1)}" y="${y + ss(1)}" width="${w - ss(2)}" height="${h - ss(2)}" fill="none" stroke="#6AAAB0" stroke-width="${ss(1.2)}" stroke-dasharray="${ss(10)},${ss(5)}" rx="${ss(1)}"/>`;
    }
    svg += `<text x="${x + w / 2}" y="${y + ss(14)}" text-anchor="middle" font-size="${fs(9)}" font-weight="bold" fill="#2288AA" font-family="Arial,sans-serif">VITRINE VIDRO + LED</text>`;
  } else if (sub.includes("makeup") || mt.includes("vanity")) {
    // Makeup station: mirror + LED + countertop + drawers
    const mirrorH = ih * 0.3;
    const mirrorY = iy + ih * 0.08;
    svg += `<rect x="${ix + ss(6)}" y="${mirrorY}" width="${iw - ss(12)}" height="${mirrorH}" fill="#E8F4F8" stroke="#6AAAB0" stroke-width="${ss(1)}"/>`;
    svg += `<line x1="${ix + ss(6)}" y1="${mirrorY}" x2="${ix + iw - ss(6)}" y2="${mirrorY + mirrorH}" stroke="#D0E8F0" stroke-width="${ss(0.5)}"/>`;
    svg += `<line x1="${ix + iw - ss(6)}" y1="${mirrorY}" x2="${ix + ss(6)}" y2="${mirrorY + mirrorH}" stroke="#D0E8F0" stroke-width="${ss(0.5)}"/>`;
    svg += `<line x1="${ix + ss(4)}" y1="${mirrorY - ss(2)}" x2="${ix + iw - ss(4)}" y2="${mirrorY - ss(2)}" stroke="#FFD700" stroke-width="${ss(3)}" opacity="0.8"/>`;
    svg += `<line x1="${ix + ss(4)}" y1="${mirrorY + mirrorH + ss(2)}" x2="${ix + iw - ss(4)}" y2="${mirrorY + mirrorH + ss(2)}" stroke="#FFD700" stroke-width="${ss(3)}" opacity="0.8"/>`;
    svg += `<text x="${x + w / 2}" y="${mirrorY + mirrorH / 2 + ss(3)}" text-anchor="middle" font-size="${fs(8)}" fill="#6AA" font-family="Arial,sans-serif">ESPELHO</text>`;
    const counterY = mirrorY + mirrorH + ih * 0.08;
    svg += `<rect x="${x}" y="${counterY}" width="${w}" height="${ss(6)}" fill="#d0c8b8" stroke="#888" stroke-width="${ss(1)}"/>`;
    svg += `<text x="${x + w / 2}" y="${counterY - ss(3)}" text-anchor="middle" font-size="${fs(7)}" fill="#888" font-family="Arial,sans-serif">BANCADA 850mm</text>`;
    const drawStart = counterY + ss(10);
    const drawCount = 3;
    const drawH = (iy + ih - drawStart - ss(4)) / drawCount;
    for (let d = 0; d < drawCount; d++) {
      const dy = drawStart + d * drawH;
      svg += `<rect x="${ix + ss(2)}" y="${dy}" width="${iw - ss(4)}" height="${drawH - ss(4)}" fill="${materialColor}" fill-opacity="0.15" stroke="#999" stroke-width="${ss(0.8)}" rx="${ss(1)}"/>`;
      svg += `<line x1="${x + w / 2 - ss(12)}" y1="${dy + (drawH - ss(4)) / 2}" x2="${x + w / 2 + ss(12)}" y2="${dy + (drawH - ss(4)) / 2}" stroke="#888" stroke-width="${ss(2)}" stroke-linecap="round"/>`;
    }
  } else if (sub.includes("case") || mt.includes("arma")) {
    // Gun safe: mirror door + shelves + sensor + LED
    svg += `<rect x="${ix + ss(2)}" y="${iy + ss(2)}" width="${iw - ss(4)}" height="${ih - ss(4)}" fill="#E0E8E8" stroke="#6AAAB0" stroke-width="${ss(1)}"/>`;
    svg += `<line x1="${ix + ss(2)}" y1="${iy + ss(2)}" x2="${ix + iw - ss(2)}" y2="${iy + ih - ss(2)}" stroke="#D0E8F0" stroke-width="${ss(0.6)}"/>`;
    svg += `<line x1="${ix + iw - ss(2)}" y1="${iy + ss(2)}" x2="${ix + ss(2)}" y2="${iy + ih - ss(2)}" stroke="#D0E8F0" stroke-width="${ss(0.6)}"/>`;
    svg += `<circle cx="${ix + iw - ss(12)}" cy="${y + h / 2}" r="${ss(5)}" fill="#888" stroke="#666" stroke-width="${ss(0.8)}"/>`;
    svg += `<circle cx="${ix + iw - ss(12)}" cy="${iy + ss(12)}" r="${ss(4)}" fill="none" stroke="#e74c3c" stroke-width="${ss(1)}"/>`;
    svg += `<line x1="${ix + ss(4)}" y1="${iy + ss(4)}" x2="${ix + iw - ss(16)}" y2="${iy + ss(4)}" stroke="#FFD700" stroke-width="${ss(2)}" opacity="0.7"/>`;
    svg += `<text x="${x + w / 2}" y="${y + ss(20)}" text-anchor="middle" font-size="${fs(9)}" font-weight="bold" fill="#555" font-family="Arial,sans-serif">ARMAS</text>`;
  } else if (sub.includes("jewel") || mt.includes("gaveteiro") || mt.includes("ilha")) {
    // Drawers with handles + velvet dividers
    const drawerCount = Math.max(3, Math.min(7, Math.round(ih / ss(50))));
    const topH = ih * 0.08;
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${topH}" fill="#D0E8F0" fill-opacity="0.5" stroke="#6AAAB0" stroke-width="${ss(1)}"/>`;
    const drawerH = (ih - topH - ss(8)) / drawerCount;
    for (let d = 0; d < drawerCount; d++) {
      const dy = iy + topH + d * drawerH;
      svg += `<rect x="${ix + ss(2)}" y="${dy}" width="${iw - ss(4)}" height="${drawerH - ss(4)}" fill="${materialColor}" fill-opacity="0.15" stroke="#999" stroke-width="${ss(0.8)}" rx="${ss(1)}"/>`;
      svg += `<line x1="${x + w / 2 - ss(12)}" y1="${dy + (drawerH - ss(4)) / 2}" x2="${x + w / 2 + ss(12)}" y2="${dy + (drawerH - ss(4)) / 2}" stroke="#888" stroke-width="${ss(2)}" stroke-linecap="round"/>`;
      if (iw > ss(60)) {
        const divCount = Math.min(4, Math.floor(iw / ss(30)));
        for (let dv = 1; dv < divCount; dv++) {
          const dvx = ix + ss(2) + (iw - ss(4)) / divCount * dv;
          svg += `<line x1="${dvx}" y1="${dy + ss(2)}" x2="${dvx}" y2="${dy + drawerH - ss(6)}" stroke="#c0b0a0" stroke-width="${ss(0.6)}" stroke-dasharray="${ss(3)},${ss(3)}"/>`;
        }
      }
    }
  } else if (sub.includes("suitcase") || mt.includes("maleiro")) {
    // Maleiro: open space + suitcase silhouette
    for (let hy = iy + ss(8); hy < iy + ih - ss(20); hy += ss(14)) {
      svg += `<line x1="${ix}" y1="${hy}" x2="${ix + iw}" y2="${hy}" stroke="#ddd" stroke-width="${ss(0.5)}"/>`;
    }
    const sW = Math.min(iw * 0.5, ss(80)); const sH = ih * 0.4;
    svg += `<rect x="${ix + iw / 2 - sW / 2}" y="${iy + ih - sH - ss(10)}" width="${sW}" height="${sH}" rx="${ss(5)}" fill="none" stroke="#999" stroke-width="${ss(1.2)}"/>`;
    svg += `<path d="M${ix + iw / 2 - sW * 0.2} ${iy + ih - sH - ss(10)} Q${ix + iw / 2} ${iy + ih - sH - ss(25)} ${ix + iw / 2 + sW * 0.2} ${iy + ih - sH - ss(10)}" fill="none" stroke="#999" stroke-width="${ss(1)}"/>`;
    svg += `<text x="${x + w / 2}" y="${y + ss(18)}" text-anchor="middle" font-size="${fs(9)}" font-weight="bold" fill="#555" font-family="Arial,sans-serif">MALEIRO</text>`;
  } else if (sub.includes("oven_tower")) {
    // Torre Forno/Micro
    const gap = ss(8);
    const microH = ih * 0.28; const ovenH = ih * 0.35;
    const shelfY = iy + microH + gap; const ovenY = shelfY + gap;
    svg += `<rect x="${ix + ss(4)}" y="${iy + ss(4)}" width="${iw - ss(8)}" height="${microH}" rx="${ss(5)}" fill="#E8E8E8" stroke="#666" stroke-width="${ss(1.5)}"/>`;
    svg += `<rect x="${ix + ss(10)}" y="${iy + ss(10)}" width="${iw * 0.6}" height="${microH - ss(16)}" rx="${ss(3)}" fill="#222" fill-opacity="0.08" stroke="#888" stroke-width="${ss(0.8)}"/>`;
    svg += `<circle cx="${ix + iw - ss(20)}" cy="${iy + microH / 2}" r="${ss(5)}" fill="none" stroke="#888" stroke-width="${ss(1.2)}"/>`;
    svg += `<text x="${x + w / 2}" y="${iy + microH / 2 + ss(3)}" text-anchor="middle" font-size="${fs(8)}" font-weight="bold" fill="#666" font-family="Arial,sans-serif">MICRO</text>`;
    svg += `<rect x="${ix + ss(2)}" y="${shelfY}" width="${iw - ss(4)}" height="${ss(5)}" fill="#d8d0c0" stroke="#999" stroke-width="${ss(0.8)}"/>`;
    svg += `<rect x="${ix + ss(4)}" y="${ovenY}" width="${iw - ss(8)}" height="${ovenH}" rx="${ss(5)}" fill="#E0E0E0" stroke="#555" stroke-width="${ss(1.5)}"/>`;
    svg += `<rect x="${ix + ss(10)}" y="${ovenY + ss(6)}" width="${iw * 0.65}" height="${ovenH - ss(18)}" rx="${ss(3)}" fill="#1a1a1a" fill-opacity="0.06" stroke="#888" stroke-width="${ss(0.8)}"/>`;
    svg += `<circle cx="${ix + iw - ss(20)}" cy="${ovenY + ovenH / 2}" r="${ss(6)}" fill="none" stroke="#888" stroke-width="${ss(1.5)}"/>`;
    svg += `<circle cx="${ix + iw - ss(20)}" cy="${ovenY + ovenH / 2}" r="${ss(2)}" fill="#888"/>`;
    svg += `<text x="${x + w / 2}" y="${ovenY + ovenH / 2 + ss(3)}" text-anchor="middle" font-size="${fs(9)}" font-weight="bold" fill="#555" font-family="Arial,sans-serif">FORNO</text>`;
    const belowY = ovenY + ovenH + gap; const belowH = iy + ih - belowY - ss(4);
    if (belowH > ss(30)) {
      svg += `<rect x="${ix + ss(4)}" y="${belowY}" width="${iw - ss(8)}" height="${belowH}" rx="${ss(1)}" fill="${materialColor}" fill-opacity="0.1" stroke="#999" stroke-width="${ss(0.8)}"/>`;
      svg += `<line x1="${x + w / 2 - ss(12)}" y1="${belowY + belowH / 2}" x2="${x + w / 2 + ss(12)}" y2="${belowY + belowH / 2}" stroke="#888" stroke-width="${ss(2)}" stroke-linecap="round"/>`;
    }
  } else if (sub.includes("cooktop")) {
    const topH = ih * 0.08;
    svg += `<rect x="${x}" y="${iy}" width="${w}" height="${topH}" fill="#d0c8b8" stroke="#888" stroke-width="${ss(1)}"/>`;
    const cY = iy + topH / 2; const spacing = iw / 4;
    for (let ci = 0; ci < 3; ci++) {
      const cx = ix + spacing * (ci + 0.5);
      svg += `<circle cx="${cx}" cy="${cY}" r="${Math.min(spacing * 0.3, ss(15))}" fill="none" stroke="#333" stroke-width="${ss(2)}"/>`;
      svg += `<circle cx="${cx}" cy="${cY}" r="${Math.min(spacing * 0.12, ss(6))}" fill="#333" fill-opacity="0.3"/>`;
    }
    const drawCount = 2; const drawAreaH = ih - topH - ss(8); const drawH = drawAreaH / drawCount;
    for (let d = 0; d < drawCount; d++) {
      const dy = iy + topH + ss(4) + d * drawH;
      svg += `<rect x="${ix + ss(2)}" y="${dy}" width="${iw - ss(4)}" height="${drawH - ss(4)}" fill="${materialColor}" fill-opacity="0.1" stroke="#999" stroke-width="${ss(0.8)}" rx="${ss(1)}"/>`;
      svg += `<line x1="${x + w / 2 - ss(12)}" y1="${dy + (drawH - ss(4)) / 2}" x2="${x + w / 2 + ss(12)}" y2="${dy + (drawH - ss(4)) / 2}" stroke="#888" stroke-width="${ss(2)}" stroke-linecap="round"/>`;
    }
    svg += `<text x="${x + w / 2}" y="${y + h - ss(4)}" text-anchor="middle" font-size="${fs(8)}" font-weight="bold" fill="#555" font-family="Arial,sans-serif">COOKTOP</text>`;
  } else if (sub.includes("sink")) {
    const topH = ih * 0.08;
    svg += `<rect x="${x}" y="${iy}" width="${w}" height="${topH}" fill="#d0c8b8" stroke="#888" stroke-width="${ss(1)}"/>`;
    const cubaW = Math.min(iw * 0.5, ss(150)); const cubaH = topH * 0.7;
    svg += `<ellipse cx="${x + w / 2}" cy="${iy + topH / 2}" rx="${cubaW / 2}" ry="${cubaH / 2}" fill="#C8D8E0" stroke="#888" stroke-width="${ss(1.2)}"/>`;
    svg += `<ellipse cx="${x + w / 2}" cy="${iy + topH / 2}" rx="${cubaW / 2 - ss(6)}" ry="${cubaH / 2 - ss(3)}" fill="none" stroke="#aaa" stroke-width="${ss(0.6)}"/>`;
    const tX = x + w / 2 + cubaW / 2 + ss(12);
    svg += `<line x1="${tX}" y1="${iy - ss(6)}" x2="${tX}" y2="${iy + topH / 2 - ss(5)}" stroke="#888" stroke-width="${ss(2.5)}"/>`;
    svg += `<line x1="${tX - ss(10)}" y1="${iy - ss(6)}" x2="${tX + ss(2)}" y2="${iy - ss(6)}" stroke="#888" stroke-width="${ss(2.5)}" stroke-linecap="round"/>`;
    const drawCount = 3; const drawAreaH = ih - topH - ss(8); const drawH = drawAreaH / drawCount;
    for (let d = 0; d < drawCount; d++) {
      const dy = iy + topH + ss(4) + d * drawH;
      svg += `<rect x="${ix + ss(2)}" y="${dy}" width="${iw - ss(4)}" height="${drawH - ss(4)}" fill="${materialColor}" fill-opacity="0.1" stroke="#999" stroke-width="${ss(0.8)}" rx="${ss(1)}"/>`;
      svg += `<line x1="${x + w / 2 - ss(12)}" y1="${dy + (drawH - ss(4)) / 2}" x2="${x + w / 2 + ss(12)}" y2="${dy + (drawH - ss(4)) / 2}" stroke="#888" stroke-width="${ss(2)}" stroke-linecap="round"/>`;
    }
    svg += `<text x="${x + w / 2}" y="${y + h - ss(4)}" text-anchor="middle" font-size="${fs(8)}" font-weight="bold" fill="#555" font-family="Arial,sans-serif">PIA</text>`;
  } else if (sub.includes("niche")) {
    svg += `<rect x="${ix + ss(2)}" y="${iy + ss(2)}" width="${iw - ss(4)}" height="${ih - ss(4)}" fill="#F8F8F5" stroke="#ccc" stroke-width="${ss(0.8)}" rx="${ss(2)}"/>`;
    if (features.includes("LED")) {
      svg += `<line x1="${ix + ss(4)}" y1="${iy + ss(4)}" x2="${ix + iw - ss(4)}" y2="${iy + ss(4)}" stroke="#FFD700" stroke-width="${ss(3)}" opacity="0.7"/>`;
    }
    svg += `<text x="${x + w / 2}" y="${y + h / 2 + ss(3)}" text-anchor="middle" font-size="${fs(9)}" font-weight="bold" fill="#999" font-family="Arial,sans-serif">NICHO</text>`;
  } else if (sub.includes("corner")) {
    svg += `<line x1="${ix}" y1="${iy}" x2="${ix + iw}" y2="${iy + ih}" stroke="#ccc" stroke-width="${ss(0.8)}" stroke-dasharray="${ss(5)},${ss(5)}"/>`;
    const cX = x + w / 2; const cY2 = y + h / 2;
    svg += `<ellipse cx="${cX}" cy="${cY2 - ss(20)}" rx="${iw * 0.35}" ry="${ss(12)}" fill="none" stroke="#999" stroke-width="${ss(1.2)}" stroke-dasharray="${ss(4)},${ss(4)}"/>`;
    svg += `<ellipse cx="${cX}" cy="${cY2 + ss(20)}" rx="${iw * 0.35}" ry="${ss(12)}" fill="none" stroke="#999" stroke-width="${ss(1.2)}" stroke-dasharray="${ss(4)},${ss(4)}"/>`;
    svg += `<circle cx="${cX}" cy="${cY2}" r="${ss(4)}" fill="#888"/>`;
    svg += `<text x="${cX}" y="${cY2 + ss(40)}" text-anchor="middle" font-size="${fs(8)}" font-weight="bold" fill="#555" font-family="Arial,sans-serif">CANTO</text>`;
  } else if (sub.includes("kitchen_drawer")) {
    const drawerCount = Math.max(2, Math.min(5, Math.round(ih / ss(120))));
    const drawerH = (ih - ss(8)) / drawerCount;
    for (let d = 0; d < drawerCount; d++) {
      const dy = iy + ss(4) + d * drawerH;
      svg += `<rect x="${ix + ss(2)}" y="${dy}" width="${iw - ss(4)}" height="${drawerH - ss(4)}" fill="${materialColor}" fill-opacity="0.1" stroke="#999" stroke-width="${ss(1)}" rx="${ss(1)}"/>`;
      svg += `<circle cx="${x + w / 2}" cy="${dy + (drawerH - ss(4)) / 2}" r="${ss(4)}" fill="#888" stroke="#666" stroke-width="${ss(0.8)}"/>`;
      svg += `<text x="${x + w / 2}" y="${dy + (drawerH - ss(4)) / 2 + ss(14)}" text-anchor="middle" font-size="${fs(7)}" fill="#aaa" font-family="Arial,sans-serif">Gaveta ${d + 1}</text>`;
    }
    svg += `<text x="${x + w / 2}" y="${y + h - ss(4)}" text-anchor="middle" font-size="${fs(8)}" font-weight="bold" fill="#555" font-family="Arial,sans-serif">GAVETEIRO</text>`;
  } else if (sub.includes("upper_cabinet")) {
    const shelfCount = 3; const shelfSpacing = ih / (shelfCount + 1);
    for (let s = 1; s <= shelfCount; s++) {
      const sy = iy + s * shelfSpacing;
      svg += `<line x1="${ix + ss(2)}" y1="${sy}" x2="${ix + iw - ss(2)}" y2="${sy}" stroke="#999" stroke-width="${ss(1.5)}"/>`;
      const dishW = Math.min(iw * 0.15, ss(25));
      for (let di = 0; di < 3 && s < shelfCount; di++) {
        const dx = ix + ss(10) + di * (dishW + ss(8));
        svg += `<rect x="${dx}" y="${sy - ss(16)}" width="${dishW}" height="${ss(14)}" rx="${ss(2)}" fill="none" stroke="#bbb" stroke-width="${ss(0.6)}"/>`;
      }
    }
    svg += `<text x="${x + w / 2}" y="${y + ss(14)}" text-anchor="middle" font-size="${fs(8)}" font-weight="bold" fill="#555" font-family="Arial,sans-serif">ARMARIO SUPERIOR</text>`;
  } else {
    // Generic: shelf divisions
    const divisions = Math.max(2, Math.floor(ih / ss(80)));
    for (let d = 1; d < divisions; d++) {
      const dy = iy + (ih / divisions) * d;
      svg += `<rect x="${ix + ss(2)}" y="${dy}" width="${iw - ss(4)}" height="${ss(4)}" fill="#e0d8d0" stroke="#bbb" stroke-width="${ss(0.6)}"/>`;
    }
  }

  // Door overlay
  if (doorColor && doorColor !== materialColor && (mt.includes("vitrine") || mt.includes("arma") || features.includes("door"))) {
    svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${doorColor}" fill-opacity="0.12" stroke="${doorColor}" stroke-width="${ss(1.2)}" stroke-dasharray="${ss(5)},${ss(5)}"/>`;
  }

  // LED feature
  if (features.includes("LED") && !sub.includes("makeup") && !sub.includes("case") && !sub.includes("niche")) {
    svg += `<line x1="${ix + ss(4)}" y1="${iy + ss(3)}" x2="${ix + iw - ss(4)}" y2="${iy + ss(3)}" stroke="#FFD700" stroke-width="${ss(2)}" opacity="0.6"/>`;
  }

  // Sensor feature
  if (features.includes("sensor") && !sub.includes("case")) {
    svg += `<circle cx="${ix + iw - ss(10)}" cy="${iy + ss(10)}" r="${ss(4)}" fill="none" stroke="#e74c3c" stroke-width="${ss(1)}"/>`;
    svg += `<circle cx="${ix + iw - ss(10)}" cy="${iy + ss(10)}" r="${ss(1.5)}" fill="#e74c3c"/>`;
  }

  return svg;
}

/** Detect subtype and features from a BlueprintModule.
 *  Reads moduleId, name, AND engine notes (e.g. "Subtipo: gavetas", "Zona: Bancada Pia")
 *  to determine the correct visual subtype for renderModuleInterior.
 */
/** Detect module subtype and features.
 *  P0.2: Prefers explicit moduleType/moduleSubtype fields (set by engine).
 *  Falls back to legacy text parsing for old sessions without typing.
 */
function detectModuleDetails(mod: BlueprintModule): { subtype: string; features: string[] } {
  // P0.2 — Use explicit typing as primary source
  if (mod.moduleSubtype && mod.moduleSubtype !== "generic") {
    const features = mod.features ? [...mod.features] : [];
    // Enrich features from notes if not already present
    const notesStr = (mod.notes || []).join(" ").toLowerCase();
    if (notesStr.includes("led") && !features.includes("LED")) features.push("LED");
    if (notesStr.includes("sensor") && !features.includes("sensor")) features.push("sensor");
    if (notesStr.includes("vidro") || notesStr.includes("glass")) { if (!features.includes("glass_door")) features.push("glass_door"); }
    return { subtype: mod.moduleSubtype, features };
  }

  // Legacy fallback for sessions without explicit typing
  const typing = resolveModuleTyping(mod.moduleId || "", mod.notes || []);

  // Map ModuleSubtype back to renderModuleInterior subtype strings
  const subtypeMap: Record<string, string> = {
    long_garment: "long_garment", short_garment: "short_garment", mixed_garment: "long_garment",
    shoe: "shoe", boot: "boot", bag: "bag", jewelry: "jewel",
    suitcase: "suitcase", shelves: "shelves", accessories: "shelves",
    sink_base: "sink_base", cooktop_base: "cooktop_base", oven_tower: "oven_tower",
    upper_cabinet: "upper_cabinet", corner_cabinet: "corner_cabinet", drawer_bank: "kitchen_drawers",
    niche: "niche", steamer: "niche",
    glass_display: "bag", led_panel: "niche", mirror_door: "shelves",
    gun_safe: "case", vanity: "makeup",
    generic: "generic",
  };

  return {
    subtype: subtypeMap[typing.moduleSubtype] || "generic",
    features: typing.features,
  };
}

/** Get material color from module cut list */
function getModuleMaterialColor(mod: BlueprintModule): string {
  const mat = (mod.cutList?.[0]?.material || "").toLowerCase();
  if (mat.includes("lana") || mat.includes("areia")) return MAT_COLORS.bv_lana;
  if (mat.includes("lord")) return MAT_COLORS.bv_lord;
  if (mat.includes("branco")) return MAT_COLORS.mdf_branco;
  return MAT_COLORS.bv_lana;
}

/** Get door/external material color */
function getDoorMaterialColor(mod: BlueprintModule): string {
  const cuts = mod.cutList || [];
  const doorCut = cuts.find(c => (c.piece || "").toLowerCase().includes("porta") || (c.piece || "").toLowerCase().includes("front"));
  if (doorCut) {
    const mat = doorCut.material.toLowerCase();
    if (mat.includes("lord")) return MAT_COLORS.bv_lord;
    if (mat.includes("lana") || mat.includes("areia")) return MAT_COLORS.bv_lana;
  }
  return MAT_COLORS.bv_lord;
}

/** Map material name to SVG hatch pattern ID suffix (used with prefix) */
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
  const padL = 100, padT = 80, padR = 100, padB = 100;
  const vbW = sW + padL + padR;
  const vbH = sD + padT + padB;

  // Calculate auto-scale text
  const rawScaleRatio = Math.ceil(Math.max(roomW, roomD) / 400);
  const autoScaleRatio = normalizeScale(rawScaleRatio);
  const scaleText = `Escala 1:${autoScaleRatio}`;

  let svg = `<svg viewBox="0 0 ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:900px;height:auto;display:block;margin:0 auto;background:#fff;">`;
  svg += svgDefs("fp_");

  // Room outline (thick walls)
  svg += `<rect x="${padL}" y="${padT}" width="${sW}" height="${sD}" fill="#FAFAFA" stroke="${STROKE}" stroke-width="4"/>`;

  // Wall labels
  const wallLabels = ["A", "B", "C", "D"];
  const wallPositions = [
    { x: padL + sW / 2, y: padT - 10, anchor: "middle" },                    // top = A
    { x: padL + sW + 15, y: padT + sD / 2, anchor: "start" },               // right = B
    { x: padL + sW / 2, y: padT + sD + 20, anchor: "middle" },              // bottom = C
    { x: padL - 15, y: padT + sD / 2, anchor: "end" },                       // left = D
  ];
  for (let i = 0; i < Math.min(walls.length, 4); i++) {
    const wp = wallPositions[i];
    svg += `<text x="${wp.x}" y="${wp.y}" text-anchor="${wp.anchor}" font-size="14" font-weight="bold" fill="${STROKE}">Parede ${wallLabels[i]}</text>`;
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
    if (wallIdx === 0 || wallIdx === 2 || wallIdx === -1) {
      svg += `<line x1="${dx}" y1="${dy}" x2="${dx + doorW}" y2="${dy}" stroke="#fff" stroke-width="6"/>`;
      svg += `<line x1="${dx}" y1="${dy}" x2="${dx + doorW}" y2="${dy}" stroke="${STROKE}" stroke-width="2" stroke-dasharray="6,3"/>`;
      // 90-degree arc
      const arcDir = (wallIdx === 2 || wallIdx === -1) ? -1 : 1;
      const arcEndX = dx + doorW * Math.cos(Math.PI / 2);
      const arcEndY = dy + doorW * arcDir * Math.sin(Math.PI / 2);
      svg += `<path d="M${dx} ${dy} A${doorW} ${doorW} 0 0 ${arcDir > 0 ? 0 : 1} ${dx + doorW * 0.0} ${dy + doorW * arcDir}" fill="none" stroke="${STROKE}" stroke-width="1" stroke-dasharray="4,3"/>`;
    } else if (wallIdx === 1 || wallIdx === 3) {
      svg += `<line x1="${dx}" y1="${dy}" x2="${dx}" y2="${dy + doorW}" stroke="#fff" stroke-width="6"/>`;
      svg += `<line x1="${dx}" y1="${dy}" x2="${dx}" y2="${dy + doorW}" stroke="${STROKE}" stroke-width="2" stroke-dasharray="6,3"/>`;
      const arcDir = wallIdx === 1 ? -1 : 1;
      svg += `<path d="M${dx} ${dy} A${doorW} ${doorW} 0 0 ${arcDir > 0 ? 1 : 0} ${dx + doorW * arcDir} ${dy}" fill="none" stroke="${STROKE}" stroke-width="1" stroke-dasharray="4,3"/>`;
    }
    svg += `<text x="${dx + doorW / 2}" y="${dy + (wallIdx === 0 ? -8 : 18)}" text-anchor="middle" font-size="10" fill="${STROKE}">PORTA ${((entry.width_m || 0.9) * 1000).toFixed(0)} mm</text>`;
  }

  // Zones placed on their assigned walls (wall property: north, south, east, west, freestanding)
  if (zones.length > 0) {
    const MODULE_DEPTH_MM = 600; // standard closet depth
    const moduleDepthPx = MODULE_DEPTH_MM * scale;
    const margin = 6;

    // Group zones by wall
    const wallZones: Record<string, typeof zones> = { north: [], south: [], east: [], west: [], freestanding: [] };
    for (const z of zones) {
      const w = (z.wall || "north").toLowerCase();
      if (w === "freestanding") {
        wallZones.freestanding.push(z);
      } else if (w.includes("north")) {
        wallZones.north.push(z);
      } else if (w.includes("south")) {
        wallZones.south.push(z);
      } else if (w.includes("east")) {
        wallZones.east.push(z);
      } else if (w.includes("west")) {
        wallZones.west.push(z);
      } else {
        wallZones.north.push(z); // fallback
      }
      // Handle multi-wall assignments like "north+east"
      if (w.includes("+")) {
        const parts = w.split("+");
        for (const p of parts.slice(1)) {
          const pt = p.trim();
          if (pt === "east" && !wallZones.east.includes(z)) wallZones.east.push(z);
          if (pt === "west" && !wallZones.west.includes(z)) wallZones.west.push(z);
          if (pt === "south" && !wallZones.south.includes(z)) wallZones.south.push(z);
          if (pt === "north" && !wallZones.north.includes(z)) wallZones.north.push(z);
        }
      }
    }

    // Helper: draw a zone rectangle with label + hachura + 600mm depth strips
    const drawZone = (zx: number, zy: number, zw: number, zh: number, z: typeof zones[0], colorIdx: number, isVertical: boolean = false) => {
      const color = ZONE_COLORS[colorIdx % ZONE_COLORS.length];
      svg += `<rect x="${zx}" y="${zy}" width="${zw}" height="${zh}" fill="${color}" stroke="${STROKE}" stroke-width="1" rx="2"/>`;
      // 600mm depth indicator strips (dashed inner lines)
      const depth600Px = MODULE_DEPTH_MM * scale;
      if (!isVertical && zh >= depth600Px * 0.8) {
        // Horizontal zones: show depth strip at 600mm from wall
        svg += `<line x1="${zx + 1}" y1="${zy + Math.min(zh, depth600Px)}" x2="${zx + zw - 1}" y2="${zy + Math.min(zh, depth600Px)}" stroke="#999" stroke-width="0.5" stroke-dasharray="3,2"/>`;
        svg += `<text x="${zx + zw - 2}" y="${zy + Math.min(zh, depth600Px) - 2}" text-anchor="end" font-size="5" fill="#888" font-family="Arial,sans-serif">600mm</text>`;
      } else if (isVertical && zw >= depth600Px * 0.8) {
        svg += `<line x1="${zx + Math.min(zw, depth600Px)}" y1="${zy + 1}" x2="${zx + Math.min(zw, depth600Px)}" y2="${zy + zh - 1}" stroke="#999" stroke-width="0.5" stroke-dasharray="3,2"/>`;
        svg += `<text x="${zx + Math.min(zw, depth600Px) - 2}" y="${zy + 10}" text-anchor="end" font-size="5" fill="#888" font-family="Arial,sans-serif">600</text>`;
      }
      // Diagonal hachura for wall-mounted modules
      if ((z.wall || "").toLowerCase() !== "freestanding") {
        svg += `<rect x="${zx + 1}" y="${zy + 1}" width="${zw - 2}" height="${zh - 2}" fill="url(#fp_hatchPattern)" opacity="0.25" rx="1"/>`;
      }
      const fSize = Math.max(7, Math.min(12, zw / 10, zh / 3));
      svg += `<text x="${zx + zw / 2}" y="${zy + zh / 2 - fSize * 0.2}" text-anchor="middle" font-size="${fSize}" font-weight="bold" fill="${STROKE}" font-family="Arial,sans-serif">${esc(z.name)}</text>`;
      if (z.dimensions) {
        const areM2 = z.dimensions.width_m * z.dimensions.depth_m;
        svg += `<text x="${zx + zw / 2}" y="${zy + zh / 2 + fSize * 0.8}" text-anchor="middle" font-size="${fSize * 0.65}" fill="#666" font-family="Arial,sans-serif">${(z.dimensions.width_m * 1000).toFixed(0)}x${(z.dimensions.depth_m * 1000).toFixed(0)} (${areM2.toFixed(2)} m²)</text>`;
      }
    };

    let colorIdx = 0;

    // NORTH WALL: zones along top, spanning left to right
    {
      let cx = padL + 4;
      const totalW = wallZones.north.reduce((s, z) => s + (z.dimensions?.width_m || roomW / 1000 / Math.max(1, wallZones.north.length)), 0);
      for (const z of wallZones.north) {
        const zwMm = z.dimensions?.width_m || (roomW / 1000 / Math.max(1, wallZones.north.length));
        const zw = (zwMm / totalW) * (sW - 8 - margin * Math.max(0, wallZones.north.length - 1));
        const zh = moduleDepthPx;
        drawZone(cx, padT + 4, zw, zh, z, colorIdx++);
        cx += zw + margin;
      }
    }

    // SOUTH WALL: zones along bottom
    {
      let cx = padL + 4;
      const totalW = wallZones.south.reduce((s, z) => s + (z.dimensions?.width_m || roomW / 1000 / Math.max(1, wallZones.south.length)), 0);
      for (const z of wallZones.south) {
        const zwMm = z.dimensions?.width_m || (roomW / 1000 / Math.max(1, wallZones.south.length));
        const zw = (zwMm / totalW) * (sW - 8 - margin * Math.max(0, wallZones.south.length - 1));
        const zh = moduleDepthPx;
        drawZone(cx, padT + sD - zh - 4, zw, zh, z, colorIdx++);
        cx += zw + margin;
      }
    }

    // EAST WALL: zones along right side, top to bottom
    {
      let cy = padT + moduleDepthPx + 10;
      const totalH = wallZones.east.reduce((s, z) => s + (z.dimensions?.width_m || roomD / 1000 / Math.max(1, wallZones.east.length)), 0);
      for (const z of wallZones.east) {
        const zhMm = z.dimensions?.width_m || (roomD / 1000 / Math.max(1, wallZones.east.length));
        const zh = (zhMm / totalH) * (sD - moduleDepthPx * 2 - 20 - margin * Math.max(0, wallZones.east.length - 1));
        const zw = moduleDepthPx;
        drawZone(padL + sW - zw - 4, cy, zw, zh, z, colorIdx++, true);
        cy += zh + margin;
      }
    }

    // WEST WALL: zones along left side
    {
      let cy = padT + moduleDepthPx + 10;
      const totalH = wallZones.west.reduce((s, z) => s + (z.dimensions?.width_m || roomD / 1000 / Math.max(1, wallZones.west.length)), 0);
      for (const z of wallZones.west) {
        const zhMm = z.dimensions?.width_m || (roomD / 1000 / Math.max(1, wallZones.west.length));
        const zh = (zhMm / totalH) * (sD - moduleDepthPx * 2 - 20 - margin * Math.max(0, wallZones.west.length - 1));
        const zw = moduleDepthPx;
        drawZone(padL + 4, cy, zw, zh, z, colorIdx++, true);
        cy += zh + margin;
      }
    }

    // FREESTANDING (Island): centered in the room
    for (const z of wallZones.freestanding) {
      const zwMm = z.dimensions?.width_m || 1.5;
      const zdMm = z.dimensions?.depth_m || 0.9;
      const zw = zwMm * 1000 * scale;
      const zh = zdMm * 1000 * scale;
      const cx = padL + sW / 2 - zw / 2;
      const cy = padT + sD / 2 - zh / 2;
      drawZone(cx, cy, zw, zh, z, colorIdx++);
      // Clearance indicator (dashed outline)
      const clearance = 600 * scale;
      svg += `<rect x="${cx - clearance}" y="${cy - clearance}" width="${zw + clearance * 2}" height="${zh + clearance * 2}" fill="none" stroke="#999" stroke-width="0.8" stroke-dasharray="4,3" rx="3"/>`;
      svg += `<text x="${cx + zw + clearance + 5}" y="${cy + zh / 2}" font-size="7" fill="#999" font-family="Arial,sans-serif">600mm min</text>`;
    }

    // Human figure (scale reference) in circulation area
    const humanX = padL + sW / 2 + 80;
    const humanY = padT + sD * 0.65;
    const humanR = 5;
    // Head
    svg += `<circle cx="${humanX}" cy="${humanY}" r="${humanR}" fill="none" stroke="#666" stroke-width="1"/>`;
    // Body
    svg += `<line x1="${humanX}" y1="${humanY + humanR}" x2="${humanX}" y2="${humanY + humanR + 18}" stroke="#666" stroke-width="1"/>`;
    // Arms
    svg += `<line x1="${humanX - 8}" y1="${humanY + humanR + 7}" x2="${humanX + 8}" y2="${humanY + humanR + 7}" stroke="#666" stroke-width="1"/>`;
    // Legs
    svg += `<line x1="${humanX}" y1="${humanY + humanR + 18}" x2="${humanX - 6}" y2="${humanY + humanR + 28}" stroke="#666" stroke-width="1"/>`;
    svg += `<line x1="${humanX}" y1="${humanY + humanR + 18}" x2="${humanX + 6}" y2="${humanY + humanR + 28}" stroke="#666" stroke-width="1"/>`;
  }

  // Total area m² in center of room
  const totalAreaM2 = briefing.space?.total_area_m2 || ((roomW / 1000) * (roomD / 1000));
  svg += `<text x="${padL + sW / 2}" y="${padT + sD - 15}" text-anchor="middle" font-size="13" font-weight="bold" fill="${GOLD}" font-family="Arial,sans-serif">Area Total: ${totalAreaM2.toFixed(2)} m²</text>`;

  // North symbol
  const nx = padL + sW - 40, ny = padT + 25;
  svg += `<circle cx="${nx}" cy="${ny}" r="15" fill="none" stroke="${STROKE}" stroke-width="1"/>`;
  svg += `<text x="${nx}" y="${ny - 5}" text-anchor="middle" font-size="10" font-weight="bold" fill="${STROKE}">N</text>`;
  svg += `<line x1="${nx}" y1="${ny + 12}" x2="${nx}" y2="${ny - 12}" stroke="${STROKE}" stroke-width="1.5" marker-end="url(#fp_arrowBlkE)"/>`;

  // Section cut indicators A, B, C, D
  const cuts = [
    { label: "A", x1: padL - 15, y1: padT + sD * 0.3, x2: padL + sW + 15, y2: padT + sD * 0.3 },
    { label: "B", x1: padL + sW * 0.4, y1: padT - 15, x2: padL + sW * 0.4, y2: padT + sD + 15 },
    { label: "C", x1: padL - 15, y1: padT + sD * 0.7, x2: padL + sW + 15, y2: padT + sD * 0.7 },
    { label: "D", x1: padL + sW * 0.75, y1: padT - 15, x2: padL + sW * 0.75, y2: padT + sD + 15 },
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
  // Auto-scale text
  svg += `<text x="${padL + scaleBarW + 20}" y="${padT + sD + 56}" font-size="11" font-weight="bold" fill="${STROKE}" font-family="Arial,sans-serif">${scaleText}</text>`;

  svg += `</svg>`;
  return svg;
}

/* ============================================================
   SVG: Wall Elevation — Vista COM Portas (with doors)
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
  const padL = 100, padR = 80, padT = 40, padB = 130;
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

  // Group modules for Level 2 cotas (architectural groupings)
  const moduleGroups: Array<{ startX: number; endX: number; label: string }> = [];
  let currentGroupStart = -1;
  let currentGroupEnd = -1;
  let currentGroupLabel = "";

  // Sort modules by X position for grouping
  const sortedMods = [...modules].sort((a, b) => (a.position?.x || 0) - (b.position?.x || 0));

  for (let mi = 0; mi < sortedMods.length; mi++) {
    const mod = sortedMods[mi];
    const mx = padL + (mod.position?.x || 0);
    const mEnd = mx + mod.width;
    const mt = modType(mod);

    if (currentGroupStart < 0) {
      currentGroupStart = mx;
      currentGroupEnd = mEnd;
      currentGroupLabel = mod.name.split(" ")[0] || "Grupo";
    } else {
      // If gap between current end and next start is small (<50px), group together
      if (mx - currentGroupEnd < 50) {
        currentGroupEnd = mEnd;
      } else {
        moduleGroups.push({ startX: currentGroupStart, endX: currentGroupEnd, label: currentGroupLabel });
        currentGroupStart = mx;
        currentGroupEnd = mEnd;
        currentGroupLabel = mod.name.split(" ")[0] || "Grupo";
      }
    }
  }
  if (currentGroupStart >= 0) {
    moduleGroups.push({ startX: currentGroupStart, endX: currentGroupEnd, label: currentGroupLabel });
  }

  // Stroke scale factor: SVG uses mm coordinates but renders at max 900px
  // A 5000mm wall at 900px means 1mm SVG = 0.18px screen. Need ~5x multiplier.
  const ssFactor = Math.max(1, vbW / 900);
  const ss = (base: number) => Math.round(base * ssFactor * 10) / 10; // scaled stroke

  // Modules
  for (const mod of modules) {
    const mx = padL + (mod.position?.x || 0);
    const my = padT + wallH - (mod.position?.y || 0) - mod.height;
    const fill = modFill(mod);
    const mt = modType(mod);

    // Module body — base color + material hatch overlay
    const modMat = mod.cutList?.[0]?.material || "";
    const hatchId = getMaterialHatchId(modMat);
    svg += `<rect x="${mx}" y="${my}" width="${mod.width}" height="${mod.height}" fill="${fill}" stroke="#333" stroke-width="${ss(2)}"/>`;
    svg += `<rect x="${mx}" y="${my}" width="${mod.width}" height="${mod.height}" fill="url(#${prefix}${hatchId})" stroke="none"/>`;

    // P0.5 — Trace ID tag in top-left corner (Vista COM Portas)
    if (mod.shortLabel) {
      svg += `<rect x="${mx + ss(2)}" y="${my + ss(2)}" width="${ss(25)}" height="${ss(12)}" fill="#333" fill-opacity="0.8" rx="${ss(2)}"/>`;
      svg += `<text x="${mx + ss(5)}" y="${my + ss(11)}" font-size="${ss(8)}" fill="#fff" font-weight="bold" font-family="monospace">${mod.shortLabel}</text>`;
    }

    // 18mm side panels with ABNT hatch fill (solid material cross-section)
    svg += `<rect x="${mx}" y="${my}" width="18" height="${mod.height}" fill="url(#${prefix}_wallHatch)" stroke="#555" stroke-width="${ss(0.8)}"/>`;
    svg += `<rect x="${mx + mod.width - 18}" y="${my}" width="18" height="${mod.height}" fill="url(#${prefix}_wallHatch)" stroke="#555" stroke-width="${ss(0.8)}"/>`;
    // Top/bottom panels 18mm
    svg += `<rect x="${mx}" y="${my}" width="${mod.width}" height="18" fill="url(#${prefix}_wallHatch)" stroke="#555" stroke-width="${ss(0.5)}" opacity="0.6"/>`;
    svg += `<rect x="${mx}" y="${my + mod.height - 18}" width="${mod.width}" height="18" fill="url(#${prefix}_wallHatch)" stroke="#555" stroke-width="${ss(0.5)}" opacity="0.6"/>`;
    // Depth label below module name
    svg += `<text x="${mx + mod.width / 2}" y="${padT + wallH + ss(34)}" text-anchor="middle" font-size="${ss(7)}" fill="#888" font-family="Arial,sans-serif" font-style="italic">Prof. ${mod.depth}mm</text>`;

    // Interior details based on module type
    const modId = (mod.moduleId || "").toLowerCase();
    const modNotes = (mod.notes || []).join(" ").toLowerCase();
    const insetX = mx + 18; // 18mm offset for side panel thickness
    const insetW = mod.width - 36;

    if (mt === "upper") {
      // Maleiro / luggage — open space with vertical divider + suitcase with handle
      svg += `<rect x="${insetX}" y="${my + 4}" width="${insetW}" height="${mod.height - 8}" fill="none" stroke="#444" stroke-width="${ss(1)}" stroke-dasharray="${ss(6)},${ss(3)}"/>`;
      // Vertical divider
      const divX = insetX + insetW * 0.55;
      svg += `<line x1="${divX}" y1="${my + 8}" x2="${divX}" y2="${my + mod.height - 8}" stroke="#555" stroke-width="${ss(1.5)}"/>`;
      // Large suitcase left with handle
      const suitW = Math.min(insetW * 0.4, 140);
      const suitH = mod.height * 0.65;
      const suitLX = insetX + (divX - insetX) / 2 - suitW / 2;
      const suitLY = my + mod.height - suitH - 8;
      svg += `<rect x="${suitLX}" y="${suitLY}" width="${suitW}" height="${suitH}" fill="none" stroke="#333" stroke-width="${ss(1.5)}" rx="5"/>`;
      svg += `<path d="M${suitLX + suitW * 0.3} ${suitLY} Q${suitLX + suitW * 0.5} ${suitLY - ss(12)} ${suitLX + suitW * 0.7} ${suitLY}" fill="none" stroke="#333" stroke-width="${ss(2)}" stroke-linecap="round"/>`;
      if (insetW > 250) {
        const s2W = suitW * 0.7; const s2H = suitH * 0.7;
        const s2X = divX + (insetX + insetW - divX) / 2 - s2W / 2;
        const s2Y = my + mod.height - s2H - 8;
        svg += `<rect x="${s2X}" y="${s2Y}" width="${s2W}" height="${s2H}" fill="none" stroke="#555" stroke-width="${ss(1)}" rx="4"/>`;
        svg += `<path d="M${s2X + s2W * 0.3} ${s2Y} Q${s2X + s2W * 0.5} ${s2Y - ss(8)} ${s2X + s2W * 0.7} ${s2Y}" fill="none" stroke="#555" stroke-width="${ss(1.5)}" stroke-linecap="round"/>`;
      }
      svg += `<text x="${mx + mod.width / 2}" y="${my + 22}" text-anchor="middle" font-size="${ss(11)}" font-weight="bold" fill="#333" font-family="Arial,sans-serif">MALEIRO</text>`;
    } else if (modId.includes("cabideiro")) {
      // Hanging bar — oval horizontal bar with 2 lateral supports, 3-4 hangers (inverted V), free space below
      const subtipo = modNotes.includes("long") ? "long" : modNotes.includes("short") ? "short" : "mixed";
      const barY = my + mod.height * 0.08;
      // Lateral supports (bracket rectangles)
      svg += `<rect x="${insetX + 6}" y="${barY - ss(12)}" width="${ss(20)}" height="${ss(24)}" fill="none" stroke="#333" stroke-width="${ss(1.5)}" rx="2"/>`;
      svg += `<rect x="${insetX + insetW - 6 - ss(20)}" y="${barY - ss(12)}" width="${ss(20)}" height="${ss(24)}" fill="none" stroke="#333" stroke-width="${ss(1.5)}" rx="2"/>`;
      // Oval bar (thick)
      svg += `<line x1="${insetX + 30}" y1="${barY}" x2="${insetX + insetW - 30}" y2="${barY}" stroke="#222" stroke-width="${ss(6)}" stroke-linecap="round"/>`;
      svg += `<ellipse cx="${insetX + 30}" cy="${barY}" rx="${ss(3)}" ry="${ss(5)}" fill="#333"/>`;
      svg += `<ellipse cx="${insetX + insetW - 30}" cy="${barY}" rx="${ss(3)}" ry="${ss(5)}" fill="#333"/>`;
      // 3-4 hangers as inverted V + garment body
      const hangerCount = Math.max(3, Math.min(5, Math.floor(insetW / 100)));
      const hangerSpacing = insetW / (hangerCount + 1);
      for (let hi = 1; hi <= hangerCount; hi++) {
        const hx = insetX + hi * hangerSpacing;
        const gh = mod.height * (subtipo === "long" ? 0.65 : subtipo === "short" ? 0.40 : 0.55);
        svg += `<circle cx="${hx}" cy="${barY}" r="${ss(2)}" fill="#444"/>`;
        svg += `<polyline points="${hx - ss(14)},${barY + ss(14)} ${hx},${barY + ss(3)} ${hx + ss(14)},${barY + ss(14)}" fill="none" stroke="#333" stroke-width="${ss(1.5)}" stroke-linejoin="round"/>`;
        svg += `<line x1="${hx - ss(14)}" y1="${barY + ss(14)}" x2="${hx + ss(14)}" y2="${barY + ss(14)}" stroke="#333" stroke-width="${ss(1)}"/>`;
        svg += `<path d="M${hx - ss(10)} ${barY + ss(16)} L${hx - ss(14)} ${barY + gh} L${hx + ss(14)} ${barY + gh} L${hx + ss(10)} ${barY + ss(16)}" fill="none" stroke="#888" stroke-width="${ss(1)}" stroke-dasharray="${ss(4)},${ss(2)}"/>`;
      }
      svg += `<text x="${mx + mod.width / 2}" y="${my + mod.height - ss(10)}" text-anchor="middle" font-size="${ss(8)}" fill="#999" font-family="Arial,sans-serif">espaco livre</text>`;
      if (subtipo === "mixed") {
        const divX = mx + mod.width * 0.55;
        svg += `<line x1="${divX}" y1="${my + 5}" x2="${divX}" y2="${my + mod.height - 5}" stroke="#333" stroke-width="${ss(2)}"/>`;
      }
    } else if (modId.includes("prateleira")) {
      // Shelves — thick horizontal lines (black, Promob style)
      const shelfCount = 6;
      const spacing = mod.height / (shelfCount + 1);
      for (let s = 1; s <= shelfCount; s++) {
        const sy = my + s * spacing;
        svg += `<line x1="${insetX}" y1="${sy}" x2="${insetX + insetW}" y2="${sy}" stroke="#333" stroke-width="${ss(3)}"/>`;
        // Pin supports at edges
        svg += `<circle cx="${insetX + 5}" cy="${sy + ss(4)}" r="${ss(2)}" fill="#555"/>`;
        svg += `<circle cx="${insetX + insetW - 5}" cy="${sy + ss(4)}" r="${ss(2)}" fill="#555"/>`;
      }
      svg += `<text x="${insetX + 8}" y="${my + spacing / 2 + 5}" font-size="${ss(10)}" font-weight="bold" fill="${DIM_RED}" font-family="Arial,sans-serif">${Math.round(spacing)}mm</text>`;
    } else if (modId.includes("sapateira")) {
      // Shoe rack — 6 INCLINED shelves at 15° (not horizontal) with shoe profiles
      const isBoots = modNotes.includes("boot") || modId.includes("bota");
      const shelfCount = isBoots ? 5 : 6;
      const spacing = mod.height / (shelfCount + 1);
      for (let s = 1; s <= shelfCount; s++) {
        const sy = my + s * spacing;
        const tilt = ss(15); // 15° incline
        svg += `<line x1="${insetX}" y1="${sy + tilt}" x2="${insetX + insetW}" y2="${sy}" stroke="#333" stroke-width="${ss(2.5)}"/>`;
        // Bracket supports
        svg += `<path d="M${insetX} ${sy + tilt} L${insetX} ${sy + tilt + ss(8)} L${insetX + ss(8)} ${sy + tilt}" fill="none" stroke="#666" stroke-width="${ss(0.8)}"/>`;
        if (s <= shelfCount - 1) {
          const shoeCount = Math.max(2, Math.floor(insetW / ss(50)));
          const shoeSpacing = insetW / (shoeCount + 1);
          for (let si = 1; si <= shoeCount; si++) {
            const sx = insetX + si * shoeSpacing;
            const interpTilt = tilt * (1 - si / (shoeCount + 1));
            const shoeH = isBoots ? spacing * 0.45 : spacing * 0.28;
            svg += `<path d="M${sx - ss(10)} ${sy + interpTilt - 2} L${sx - ss(12)} ${sy + interpTilt - shoeH} L${sx + ss(8)} ${sy + interpTilt - shoeH} L${sx + ss(12)} ${sy + interpTilt - 2}" fill="none" stroke="#777" stroke-width="${ss(0.8)}"/>`;
          }
        }
      }
      svg += `<text x="${insetX + 8}" y="${my + 22}" font-size="${ss(11)}" font-weight="bold" fill="${DIM_RED}" font-family="Arial,sans-serif">${isBoots ? "BOTAS" : "SAPATOS"}</text>`;
    } else if (modId.includes("vitrine")) {
      // Vitrine bolsas: glass shelves (dashed=vidro), LED strip (yellow at top), bag silhouettes, open (no door)
      const shelfCount = 5;
      const spacing = mod.height / (shelfCount + 1);
      for (let s = 1; s <= shelfCount; s++) {
        const sy = my + s * spacing;
        svg += `<line x1="${insetX}" y1="${sy}" x2="${insetX + insetW}" y2="${sy}" stroke="#2288AA" stroke-width="${ss(3)}" stroke-dasharray="${ss(12)},${ss(6)}"/>`;
        svg += `<line x1="${insetX + 3}" y1="${sy - ss(4)}" x2="${insetX + insetW - 3}" y2="${sy - ss(4)}" stroke="#FFD700" stroke-width="${ss(2.5)}" opacity="0.75"/>`;
        svg += `<text x="${insetX + insetW - 2}" y="${sy - ss(6)}" text-anchor="end" font-size="${ss(6)}" fill="#C90" font-family="Arial,sans-serif">LED</text>`;
        if (s <= shelfCount - 1) {
          const bagW = Math.min(insetW * 0.28, 75);
          const bagH = spacing * 0.45;
          const bagX = insetX + insetW / 2 - bagW / 2;
          svg += `<rect x="${bagX}" y="${sy - bagH - 4}" width="${bagW}" height="${bagH}" fill="none" stroke="#666" stroke-width="${ss(1.2)}" rx="4"/>`;
          svg += `<path d="M${bagX + bagW * 0.3} ${sy - bagH - 4} Q${bagX + bagW / 2} ${sy - bagH - ss(14)} ${bagX + bagW * 0.7} ${sy - bagH - 4}" fill="none" stroke="#666" stroke-width="${ss(1)}"/>`;
        }
      }
      svg += `<text x="${mx + mod.width / 2}" y="${my + 22}" text-anchor="middle" font-size="${ss(11)}" font-weight="bold" fill="#2288AA" font-family="Arial,sans-serif">VITRINE VIDRO + LED</text>`;
    } else if (modId.includes("gaveteiro") || modId.includes("ilha")) {
      // Drawers — each separated by horizontal line, centered puxador per front
      const drawerCount = Math.max(3, Math.min(6, Math.floor(mod.height / 150)));
      const margin = 10;
      const totalGap = (drawerCount - 1) * 4;
      const drawerH = (mod.height - margin * 2 - totalGap) / drawerCount;
      for (let d = 0; d < drawerCount; d++) {
        const dy = my + margin + d * (drawerH + 4);
        svg += `<rect x="${insetX}" y="${dy}" width="${insetW}" height="${drawerH}" fill="none" stroke="#333" stroke-width="${ss(2)}" rx="2"/>`;
        if (d > 0) {
          svg += `<line x1="${insetX}" y1="${dy - 2}" x2="${insetX + insetW}" y2="${dy - 2}" stroke="#555" stroke-width="${ss(1)}"/>`;
        }
        const handleW = Math.min(insetW * 0.2, 40);
        svg += `<line x1="${mx + mod.width / 2 - handleW}" y1="${dy + drawerH / 2}" x2="${mx + mod.width / 2 + handleW}" y2="${dy + drawerH / 2}" stroke="#222" stroke-width="${ss(3)}" stroke-linecap="round"/>`;
      }
    } else if (modId.includes("bancada") || modId.includes("vanity")) {
      // Vanity — mirror (rect with X), bancada at 850mm, 3 drawers with puxador
      const mirrorH = mod.height * 0.35;
      const mirrorY = my + mod.height * 0.1;
      svg += `<rect x="${insetX + 8}" y="${mirrorY}" width="${insetW - 16}" height="${mirrorH}" fill="#E8F4F8" stroke="#2288AA" stroke-width="${ss(2.5)}"/>`;
      svg += `<line x1="${insetX + 8}" y1="${mirrorY}" x2="${insetX + insetW - 8}" y2="${mirrorY + mirrorH}" stroke="#AAD0DD" stroke-width="${ss(1)}"/>`;
      svg += `<line x1="${insetX + insetW - 8}" y1="${mirrorY}" x2="${insetX + 8}" y2="${mirrorY + mirrorH}" stroke="#AAD0DD" stroke-width="${ss(1)}"/>`;
      svg += `<text x="${mx + mod.width / 2}" y="${mirrorY + mirrorH / 2 + 5}" text-anchor="middle" font-size="${ss(12)}" font-weight="bold" fill="#2288AA" font-family="Arial,sans-serif">ESPELHO</text>`;
      const counterY = mirrorY + mirrorH + mod.height * 0.05;
      svg += `<rect x="${mx}" y="${counterY}" width="${mod.width}" height="${ss(6)}" fill="#D8D0C0" stroke="#222" stroke-width="${ss(1)}"/>`;
      svg += `<text x="${mx + mod.width / 2}" y="${counterY - ss(5)}" text-anchor="middle" font-size="${ss(9)}" fill="#444" font-family="Arial,sans-serif">BANCADA 850mm</text>`;
      const drawSpace = my + mod.height - counterY - ss(6) - 10;
      const numDraw = 3;
      const dh = drawSpace / numDraw;
      for (let d = 0; d < numDraw; d++) {
        const dy = counterY + ss(6) + 4 + d * dh;
        svg += `<rect x="${insetX}" y="${dy}" width="${insetW}" height="${dh - 4}" fill="none" stroke="#333" stroke-width="${ss(1.8)}" rx="2"/>`;
        svg += `<line x1="${mx + mod.width / 2 - 15}" y1="${dy + (dh - 4) / 2}" x2="${mx + mod.width / 2 + 15}" y2="${dy + (dh - 4) / 2}" stroke="#222" stroke-width="${ss(2.5)}" stroke-linecap="round"/>`;
      }
    } else if (modId.includes("armas")) {
      // Gun safe — mirror door with cross-diagonal hatch + LED icon + sensor icon
      svg += `<rect x="${insetX + 3}" y="${my + 6}" width="${insetW - 6}" height="${mod.height - 12}" fill="#E8F0F0" stroke="#2288AA" stroke-width="${ss(2)}"/>`;
      for (let hy = my + 6; hy < my + mod.height - 6; hy += ss(18)) {
        svg += `<line x1="${insetX + 3}" y1="${hy}" x2="${insetX + insetW - 3}" y2="${hy + ss(18)}" stroke="#99BBCC" stroke-width="${ss(0.8)}"/>`;
        svg += `<line x1="${insetX + insetW - 3}" y1="${hy}" x2="${insetX + 3}" y2="${hy + ss(18)}" stroke="#99BBCC" stroke-width="${ss(0.8)}"/>`;
      }
      svg += `<text x="${mx + mod.width / 2}" y="${my + mod.height / 2 - ss(8)}" text-anchor="middle" font-size="${ss(12)}" font-weight="bold" fill="#2288AA" font-family="Arial,sans-serif">PORTA ESPELHO</text>`;
      // LED icon
      const ledX = mx + mod.width / 2 - ss(25); const ledY = my + mod.height / 2 + ss(10);
      svg += `<path d="M${ledX} ${ledY - ss(6)} L${ledX - ss(3)} ${ledY + ss(1)} L${ledX + ss(2)} ${ledY + ss(1)} L${ledX - ss(1)} ${ledY + ss(8)}" fill="none" stroke="#FFD700" stroke-width="${ss(1.5)}"/>`;
      svg += `<text x="${ledX + ss(6)}" y="${ledY + ss(3)}" font-size="${ss(8)}" fill="#C90" font-family="Arial,sans-serif">LED</text>`;
      // Sensor icon
      const senX = mx + mod.width / 2 + ss(15);
      svg += `<circle cx="${senX}" cy="${ledY}" r="${ss(4)}" fill="none" stroke="#555" stroke-width="${ss(1.5)}"/>`;
      svg += `<path d="M${senX + ss(6)} ${ledY - ss(3)} Q${senX + ss(9)} ${ledY} ${senX + ss(6)} ${ledY + ss(3)}" fill="none" stroke="#555" stroke-width="${ss(1)}"/>`;
      svg += `<text x="${senX + ss(12)}" y="${ledY + ss(3)}" font-size="${ss(8)}" fill="#555" font-family="Arial,sans-serif">SENSOR</text>`;
      // Door handle (oval)
      svg += `<ellipse cx="${insetX + insetW - ss(12)}" cy="${my + mod.height / 2}" rx="${ss(4)}" ry="${ss(8)}" fill="none" stroke="#333" stroke-width="${ss(2)}"/>`;
    } else if (mod.height > 600) {
      // Generic fallback — shelf divisions
      const divisions = Math.floor(mod.height / 400);
      for (let d = 1; d < divisions; d++) {
        const dy = my + (mod.height / divisions) * d;
        svg += `<line x1="${insetX}" y1="${dy}" x2="${insetX + insetW}" y2="${dy}" stroke="#444" stroke-width="${ss(2)}"/>`;
      }
    }

    // Door fronts overlay: laminate texture + puxador oval/embutido (COM portas view)
    if (mt !== "upper" && !modId.includes("prateleira") && !modId.includes("sapateira") && !modId.includes("vitrine")) {
      // Subtle laminate texture lines
      for (let ty = my + 20; ty < my + mod.height - 20; ty += ss(35)) {
        svg += `<line x1="${mx + 3}" y1="${ty}" x2="${mx + mod.width - 3}" y2="${ty}" stroke="#E0D8D0" stroke-width="${ss(0.4)}" opacity="0.5"/>`;
      }
      if (mod.width > 200) {
        const halfW = mod.width / 2;
        svg += `<path d="M${mx + halfW} ${my + mod.height * 0.15} A${halfW * 0.7} ${halfW * 0.7} 0 0 0 ${mx + halfW - halfW * 0.5} ${my + mod.height * 0.15 + halfW * 0.5}" fill="none" stroke="${STROKE}" stroke-width="${ss(0.5)}" stroke-dasharray="3,3"/>`;
        svg += `<path d="M${mx + halfW} ${my + mod.height * 0.15} A${halfW * 0.7} ${halfW * 0.7} 0 0 1 ${mx + halfW + halfW * 0.5} ${my + mod.height * 0.15 + halfW * 0.5}" fill="none" stroke="${STROKE}" stroke-width="${ss(0.5)}" stroke-dasharray="3,3"/>`;
        svg += `<ellipse cx="${mx + halfW - ss(8)}" cy="${my + mod.height * 0.5}" rx="${ss(4)}" ry="${ss(10)}" fill="none" stroke="#666" stroke-width="${ss(1.5)}"/>`;
        svg += `<ellipse cx="${mx + halfW + ss(8)}" cy="${my + mod.height * 0.5}" rx="${ss(4)}" ry="${ss(10)}" fill="none" stroke="#666" stroke-width="${ss(1.5)}"/>`;
      } else if (mod.width > 100) {
        svg += `<path d="M${mx} ${my + mod.height * 0.15} A${mod.width * 0.7} ${mod.width * 0.7} 0 0 1 ${mx + mod.width * 0.5} ${my + mod.height * 0.15 + mod.width * 0.5}" fill="none" stroke="${STROKE}" stroke-width="${ss(0.5)}" stroke-dasharray="3,3"/>`;
        svg += `<ellipse cx="${mx + mod.width - ss(14)}" cy="${my + mod.height * 0.5}" rx="${ss(4)}" ry="${ss(10)}" fill="none" stroke="#666" stroke-width="${ss(1.5)}"/>`;
      }
    }

    // === INTERNAL VERTICAL COTAS (per-module shelf/bar/drawer heights) ===
    {
      const intHeights: number[] = [];
      if (modId.includes("cabideiro")) {
        intHeights.push(Math.round(mod.height * 0.08)); // bar height
      } else if (modId.includes("prateleira")) {
        const sc = 6; const sp = mod.height / (sc + 1);
        for (let s = 1; s <= sc; s++) intHeights.push(Math.round(s * sp));
      } else if (modId.includes("sapateira")) {
        const isB = modNotes.includes("boot") || modId.includes("bota");
        const sc = isB ? 5 : 6; const sp = mod.height / (sc + 1);
        for (let s = 1; s <= sc; s++) intHeights.push(Math.round(s * sp));
      } else if (modId.includes("vitrine")) {
        const sc = 5; const sp = mod.height / (sc + 1);
        for (let s = 1; s <= sc; s++) intHeights.push(Math.round(s * sp));
      } else if (modId.includes("gaveteiro") || modId.includes("ilha")) {
        const dc = Math.max(3, Math.min(6, Math.floor(mod.height / 150)));
        const dh = mod.height / dc;
        for (let d = 1; d < dc; d++) intHeights.push(Math.round(d * dh));
      } else if (modId.includes("bancada") || modId.includes("vanity")) {
        intHeights.push(Math.round(mod.height * 0.1)); // mirror top
        intHeights.push(Math.round(mod.height * 0.45)); // mirror bottom
        intHeights.push(Math.round(mod.height * 0.50)); // counter
      } else if (modId.includes("armas")) {
        const sc = 5; const sp = (mod.height * 0.7) / sc;
        for (let s = 1; s <= sc; s++) intHeights.push(Math.round(15 + s * sp));
        intHeights.push(Math.round(mod.height * 0.75)); // cases start
      }
      if (intHeights.length > 0) {
        svg += internalVCotas(mx, my, mod.width, mod.height, intHeights, `${prefix}_`, ss);
      }
    }

    // === MATERIAL CALLOUT LEADER (first module of each type) ===
    {
      const matName = mod.cutList?.[0]?.material || "MDP 18mm";
      const calloutX = mx + mod.width + ss(30);
      const calloutY = my + mod.height * 0.3;
      if (modId.includes("vitrine")) {
        svg += materialCallout(insetX + insetW / 2, my + mod.height * 0.3, calloutX, calloutY - ss(20), "Vidro temp. 8mm + LED", `${prefix}_`, ss);
      } else if (modId.includes("armas")) {
        svg += materialCallout(mx + mod.width / 2, my + ss(20), calloutX, calloutY - ss(20), "Espelho + sensor porta", `${prefix}_`, ss);
      } else if (modId.includes("bancada")) {
        svg += materialCallout(mx + mod.width / 2, my + mod.height * 0.5, calloutX, calloutY, "Bancada " + matName, `${prefix}_`, ss);
      }
    }

    // Module name — label at bottom of module
    const fontSize = ss(Math.max(9, Math.min(14, mod.width / 12)));
    svg += `<text x="${mx + mod.width / 2}" y="${my + mod.height - ss(6)}" text-anchor="middle" font-size="${fontSize}" font-weight="bold" fill="#222" font-family="Arial,sans-serif">${esc(mod.name)}</text>`;

    // Descriptive label below module (function description)
    const modDesc = modId.includes("cabideiro") ? "Cabideiro vestidos longos" :
      modId.includes("sapateira") && modNotes.includes("boot") ? "Sapateira botas cano alto" :
      modId.includes("sapateira") ? "Sapateira sapatos" :
      modId.includes("vitrine") ? "Vitrine bolsas c/ LED" :
      modId.includes("armas") ? "Armário armas c/ espelho" :
      modId.includes("bancada") ? "Bancada makeup c/ espelho" :
      modId.includes("gaveteiro") || modId.includes("ilha") ? "Gaveteiro ilha central" :
      modId.includes("maleiro") ? "Maleiro / area malas" : "";
    if (modDesc) {
      svg += `<text x="${mx + mod.width / 2}" y="${padT + wallH + ss(10)}" text-anchor="middle" font-size="${ss(9)}" fill="#555" font-family="Arial,sans-serif" font-style="italic">${modDesc}</text>`;
    }
    // Dimensions below
    svg += `<text x="${mx + mod.width / 2}" y="${padT + wallH + ss(22)}" text-anchor="middle" font-size="${ss(8)}" fill="#666" font-family="Arial,sans-serif">${mod.width}x${mod.height}x${mod.depth}</text>`;

    // Module height dimension (right side for tall modules)
    if (mod.height > 800) {
      svg += dimLine(mx + mod.width + 8, my, mx + mod.width + 8, my + mod.height, `${mod.height}`, 9, `${prefix}_`);
    }
  }

  // Professional ABNT horizontal cotas: Level 1 (modules) + Level 2 (total)
  {
    const cotaModules = modules.map(m => ({
      x: padL + (m.position?.x || 0),
      width: m.width,
      label: `${m.width}`,
    }));
    svg += renderElevationCotas(cotaModules, wallW, padL, padT + wallH, ss);
  }

  // P0.6 — ABNT vertical cotas: wall height (left) + module heights (right)
  {
    const vertModules = modules.map(m => ({
      x: padL + (m.position?.x || 0),
      y: m.position?.y || 0,
      width: m.width,
      height: m.height,
      name: m.name,
    }));
    svg += renderElevationVerticalCotas(vertModules, wallH, padL, padT, ss);
  }

  // Material legend with hatch samples
  {
    const matSet = new Map<string, string>();
    for (const m of modules) {
      const matName = m.cutList?.[0]?.material || "MDF 18mm";
      if (!matSet.has(matName.toLowerCase())) {
        matSet.set(matName.toLowerCase(), matName);
      }
      // Also add door material if different
      const doorCut = (m.cutList || []).find(c => (c.piece || "").toLowerCase().includes("porta") || (c.piece || "").toLowerCase().includes("front"));
      if (doorCut && !matSet.has(doorCut.material.toLowerCase())) {
        matSet.set(doorCut.material.toLowerCase(), doorCut.material);
      }
    }
    const matList = Array.from(matSet.values()).map(name => ({ name, color: getColorForMaterial(name) }));
    svg += renderMaterialLegend(matList, `${prefix}_`, padL + wallW - 180, padT - 30 - matList.length * 20);
  }

  svg += `</svg>`;
  return svg;
}

/* ============================================================
   SVG: Wall Elevation — Vista SEM Portas (Interior view)
   ============================================================ */
function renderWallInteriorSvg(
  title: string,
  totalWidth: number,
  modules: BlueprintModule[],
  wallHeight: number = 2400,
  prefix: string = "wi",
): string {
  const wallW = totalWidth || 3000;
  const wallH = Math.max(wallHeight, ...modules.map(m => (m.position?.y || 0) + m.height));
  const padL = 100, padR = 60, padT = 50, padB = 60;
  const vbW = wallW + padL + padR;
  const vbH = wallH + padT + padB;
  // Scale factor: viewBox is much larger than display (max-width 900px)
  const ssFactor = Math.max(1, vbW / 900);

  let svg = `<svg viewBox="0 0 ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:900px;height:auto;display:block;margin:0 auto;background:#fff;">`;
  svg += svgDefs(`${prefix}_`);

  // Title
  svg += `<text x="${padL + wallW / 2}" y="${padT - 20}" text-anchor="middle" font-size="14" font-weight="bold" fill="${STROKE}" font-family="Arial,sans-serif">VISTA INTERNA (SEM PORTAS) — ${esc(title)}</text>`;

  // Wall background
  svg += `<rect x="${padL}" y="${padT}" width="${wallW}" height="${wallH}" fill="#FEFEFE" stroke="${STROKE}" stroke-width="2"/>`;

  // Floor line
  svg += `<line x1="${padL - 20}" y1="${padT + wallH}" x2="${padL + wallW + 20}" y2="${padT + wallH}" stroke="${STROKE}" stroke-width="4"/>`;
  for (let hx = padL - 20; hx < padL + wallW + 20; hx += 15) {
    svg += `<line x1="${hx}" y1="${padT + wallH}" x2="${hx - 8}" y2="${padT + wallH + 8}" stroke="${STROKE}" stroke-width="0.5"/>`;
  }

  // Modules — interior only (no doors) — FULL DETAIL VIEW
  for (const mod of modules) {
    const mx = padL + (mod.position?.x || 0);
    const my = padT + wallH - (mod.position?.y || 0) - mod.height;
    const modId = (mod.moduleId || "").toLowerCase();
    const modNotes = (mod.notes || []).join(" ").toLowerCase();
    const mt = modType(mod);
    const insetX = mx + 6;
    const insetW = mod.width - 12;

    // Module outline (solid = open, no doors)
    const modMatName = mod.cutList?.[0]?.material || "";
    const modHatchId = getMaterialHatchId(modMatName);
    svg += `<rect x="${mx}" y="${my}" width="${mod.width}" height="${mod.height}" fill="#FAFAFA" stroke="#666" stroke-width="1.5"/>`;
    // 18mm side panels with material-specific hatch (ABNT cross-section standard)
    svg += `<rect x="${mx}" y="${my}" width="18" height="${mod.height}" fill="${getColorForMaterial(modMatName)}" stroke="#999" stroke-width="0.5"/>`;
    svg += `<rect x="${mx}" y="${my}" width="18" height="${mod.height}" fill="url(#${prefix}_${modHatchId})" stroke="#999" stroke-width="0.5"/>`;
    svg += `<rect x="${mx + mod.width - 18}" y="${my}" width="18" height="${mod.height}" fill="${getColorForMaterial(modMatName)}" stroke="#999" stroke-width="0.5"/>`;
    svg += `<rect x="${mx + mod.width - 18}" y="${my}" width="18" height="${mod.height}" fill="url(#${prefix}_${modHatchId})" stroke="#999" stroke-width="0.5"/>`;
    // Top/bottom panels
    svg += `<rect x="${mx}" y="${my}" width="${mod.width}" height="18" fill="url(#${prefix}_${modHatchId})" stroke="#999" stroke-width="0.3" opacity="0.5"/>`;
    svg += `<rect x="${mx}" y="${my + mod.height - 18}" width="${mod.width}" height="18" fill="url(#${prefix}_${modHatchId})" stroke="#999" stroke-width="0.3" opacity="0.5"/>`;

    // Use restored renderModuleInterior with detectModuleDetails for rich interior rendering
    {
      const details = detectModuleDetails(mod);
      const matColor = getModuleMaterialColor(mod);
      const doorClr = getDoorMaterialColor(mod);
      svg += renderModuleInterior(mt, details.subtype, mx, my, mod.width, mod.height, details.features, matColor, doorClr, ssFactor);
    }

    // Internal vertical cotas (SEM portas — full detail)
    {
      const intH: number[] = [];
      const ssI = (n: number) => n; // no scaling in interior view
      if (modId.includes("cabideiro")) {
        intH.push(Math.round(mod.height * 0.06));
      } else if (modId.includes("sapateira")) {
        const isB = modNotes.includes("boot") || modId.includes("bota");
        const sc = isB ? 5 : 6; const sp = mod.height / (sc + 1);
        for (let s = 1; s <= sc; s++) intH.push(Math.round(s * sp));
      } else if (modId.includes("vitrine")) {
        const sc = 5; const sp = mod.height / (sc + 1);
        for (let s = 1; s <= sc; s++) intH.push(Math.round(s * sp));
      } else if (modId.includes("gaveteiro") || modId.includes("ilha")) {
        const dc = Math.max(3, Math.min(7, Math.floor(mod.height / 180)));
        const dh = (mod.height - 16) / dc;
        for (let d = 1; d < dc; d++) intH.push(Math.round(8 + d * dh));
      } else if (modId.includes("bancada") || modId.includes("vanity")) {
        intH.push(Math.round(mod.height * 0.12));
        intH.push(Math.round(mod.height * 0.42));
        intH.push(Math.round(mod.height * 0.48));
      } else if (modId.includes("armas")) {
        const sc = 5; const sp = (mod.height * 0.7) / sc;
        for (let s = 1; s <= sc; s++) intH.push(Math.round(15 + s * sp));
        intH.push(Math.round(mod.height * 0.75));
      } else if (modId.includes("prateleira") || mod.height > 600) {
        const sc = Math.max(3, Math.min(8, Math.floor(mod.height / 350)));
        const sp = mod.height / (sc + 1);
        for (let s = 1; s <= sc; s++) intH.push(Math.round(s * sp));
      }
      if (intH.length > 0) {
        svg += internalVCotas(mx, my, mod.width, mod.height, intH, `${prefix}_`, ssI);
      }
    }

    // Depth label
    svg += `<text x="${mx + mod.width / 2}" y="${padT + wallH + 40}" text-anchor="middle" font-size="7" fill="#888" font-family="Arial,sans-serif" font-style="italic">Prof. ${mod.depth}mm</text>`;

    // Module label
    const fontSize = Math.max(8, Math.min(12, mod.width / 12));
    svg += `<text x="${mx + mod.width / 2}" y="${my - 5}" text-anchor="middle" font-size="${fontSize}" font-weight="bold" fill="#333" font-family="Arial,sans-serif">${esc(mod.name)}</text>`;

    // P0.5 — Trace ID tag in top-left corner
    if (mod.shortLabel) {
      svg += `<rect x="${mx + 2}" y="${my + 2}" width="${Math.max(25, mod.shortLabel.length * 6)}" height="12" fill="#333" fill-opacity="0.8" rx="2"/>`;
      svg += `<text x="${mx + 5}" y="${my + 11}" font-size="8" fill="#fff" font-weight="bold" font-family="monospace">${mod.shortLabel}</text>`;
    }

    // Width dimension below each module
    svg += dimLine(mx, padT + wallH + 8, mx + mod.width, padT + wallH + 8, `${mod.width}`, 8, `${prefix}_`);
  }

  // P0.6 — ABNT horizontal cotas (overall width)
  {
    const cotaMods = modules.map(m => ({
      x: padL + (m.position?.x || 0),
      width: m.width,
      label: `${m.width}`,
    }));
    svg += renderElevationCotas(cotaMods, wallW, padL, padT + wallH, (n: number) => n);
  }
  // P0.6 — ABNT vertical cotas (wall height left + module heights right)
  {
    const vertMods = modules.map(m => ({
      x: padL + (m.position?.x || 0),
      y: m.position?.y || 0,
      width: m.width,
      height: m.height,
      name: m.name,
    }));
    svg += renderElevationVerticalCotas(vertMods, wallH, padL, padT, (n: number) => n);
  }

  svg += `</svg>`;
  return svg;
}

/* ============================================================
   SVG: Island 4-View + Top-down 5th view
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

  const viewW = 300, viewH = 220;
  const miniViewW = 260, miniViewH = 180;
  const gap = 25;
  const totalW = viewW * 2 + gap * 3;
  const totalH = viewH * 2 + gap * 3 + miniViewH + gap + 60;

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

    // Main body
    svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="#E8E0D0" stroke="${STROKE}" stroke-width="1.5"/>`;

    // Glass top (front and back views)
    if (v.label.includes("FRONTAL") || v.label.includes("POSTERIOR")) {
      svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh * 0.06}" fill="#D0E8F0" stroke="#6AA" stroke-width="0.8"/>`;
      svg += `<text x="${rx + rw / 2}" y="${ry + rh * 0.04}" text-anchor="middle" font-size="7" fill="#366" font-family="Arial,sans-serif">VIDRO TEMPERADO 8mm</text>`;

      // Drawer divisions
      const numDrawers = Math.min(drawerCategories.length, 7);
      const drawerH = (rh * 0.88) / numDrawers;
      const startY = ry + rh * 0.08;
      for (let d = 0; d < numDrawers; d++) {
        const dy = startY + d * drawerH;
        svg += `<rect x="${rx + 3}" y="${dy}" width="${rw - 6}" height="${drawerH - 3}" fill="#F0EDE5" stroke="#999" stroke-width="0.8" rx="1"/>`;
        // Drawer handle
        svg += `<line x1="${rx + rw / 2 - 15}" y1="${dy + drawerH / 2}" x2="${rx + rw / 2 + 15}" y2="${dy + drawerH / 2}" stroke="#888" stroke-width="2" stroke-linecap="round"/>`;
        // Category label
        const catLabel = drawerCategories[d] || `Gaveta ${d + 1}`;
        svg += `<text x="${rx + rw / 2}" y="${dy + drawerH / 2 + 4}" text-anchor="middle" font-size="8" fill="#555" font-family="Arial,sans-serif">${esc(catLabel)}</text>`;
      }
      // Notes
      svg += `<text x="${rx + rw / 2}" y="${ry + rh + 12}" text-anchor="middle" font-size="7" fill="#888" font-style="italic" font-family="Arial,sans-serif">Divisores em veludo | Corredica Oculta Soft-Close</text>`;
    } else {
      // Side views - simpler with depth dimension
      svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh * 0.06}" fill="#D0E8F0" stroke="#6AA" stroke-width="0.8"/>`;
      const sideDrawers = 4;
      const drawerH = (rh * 0.88) / sideDrawers;
      const startY = ry + rh * 0.08;
      for (let d = 0; d < sideDrawers; d++) {
        const dy = startY + d * drawerH;
        svg += `<rect x="${rx + 3}" y="${dy}" width="${rw - 6}" height="${drawerH - 3}" fill="#F0EDE5" stroke="#999" stroke-width="0.8" rx="1"/>`;
      }
    }

    // Dimensions
    svg += dimLine(rx, ry + rh + 5, rx + rw, ry + rh + 5, `${v.w}`, 9, "isl_");
    svg += dimLine(rx - 12, ry, rx - 12, ry + rh, `${v.h}`, 9, "isl_");
  }

  // 5th mini-view: top-down with velvet divider grid
  const topViewOx = gap;
  const topViewOy = viewH * 2 + gap * 3 + 40;
  svg += `<text x="${topViewOx + miniViewW / 2 + totalW / 4}" y="${topViewOy - 10}" text-anchor="middle" font-size="12" font-weight="bold" fill="${STROKE}" font-family="Arial,sans-serif">VISTA SUPERIOR — Divisores em Veludo</text>`;

  const topSc = Math.min((miniViewW - 20) / iW, (miniViewH - 20) / iD);
  const topRW = iW * topSc;
  const topRH = iD * topSc;
  const topRX = topViewOx + (totalW - topRW) / 2;
  const topRY = topViewOy + 5;

  // Glass top outline
  svg += `<rect x="${topRX}" y="${topRY}" width="${topRW}" height="${topRH}" fill="#D8EEF4" stroke="#6AA" stroke-width="1.5" rx="2"/>`;
  // Velvet divider grid
  const gridCols = Math.max(3, Math.min(8, Math.floor(iW / 150)));
  const gridRows = Math.max(2, Math.min(4, Math.floor(iD / 150)));
  const cellW = topRW / gridCols;
  const cellH = topRH / gridRows;
  for (let col = 1; col < gridCols; col++) {
    svg += `<line x1="${topRX + col * cellW}" y1="${topRY}" x2="${topRX + col * cellW}" y2="${topRY + topRH}" stroke="#A08060" stroke-width="0.8"/>`;
  }
  for (let row = 1; row < gridRows; row++) {
    svg += `<line x1="${topRX}" y1="${topRY + row * cellH}" x2="${topRX + topRW}" y2="${topRY + row * cellH}" stroke="#A08060" stroke-width="0.8"/>`;
  }
  // Labels in cells
  const topLabels = ["JOIAS", "OCULOS", "RELOGIOS", "ANEIS", "BRINCOS", "PULSEIRAS", "ABOTOADURAS", "DIVERSOS"];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      const idx = row * gridCols + col;
      if (idx < topLabels.length) {
        svg += `<text x="${topRX + col * cellW + cellW / 2}" y="${topRY + row * cellH + cellH / 2 + 3}" text-anchor="middle" font-size="7" fill="#806040" font-family="Arial,sans-serif">${topLabels[idx]}</text>`;
      }
    }
  }
  // Dimensions
  svg += dimLine(topRX, topRY + topRH + 8, topRX + topRW, topRY + topRH + 8, `${iW}`, 9, "isl_");
  svg += dimLine(topRX - 12, topRY, topRX - 12, topRY + topRH, `${iD}`, 9, "isl_");

  // Material labels
  svg += `<text x="${topRX + topRW + 20}" y="${topRY + 15}" font-size="8" fill="#555" font-family="Arial,sans-serif">Tampo: Vidro Temperado 10mm</text>`;
  svg += `<text x="${topRX + topRW + 20}" y="${topRY + 28}" font-size="8" fill="#555" font-family="Arial,sans-serif">Corpo: MDP 18mm</text>`;
  svg += `<text x="${topRX + topRW + 20}" y="${topRY + 41}" font-size="8" fill="#555" font-family="Arial,sans-serif">Frentes: MDF 18mm</text>`;
  svg += `<text x="${topRX + topRW + 20}" y="${topRY + 54}" font-size="8" fill="#555" font-family="Arial,sans-serif">Corredica Oculta Soft-Close</text>`;

  svg += `</svg>`;
  return svg;
}

/* ============================================================
   SVG: Nesting Sheet
   ============================================================ */
function renderSheetSvg(sheet: Sheet, sheetIdx: number): string {
  const padL = 40, padR = 20, padT = 15, padB = 40;
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

  // Calculate occupied area for waste hatching
  // First draw waste hatch on entire sheet, then pieces cover it
  svg += `<rect x="${padL}" y="${padT}" width="${drawW}" height="${drawH}" fill="url(#sh${sheetIdx}_wasteHatch)" opacity="0.4"/>`;

  // Placed items
  for (let i = 0; i < sheet.items.length; i++) {
    const item = sheet.items[i];
    const ix = padL + item.x * sc;
    const iy = padT + item.y * sc;
    const iw = item.width * sc;
    const ih = item.height * sc;
    // Color by material if available, else use palette
    const matColor = getColorForMaterial(item.moduleName || "");
    const color = matColor !== "#ccc" ? matColor : PIECE_COLORS[i % PIECE_COLORS.length];

    svg += `<rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="${color}" stroke="${STROKE}" stroke-width="0.8"/>`;

    // Grain direction indicator
    if (item.grainDirection === "vertical") {
      for (let gy = iy + 8; gy < iy + ih - 4; gy += 6) {
        svg += `<line x1="${ix + iw / 2 - 3}" y1="${gy}" x2="${ix + iw / 2 + 3}" y2="${gy}" stroke="#bbb" stroke-width="0.3"/>`;
      }
    } else if (item.grainDirection === "horizontal") {
      for (let gx = ix + 8; gx < ix + iw - 4; gx += 6) {
        svg += `<line x1="${gx}" y1="${iy + ih / 2 - 3}" x2="${gx}" y2="${iy + ih / 2 + 3}" stroke="#bbb" stroke-width="0.3"/>`;
      }
    }

    // Labels inside
    const fontSize = Math.max(5, Math.min(11, iw / 12, ih / 4));
    if (iw > 30 && ih > 15) {
      svg += `<text x="${ix + 3}" y="${iy + fontSize + 2}" font-size="${fontSize}" font-weight="bold" fill="#333" font-family="Arial,sans-serif">${esc(item.partName)}</text>`;
      svg += `<text x="${ix + 3}" y="${iy + fontSize * 2 + 3}" font-size="${fontSize * 0.8}" fill="#666" font-family="Arial,sans-serif">${item.width}x${item.height}${item.rotated ? " R" : ""}${item.grainDirection !== "none" ? (item.grainDirection === "vertical" ? " V" : " H") : ""}</text>`;
      if (iw > 60 && ih > 30) {
        svg += `<text x="${ix + 3}" y="${iy + fontSize * 3 + 3}" font-size="${fontSize * 0.7}" fill="#888" font-family="Arial,sans-serif">${esc(item.moduleName)}</text>`;
      }
    }
  }

  // Sheet dimensions
  svg += dimLine(padL, padT + drawH + 8, padL + drawW, padT + drawH + 8, `${sheet.width} mm`, 10, `sh${sheetIdx}_`);
  svg += dimLine(padL - 15, padT, padL - 15, padT + drawH, `${sheet.height} mm`, 9, `sh${sheetIdx}_`);

  // Efficiency bar at bottom
  const effPct = (1 - sheet.waste) * 100;
  const eColor = effPct >= 80 ? "#27ae60" : effPct >= 60 ? "#e6a817" : "#e74c3c";
  const barY = padT + drawH + 22;
  const barW = drawW;
  svg += `<rect x="${padL}" y="${barY}" width="${barW}" height="8" fill="#ddd" rx="2"/>`;
  svg += `<rect x="${padL}" y="${barY}" width="${barW * effPct / 100}" height="8" fill="${eColor}" rx="2"/>`;
  svg += `<text x="${padL + barW / 2}" y="${barY + 7}" text-anchor="middle" font-size="6" font-weight="bold" fill="#fff" font-family="Arial,sans-serif">${effPct.toFixed(1)}%</text>`;

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

  // Mirror
  const mirrorH = rh * 0.3;
  const mirrorY = ry + rh * 0.15;
  svg += `<rect x="${rx + rw * 0.1}" y="${mirrorY}" width="${rw * 0.8}" height="${mirrorH}" fill="#E8F4F8" stroke="#8AC" stroke-width="1"/>`;
  svg += `<text x="${rx + rw / 2}" y="${mirrorY + mirrorH / 2 + 3}" text-anchor="middle" font-size="8" fill="#6AA" font-family="Arial,sans-serif">ESPELHO</text>`;

  // LED strips around mirror
  svg += `<rect x="${rx + rw * 0.08}" y="${mirrorY - 3}" width="${rw * 0.84}" height="3" fill="#FFE082"/>`;
  svg += `<rect x="${rx + rw * 0.08}" y="${mirrorY + mirrorH}" width="${rw * 0.84}" height="3" fill="#FFE082"/>`;
  svg += `<text x="${rx + rw * 0.08 + rw * 0.42}" y="${mirrorY - 6}" text-anchor="middle" font-size="6" fill="#C90" font-family="Arial,sans-serif">LED</text>`;

  // Countertop
  const counterY = mirrorY + mirrorH + rh * 0.08;
  svg += `<rect x="${rx}" y="${counterY}" width="${rw}" height="${rh * 0.03}" fill="#D8D0C0" stroke="${STROKE}" stroke-width="1"/>`;
  svg += `<text x="${rx + rw / 2}" y="${counterY - 3}" text-anchor="middle" font-size="7" fill="#888" font-family="Arial,sans-serif">BANCADA 850mm</text>`;

  // Drawers below counter
  const drawerStartY = counterY + rh * 0.04;
  const numDraw = 3;
  const drawH = (ry + rh - drawerStartY - rh * 0.08) / numDraw;
  for (let d = 0; d < numDraw; d++) {
    const dy = drawerStartY + d * drawH;
    svg += `<rect x="${rx + 3}" y="${dy}" width="${rw - 6}" height="${drawH - 4}" fill="#F0EDE5" stroke="#999" stroke-width="0.8" rx="1"/>`;
    svg += `<line x1="${rx + rw / 2 - 10}" y1="${dy + drawH / 2 - 2}" x2="${rx + rw / 2 + 10}" y2="${dy + drawH / 2 - 2}" stroke="#888" stroke-width="1.5" stroke-linecap="round"/>`;
  }

  // Material labels
  svg += `<text x="${rx + rw / 2}" y="${ry - 5}" text-anchor="middle" font-size="7" fill="#888" font-family="Arial,sans-serif">Material: MDF 18mm | Acabamento conforme projeto</text>`;

  // Dimensions with cotas
  svg += dimLine(rx, ry + rh + 8, rx + rw, ry + rh + 8, `${vanityW}`, 9, "mg_");
  svg += dimLine(rx - 15, ry, rx - 15, ry + rh, `${vanityH}`, 9, "mg_");
  // Mirror height cota
  svg += dimLine(rx + rw + 8, mirrorY, rx + rw + 8, mirrorY + mirrorH, `${Math.round(vanityH * 0.3)}`, 7, "mg_");
  // Counter height cota
  svg += dimLine(rx + rw + 20, counterY, rx + rw + 20, ry + rh, `850`, 7, "mg_");

  // ----- GUN SAFE (right half) -----
  const gsOx = 470, gsOy = 40;
  const gsAreaW = 400, gsAreaH = 420;
  const gunW = gunZone?.dimensions?.width_m ? gunZone.dimensions.width_m * 1000 : 1360;
  const gunH = 2400;
  const gsc = Math.min((gsAreaW * 0.45 - 20) / gunW, (gsAreaH - 40) / gunH);
  const grw = gunW * gsc, grh = gunH * gsc;

  svg += `<text x="${gsOx + gsAreaW / 2}" y="${gsOy - 5}" text-anchor="middle" font-size="13" font-weight="bold" fill="${STROKE}" font-family="Arial,sans-serif">AREA ARMAS — Porta Fechada / Aberta</text>`;

  // Closed view (mirror door)
  const gx1 = gsOx + 10, gy1 = gsOy + 15;
  svg += `<rect x="${gx1}" y="${gy1}" width="${grw}" height="${grh}" fill="#E0E8E8" stroke="${STROKE}" stroke-width="1.5"/>`;
  svg += `<rect x="${gx1 + grw * 0.05}" y="${gy1 + grh * 0.05}" width="${grw * 0.9}" height="${grh * 0.9}" fill="#D8E8F0" stroke="#8AC" stroke-width="0.8"/>`;
  svg += `<text x="${gx1 + grw / 2}" y="${gy1 + grh / 2}" text-anchor="middle" font-size="9" fill="#6AA" font-family="Arial,sans-serif">ESPELHO</text>`;
  svg += `<text x="${gx1 + grw / 2}" y="${gy1 + grh + 12}" text-anchor="middle" font-size="8" fill="#666" font-family="Arial,sans-serif">FECHADA</text>`;
  // Handle
  svg += `<circle cx="${gx1 + grw * 0.9}" cy="${gy1 + grh * 0.5}" r="3" fill="#888"/>`;
  // Closed view cotas
  svg += dimLine(gx1, gy1 + grh + 20, gx1 + grw, gy1 + grh + 20, `${gunW}`, 8, "mg_");

  // Open view (internal shelves)
  const gx2 = gsOx + gsAreaW * 0.5 + 10, gy2 = gsOy + 15;
  svg += `<rect x="${gx2}" y="${gy2}" width="${grw}" height="${grh}" fill="#F0EDE5" stroke="${STROKE}" stroke-width="1.5"/>`;
  // Shelves with LED
  const shelfCount = 5;
  const shelfH = grh / (shelfCount + 1);
  for (let s = 1; s <= shelfCount; s++) {
    const sy = gy2 + s * shelfH;
    svg += `<rect x="${gx2 + 2}" y="${sy}" width="${grw - 4}" height="3" fill="#C8B8A0" stroke="#999" stroke-width="0.5"/>`;
    // LED strip
    svg += `<rect x="${gx2 + 4}" y="${sy - 3}" width="${grw - 8}" height="2" fill="#FFE082" opacity="0.8"/>`;
  }
  svg += `<text x="${gx2 + grw / 2}" y="${gy2 + grh / 2}" text-anchor="middle" font-size="7" fill="#888" font-family="Arial,sans-serif">LED + SENSOR</text>`;
  svg += `<text x="${gx2 + grw / 2}" y="${gy2 + grh + 12}" text-anchor="middle" font-size="8" fill="#666" font-family="Arial,sans-serif">ABERTA</text>`;

  // Shelf spacing cota
  svg += dimLine(gx2 + grw + 5, gy2 + shelfH, gx2 + grw + 5, gy2 + shelfH * 2, `${Math.round(gunH / (shelfCount + 1))}`, 7, "mg_");

  // Door swing arc
  svg += `<path d="M${gx2} ${gy2} A${grw} ${grw} 0 0 0 ${gx2 - grw * 0.7} ${gy2 + grw * 0.7}" fill="none" stroke="${STROKE}" stroke-width="0.5" stroke-dasharray="4,3"/>`;

  // Open view cotas
  svg += dimLine(gx2, gy2 + grh + 20, gx2 + grw, gy2 + grh + 20, `${gunW}`, 8, "mg_");
  svg += dimLine(gx2 + grw + 8, gy2, gx2 + grw + 8, gy2 + grh, `${gunH}`, 9, "mg_");

  // Material labels
  svg += `<text x="${gsOx + gsAreaW / 2}" y="${gsOy + gsAreaH - 5}" text-anchor="middle" font-size="7" fill="#888" font-family="Arial,sans-serif">Porta: Espelho | Corpo: MDP 18mm | Prateleiras: MDP 15mm + LED</text>`;

  svg += `</svg>`;
  return svg;
}

/* ============================================================
   SVG: Section Views (Corte A-A', B-B')
   ============================================================ */
function renderSectionViewsSvg(briefing: ParsedBriefing, results: EngineResults): string {
  const bp = results.blueprint;
  const walls = briefing.space?.walls || [];
  let roomW = 0, roomD = 0;
  if (walls.length >= 2) {
    roomW = Math.max(...walls.map(w => w.length_m)) * 1000;
    const sorted = walls.map(w => w.length_m * 1000).sort((a, b) => b - a);
    roomD = sorted[1] || sorted[0] || 4000;
  }
  if (roomW === 0) roomW = bp.mainWall.totalWidth || 5000;
  if (roomD === 0) roomD = roomW * 0.8;
  const ceilingH = (briefing.space?.ceiling_height_m || 2.8) * 1000;
  const modDepth = 600; // standard module depth

  const vW = 900, vH = 550;
  let svg = `<svg viewBox="0 0 ${vW} ${vH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:900px;height:auto;display:block;margin:0 auto;background:#fff;">`;
  svg += svgDefs("sec_");

  // Section A-A': Horizontal cut through room looking toward north wall (depth profile)
  const secAx = 30, secAy = 30;
  const secAw = 400, secAh = 220;
  const scA = Math.min((secAw - 60) / roomD, (secAh - 60) / ceilingH);
  const rD = roomD * scA;
  const rH = ceilingH * scA;
  const rx = secAx + 30;
  const ry = secAy + secAh - rH - 20;

  svg += `<text x="${secAx + secAw / 2}" y="${secAy}" text-anchor="middle" font-size="12" font-weight="bold" fill="${STROKE}" font-family="Arial,sans-serif">CORTE A-A' — Vista Transversal</text>`;

  // Room outline
  svg += `<rect x="${rx}" y="${ry}" width="${rD}" height="${rH}" fill="#FEFEFE" stroke="${STROKE}" stroke-width="1.5"/>`;
  // Floor
  svg += `<line x1="${rx - 10}" y1="${ry + rH}" x2="${rx + rD + 10}" y2="${ry + rH}" stroke="${STROKE}" stroke-width="3"/>`;
  for (let hx = rx - 10; hx < rx + rD + 10; hx += 10) {
    svg += `<line x1="${hx}" y1="${ry + rH}" x2="${hx - 5}" y2="${ry + rH + 5}" stroke="${STROKE}" stroke-width="0.4"/>`;
  }
  // Ceiling
  svg += `<line x1="${rx - 10}" y1="${ry}" x2="${rx + rD + 10}" y2="${ry}" stroke="#999" stroke-width="1" stroke-dasharray="8,4"/>`;

  // Left wall modules (back, north wall modules seen from side)
  const mDepthPx = modDepth * scA;
  svg += `<rect x="${rx}" y="${ry}" width="${mDepthPx}" height="${rH}" fill="#E8E0D0" stroke="${STROKE}" stroke-width="1"/>`;
  svg += `<rect x="${rx}" y="${ry}" width="${mDepthPx}" height="${rH}" fill="url(#sec_wallHatch)" opacity="0.3"/>`;
  svg += `<text x="${rx + mDepthPx / 2}" y="${ry + rH / 2}" text-anchor="middle" font-size="8" fill="#555" font-family="Arial,sans-serif" transform="rotate(-90, ${rx + mDepthPx / 2}, ${ry + rH / 2})">MODULOS PAREDE N</text>`;

  // Right wall modules (if side wall exists)
  if (bp.sideWall && bp.sideWall.modules.length > 0) {
    svg += `<rect x="${rx + rD - mDepthPx}" y="${ry}" width="${mDepthPx}" height="${rH}" fill="#E0E8E0" stroke="${STROKE}" stroke-width="1"/>`;
    svg += `<text x="${rx + rD - mDepthPx / 2}" y="${ry + rH / 2}" text-anchor="middle" font-size="8" fill="#555" font-family="Arial,sans-serif" transform="rotate(-90, ${rx + rD - mDepthPx / 2}, ${ry + rH / 2})">PAREDE LATERAL</text>`;
  }

  // Island (if present, shown in center)
  const islandZone = (briefing.zones || []).find(z => z.name.toLowerCase().includes("ilha"));
  if (islandZone) {
    const iD = (islandZone.dimensions?.depth_m || 0.6) * 1000 * scA;
    const iH = 900 * scA;
    const iX = rx + rD / 2 - iD / 2;
    const iY = ry + rH - iH;
    svg += `<rect x="${iX}" y="${iY}" width="${iD}" height="${iH}" fill="#F5F2ED" stroke="${STROKE}" stroke-width="1"/>`;
    svg += `<text x="${iX + iD / 2}" y="${iY + iH / 2 + 3}" text-anchor="middle" font-size="7" fill="#555" font-family="Arial,sans-serif">ILHA</text>`;
  }

  // Circulation arrows
  const circY = ry + rH - 15;
  svg += `<line x1="${rx + mDepthPx + 10}" y1="${circY}" x2="${rx + rD - mDepthPx - 10}" y2="${circY}" stroke="${GOLD}" stroke-width="1.5" marker-end="url(#sec_arrowBlkE)" stroke-dasharray="4,2"/>`;
  svg += `<text x="${rx + rD / 2}" y="${circY - 5}" text-anchor="middle" font-size="7" fill="${GOLD}" font-family="Arial,sans-serif">CIRCULACAO</text>`;

  // P0.6 — ABNT section dimensions: room depth, ceiling height, module depth
  svg += renderDimH(rx, rx + rD, ry + rH, ry + rH + 15, `${roomD} mm`);
  svg += renderDimH(rx, rx + mDepthPx, ry + rH, ry + rH + 28, `${modDepth}`);
  svg += renderDimV(ry, ry + rH, rx, rx - 18, `${ceilingH} mm`, (n) => n, "left");

  // Tolerance note
  svg += `<text x="${rx}" y="${ry - 8}" font-size="7" fill="#888" font-family="Arial,sans-serif">Desconto parede: 5mm | Folga piso (rodape): 100mm</text>`;

  // Section B-B': Longitudinal cut (side view through main wall)
  const secBx = 470, secBy = 30;
  const secBw = 400, secBh = 220;
  const scB = Math.min((secBw - 60) / roomW, (secBh - 60) / ceilingH);
  const rW2 = roomW * scB;
  const rH2 = ceilingH * scB;
  const rx2 = secBx + 30;
  const ry2 = secBy + secBh - rH2 - 20;

  svg += `<text x="${secBx + secBw / 2}" y="${secBy}" text-anchor="middle" font-size="12" font-weight="bold" fill="${STROKE}" font-family="Arial,sans-serif">CORTE B-B' — Vista Longitudinal</text>`;

  // Room outline
  svg += `<rect x="${rx2}" y="${ry2}" width="${rW2}" height="${rH2}" fill="#FEFEFE" stroke="${STROKE}" stroke-width="1.5"/>`;
  svg += `<line x1="${rx2 - 10}" y1="${ry2 + rH2}" x2="${rx2 + rW2 + 10}" y2="${ry2 + rH2}" stroke="${STROKE}" stroke-width="3"/>`;
  for (let hx = rx2 - 10; hx < rx2 + rW2 + 10; hx += 10) {
    svg += `<line x1="${hx}" y1="${ry2 + rH2}" x2="${hx - 5}" y2="${ry2 + rH2 + 5}" stroke="${STROKE}" stroke-width="0.4"/>`;
  }

  // Module silhouettes from side
  const mainMods = bp.mainWall.modules;
  for (const mod of mainMods) {
    const mxB = rx2 + (mod.position?.x || 0) * scB;
    const mwB = mod.width * scB;
    const mhB = mod.height * scB;
    const myB = ry2 + rH2 - (mod.position?.y || 0) * scB - mhB;
    svg += `<rect x="${mxB}" y="${myB}" width="${mwB}" height="${mhB}" fill="#E8E0D0" stroke="${STROKE}" stroke-width="0.8" opacity="0.7"/>`;
  }

  // Dimensions
  svg += dimLine(rx2, ry2 + rH2 + 12, rx2 + rW2, ry2 + rH2 + 12, `${roomW} mm`, 9, "sec_");
  svg += dimLine(rx2 - 15, ry2, rx2 - 15, ry2 + rH2, `${ceilingH} mm`, 9, "sec_");

  // Detail C: Rodape detail
  const d3x = 30, d3y = 310;
  svg += `<text x="${d3x}" y="${d3y}" font-size="11" font-weight="bold" fill="#333" font-family="Arial,sans-serif">DET. RODAPE — Folga Piso</text>`;
  // Floor
  svg += `<line x1="${d3x}" y1="${d3y + 90}" x2="${d3x + 200}" y2="${d3y + 90}" stroke="${STROKE}" stroke-width="2"/>`;
  for (let hx = d3x; hx < d3x + 200; hx += 8) {
    svg += `<line x1="${hx}" y1="${d3y + 90}" x2="${hx - 4}" y2="${d3y + 94}" stroke="${STROKE}" stroke-width="0.4"/>`;
  }
  // Module bottom
  svg += `<rect x="${d3x + 10}" y="${d3y + 10}" width="130" height="70" fill="#E8E0D0" stroke="${STROKE}" stroke-width="1.5"/>`;
  svg += `<rect x="${d3x + 10}" y="${d3y + 10}" width="130" height="70" fill="url(#sec_hatchPattern)" opacity="0.15"/>`;
  // Rodape gap
  svg += dimLine(d3x + 150, d3y + 80, d3x + 150, d3y + 90, "100mm", 7, "sec_");
  svg += `<text x="${d3x + 75}" y="${d3y + 86}" text-anchor="middle" font-size="7" fill="#888" font-family="Arial,sans-serif">Rodape 100mm</text>`;
  // Wall desconto
  svg += `<line x1="${d3x + 5}" y1="${d3y + 10}" x2="${d3x + 5}" y2="${d3y + 90}" stroke="${STROKE}" stroke-width="2"/>`;
  svg += dimLine(d3x + 5, d3y + 100, d3x + 10, d3y + 100, "5mm", 6, "sec_");
  svg += `<text x="${d3x + 30}" y="${d3y + 108}" font-size="6" fill="#888" font-family="Arial,sans-serif">Desconto parede</text>`;

  // Detail D: Door clearance
  const d4x = 280, d4y = 310;
  svg += `<text x="${d4x}" y="${d4y}" font-size="11" font-weight="bold" fill="#333" font-family="Arial,sans-serif">DET. FOLGA PORTA — Dobradica</text>`;
  // Side panel
  svg += `<rect x="${d4x}" y="${d4y + 10}" width="18" height="120" fill="url(#sec_wallHatch)" stroke="#333" stroke-width="1.5"/>`;
  // Door (slightly ajar)
  svg += `<line x1="${d4x + 18}" y1="${d4y + 10}" x2="${d4x + 100}" y2="${d4y + 18}" stroke="#333" stroke-width="1.5"/>`;
  svg += `<line x1="${d4x + 18}" y1="${d4y + 130}" x2="${d4x + 100}" y2="${d4y + 138}" stroke="#333" stroke-width="1.5"/>`;
  svg += `<rect x="${d4x + 100}" y="${d4y + 18}" width="18" height="120" fill="#C8B8A0" stroke="#333" stroke-width="1" transform="rotate(5, ${d4x + 109}, ${d4y + 78})"/>`;
  // Gap dimensions
  svg += `<text x="${d4x + 22}" y="${d4y + 75}" font-size="7" fill="${DIM_RED}" font-family="Arial,sans-serif">3mm gap</text>`;
  // Overlay (door overlap 18mm)
  svg += dimLine(d4x + 130, d4y + 18, d4x + 130, d4y + 138, "Porta", 7, "sec_");
  svg += `<text x="${d4x}" y="${d4y + 150}" font-size="7" fill="#888" font-family="Arial,sans-serif">Sobreposicao porta: 18mm sobre lateral</text>`;

  // Detail E: Module-to-module gap
  const d5x = 550, d5y = 310;
  svg += `<text x="${d5x}" y="${d5y}" font-size="11" font-weight="bold" fill="#333" font-family="Arial,sans-serif">DET. FOLGA ENTRE MODULOS</text>`;
  svg += `<rect x="${d5x}" y="${d5y + 10}" width="60" height="100" fill="url(#sec_wallHatch)" stroke="#333" stroke-width="1"/>`;
  svg += `<rect x="${d5x + 63}" y="${d5y + 10}" width="60" height="100" fill="url(#sec_wallHatch)" stroke="#333" stroke-width="1"/>`;
  svg += dimLine(d5x + 60, d5y + 120, d5x + 63, d5y + 120, "3mm", 7, "sec_");
  svg += `<text x="${d5x + 61}" y="${d5y + 60}" text-anchor="middle" font-size="8" fill="${DIM_RED}" font-family="Arial,sans-serif" transform="rotate(-90, ${d5x + 61}, ${d5y + 60})">3mm</text>`;
  svg += `<text x="${d5x}" y="${d5y + 135}" font-size="7" fill="#888" font-family="Arial,sans-serif">Folga entre modulos adjacentes: 2-3mm</text>`;

  svg += `<text x="${vW / 2}" y="${vH - 5}" text-anchor="middle" font-size="8" fill="#888" font-family="Arial,sans-serif">Cortes de secao — Escala esquematica — Medidas em mm</text>`;

  svg += `</svg>`;
  return svg;
}

/* ============================================================
   SVG: Isometric 3D View
   ============================================================ */
function renderIsometricSvg(briefing: ParsedBriefing, results: EngineResults): string {
  const bp = results.blueprint;
  const allModules = [...bp.mainWall.modules, ...(bp.sideWall?.modules || [])];
  const walls = briefing.space?.walls || [];
  let roomW = 0, roomD = 0, roomH = 2400;
  if (walls.length >= 2) {
    roomW = Math.max(...walls.map(w => w.length_m)) * 1000;
    const sorted = walls.map(w => w.length_m * 1000).sort((a, b) => b - a);
    roomD = sorted[1] || sorted[0] || 4000;
  }
  if (roomW === 0) roomW = bp.mainWall.totalWidth || 5000;
  if (roomD === 0) roomD = roomW * 0.8;
  roomH = (briefing.space?.ceiling_height_m || 2.8) * 1000;

  // Isometric projection: 30° angle
  const isoAngle = Math.PI / 6; // 30 degrees
  const cosA = Math.cos(isoAngle);
  const sinA = Math.sin(isoAngle);
  const sc = Math.min(600 / roomW, 400 / roomD, 300 / roomH) * 0.6;

  const vbW = 900;
  const vbH = 600;
  const originX = vbW * 0.35;
  const originY = vbH * 0.82;

  // Convert 3D (x,y,z) to isometric 2D
  const isoX = (x: number, y: number) => originX + (x - y) * cosA * sc;
  const isoY = (x: number, y: number, z: number) => originY - z * sc - (x + y) * sinA * sc;

  let svg = `<svg viewBox="0 0 ${vbW} ${vbH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:900px;height:auto;display:block;margin:0 auto;background:#fff;">`;
  svg += svgDefs("iso_");

  // Title
  svg += `<text x="${vbW / 2}" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="${STROKE}" font-family="Arial,sans-serif">VISTA ISOMETRICA 3D</text>`;

  // Floor
  const floorPts = [
    `${isoX(0, 0)},${isoY(0, 0, 0)}`,
    `${isoX(roomW, 0)},${isoY(roomW, 0, 0)}`,
    `${isoX(roomW, roomD)},${isoY(roomW, roomD, 0)}`,
    `${isoX(0, roomD)},${isoY(0, roomD, 0)}`,
  ].join(" ");
  svg += `<polygon points="${floorPts}" fill="#F5F0E8" stroke="${STROKE}" stroke-width="1.5"/>`;

  // Back wall (north)
  const bwPts = [
    `${isoX(0, roomD)},${isoY(0, roomD, 0)}`,
    `${isoX(roomW, roomD)},${isoY(roomW, roomD, 0)}`,
    `${isoX(roomW, roomD)},${isoY(roomW, roomD, roomH)}`,
    `${isoX(0, roomD)},${isoY(0, roomD, roomH)}`,
  ].join(" ");
  svg += `<polygon points="${bwPts}" fill="#F0EDE5" stroke="${STROKE}" stroke-width="1"/>`;

  // Left wall (west)
  const lwPts = [
    `${isoX(0, 0)},${isoY(0, 0, 0)}`,
    `${isoX(0, roomD)},${isoY(0, roomD, 0)}`,
    `${isoX(0, roomD)},${isoY(0, roomD, roomH)}`,
    `${isoX(0, 0)},${isoY(0, 0, roomH)}`,
  ].join(" ");
  svg += `<polygon points="${lwPts}" fill="#E8E5DD" stroke="${STROKE}" stroke-width="1"/>`;

  // Ceiling edges (dashed)
  svg += `<line x1="${isoX(0, 0)}" y1="${isoY(0, 0, roomH)}" x2="${isoX(roomW, 0)}" y2="${isoY(roomW, 0, roomH)}" stroke="#999" stroke-width="0.8" stroke-dasharray="6,3"/>`;
  svg += `<line x1="${isoX(roomW, 0)}" y1="${isoY(roomW, 0, roomH)}" x2="${isoX(roomW, roomD)}" y2="${isoY(roomW, roomD, roomH)}" stroke="#999" stroke-width="0.8" stroke-dasharray="6,3"/>`;

  // Draw modules as 3D boxes against the back wall
  for (const mod of allModules) {
    const mX = mod.position?.x || 0;
    const mY = 0; // Depth position — against back wall
    const mZ = mod.position?.y || 0;
    const mW = mod.width;
    const mD = mod.depth || 600;
    const mH = mod.height;

    // Position against the north wall (back)
    const modPosY = roomD - mD;
    const fill = modFill(mod);

    // Front face
    const ffPts = [
      `${isoX(mX, modPosY)},${isoY(mX, modPosY, mZ)}`,
      `${isoX(mX + mW, modPosY)},${isoY(mX + mW, modPosY, mZ)}`,
      `${isoX(mX + mW, modPosY)},${isoY(mX + mW, modPosY, mZ + mH)}`,
      `${isoX(mX, modPosY)},${isoY(mX, modPosY, mZ + mH)}`,
    ].join(" ");
    svg += `<polygon points="${ffPts}" fill="${fill}" stroke="${STROKE}" stroke-width="1"/>`;

    // Top face
    const tfPts = [
      `${isoX(mX, modPosY)},${isoY(mX, modPosY, mZ + mH)}`,
      `${isoX(mX + mW, modPosY)},${isoY(mX + mW, modPosY, mZ + mH)}`,
      `${isoX(mX + mW, modPosY + mD)},${isoY(mX + mW, modPosY + mD, mZ + mH)}`,
      `${isoX(mX, modPosY + mD)},${isoY(mX, modPosY + mD, mZ + mH)}`,
    ].join(" ");
    svg += `<polygon points="${tfPts}" fill="#E0D8D0" stroke="${STROKE}" stroke-width="0.8"/>`;

    // Right side face
    const rsPts = [
      `${isoX(mX + mW, modPosY)},${isoY(mX + mW, modPosY, mZ)}`,
      `${isoX(mX + mW, modPosY + mD)},${isoY(mX + mW, modPosY + mD, mZ)}`,
      `${isoX(mX + mW, modPosY + mD)},${isoY(mX + mW, modPosY + mD, mZ + mH)}`,
      `${isoX(mX + mW, modPosY)},${isoY(mX + mW, modPosY, mZ + mH)}`,
    ].join(" ");
    svg += `<polygon points="${rsPts}" fill="#D8D0C8" stroke="${STROKE}" stroke-width="0.8"/>`;

    // Module label on front face
    const labelX = isoX(mX + mW / 2, modPosY);
    const labelY = isoY(mX + mW / 2, modPosY, mZ + mH / 2);
    svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="8" font-weight="bold" fill="#333" font-family="Arial,sans-serif">${esc(mod.name)}</text>`;
  }

  // Island (freestanding) if present
  const islandZone = (briefing.zones || []).find(z => z.name.toLowerCase().includes("ilha"));
  if (islandZone) {
    const iW = (islandZone.dimensions?.width_m || 1.2) * 1000;
    const iD = (islandZone.dimensions?.depth_m || 0.6) * 1000;
    const iH = 900;
    const iPosX = roomW / 2 - iW / 2;
    const iPosY = roomD / 2 - iD / 2;

    const ifPts = [
      `${isoX(iPosX, iPosY)},${isoY(iPosX, iPosY, 0)}`,
      `${isoX(iPosX + iW, iPosY)},${isoY(iPosX + iW, iPosY, 0)}`,
      `${isoX(iPosX + iW, iPosY)},${isoY(iPosX + iW, iPosY, iH)}`,
      `${isoX(iPosX, iPosY)},${isoY(iPosX, iPosY, iH)}`,
    ].join(" ");
    svg += `<polygon points="${ifPts}" fill="#F5F2ED" stroke="${STROKE}" stroke-width="1"/>`;

    const itPts = [
      `${isoX(iPosX, iPosY)},${isoY(iPosX, iPosY, iH)}`,
      `${isoX(iPosX + iW, iPosY)},${isoY(iPosX + iW, iPosY, iH)}`,
      `${isoX(iPosX + iW, iPosY + iD)},${isoY(iPosX + iW, iPosY + iD, iH)}`,
      `${isoX(iPosX, iPosY + iD)},${isoY(iPosX, iPosY + iD, iH)}`,
    ].join(" ");
    svg += `<polygon points="${itPts}" fill="#D0E8F0" stroke="#6AA" stroke-width="0.8"/>`;

    const irPts = [
      `${isoX(iPosX + iW, iPosY)},${isoY(iPosX + iW, iPosY, 0)}`,
      `${isoX(iPosX + iW, iPosY + iD)},${isoY(iPosX + iW, iPosY + iD, 0)}`,
      `${isoX(iPosX + iW, iPosY + iD)},${isoY(iPosX + iW, iPosY + iD, iH)}`,
      `${isoX(iPosX + iW, iPosY)},${isoY(iPosX + iW, iPosY, iH)}`,
    ].join(" ");
    svg += `<polygon points="${irPts}" fill="#E0D8D0" stroke="${STROKE}" stroke-width="0.8"/>`;

    svg += `<text x="${isoX(iPosX + iW / 2, iPosY)}" y="${isoY(iPosX + iW / 2, iPosY, iH / 2)}" text-anchor="middle" font-size="9" font-weight="bold" fill="#333" font-family="Arial,sans-serif">ILHA</text>`;
  }

  // Dimension labels
  svg += `<text x="${isoX(roomW / 2, 0)}" y="${isoY(roomW / 2, 0, 0) + 18}" text-anchor="middle" font-size="10" fill="${DIM_RED}" font-weight="bold" font-family="Arial,sans-serif">${roomW} mm</text>`;
  svg += `<text x="${isoX(roomW, roomD / 2)}" y="${isoY(roomW, roomD / 2, 0) + 14}" text-anchor="middle" font-size="10" fill="${DIM_RED}" font-weight="bold" font-family="Arial,sans-serif">${roomD} mm</text>`;
  svg += `<text x="${isoX(0, 0) - 20}" y="${isoY(0, 0, roomH / 2)}" text-anchor="end" font-size="10" fill="${DIM_RED}" font-weight="bold" font-family="Arial,sans-serif">${roomH} mm</text>`;

  // Scale indicator
  svg += `<text x="${vbW - 20}" y="${vbH - 15}" text-anchor="end" font-size="9" fill="#888" font-family="Arial,sans-serif">Vista isometrica 30° — Escala esquematica</text>`;

  svg += `</svg>`;
  return svg;
}

/* ============================================================
   SVG: Constructive Details
   ============================================================ */
function renderConstructiveDetailsSvg(): string {
  const vW = 900, vH = 500;
  let svg = `<svg viewBox="0 0 ${vW} ${vH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:900px;height:auto;display:block;margin:0 auto;background:#fff;">`;
  svg += svgDefs("cd_");

  // Title
  svg += `<text x="${vW / 2}" y="20" text-anchor="middle" font-size="14" font-weight="bold" fill="${STROKE}" font-family="Arial,sans-serif">DETALHES CONSTRUTIVOS</text>`;

  // Detail 1: Drawer cross-section (top-left)
  const d1x = 30, d1y = 45;
  svg += `<text x="${d1x}" y="${d1y}" font-size="11" font-weight="bold" fill="#333" font-family="Arial,sans-serif">DET. 01 — Secao Gaveta</text>`;
  // Drawer body
  svg += `<rect x="${d1x}" y="${d1y + 10}" width="180" height="100" fill="#F5F0E8" stroke="#333" stroke-width="1.5"/>`;
  // Bottom 6mm
  svg += `<rect x="${d1x}" y="${d1y + 104}" width="180" height="6" fill="#D8D0C0" stroke="#555" stroke-width="0.8"/>`;
  svg += `<text x="${d1x + 190}" y="${d1y + 110}" font-size="7" fill="#666" font-family="Arial,sans-serif">Fundo 6mm MDF</text>`;
  // Sides 15mm
  svg += `<rect x="${d1x}" y="${d1y + 10}" width="15" height="100" fill="#E0D8D0" stroke="#555" stroke-width="0.8"/>`;
  svg += `<rect x="${d1x + 165}" y="${d1y + 10}" width="15" height="100" fill="#E0D8D0" stroke="#555" stroke-width="0.8"/>`;
  svg += `<text x="${d1x - 5}" y="${d1y + 60}" text-anchor="end" font-size="7" fill="#666" font-family="Arial,sans-serif">15mm</text>`;
  // Front face 18mm
  svg += `<rect x="${d1x - 5}" y="${d1y + 8}" width="190" height="18" fill="#C8B8A0" stroke="#333" stroke-width="1"/>`;
  svg += `<text x="${d1x + 95}" y="${d1y + 20}" text-anchor="middle" font-size="7" fill="#333" font-family="Arial,sans-serif">Frente 18mm MDF</text>`;
  // Slide rail
  svg += `<rect x="${d1x + 15}" y="${d1y + 95}" width="150" height="8" fill="#999" stroke="#666" stroke-width="0.5" rx="2"/>`;
  svg += `<text x="${d1x + 90}" y="${d1y + 102}" text-anchor="middle" font-size="6" fill="#fff" font-family="Arial,sans-serif">Corredica telescopica soft-close</text>`;
  // Dim arrows
  svg += dimLine(d1x, d1y + 125, d1x + 180, d1y + 125, "500mm", 8, "cd_");
  svg += dimLine(d1x + 195, d1y + 10, d1x + 195, d1y + 110, "150mm", 8, "cd_");

  // Detail 2: Hinge cross-section (top-right)
  const d2x = 480, d2y = 45;
  svg += `<text x="${d2x}" y="${d2y}" font-size="11" font-weight="bold" fill="#333" font-family="Arial,sans-serif">DET. 02 — Dobradica 35mm</text>`;
  // Side panel
  svg += `<rect x="${d2x}" y="${d2y + 10}" width="18" height="150" fill="#E0D8D0" stroke="#333" stroke-width="1.5"/>`;
  svg += `<text x="${d2x + 9}" y="${d2y + 170}" text-anchor="middle" font-size="7" fill="#666" font-family="Arial,sans-serif">Lateral 18mm</text>`;
  // Door panel (slightly open)
  svg += `<rect x="${d2x + 25}" y="${d2y + 10}" width="18" height="150" fill="#C8B8A0" stroke="#333" stroke-width="1.5" transform="rotate(-5, ${d2x + 25}, ${d2y + 85})"/>`;
  svg += `<text x="${d2x + 34}" y="${d2y + 170}" text-anchor="middle" font-size="7" fill="#666" font-family="Arial,sans-serif">Porta 18mm</text>`;
  // Hinge cup
  svg += `<circle cx="${d2x + 9}" cy="${d2y + 55}" r="17.5" fill="none" stroke="#888" stroke-width="1.5"/>`;
  svg += `<text x="${d2x + 9}" y="${d2y + 58}" text-anchor="middle" font-size="7" fill="#888" font-family="Arial,sans-serif">35mm</text>`;
  // Hinge arm
  svg += `<rect x="${d2x + 18}" y="${d2y + 48}" width="30" height="14" fill="#bbb" stroke="#888" stroke-width="0.8" rx="2"/>`;
  svg += `<text x="${d2x + 33}" y="${d2y + 58}" text-anchor="middle" font-size="6" fill="#555" font-family="Arial,sans-serif">soft-close</text>`;
  // Second hinge
  svg += `<circle cx="${d2x + 9}" cy="${d2y + 115}" r="17.5" fill="none" stroke="#888" stroke-width="1.5"/>`;
  svg += `<rect x="${d2x + 18}" y="${d2y + 108}" width="30" height="14" fill="#bbb" stroke="#888" stroke-width="0.8" rx="2"/>`;
  // Dimensions
  svg += dimLine(d2x + 60, d2y + 55, d2x + 60, d2y + 115, "60mm", 7, "cd_");
  svg += `<text x="${d2x + 70}" y="${d2y + 30}" font-size="7" fill="#888" font-family="Arial,sans-serif">110° abertura</text>`;

  // Detail 3: Shelf support (bottom-left)
  const d3x = 30, d3y = 270;
  svg += `<text x="${d3x}" y="${d3y}" font-size="11" font-weight="bold" fill="#333" font-family="Arial,sans-serif">DET. 03 — Suporte Prateleira</text>`;
  // Side panel fragment
  svg += `<rect x="${d3x}" y="${d3y + 10}" width="18" height="120" fill="#E0D8D0" stroke="#333" stroke-width="1.5"/>`;
  // Pin
  svg += `<circle cx="${d3x + 18}" cy="${d3y + 50}" r="3" fill="#888" stroke="#666" stroke-width="0.5"/>`;
  svg += `<line x1="${d3x + 18}" y1="${d3y + 50}" x2="${d3x + 30}" y2="${d3y + 50}" stroke="#888" stroke-width="2"/>`;
  // Shelf on pin
  svg += `<rect x="${d3x + 18}" y="${d3y + 44}" width="120" height="18" fill="#F0EDE5" stroke="#333" stroke-width="1"/>`;
  svg += `<text x="${d3x + 78}" y="${d3y + 56}" text-anchor="middle" font-size="7" fill="#333" font-family="Arial,sans-serif">Prateleira 18mm</text>`;
  // Fita de borda
  svg += `<rect x="${d3x + 138}" y="${d3y + 44}" width="2" height="18" fill="#C8B8A0" stroke="#999" stroke-width="0.3"/>`;
  svg += `<text x="${d3x + 145}" y="${d3y + 56}" font-size="6" fill="#888" font-family="Arial,sans-serif">Fita ABS</text>`;
  // Dims
  svg += dimLine(d3x + 18, d3y + 72, d3x + 138, d3y + 72, "Vao max 900mm", 7, "cd_");

  // Detail 4: Hanging bar mount (bottom-center)
  const d4x = 280, d4y = 270;
  svg += `<text x="${d4x}" y="${d4y}" font-size="11" font-weight="bold" fill="#333" font-family="Arial,sans-serif">DET. 04 — Cabideiro Barra Oval</text>`;
  // Side panel
  svg += `<rect x="${d4x}" y="${d4y + 10}" width="18" height="100" fill="#E0D8D0" stroke="#333" stroke-width="1.5"/>`;
  svg += `<rect x="${d4x + 150}" y="${d4y + 10}" width="18" height="100" fill="#E0D8D0" stroke="#333" stroke-width="1.5"/>`;
  // Support bracket
  svg += `<rect x="${d4x + 18}" y="${d4y + 15}" width="15" height="20" fill="#bbb" stroke="#888" stroke-width="0.8" rx="1"/>`;
  svg += `<rect x="${d4x + 135}" y="${d4y + 15}" width="15" height="20" fill="#bbb" stroke="#888" stroke-width="0.8" rx="1"/>`;
  // Oval bar cross-section
  svg += `<line x1="${d4x + 33}" y1="${d4y + 25}" x2="${d4x + 135}" y2="${d4y + 25}" stroke="#333" stroke-width="5" stroke-linecap="round"/>`;
  svg += `<text x="${d4x + 84}" y="${d4y + 22}" text-anchor="middle" font-size="7" fill="#fff" font-family="Arial,sans-serif">25mm</text>`;
  // Hanger on bar
  svg += `<polyline points="${d4x + 75},${d4y + 35} ${d4x + 84},${d4y + 28} ${d4x + 93},${d4y + 35}" fill="none" stroke="#666" stroke-width="1"/>`;
  svg += `<line x1="${d4x + 75}" y1="${d4y + 35}" x2="${d4x + 93}" y2="${d4y + 35}" stroke="#666" stroke-width="0.8"/>`;
  // Garment silhouette
  svg += `<path d="M${d4x + 77} ${d4y + 37} L${d4x + 73} ${d4y + 90} L${d4x + 95} ${d4y + 90} L${d4x + 91} ${d4y + 37}" fill="none" stroke="#ccc" stroke-width="0.6"/>`;
  // Dims
  svg += dimLine(d4x + 18, d4y + 120, d4x + 150, d4y + 120, "Vao", 7, "cd_");

  // Detail 5: Shoe rack angle (bottom-right)
  const d5x = 550, d5y = 270;
  svg += `<text x="${d5x}" y="${d5y}" font-size="11" font-weight="bold" fill="#333" font-family="Arial,sans-serif">DET. 05 — Sapateira Inclinada</text>`;
  // Side panel
  svg += `<rect x="${d5x}" y="${d5y + 10}" width="18" height="140" fill="#E0D8D0" stroke="#333" stroke-width="1.5"/>`;
  // Inclined shelves
  for (let i = 0; i < 3; i++) {
    const sy = d5y + 30 + i * 40;
    svg += `<line x1="${d5x + 18}" y1="${sy + 12}" x2="${d5x + 150}" y2="${sy}" stroke="#333" stroke-width="2"/>`;
    // 15° angle indicator for first shelf
    if (i === 0) {
      svg += `<path d="M${d5x + 18} ${sy + 12} L${d5x + 45} ${sy + 12}" fill="none" stroke="${DIM_RED}" stroke-width="0.5"/>`;
      svg += `<path d="M${d5x + 18} ${sy + 12} L${d5x + 45} ${sy + 9}" fill="none" stroke="${DIM_RED}" stroke-width="0.5"/>`;
      svg += `<text x="${d5x + 50}" y="${sy + 15}" font-size="7" fill="${DIM_RED}" font-family="Arial,sans-serif">15°</text>`;
    }
    // Shoe silhouette
    svg += `<path d="M${d5x + 50} ${sy + 8} L${d5x + 48} ${sy - 5} L${d5x + 72} ${sy - 6} L${d5x + 75} ${sy + 7}" fill="none" stroke="#aaa" stroke-width="0.6"/>`;
  }
  // Shelf spacing
  svg += dimLine(d5x + 160, d5y + 30, d5x + 160, d5y + 70, "140mm", 7, "cd_");

  // Legend
  svg += `<text x="${vW / 2}" y="${vH - 10}" text-anchor="middle" font-size="9" fill="#888" font-family="Arial,sans-serif">Detalhes construtivos — Escala esquematica — Medidas em mm</text>`;

  svg += `</svg>`;
  return svg;
}

/* ============================================================
   Memorial Descritivo (HTML)
   ============================================================ */
function renderMemorialDescritivo(
  briefing: ParsedBriefing,
  results: EngineResults,
): string {
  const bp = results.blueprint;
  const allModules = [...bp.mainWall.modules, ...(bp.sideWall?.modules || [])];
  const materialPalette = (results.summary as any).material_palette || [];

  // Extract material names
  const primaryMaterial = bp.materials.mdfColor || "MDP 18mm";
  const internalMaterial = bp.materials.internalColor || primaryMaterial;
  const frontMaterial = materialPalette.find((m: any) => m.category === "front")?.name || primaryMaterial;

  // Count hardware by type
  const hwGrouped: Record<string, number> = {};
  for (const hw of bp.hardwareMap) {
    const classified = classifyHardware(hw);
    const key = classified.type;
    hwGrouped[key] = (hwGrouped[key] || 0) + 1;
  }

  return `<div class="memorial">
  <h3 style="font-size:16px;font-weight:800;margin:0 0 16px;color:#222;border-bottom:2px solid ${GOLD};padding-bottom:8px">MEMORIAL DESCRITIVO</h3>

  <h4>PORTAS</h4>
  <table>
    <tr><th>Item</th><th>Material / Especificacao</th></tr>
    <tr><td>Portas Predominantes</td><td>${esc(frontMaterial)}</td></tr>
    <tr><td>Puxadores</td><td>Conforme projeto — Perfil embutido ou tubular</td></tr>
    <tr><td>Dobradicas</td><td>35mm copo, soft-close, 110 graus</td></tr>
  </table>

  <h4>TAMPOS</h4>
  <table>
    <tr><th>Item</th><th>Material / Especificacao</th></tr>
    <tr><td>Tampo Predominante</td><td>${esc(primaryMaterial)} 18mm</td></tr>
    <tr><td>Tampo Ilha</td><td>Vidro Temperado 8mm com bordas polidas</td></tr>
    <tr><td>Bancada Makeup</td><td>${esc(primaryMaterial)} 18mm — altura 850mm</td></tr>
  </table>

  <h4>INTERNOS</h4>
  <table>
    <tr><th>Item</th><th>Material / Especificacao</th></tr>
    <tr><td>Corpos</td><td>${esc(primaryMaterial)}</td></tr>
    <tr><td>Prateleiras Internas</td><td>${esc(internalMaterial)} 18mm</td></tr>
    <tr><td>Laterais Gavetas</td><td>${esc(internalMaterial)} 15mm</td></tr>
    <tr><td>Fundos</td><td>MDF 6mm</td></tr>
    <tr><td>Corredicas</td><td>Ocultas, Extracao Total c/ Amortecedor</td></tr>
    <tr><td>Cabideiros</td><td>Barra Oval Cromada 25mm + suportes laterais</td></tr>
    <tr><td>Fita de Borda</td><td>ABS/PVC em todas as faces visiveis</td></tr>
  </table>

  <h4>ACESSORIOS / FERRAGENS</h4>
  <table>
    <tr><th>Tipo</th><th>Quantidade</th></tr>
    ${Object.entries(hwGrouped).sort((a, b) => a[0].localeCompare(b[0])).map(([type, qty]) => `<tr><td>${esc(type.charAt(0).toUpperCase() + type.slice(1))}</td><td>${qty}</td></tr>`).join("")}
    <tr class="total-row"><td>Total Ferragens</td><td>${bp.hardwareMap.length}</td></tr>
  </table>

  <h4>DADOS DO PROJETO</h4>
  <table>
    <tr><td style="font-weight:600;width:200px">Ultima Revisao</td><td>${today()}</td></tr>
    <tr><td style="font-weight:600">Designer Responsavel</td><td>${esc(briefing.project?.designer || "-")}</td></tr>
    <tr><td style="font-weight:600">Cliente</td><td>${esc(briefing.client?.name || "-")}</td></tr>
    <tr><td style="font-weight:600">Tipo de Projeto</td><td>${esc(briefing.project?.type || "-")}</td></tr>
    <tr><td style="font-weight:600">Data Entrada</td><td>${esc(briefing.project?.date_in || "-")}</td></tr>
    <tr><td style="font-weight:600">Data Entrega</td><td>${esc(briefing.project?.date_due || "-")}</td></tr>
    <tr><td style="font-weight:600">Area Total</td><td>${briefing.space?.total_area_m2 || "-"} m2</td></tr>
    <tr><td style="font-weight:600">Pe-Direito</td><td>${briefing.space?.ceiling_height_m || "-"} m</td></tr>
    <tr><td style="font-weight:600">Paleta de Cores</td><td>${esc((briefing.materials?.colors || []).join(", ") || "-")}</td></tr>
  </table>
</div>`;
}

/* ============================================================
   Prancha Header / Footer
   ============================================================ */
function pranchaHeader(
  n: number,
  title: string,
  clientName: string,
  projectType: string,
  paperFormat: string = "A2 Landscape",
  totalPranchas: number = 11,
): string {
  return `
    <div class="prancha-header">
      <div class="prancha-header-left">
        <span class="prancha-logo">SOMA-ID</span>
        <span class="prancha-divider">|</span>
        <span>Cliente: ${clientName}</span>
        <span class="prancha-divider">|</span>
        <span>Projeto: ${projectType}</span>
      </div>
      <div class="prancha-header-right">
        Prancha ${String(n).padStart(2, "0")}/${String(totalPranchas).padStart(2, "0")}
      </div>
    </div>
    <div class="prancha-title-bar">
      <h2>PRANCHA ${String(n).padStart(2, "0")} — ${title}</h2>
      <div class="prancha-meta">
        <span>Data: ${today()}</span>
        <span class="prancha-divider">|</span>
        <span>Formato: ${paperFormat}</span>
        <span class="prancha-divider">|</span>
        <span>Escala indicada</span>
      </div>
    </div>`;
}

function pranchaFooter(
  pranchaNum: number = 0,
  totalPranchas: number = 0,
  clientName: string = "",
  projectType: string = "",
  designer: string = "",
  scale: string = "Indicada",
  sessionId: string = "",
): string {
  if (pranchaNum > 0 && totalPranchas > 0 && sessionId) {
    return `<div class="prancha-footer-wrap">
      <div class="prancha-footer">Gerado automaticamente por SOMA-ID &mdash; Escala indicada &mdash; Medidas em mm</div>
      ${renderCarimbo(pranchaNum, totalPranchas, clientName, projectType, designer, scale, "A2 Landscape", sessionId)}
      <div style="clear:both"></div>
    </div>`;
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
  const costBrl = (s as any).estimated_cost_brl || Math.round(s.estimated_cost_usd * 5.5);
  const effColor = s.efficiency_percent >= 80 ? "#27ae60" : s.efficiency_percent >= 60 ? "#e6a817" : "#e74c3c";
  const projectNumber = formatProjectNumber(sessionId);

  // Collect all modules
  const allModules = [...bp.mainWall.modules, ...(bp.sideWall?.modules || [])];

  // Collect all cut items with zone info + P0.5 traceability
  const allCuts: Array<{
    piece: string; module: string; zone: string; qty: number;
    w: number; h: number; thickness: number; material: string;
    edge: string; grain: string; colorHex: string; traceLabel: string;
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
        traceLabel: cut.shortLabel || mod.shortLabel || "",
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

  // Walls array for elevations — P0.4: prefer walls[] if available
  const walls: Array<{ label: string; title: string; totalWidth: number; modules: BlueprintModule[] }> = [];
  if (bp.walls && bp.walls.length > 0) {
    // P0.4 — multi-wall: one elevation per wall with modules
    for (const wl of bp.walls) {
      if (wl.modules.length === 0) continue;
      walls.push({
        label: wl.label.replace("Parede ", ""),
        title: `ELEVACAO ${wl.label.toUpperCase()}`,
        totalWidth: wl.totalModuleWidth,
        modules: wl.modules,
      });
    }
  } else {
    // Legacy fallback: mainWall + sideWall
    if (bp.mainWall.modules.length > 0) {
      walls.push({ label: "A", title: "ELEVACAO PAREDE A", totalWidth: bp.mainWall.totalWidth, modules: bp.mainWall.modules });
    }
    if (bp.sideWall && bp.sideWall.modules.length > 0) {
      walls.push({ label: "B", title: "ELEVACAO PAREDE B", totalWidth: bp.sideWall.totalWidth, modules: bp.sideWall.modules });
    }
  }

  // Additional wall zones from briefing (Closet His, etc.)
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

  // ==================== DYNAMIC PRANCHA COUNT ====================
  // 01: Capa (always)
  // 02: Planta Baixa (always)
  // 03+: One prancha per wall with modules
  // Island prancha (if hasIsland)
  // Makeup+Gun prancha (if hasMakeup or hasGun)
  // Memorial Descritivo (always)
  // BOM/Lista de Materiais (always)
  // Plano de Corte (always)
  // Ferragens (always)
  // Detalhes Construtivos (always)

  let dynamicCount = 2; // Capa + Planta Baixa
  const wallPranchaCount = walls.length > 0 ? walls.length : 1; // at least one wall prancha
  dynamicCount += wallPranchaCount;
  // Each wall gets 2 views (com portas + sem portas) but they are on the same prancha
  if (hasIsland) dynamicCount++;
  if (hasMakeup || hasGun) dynamicCount++;
  dynamicCount += 1; // Memorial Descritivo
  dynamicCount += 1; // BOM
  dynamicCount += 1; // Plano de Corte
  dynamicCount += 1; // Ferragens
  dynamicCount += 1; // Detalhes Construtivos
  dynamicCount += 1; // Cortes de Secao
  dynamicCount += 1; // Vista Isometrica 3D
  // If no walls, add extra prancha for additional zones
  if (walls.length === 0) dynamicCount++; // placeholder wall prancha

  const TOTAL_PRANCHAS = dynamicCount;

  // Build prancha index for cover page
  const pranchaIndex: Array<{ num: number; title: string }> = [];
  let pNum = 1;
  pranchaIndex.push({ num: pNum++, title: "CAPA" });
  pranchaIndex.push({ num: pNum++, title: "PLANTA BAIXA (LAYOUT)" });
  for (let wi = 0; wi < Math.max(walls.length, 1); wi++) {
    const wallLabel = walls[wi]?.label || String.fromCharCode(65 + wi);
    pranchaIndex.push({ num: pNum++, title: `ELEVACAO PAREDE ${wallLabel}` });
  }
  if (hasIsland) pranchaIndex.push({ num: pNum++, title: "ILHA CENTRAL — VISTAS" });
  if (hasMakeup || hasGun) pranchaIndex.push({ num: pNum++, title: "MAKEUP + AREA ARMAS" });
  pranchaIndex.push({ num: pNum++, title: "MEMORIAL DESCRITIVO" });
  pranchaIndex.push({ num: pNum++, title: "LISTA DE MATERIAIS (BOM)" });
  pranchaIndex.push({ num: pNum++, title: "PLANO DE CORTE (NESTING)" });
  pranchaIndex.push({ num: pNum++, title: "FERRAGENS" });
  pranchaIndex.push({ num: pNum++, title: "DETALHES CONSTRUTIVOS" });
  pranchaIndex.push({ num: pNum++, title: "CORTES DE SECAO" });
  pranchaIndex.push({ num: pNum++, title: "VISTA ISOMETRICA 3D" });

  // Prancha number tracker
  let currentPrancha = 0;
  function nextPrancha(): number { return ++currentPrancha; }

  // Helper to build prancha header with dynamic total
  function pH(n: number, title: string, fmt: string = "A2 Landscape"): string {
    return pranchaHeader(n, title, clientName, projectType, fmt, TOTAL_PRANCHAS);
  }

  // Helper to build prancha footer with carimbo
  function pF(n: number, scl: string = "Indicada"): string {
    return pranchaFooter(n, TOTAL_PRANCHAS, clientName, projectType, designer, scl, sessionId);
  }

  // ==================== BUILD HTML ====================
  let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SOMA-ID — Relatorio Tecnico | ${clientName}</title>
<style>
/* P2.4 — Premium Design System (replaces inline CSS) */
${PREMIUM_CSS}
.page{max-width:1000px;margin:0 auto;padding:0}

/* Legacy overrides (kept for backward compat — premium system is primary) */

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
.prancha-footer-wrap{margin-top:20px;border-top:1px solid #eee;padding-top:12px}
.prancha-footer-wrap .prancha-footer{border-top:none;margin-top:0;padding-top:0}

/* === GOLD BAR === */
.gold-bar{height:5px;background:linear-gradient(90deg,${GOLD},#e0c878,${GOLD})}

/* === COVER === */
.cover{text-align:center;padding:60px 40px 40px;min-height:700px;display:flex;flex-direction:column;justify-content:center;align-items:center}
.cover-logo{font-size:52px;font-weight:900;letter-spacing:0.12em;color:#222;margin-bottom:8px}
.cover-sub{font-size:16px;color:#888;letter-spacing:0.06em;margin-bottom:30px}
.cover-gold{width:120px;height:4px;background:${GOLD};margin:0 auto 30px}
.cover-info{text-align:left;display:inline-block;font-size:15px;line-height:2}
.cover-info .label{color:#888;display:inline-block;width:160px;font-size:12px;text-transform:uppercase;letter-spacing:0.04em}
.cover-info .value{font-weight:700;color:#222}
.cover-company{font-size:14px;color:#666;margin-top:30px}
.cover-id{font-size:11px;color:#aaa;margin-top:8px}
.cover-index{text-align:left;margin-top:30px;border-top:1px solid #eee;padding-top:20px;width:100%;max-width:500px}
.cover-index h3{font-size:14px;font-weight:700;color:#333;margin-bottom:8px}
.cover-index-row{display:flex;justify-content:space-between;padding:3px 0;font-size:12px;border-bottom:1px dotted #ddd}
.cover-index-num{color:#888;font-weight:700;width:40px}
.cover-index-title{flex:1;color:#444}

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
.svg-wrap{background:#fff;border:1px solid #ddd;border-radius:4px;padding:16px;margin:12px 0}

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

/* === CARIMBO === */
.carimbo{border:2px solid #333;font-size:10px;margin-top:20px;width:480px;float:right;clear:both}
.carimbo table{margin:0;width:100%;border:none}
.carimbo td{padding:3px 8px;border:1px solid #999}
.carimbo .carimbo-header{background:#333;color:#fff;text-align:center;font-size:14px;font-weight:700;padding:6px}
.carimbo .carimbo-sub{background:#333;color:#ccc;text-align:center;font-size:9px;padding:2px}
.carimbo .label-col{background:#f0f0f0;font-weight:600;width:120px;color:#555}

/* === MEMORIAL === */
.memorial h4{font-size:13px;font-weight:700;margin:16px 0 6px;color:#333;border-bottom:1px solid #ccc;padding-bottom:4px}
.memorial table{margin-bottom:12px}

/* === COTAS RED === */
.dim-label{fill:#CC0000;font-weight:bold;font-family:Arial,sans-serif}

/* === HACHURA PATTERN === */
.hatch-pattern{fill:url(#hatchPattern)}
${SHEET_COMPOSITION_CSS}

/* === PRINT === */
@media print{
  body{font-size:11px}
  .page{max-width:none;padding:0}
  .prancha{page-break-before:always;padding:15px 20px;border:none;min-height:auto}
  .prancha:first-child{page-break-before:auto}
  .no-print{display:none!important}
  .cover{min-height:auto;padding:40px 20px 30px}
  .prancha-footer{font-size:8px}
  .carimbo{font-size:8px;width:320px}
  table{font-size:10px}
  th{padding:5px 6px;font-size:9px}
  td{padding:4px 6px}
}
</style>
</head>
<body>

<div class="page">
`;

  // ================================================================
  // PRANCHA 01 — CAPA
  // ================================================================
  const p01 = nextPrancha();
  html += `
<!-- ================================================================ -->
<!-- PRANCHA ${String(p01).padStart(2, "0")} — CAPA                                                -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-${String(p01).padStart(2, "0")}">
  <div class="cover">
    <div class="cover-logo">SOMA-ID</div>
    <div class="cover-sub">Relatorio Tecnico de Projeto</div>
    <div class="cover-gold"></div>
    <div class="gold-bar" style="width:200px;margin-bottom:30px"></div>
    <div class="cover-info">
      <div><span class="label">Projeto</span><span class="value">${esc(projectNumber)}</span></div>
      <div><span class="label">Cliente</span><span class="value">${clientName}</span></div>
      <div><span class="label">Ambiente</span><span class="value">${projectType}</span></div>
      <div><span class="label">Designer</span><span class="value">${designer}</span></div>
      <div><span class="label">Projetista</span><span class="value">SOMA-ID Engine</span></div>
      <div><span class="label">Data Entrada</span><span class="value">${dateIn}</span></div>
      <div><span class="label">Data Entrega</span><span class="value">${dateDue}</span></div>
      <div><span class="label">Area Total</span><span class="value">${briefing.space?.total_area_m2 || "-"} m&sup2;</span></div>
      <div><span class="label">Pe-Direito</span><span class="value">${briefing.space?.ceiling_height_m || "-"} m</span></div>
      <div><span class="label">Materiais</span><span class="value">${esc((briefing.materials?.colors || []).join(", ") || "-")}</span></div>
      <div><span class="label">Revisao</span><span class="value">RV.01</span></div>
    </div>
    <div class="cover-company">${briefing.client?.referral ? esc(briefing.client.referral) : ""}${briefing.client?.referral ? " | " : ""}Ref: ${esc(briefing.client?.referral || "-")}</div>
    <div class="cover-index">
      <h3>INDICE DE PRANCHAS</h3>
      ${pranchaIndex.map(p => `<div class="cover-index-row"><span class="cover-index-num">${String(p.num).padStart(2, "0")}</span><span class="cover-index-title">${esc(p.title)}</span></div>`).join("")}
    </div>
    <div class="cover-id">Documento gerado em ${nowFull()} | ${TOTAL_PRANCHAS} pranchas | ${esc(projectNumber)}</div>
  </div>
  ${pF(p01)}
</div>
`;

  // ================================================================
  // PRANCHA 02 — PLANTA BAIXA (LAYOUT)
  // ================================================================
  const p02 = nextPrancha();
  html += `
<!-- ================================================================ -->
<!-- PRANCHA ${String(p02).padStart(2, "0")} — PLANTA BAIXA (LAYOUT)                              -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-${String(p02).padStart(2, "0")}">
  ${pH(p02, "PLANTA BAIXA (LAYOUT)", "A2 Landscape")}
  <p style="font-size:11px;color:#666;margin-bottom:8px">Vista superior do ambiente com distribuicao de zonas, cotas externas e internas, indicacao de cortes de secao A, B, C, D.</p>
  <div class="svg-wrap">
    ${renderFloorPlanSvg(briefing, results)}
  </div>
  <div style="margin-top:12px">
    <table>
      <tr><th>Parede</th><th>Comprimento</th><th>Caracteristicas</th></tr>
      ${(briefing.space?.walls || []).map((w, i) => `<tr><td>Parede ${["A","B","C","D"][i] || w.id}</td><td>${(w.length_m * 1000).toFixed(0)} mm (${w.length_m.toFixed(2)} m)</td><td>${(w.features || []).join(", ") || "-"}</td></tr>`).join("")}
    </table>
  </div>
  <div style="margin-top:8px">
    <table>
      <tr><th>Zona</th><th>Largura</th><th>Profundidade</th><th>Itens Principais</th></tr>
      ${(briefing.zones || []).map(z => `<tr><td>${esc(z.name)}</td><td>${z.dimensions ? (z.dimensions.width_m * 1000).toFixed(0) + " mm" : "-"}</td><td>${z.dimensions ? (z.dimensions.depth_m * 1000).toFixed(0) + " mm" : "-"}</td><td>${(z.items || []).map(it => it.type + (it.quantity ? " (" + it.quantity + ")" : "")).join(", ") || "-"}</td></tr>`).join("")}
    </table>
  </div>
  ${pF(p02, "1:" + Math.ceil(Math.max((briefing.space?.walls?.[0]?.length_m || 5) * 1000, 4000) / 400))}
</div>
`;

  // ================================================================
  // PRANCHAS — WALL ELEVATIONS (dynamic, one per wall)
  // ================================================================
  if (walls.length > 0) {
    for (let wi = 0; wi < walls.length; wi++) {
      const wall = walls[wi];
      const pW = nextPrancha();

      // P0.7 — Compose elevation prancha with ViewBlocks
      const elevViews: ViewBlock[] = [
        {
          id: `elev-com-${wi}`,
          title: "Vista COM Portas",
          scale: "1:25",
          content: `<p style="font-size:11px;color:#666;margin-bottom:8px">Vista frontal com portas. Materiais: ${esc(bp.materials.mdfColor || "-")} | Espessura: ${bp.materials.thickness || 18}mm</p>` +
            renderWallSvg(wall.title, wall.totalWidth, wall.modules, 2400, `w${String(pW).padStart(2, "0")}`),
          priority: 1,
        },
        {
          id: `elev-sem-${wi}`,
          title: "Vista SEM Portas (Interior)",
          scale: "1:25",
          content: renderWallInteriorSvg(wall.title, wall.totalWidth, wall.modules, 2400, `wi${String(pW).padStart(2, "0")}`),
          priority: 1,
        },
        {
          id: `elev-table-${wi}`,
          title: "Modulos",
          content: `<table>
    <tr><th>Cod.</th><th>Modulo</th><th>Tipo</th><th>Largura mm</th><th>Altura mm</th><th>Profund. mm</th><th>Posicao X</th><th>Pecas</th><th>Notas</th></tr>
    ${wall.modules.map(m => `<tr><td style="font-family:monospace;font-weight:bold">${m.shortLabel || ""}</td><td>${esc(m.name)}</td><td>${esc(m.type)}</td><td>${m.width}</td><td>${m.height}</td><td>${m.depth}</td><td>${m.position?.x || 0}</td><td>${m.cutList.length} tipos</td><td>${(m.notes || []).join("; ") || "-"}</td></tr>`).join("")}
  </table>`,
          priority: 2,
        },
      ];

      html += composeSheet(pW, TOTAL_PRANCHAS, wall.title, elevViews, {
        clientName, projectType, designer, sessionId,
        format: "A2 Landscape",
        scale: "1:25",
      });
    }
  } else {
    // No walls defined — placeholder
    const pW = nextPrancha();
    html += `
<div class="prancha" id="prancha-${String(pW).padStart(2, "0")}">
  ${pH(pW, "ELEVACAO PAREDE A", "A2 Landscape")}
  <p style="color:#888;font-style:italic">Nenhum modulo definido para as paredes. Caso exista definicao de modulos, as elevacoes com vistas COM portas e SEM portas apareceriam aqui.</p>
  <p style="font-size:11px;color:#666;margin-top:12px">Zonas adicionais identificadas no briefing:</p>
  ${additionalZones.length > 0 ? `
  <table>
    <tr><th>Zona</th><th>Largura</th><th>Profundidade</th><th>Itens</th><th>Restricoes</th></tr>
    ${additionalZones.map(z => `<tr>
      <td>${esc(z.name)}</td>
      <td>${z.dimensions ? (z.dimensions.width_m * 1000).toFixed(0) + " mm" : "-"}</td>
      <td>${z.dimensions ? (z.dimensions.depth_m * 1000).toFixed(0) + " mm" : "-"}</td>
      <td>${(z.items || []).map(it => esc(it.type) + (it.quantity ? " (" + it.quantity + ")" : "")).join(", ") || "-"}</td>
      <td>${(z.constraints || []).map(c => esc(c.type) + (c.value_mm ? " " + c.value_mm + "mm" : "")).join("; ") || "-"}</td>
    </tr>`).join("")}
  </table>` : `<p style="color:#888;font-style:italic">Nenhuma zona adicional identificada.</p>`}
  ${pF(pW)}
</div>
`;
  }

  // ================================================================
  // PRANCHA — ILHA CENTRAL (if applicable)
  // ================================================================
  if (hasIsland) {
    const pI = nextPrancha();
    html += `
<!-- ================================================================ -->
<!-- PRANCHA ${String(pI).padStart(2, "0")} — ILHA CENTRAL — VISTAS                            -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-${String(pI).padStart(2, "0")}">
  ${pH(pI, "ILHA CENTRAL — 5 VISTAS", "A2 Landscape")}
  <p style="font-size:11px;color:#666;margin-bottom:8px">Tampo em vidro temperado 10mm com divisores em veludo. Gavetas com corredicas ocultas soft-close full extension.</p>
  <div class="svg-wrap">
    ${renderIslandSvg(briefing, allModules)}
  </div>
  <div style="margin-top:8px">
    <table>
      <tr><th>Componente</th><th>Especificacao</th></tr>
      <tr><td>Tampo</td><td>Vidro Temperado 10mm com bordas polidas</td></tr>
      <tr><td>Corpo</td><td>MDP 18mm — ${esc(bp.materials.mdfColor || "conforme projeto")}</td></tr>
      <tr><td>Frentes</td><td>MDF 18mm — ${esc(bp.materials.mdfColor || "conforme projeto")}</td></tr>
      <tr><td>Divisores superiores</td><td>Veludo sobre MDF — Joias, Oculos</td></tr>
      <tr><td>Gavetas</td><td>Corredica Oculta Soft-Close, profundidade 500mm</td></tr>
      <tr><td>Puxadores</td><td>Perfil embutido (gola) ou puxador tubular — conforme projeto</td></tr>
      ${((briefing.zones || []).find(z => z.name.toLowerCase().includes("ilha"))?.items || []).map(it => `<tr><td>${esc(it.type)}</td><td>${(it.features || []).join(", ") || "-"}${it.categories ? " | Categorias: " + it.categories.join(", ") : ""}</td></tr>`).join("")}
    </table>
  </div>
  ${pF(pI, "1:10")}
</div>
`;
  }

  // ================================================================
  // PRANCHA — MAKEUP + AREA ARMAS (if applicable)
  // ================================================================
  if (hasMakeup || hasGun) {
    const pMG = nextPrancha();
    html += `
<!-- ================================================================ -->
<!-- PRANCHA ${String(pMG).padStart(2, "0")} — MAKEUP + AREA ARMAS                                -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-${String(pMG).padStart(2, "0")}">
  ${pH(pMG, "MAKEUP + AREA ARMAS", "A3 Landscape")}
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
  </div>
  ${pF(pMG, "1:20")}
</div>
`;
  }

  // ================================================================
  // PRANCHA — MEMORIAL DESCRITIVO (always)
  // ================================================================
  const pMD = nextPrancha();
  html += `
<!-- ================================================================ -->
<!-- PRANCHA ${String(pMD).padStart(2, "0")} — MEMORIAL DESCRITIVO                                -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-${String(pMD).padStart(2, "0")}">
  ${pH(pMD, "MEMORIAL DESCRITIVO", "A3")}
  ${renderMemorialDescritivo(briefing, results)}
  ${pF(pMD)}
</div>
`;

  // ================================================================
  // PRANCHA — LISTA DE MATERIAIS (BOM)
  // ================================================================
  const pBOM = nextPrancha();
  html += `
<!-- ================================================================ -->
<!-- PRANCHA ${String(pBOM).padStart(2, "0")} — LISTA DE MATERIAIS (BOM)                           -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-${String(pBOM).padStart(2, "0")}">
  ${pH(pBOM, "LISTA DE MATERIAIS (BOM)", "A3 Landscape")}
  <div class="metrics">
    <div class="metric blue"><div class="val">${s.total_modules}</div><div class="lbl">Modulos</div></div>
    <div class="metric green"><div class="val">${s.total_parts}</div><div class="lbl">Pecas Totais</div></div>
    <div class="metric orange"><div class="val">${s.total_sheets}</div><div class="lbl">Chapas</div></div>
    <div class="metric gold"><div class="val">${s.efficiency_percent}%</div><div class="lbl">Eficiencia</div></div>
    <div class="metric purple"><div class="val">${s.hardware_items}</div><div class="lbl">Ferragens</div></div>
  </div>
  <div class="cost-box">
    <div class="amount">${results.pricing ? results.pricing.currency : "USD"} ${fmtCost(s.estimated_cost_usd)}</div>
    <div class="desc">${results.pricing ? `Preco comercial (${results.pricing.pricingProfileName})` : "Estimativa"}</div>
    ${results.pricing ? `<div style="font-size:10px;color:#888;margin-top:4px">Custo tecnico: ${results.pricing.currency} ${fmtCost(results.pricing.technicalCost.subtotal)} | Markup: ${(results.pricing.commercialPrice.markupApplied * 100).toFixed(0)}% | Instalacao: ${results.pricing.currency} ${fmtCost(results.pricing.commercialPrice.installationCharge)}</div>` : ""}
  </div>

  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#333">Lista Completa de Pecas</h3>
  <table>
    <tr>
      <th>Cod.</th><th>#</th><th>Peca</th><th>Modulo</th><th>Zona</th><th>Qtd</th>
      <th>Largura mm</th><th>Altura mm</th><th>Esp. mm</th>
      <th>Material</th><th>Fita Borda (faces)</th><th>Veio</th><th>Cor</th>
    </tr>
    ${(() => {
      let tbl = "";
      let idx = 1;
      for (const [zone, cuts] of Object.entries(cutsByZone)) {
        tbl += `<tr class="zone-header"><td colspan="13">${esc(zone)}</td></tr>`;
        for (const c of cuts) {
          // Determine edge banding per face based on piece type
          const pLow = c.piece.toLowerCase();
          let edgeFaces = c.edge || "-";
          if (edgeFaces !== "-" && edgeFaces !== "none") {
            if (pLow.includes("lateral") || pLow.includes("side")) {
              edgeFaces = "F,S,I (3 faces)"; // frente, superior, inferior
            } else if (pLow.includes("prateleira") || pLow.includes("shelf")) {
              edgeFaces = "F (1 face frontal)";
            } else if (pLow.includes("fundo") || pLow.includes("back")) {
              edgeFaces = "— (sem fita)";
            } else if (pLow.includes("porta") || pLow.includes("door") || pLow.includes("frente") || pLow.includes("front")) {
              edgeFaces = "4 faces (perimetro)";
            } else if (pLow.includes("tampo") || pLow.includes("top")) {
              edgeFaces = "4 faces (perimetro)";
            } else if (pLow.includes("divisor") || pLow.includes("divider")) {
              edgeFaces = "F (1 face visivel)";
            } else {
              edgeFaces = "F,S (2 faces visiveis)";
            }
          }
          tbl += `<tr>
            <td style="font-family:monospace;font-size:10px;font-weight:bold">${esc(c.traceLabel || "")}</td><td>${idx++}</td><td>${esc(c.piece)}</td><td>${esc(c.module)}</td><td>${esc(c.zone)}</td>
            <td>${c.qty}</td><td>${c.w}</td><td>${c.h}</td><td>${c.thickness}</td>
            <td>${esc(c.material)}</td><td>${esc(edgeFaces)}</td><td>${c.grain}</td>
            <td><span style="display:inline-block;width:14px;height:14px;background:${c.colorHex || "#ccc"};border:1px solid #999;vertical-align:middle;border-radius:2px"></span> ${esc(c.colorHex || "-")}</td>
          </tr>`;
        }
      }
      return tbl;
    })()}
    <tr class="total-row">
      <td colspan="4">TOTAL</td>
      <td>${allCuts.reduce((a, c) => a + c.qty, 0)}</td>
      <td colspan="7">${allCuts.length} tipos de peca | ${Object.keys(m2ByMaterial).map(k => esc(k) + ": " + m2ByMaterial[k].toFixed(2) + " m&sup2;").join(" | ")}</td>
    </tr>
  </table>
  ${pF(pBOM)}
</div>
`;

  // ================================================================
  // PRANCHA — PLANO DE CORTE (NESTING)
  // ================================================================
  const pNest = nextPrancha();
  html += `
<!-- ================================================================ -->
<!-- PRANCHA ${String(pNest).padStart(2, "0")} — PLANO DE CORTE (NESTING)                           -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-${String(pNest).padStart(2, "0")}">
  ${pH(pNest, "PLANO DE CORTE (NESTING)", "A2 Landscape")}
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
    <h3>Chapa ${sheet.id} de ${nest.totalSheets} &mdash; ${esc(sheet.material)} (Boa Vista) &mdash; ${sheet.width}x${sheet.height}mm &mdash; Aproveitamento: ${effPct.toFixed(1)}%</h3>
    <p style="font-size:11px;color:#666">Dimensoes: ${sheet.width} x ${sheet.height} mm | Pecas: ${sheet.items.length} | Desperdicio: ${(sheet.waste * 100).toFixed(1)}%</p>
    <div class="svg-wrap">
      ${renderSheetSvg(sheet, i)}
    </div>
    <div class="eff-bar"><div class="eff-fill" style="width:${effPct}%;background:${eColor}">${effPct.toFixed(1)}%</div></div>
  </div>`;
  }).join("")}
  ${pF(pNest, "1:10")}
</div>
`;

  // ================================================================
  // PRANCHA — FERRAGENS
  // ================================================================
  const pHW = nextPrancha();
  html += `
<!-- ================================================================ -->
<!-- PRANCHA ${String(pHW).padStart(2, "0")} — FERRAGENS                                          -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-${String(pHW).padStart(2, "0")}">
  ${pH(pHW, "FERRAGENS", "A3 Landscape")}
  <div class="metrics">
    <div class="metric purple"><div class="val">${s.hardware_items}</div><div class="lbl">Total Ferragens</div></div>
    <div class="metric blue"><div class="val">${hwItems.length}</div><div class="lbl">Tipos Distintos</div></div>
  </div>

  ${hwItems.length > 0 ? `
  <table>
    <tr><th style="width:30px"></th><th>Ferragem</th><th>Tipo</th><th>Modulo</th><th>Zona</th><th>Qtd</th><th>Especificacao</th></tr>
    ${(() => {
      let tbl = "";
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
          tbl += `<tr class="zone-header"><td colspan="7">${esc(currentType.toUpperCase())}</td></tr>`;
        }
        tbl += `<tr><td style="text-align:center">${hwIcon(hw.type)}</td><td>${esc(hw.name)}</td><td>${esc(hw.type)}</td><td>${esc(hw.module)}</td><td>${esc(hw.zone)}</td><td>${hw.qty}</td><td>${esc(hw.spec)}</td></tr>`;
      }
      return tbl;
    })()}
    <tr class="total-row"><td colspan="5">TOTAL</td><td>${bp.hardwareMap.length}</td><td></td></tr>
  </table>` : `<p style="color:#888;font-style:italic">Nenhuma ferragem listada.</p>`}
  ${pF(pHW)}
</div>
`;

  // ================================================================
  // PRANCHA — DETALHES CONSTRUTIVOS
  // ================================================================
  const pDC = nextPrancha();
  html += `
<!-- ================================================================ -->
<!-- PRANCHA ${String(pDC).padStart(2, "0")} — DETALHES CONSTRUTIVOS                              -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-${String(pDC).padStart(2, "0")}">
  ${pH(pDC, "DETALHES CONSTRUTIVOS", "A3")}

  <!-- Constructive Details SVG -->
  <div class="svg-wrap">
    ${renderConstructiveDetailsSvg()}
  </div>

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

  <!-- P0.8 — Fabrication Validation -->
  ${(() => {
    const fv = results.fabricationValidation;
    if (!fv || fv.totalChecks === 0) return `
  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#27ae60">Validacao de Fabricabilidade: OK</h3>
  <p style="font-size:12px;color:#666">Nenhum problema de fabricacao detectado.</p>`;

    const statusColor = fv.isReadyForFactory ? "#27ae60" : "#e74c3c";
    const statusLabel = fv.isReadyForFactory ? "PRONTO PARA FABRICA" : "NAO PRONTO — REQUER ATENCAO";
    let html = `
  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:${statusColor}">Validacao de Fabricabilidade: ${statusLabel}</h3>
  <div class="metrics" style="margin-bottom:8px">
    <div class="metric ${fv.criticalCount > 0 ? "red" : "green"}"><div class="val">${fv.criticalCount}</div><div class="lbl">Criticos</div></div>
    <div class="metric ${fv.warningCount > 0 ? "orange" : "green"}"><div class="val">${fv.warningCount}</div><div class="lbl">Avisos</div></div>
    <div class="metric blue"><div class="val">${fv.totalChecks}</div><div class="lbl">Verificacoes</div></div>
  </div>`;
    if (fv.results.length > 0) {
      html += `<table><tr><th>Cod.</th><th>Sev.</th><th>Modulo</th><th>Problema</th><th>Acao Sugerida</th></tr>`;
      for (const r of fv.results) {
        const sevClass = r.severity === "critical" ? "color:#e74c3c;font-weight:bold" : r.severity === "warning" ? "color:#e6a817" : "color:#888";
        html += `<tr>
          <td style="font-family:monospace">${esc(r.code)}</td>
          <td style="${sevClass}">${r.severity === "critical" ? "CRITICO" : r.severity === "warning" ? "AVISO" : "INFO"}</td>
          <td>${esc(r.entityName)} <span style="font-family:monospace;font-size:9px;color:#888">${esc(r.entityTraceId)}</span></td>
          <td>${esc(r.message)}</td>
          <td style="font-size:11px;color:#666">${esc(r.suggestedAction || "-")}</td>
        </tr>`;
      }
      html += `</table>`;
    }
    return html;
  })()}

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

  <!-- P1.1 — Catalog Provenance -->
  ${(() => {
    const cu = results.catalogUsage;
    if (!cu) return "";
    return `
  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#333">Catalogo Utilizado</h3>
  <table>
    <tr><td style="font-weight:bold">Catalogo</td><td>${esc(cu.catalogName)}</td><td style="font-weight:bold">Versao</td><td>${esc(cu.catalogVersion)}</td></tr>
    <tr><td style="font-weight:bold">ID</td><td>${esc(cu.catalogId)}</td><td style="font-weight:bold">Lookups</td><td>${cu.totalLookups} (${cu.catalogHits} catalogo, ${cu.fallbackHits} fallback, ${cu.hardcodedHits} hardcoded)</td></tr>
  </table>`;
  })()}

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
  </table>
  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#333">Diagrama de Passagem Minima</h3>
  ${constraints.filter(c => c.type === "min_passage" || (c.value_mm && c.value_mm >= 600)).map(pc => `
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

  <!-- Tolerance & Fit Notes -->
  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#333">Tolerancias e Descontos de Montagem</h3>
  <table>
    <tr><th>Item</th><th>Valor</th><th>Observacao</th></tr>
    <tr><td>Desconto parede (lado encostado)</td><td>5 mm</td><td>Aplicar em cada lateral encostada na alvenaria</td></tr>
    <tr><td>Folga entre modulos adjacentes</td><td>2–3 mm</td><td>Permite ajuste e dilatacao termica</td></tr>
    <tr><td>Rodape (folga piso-movel)</td><td>70–100 mm</td><td>Padrao 100mm — ajustar conforme rodape existente</td></tr>
    <tr><td>Sobreposicao porta sobre lateral</td><td>18 mm</td><td>Dobradica 35mm copo — sobreposicao total</td></tr>
    <tr><td>Folga porta-porta (duas portas)</td><td>3 mm</td><td>Entre frontal de portas adjacentes</td></tr>
    <tr><td>Desconto corrediça (porta correr)</td><td>12–15 mm</td><td>Por trilho — conforme modelo do trilho</td></tr>
    <tr><td>Clearance gaveta (puxar + corpo)</td><td>Prof. gaveta + 200 mm</td><td>Espaco livre frontal para abertura total</td></tr>
    <tr><td>Clearance ilha (todos os lados)</td><td>Min. 600 mm</td><td>Circulacao minima ao redor da ilha central</td></tr>
    <tr><td>Prateleira vao maximo sem suporte</td><td>900 mm</td><td>Acima disso necessita suporte central</td></tr>
    <tr><td>Fita de borda</td><td>ABS/PVC</td><td>Todas as faces visiveis — largura = espessura da chapa</td></tr>
  </table>

  <!-- Summary -->
  <div style="margin-top:20px;padding:16px;background:#f5f5f5;border-radius:6px;border-left:4px solid ${GOLD}">
    <p style="font-size:13px;font-weight:700;margin-bottom:6px">Resumo Final</p>
    <p style="font-size:12px;color:#444">
      ${s.total_modules} modulos | ${s.total_parts} pecas | ${s.total_sheets} chapas |
      Eficiencia ${s.efficiency_percent}% | ${s.hardware_items} ferragens |
      ${s.critical_conflicts} conflitos criticos | ${s.warnings} avisos |
      Custo estimado: R$ ${fmtCost(costBrl)}
    </p>
  </div>

  ${pF(pDC)}
</div>

<!-- ================================================================ -->
<!-- PRANCHA — CORTES DE SECAO                                      -->
<!-- ================================================================ -->
`;
  const pSEC = nextPrancha();
  html += `
<div class="prancha" id="prancha-${String(pSEC).padStart(2, "0")}">
  ${pH(pSEC, "CORTES DE SECAO", "A2 Landscape")}
  <p style="font-size:11px;color:#666;margin-bottom:8px">Vistas transversal (A-A') e longitudinal (B-B') com profundidades, circulacao, detalhes de rodape, folga de portas e entre modulos.</p>
  <div class="svg-wrap">
    ${renderSectionViewsSvg(briefing, results)}
  </div>
  ${pF(pSEC, "Esquematica")}
</div>

<!-- ================================================================ -->
<!-- PRANCHA — VISTA ISOMETRICA 3D                                  -->
<!-- ================================================================ -->
`;
  const pISO = nextPrancha();
  html += `
<div class="prancha" id="prancha-${String(pISO).padStart(2, "0")}">
  ${pH(pISO, "VISTA ISOMETRICA 3D", "A2 Landscape")}
  <p style="font-size:11px;color:#666;margin-bottom:8px">Visualizacao tridimensional esquematica do ambiente com todos os modulos posicionados. Projecao isometrica 30 graus.</p>
  <div class="svg-wrap">
    ${renderIsometricSvg(briefing, results)}
  </div>
  <div style="margin-top:12px">
    <table>
      <tr><th>Dimensao</th><th>Valor</th></tr>
      <tr><td>Largura ambiente</td><td>${bp.mainWall.totalWidth || "-"} mm</td></tr>
      <tr><td>Profundidade estimada</td><td>${Math.round((briefing.space?.walls?.[1]?.length_m || (bp.mainWall.totalWidth || 5000) * 0.8 / 1000) * 1000)} mm</td></tr>
      <tr><td>Pe-Direito</td><td>${Math.round((briefing.space?.ceiling_height_m || 2.8) * 1000)} mm</td></tr>
      <tr><td>Total Modulos</td><td>${allModules.length}</td></tr>
    </table>
  </div>
  ${pF(pISO, "Esquematica")}
</div>

<!-- Final footer -->
<div style="text-align:center;padding:20px;color:#aaa;font-size:10px;border-top:2px solid ${GOLD}">
  SOMA-ID Engine v2.0 | Gerado em ${nowFull()} | Sessao: ${esc(sessionId)} | Projeto: ${esc(projectNumber)} | ${TOTAL_PRANCHAS} pranchas
</div>

</div><!-- .page -->
</body>
</html>`;

  return html;
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

/* MATERIAL_COLOR_MAP, getColorForMaterial, getModuleColorHex — moved to report/material-patterns.ts */

/** Get a hex color for a module from the blueprint materials */
function getModuleColorHex(mod: BlueprintModule, bp: { materials: { mdfColor: string; internalColor: string } }): string {
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
