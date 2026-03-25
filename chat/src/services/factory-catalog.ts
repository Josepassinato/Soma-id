/**
 * factory-catalog.ts
 * P1.1 — Factory Catalog Truth Layer.
 * Single source of truth for materials, hardware, module templates and rules.
 * Loads from MongoDB via backend API, falls back to built-in defaults with diagnostics.
 */

import type {
  FactoryCatalog, CatalogMaterial, CatalogHardware,
  CatalogModuleTemplate, CatalogRule, CatalogDiagnostic, CatalogUsageSummary,
} from "../types.js";

// Re-export types for consumers
export type { CatalogDiagnostic, CatalogUsageSummary, CatalogMaterial, CatalogHardware, FactoryCatalog };

/* ============================================================
   Built-in Default Catalog (fallback when no factory catalog loaded)
   ============================================================ */

const BUILTIN_CATALOG_ID = "builtin-default-v1";
const BUILTIN_CATALOG_VERSION = "1.0.0";

const BUILTIN_MATERIALS: CatalogMaterial[] = [
  { materialId: "mat-lana",       displayName: "Areia Acetinado (Lana)", normalizedName: "lana",       category: "unicolor", colorFamily: "beige",  colorHex: "#e0d5c1", texture: "Satin",     isAvailable: true, catalogVersion: BUILTIN_CATALOG_VERSION },
  { materialId: "mat-lord",       displayName: "Lord (Boa Vista)",       normalizedName: "lord",       category: "unicolor", colorFamily: "blue",   colorHex: "#50617D", texture: "Matt",      isAvailable: true, catalogVersion: BUILTIN_CATALOG_VERSION },
  { materialId: "mat-branco",     displayName: "Branco Supremo Matt",    normalizedName: "branco",     category: "unicolor", colorFamily: "white",  colorHex: "#F5F5F5", texture: "Matt",      isAvailable: true, catalogVersion: BUILTIN_CATALOG_VERSION },
  { materialId: "mat-grafite",    displayName: "Grafite Carbono",        normalizedName: "grafite",    category: "unicolor", colorFamily: "gray",   colorHex: "#4a4a4a", texture: "Matt",      isAvailable: true, catalogVersion: BUILTIN_CATALOG_VERSION },
  { materialId: "mat-freijo",     displayName: "Freijó Puro 2025",       normalizedName: "freijo",     category: "madeirado",colorFamily: "brown",  colorHex: "#8e6c4e", texture: "Natural",   isAvailable: true, catalogVersion: BUILTIN_CATALOG_VERSION },
  { materialId: "mat-carvalho",   displayName: "Carvalho Dover",         normalizedName: "carvalho",   category: "madeirado",colorFamily: "brown",  colorHex: "#c5b49d", texture: "Poro Aberto",isAvailable: true, catalogVersion: BUILTIN_CATALOG_VERSION },
  { materialId: "mat-noce",       displayName: "Noce Autunno",           normalizedName: "noce",       category: "madeirado",colorFamily: "brown",  colorHex: "#5d4037", texture: "Deep Wood", isAvailable: true, catalogVersion: BUILTIN_CATALOG_VERSION },
  { materialId: "mat-sage",       displayName: "Verde Sage 2025",        normalizedName: "sage",       category: "unicolor", colorFamily: "green",  colorHex: "#879b8a", texture: "Matt",      isAvailable: true, catalogVersion: BUILTIN_CATALOG_VERSION },
  { materialId: "mat-branco-tx",  displayName: "Branco TX",              normalizedName: "branco tx",  category: "unicolor", colorFamily: "white",  colorHex: "#f0f0f0", texture: "Texturizado",isAvailable: true, catalogVersion: BUILTIN_CATALOG_VERSION },
  { materialId: "mat-cinza-graf", displayName: "Cinza Grafite",          normalizedName: "cinza grafite",category:"unicolor",colorFamily: "gray",   colorHex: "#4a4a4a", texture: "Matt",      isAvailable: true, catalogVersion: BUILTIN_CATALOG_VERSION },
  { materialId: "mat-mdf6",       displayName: "MDF 6mm (fundo)",        normalizedName: "mdf 6mm",    category: "estrutural",colorFamily: "gray",  colorHex: "#d0d0d0", texture: "Raw",       isAvailable: true, catalogVersion: BUILTIN_CATALOG_VERSION },
];

