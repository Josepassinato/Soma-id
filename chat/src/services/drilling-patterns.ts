/**
 * drilling-patterns.ts
 * P1.6 — Drilling patterns by module type/piece role.
 * Generates real drilling points for supported module types.
 */

/* ============================================================
   Types
   ============================================================ */

export interface DrillingPoint {
  drillId: string;
  pieceTraceId?: string;
  face: "top" | "bottom" | "left" | "right" | "front" | "back";
  x: number;          // mm from face origin
  y: number;          // mm from face origin
  diameter: number;   // mm
  depth: number;      // mm
  drillType: "minifix" | "cavilha" | "dobradica" | "corredica" | "suporte_prateleira" | "cabideiro" | "pe";
  sourcePatternId: string;
}

export interface DrillingPattern {
  patternId: string;
  moduleSubtype: string;
  pieceRole: string;       // "lateral", "tampo", "base", "prateleira"
  description: string;
  generate: (pieceWidth: number, pieceHeight: number, depth: number) => DrillingPoint[];
}

/* ============================================================
   Pattern Registry
   ============================================================ */

let drillCounter = 0;
function nextDrillId(): string { return `dr-${++drillCounter}`; }

const PATTERNS: DrillingPattern[] = [
  // --- Lateral panels: minifix + cavilha for top/bottom connection ---
  {
    patternId: "PAT-LATERAL-MINIFIX",
    moduleSubtype: "*", // applies to all
    pieceRole: "lateral",
    description: "Minifix + cavilha para conexao lateral-tampo/base",
    generate: (w, h, d) => {
      const points: DrillingPoint[] = [];
      // Top connection: 2 minifix + 1 cavilha
      points.push({ drillId: nextDrillId(), face: "top", x: 37, y: d / 2, diameter: 15, depth: 13, drillType: "minifix", sourcePatternId: "PAT-LATERAL-MINIFIX" });
      points.push({ drillId: nextDrillId(), face: "top", x: w - 37, y: d / 2, diameter: 15, depth: 13, drillType: "minifix", sourcePatternId: "PAT-LATERAL-MINIFIX" });
      points.push({ drillId: nextDrillId(), face: "top", x: w / 2, y: d / 2, diameter: 8, depth: 30, drillType: "cavilha", sourcePatternId: "PAT-LATERAL-MINIFIX" });
      // Bottom connection: same pattern
      points.push({ drillId: nextDrillId(), face: "bottom", x: 37, y: d / 2, diameter: 15, depth: 13, drillType: "minifix", sourcePatternId: "PAT-LATERAL-MINIFIX" });
      points.push({ drillId: nextDrillId(), face: "bottom", x: w - 37, y: d / 2, diameter: 15, depth: 13, drillType: "minifix", sourcePatternId: "PAT-LATERAL-MINIFIX" });
      points.push({ drillId: nextDrillId(), face: "bottom", x: w / 2, y: d / 2, diameter: 8, depth: 30, drillType: "cavilha", sourcePatternId: "PAT-LATERAL-MINIFIX" });
      return points;
    },
  },

  // --- Shelf support drilling (series of holes on lateral inner face) ---
  {
    patternId: "PAT-SHELF-SUPPORT",
    moduleSubtype: "shelves",
    pieceRole: "lateral",
    description: "Serie de furos para suporte de prateleira ajustavel",
    generate: (w, h, d) => {
      const points: DrillingPoint[] = [];
      const startY = 100; // 100mm from bottom
      const endY = h - 100;
      const step = 32; // 32mm system
      const frontX = 37; // 37mm from front edge
      const backX = d - 37;
      for (let y = startY; y <= endY; y += step) {
        points.push({ drillId: nextDrillId(), face: "right", x: frontX, y, diameter: 5, depth: 12, drillType: "suporte_prateleira", sourcePatternId: "PAT-SHELF-SUPPORT" });
        points.push({ drillId: nextDrillId(), face: "right", x: backX, y, diameter: 5, depth: 12, drillType: "suporte_prateleira", sourcePatternId: "PAT-SHELF-SUPPORT" });
      }
      return points;
    },
  },

  // --- Drawer slide drilling (corredica on lateral inner face) ---
  {
    patternId: "PAT-DRAWER-SLIDE",
    moduleSubtype: "drawer_bank",
    pieceRole: "lateral",
    description: "Furacao para corredica telescopica",
    generate: (w, h, d) => {
      const points: DrillingPoint[] = [];
      const drawerCount = Math.max(2, Math.min(5, Math.floor(h / 180)));
      const drawerH = h / drawerCount;
      for (let i = 0; i < drawerCount; i++) {
        const centerY = drawerH * i + drawerH / 2;
        // 3 fixing points per slide: front, center, back
        points.push({ drillId: nextDrillId(), face: "right", x: 20, y: centerY, diameter: 4, depth: 12, drillType: "corredica", sourcePatternId: "PAT-DRAWER-SLIDE" });
        points.push({ drillId: nextDrillId(), face: "right", x: d / 2, y: centerY, diameter: 4, depth: 12, drillType: "corredica", sourcePatternId: "PAT-DRAWER-SLIDE" });
        points.push({ drillId: nextDrillId(), face: "right", x: d - 20, y: centerY, diameter: 4, depth: 12, drillType: "corredica", sourcePatternId: "PAT-DRAWER-SLIDE" });
      }
      return points;
    },
  },

  // --- Hinge drilling (dobradica 35mm on door/lateral) ---
  {
    patternId: "PAT-HINGE-35MM",
    moduleSubtype: "*",
    pieceRole: "porta",
    description: "Furacao copo 35mm para dobradica",
    generate: (w, h, d) => {
      const points: DrillingPoint[] = [];
      // Standard: 2 hinges for doors < 1200mm, 3 for taller
      const hingeCount = h > 1200 ? 3 : 2;
      const topOffset = 100;
      const bottomOffset = 100;
      const spacing = (h - topOffset - bottomOffset) / (hingeCount - 1);
      for (let i = 0; i < hingeCount; i++) {
        const y = topOffset + i * spacing;
        points.push({ drillId: nextDrillId(), face: "back", x: 22.5, y, diameter: 35, depth: 13, drillType: "dobradica", sourcePatternId: "PAT-HINGE-35MM" });
      }
      return points;
    },
  },

  // --- Hanging bar mounting points ---
  {
    patternId: "PAT-HANGING-BAR",
    moduleSubtype: "long_garment",
    pieceRole: "lateral",
    description: "Pontos de fixacao barra cabideiro oval 25mm",
    generate: (w, h, d) => {
      const points: DrillingPoint[] = [];
      const barY = h * 0.06; // 6% from top
      // 2 mounting holes per side
      points.push({ drillId: nextDrillId(), face: "right", x: d / 2 - 10, y: barY, diameter: 8, depth: 15, drillType: "cabideiro", sourcePatternId: "PAT-HANGING-BAR" });
      points.push({ drillId: nextDrillId(), face: "right", x: d / 2 + 10, y: barY, diameter: 8, depth: 15, drillType: "cabideiro", sourcePatternId: "PAT-HANGING-BAR" });
      return points;
    },
  },

  // --- Adjustable feet drilling ---
  {
    patternId: "PAT-FEET",
    moduleSubtype: "*",
    pieceRole: "base",
    description: "Furacao para pes regulaveis 100mm",
    generate: (w, h, d) => {
      const points: DrillingPoint[] = [];
      // 4 feet: 50mm from each corner
      points.push({ drillId: nextDrillId(), face: "bottom", x: 50, y: 50, diameter: 10, depth: 18, drillType: "pe", sourcePatternId: "PAT-FEET" });
      points.push({ drillId: nextDrillId(), face: "bottom", x: w - 50, y: 50, diameter: 10, depth: 18, drillType: "pe", sourcePatternId: "PAT-FEET" });
      points.push({ drillId: nextDrillId(), face: "bottom", x: 50, y: d - 50, diameter: 10, depth: 18, drillType: "pe", sourcePatternId: "PAT-FEET" });
      points.push({ drillId: nextDrillId(), face: "bottom", x: w - 50, y: d - 50, diameter: 10, depth: 18, drillType: "pe", sourcePatternId: "PAT-FEET" });
      return points;
    },
  },
];

