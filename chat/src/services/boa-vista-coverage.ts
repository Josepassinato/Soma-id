/**
 * boa-vista-coverage.ts
 * P2.3 — Boa Vista Operationalization.
 * Real families, compatibility matrix, restrictions, and coverage diagnostics.
 * Makes Boa Vista the dominant operational grammar of the system.
 */

import type { CatalogMaterial, CatalogHardware } from "./factory-catalog.js";

/* ============================================================
   Boa Vista Product Families
   ============================================================ */

export interface BoaVistaProductFamily {
  familyId: string;
  displayName: string;
  boaVistaLine: string;         // "Linha Essencial", "Linha Premium", etc.
  environmentType: string;       // "closet", "kitchen", "universal"
  moduleType: string;
  moduleSubtype: string;
  dimensionRules: {
    widthMin: number; widthMax: number; widthStep: number;
    heightMin: number; heightMax: number;
    depthMin: number; depthMax: number;
  };
  allowedMaterials: string[];    // materialIds from Boa Vista catalog
  allowedHardware: string[];     // hardwareIds
  pricingReference: {
    basePrice: number;           // USD base price per module
    perLinearMeter?: number;     // additional per linear meter
    currency: string;
  };
}

export interface BoaVistaCompatibilityRule {
  ruleId: string;
  scope: "material_hardware" | "material_module" | "hardware_module" | "module_module";
  severity: "block" | "warn";
  description: string;
  condition: {
    entityA: string;             // materialId, hardwareId, or familyId
    entityB: string;
    relationship: "forbidden" | "requires" | "recommended";
  };
}

export interface BoaVistaCoverageSummary {
  projectId: string;
  totalModules: number;
  coveredByBoaVista: number;
  fallbackGeneric: number;
  coveragePercent: number;
  materialsCovered: number;
  materialsTotal: number;
  hardwareCovered: number;
  hardwareTotal: number;
  compatibilityViolations: BoaVistaCompatibilityRule[];
  diagnosticNotes: string[];
}

/* ============================================================
   Boa Vista Materials (real catalog)
   ============================================================ */

export const BOA_VISTA_MATERIALS: CatalogMaterial[] = [
  { materialId: "bv-lana",        displayName: "BV Lana (Areia Acetinado)", normalizedName: "lana",          category: "unicolor",  colorFamily: "beige",  colorHex: "#e0d5c1", texture: "Satin",       isAvailable: true, manufacturer: "Boa Vista", catalogVersion: "BV-2025" },
  { materialId: "bv-lord",        displayName: "BV Lord",                   normalizedName: "lord",          category: "unicolor",  colorFamily: "blue",   colorHex: "#50617D", texture: "Matt",        isAvailable: true, manufacturer: "Boa Vista", catalogVersion: "BV-2025" },
  { materialId: "bv-branco-neve", displayName: "BV Branco Neve",            normalizedName: "branco neve",   category: "unicolor",  colorFamily: "white",  colorHex: "#F5F5F5", texture: "Matt",        isAvailable: true, manufacturer: "Boa Vista", catalogVersion: "BV-2025" },
  { materialId: "bv-grafite",     displayName: "BV Grafite Carbono",        normalizedName: "grafite",       category: "unicolor",  colorFamily: "gray",   colorHex: "#4a4a4a", texture: "Matt",        isAvailable: true, manufacturer: "Boa Vista", catalogVersion: "BV-2025" },
  { materialId: "bv-freijo",      displayName: "BV Freijó Puro",            normalizedName: "freijo",        category: "madeirado", colorFamily: "brown",  colorHex: "#8e6c4e", texture: "Natural",     isAvailable: true, manufacturer: "Boa Vista", catalogVersion: "BV-2025" },
  { materialId: "bv-carvalho",    displayName: "BV Carvalho Dover",         normalizedName: "carvalho",      category: "madeirado", colorFamily: "brown",  colorHex: "#c5b49d", texture: "Poro Aberto", isAvailable: true, manufacturer: "Boa Vista", catalogVersion: "BV-2025" },
  { materialId: "bv-noce",        displayName: "BV Noce Autunno",           normalizedName: "noce",          category: "madeirado", colorFamily: "brown",  colorHex: "#5d4037", texture: "Deep Wood",   isAvailable: true, manufacturer: "Boa Vista", catalogVersion: "BV-2025" },
  { materialId: "bv-sage",        displayName: "BV Verde Sage",             normalizedName: "sage",          category: "unicolor",  colorFamily: "green",  colorHex: "#879b8a", texture: "Matt",        isAvailable: true, manufacturer: "Boa Vista", catalogVersion: "BV-2025" },
  { materialId: "bv-argila",      displayName: "BV Argila",                 normalizedName: "argila",        category: "unicolor",  colorFamily: "beige",  colorHex: "#c4b09a", texture: "Matt",        isAvailable: true, manufacturer: "Boa Vista", catalogVersion: "BV-2025" },
  { materialId: "bv-naval",       displayName: "BV Azul Naval",             normalizedName: "naval",         category: "unicolor",  colorFamily: "blue",   colorHex: "#2c3e50", texture: "Matt",        isAvailable: true, manufacturer: "Boa Vista", catalogVersion: "BV-2025" },
  { materialId: "bv-preto",       displayName: "BV Preto Intenso",          normalizedName: "preto",         category: "unicolor",  colorFamily: "black",  colorHex: "#1a1a1a", texture: "Matt",        isAvailable: true, manufacturer: "Boa Vista", catalogVersion: "BV-2025" },
  { materialId: "bv-mdf6",        displayName: "BV MDF 6mm Fundo",          normalizedName: "mdf 6mm",       category: "estrutural",colorFamily: "gray",   colorHex: "#d0d0d0", texture: "Raw",         isAvailable: true, manufacturer: "Boa Vista", catalogVersion: "BV-2025" },
];

