/**
 * briefing-normalizer.ts
 * P0.0 — Normalizes ParsedBriefing into a consistent, canonical form.
 * Converts units, standardizes orientations, resolves material names,
 * and marks every transformation as inferred.
 */

import type { ParsedBriefing, NormalizedBriefing, FieldConfidence, FieldSource, FieldStatus } from "../types.js";

/* ============================================================
   Normalization Helpers
   ============================================================ */

/** Convert any length to millimeters */
function toMm(value: number, impliedUnit: "m" | "cm" | "mm" | "auto"): number {
  if (impliedUnit === "m" || (impliedUnit === "auto" && value < 20)) return Math.round(value * 1000);
  if (impliedUnit === "cm" || (impliedUnit === "auto" && value < 200)) return Math.round(value * 10);
  return Math.round(value); // already mm
}

/** Canonical wall orientation mapping */
const WALL_ALIASES: Record<string, string> = {
  norte: "north", nord: "north", n: "north", north: "north",
  sul: "south", sud: "south", s: "south", south: "south",
  leste: "east", este: "east", e: "east", east: "east", l: "east",
  oeste: "west", w: "west", west: "west", o: "west",
};

function normalizeWallId(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return WALL_ALIASES[lower] || lower;
}

/** Canonical material name mapping */
const MATERIAL_ALIASES: Record<string, string> = {
  "freijó": "freijo", "freijo natural": "freijo", "freijó natural": "freijo",
  "carvalho": "carvalho", "carvalho americano": "carvalho",
  "branco neve": "branco_neve", "branco tx": "branco_tx", "branco": "branco",
  "cinza grafite": "cinza_grafite", "grafite": "cinza_grafite",
  "lana": "bv_lana", "bv lana": "bv_lana", "areia": "bv_lana",
  "lord": "bv_lord", "bv lord": "bv_lord",
  "noce": "noce", "sage": "sage",
};

function normalizeMaterialKey(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return MATERIAL_ALIASES[lower] || lower.replace(/\s+/g, "_");
}

/* ============================================================
   Field Confidence Builder
   ============================================================ */

function fieldConf(
  fieldPath: string,
  score: number,
  status: FieldStatus,
  source: FieldSource,
  wasInferred: boolean = false,
  notes?: string,
): FieldConfidence {
  return {
    fieldPath,
    score,
    status,
    source,
    wasInferred,
    requiresConfirmation: status === "ambiguous" || status === "contradictory" || (wasInferred && score < 0.7),
    notes,
  };
}

/* ============================================================
   Main Normalization Function
   ============================================================ */

