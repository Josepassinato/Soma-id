/**
 * material-patterns.ts
 * P0.1 — SVG pattern definitions for material hatch and material-to-pattern mapping.
 */

import { DIM_RED, STROKE } from "./svg-primitives.js";

/** Generate all SVG <defs> including markers and material hatch patterns */
export function svgDefs(prefix: string = ""): string {
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
    <pattern id="${prefix}wallHatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="6" stroke="#888" stroke-width="0.6"/>
    </pattern>
    <pattern id="${prefix}wallHatchX" patternUnits="userSpaceOnUse" width="6" height="6">
      <line x1="0" y1="0" x2="6" y2="6" stroke="#888" stroke-width="0.5"/>
      <line x1="6" y1="0" x2="0" y2="6" stroke="#888" stroke-width="0.5"/>
    </pattern>
    <!-- Material hatch patterns -->
    <pattern id="${prefix}hatch_mdf" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#888" stroke-width="0.5"/>
    </pattern>
    <pattern id="${prefix}hatch_mdf_light" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="#aaa" stroke-width="0.3" opacity="0.5"/>
    </pattern>
    <pattern id="${prefix}hatch_wood" patternUnits="userSpaceOnUse" width="20" height="10">
      <path d="M0,5 Q5,3 10,5 Q15,7 20,5" fill="none" stroke="#8B7355" stroke-width="0.4"/>
      <path d="M0,2 Q5,0 10,2 Q15,4 20,2" fill="none" stroke="#8B7355" stroke-width="0.3"/>
      <path d="M0,8 Q5,6 10,8 Q15,10 20,8" fill="none" stroke="#8B7355" stroke-width="0.3"/>
    </pattern>
    <pattern id="${prefix}hatch_glass" patternUnits="userSpaceOnUse" width="10" height="10">
      <line x1="0" y1="0" x2="10" y2="10" stroke="#4A90D9" stroke-width="0.3" opacity="0.5"/>
      <line x1="10" y1="0" x2="0" y2="10" stroke="#4A90D9" stroke-width="0.3" opacity="0.5"/>
    </pattern>
    <pattern id="${prefix}hatch_mirror" patternUnits="userSpaceOnUse" width="6" height="6">
      <rect width="6" height="6" fill="#E8E8E8"/>
      <line x1="0" y1="0" x2="6" y2="6" stroke="#999" stroke-width="0.4"/>
      <line x1="6" y1="0" x2="0" y2="6" stroke="#999" stroke-width="0.4"/>
    </pattern>
    <pattern id="${prefix}hatch_stone" patternUnits="userSpaceOnUse" width="8" height="8">
      <circle cx="2" cy="2" r="0.5" fill="#777"/><circle cx="6" cy="5" r="0.4" fill="#888"/><circle cx="4" cy="7" r="0.5" fill="#777"/>
    </pattern>
  </defs>`;
}

/** Map material name to SVG hatch pattern ID suffix */
export function getMaterialHatchId(materialName: string): string {
  const m = materialName.toLowerCase();
  if (m.includes("vidro") || m.includes("glass") || m.includes("temperado")) return "hatch_glass";
  if (m.includes("espelho") || m.includes("mirror")) return "hatch_mirror";
  if (m.includes("pedra") || m.includes("granito") || m.includes("marmore") || m.includes("stone")) return "hatch_stone";
  if (m.includes("carvalho") || m.includes("freijo") || m.includes("noce") || m.includes("madeira") || m.includes("lamina")) return "hatch_wood";
  if (m.includes("mdf 6mm") || m.includes("mdf 3mm") || m.includes("fundo")) return "hatch_mdf_light";
  return "hatch_mdf";
}

/** Color map for materials */
export const MATERIAL_COLOR_MAP: Record<string, string> = {
  lana: "#e0d5c1", areia: "#e0d5c1", bv_lana: "#e0d5c1",
  lord: "#50617D", bv_lord: "#50617D",
  branco: "#f5f5f5", "branco neve": "#f5f5f5", "branco tx": "#f0f0f0",
  grafite: "#4a4a4a", "cinza grafite": "#4a4a4a",
  carvalho: "#c5b49d",
  freijo: "#8e6c4e",
  noce: "#5d4037",
  sage: "#879b8a",
};

export function getColorForMaterial(matName: string): string {
  const lower = matName.toLowerCase();
  if (lower.includes("mdf 6mm") || lower.includes("mdf 3mm")) return "#d0d0d0";
  for (const [key, color] of Object.entries(MATERIAL_COLOR_MAP)) {
    if (lower.includes(key)) return color;
  }
  return "#ccc";
}
