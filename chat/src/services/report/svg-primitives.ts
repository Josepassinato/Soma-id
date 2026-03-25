/**
 * svg-primitives.ts
 * P0.1 — Basic SVG helpers and constants shared across all report renderers.
 */

import type { BlueprintModule } from "../engine-bridge.js";

/* ============================================================
   Constants
   ============================================================ */
export const GOLD = "#c9a84c";
export const DIM_RED = "#cc0000";
export const HDR_BG = "#333333";
export const HDR_FG = "#ffffff";
export const STROKE = "#333333";
export const LIGHT_FILL = "#f5f5f5";

export const MOD_FILLS: Record<string, string> = {
  base: "#FAFAFA",
  upper: "#F0F0F0",
  freestanding: "#F0F5FA",
  island: "#F5F2ED",
  vanity: "#F0F5F0",
  gun_safe: "#F0EDED",
};

export const PIECE_COLORS = [
  "#E3F2FD", "#FFF3E0", "#E8F5E9", "#FCE4EC",
  "#F3E5F5", "#FFF8E1", "#E0F7FA", "#FBE9E7",
];

export const ZONE_COLORS = [
  "#E8F0FE", "#FFF3E0", "#E8F5E9", "#FCE4EC",
  "#F3E5F5", "#FFF8E1", "#E0F7FA", "#FBE9E7",
];

export const MAT_COLORS: Record<string, string> = {
  bv_lana: "#e0d5c1",
  bv_lord: "#50617D",
  mdf_6mm: "#d0d0d0",
  mdf_branco: "#f5f5f0",
};

/* ============================================================
   Helpers
   ============================================================ */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function fmtCost(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function modType(mod: BlueprintModule): string {
  const id = (mod.moduleId || "").toLowerCase();
  const tp = (mod.type || "").toLowerCase();
  if (id.includes("ilha") || tp.includes("island")) return "island";
  if (id.includes("bancada") || id.includes("vanity") || tp.includes("vanity")) return "vanity";
  if (id.includes("armas") || tp.includes("gun")) return "gun_safe";
  if (tp.includes("upper") || id.includes("maleiro")) return "upper";
  if (tp.includes("free")) return "freestanding";
  return "base";
}

export function modFill(mod: BlueprintModule): string {
  return MOD_FILLS[modType(mod)] || MOD_FILLS.base;
}

export function today(): string {
  return new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function nowFull(): string {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function formatProjectNumber(sessionId: string): string {
  const clean = sessionId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const p1 = clean.substring(0, 4) || "0000";
  const p2 = clean.substring(4, 8) || "0000";
  const p3 = clean.substring(8, 11) || "000";
  return `SOMA-${p1}-${p2}-${p3}`;
}

/** Standard technical drawing scales */
export const STANDARD_SCALES = [1, 2, 5, 10, 15, 20, 25, 50, 75, 100];

export function normalizeScale(rawScale: number): number {
  return STANDARD_SCALES.find(s => s >= rawScale) || STANDARD_SCALES[STANDARD_SCALES.length - 1];
}