/* ============================================================
   Boa Vista Hardware (real specifications)
   ============================================================ */

export const BOA_VISTA_HARDWARE: CatalogHardware[] = [
  { hardwareId: "bv-hw-blum110",    displayName: "Blum 110° Soft-Close",           category: "dobradica",  specs: "35mm copo, 110°, soft-close Blum",  costBasis: 5.50,  isAvailable: true },
  { hardwareId: "bv-hw-blum155",    displayName: "Blum 155° Dobradiça Ampla",      category: "dobradica",  specs: "35mm, 155° abertura total",         costBasis: 8.00,  isAvailable: true },
  { hardwareId: "bv-hw-corr350",    displayName: "Corrediça Hettich 350mm",        category: "corredica",  specs: "350mm, full-ext, soft-close",       costBasis: 14.00, isAvailable: true },
  { hardwareId: "bv-hw-corr450",    displayName: "Corrediça Hettich 450mm",        category: "corredica",  specs: "450mm, full-ext, soft-close",       costBasis: 17.00, isAvailable: true },
  { hardwareId: "bv-hw-corr500",    displayName: "Corrediça Hettich 500mm",        category: "corredica",  specs: "500mm, full-ext, soft-close",       costBasis: 20.00, isAvailable: true },
  { hardwareId: "bv-hw-puxemb",     displayName: "Puxador Perfil Embutido BV",     category: "puxador",    specs: "Perfil embutido alumínio anodizado",costBasis: 8.00,  isAvailable: true },
  { hardwareId: "bv-hw-puxtub",     displayName: "Puxador Tubular Inox BV",        category: "puxador",    specs: "Tubular inox escovado 128mm",       costBasis: 12.00, isAvailable: true },
  { hardwareId: "bv-hw-barra25",    displayName: "Barra Oval Cromada 25mm BV",     category: "cabideiro",  specs: "Oval 25mm cromada + suportes",      costBasis: 15.00, isAvailable: true },
  { hardwareId: "bv-hw-led3000",    displayName: "Fita LED 3000K BV",              category: "led",        specs: "12V, 3000K, IP20, perfil alumínio", costBasis: 10.00, isAvailable: true },
  { hardwareId: "bv-hw-sensor",     displayName: "Sensor Porta BV",                category: "sensor",     specs: "Magnético, acionamento LED",        costBasis: 7.00,  isAvailable: true },
  { hardwareId: "bv-hw-sapinc",     displayName: "Sapateira Inclinada 15° BV",     category: "sapateira",  specs: "Telescópica, inclinação 15°",       costBasis: 12.00, isAvailable: true },
  { hardwareId: "bv-hw-pe100",      displayName: "Pé Regulável 100mm BV",          category: "pe",         specs: "Regulável, plástico/inox, 100mm",   costBasis: 2.00,  isAvailable: true },
  { hardwareId: "bv-hw-suporte",    displayName: "Suporte Prateleira Invisível BV",category: "suporte",    specs: "Pino metálico invisível",           costBasis: 0.75,  isAvailable: true },
];

