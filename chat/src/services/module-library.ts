/**
 * module-library.ts
 * P1.2 — Parametric Module Library.
 * Templates for closet and kitchen modules with dimension rules,
 * hardware compatibility, and BOM recipes.
 */

import type { CatalogHardware } from "./factory-catalog.js";

/* ============================================================
   Types
   ============================================================ */

export interface ModuleDimensionRule {
  widthMin: number;
  widthMax: number;
  widthStep: number;     // increment step (e.g., 50mm)
  heightMin: number;
  heightMax: number;
  depthMin: number;
  depthMax: number;
}

export interface ModuleConstructionProfile {
  bodyThickness: number;        // 18mm standard
  backThickness: number;        // 6mm standard
  shelfThickness: number;       // 18mm
  drawerFrontThickness: number; // 18mm
  edgeBandSides: string;        // "1L1C", "4L", etc.
}

export interface ModuleBomRecipe {
  pieces: Array<{
    name: string;           // "Lateral", "Tampo/Base", "Fundo", "Prateleira", "Frente Gaveta"
    quantity: number | "computed"; // fixed or computed from dimensions
    widthFormula: string;   // "height - 2*bodyThickness", "width", etc.
    heightFormula: string;  // "depth", "width - 2*bodyThickness", etc.
    material: "body" | "door" | "back" | "body"; // which material to use
    edgeBand: string;
    grainDirection: "vertical" | "horizontal" | "none";
  }>;
}

export interface ModuleTemplate {
  templateId: string;
  displayName: string;
  moduleType: string;       // from ModuleType enum
  moduleSubtype: string;    // from ModuleSubtype enum
  environmentType: string;  // "closet", "kitchen", "bathroom", "universal"
  category: string;         // "base", "upper", "tall", "freestanding"

  // Dimensions
  defaultWidth: number;
  defaultHeight: number;
  defaultDepth: number;
  dimensionRules: ModuleDimensionRule;

  // Construction
  construction: ModuleConstructionProfile;

  // Hardware
  requiredHardware: string[];    // hardware categories required
  optionalHardware: string[];    // hardware categories optional

  // Width computation rule
  widthMode: "fixed" | "quantity_based" | "zone_based";
  widthPerUnit?: number;         // for quantity_based: mm per item

  // BOM recipe
  bomRecipe: ModuleBomRecipe;
}

export interface ConfiguredModule {
  templateId: string;
  template: ModuleTemplate;
  resolvedWidth: number;
  resolvedHeight: number;
  resolvedDepth: number;
  usedParametricTemplate: boolean;
}

/* ============================================================
   Closet Module Templates
   ============================================================ */