export function normalizeBriefing(raw: ParsedBriefing): NormalizedBriefing {
  const confidences: FieldConfidence[] = [];
  const sources = raw._meta?.sources || [];
  const primarySource: FieldSource = sources.includes("pdf") ? "pdf" :
    sources.includes("image") ? "image" :
    sources.includes("audio") ? "user_audio" : "user_text";

  // Deep clone to avoid mutating original
  const b: ParsedBriefing = JSON.parse(JSON.stringify(raw));

  // --- NR-001: Normalize project type ---
  if (b.project.type) {
    b.project.type = b.project.type.toLowerCase().trim();
    confidences.push(fieldConf("project.type", 1.0, "confirmed", primarySource));
  } else {
    confidences.push(fieldConf("project.type", 0, "missing", primarySource));
  }

  // --- NR-002: Normalize ceiling height to meters ---
  if (b.space.ceiling_height_m > 0) {
    if (b.space.ceiling_height_m > 500) {
      // Definitely in mm (e.g., 2800, 3000)
      const orig = b.space.ceiling_height_m;
      b.space.ceiling_height_m = b.space.ceiling_height_m / 1000;
      confidences.push(fieldConf("space.ceiling_height_m", 0.9, "inferred", "system_inference", true,
        `Converted from ${orig}mm to ${b.space.ceiling_height_m}m`));
    } else if (b.space.ceiling_height_m > 10) {
      // Likely in cm (e.g., 280, 300)
      const orig = b.space.ceiling_height_m;
      b.space.ceiling_height_m = b.space.ceiling_height_m / 100;
      confidences.push(fieldConf("space.ceiling_height_m", 0.85, "inferred", "system_inference", true,
        `Converted from ${orig}cm to ${b.space.ceiling_height_m}m`));
    } else {
      confidences.push(fieldConf("space.ceiling_height_m", 1.0, "confirmed", primarySource));
    }
  } else {
    // Apply industry default
    b.space.ceiling_height_m = 2.8;
    confidences.push(fieldConf("space.ceiling_height_m", 0.5, "inferred", "system_default", true,
      "Default 2.8m applied — no ceiling height provided"));
  }

  // --- NR-003: Normalize wall IDs ---
  for (let i = 0; i < (b.space.walls || []).length; i++) {
    const wall = b.space.walls[i];
    const oldId = wall.id;
    wall.id = normalizeWallId(wall.id);
    if (oldId !== wall.id) {
      confidences.push(fieldConf(`space.walls[${i}].id`, 0.95, "inferred", "system_inference", true,
        `Normalized "${oldId}" → "${wall.id}"`));
    }
    // Normalize wall length: ensure it's in meters
    if (wall.length_m > 100) {
      wall.length_m = wall.length_m / 1000; // was mm
    } else if (wall.length_m > 20) {
      wall.length_m = wall.length_m / 100; // was cm
    }
    confidences.push(fieldConf(`space.walls[${i}].length_m`, wall.length_m > 0 ? 0.95 : 0,
      wall.length_m > 0 ? "confirmed" : "missing", primarySource));
  }

  // --- Normalize entry wall ---
  if (b.space.entry_point?.wall) {
    b.space.entry_point.wall = normalizeWallId(b.space.entry_point.wall);
    confidences.push(fieldConf("space.entry_point.wall", 1.0, "confirmed", primarySource));
  } else {
    confidences.push(fieldConf("space.entry_point.wall", 0, "missing", primarySource));
  }
  if (b.space.entry_point?.width_m > 0) {
    if (b.space.entry_point.width_m > 10) {
      b.space.entry_point.width_m = b.space.entry_point.width_m / 1000; // was mm
    }
    confidences.push(fieldConf("space.entry_point.width_m", 0.95, "confirmed", primarySource));
  } else {
    b.space.entry_point = b.space.entry_point || { wall: "south", width_m: 0.9 };
    if (!b.space.entry_point.width_m || b.space.entry_point.width_m <= 0) {
      b.space.entry_point.width_m = 0.9;
      confidences.push(fieldConf("space.entry_point.width_m", 0.5, "inferred", "system_default", true,
        "Default 0.9m door width applied"));
    }
  }

  // --- NR-004: Normalize materials ---
  if (b.materials.colors && b.materials.colors.length > 0) {
    b.materials.colors = b.materials.colors.map(c => {
      const normalized = normalizeMaterialKey(c);
      return normalized;
    });
    confidences.push(fieldConf("materials.colors", 0.9, "confirmed", primarySource));
  } else {
    confidences.push(fieldConf("materials.colors", 0, "missing", primarySource));
  }

  // --- NR-005: Normalize zones ---
  for (let zi = 0; zi < (b.zones || []).length; zi++) {
    const zone = b.zones[zi];

    // Normalize zone wall assignment
    if (zone.wall) {
      zone.wall = zone.wall.split("+").map(normalizeWallId).join("+");
    }

    // Score zone completeness
    const hasItems = zone.items && zone.items.length > 0;
    const hasDims = zone.dimensions && zone.dimensions.width_m > 0;
    const zoneScore = (hasItems ? 0.5 : 0) + (hasDims ? 0.3 : 0) + (zone.wall ? 0.2 : 0);
    confidences.push(fieldConf(`zones[${zi}]`, zoneScore,
      zoneScore >= 0.8 ? "confirmed" : zoneScore >= 0.5 ? "inferred" : "missing",
      primarySource,
      !hasItems || !hasDims,
      !hasItems ? "Zone has no items defined" : !hasDims ? "Zone has no dimensions" : undefined
    ));

    // NR-005: Normalize zone items
    for (let ii = 0; ii < (zone.items || []).length; ii++) {
      const item = zone.items[ii];
      // Check quantity ambiguity (NR-001 for quantities)
      if (item.quantity && item.quantity > 0) {
        const name = (item.type + " " + (item.subtype || "") + " " + (item.notes || "")).toLowerCase();
        const isPairAmbiguous = (name.includes("sapato") || name.includes("shoe") || name.includes("bota") || name.includes("boot"))
          && !name.includes("par") && !name.includes("pair");
        if (isPairAmbiguous && item.quantity > 10) {
          confidences.push(fieldConf(`zones[${zi}].items[${ii}].quantity`, 0.5, "ambiguous", primarySource, false,
            `"${item.quantity} ${item.type}" — unclear if items or pairs`));
        }
      }
    }
  }

  // --- NR-006: Normalize client name ---
  if (b.client.name && b.client.name.trim().length > 0) {
    b.client.name = b.client.name.trim().toUpperCase();
    confidences.push(fieldConf("client.name", 1.0, "confirmed", primarySource));
  } else {
    confidences.push(fieldConf("client.name", 0, "missing", primarySource));
  }

  // Build normalized output
  const normalized: NormalizedBriefing = {
    ...b,
    _normalization: {
      fieldConfidences: confidences,
      issues: [],       // populated by briefing-issues.ts
      readiness: {      // populated by briefing-readiness.ts
        isReadyForGeneration: false,
        score: 0,
        criticalMissingCount: 0,
        criticalContradictionCount: 0,
        fieldsRequiringConfirmation: [],
        blockingReasons: [],
      },
      normalizedAt: new Date().toISOString(),
      version: 1,
    },
  };

  return normalized;
}
