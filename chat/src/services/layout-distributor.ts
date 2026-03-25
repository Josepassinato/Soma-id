/**
 * layout-distributor.ts
 * P0.4 — Distributes modules across walls with explicit tracking.
 * Transforms the existing FFD allocation into a multi-wall WallLayout[] structure.
 */

import type { BlueprintModule, WallLayout } from "./engine-bridge.js";

/** Wall orientation labels in Portuguese */
const ORIENTATION_LABELS: Record<string, string> = {
  north: "Norte", south: "Sul", east: "Leste", west: "Oeste",
  wall_a: "A", wall_b: "B", wall_c: "C", wall_d: "D",
};

function wallLabel(wallId: string, index: number): string {
  const letter = String.fromCharCode(65 + index); // A, B, C, D...
  const orientation = ORIENTATION_LABELS[wallId] || wallId;
  return `Parede ${letter} (${orientation})`;
}

/** Distribution decision record */
export interface DistributionDecision {
  moduleId: string;
  moduleName: string;
  assignedWall: string;
  reason: string;
}

/**
 * Build WallLayout[] from the existing mainWall/sideWall structure
 * and available wall metadata. This bridges the current engine output
 * to the new multi-wall structure.
 */
export function buildWallLayouts(
  mainWall: { totalWidth: number; modules: BlueprintModule[] },
  sideWall: { totalWidth: number; modules: BlueprintModule[] } | undefined,
  availableWalls: Array<{ wallId: string; length_mm: number; usable_mm: number }>,
): { walls: WallLayout[]; decisions: DistributionDecision[] } {
  const walls: WallLayout[] = [];
  const decisions: DistributionDecision[] = [];

  // Group modules by their wall assignment (from notes: "Parede: xxx")
  const modulesByWall = new Map<string, BlueprintModule[]>();
  const allModules = [
    ...mainWall.modules,
    ...(sideWall?.modules || []),
  ];

  for (const mod of allModules) {
    const wallNote = (mod.notes || []).find(n => n.toLowerCase().startsWith("parede:"));
    const wallId = wallNote
      ? wallNote.split(":")[1].trim().toLowerCase()
      : availableWalls[0]?.wallId || "north";

    if (!modulesByWall.has(wallId)) modulesByWall.set(wallId, []);
    modulesByWall.get(wallId)!.push(mod);

    decisions.push({
      moduleId: mod.moduleId,
      moduleName: mod.name,
      assignedWall: wallId,
      reason: wallNote ? `Zona atribuída à parede ${wallId}` : "Parede principal (default)",
    });
  }

  // Build WallLayout for each wall that has modules
  let wallIndex = 0;
  for (const aw of availableWalls) {
    const mods = modulesByWall.get(aw.wallId) || [];
    if (mods.length === 0) continue;

    // Recalculate X positions sequentially within this wall
    let xCursor = 0;
    for (const m of mods) {
      m.position = { ...m.position, x: xCursor };
      xCursor += m.width + 18; // 18mm inter-module gap
    }

    const totalModuleWidth = mods.reduce((sum, m) => sum + m.width, 0) + Math.max(0, (mods.length - 1) * 18);

    walls.push({
      wallId: aw.wallId,
      label: wallLabel(aw.wallId, wallIndex),
      orientation: aw.wallId,
      wallWidth: aw.length_mm,
      usableWidth: aw.usable_mm,
      totalModuleWidth,
      modules: mods,
      distributionNotes: [
        `${mods.length} módulos atribuídos`,
        `Largura usada: ${totalModuleWidth}mm de ${aw.usable_mm}mm disponíveis`,
        totalModuleWidth > aw.usable_mm ? `⚠️ OVERFLOW: ${totalModuleWidth - aw.usable_mm}mm excedido` : `Folga: ${aw.usable_mm - totalModuleWidth}mm`,
      ],
    });
    wallIndex++;
  }

  // Handle modules assigned to walls not in availableWalls (freestanding/island)
  for (const [wallId, mods] of modulesByWall) {
    if (walls.some(w => w.wallId === wallId)) continue;
    if (mods.length === 0) continue;

    // Freestanding — treat as separate "wall" (island, etc.)
    let xCursor = 0;
    for (const m of mods) {
      m.position = { ...m.position, x: xCursor };
      xCursor += m.width + 18;
    }
    const totalModuleWidth = mods.reduce((sum, m) => sum + m.width, 0) + Math.max(0, (mods.length - 1) * 18);

    walls.push({
      wallId,
      label: `Ilha / ${wallId}`,
      orientation: wallId,
      wallWidth: totalModuleWidth + 200,
      usableWidth: totalModuleWidth + 200,
      totalModuleWidth,
      modules: mods,
      distributionNotes: [`Módulos freestanding (${mods.length})`],
    });
  }

  return { walls, decisions };
}

/**
 * Generate distribution summary for factory notes
 */
export function distributionSummary(walls: WallLayout[]): string[] {
  const notes: string[] = [];
  notes.push(`Layout multi-parede: ${walls.length} parede(s) com módulos`);
  for (const w of walls) {
    notes.push(`  ${w.label}: ${w.modules.length} módulos, ${w.totalModuleWidth}mm / ${w.usableWidth}mm (${Math.round(w.totalModuleWidth / w.usableWidth * 100)}%)`);
  }
  return notes;
}