const CLOSET_TEMPLATES: ModuleTemplate[] = [
  {
    templateId: "closet-long-hanging",
    displayName: "Cabideiro Vestidos Longos",
    moduleType: "closet_storage", moduleSubtype: "long_garment",
    environmentType: "closet", category: "base",
    defaultWidth: 1000, defaultHeight: 2400, defaultDepth: 600,
    dimensionRules: { widthMin: 600, widthMax: 1500, widthStep: 50, heightMin: 1800, heightMax: 2400, depthMin: 530, depthMax: 650 },
    construction: { bodyThickness: 18, backThickness: 6, shelfThickness: 18, drawerFrontThickness: 18, edgeBandSides: "1L1C" },
    requiredHardware: ["cabideiro", "suporte"], optionalHardware: ["led", "dobradica"],
    widthMode: "fixed",
    bomRecipe: { pieces: [
      { name: "Lateral", quantity: 2, widthFormula: "height-18", heightFormula: "depth", material: "body", edgeBand: "1L1C", grainDirection: "none" },
      { name: "Tampo/Base", quantity: 2, widthFormula: "width-36", heightFormula: "depth", material: "body", edgeBand: "1L", grainDirection: "none" },
      { name: "Fundo", quantity: 1, widthFormula: "height-36", heightFormula: "width-36", material: "back", edgeBand: "none", grainDirection: "none" },
    ]},
  },
  {
    templateId: "closet-short-hanging",
    displayName: "Cabideiro Camisas/Calças",
    moduleType: "closet_storage", moduleSubtype: "short_garment",
    environmentType: "closet", category: "base",
    defaultWidth: 800, defaultHeight: 2400, defaultDepth: 600,
    dimensionRules: { widthMin: 500, widthMax: 1200, widthStep: 50, heightMin: 1800, heightMax: 2400, depthMin: 530, depthMax: 650 },
    construction: { bodyThickness: 18, backThickness: 6, shelfThickness: 18, drawerFrontThickness: 18, edgeBandSides: "1L1C" },
    requiredHardware: ["cabideiro", "suporte"], optionalHardware: ["led"],
    widthMode: "fixed",
    bomRecipe: { pieces: [
      { name: "Lateral", quantity: 2, widthFormula: "height-18", heightFormula: "depth", material: "body", edgeBand: "1L1C", grainDirection: "none" },
      { name: "Tampo/Base", quantity: 2, widthFormula: "width-36", heightFormula: "depth", material: "body", edgeBand: "1L", grainDirection: "none" },
      { name: "Fundo", quantity: 1, widthFormula: "height-36", heightFormula: "width-36", material: "back", edgeBand: "none", grainDirection: "none" },
      { name: "Prateleira", quantity: 3, widthFormula: "width-36", heightFormula: "depth-10", material: "body", edgeBand: "1L", grainDirection: "none" },
    ]},
  },
  {
    templateId: "closet-shoe-rack",
    displayName: "Sapateira",
    moduleType: "closet_storage", moduleSubtype: "shoe",
    environmentType: "closet", category: "base",
    defaultWidth: 600, defaultHeight: 2400, defaultDepth: 350,
    dimensionRules: { widthMin: 400, widthMax: 1500, widthStep: 50, heightMin: 1200, heightMax: 2400, depthMin: 300, depthMax: 400 },
    construction: { bodyThickness: 18, backThickness: 6, shelfThickness: 18, drawerFrontThickness: 18, edgeBandSides: "1L1C" },
    requiredHardware: ["sapateira", "suporte"], optionalHardware: [],
    widthMode: "quantity_based", widthPerUnit: 50,
    bomRecipe: { pieces: [
      { name: "Lateral", quantity: 2, widthFormula: "height-18", heightFormula: "depth", material: "body", edgeBand: "1L1C", grainDirection: "none" },
      { name: "Tampo/Base", quantity: 2, widthFormula: "width-36", heightFormula: "depth", material: "body", edgeBand: "1L", grainDirection: "none" },
      { name: "Fundo", quantity: 1, widthFormula: "height-36", heightFormula: "width-36", material: "back", edgeBand: "none", grainDirection: "none" },
      { name: "Prateleira Inclinada", quantity: "computed", widthFormula: "width-36", heightFormula: "depth-10", material: "body", edgeBand: "1L", grainDirection: "none" },
    ]},
  },
  {
    templateId: "closet-display-glass",
    displayName: "Vitrine Vidro + LED",
    moduleType: "closet_display", moduleSubtype: "glass_display",
    environmentType: "closet", category: "base",
    defaultWidth: 500, defaultHeight: 2000, defaultDepth: 400,
    dimensionRules: { widthMin: 400, widthMax: 1500, widthStep: 50, heightMin: 1200, heightMax: 2200, depthMin: 350, depthMax: 500 },
    construction: { bodyThickness: 18, backThickness: 6, shelfThickness: 18, drawerFrontThickness: 18, edgeBandSides: "1L1C" },
    requiredHardware: ["led", "suporte"], optionalHardware: ["dobradica", "sensor"],
    widthMode: "quantity_based", widthPerUnit: 100,
    bomRecipe: { pieces: [
      { name: "Lateral", quantity: 2, widthFormula: "height-18", heightFormula: "depth", material: "body", edgeBand: "1L1C", grainDirection: "none" },
      { name: "Tampo/Base", quantity: 2, widthFormula: "width-36", heightFormula: "depth", material: "body", edgeBand: "1L", grainDirection: "none" },
      { name: "Fundo", quantity: 1, widthFormula: "height-36", heightFormula: "width-36", material: "back", edgeBand: "none", grainDirection: "none" },
    ]},
  },
  {
    templateId: "closet-drawer-bank",
    displayName: "Gaveteiro",
    moduleType: "closet_storage", moduleSubtype: "drawer_bank",
    environmentType: "universal", category: "base",
    defaultWidth: 600, defaultHeight: 900, defaultDepth: 580,
    dimensionRules: { widthMin: 400, widthMax: 900, widthStep: 50, heightMin: 600, heightMax: 1200, depthMin: 450, depthMax: 600 },
    construction: { bodyThickness: 18, backThickness: 6, shelfThickness: 18, drawerFrontThickness: 18, edgeBandSides: "1L1C" },
    requiredHardware: ["corredica", "puxador"], optionalHardware: [],
    widthMode: "fixed",
    bomRecipe: { pieces: [
      { name: "Lateral", quantity: 2, widthFormula: "height-18", heightFormula: "depth", material: "body", edgeBand: "1L1C", grainDirection: "none" },
      { name: "Tampo/Base", quantity: 2, widthFormula: "width-36", heightFormula: "depth", material: "body", edgeBand: "1L", grainDirection: "none" },
      { name: "Fundo", quantity: 1, widthFormula: "height-36", heightFormula: "width-36", material: "back", edgeBand: "none", grainDirection: "none" },
      { name: "Frente Gaveta", quantity: 3, widthFormula: "width-3", heightFormula: "computed", material: "door", edgeBand: "4L", grainDirection: "horizontal" },
    ]},
  },
  {
    templateId: "closet-maleiro",
    displayName: "Maleiro",
    moduleType: "closet_storage", moduleSubtype: "suitcase",
    environmentType: "closet", category: "upper",
    defaultWidth: 800, defaultHeight: 400, defaultDepth: 600,
    dimensionRules: { widthMin: 600, widthMax: 1500, widthStep: 50, heightMin: 300, heightMax: 500, depthMin: 500, depthMax: 650 },
    construction: { bodyThickness: 18, backThickness: 6, shelfThickness: 18, drawerFrontThickness: 18, edgeBandSides: "1L1C" },
    requiredHardware: ["dobradica"], optionalHardware: [],
    widthMode: "fixed",
    bomRecipe: { pieces: [
      { name: "Lateral", quantity: 2, widthFormula: "height-18", heightFormula: "depth", material: "body", edgeBand: "1L1C", grainDirection: "none" },
      { name: "Tampo/Base", quantity: 2, widthFormula: "width-36", heightFormula: "depth", material: "body", edgeBand: "1L", grainDirection: "none" },
      { name: "Fundo", quantity: 1, widthFormula: "height-36", heightFormula: "width-36", material: "back", edgeBand: "none", grainDirection: "none" },
    ]},
  },
];

