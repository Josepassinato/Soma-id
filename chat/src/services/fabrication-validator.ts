/**
 * fabrication-validator.ts
 * P0.8 — Formal fabricability validation layer.
 * Checks modules against real manufacturing constraints.
 * Every rule is named, testable, and linked to a traceable entity.
 */

import type { BlueprintModule, WallLayout } from "./engine-bridge.js";

/* ============================================================
   Types
   ============================================================ */

export type ValidationSeverity = "info" | "warning" | "critical";

export interface ValidationResult {
  code: string;                 // FV-001, FV-002, etc.
  severity: ValidationSeverity;
  message: string;
  entityType: "module" | "wall" | "piece" | "project";
  entityTraceId: string;        // M-A01, W-NORTH-01, etc.
  entityName: string;           // human-readable name
  fieldPath?: string;           // e.g. "width", "depth", "cutList[0]"
  suggestedAction?: string;     // what to do about it
}

export interface FabricationValidationSummary {
  isReadyForFactory: boolean;
  totalChecks: number;
  infoCount: number;
  warningCount: number;
  criticalCount: number;
  results: ValidationResult[];
}

/* ============================================================
   Configurable Thresholds
   ============================================================ */

const LIMITS = {
  maxShelfSpanWithoutSupport: 900,   // mm — above this, needs center support
  maxDrawerDepth: 500,                // mm — standard telescopic slide
  minHangingDepth: 500,               // mm — minimum for garment clearance (530 ideal)
  maxDoorWidth: 600,                  // mm — above this, should split to 2 doors
  maxModuleHeight: 2400,              // mm — standard sheet height limit
  minDrawerClearance: 200,            // mm — free space in front for pull-out
  maxBackPanelUnsupported: 1200,      // mm — 6mm back panel without reinforcement
  minModuleWidth: 200,                // mm — below this, fabrication is impractical
  maxWallOverflowPercent: 5,          // % — acceptable overflow tolerance
};

/* ============================================================
   Validation Rules
   ============================================================ */