/* ============================================================
   Boa Vista Product Families
   ============================================================ */

export const BOA_VISTA_FAMILIES: BoaVistaProductFamily[] = [
  // --- Closet families ---
  {
    familyId: "bvf-cabideiro-longo", displayName: "Cabideiro Vestidos Longos BV",
    boaVistaLine: "Linha Closet Premium", environmentType: "closet",
    moduleType: "closet_storage", moduleSubtype: "long_garment",
    dimensionRules: { widthMin: 600, widthMax: 1200, widthStep: 50, heightMin: 2000, heightMax: 2400, depthMin: 550, depthMax: 620 },
    allowedMaterials: ["bv-lana", "bv-lord", "bv-freijo", "bv-carvalho", "bv-noce", "bv-branco-neve", "bv-grafite", "bv-sage"],
    allowedHardware: ["bv-hw-barra25", "bv-hw-suporte", "bv-hw-blum110", "bv-hw-led3000"],
    pricingReference: { basePrice: 450, perLinearMeter: 180, currency: "USD" },
  },
  {
    familyId: "bvf-sapateira", displayName: "Sapateira BV",
    boaVistaLine: "Linha Closet Premium", environmentType: "closet",
    moduleType: "closet_storage", moduleSubtype: "shoe",
    dimensionRules: { widthMin: 500, widthMax: 1200, widthStep: 50, heightMin: 1200, heightMax: 2400, depthMin: 300, depthMax: 380 },
    allowedMaterials: ["bv-lana", "bv-lord", "bv-freijo", "bv-carvalho", "bv-noce", "bv-branco-neve", "bv-grafite"],
    allowedHardware: ["bv-hw-sapinc", "bv-hw-suporte"],
    pricingReference: { basePrice: 380, perLinearMeter: 150, currency: "USD" },
  },
  {
    familyId: "bvf-vitrine", displayName: "Vitrine Vidro + LED BV",
    boaVistaLine: "Linha Closet Premium", environmentType: "closet",
    moduleType: "closet_display", moduleSubtype: "glass_display",
    dimensionRules: { widthMin: 400, widthMax: 1200, widthStep: 50, heightMin: 1200, heightMax: 2200, depthMin: 350, depthMax: 450 },
    allowedMaterials: ["bv-lana", "bv-lord", "bv-freijo", "bv-carvalho", "bv-noce", "bv-branco-neve"],
    allowedHardware: ["bv-hw-led3000", "bv-hw-suporte", "bv-hw-blum110", "bv-hw-sensor"],
    pricingReference: { basePrice: 520, perLinearMeter: 200, currency: "USD" },
  },
  {
    familyId: "bvf-gaveteiro", displayName: "Gaveteiro BV",
    boaVistaLine: "Linha Universal", environmentType: "universal",
    moduleType: "closet_storage", moduleSubtype: "drawer_bank",
    dimensionRules: { widthMin: 400, widthMax: 900, widthStep: 50, heightMin: 600, heightMax: 1100, depthMin: 480, depthMax: 580 },
    allowedMaterials: ["bv-lana", "bv-lord", "bv-freijo", "bv-carvalho", "bv-noce", "bv-branco-neve", "bv-grafite", "bv-sage", "bv-argila", "bv-naval", "bv-preto"],
    allowedHardware: ["bv-hw-corr450", "bv-hw-corr500", "bv-hw-puxemb", "bv-hw-puxtub"],
    pricingReference: { basePrice: 320, perLinearMeter: 120, currency: "USD" },
  },
  {
    familyId: "bvf-maleiro", displayName: "Maleiro BV",
    boaVistaLine: "Linha Closet Premium", environmentType: "closet",
    moduleType: "closet_storage", moduleSubtype: "suitcase",
    dimensionRules: { widthMin: 600, widthMax: 1500, widthStep: 50, heightMin: 300, heightMax: 500, depthMin: 550, depthMax: 620 },
    allowedMaterials: ["bv-lana", "bv-lord", "bv-freijo", "bv-carvalho", "bv-noce", "bv-branco-neve", "bv-grafite"],
    allowedHardware: ["bv-hw-blum110", "bv-hw-puxemb"],
    pricingReference: { basePrice: 180, currency: "USD" },
  },
  // --- Kitchen families ---
  {
    familyId: "bvf-pia-base", displayName: "Bancada Pia BV",
    boaVistaLine: "Linha Cozinha", environmentType: "kitchen",
    moduleType: "kitchen_base", moduleSubtype: "sink_base",
    dimensionRules: { widthMin: 600, widthMax: 1200, widthStep: 50, heightMin: 850, heightMax: 920, depthMin: 550, depthMax: 620 },
    allowedMaterials: ["bv-lana", "bv-lord", "bv-branco-neve", "bv-grafite", "bv-preto"],
    allowedHardware: ["bv-hw-blum110", "bv-hw-puxemb", "bv-hw-puxtub", "bv-hw-pe100"],
    pricingReference: { basePrice: 350, perLinearMeter: 140, currency: "USD" },
  },
  {
    familyId: "bvf-torre-forno", displayName: "Torre Forno/Micro BV",
    boaVistaLine: "Linha Cozinha", environmentType: "kitchen",
    moduleType: "kitchen_tall", moduleSubtype: "oven_tower",
    dimensionRules: { widthMin: 560, widthMax: 680, widthStep: 10, heightMin: 2000, heightMax: 2400, depthMin: 550, depthMax: 620 },
    allowedMaterials: ["bv-lana", "bv-lord", "bv-branco-neve", "bv-grafite", "bv-preto"],
    allowedHardware: ["bv-hw-blum110", "bv-hw-puxemb", "bv-hw-suporte"],
    pricingReference: { basePrice: 580, currency: "USD" },
  },
  {
    familyId: "bvf-aereo", displayName: "Armário Superior BV",
    boaVistaLine: "Linha Cozinha", environmentType: "kitchen",
    moduleType: "kitchen_upper", moduleSubtype: "upper_cabinet",
    dimensionRules: { widthMin: 400, widthMax: 1200, widthStep: 50, heightMin: 500, heightMax: 900, depthMin: 300, depthMax: 380 },
    allowedMaterials: ["bv-lana", "bv-lord", "bv-branco-neve", "bv-grafite"],
    allowedHardware: ["bv-hw-blum110", "bv-hw-blum155", "bv-hw-puxemb", "bv-hw-suporte", "bv-hw-led3000"],
    pricingReference: { basePrice: 280, perLinearMeter: 110, currency: "USD" },
  },
];