/* ============================================================
   Kitchen Module Templates
   ============================================================ */

const KITCHEN_TEMPLATES: ModuleTemplate[] = [
  {
    templateId: "kitchen-sink-base",
    displayName: "Bancada Pia",
    moduleType: "kitchen_base", moduleSubtype: "sink_base",
    environmentType: "kitchen", category: "base",
    defaultWidth: 800, defaultHeight: 900, defaultDepth: 600,
    dimensionRules: { widthMin: 600, widthMax: 1200, widthStep: 50, heightMin: 850, heightMax: 950, depthMin: 550, depthMax: 650 },
    construction: { bodyThickness: 18, backThickness: 6, shelfThickness: 18, drawerFrontThickness: 18, edgeBandSides: "1L1C" },
    requiredHardware: ["dobradica", "puxador"], optionalHardware: ["pe"],
    widthMode: "fixed",
    bomRecipe: { pieces: [
      { name: "Lateral", quantity: 2, widthFormula: "height-18", heightFormula: "depth", material: "body", edgeBand: "1L1C", grainDirection: "none" },
      { name: "Tampo/Base", quantity: 1, widthFormula: "width-36", heightFormula: "depth", material: "body", edgeBand: "1L", grainDirection: "none" },
      { name: "Fundo", quantity: 1, widthFormula: "height-36", heightFormula: "width-36", material: "back", edgeBand: "none", grainDirection: "none" },
      { name: "Porta", quantity: 2, widthFormula: "width/2-3", heightFormula: "height-36", material: "door", edgeBand: "4L", grainDirection: "vertical" },
    ]},
  },
  {
    templateId: "kitchen-cooktop-base",
    displayName: "Bancada Cooktop",
    moduleType: "kitchen_base", moduleSubtype: "cooktop_base",
    environmentType: "kitchen", category: "base",
    defaultWidth: 900, defaultHeight: 900, defaultDepth: 600,
    dimensionRules: { widthMin: 600, widthMax: 900, widthStep: 50, heightMin: 850, heightMax: 950, depthMin: 550, depthMax: 650 },
    construction: { bodyThickness: 18, backThickness: 6, shelfThickness: 18, drawerFrontThickness: 18, edgeBandSides: "1L1C" },
    requiredHardware: ["corredica", "puxador"], optionalHardware: ["pe"],
    widthMode: "fixed",
    bomRecipe: { pieces: [
      { name: "Lateral", quantity: 2, widthFormula: "height-18", heightFormula: "depth", material: "body", edgeBand: "1L1C", grainDirection: "none" },
      { name: "Tampo/Base", quantity: 1, widthFormula: "width-36", heightFormula: "depth", material: "body", edgeBand: "1L", grainDirection: "none" },
      { name: "Fundo", quantity: 1, widthFormula: "height-36", heightFormula: "width-36", material: "back", edgeBand: "none", grainDirection: "none" },
      { name: "Frente Gaveta", quantity: 2, widthFormula: "width-3", heightFormula: "computed", material: "door", edgeBand: "4L", grainDirection: "horizontal" },
    ]},
  },
  {
    templateId: "kitchen-oven-tower",
    displayName: "Torre Forno/Micro",
    moduleType: "kitchen_tall", moduleSubtype: "oven_tower",
    environmentType: "kitchen", category: "tall",
    defaultWidth: 600, defaultHeight: 2200, defaultDepth: 600,
    dimensionRules: { widthMin: 560, widthMax: 700, widthStep: 10, heightMin: 2000, heightMax: 2400, depthMin: 550, depthMax: 650 },
    construction: { bodyThickness: 18, backThickness: 6, shelfThickness: 18, drawerFrontThickness: 18, edgeBandSides: "1L1C" },
    requiredHardware: ["dobradica", "puxador", "suporte"], optionalHardware: ["pe"],
    widthMode: "fixed",
    bomRecipe: { pieces: [
      { name: "Lateral", quantity: 2, widthFormula: "height-18", heightFormula: "depth", material: "body", edgeBand: "1L1C", grainDirection: "none" },
      { name: "Tampo/Base", quantity: 2, widthFormula: "width-36", heightFormula: "depth", material: "body", edgeBand: "1L", grainDirection: "none" },
      { name: "Fundo", quantity: 1, widthFormula: "height-36", heightFormula: "width-36", material: "back", edgeBand: "none", grainDirection: "none" },
      { name: "Prateleira", quantity: 2, widthFormula: "width-36", heightFormula: "depth-10", material: "body", edgeBand: "1L", grainDirection: "none" },
    ]},
  },
  {
    templateId: "kitchen-upper-cabinet",
    displayName: "Armário Superior",
    moduleType: "kitchen_upper", moduleSubtype: "upper_cabinet",
    environmentType: "kitchen", category: "upper",
    defaultWidth: 800, defaultHeight: 700, defaultDepth: 350,
    dimensionRules: { widthMin: 400, widthMax: 1200, widthStep: 50, heightMin: 500, heightMax: 900, depthMin: 300, depthMax: 400 },
    construction: { bodyThickness: 18, backThickness: 6, shelfThickness: 18, drawerFrontThickness: 18, edgeBandSides: "1L1C" },
    requiredHardware: ["dobradica", "puxador", "suporte"], optionalHardware: ["led"],
    widthMode: "fixed",
    bomRecipe: { pieces: [
      { name: "Lateral", quantity: 2, widthFormula: "height-18", heightFormula: "depth", material: "body", edgeBand: "1L1C", grainDirection: "none" },
      { name: "Tampo/Base", quantity: 2, widthFormula: "width-36", heightFormula: "depth", material: "body", edgeBand: "1L", grainDirection: "none" },
      { name: "Fundo", quantity: 1, widthFormula: "height-36", heightFormula: "width-36", material: "back", edgeBand: "none", grainDirection: "none" },
      { name: "Prateleira", quantity: 2, widthFormula: "width-36", heightFormula: "depth-10", material: "body", edgeBand: "1L", grainDirection: "none" },
      { name: "Porta", quantity: 2, widthFormula: "width/2-3", heightFormula: "height-36", material: "door", edgeBand: "4L", grainDirection: "vertical" },
    ]},
  },
  {
    templateId: "kitchen-drawer-base",
    displayName: "Gaveteiro Cozinha",
    moduleType: "kitchen_base", moduleSubtype: "drawer_bank",
    environmentType: "kitchen", category: "base",
    defaultWidth: 600, defaultHeight: 900, defaultDepth: 580,
    dimensionRules: { widthMin: 400, widthMax: 900, widthStep: 50, heightMin: 850, heightMax: 950, depthMin: 450, depthMax: 600 },
    construction: { bodyThickness: 18, backThickness: 6, shelfThickness: 18, drawerFrontThickness: 18, edgeBandSides: "1L1C" },
    requiredHardware: ["corredica", "puxador"], optionalHardware: ["pe"],
    widthMode: "fixed",
    bomRecipe: { pieces: [
      { name: "Lateral", quantity: 2, widthFormula: "height-18", heightFormula: "depth", material: "body", edgeBand: "1L1C", grainDirection: "none" },
      { name: "Tampo/Base", quantity: 2, widthFormula: "width-36", heightFormula: "depth", material: "body", edgeBand: "1L", grainDirection: "none" },
      { name: "Fundo", quantity: 1, widthFormula: "height-36", heightFormula: "width-36", material: "back", edgeBand: "none", grainDirection: "none" },
      { name: "Frente Gaveta", quantity: 4, widthFormula: "width-3", heightFormula: "computed", material: "door", edgeBand: "4L", grainDirection: "horizontal" },
    ]},
  },
  {
    templateId: "kitchen-niche",
    displayName: "Nicho Aberto",
    moduleType: "closet_display", moduleSubtype: "niche",
    environmentType: "universal", category: "base",
    defaultWidth: 400, defaultHeight: 700, defaultDepth: 350,
    dimensionRules: { widthMin: 300, widthMax: 800, widthStep: 50, heightMin: 400, heightMax: 2400, depthMin: 250, depthMax: 450 },
    construction: { bodyThickness: 18, backThickness: 6, shelfThickness: 18, drawerFrontThickness: 18, edgeBandSides: "1L1C" },
    requiredHardware: [], optionalHardware: ["led"],
    widthMode: "fixed",
    bomRecipe: { pieces: [
      { name: "Lateral", quantity: 2, widthFormula: "height-18", heightFormula: "depth", material: "body", edgeBand: "1L1C", grainDirection: "none" },
      { name: "Tampo/Base", quantity: 2, widthFormula: "width-36", heightFormula: "depth", material: "body", edgeBand: "1L", grainDirection: "none" },
      { name: "Fundo", quantity: 1, widthFormula: "height-36", heightFormula: "width-36", material: "back", edgeBand: "none", grainDirection: "none" },
    ]},
  },
];

