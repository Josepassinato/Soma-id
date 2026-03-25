/**
 * piece-labels.ts
 * P2.1 — Generates consistent piece labels for production.
 * Each label carries traceability, material, dimensions, drilling status.
 */

import type { BlueprintModule, WallLayout, CutListItem } from "./engine-bridge.js";
import { findPatterns } from "./drilling-patterns.js";
import { findAssemblyProfile } from "./assembly-hints.js";

/* ============================================================
   Types
   ============================================================ */

export interface PieceLabel {
  pieceTraceId: string;
  shortLabel: string;
  moduleTraceId: string;
  moduleShortLabel: string;
  wallTraceId: string;
  wallLabel: string;
  material: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  pieceRole: string;        // "Lateral", "Tampo/Base", "Fundo", "Prateleira", etc.
  grainDirection: string;
  edgeBand: string;
  drillingStatus: "supported" | "unsupported" | "none";
  assemblyProfileId: string | null;
}

/* ============================================================
   Label Generation
   ============================================================ */

/** Generate labels for all pieces across all walls */
export function generatePieceLabels(walls: WallLayout[]): PieceLabel[] {
  const labels: PieceLabel[] = [];

  for (const wall of walls) {
    for (const mod of wall.modules) {
      const moduleSubtype = (mod.moduleSubtype || "") as string;
      const assemblyProfile = findAssemblyProfile(moduleSubtype);

      for (const cut of mod.cutList) {
        const pieceRole = normalizePieceRole(cut.piece);
        const patterns = findPatterns(moduleSubtype, pieceRole);
        const hasDrilling = patterns.length > 0;

        labels.push({
          pieceTraceId: cut.traceId || cut.shortLabel || "",
          shortLabel: cut.shortLabel || mod.shortLabel || "",
          moduleTraceId: mod.traceId || "",
          moduleShortLabel: mod.shortLabel || "",
          wallTraceId: wall.traceId || "",
          wallLabel: wall.label || "",
          material: cut.material,
          widthMm: cut.rawWidth,
          heightMm: cut.rawHeight,
          thicknessMm: cut.material.toLowerCase().includes("6mm") ? 6 : 18,
          pieceRole,
          grainDirection: cut.grainDirection,
          edgeBand: cut.edgeBand,
          drillingStatus: hasDrilling ? "supported" : cut.piece.toLowerCase().includes("fundo") ? "none" : "unsupported",
          assemblyProfileId: assemblyProfile?.profileId || null,
        });
      }
    }
  }

  return labels;
}

/** Normalize piece names to standard roles */
function normalizePieceRole(pieceName: string): string {
  const lower = pieceName.toLowerCase();
  if (lower.includes("lateral") || lower.includes("side")) return "lateral";
  if (lower.includes("tampo") || lower.includes("base") || lower.includes("top") || lower.includes("bottom")) return "base";
  if (lower.includes("fundo") || lower.includes("back")) return "fundo";
  if (lower.includes("prateleira") || lower.includes("shelf")) return "prateleira";
  if (lower.includes("porta") || lower.includes("door")) return "porta";
  if (lower.includes("frente") || lower.includes("front") || lower.includes("gaveta")) return "frente_gaveta";
  if (lower.includes("divisor") || lower.includes("divider")) return "divisoria";
  return pieceName.toLowerCase().replace(/\s+/g, "_");
}
