/**
 * sheet-composer.ts
 * P0.7 — Executive sheet composition system.
 * Controls usable area, margins, title block, view grid, and overflow.
 */

import { esc, today, formatProjectNumber, GOLD, STROKE } from "./svg-primitives.js";

/* ============================================================
   Sheet Template Types
   ============================================================ */

export interface SheetTemplate {
  format: string;          // "A2 Landscape", "A3", etc.
  marginTop: number;       // px
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  titleBlockHeight: number; // px for carimbo area
  headerHeight: number;     // px for header bar
}

export interface ViewBlock {
  id: string;               // unique view identifier
  title: string;            // "Vista COM Portas", "CORTE A-A'", etc.
  scale?: string;           // "1:15", "1:20", "Indicada"
  content: string;          // rendered HTML/SVG content
  estimatedHeight?: number; // px, for overflow calculation
  priority: number;         // lower = higher priority (1 = must show)
}

export interface ComposedSheet {
  pranchaNumber: number;
  title: string;
  format: string;
  views: ViewBlock[];
  headerHtml: string;
  footerHtml: string;
}

/* ============================================================
   Default Templates
   ============================================================ */

export const SHEET_TEMPLATES: Record<string, SheetTemplate> = {
  "A2 Landscape": {
    format: "A2 Landscape",
    marginTop: 15, marginRight: 15, marginBottom: 15, marginLeft: 15,
    titleBlockHeight: 120, headerHeight: 60,
  },
  "A3 Landscape": {
    format: "A3 Landscape",
    marginTop: 12, marginRight: 12, marginBottom: 12, marginLeft: 12,
    titleBlockHeight: 100, headerHeight: 55,
  },
  "A3": {
    format: "A3",
    marginTop: 12, marginRight: 12, marginBottom: 12, marginLeft: 12,
    titleBlockHeight: 100, headerHeight: 55,
  },
};

/* ============================================================
   Sheet Header (top bar with logo, client, prancha number)
   ============================================================ */

export function composeSheetHeader(
  pranchaNum: number,
  totalPranchas: number,
  title: string,
  clientName: string,
  projectType: string,
  format: string,
  scale: string = "Indicada",
): string {
  const padNum = String(pranchaNum).padStart(2, "0");
  const padTotal = String(totalPranchas).padStart(2, "0");
  return `
<div class="prancha-header">
  <div class="prancha-header-left">
    <span class="prancha-logo">SOMA-ID</span>
    <span class="prancha-divider">|</span>
    <span>Cliente: ${esc(clientName)}</span>
    <span class="prancha-divider">|</span>
    <span>Projeto: ${esc(projectType)}</span>
  </div>
  <div class="prancha-header-right">Prancha ${padNum}/${padTotal}</div>
</div>
<div class="prancha-title-bar">
  <h2>PRANCHA ${padNum} — ${esc(title)}</h2>
  <div class="prancha-meta">
    <span>Data: ${today()}</span>
    <span class="prancha-divider">|</span>
    <span>Formato: ${esc(format)}</span>
    <span class="prancha-divider">|</span>
    <span>Escala ${esc(scale)}</span>
  </div>
</div>`;
}

/* ============================================================
   Title Block / Carimbo (bottom stamp)
   ============================================================ */

export function composeTitleBlock(
  pranchaNum: number,
  totalPranchas: number,
  clientName: string,
  projectType: string,
  designer: string,
  scale: string,
  format: string,
  sessionId: string,
  revision: string = "Rev.00",
): string {
  const projectNumber = formatProjectNumber(sessionId);
  const padNum = String(pranchaNum).padStart(2, "0");
  const padTotal = String(totalPranchas).padStart(2, "0");

  return `
<div class="prancha-footer-wrap">
  <div class="prancha-footer">Gerado automaticamente por SOMA-ID — Escala ${esc(scale)} — Medidas em mm</div>
  <div class="carimbo">
    <table>
      <tr><td colspan="4" class="carimbo-header">
        <strong style="font-size:14px;letter-spacing:2px">SOMA-ID</strong>
        <br><span style="font-size:7px;color:#888">Sistema Inteligente de Marcenaria Industrial</span>
      </td></tr>
      <tr>
        <td class="carimbo-label">Cliente</td><td class="carimbo-value">${esc(clientName)}</td>
        <td class="carimbo-label">Ambiente</td><td class="carimbo-value">${esc(projectType)}</td>
      </tr>
      <tr>
        <td class="carimbo-label">Designer</td><td class="carimbo-value">${esc(designer)}</td>
        <td class="carimbo-label">Verificador</td><td class="carimbo-value">SOMA-ID Engine</td>
      </tr>
      <tr>
        <td class="carimbo-label">Escala</td><td class="carimbo-value">${esc(scale)}</td>
        <td class="carimbo-label">Formato</td><td class="carimbo-value">${esc(format)}</td>
      </tr>
      <tr>
        <td class="carimbo-label">Prancha</td><td class="carimbo-value">${padNum} / ${padTotal}</td>
        <td class="carimbo-label">${esc(revision)}</td><td class="carimbo-value">${today()}</td>
      </tr>
      <tr>
        <td class="carimbo-label">Projeto</td><td colspan="3" class="carimbo-value">${esc(projectNumber)}</td>
      </tr>
    </table>
  </div>
  <div style="clear:both"></div>
</div>`;
}

/* ============================================================
   View Block Wrapper — adds title and scale to any view
   ============================================================ */

export function wrapViewBlock(view: ViewBlock): string {
  const scaleTag = view.scale ? `<span class="view-scale">Escala ${esc(view.scale)}</span>` : "";
  return `
<div class="view-block" data-view-id="${view.id}">
  <div class="view-block-header">
    <h3 class="view-title">${esc(view.title)}</h3>
    ${scaleTag}
  </div>
  <div class="svg-wrap">
    ${view.content}
  </div>
</div>`;
}

/* ============================================================
   Compose a complete sheet from views
   ============================================================ */

export function composeSheet(
  pranchaNum: number,
  totalPranchas: number,
  title: string,
  views: ViewBlock[],
  meta: {
    clientName: string;
    projectType: string;
    designer: string;
    sessionId: string;
    format?: string;
    scale?: string;
    revision?: string;
  },
): string {
  const format = meta.format || "A2 Landscape";
  const scale = meta.scale || "Indicada";
  const template = SHEET_TEMPLATES[format] || SHEET_TEMPLATES["A2 Landscape"];

  const header = composeSheetHeader(pranchaNum, totalPranchas, title, meta.clientName, meta.projectType, format, scale);
  const footer = composeTitleBlock(pranchaNum, totalPranchas, meta.clientName, meta.projectType, meta.designer, scale, format, meta.sessionId, meta.revision);

  const viewsHtml = views.map(v => wrapViewBlock(v)).join("\n");

  return `
<!-- ================================================================ -->
<!-- PRANCHA ${String(pranchaNum).padStart(2, "0")} — ${title.toUpperCase()} -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-${String(pranchaNum).padStart(2, "0")}" style="padding:${template.marginTop}px ${template.marginRight}px ${template.marginBottom}px ${template.marginLeft}px">
  ${header}
  ${viewsHtml}
  ${footer}
</div>`;
}

/* ============================================================
   CSS additions for view blocks
   ============================================================ */

export const SHEET_COMPOSITION_CSS = `
/* P0.7 — View block styling */
.view-block{margin:12px 0 8px}
.view-block-header{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px}
.view-title{font-size:13px;font-weight:700;margin:0;color:#333}
.view-scale{font-size:10px;color:#888;font-style:italic}
`;