/* ============================================================
   Library Access
   ============================================================ */

const ALL_TEMPLATES = [...CLOSET_TEMPLATES, ...KITCHEN_TEMPLATES];

/** Find template by moduleSubtype (primary) or moduleType */
export function findTemplate(moduleType: string, moduleSubtype: string): ModuleTemplate | null {
  return ALL_TEMPLATES.find(t => t.moduleSubtype === moduleSubtype) ||
         ALL_TEMPLATES.find(t => t.moduleType === moduleType) ||
         null;
}

/** Find template by templateId */
export function findTemplateById(templateId: string): ModuleTemplate | null {
  return ALL_TEMPLATES.find(t => t.templateId === templateId) || null;
}

/** Get all templates for an environment */
export function getTemplatesForEnvironment(env: string): ModuleTemplate[] {
  return ALL_TEMPLATES.filter(t => t.environmentType === env || t.environmentType === "universal");
}

/** Get all templates */
export function getAllTemplates(): ModuleTemplate[] {
  return [...ALL_TEMPLATES];
}

/** Validate dimensions against template rules */
export function validateDimensions(template: ModuleTemplate, width: number, height: number, depth: number): string[] {
  const errors: string[] = [];
  const r = template.dimensionRules;
  if (width < r.widthMin) errors.push(`Largura ${width}mm abaixo do minimo ${r.widthMin}mm`);
  if (width > r.widthMax) errors.push(`Largura ${width}mm acima do maximo ${r.widthMax}mm`);
  if (height < r.heightMin) errors.push(`Altura ${height}mm abaixo do minimo ${r.heightMin}mm`);
  if (height > r.heightMax) errors.push(`Altura ${height}mm acima do maximo ${r.heightMax}mm`);
  if (depth < r.depthMin) errors.push(`Profundidade ${depth}mm abaixo do minimo ${r.depthMin}mm`);
  if (depth > r.depthMax) errors.push(`Profundidade ${depth}mm acima do maximo ${r.depthMax}mm`);
  return errors;
}

/** Configure a module from template + desired dimensions */
export function configureModule(
  template: ModuleTemplate,
  desiredWidth?: number,
  desiredHeight?: number,
  desiredDepth?: number,
): ConfiguredModule {
  const r = template.dimensionRules;

  // Clamp dimensions to valid range
  const width = Math.max(r.widthMin, Math.min(r.widthMax, desiredWidth || template.defaultWidth));
  const height = Math.max(r.heightMin, Math.min(r.heightMax, desiredHeight || template.defaultHeight));
  const depth = Math.max(r.depthMin, Math.min(r.depthMax, desiredDepth || template.defaultDepth));

  // Snap width to step
  const snappedWidth = Math.round(width / r.widthStep) * r.widthStep;

  return {
    templateId: template.templateId,
    template,
    resolvedWidth: snappedWidth,
    resolvedHeight: height,
    resolvedDepth: depth,
    usedParametricTemplate: true,
  };
}
