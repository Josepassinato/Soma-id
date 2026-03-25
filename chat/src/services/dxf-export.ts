/**
 * dxf-export.ts
 * Generates ASCII DXF files for the SOMA ID furniture/carpentry system.
 *
 * Layers:
 *   CHAPA          (7 white)   - Sheet outlines (2750x1830mm standard)
 *   CORTE_EXTERNO  (1 red)     - Part outlines for cutting
 *   FURACAO        (3 green)   - Drilling points
 *   COTA           (5 blue)    - Dimension lines
 *   MODULO         (4 cyan)    - Module outlines (elevation view)
 *   ETIQUETAS      (6 magenta) - Text labels
 *
 * No external DXF library required - generates valid ASCII DXF directly.
 */

import type { ParsedBriefing } from "../types.js";
import type {
  BlueprintModule,
  CutListItem,
  Sheet,
  PlacedItem,
  EngineResults,
  BlueprintData,
  NestingResult,
} from "./engine-bridge.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STANDARD_SHEET_WIDTH = 2750;
const STANDARD_SHEET_HEIGHT = 1830;

/** Spacing between sheets when laid out side-by-side in DXF */
const SHEET_GAP = 200;

/** Text height for labels */
const LABEL_HEIGHT = 40;

/** Text height for dimension values */
const DIM_TEXT_HEIGHT = 30;

/** Offset for dimension lines from geometry */
const DIM_OFFSET = 60;

/** Tick mark half-length for dimension terminators */
const DIM_TICK = 15;

// ---------------------------------------------------------------------------
// Layer definitions
// ---------------------------------------------------------------------------

interface LayerDef {
  name: string;
  color: number;
}

const LAYERS: LayerDef[] = [
  { name: "CHAPA", color: 7 },
  { name: "CORTE_EXTERNO", color: 1 },
  { name: "FURACAO", color: 3 },
  { name: "COTA", color: 5 },
  { name: "MODULO", color: 4 },
  { name: "ETIQUETAS", color: 6 },
];

// ---------------------------------------------------------------------------
// Low-level DXF helpers
// ---------------------------------------------------------------------------

/** Emit a DXF group code + value pair. */
function gc(code: number, value: string | number): string {
  return `  ${code}\n${value}\n`;
}

/** Build a closed LWPOLYLINE rectangle. */
function lwPolylineRect(
  layer: string,
  x: number,
  y: number,
  w: number,
  h: number,
): string {
  let s = "";
  s += gc(0, "LWPOLYLINE");
  s += gc(8, layer);
  s += gc(90, 4); // vertex count
  s += gc(70, 1); // closed
  s += gc(10, x);
  s += gc(20, y);
  s += gc(10, x + w);
  s += gc(20, y);
  s += gc(10, x + w);
  s += gc(20, y + h);
  s += gc(10, x);
  s += gc(20, y + h);
  return s;
}

/** Build a CIRCLE entity. */
function circle(
  layer: string,
  cx: number,
  cy: number,
  radius: number,
): string {
  let s = "";
  s += gc(0, "CIRCLE");
  s += gc(8, layer);
  s += gc(10, cx);
  s += gc(20, cy);
  s += gc(30, 0);
  s += gc(40, radius);
  return s;
}

/** Build a LINE entity. */
function line(
  layer: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  let s = "";
  s += gc(0, "LINE");
  s += gc(8, layer);
  s += gc(10, x1);
  s += gc(20, y1);
  s += gc(30, 0);
  s += gc(11, x2);
  s += gc(21, y2);
  s += gc(31, 0);
  return s;
}

