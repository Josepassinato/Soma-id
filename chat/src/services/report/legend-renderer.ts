/**
 * legend-renderer.ts
 * P0.1 — Material legend block for elevation pranchas.
 */

import { esc } from "./svg-primitives.js";
import { getMaterialHatchId } from "./material-patterns.js";

/** Render material legend with hatch samples */
export function renderMaterialLegend(
  materials: Array<{ name: string; color: string }>,
  prefix: string,
  x: number,
  y: number,
): string {
  let svg = `<g transform="translate(${x}, ${y})">`;
  svg += `<text x="0" y="0" font-size="10" font-weight="bold" fill="#333" font-family="Arial,sans-serif">LEGENDA DE MATERIAIS</text>`;
  svg += `<line x1="0" y1="4" x2="160" y2="4" stroke="#333" stroke-width="0.5"/>`;
  const seen = new Set<string>();
  let row = 0;
  for (const mat of materials) {
    const key = mat.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const ry = 14 + row * 20;
    const hatchId = getMaterialHatchId(mat.name);
    svg += `<rect x="0" y="${ry}" width="30" height="14" fill="${mat.color}" stroke="#999" stroke-width="0.3"/>`;
    svg += `<rect x="0" y="${ry}" width="30" height="14" fill="url(#${prefix}${hatchId})" stroke="#999" stroke-width="0.3"/>`;
    svg += `<text x="38" y="${ry + 10}" font-size="8" fill="#333" font-family="Arial,sans-serif">${esc(mat.name)}</text>`;
    row++;
  }
  svg += `</g>`;
  return svg;
}