export function validateFabrication(
  walls: WallLayout[],
  roomDepth?: number,
): FabricationValidationSummary {
  const results: ValidationResult[] = [];

  for (const wall of walls) {
    // Wall-level checks
    const overflow = wall.totalModuleWidth - wall.usableWidth;
    const overflowPct = wall.usableWidth > 0 ? (overflow / wall.usableWidth) * 100 : 0;
    if (overflowPct > LIMITS.maxWallOverflowPercent) {
      results.push({
        code: "FV-008",
        severity: "warning",
        message: `Parede ${wall.label} excede largura util em ${Math.round(overflow)}mm (${overflowPct.toFixed(1)}%)`,
        entityType: "wall",
        entityTraceId: wall.traceId || wall.wallId,
        entityName: wall.label,
        fieldPath: "totalModuleWidth",
        suggestedAction: "Redistribuir modulos ou reduzir larguras",
      });
    }

    for (const mod of wall.modules) {
      const traceId = mod.traceId || mod.id;
      const name = mod.name;
      const subtype = (mod.moduleSubtype || "") as string;

      // FV-001: Shelf span without support
      if (mod.width > LIMITS.maxShelfSpanWithoutSupport &&
          (subtype === "shelves" || subtype === "upper_cabinet")) {
        results.push({
          code: "FV-001",
          severity: "warning",
          message: `Prateleira ${name} com vao de ${mod.width}mm excede ${LIMITS.maxShelfSpanWithoutSupport}mm sem suporte central`,
          entityType: "module",
          entityTraceId: traceId,
          entityName: name,
          fieldPath: "width",
          suggestedAction: "Adicionar suporte central ou dividir em 2 modulos",
        });
      }

      // FV-002: Drawer depth too large
      if (mod.depth > LIMITS.maxDrawerDepth &&
          (subtype === "drawer_bank" || subtype === "drawer_bank" || subtype === "jewelry" || subtype === "accessories")) {
        results.push({
          code: "FV-002",
          severity: "warning",
          message: `Gaveta ${name} com profundidade ${mod.depth}mm excede ${LIMITS.maxDrawerDepth}mm (corredica padrao)`,
          entityType: "module",
          entityTraceId: traceId,
          entityName: name,
          fieldPath: "depth",
          suggestedAction: "Reduzir profundidade ou usar corredica especial",
        });
      }

      // FV-003: Hanging depth too shallow
      if (mod.depth < LIMITS.minHangingDepth &&
          (subtype === "long_garment" || subtype === "short_garment" || subtype === "mixed_garment")) {
        results.push({
          code: "FV-003",
          severity: "critical",
          message: `Cabideiro ${name} com profundidade ${mod.depth}mm abaixo do minimo ${LIMITS.minHangingDepth}mm — roupas nao cabem`,
          entityType: "module",
          entityTraceId: traceId,
          entityName: name,
          fieldPath: "depth",
          suggestedAction: "Aumentar profundidade para minimo 530mm",
        });
      }

      // FV-004: Door width too large
      if (mod.width > LIMITS.maxDoorWidth &&
          (subtype === "glass_display" || subtype === "mirror_door" || subtype === "gun_safe")) {
        results.push({
          code: "FV-004",
          severity: "warning",
          message: `Porta de ${name} com ${mod.width}mm excede ${LIMITS.maxDoorWidth}mm — considerar 2 portas`,
          entityType: "module",
          entityTraceId: traceId,
          entityName: name,
          fieldPath: "width",
          suggestedAction: "Dividir em 2 portas ou usar porta de correr",
        });
      }

      // FV-005: Module height above manufacturable threshold
      if (mod.height > LIMITS.maxModuleHeight) {
        results.push({
          code: "FV-005",
          severity: "warning",
          message: `Modulo ${name} com altura ${mod.height}mm excede ${LIMITS.maxModuleHeight}mm (limite de chapa padrao)`,
          entityType: "module",
          entityTraceId: traceId,
          entityName: name,
          fieldPath: "height",
          suggestedAction: "Dividir em modulo base + modulo superior",
        });
      }

      // FV-006: Clearance for drawer opening
      if (roomDepth && roomDepth > 0 &&
          (subtype === "drawer_bank" || subtype === "drawer_bank" || subtype === "jewelry")) {
        const availableClearance = roomDepth - mod.depth;
        if (availableClearance < mod.depth + LIMITS.minDrawerClearance) {
          results.push({
            code: "FV-006",
            severity: "critical",
            message: `Gaveta ${name} precisa de ${mod.depth + LIMITS.minDrawerClearance}mm livre para abrir, mas so tem ${availableClearance}mm`,
            entityType: "module",
            entityTraceId: traceId,
            entityName: name,
            fieldPath: "depth",
            suggestedAction: "Reduzir profundidade da gaveta ou aumentar espaco disponivel",
          });
        }
      }

      // FV-007: Back panel insufficient for module size
      if (mod.height > LIMITS.maxBackPanelUnsupported) {
        const hasBackReinforcement = (mod.notes || []).some(n =>
          n.toLowerCase().includes("reforco") || n.toLowerCase().includes("reinforc")
        );
        const backCut = mod.cutList.find(c => c.piece.toLowerCase().includes("fundo"));
        if (backCut && backCut.material.toLowerCase().includes("6mm") && !hasBackReinforcement) {
          results.push({
            code: "FV-007",
            severity: "warning",
            message: `Fundo 6mm em ${name} (${mod.height}mm altura) pode embarrigar sem reforco`,
            entityType: "module",
            entityTraceId: traceId,
            entityName: name,
            fieldPath: "cutList.fundo",
            suggestedAction: "Adicionar travessa de reforco ou usar fundo 15mm",
          });
        }
      }

      // FV-009: Module too narrow
      if (mod.width < LIMITS.minModuleWidth) {
        results.push({
          code: "FV-009",
          severity: "warning",
          message: `Modulo ${name} com largura ${mod.width}mm abaixo do minimo pratico ${LIMITS.minModuleWidth}mm`,
          entityType: "module",
          entityTraceId: traceId,
          entityName: name,
          fieldPath: "width",
          suggestedAction: "Aumentar largura ou combinar com modulo adjacente",
        });
      }
    }
  }

  const criticalCount = results.filter(r => r.severity === "critical").length;
  const warningCount = results.filter(r => r.severity === "warning").length;
  const infoCount = results.filter(r => r.severity === "info").length;

  return {
    isReadyForFactory: criticalCount === 0,
    totalChecks: results.length,
    infoCount,
    warningCount,
    criticalCount,
    results,
  };
}