/* ============================================================
   Compatibility Rules
   ============================================================ */

export const BOA_VISTA_COMPATIBILITY: BoaVistaCompatibilityRule[] = [
  {
    ruleId: "bvc-001", scope: "material_hardware", severity: "warn",
    description: "Madeirado com puxador tubular inox pode ter contraste visual forte",
    condition: { entityA: "madeirado", entityB: "bv-hw-puxtub", relationship: "recommended" },
  },
  {
    ruleId: "bvc-002", scope: "material_module", severity: "block",
    description: "BV Preto Intenso nao disponivel para closet premium (apenas cozinha/universal)",
    condition: { entityA: "bv-preto", entityB: "bvf-cabideiro-longo", relationship: "forbidden" },
  },
  {
    ruleId: "bvc-003", scope: "material_module", severity: "block",
    description: "BV Argila nao disponivel para cozinha",
    condition: { entityA: "bv-argila", entityB: "bvf-pia-base", relationship: "forbidden" },
  },
  {
    ruleId: "bvc-004", scope: "hardware_module", severity: "warn",
    description: "Dobradica 155° recomendada apenas para aereos (abertura total)",
    condition: { entityA: "bv-hw-blum155", entityB: "bvf-gaveteiro", relationship: "forbidden" },
  },
];

/* ============================================================
   Family Resolution
   ============================================================ */

