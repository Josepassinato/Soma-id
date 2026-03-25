/**
 * traceability.ts
 * P0.5 — End-to-end traceability ID generation and validation.
 * Links walls → modules → pieces → BOM → nesting with stable, meaningful IDs.
 */

import type { BlueprintModule, WallLayout, CutListItem } from "./engine-bridge.js";

/* ============================================================
   ID Generation — Stable, deterministic, human-readable
   ============================================================ */

/** Generate wall trace ID: W-NORTH, W-EAST, etc. */
export function wallTraceId(wallId: string, index: number): string {
  return `W-${wallId.toUpperCase().replace(/\s+/g, "_")}-${String(index + 1).padStart(2, "0")}`;
}

/** Generate module trace ID: M-A01, M-A02, M-B01 (wall letter + seq) */
export function moduleTraceId(wallIndex: number, moduleIndex: number): string {
  const wallLetter = String.fromCharCode(65 + wallIndex); // A, B, C...
  return `M-${wallLetter}${String(moduleIndex + 1).padStart(2, "0")}`;
}

/** Short label for display in elevations: A01, A02, B01 */
export function moduleShortLabel(wallIndex: number, moduleIndex: number): string {
  const wallLetter = String.fromCharCode(65 + wallIndex);
  return `${wallLetter}${String(moduleIndex + 1).padStart(2, "0")}`;
}

/** Generate piece trace ID: P-A01-01, P-A01-02 (module + piece seq) */
export function pieceTraceId(moduleTrace: string, pieceIndex: number): string {
  return `P-${moduleTrace.replace("M-", "")}-${String(pieceIndex + 1).padStart(2, "0")}`;
}

/** Short piece label for nesting display: A01.01, A01.02 */
export function pieceShortLabel(moduleTrace: string, pieceIndex: number): string {
  return `${moduleTrace.replace("M-", "")}.${String(pieceIndex + 1).padStart(2, "0")}`;
}

/* ============================================================
   Apply Traceability to Engine Outputs
   ============================================================ */

/** Assign trace IDs to all walls, modules, and pieces */
export function applyTraceability(walls: WallLayout[]): TraceabilitySummary {
  const summary: TraceabilitySummary = {
    totalWalls: walls.length,
    totalModules: 0,
    totalPieces: 0,
    orphanModules: 0,
    orphanPieces: 0,
  };

  for (let wi = 0; wi < walls.length; wi++) {
    const wall = walls[wi];
    // Wall trace ID
    wall.traceId = wallTraceId(wall.wallId, wi);

    for (let mi = 0; mi < wall.modules.length; mi++) {
      const mod = wall.modules[mi];
      summary.totalModules++;

      // Module trace ID
      mod.traceId = moduleTraceId(wi, mi);
      mod.shortLabel = moduleShortLabel(wi, mi);
      mod.parentWallTraceId = wall.traceId;

      // Piece trace IDs
      let pieceSeq = 0;
      for (const cut of (mod.cutList || [])) {
        for (let qi = 0; qi < cut.quantity; qi++) {
          pieceSeq++;
        }
        // Assign trace at CutListItem level (covers all instances of that piece type)
        cut.traceId = pieceTraceId(mod.traceId, pieceSeq);
        cut.parentModuleTraceId = mod.traceId;
        cut.shortLabel = pieceShortLabel(mod.traceId, pieceSeq);
        summary.totalPieces += cut.quantity;
      }
    }
  }

  return summary;
}

/* ============================================================
   Consistency Validation
   ============================================================ */

export interface TraceabilitySummary {
  totalWalls: number;
  totalModules: number;
  totalPieces: number;
  orphanModules: number;
  orphanPieces: number;
}

export interface TraceabilityViolation {
  rule: string;   // TR-001, TR-002, etc.
  entity: string;
  message: string;
}

/** Validate traceability integrity across all walls */
export function validateTraceability(walls: WallLayout[]): TraceabilityViolation[] {
  const violations: TraceabilityViolation[] = [];

  for (const wall of walls) {
    // TR-001: Every wall must have traceId
    if (!wall.traceId) {
      violations.push({
        rule: "TR-001",
        entity: `Wall ${wall.wallId}`,
        message: "Wall missing traceId",
      });
    }

    for (const mod of wall.modules) {
      // TR-001: Every module must have traceId
      if (!mod.traceId) {
        violations.push({
          rule: "TR-001",
          entity: `Module ${mod.name}`,
          message: "Module missing traceId",
        });
      }

      // TR-002: Every module must reference parent wall
      if (!mod.parentWallTraceId) {
        violations.push({
          rule: "TR-002",
          entity: `Module ${mod.name} (${mod.traceId || "no-id"})`,
          message: "Module missing parentWallTraceId",
        });
      }

      // TR-003: Every piece must reference parent module
      for (const cut of (mod.cutList || [])) {
        if (!cut.parentModuleTraceId) {
          violations.push({
            rule: "TR-003",
            entity: `Piece ${cut.piece} in ${mod.name}`,
            message: "Piece missing parentModuleTraceId",
          });
        }
      }
    }
  }

  return violations;
}
