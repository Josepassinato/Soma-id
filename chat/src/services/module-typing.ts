/**
 * module-typing.ts
 * P0.2 — Centralized module type resolver.
 * Single source of truth for moduleType + moduleSubtype.
 * Used by engine-bridge (at generation) and by renderers (at display).
 */

/* ============================================================
   Module Type Enums
   ============================================================ */

/** Macro functional category */
export type ModuleType =
  | "closet_storage"
  | "closet_display"
  | "kitchen_base"
  | "kitchen_upper"
  | "kitchen_tall"
  | "island_module"
  | "makeup_module"
  | "special_security_module"
  | "utility_module"
  | "unknown";

/** Specific functional subtype */
export type ModuleSubtype =
  // Closet
  | "long_garment"
  | "short_garment"
  | "mixed_garment"
  | "shoe"
  | "boot"
  | "bag"
  | "jewelry"
  | "suitcase"
  | "shelves"
  | "accessories"
  // Kitchen
  | "sink_base"
  | "cooktop_base"
  | "oven_tower"
  | "upper_cabinet"
  | "corner_cabinet"
  | "drawer_bank"
  | "niche"
  | "steamer"
  // Display
  | "glass_display"
  | "led_panel"
  | "mirror_door"
  // Special
  | "gun_safe"
  | "vanity"
  // Fallback
  | "generic";

/** Resolved typing result */
export interface ModuleTyping {
  moduleType: ModuleType;
  moduleSubtype: ModuleSubtype;
  zone: string;
  features: string[];
  usedLegacyFallback: boolean;
}

/* ============================================================
   moduleId → type/subtype mapping (primary source)
   ============================================================ */

interface TypeMapping {
  moduleType: ModuleType;
  moduleSubtype: ModuleSubtype;
}

const MODULE_ID_MAP: Record<string, TypeMapping> = {
  // Closet modules
  closet_cabideiro:      { moduleType: "closet_storage",          moduleSubtype: "long_garment" },
  closet_prateleiras:    { moduleType: "closet_storage",          moduleSubtype: "shelves" },
  closet_sapateira:      { moduleType: "closet_storage",          moduleSubtype: "shoe" },
  closet_vitrine:        { moduleType: "closet_display",          moduleSubtype: "glass_display" },
  closet_maleiro:        { moduleType: "closet_storage",          moduleSubtype: "suitcase" },
  closet_ilha_tampo:     { moduleType: "island_module",           moduleSubtype: "jewelry" },
  closet_armas:          { moduleType: "special_security_module", moduleSubtype: "gun_safe" },
  closet_bancada:        { moduleType: "makeup_module",           moduleSubtype: "vanity" },
  closet_nicho:          { moduleType: "closet_display",          moduleSubtype: "niche" },
  closet_acessorios:     { moduleType: "closet_storage",          moduleSubtype: "accessories" },
  closet_steamer:        { moduleType: "utility_module",          moduleSubtype: "steamer" },
  closet_espelho_porta:  { moduleType: "closet_display",          moduleSubtype: "mirror_door" },
  closet_painel_led:     { moduleType: "closet_display",          moduleSubtype: "led_panel" },
  // Kitchen modules
  base_gaveteiro_3g:     { moduleType: "kitchen_base",            moduleSubtype: "drawer_bank" },
  // Generic
  base_prateleiras:      { moduleType: "closet_storage",          moduleSubtype: "shelves" },
};

/* ============================================================
   Subtype refinement from notes/subtype field
   ============================================================ */

function refineSubtype(baseSubtype: ModuleSubtype, notes: string[], subtype?: string): ModuleSubtype {
  const all = (notes.join(" ") + " " + (subtype || "")).toLowerCase();

  // Cabideiro refinement: long vs short vs mixed
  if (baseSubtype === "long_garment") {
    if (all.includes("short_garment") || all.includes("short")) return "short_garment";
    if (all.includes("mixed") || all.includes("duplo")) return "mixed_garment";
    return "long_garment";
  }

  // Sapateira refinement: shoe vs boot
  if (baseSubtype === "shoe") {
    if (all.includes("boot") || all.includes("bota")) return "boot";
    return "shoe";
  }

  // Vitrine refinement: bag display
  if (baseSubtype === "glass_display") {
    if (all.includes("bag") || all.includes("bolsa")) return "bag";
    return "glass_display";
  }

  // Kitchen drawer_bank refinement from zone context
  if (baseSubtype === "drawer_bank") {
    if (all.includes("pia") || all.includes("sink") || all.includes("cuba")) return "sink_base";
    if (all.includes("cooktop") || all.includes("fogao")) return "cooktop_base";
    if (all.includes("forno") || all.includes("oven") || all.includes("micro")) return "oven_tower";
    if (all.includes("canto") || all.includes("corner") || all.includes("magic")) return "corner_cabinet";
    return "drawer_bank";
  }

  // Shelves refinement for kitchen upper
  if (baseSubtype === "shelves") {
    if (all.includes("forno") || all.includes("oven") || all.includes("micro")) return "oven_tower";
    if (all.includes("superior") || all.includes("aereo") || all.includes("upper")) return "upper_cabinet";
  }

  return baseSubtype;
}