/** Find Boa Vista family by moduleSubtype */
export function findBoaVistaFamily(moduleSubtype: string): BoaVistaProductFamily | null {
  return BOA_VISTA_FAMILIES.find(f => f.moduleSubtype === moduleSubtype) || null;
}

/** Check if material is allowed for a family */
export function isMaterialAllowed(family: BoaVistaProductFamily, materialId: string): boolean {
  return family.allowedMaterials.includes(materialId);
}

/** Find Boa Vista material by normalized name */
export function findBoaVistaMaterial(name: string): CatalogMaterial | null {
  const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  return BOA_VISTA_MATERIALS.find(m =>
    m.normalizedName === normalized ||
    m.normalizedName.includes(normalized) ||
    normalized.includes(m.normalizedName)
  ) || null;
}

/** Check compatibility rules */
export function checkCompatibility(
  materialIds: string[],
  hardwareIds: string[],
  familyId: string,
): BoaVistaCompatibilityRule[] {
  const violations: BoaVistaCompatibilityRule[] = [];

  for (const rule of BOA_VISTA_COMPATIBILITY) {
    if (rule.condition.relationship === "forbidden") {
      const aMatches = materialIds.includes(rule.condition.entityA) ||
        materialIds.some(m => BOA_VISTA_MATERIALS.find(bm => bm.materialId === m)?.category === rule.condition.entityA);
      const bMatches = hardwareIds.includes(rule.condition.entityB) || familyId === rule.condition.entityB;

      if (aMatches && bMatches) {
        violations.push(rule);
      }
    }
  }

  return violations;
}

/* ============================================================
   Coverage Diagnostics
   ============================================================ */

/** Assess Boa Vista coverage for a project */
export function assessBoaVistaCoverage(
  projectId: string,
  modules: Array<{ moduleSubtype?: string; name: string; traceId?: string }>,
  materials: string[],
  hardware: string[],
): BoaVistaCoverageSummary {
  let covered = 0;
  let fallback = 0;
  const notes: string[] = [];

  for (const mod of modules) {
    const family = findBoaVistaFamily((mod.moduleSubtype || "") as string);
    if (family) {
      covered++;
    } else {
      fallback++;
      notes.push(`Modulo ${mod.name} (${mod.traceId || "?"}) sem familia Boa Vista — fallback generico`);
    }
  }

  let matCovered = 0;
  for (const mat of materials) {
    if (findBoaVistaMaterial(mat)) matCovered++;
    else notes.push(`Material "${mat}" nao encontrado no catalogo Boa Vista`);
  }

  let hwCovered = 0;
  for (const hw of hardware) {
    const found = BOA_VISTA_HARDWARE.some(bh =>
      bh.category === hw.toLowerCase() || bh.hardwareId === hw
    );
    if (found) hwCovered++;
  }

  // Check compatibility
  const matIds = materials.map(m => findBoaVistaMaterial(m)?.materialId || "").filter(Boolean);
  const familyIds = modules.map(m => findBoaVistaFamily((m.moduleSubtype || "") as string)?.familyId || "").filter(Boolean);
  const violations: BoaVistaCompatibilityRule[] = [];
  for (const fid of familyIds) {
    violations.push(...checkCompatibility(matIds, [], fid));
  }

  const total = modules.length || 1;
  const coveragePercent = Math.round((covered / total) * 100);

  if (coveragePercent === 100) {
    notes.unshift("100% cobertura Boa Vista — todos os modulos sao familias reais BV");
  } else {
    notes.unshift(`${coveragePercent}% cobertura Boa Vista — ${fallback} modulo(s) em fallback generico`);
  }

  return {
    projectId,
    totalModules: modules.length,
    coveredByBoaVista: covered,
    fallbackGeneric: fallback,
    coveragePercent,
    materialsCovered: matCovered,
    materialsTotal: materials.length,
    hardwareCovered: hwCovered,
    hardwareTotal: hardware.length,
    compatibilityViolations: violations,
    diagnosticNotes: notes,
  };
}