const BUILTIN_HARDWARE: CatalogHardware[] = [
  { hardwareId: "hw-dobradica",   displayName: "Dobradiça 35mm copo soft-close",         category: "dobradica",  specs: "35mm copo, 110°, soft-close",     costBasis: 4.50,  isAvailable: true },
  { hardwareId: "hw-corredica350",displayName: "Corrediça Telescópica 350mm soft-close", category: "corredica",  specs: "350mm, full extension, soft-close",costBasis: 12.00, isAvailable: true },
  { hardwareId: "hw-corredica450",displayName: "Corrediça Telescópica 450mm soft-close", category: "corredica",  specs: "450mm, full extension, soft-close",costBasis: 15.00, isAvailable: true },
  { hardwareId: "hw-corredica500",displayName: "Corrediça Telescópica 500mm soft-close", category: "corredica",  specs: "500mm, full extension, soft-close",costBasis: 18.00, isAvailable: true },
  { hardwareId: "hw-puxador",     displayName: "Puxador perfil embutido",                category: "puxador",    specs: "Perfil embutido ou tubular",       costBasis: 6.00,  isAvailable: true },
  { hardwareId: "hw-barra25",     displayName: "Barra Cabideiro Oval Cromada 25mm",      category: "cabideiro",  specs: "Oval 25mm + suportes laterais",   costBasis: 12.00, isAvailable: true },
  { hardwareId: "hw-suporte",     displayName: "Suporte Prateleira Invisível",           category: "suporte",    specs: "Pino metálico ou invisível",       costBasis: 0.50,  isAvailable: true },
  { hardwareId: "hw-led-fita",    displayName: "Fita LED branco quente 3000K",           category: "led",        specs: "12V, 3000K, IP20",                costBasis: 8.00,  isAvailable: true },
  { hardwareId: "hw-sensor",      displayName: "Sensor de abertura de porta",            category: "sensor",     specs: "Magnético, acionamento LED",       costBasis: 6.00,  isAvailable: true },
  { hardwareId: "hw-sapateira",   displayName: "Corrediça Sapateira 15° inclinada",      category: "sapateira",  specs: "Telescópica, inclinação 15°",      costBasis: 10.00, isAvailable: true },
  { hardwareId: "hw-pe-regulavel",displayName: "Pé Regulável 100mm",                     category: "pe",         specs: "Regulável, plástico, 100mm",       costBasis: 1.50,  isAvailable: true },
];

const BUILTIN_MODULE_TEMPLATES: CatalogModuleTemplate[] = [
  { templateId: "tpl-cabideiro",     displayName: "Cabideiro",          moduleType: "closet_storage", moduleSubtype: "long_garment",  defaultWidth: 800,  defaultHeight: 2400, defaultDepth: 600, category: "base" },
  { templateId: "tpl-prateleiras",   displayName: "Prateleiras",        moduleType: "closet_storage", moduleSubtype: "shelves",       defaultWidth: 600,  defaultHeight: 2400, defaultDepth: 600, category: "base" },
  { templateId: "tpl-sapateira",     displayName: "Sapateira",          moduleType: "closet_storage", moduleSubtype: "shoe",          defaultWidth: 600,  defaultHeight: 2400, defaultDepth: 350, category: "base" },
  { templateId: "tpl-vitrine",       displayName: "Vitrine Vidro+LED",  moduleType: "closet_display", moduleSubtype: "glass_display", defaultWidth: 500,  defaultHeight: 2000, defaultDepth: 400, category: "base" },
  { templateId: "tpl-gaveteiro",     displayName: "Gaveteiro 3 Gavetas",moduleType: "kitchen_base",   moduleSubtype: "drawer_bank",   defaultWidth: 600,  defaultHeight: 900,  defaultDepth: 580, category: "base" },
  { templateId: "tpl-bancada",       displayName: "Bancada Makeup",     moduleType: "makeup_module",  moduleSubtype: "vanity",        defaultWidth: 1000, defaultHeight: 750,  defaultDepth: 500, category: "base" },
  { templateId: "tpl-maleiro",       displayName: "Maleiro",            moduleType: "closet_storage", moduleSubtype: "suitcase",      defaultWidth: 800,  defaultHeight: 400,  defaultDepth: 600, category: "upper" },
  { templateId: "tpl-ilha",          displayName: "Ilha Central",       moduleType: "island_module",  moduleSubtype: "jewelry",       defaultWidth: 1200, defaultHeight: 900,  defaultDepth: 600, category: "base" },
  { templateId: "tpl-armas",         displayName: "Armário Armas",      moduleType: "special_security_module", moduleSubtype: "gun_safe", defaultWidth: 1200, defaultHeight: 2400, defaultDepth: 600, category: "base" },
  { templateId: "tpl-nicho",         displayName: "Nicho Aberto",       moduleType: "closet_display", moduleSubtype: "niche",         defaultWidth: 500,  defaultHeight: 2400, defaultDepth: 400, category: "base" },
];

/* ============================================================
   Catalog State
   ============================================================ */

let activeCatalog: FactoryCatalog | null = null;

/** Get the active catalog (built-in if none loaded) */
export function getActiveCatalog(): FactoryCatalog {
  if (activeCatalog) return activeCatalog;
  return getBuiltinCatalog();
}

