/**
 * html-report.ts
 * Generates a standalone multi-prancha HTML technical report with SVG drawings.
 * Zero external dependencies — all CSS inline, print-friendly.
 * Professional industrial carpentry documentation (Promob/CAD style).
 */

import type { EngineResults, BlueprintModule, Sheet, InterferenceConflict } from "./engine-bridge.js";
import type { ParsedBriefing } from "../types.js";

/* ============================================================
   Constants
   ============================================================ */
const GOLD = "#c9a84c";
const DIM_RED = "#cc0000";
const HDR_BG = "#333333";
const HDR_FG = "#ffffff";
const STROKE = "#333333";
const LIGHT_FILL = "#f5f5f5";

const MOD_FILLS: Record<string, string> = {
  base: "#FAFAFA",
  upper: "#F0F0F0",
  freestanding: "#F0F5FA",
  island: "#F5F2ED",
  vanity: "#F0F5F0",
  gun_safe: "#F0EDED",
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
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

/** Format session ID into project number SOMA-XXXX-XXXX-XXX */
function formatProjectNumber(sessionId: string): string {
  const clean = sessionId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const p1 = clean.substring(0, 4) || "0000";
  const p2 = clean.substring(4, 8) || "0000";
  const p3 = clean.substring(8, 11) || "000";
  return `SOMA-${p1}-${p2}-${p3}`;
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
    <pattern id="${prefix}hatchPattern" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#ccc" stroke-width="0.5"/>
    </pattern>
    <pattern id="${prefix}wasteHatch" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="10" stroke="#e0d0d0" stroke-width="0.7"/>
    </pattern>
  </defs>`;
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
      <tr><td colspan="2" class="carimbo-header">SOMA-ID</td></tr>
      <tr><td colspan="2" class="carimbo-sub">Sistema de Marcenaria Inteligente</td></tr>
      <tr><td class="label-col">Cliente</td><td>${esc(clientName)}</td></tr>
      <tr><td class="label-col">Ambiente</td><td>${esc(projectType)}</td></tr>
      <tr><td class="label-col">Designer</td><td>${esc(designer)}</td></tr>
      <tr><td class="label-col">Projetista</td><td>SOMA-ID Engine</td></tr>
      <tr><td class="label-col">Escala</td><td>${esc(scale)}</td></tr>
      <tr><td class="label-col">Formato</td><td>${esc(format)}</td></tr>
      <tr><td class="label-col">Prancha</td><td>${String(pranchaNum).padStart(2, "0")} de ${String(totalPranchas).padStart(2, "0")}</td></tr>
      <tr><td class="label-col">Revisao</td><td>RV.01</td></tr>
      <tr><td class="label-col">Data</td><td>${today()}</td></tr>
      <tr><td class="label-col">Projeto</td><td style="font-weight:700;letter-spacing:0.04em">${esc(projectNumber)}</td></tr>
    </table>
  </div>`;
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
  const padL = 100, padT = 80, padR = 100, padB = 100;
  const vbW = sW + padL + padR;
  const vbH = sD + padT + padB;

  // Calculate auto-scale text
  const autoScaleRatio = Math.ceil(Math.max(roomW, roomD) / 400);
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

    // Helper: draw a zone rectangle with label + hachura
    const drawZone = (zx: number, zy: number, zw: number, zh: number, z: typeof zones[0], colorIdx: number) => {
      const color = ZONE_COLORS[colorIdx % ZONE_COLORS.length];
      svg += `<rect x="${zx}" y="${zy}" width="${zw}" height="${zh}" fill="${color}" stroke="${STROKE}" stroke-width="1" rx="2"/>`;
      // Diagonal hachura for wall-mounted modules
      if ((z.wall || "").toLowerCase() !== "freestanding") {
        svg += `<rect x="${zx + 1}" y="${zy + 1}" width="${zw - 2}" height="${zh - 2}" fill="url(#fp_hatchPattern)" opacity="0.25" rx="1"/>`;
      }
      const fSize = Math.max(7, Math.min(12, zw / 10, zh / 3));
      svg += `<text x="${zx + zw / 2}" y="${zy + zh / 2 - fSize * 0.2}" text-anchor="middle" font-size="${fSize}" font-weight="bold" fill="${STROKE}" font-family="Arial,sans-serif">${esc(z.name)}</text>`;
      if (z.dimensions) {
        svg += `<text x="${zx + zw / 2}" y="${zy + zh / 2 + fSize * 0.8}" text-anchor="middle" font-size="${fSize * 0.65}" fill="#666" font-family="Arial,sans-serif">${(z.dimensions.width_m * 1000).toFixed(0)}x${(z.dimensions.depth_m * 1000).toFixed(0)}</text>`;
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
        drawZone(padL + sW - zw - 4, cy, zw, zh, z, colorIdx++);
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
        drawZone(padL + 4, cy, zw, zh, z, colorIdx++);
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
  const padL = 100, padR = 80, padT = 40, padB = 100;
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

    // Module body
    svg += `<rect x="${mx}" y="${my}" width="${mod.width}" height="${mod.height}" fill="${fill}" stroke="#333" stroke-width="${ss(2)}"/>`;

    // 18mm side panels (visible thickness like in Promob)
    svg += `<line x1="${mx}" y1="${my}" x2="${mx}" y2="${my + mod.height}" stroke="#555" stroke-width="${ss(1.5)}"/>`;
    svg += `<line x1="${mx + mod.width}" y1="${my}" x2="${mx + mod.width}" y2="${my + mod.height}" stroke="#555" stroke-width="${ss(1.5)}"/>`;

    // Interior details based on module type
    const modId = (mod.moduleId || "").toLowerCase();
    const modNotes = (mod.notes || []).join(" ").toLowerCase();
    const insetX = mx + 18; // 18mm offset for side panel thickness
    const insetW = mod.width - 36;

    if (mt === "upper") {
      // Maleiro / luggage — open space with silhouette of suitcases
      svg += `<rect x="${insetX}" y="${my + 4}" width="${insetW}" height="${mod.height - 8}" fill="none" stroke="#444" stroke-width="${ss(1)}" stroke-dasharray="${ss(6)},${ss(3)}"/>`;
      const suitW = Math.min(insetW * 0.35, 120);
      const suitH = mod.height * 0.6;
      svg += `<rect x="${insetX + 15}" y="${my + mod.height - suitH - 10}" width="${suitW}" height="${suitH}" fill="none" stroke="#333" stroke-width="${ss(1.5)}" rx="5"/>`;
      svg += `<line x1="${insetX + 15 + suitW * 0.3}" y1="${my + mod.height - suitH - 10}" x2="${insetX + 15 + suitW * 0.7}" y2="${my + mod.height - suitH - 10}" stroke="#333" stroke-width="${ss(2)}"/>`;
      if (insetW > 300) {
        svg += `<rect x="${insetX + suitW + 35}" y="${my + mod.height - suitH * 0.7 - 10}" width="${suitW * 0.8}" height="${suitH * 0.7}" fill="none" stroke="#555" stroke-width="${ss(1)}" rx="4"/>`;
      }
      svg += `<text x="${mx + mod.width / 2}" y="${my + 25}" text-anchor="middle" font-size="${ss(12)}" font-weight="bold" fill="#333" font-family="Arial,sans-serif">MALEIRO</text>`;
    } else if (modId.includes("cabideiro")) {
      // Hanging bar — oval bar with supports + garment silhouettes
      const subtipo = modNotes.includes("long") ? "long" : modNotes.includes("short") ? "short" : "mixed";
      if (subtipo === "mixed" || subtipo === "long") {
        const barY = my + mod.height * 0.08;
        // Bar supports (brackets)
        svg += `<rect x="${insetX + 8}" y="${barY - 10}" width="${ss(18)}" height="${ss(18)}" fill="none" stroke="#333" stroke-width="${ss(1.5)}"/>`;
        svg += `<rect x="${insetX + insetW - 8 - ss(18)}" y="${barY - 10}" width="${ss(18)}" height="${ss(18)}" fill="none" stroke="#333" stroke-width="${ss(1.5)}"/>`;
        // Oval bar (thick, black)
        svg += `<line x1="${insetX + 30}" y1="${barY}" x2="${insetX + insetW - 30}" y2="${barY}" stroke="#222" stroke-width="${ss(5)}" stroke-linecap="round"/>`;
        // Hanging garments (V-shape hangers + body)
        const spacing = Math.max(ss(30), 35);
        for (let gx = insetX + 50; gx < insetX + insetW - 40; gx += spacing) {
          const gh = mod.height * (subtipo === "long" ? 0.65 : 0.45);
          // Hanger triangle
          svg += `<polyline points="${gx - 10},${barY + 5} ${gx},${barY - 5} ${gx + 10},${barY + 5}" fill="none" stroke="#333" stroke-width="${ss(1.5)}"/>`;
          // Garment body
          svg += `<line x1="${gx}" y1="${barY + 5}" x2="${gx}" y2="${barY + gh}" stroke="#555" stroke-width="${ss(1.5)}"/>`;
          svg += `<line x1="${gx - 12}" y1="${barY + gh}" x2="${gx + 12}" y2="${barY + gh}" stroke="#555" stroke-width="${ss(1.5)}"/>`;
        }
        svg += `<text x="${insetX + 8}" y="${barY + 30}" font-size="${ss(10)}" font-weight="bold" fill="${DIM_RED}" font-family="Arial,sans-serif">${Math.round(mod.height * 0.08)}mm</text>`;
      }
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
      // Shoe rack — inclined shelves (15°) with shoe outlines
      const isBoots = modNotes.includes("boot") || modId.includes("bota");
      const shelfCount = isBoots ? 5 : 8;
      const spacing = mod.height / (shelfCount + 1);
      for (let s = 1; s <= shelfCount; s++) {
        const sy = my + s * spacing;
        const tilt = ss(15);
        svg += `<line x1="${insetX}" y1="${sy + tilt}" x2="${insetX + insetW}" y2="${sy}" stroke="#333" stroke-width="${ss(2.5)}"/>`;
        // Shoe outlines on shelf
        if (s <= shelfCount - 1) {
          for (let sx = insetX + 15; sx < insetX + insetW - 25; sx += ss(40)) {
            const shoeH = isBoots ? spacing * 0.5 : spacing * 0.3;
            svg += `<ellipse cx="${sx + 15}" cy="${sy - shoeH / 2}" rx="${ss(14)}" ry="${shoeH / 2}" fill="none" stroke="#666" stroke-width="${ss(1)}"/>`;
          }
        }
      }
      svg += `<text x="${insetX + 8}" y="${my + 25}" font-size="${ss(11)}" font-weight="bold" fill="${DIM_RED}" font-family="Arial,sans-serif">${isBoots ? "BOTAS" : "SAPATOS"}</text>`;
    } else if (modId.includes("vitrine")) {
      // Glass shelves — dashed lines (glass) + LED strips + bag outlines
      const shelfCount = 5;
      const spacing = mod.height / (shelfCount + 1);
      for (let s = 1; s <= shelfCount; s++) {
        const sy = my + s * spacing;
        // Glass shelf (dashed, THICK blue)
        svg += `<line x1="${insetX}" y1="${sy}" x2="${insetX + insetW}" y2="${sy}" stroke="#2288AA" stroke-width="${ss(3)}" stroke-dasharray="${ss(12)},${ss(6)}"/>`;
        // LED strip (yellow, thick)
        svg += `<line x1="${insetX + 5}" y1="${sy - ss(5)}" x2="${insetX + insetW - 5}" y2="${sy - ss(5)}" stroke="#FFD700" stroke-width="${ss(3)}" opacity="0.7"/>`;
        // Bag silhouette
        if (s <= shelfCount - 1) {
          const bagW = Math.min(insetW * 0.3, 80);
          const bagH = spacing * 0.5;
          const bagX = insetX + insetW / 2 - bagW / 2;
          svg += `<rect x="${bagX}" y="${sy - bagH - 4}" width="${bagW}" height="${bagH}" fill="none" stroke="#666" stroke-width="${ss(1.2)}" rx="4"/>`;
          svg += `<path d="M${bagX + bagW * 0.3} ${sy - bagH - 4} Q${bagX + bagW / 2} ${sy - bagH - ss(12)} ${bagX + bagW * 0.7} ${sy - bagH - 4}" fill="none" stroke="#666" stroke-width="${ss(1)}"/>`;
        }
      }
      svg += `<text x="${mx + mod.width / 2}" y="${my + 25}" text-anchor="middle" font-size="${ss(12)}" font-weight="bold" fill="#2288AA" font-family="Arial,sans-serif">VIDRO + LED</text>`;
    } else if (modId.includes("gaveteiro") || modId.includes("ilha")) {
      // Drawers — stacked with visible handles (Promob style: thick black outlines)
      const drawerCount = Math.max(3, Math.min(6, Math.floor(mod.height / 150)));
      const margin = 12;
      const totalGap = (drawerCount - 1) * 6;
      const drawerH = (mod.height - margin * 2 - totalGap) / drawerCount;
      for (let d = 0; d < drawerCount; d++) {
        const dy = my + margin + d * (drawerH + 6);
        svg += `<rect x="${insetX}" y="${dy}" width="${insetW}" height="${drawerH}" fill="none" stroke="#333" stroke-width="${ss(2)}" rx="2"/>`;
        // Handle (horizontal bar, thick)
        const handleW = Math.min(insetW * 0.25, 50);
        svg += `<line x1="${mx + mod.width / 2 - handleW}" y1="${dy + drawerH / 2}" x2="${mx + mod.width / 2 + handleW}" y2="${dy + drawerH / 2}" stroke="#222" stroke-width="${ss(3)}" stroke-linecap="round"/>`;
      }
    } else if (modId.includes("bancada") || modId.includes("vanity")) {
      // Vanity — mirror with X, countertop, drawers
      const mirrorH = mod.height * 0.35;
      const mirrorY = my + mod.height * 0.1;
      svg += `<rect x="${insetX + 8}" y="${mirrorY}" width="${insetW - 16}" height="${mirrorH}" fill="#E8F4F8" stroke="#2288AA" stroke-width="${ss(2.5)}"/>`;
      svg += `<line x1="${insetX + 8}" y1="${mirrorY}" x2="${insetX + insetW - 8}" y2="${mirrorY + mirrorH}" stroke="#77AABB" stroke-width="${ss(1.5)}"/>`;
      svg += `<line x1="${insetX + insetW - 8}" y1="${mirrorY}" x2="${insetX + 8}" y2="${mirrorY + mirrorH}" stroke="#77AABB" stroke-width="${ss(1.5)}"/>`;
      svg += `<text x="${mx + mod.width / 2}" y="${mirrorY + mirrorH / 2 + 5}" text-anchor="middle" font-size="${ss(12)}" font-weight="bold" fill="#2288AA" font-family="Arial,sans-serif">ESPELHO</text>`;
      const counterY = mirrorY + mirrorH + mod.height * 0.05;
      svg += `<line x1="${mx}" y1="${counterY}" x2="${mx + mod.width}" y2="${counterY}" stroke="#222" stroke-width="${ss(5)}"/>`;
      svg += `<text x="${mx + mod.width / 2}" y="${counterY - ss(6)}" text-anchor="middle" font-size="${ss(9)}" fill="#444" font-family="Arial,sans-serif">BANCADA 850mm</text>`;
      const drawSpace = my + mod.height - counterY - 15;
      const numDraw = 3;
      const dh = drawSpace / numDraw;
      for (let d = 0; d < numDraw; d++) {
        const dy = counterY + 8 + d * dh;
        svg += `<rect x="${insetX}" y="${dy}" width="${insetW}" height="${dh - 6}" fill="none" stroke="#333" stroke-width="${ss(1.8)}" rx="2"/>`;
        svg += `<line x1="${mx + mod.width / 2 - 15}" y1="${dy + dh / 2 - 3}" x2="${mx + mod.width / 2 + 15}" y2="${dy + dh / 2 - 3}" stroke="#222" stroke-width="${ss(2.5)}" stroke-linecap="round"/>`;
      }
    } else if (modId.includes("armas")) {
      // Gun safe — mirror door (diagonal hatch) thick strokes
      svg += `<rect x="${insetX + 3}" y="${my + 6}" width="${insetW - 6}" height="${mod.height - 12}" fill="#E8F0F0" stroke="#2288AA" stroke-width="${ss(2)}"/>`;
      for (let hy = my + 6; hy < my + mod.height - 6; hy += ss(20)) {
        svg += `<line x1="${insetX + 3}" y1="${hy}" x2="${insetX + insetW - 3}" y2="${hy + ss(20)}" stroke="#99BBCC" stroke-width="${ss(1)}"/>`;
      }
      svg += `<line x1="${insetX + 8}" y1="${my + 12}" x2="${insetX + insetW - 8}" y2="${my + mod.height - 12}" stroke="#77AACC" stroke-width="${ss(1.5)}"/>`;
      svg += `<line x1="${insetX + insetW - 8}" y1="${my + 12}" x2="${insetX + 8}" y2="${my + mod.height - 12}" stroke="#77AACC" stroke-width="${ss(1.5)}"/>`;
      svg += `<text x="${mx + mod.width / 2}" y="${my + mod.height / 2}" text-anchor="middle" font-size="${ss(12)}" font-weight="bold" fill="#2288AA" font-family="Arial,sans-serif">PORTA ESPELHO</text>`;
      svg += `<text x="${mx + mod.width / 2}" y="${my + mod.height / 2 + ss(18)}" text-anchor="middle" font-size="${ss(9)}" fill="#444" font-family="Arial,sans-serif">LED + SENSOR</text>`;
      svg += `<circle cx="${insetX + insetW - 15}" cy="${my + mod.height / 2}" r="${ss(6)}" fill="none" stroke="#333" stroke-width="${ss(2)}"/>`;
    } else if (mod.height > 600) {
      // Generic fallback — shelf divisions
      const divisions = Math.floor(mod.height / 400);
      for (let d = 1; d < divisions; d++) {
        const dy = my + (mod.height / divisions) * d;
        svg += `<line x1="${insetX}" y1="${dy}" x2="${insetX + insetW}" y2="${dy}" stroke="#444" stroke-width="${ss(2)}"/>`;
      }
    }

    // Door fronts: dashed arc showing swing direction + puxador marks
    if (mt !== "upper" && !modId.includes("prateleira") && !modId.includes("sapateira")) {
      // Door opening arc (dashed) — left-hinged door
      const doorArcR = Math.min(mod.width * 0.4, mod.height * 0.3);
      if (mod.width > 200) {
        // Two doors (split)
        const halfW = mod.width / 2;
        svg += `<path d="M${mx + halfW} ${my + mod.height * 0.15} A${halfW * 0.7} ${halfW * 0.7} 0 0 0 ${mx + halfW - halfW * 0.5} ${my + mod.height * 0.15 + halfW * 0.5}" fill="none" stroke="${STROKE}" stroke-width="0.5" stroke-dasharray="3,3"/>`;
        svg += `<path d="M${mx + halfW} ${my + mod.height * 0.15} A${halfW * 0.7} ${halfW * 0.7} 0 0 1 ${mx + halfW + halfW * 0.5} ${my + mod.height * 0.15 + halfW * 0.5}" fill="none" stroke="${STROKE}" stroke-width="0.5" stroke-dasharray="3,3"/>`;
        // Puxador marks (small rectangles)
        svg += `<rect x="${mx + halfW - 14}" y="${my + mod.height * 0.5 - 4}" width="8" height="8" fill="#888" stroke="none" rx="1"/>`;
        svg += `<rect x="${mx + halfW + 6}" y="${my + mod.height * 0.5 - 4}" width="8" height="8" fill="#888" stroke="none" rx="1"/>`;
      } else if (mod.width > 100) {
        // Single door
        svg += `<path d="M${mx} ${my + mod.height * 0.15} A${mod.width * 0.7} ${mod.width * 0.7} 0 0 1 ${mx + mod.width * 0.5} ${my + mod.height * 0.15 + mod.width * 0.5}" fill="none" stroke="${STROKE}" stroke-width="0.5" stroke-dasharray="3,3"/>`;
        // Puxador mark
        svg += `<rect x="${mx + mod.width - 14}" y="${my + mod.height * 0.5 - 4}" width="8" height="8" fill="#888" stroke="none" rx="1"/>`;
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

    // Level 1 COTAS (CABINETS): individual module widths
    const dimY1 = padT + wallH + 15;
    svg += dimLine(mx, dimY1, mx + mod.width, dimY1, `${mod.width}`, 10, `${prefix}_`);

    // Module height dimension (right side for tall modules)
    if (mod.height > 800) {
      svg += dimLine(mx + mod.width + 8, my, mx + mod.width + 8, my + mod.height, `${mod.height}`, 9, `${prefix}_`);
    }
  }

  // Level 2 COTAS (ARCHITECTURAL): group widths
  const dimY2 = padT + wallH + 38;
  for (const grp of moduleGroups) {
    if (grp.endX - grp.startX > 50) {
      svg += dimLine(grp.startX, dimY2, grp.endX, dimY2, `${Math.round(grp.endX - grp.startX - padL + (modules[0]?.position?.x || 0))}`, 10, `${prefix}_`);
    }
  }

  // Level 3 COTAS (OVERALL): total wall width
  const dimY3 = padT + wallH + 58;
  svg += dimLine(padL, dimY3, padL + wallW, dimY3, `${wallW} mm`, 14, `${prefix}_`);

  // Overall wall height dimension (left side)
  svg += dimLine(padL - 45, padT, padL - 45, padT + wallH, `${wallH} mm`, 13, `${prefix}_`);

  // Vertical cotas on right side: individual module section heights
  if (modules.length > 0) {
    const rightMod = modules.reduce((a, b) => ((a.position?.x || 0) + a.width > (b.position?.x || 0) + b.width) ? a : b);
    const rmx = padL + (rightMod.position?.x || 0) + rightMod.width;
    const rmy = padT + wallH - (rightMod.position?.y || 0) - rightMod.height;
    // Full wall height on far right
    svg += dimLine(padL + wallW + 20, padT, padL + wallW + 20, padT + wallH, `${wallH}`, 11, `${prefix}_`);
    // Module section height
    if (rightMod.position?.y && rightMod.position.y > 0) {
      svg += dimLine(padL + wallW + 40, padT + wallH - rightMod.position.y - rightMod.height, padL + wallW + 40, padT + wallH - rightMod.position.y, `${rightMod.height}`, 9, `${prefix}_`);
      svg += dimLine(padL + wallW + 40, padT + wallH - rightMod.position.y, padL + wallW + 40, padT + wallH, `${rightMod.position.y}`, 9, `${prefix}_`);
    }
  }

  // Material color swatches
  const materials = new Set(modules.map(m => m.cutList?.[0]?.material || "MDF 18mm"));
  let swatchX = padL;
  for (const mat of materials) {
    svg += `<rect x="${swatchX}" y="${padT - 25}" width="12" height="12" fill="${getColorForMaterial(mat)}" stroke="${STROKE}" stroke-width="0.5"/>`;
    svg += `<text x="${swatchX + 16}" y="${padT - 15}" font-size="9" fill="#666" font-family="Arial,sans-serif">${esc(mat)}</text>`;
    swatchX += 120;
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

  // Modules — interior only (no doors)
  for (const mod of modules) {
    const mx = padL + (mod.position?.x || 0);
    const my = padT + wallH - (mod.position?.y || 0) - mod.height;
    const modId = (mod.moduleId || "").toLowerCase();
    const modNotes = (mod.notes || []).join(" ").toLowerCase();
    const mt = modType(mod);
    const insetX = mx + 4;
    const insetW = mod.width - 8;

    // Module outline (dashed to indicate no doors)
    svg += `<rect x="${mx}" y="${my}" width="${mod.width}" height="${mod.height}" fill="#FAFAFA" stroke="#999" stroke-width="1" stroke-dasharray="4,2"/>`;

    if (modId.includes("prateleira") || (!modId.includes("cabideiro") && !modId.includes("sapateira") && !modId.includes("vitrine") && !modId.includes("gaveteiro") && !modId.includes("ilha") && !modId.includes("bancada") && !modId.includes("vanity") && !modId.includes("armas") && mt !== "upper" && mod.height > 600)) {
      // Prateleiras: horizontal lines with spacing cotated
      const shelfCount = Math.max(3, Math.min(8, Math.floor(mod.height / 350)));
      const spacing = mod.height / (shelfCount + 1);
      for (let s = 1; s <= shelfCount; s++) {
        const sy = my + s * spacing;
        svg += `<line x1="${insetX}" y1="${sy}" x2="${insetX + insetW}" y2="${sy}" stroke="#777" stroke-width="1.5"/>`;
        // Spacing cota on right
        if (s === 1) {
          svg += `<text x="${mx + mod.width - 5}" y="${my + spacing / 2 + 3}" text-anchor="end" font-size="7" fill="${DIM_RED}" font-family="Arial,sans-serif">${Math.round(spacing)}mm</text>`;
        }
      }
      svg += `<text x="${mx + mod.width / 2}" y="${my + 15}" text-anchor="middle" font-size="8" font-weight="bold" fill="#555" font-family="Arial,sans-serif">PRATELEIRAS</text>`;
    } else if (modId.includes("cabideiro")) {
      // Cabideiro: bar symbol + hanging garment silhouettes
      const barY = my + mod.height * 0.06;
      svg += `<line x1="${insetX + 8}" y1="${barY}" x2="${insetX + insetW - 8}" y2="${barY}" stroke="#666" stroke-width="3" stroke-linecap="round"/>`;
      svg += `<circle cx="${insetX + 8}" cy="${barY}" r="4" fill="#888" stroke="#666" stroke-width="0.5"/>`;
      svg += `<circle cx="${insetX + insetW - 8}" cy="${barY}" r="4" fill="#888" stroke="#666" stroke-width="0.5"/>`;
      // Garment silhouettes
      for (let gx = insetX + 20; gx < insetX + insetW - 15; gx += 22) {
        const gh = mod.height * 0.6;
        // Hanger triangle
        svg += `<path d="M${gx} ${barY} L${gx - 8} ${barY + 12} L${gx + 8} ${barY + 12} Z" fill="none" stroke="#bbb" stroke-width="0.7"/>`;
        // Garment body
        svg += `<rect x="${gx - 6}" y="${barY + 12}" width="12" height="${gh - 12}" fill="none" stroke="#bbb" stroke-width="0.5" rx="2"/>`;
      }
      svg += `<text x="${mx + mod.width / 2}" y="${my + mod.height - 10}" text-anchor="middle" font-size="8" font-weight="bold" fill="#555" font-family="Arial,sans-serif">CABIDEIRO</text>`;
      // Bar height cota
      svg += dimLine(mx - 8, my, mx - 8, barY, `${Math.round(mod.height * 0.06)}`, 7, `${prefix}_`);
    } else if (modId.includes("gaveteiro") || modId.includes("ilha")) {
      // Gavetas: stacked rectangles with labels
      const drawerCount = Math.max(3, Math.min(7, Math.floor(mod.height / 180)));
      const drawerH = (mod.height - 20) / drawerCount;
      for (let d = 0; d < drawerCount; d++) {
        const dy = my + 10 + d * drawerH;
        svg += `<rect x="${insetX}" y="${dy}" width="${insetW}" height="${drawerH - 5}" fill="#F5F0E8" stroke="#999" stroke-width="1" rx="1"/>`;
        svg += `<line x1="${mx + mod.width / 2 - 15}" y1="${dy + drawerH / 2 - 2}" x2="${mx + mod.width / 2 + 15}" y2="${dy + drawerH / 2 - 2}" stroke="#888" stroke-width="2" stroke-linecap="round"/>`;
        svg += `<text x="${mx + mod.width / 2}" y="${dy + drawerH / 2 + 8}" text-anchor="middle" font-size="7" fill="#888" font-family="Arial,sans-serif">Gaveta ${d + 1}</text>`;
        // Height cota for first drawer
        if (d === 0) {
          svg += `<text x="${mx + mod.width - 5}" y="${dy + drawerH / 2}" text-anchor="end" font-size="7" fill="${DIM_RED}" font-family="Arial,sans-serif">${Math.round(drawerH - 5)}mm</text>`;
        }
      }
      svg += `<text x="${mx + mod.width / 2}" y="${my + mod.height - 3}" text-anchor="middle" font-size="8" font-weight="bold" fill="#555" font-family="Arial,sans-serif">GAVETAS</text>`;
    } else if (modId.includes("sapateira")) {
      // Sapateira: inclined shelves with spacing
      const shelfCount = 8;
      const spacing = mod.height / (shelfCount + 1);
      for (let s = 1; s <= shelfCount; s++) {
        const sy = my + s * spacing;
        const tilt = 10;
        svg += `<line x1="${insetX}" y1="${sy + tilt}" x2="${insetX + insetW}" y2="${sy}" stroke="#777" stroke-width="1.2"/>`;
        // Shoe outline
        svg += `<ellipse cx="${insetX + insetW / 3}" cy="${sy + tilt * 0.5 - 2}" rx="12" ry="4" fill="none" stroke="#ccc" stroke-width="0.5"/>`;
        svg += `<ellipse cx="${insetX + insetW * 2 / 3}" cy="${sy + tilt * 0.3 - 2}" rx="12" ry="4" fill="none" stroke="#ccc" stroke-width="0.5"/>`;
      }
      // Spacing cota
      if (shelfCount > 1) {
        svg += `<text x="${mx + mod.width - 5}" y="${my + spacing + 5}" text-anchor="end" font-size="7" fill="${DIM_RED}" font-family="Arial,sans-serif">${Math.round(spacing)}mm</text>`;
      }
      svg += `<text x="${mx + mod.width / 2}" y="${my + 15}" text-anchor="middle" font-size="8" font-weight="bold" fill="#555" font-family="Arial,sans-serif">SAPATEIRA</text>`;
    } else if (modId.includes("vitrine")) {
      // Vitrine: glass shelves (dashed) + LED strips
      const shelfCount = 5;
      const spacing = mod.height / (shelfCount + 1);
      for (let s = 1; s <= shelfCount; s++) {
        const sy = my + s * spacing;
        svg += `<line x1="${insetX}" y1="${sy}" x2="${insetX + insetW}" y2="${sy}" stroke="#6AADCC" stroke-width="1.2" stroke-dasharray="6,3"/>`;
        // LED strip
        svg += `<line x1="${insetX + 2}" y1="${sy - 3}" x2="${insetX + insetW - 2}" y2="${sy - 3}" stroke="#FFE082" stroke-width="2" opacity="0.8"/>`;
        svg += `<text x="${mx + mod.width - 5}" y="${sy - 5}" text-anchor="end" font-size="5" fill="#C90" font-family="Arial,sans-serif">LED</text>`;
      }
      svg += `<text x="${mx + mod.width / 2}" y="${my + 15}" text-anchor="middle" font-size="8" font-weight="bold" fill="#6AADCC" font-family="Arial,sans-serif">VITRINE VIDRO + LED</text>`;
      // Spacing cota
      svg += `<text x="${mx + mod.width - 5}" y="${my + spacing / 2 + 3}" text-anchor="end" font-size="7" fill="${DIM_RED}" font-family="Arial,sans-serif">${Math.round(spacing)}mm</text>`;
    } else if (modId.includes("armas")) {
      // Gun safe interior: shelves + LED + cases at bottom
      const shelfCount = 5;
      const shelfH = (mod.height * 0.7) / shelfCount;
      for (let s = 0; s < shelfCount; s++) {
        const sy = my + 15 + s * shelfH;
        svg += `<line x1="${insetX}" y1="${sy}" x2="${insetX + insetW}" y2="${sy}" stroke="#999" stroke-width="1.5"/>`;
        // LED indicator
        svg += `<line x1="${insetX + 2}" y1="${sy - 2}" x2="${insetX + insetW - 2}" y2="${sy - 2}" stroke="#FFE082" stroke-width="1.5" opacity="0.7" stroke-dasharray="2,2"/>`;
        svg += `<text x="${mx + mod.width - 5}" y="${sy - 4}" text-anchor="end" font-size="5" fill="#C90" font-family="Arial,sans-serif">LED</text>`;
      }
      // Cases at bottom
      const caseY = my + mod.height * 0.75;
      svg += `<rect x="${insetX + 5}" y="${caseY}" width="${insetW - 10}" height="${mod.height * 0.2}" fill="#E8E0D0" stroke="#999" stroke-width="0.8" rx="2"/>`;
      svg += `<text x="${mx + mod.width / 2}" y="${caseY + mod.height * 0.1 + 3}" text-anchor="middle" font-size="7" fill="#666" font-family="Arial,sans-serif">CASES</text>`;
      svg += `<text x="${mx + mod.width / 2}" y="${my + 12}" text-anchor="middle" font-size="8" font-weight="bold" fill="#555" font-family="Arial,sans-serif">INTERIOR ARMAS</text>`;
    } else if (mt === "upper") {
      // Maleiro interior — open storage
      svg += `<text x="${mx + mod.width / 2}" y="${my + mod.height / 2 + 3}" text-anchor="middle" font-size="8" fill="#999" font-family="Arial,sans-serif">MALEIRO (aberto)</text>`;
      // Luggage silhouettes
      const bagW = Math.min(mod.width * 0.3, 60);
      const bagH = mod.height * 0.6;
      svg += `<rect x="${mx + 10}" y="${my + mod.height - bagH - 5}" width="${bagW}" height="${bagH}" fill="none" stroke="#ccc" stroke-width="0.7" rx="4"/>`;
      if (mod.width > 200) {
        svg += `<rect x="${mx + bagW + 20}" y="${my + mod.height - bagH * 0.8 - 5}" width="${bagW * 0.8}" height="${bagH * 0.8}" fill="none" stroke="#ccc" stroke-width="0.7" rx="4"/>`;
      }
    } else if (modId.includes("bancada") || modId.includes("vanity")) {
      // Vanity interior: mirror + counter + drawers
      const mirrorH = mod.height * 0.3;
      const mirrorY = my + mod.height * 0.12;
      svg += `<rect x="${insetX + 8}" y="${mirrorY}" width="${insetW - 16}" height="${mirrorH}" fill="#E8F4F8" stroke="#8AC" stroke-width="1"/>`;
      svg += `<text x="${mx + mod.width / 2}" y="${mirrorY + mirrorH / 2 + 3}" text-anchor="middle" font-size="8" fill="#6AA" font-family="Arial,sans-serif">ESPELHO</text>`;
      // Counter
      const counterY = mirrorY + mirrorH + mod.height * 0.06;
      svg += `<rect x="${mx}" y="${counterY}" width="${mod.width}" height="6" fill="#D8D0C0" stroke="${STROKE}" stroke-width="0.8"/>`;
      // Open drawers below
      const drawStart = counterY + 10;
      const drawSpace = my + mod.height - drawStart - 5;
      const numDraw = 3;
      const dh = drawSpace / numDraw;
      for (let d = 0; d < numDraw; d++) {
        const dy = drawStart + d * dh;
        svg += `<rect x="${insetX}" y="${dy}" width="${insetW}" height="${dh - 4}" fill="#F5F0E8" stroke="#999" stroke-width="0.8" rx="1"/>`;
        svg += `<line x1="${mx + mod.width / 2 - 10}" y1="${dy + dh / 2 - 2}" x2="${mx + mod.width / 2 + 10}" y2="${dy + dh / 2 - 2}" stroke="#888" stroke-width="1.5" stroke-linecap="round"/>`;
      }
    }

    // Module label
    const fontSize = Math.max(8, Math.min(12, mod.width / 12));
    svg += `<text x="${mx + mod.width / 2}" y="${my - 5}" text-anchor="middle" font-size="${fontSize}" font-weight="bold" fill="#333" font-family="Arial,sans-serif">${esc(mod.name)}</text>`;
  }

  // Overall dimension
  svg += dimLine(padL, padT + wallH + 15, padL + wallW, padT + wallH + 15, `${wallW} mm`, 12, `${prefix}_`);

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

  // Walls array for elevations — dynamic
  const walls: Array<{ label: string; title: string; totalWidth: number; modules: BlueprintModule[] }> = [];
  if (bp.mainWall.modules.length > 0) {
    walls.push({ label: "A", title: "ELEVACAO PAREDE A", totalWidth: bp.mainWall.totalWidth, modules: bp.mainWall.modules });
  }
  if (bp.sideWall && bp.sideWall.modules.length > 0) {
    walls.push({ label: "B", title: "ELEVACAO PAREDE B", totalWidth: bp.sideWall.totalWidth, modules: bp.sideWall.modules });
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
.carimbo{border:2px solid #333;font-size:10px;margin-top:20px;width:380px;float:right;clear:both}
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
      html += `
<!-- ================================================================ -->
<!-- PRANCHA ${String(pW).padStart(2, "0")} — ${wall.title}                                  -->
<!-- ================================================================ -->
<div class="prancha" id="prancha-${String(pW).padStart(2, "0")}">
  ${pH(pW, wall.title, "A2 Landscape")}
  <p style="font-size:11px;color:#666;margin-bottom:8px">Vista frontal com portas. Materiais: ${esc(bp.materials.mdfColor || "-")} | Espessura: ${bp.materials.thickness || 18}mm</p>

  <h3 style="font-size:13px;font-weight:700;margin:8px 0 4px;color:#333">Vista COM Portas</h3>
  <div class="svg-wrap">
    ${renderWallSvg(wall.title, wall.totalWidth, wall.modules, 2400, `w${String(pW).padStart(2, "0")}`)}
  </div>

  <h3 style="font-size:13px;font-weight:700;margin:16px 0 4px;color:#333">Vista SEM Portas (Interior)</h3>
  <div class="svg-wrap">
    ${renderWallInteriorSvg(wall.title, wall.totalWidth, wall.modules, 2400, `wi${String(pW).padStart(2, "0")}`)}
  </div>

  <table>
    <tr><th>Modulo</th><th>Tipo</th><th>Largura mm</th><th>Altura mm</th><th>Profund. mm</th><th>Posicao X</th><th>Pecas</th><th>Notas</th></tr>
    ${wall.modules.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(m.type)}</td><td>${m.width}</td><td>${m.height}</td><td>${m.depth}</td><td>${m.position?.x || 0}</td><td>${m.cutList.length} tipos</td><td>${(m.notes || []).join("; ") || "-"}</td></tr>`).join("")}
  </table>
  ${pF(pW, "1:25")}
</div>
`;
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
    <div class="amount">R$ ${fmtCost(costBrl)}</div>
    <div class="desc">Custo estimado de materiais (USD ${fmtCost(s.estimated_cost_usd)})</div>
  </div>

  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#333">Lista Completa de Pecas</h3>
  <table>
    <tr>
      <th>#</th><th>Peca</th><th>Modulo</th><th>Zona</th><th>Qtd</th>
      <th>Largura mm</th><th>Altura mm</th><th>Esp. mm</th>
      <th>Material</th><th>Fita de Borda</th><th>Veio</th><th>Cor</th>
    </tr>
    ${(() => {
      let tbl = "";
      let idx = 1;
      for (const [zone, cuts] of Object.entries(cutsByZone)) {
        tbl += `<tr class="zone-header"><td colspan="12">${esc(zone)}</td></tr>`;
        for (const c of cuts) {
          tbl += `<tr>
            <td>${idx++}</td><td>${esc(c.piece)}</td><td>${esc(c.module)}</td><td>${esc(c.zone)}</td>
            <td>${c.qty}</td><td>${c.w}</td><td>${c.h}</td><td>${c.thickness}</td>
            <td>${esc(c.material)}</td><td>${esc(c.edge)}</td><td>${c.grain}</td>
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
    <tr><th>Ferragem</th><th>Tipo</th><th>Modulo</th><th>Zona</th><th>Qtd</th><th>Especificacao</th></tr>
    ${(() => {
      let tbl = "";
      let currentType = "";
      for (const hw of hwItems) {
        if (hw.type !== currentType) {
          currentType = hw.type;
          tbl += `<tr class="zone-header"><td colspan="6">${esc(currentType.toUpperCase())}</td></tr>`;
        }
        tbl += `<tr><td>${esc(hw.name)}</td><td>${esc(hw.type)}</td><td>${esc(hw.module)}</td><td>${esc(hw.zone)}</td><td>${hw.qty}</td><td>${esc(hw.spec)}</td></tr>`;
      }
      return tbl;
    })()}
    <tr class="total-row"><td colspan="4">TOTAL</td><td>${bp.hardwareMap.length}</td><td></td></tr>
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

/** Color map for materials — used by getColorForMaterial and BOM */
const MATERIAL_COLOR_MAP: Record<string, string> = {
  lana: "#e0d5c1", areia: "#e0d5c1",
  lord: "#50617D", "bv_lord": "#50617D",
  branco: "#f5f5f5", "branco neve": "#f5f5f5",
  grafite: "#4a4a4a",
  carvalho: "#c5b49d",
  freijo: "#8e6c4e",
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