/* ============================================================
   Pattern Lookup & Application
   ============================================================ */

/** Find applicable patterns for a piece in a module */
export function findPatterns(moduleSubtype: string, pieceRole: string): DrillingPattern[] {
  return PATTERNS.filter(p =>
    (p.moduleSubtype === moduleSubtype || p.moduleSubtype === "*") &&
    p.pieceRole === pieceRole
  );
}

/** Generate drilling points for a specific piece */
export function generateDrillingForPiece(
  moduleSubtype: string,
  pieceRole: string,
  pieceWidth: number,
  pieceHeight: number,
  pieceDepth: number,
  pieceTraceId?: string,
): { points: DrillingPoint[]; patternsUsed: string[]; supported: boolean } {
  const patterns = findPatterns(moduleSubtype, pieceRole);
  if (patterns.length === 0) {
    return { points: [], patternsUsed: [], supported: false };
  }

  const allPoints: DrillingPoint[] = [];
  const patternsUsed: string[] = [];

  for (const pattern of patterns) {
    const points = pattern.generate(pieceWidth, pieceHeight, pieceDepth);
    for (const p of points) {
      p.pieceTraceId = pieceTraceId;
    }
    allPoints.push(...points);
    patternsUsed.push(pattern.patternId);
  }

  return { points: allPoints, patternsUsed, supported: true };
}

/** Get all available patterns */
export function getAllPatterns(): DrillingPattern[] {
  return [...PATTERNS];
}