/** Build a TEXT entity. */
function text(
  layer: string,
  x: number,
  y: number,
  height: number,
  value: string,
  rotation: number = 0,
): string {
  let s = "";
  s += gc(0, "TEXT");
  s += gc(8, layer);
  s += gc(10, x);
  s += gc(20, y);
  s += gc(30, 0);
  s += gc(40, height);
  s += gc(1, value);
  if (rotation !== 0) {
    s += gc(50, rotation);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Dimension helper
// ---------------------------------------------------------------------------

/**
 * Draw a horizontal or vertical dimension line with tick marks and text.
 * All entities go on the COTA layer.
 */
function dimensionH(
  x1: number,
  y: number,
  x2: number,
  offsetY: number,
): string {
  const dy = y + offsetY;
  const midX = (x1 + x2) / 2;
  const length = Math.abs(x2 - x1);
  let s = "";
  // main dimension line
  s += line("COTA", x1, dy, x2, dy);
  // extension lines
  s += line("COTA", x1, y, x1, dy);
  s += line("COTA", x2, y, x2, dy);
  // tick marks
  s += line("COTA", x1 - DIM_TICK, dy - DIM_TICK, x1 + DIM_TICK, dy + DIM_TICK);
  s += line("COTA", x2 - DIM_TICK, dy - DIM_TICK, x2 + DIM_TICK, dy + DIM_TICK);
  // value text
  s += text("COTA", midX, dy + 5, DIM_TEXT_HEIGHT, `${length.toFixed(0)}`);
  return s;
}

function dimensionV(
  x: number,
  y1: number,
  y2: number,
  offsetX: number,
): string {
  const dx = x + offsetX;
  const midY = (y1 + y2) / 2;
  const length = Math.abs(y2 - y1);
  let s = "";
  s += line("COTA", dx, y1, dx, y2);
  s += line("COTA", x, y1, dx, y1);
  s += line("COTA", x, y2, dx, y2);
  s += line("COTA", dx - DIM_TICK, y1 - DIM_TICK, dx + DIM_TICK, y1 + DIM_TICK);
  s += line("COTA", dx - DIM_TICK, y2 - DIM_TICK, dx + DIM_TICK, y2 + DIM_TICK);
  s += text("COTA", dx + 5, midY, DIM_TEXT_HEIGHT, `${length.toFixed(0)}`, 90);
  return s;
}

// ---------------------------------------------------------------------------
// DXF section builders
// ---------------------------------------------------------------------------

function buildHeader(): string {
  let s = "";
  s += gc(0, "SECTION");
  s += gc(2, "HEADER");
  // DXF version
  s += gc(9, "$ACADVER");
  s += gc(1, "AC1015"); // AutoCAD 2000
  // Units: millimeters
  s += gc(9, "$INSUNITS");
  s += gc(70, 4);
  // Measurement: metric
  s += gc(9, "$MEASUREMENT");
  s += gc(70, 1);
  s += gc(0, "ENDSEC");
  return s;
}

function buildTables(): string {
  let s = "";
  s += gc(0, "SECTION");
  s += gc(2, "TABLES");

  // LAYER table
  s += gc(0, "TABLE");
  s += gc(2, "LAYER");
  s += gc(70, LAYERS.length);

  for (const layer of LAYERS) {
    s += gc(0, "LAYER");
    s += gc(2, layer.name);
    s += gc(70, 0); // not frozen, not locked
    s += gc(62, layer.color);
    s += gc(6, "CONTINUOUS");
  }

  s += gc(0, "ENDTAB");
  s += gc(0, "ENDSEC");
  return s;
}

// ---------------------------------------------------------------------------
// Entity generation from engine results
// ---------------------------------------------------------------------------

/**
 * Draw nesting sheets: sheet outlines, placed pieces, drilling points,
 * labels, and dimension lines.
 */
function buildNestingEntities(sheets: Sheet[]): string {
  let s = "";
  let sheetOffsetX = 0;

  for (const sheet of sheets) {
    const sheetW = sheet.width || STANDARD_SHEET_WIDTH;
    const sheetH = sheet.height || STANDARD_SHEET_HEIGHT;

    // --- CHAPA layer: sheet outline ---
    s += lwPolylineRect("CHAPA", sheetOffsetX, 0, sheetW, sheetH);

    // Sheet label
    s += text(
      "ETIQUETAS",
      sheetOffsetX + 10,
      sheetH + 20,
      LABEL_HEIGHT,
      `Chapa #${sheet.id} - ${sheet.material} (${sheetW}x${sheetH}) Sobra: ${sheet.waste.toFixed(1)}%`,
    );

    // Sheet dimensions
    s += dimensionH(sheetOffsetX, 0, sheetOffsetX + sheetW, -DIM_OFFSET);
    s += dimensionV(sheetOffsetX, 0, sheetH, -DIM_OFFSET);

    // --- CORTE_EXTERNO layer: placed pieces ---
    for (const item of sheet.items) {
      const px = sheetOffsetX + item.x;
      const py = item.y;
      const pw = item.rotated ? item.height : item.width;
      const ph = item.rotated ? item.width : item.height;

      s += lwPolylineRect("CORTE_EXTERNO", px, py, pw, ph);

      // Piece dimensions
      s += dimensionH(px, py, px + pw, -DIM_OFFSET * 0.5);
      s += dimensionV(px, py, py + ph, -DIM_OFFSET * 0.5);

      // --- ETIQUETAS layer: piece label ---
      const labelLines: string[] = [
        item.partName,
        item.moduleName,
        `${item.width}x${item.height}${item.rotated ? " ROT" : ""}`,
        item.grainDirection !== "none" ? `Veio: ${item.grainDirection}` : "",
      ].filter(Boolean);

      const labelX = px + 5;
      let labelY = py + ph - LABEL_HEIGHT - 5;

      for (const ln of labelLines) {
        if (labelY < py + 5) break;
        s += text("ETIQUETAS", labelX, labelY, LABEL_HEIGHT * 0.6, ln);
        labelY -= LABEL_HEIGHT * 0.8;
      }
    }

    sheetOffsetX += sheetW + SHEET_GAP;
  }

  return s;
}

/**
 * Draw drilling points from cutList items.
 * Each piece in the nesting has an associated cutList item that may have
 * drilling points. We map drilling points from piece-local coords to sheet
 * coords.
 */
function buildDrillingEntities(
  sheets: Sheet[],
  modules: BlueprintModule[],
): string {
  let s = "";

  // Build a lookup: piece name -> CutListItem
  const cutMap = new Map<string, CutListItem>();
  for (const mod of modules) {
    for (const cut of mod.cutList) {
      cutMap.set(cut.piece, cut);
    }
  }

  let sheetOffsetX = 0;

  for (const sheet of sheets) {
    const sheetW = sheet.width || STANDARD_SHEET_WIDTH;

    for (const item of sheet.items) {
      const cut = cutMap.get(item.partName);
      if (!cut?.drillingPoints?.length) continue;

      const px = sheetOffsetX + item.x;
      const py = item.y;

      for (const dp of cut.drillingPoints) {
        // Transform piece-local drilling point to sheet coords.
        // If the piece is rotated, swap x/y in the local frame.
        let dx: number;
        let dy: number;
        if (item.rotated) {
          dx = px + dp.y;
          dy = py + dp.x;
        } else {
          dx = px + dp.x;
          dy = py + dp.y;
        }

        const radius = dp.diameter / 2;
        s += circle("FURACAO", dx, dy, radius);

        // Small label with diameter and depth
        s += text(
          "FURACAO",
          dx + radius + 3,
          dy + 3,
          DIM_TEXT_HEIGHT * 0.7,
          `D${dp.diameter} P${dp.depth} ${dp.type}`,
        );
      }
    }

    sheetOffsetX += sheetW + SHEET_GAP;
  }

  return s;
}

/**
 * Draw module outlines in elevation view.
 * Modules are placed below the nesting area (negative Y) so they
 * do not overlap with cutting sheets.
 */
function buildModuleEntities(
  modules: BlueprintModule[],
  baseY: number,
): string {
  let s = "";

  const moduleBaseY = baseY - 300; // gap between nesting and modules

  for (const mod of modules) {
    const mx = mod.position.x;
    const my = moduleBaseY - mod.position.y;

    // Elevation view: width x height
    s += lwPolylineRect("MODULO", mx, my - mod.height, mod.width, mod.height);

    // Module label
    s += text(
      "ETIQUETAS",
      mx + 5,
      my + 20,
      LABEL_HEIGHT,
      `${mod.name} (${mod.moduleId})`,
    );
    s += text(
      "ETIQUETAS",
      mx + 5,
      my + 20 + LABEL_HEIGHT * 1.2,
      LABEL_HEIGHT * 0.7,
      `${mod.width}x${mod.height}x${mod.depth}mm`,
    );

    // Module dimensions
    s += dimensionH(mx, my - mod.height, mx + mod.width, -DIM_OFFSET);
    s += dimensionV(mx, my - mod.height, my, -DIM_OFFSET);

    // Draw individual pieces from cutList inside the module outline
    let pieceY = my - mod.height + 10;
    for (const cut of mod.cutList) {
      for (let q = 0; q < cut.quantity; q++) {
        // Small rectangle representing cut list piece (symbolic, stacked)
        const pieceW = Math.min(cut.rawWidth * 0.15, mod.width - 20);
        const pieceH = Math.min(cut.rawHeight * 0.15, 40);
        s += lwPolylineRect(
          "CORTE_EXTERNO",
          mx + 10,
          pieceY,
          pieceW,
          pieceH,
        );
        s += text(
          "ETIQUETAS",
          mx + 15,
          pieceY + 3,
          DIM_TEXT_HEIGHT * 0.6,
          `${cut.piece} ${cut.measures} ${cut.material}`,
        );
        pieceY += pieceH + 5;
        if (pieceY > my - 10) break;
      }
      if (pieceY > my - 10) break;
    }

    // Notes
    if (mod.notes.length > 0) {
      let noteY = my + 20 + LABEL_HEIGHT * 2.5;
      for (const note of mod.notes) {
        s += text("ETIQUETAS", mx + 5, noteY, DIM_TEXT_HEIGHT * 0.6, note);
        noteY += DIM_TEXT_HEIGHT;
      }
    }
  }

  return s;
}

/**
 * Build a summary/title block at the top-left of the drawing.
 */
function buildTitleBlock(briefing: ParsedBriefing, results: EngineResults): string {
  let s = "";
  const x = 0;
  const y = -400; // above nesting area after module section
  const lh = LABEL_HEIGHT * 1.2;

  const lines: string[] = [
    `SOMA ID - Plano de Corte e Montagem`,
    `Cliente: ${briefing.client.name}`,
    `Projeto: ${briefing.project.type} | Designer: ${briefing.project.designer}`,
    `Data entrada: ${briefing.project.date_in} | Entrega: ${briefing.project.date_due}`,
    `Modulos: ${results.summary.total_modules} | Pecas: ${results.summary.total_parts} | Chapas: ${results.summary.total_sheets}`,
    `Eficiencia: ${results.summary.efficiency_percent.toFixed(1)}% | Conflitos criticos: ${results.summary.critical_conflicts}`,
    `Materiais: ${results.blueprint.materials.mdfColor} / ${results.blueprint.materials.internalColor} (${results.blueprint.materials.thickness}mm)`,
  ];

  // Title block border
  const blockW = 1200;
  const blockH = lines.length * lh + 20;
  s += lwPolylineRect("ETIQUETAS", x, y, blockW, blockH);

  let ty = y + blockH - lh;
  for (const ln of lines) {
    s += text("ETIQUETAS", x + 10, ty, LABEL_HEIGHT * 0.8, ln);
    ty -= lh;
  }

  return s;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a complete ASCII DXF file as a Buffer.
 *
 * The DXF contains:
 * - Nesting sheets with piece outlines, drilling points, labels, and dimensions
 * - Module elevation views with cut list details
 * - Title block with project summary
 */
export function generateDxfBuffer(
  briefing: ParsedBriefing,
  results: EngineResults,
): Buffer {
  const modules: BlueprintModule[] = [
    ...results.blueprint.mainWall.modules,
    ...(results.blueprint.sideWall?.modules ?? []),
  ];

  // Calculate the lowest Y used by nesting (nesting starts at Y=0 going up)
  let maxNestingY = STANDARD_SHEET_HEIGHT;
  for (const sheet of results.nesting.sheets) {
    const h = sheet.height || STANDARD_SHEET_HEIGHT;
    if (h > maxNestingY) maxNestingY = h;
  }

  // --- Assemble DXF content ---
  let dxf = "";

  // HEADER section
  dxf += buildHeader();

  // TABLES section (layers)
  dxf += buildTables();

  // ENTITIES section
  dxf += gc(0, "SECTION");
  dxf += gc(2, "ENTITIES");

  // Title block (placed below the nesting area)
  dxf += buildTitleBlock(briefing, results);

  // Nesting: sheet outlines + placed pieces + labels + dimensions
  dxf += buildNestingEntities(results.nesting.sheets);

  // Drilling points mapped onto nesting sheets
  dxf += buildDrillingEntities(results.nesting.sheets, modules);

  // Module elevation views below the nesting area
  const moduleBaseY = -(maxNestingY + 200);
  dxf += buildModuleEntities(modules, moduleBaseY);

  dxf += gc(0, "ENDSEC");

  // EOF
  dxf += gc(0, "EOF");

  return Buffer.from(dxf, "utf-8");
}