/** Get built-in default catalog */
export function getBuiltinCatalog(): FactoryCatalog {
  return {
    catalogId: BUILTIN_CATALOG_ID,
    catalogName: "SOMA-ID Default Catalog",
    factoryName: "Built-in",
    version: BUILTIN_CATALOG_VERSION,
    status: "active",
    materials: BUILTIN_MATERIALS,
    hardware: BUILTIN_HARDWARE,
    moduleTemplates: BUILTIN_MODULE_TEMPLATES,
    rules: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Load catalog from external source (MongoDB via backend API) */
export async function loadCatalogFromBackend(backendUrl?: string): Promise<FactoryCatalog | null> {
  const url = backendUrl || process.env.BACKEND_URL || "http://localhost:8003/api";
  try {
    const resp = await fetch(`${url}/catalog/materials`);
    if (!resp.ok) return null;
    const materials = await resp.json() as Array<Record<string, unknown>>;

    // Transform backend materials to CatalogMaterial format
    const catalogMats: CatalogMaterial[] = materials.map((m, i) => ({
      materialId: (m.id || m._id || `ext-${i}`) as string,
      displayName: (m.name || "Unknown") as string,
      normalizedName: ((m.name || "") as string).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      category: (m.category || "unicolor") as string,
      colorFamily: "",
      colorHex: (m.color_hex || m.color || "#cccccc") as string,
      texture: (m.texture || "") as string,
      manufacturer: (m.manufacturer || "") as string,
      isAvailable: true,
      catalogVersion: "mongodb-live",
    }));

    const catalog: FactoryCatalog = {
      catalogId: "mongodb-live",
      catalogName: "MongoDB Live Catalog",
      factoryName: "Dynamic",
      version: "live",
      status: "active",
      materials: catalogMats,
      hardware: BUILTIN_HARDWARE,  // hardware still from builtin until DB has it
      moduleTemplates: BUILTIN_MODULE_TEMPLATES,
      rules: [],
      updatedAt: new Date().toISOString(),
    };

    activeCatalog = catalog;
    return catalog;
  } catch {
    return null;
  }
}

/** Set a specific catalog as active */
export function setActiveCatalog(catalog: FactoryCatalog): void {
  activeCatalog = catalog;
}

/* ============================================================
   Catalog Lookups with Diagnostics
   ============================================================ */

/** Lookup material by name with diagnostic tracking */
export function lookupMaterial(name: string, diagnostics: CatalogDiagnostic[]): CatalogMaterial | null {
  const catalog = getActiveCatalog();
  const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // Exact match
  let found = catalog.materials.find(m => m.normalizedName === normalized);

  // Partial match
  if (!found) {
    found = catalog.materials.find(m => m.normalizedName.includes(normalized) || normalized.includes(m.normalizedName));
  }

  if (found) {
    diagnostics.push({
      entityType: "material",
      entityName: name,
      source: catalog.catalogId === BUILTIN_CATALOG_ID ? "fallback" : "catalog",
      catalogId: catalog.catalogId,
      catalogVersion: catalog.version,
    });
    return found;
  }

  // Not found — hardcoded fallback
  diagnostics.push({
    entityType: "material",
    entityName: name,
    source: "hardcoded",
    notes: `Material "${name}" not found in catalog ${catalog.catalogId}`,
  });
  return null;
}

/** Lookup hardware by category */
export function lookupHardware(category: string, diagnostics: CatalogDiagnostic[]): CatalogHardware | null {
  const catalog = getActiveCatalog();
  const normalized = category.toLowerCase().trim();
  const found = catalog.hardware.find(h => h.category === normalized || h.displayName.toLowerCase().includes(normalized));

  if (found) {
    diagnostics.push({
      entityType: "hardware",
      entityName: category,
      source: catalog.catalogId === BUILTIN_CATALOG_ID ? "fallback" : "catalog",
      catalogId: catalog.catalogId,
      catalogVersion: catalog.version,
    });
    return found;
  }

  diagnostics.push({
    entityType: "hardware",
    entityName: category,
    source: "hardcoded",
    notes: `Hardware "${category}" not found in catalog`,
  });
  return null;
}

/** Lookup module template by type+subtype */
export function lookupModuleTemplate(moduleType: string, moduleSubtype: string, diagnostics: CatalogDiagnostic[]): CatalogModuleTemplate | null {
  const catalog = getActiveCatalog();
  const found = catalog.moduleTemplates.find(t =>
    t.moduleType === moduleType && t.moduleSubtype === moduleSubtype
  ) || catalog.moduleTemplates.find(t => t.moduleSubtype === moduleSubtype);

  if (found) {
    diagnostics.push({
      entityType: "module_template",
      entityName: `${moduleType}/${moduleSubtype}`,
      source: catalog.catalogId === BUILTIN_CATALOG_ID ? "fallback" : "catalog",
      catalogId: catalog.catalogId,
      catalogVersion: catalog.version,
    });
    return found;
  }

  diagnostics.push({
    entityType: "module_template",
    entityName: `${moduleType}/${moduleSubtype}`,
    source: "hardcoded",
    notes: "No template found in catalog",
  });
  return null;
}

/* ============================================================
   Usage Summary
   ============================================================ */

export function buildCatalogUsageSummary(diagnostics: CatalogDiagnostic[]): CatalogUsageSummary {
  const catalog = getActiveCatalog();
  return {
    catalogId: catalog.catalogId,
    catalogVersion: catalog.version,
    catalogName: catalog.catalogName,
    totalLookups: diagnostics.length,
    catalogHits: diagnostics.filter(d => d.source === "catalog").length,
    fallbackHits: diagnostics.filter(d => d.source === "fallback").length,
    hardcodedHits: diagnostics.filter(d => d.source === "hardcoded").length,
    diagnostics,
  };
}