/** Refine moduleType based on refined subtype */
function refineModuleType(baseType: ModuleType, refinedSubtype: ModuleSubtype): ModuleType {
  if (refinedSubtype === "oven_tower") return "kitchen_tall";
  if (refinedSubtype === "upper_cabinet") return "kitchen_upper";
  if (refinedSubtype === "sink_base" || refinedSubtype === "cooktop_base" || refinedSubtype === "corner_cabinet") return "kitchen_base";
  return baseType;
}

/* ============================================================
   Main resolver
   ============================================================ */

/** Extract zone name from notes array */
function extractZone(notes: string[]): string {
  const zoneNote = notes.find(n => n.toLowerCase().startsWith("zona:"));
  return zoneNote ? zoneNote.split(":")[1].trim() : "";
}

/** Extract features from notes array */
function extractFeatures(notes: string[]): string[] {
  const featNote = notes.find(n => n.toLowerCase().startsWith("features:"));
  if (!featNote) return [];
  return featNote.split(":")[1].trim().split(/[,\s]+/).filter(Boolean);
}

/** Extract subtype string from notes */
function extractSubtypeNote(notes: string[]): string {
  const subNote = notes.find(n => n.toLowerCase().startsWith("subtipo:"));
  return subNote ? subNote.split(":")[1].trim() : "";
}

/**
 * Resolve module typing from structured data.
 * Primary: moduleId → MODULE_ID_MAP lookup
 * Refinement: notes/subtype → refineSubtype
 * Fallback: text parsing (legacy, flagged)
 */
export function resolveModuleTyping(
  moduleId: string,
  notes: string[] = [],
  existingType?: ModuleType,
  existingSubtype?: ModuleSubtype,
): ModuleTyping {
  const zone = extractZone(notes);
  const features = extractFeatures(notes);
  const subtypeNote = extractSubtypeNote(notes);

  // If module already has explicit typing, use it (future-proof)
  if (existingType && existingType !== "unknown") {
    return {
      moduleType: existingType,
      moduleSubtype: existingSubtype || "generic",
      zone,
      features,
      usedLegacyFallback: false,
    };
  }

  // Primary: lookup by moduleId
  const mapping = MODULE_ID_MAP[moduleId];
  if (mapping) {
    const refinedSubtype = refineSubtype(mapping.moduleSubtype, notes, subtypeNote);
    const refinedType = refineModuleType(mapping.moduleType, refinedSubtype);
    return {
      moduleType: refinedType,
      moduleSubtype: refinedSubtype,
      zone,
      features,
      usedLegacyFallback: false,
    };
  }

  // Fallback: legacy text parsing (flagged)
  return resolveLegacyFallback(moduleId, notes, zone, features);
}

/** Legacy fallback — parses moduleId + notes as text. Always flagged. */
function resolveLegacyFallback(
  moduleId: string,
  notes: string[],
  zone: string,
  features: string[],
): ModuleTyping {
  const all = (moduleId + " " + notes.join(" ")).toLowerCase();

  let moduleType: ModuleType = "unknown";
  let moduleSubtype: ModuleSubtype = "generic";

  if (all.includes("cabideiro")) { moduleType = "closet_storage"; moduleSubtype = all.includes("short") ? "short_garment" : "long_garment"; }
  else if (all.includes("sapateira") || all.includes("shoe")) { moduleType = "closet_storage"; moduleSubtype = all.includes("boot") || all.includes("bota") ? "boot" : "shoe"; }
  else if (all.includes("vitrine") || all.includes("bolsa") || all.includes("bag")) { moduleType = "closet_display"; moduleSubtype = all.includes("bolsa") || all.includes("bag") ? "bag" : "glass_display"; }
  else if (all.includes("maleiro") || all.includes("mala") || all.includes("suitcase")) { moduleType = "closet_storage"; moduleSubtype = "suitcase"; }
  else if (all.includes("arma") || all.includes("gun")) { moduleType = "special_security_module"; moduleSubtype = "gun_safe"; }
  else if (all.includes("makeup") || all.includes("vanity") || all.includes("bancada")) { moduleType = "makeup_module"; moduleSubtype = "vanity"; }
  else if (all.includes("ilha") || all.includes("island")) { moduleType = "island_module"; moduleSubtype = "jewelry"; }
  else if (all.includes("forno") || all.includes("oven") || all.includes("micro")) { moduleType = "kitchen_tall"; moduleSubtype = "oven_tower"; }
  else if (all.includes("pia") || all.includes("sink") || all.includes("cuba")) { moduleType = "kitchen_base"; moduleSubtype = "sink_base"; }
  else if (all.includes("cooktop") || all.includes("fogao")) { moduleType = "kitchen_base"; moduleSubtype = "cooktop_base"; }
  else if (all.includes("nicho") || all.includes("niche")) { moduleType = "closet_display"; moduleSubtype = "niche"; }
  else if (all.includes("canto") || all.includes("corner")) { moduleType = "kitchen_base"; moduleSubtype = "corner_cabinet"; }
  else if (all.includes("gaveteiro") || all.includes("gaveta")) { moduleType = "kitchen_base"; moduleSubtype = "drawer_bank"; }
  else if (all.includes("prateleira") || all.includes("shelf")) { moduleType = "closet_storage"; moduleSubtype = "shelves"; }

  return { moduleType, moduleSubtype, zone, features, usedLegacyFallback: true };
}
