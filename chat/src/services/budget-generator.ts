/**
 * budget-generator.ts
 * Generates detailed cost estimation / budget (orçamento) for furniture projects.
 *
 * Takes the parsed briefing and engine results (blueprint + nesting) and
 * produces a line-item budget with material, hardware, labor costs,
 * per-module breakdown, and sale price with margin.
 */

import type { ParsedBriefing } from "../types.js";
import type {
  EngineResults,
  BlueprintModule,
  CutListItem,
  Sheet,
} from "./engine-bridge.js";

// ============================================================
// Budget result interface
// ============================================================

export interface BudgetLineItem {
  item: string;
  qtd: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface BudgetResult {
  materiais: BudgetLineItem[];
  ferragens: BudgetLineItem[];
  maoDeObra: BudgetLineItem[];
  subtotalMaterial: number;
  subtotalFerragens: number;
  subtotalMaoDeObra: number;
  custoTotal: number;
  margem: number;
  precoVenda: number;
  custoPorModulo: { modulo: string; custo: number }[];
  custoPorM2: number;
  moeda: "USD";
}

// ============================================================
// Default pricing table (USD — US market, South Florida)
// ============================================================

const DEFAULT_PRICING = {
  chapas: {
    MDF_15mm_branco: { price: 45, unit: "sheet", dimensions: "2750x1850mm" },
    MDF_15mm_cores: { price: 52, unit: "sheet", dimensions: "2750x1850mm" },
    MDF_18mm_branco: { price: 55, unit: "sheet", dimensions: "2750x1850mm" },
    MDF_18mm_cores: { price: 62, unit: "sheet", dimensions: "2750x1850mm" },
    MDF_6mm_fundo: { price: 22, unit: "sheet", dimensions: "2750x1850mm" },
  } as Record<string, { price: number; unit: string; dimensions?: string }>,
  fitas: {
    "15mm": { price: 0.55, unit: "ft" },
    "18mm": { price: 0.65, unit: "ft" },
  } as Record<string, { price: number; unit: string }>,
  ferragens: {
    dobradica_110: {
      price: 4.50,
      unit: "un",
      name: "Blum 110° soft-close hinge",
    },
    corredica_350: {
      price: 12,
      unit: "pair",
      name: "Telescopic slide 350mm",
    },
    corredica_450: {
      price: 15,
      unit: "pair",
      name: "Telescopic slide 450mm",
    },
    corredica_500: {
      price: 18,
      unit: "pair",
      name: "Telescopic slide 500mm full-ext.",
    },
    puxador: { price: 6, unit: "un", name: "Pull handle" },
    pe_regulavel: { price: 5, unit: "set x4", name: "Adjustable feet 100mm (x4)" },
    barra_cromada: {
      price: 12,
      unit: "un",
      name: "Chrome oval rod 25mm",
    },
    suporte_prateleira: {
      price: 0.50,
      unit: "un",
      name: "Metal shelf pin",
    },
    led_metro: {
      price: 8,
      unit: "meter",
      name: "LED strip 3000K + driver",
    },
    sensor_porta: {
      price: 6,
      unit: "un",
      name: "Door sensor switch",
    },
    espelho_m2: {
      price: 55,
      unit: "sqft",
      name: "4mm mirror with frame",
    },
    vidro_temperado_m2: {
      price: 65,
      unit: "sqft",
      name: "8mm tempered glass",
    },
    corredica_sapateira: {
      price: 10,
      unit: "pair",
      name: "Tilted shoe rack slide",
    },
  } as Record<string, { price: number; unit: string; name: string }>,
  maoDeObra: {
    corte_chapa: { price: 15, unit: "sheet", name: "Sheet cutting" },
    fita_borda: {
      price: 1.50,
      unit: "meter",
      name: "Edge banding application",
    },
    montagem_hora: { price: 45, unit: "hour", name: "Assembly" },
    instalacao_hora: {
      price: 55,
      unit: "hour",
      name: "On-site installation",
    },
  } as Record<string, { price: number; unit: string; name: string }>,
  margem: 0.3,
};

// ============================================================
// Helpers
// ============================================================

/** Deep-merge user pricing overrides into defaults. */
function mergePricing(
  base: typeof DEFAULT_PRICING,
  overrides?: Partial<typeof DEFAULT_PRICING>,
): typeof DEFAULT_PRICING {
  if (!overrides) return base;
  return {
    chapas: { ...base.chapas, ...overrides.chapas },
    fitas: { ...base.fitas, ...overrides.fitas },
    ferragens: { ...base.ferragens, ...overrides.ferragens },
    maoDeObra: { ...base.maoDeObra, ...overrides.maoDeObra },
    margem: overrides.margem ?? base.margem,
  };
}

/** Standard sheet area in mm² (2750 × 1850). */
const STANDARD_SHEET_AREA_MM2 = 2750 * 1850;

/**
 * Resolve a nesting sheet material string to a pricing key.
 * Sheets from nestingEngine typically have material like "MDF_18mm_branco".
 * We try an exact match first, then fuzzy-match by thickness + color.
 */
function resolveSheetPriceKey(
  material: string,
  chapas: Record<string, { price: number; unit: string }>,
): string | null {
  if (!material) return null;

  const normalized = material.replace(/\s+/g, "_").toLowerCase();

  // Exact match
  for (const key of Object.keys(chapas)) {
    if (key.toLowerCase() === normalized) return key;
  }

  // Fuzzy: try to detect thickness + type
  const is6 = /6\s*mm|fundo/i.test(material);
  const is15 = /15\s*mm/i.test(material);
  const is18 = /18\s*mm/i.test(material) || (!is6 && !is15); // default to 18mm
  const isWhite = /branc/i.test(material);

  if (is6) return "MDF_6mm_fundo";
  if (is15) return isWhite ? "MDF_15mm_branco" : "MDF_15mm_cores";
  if (is18) return isWhite ? "MDF_18mm_branco" : "MDF_18mm_cores";

  return null;
}

/**
 * Parse edgeBand notation like "L4+A2" or "L2" and compute total linear
 * meters for a given piece.
 *
 * Notation: L = comprimento (rawHeight in the cut), A = largura (rawWidth).
 * Number after letter = how many edges receive banding on that dimension.
 * Example: "L4+A2" on a piece 600×300mm → 4×600 + 2×300 = 3000mm total.
 */
function parseEdgeBandMeters(
  edgeBand: string,
  rawWidth: number,
  rawHeight: number,
  quantity: number,
): number {
  if (!edgeBand || edgeBand === "none" || edgeBand === "-") return 0;

  let totalMm = 0;
  const parts = edgeBand.split("+").map((s) => s.trim());

  for (const part of parts) {
    const match = part.match(/^([LA])(\d+)$/i);
    if (!match) continue;
    const dim = match[1].toUpperCase();
    const count = parseInt(match[2], 10);
    if (isNaN(count)) continue;

    if (dim === "L") {
      totalMm += count * rawHeight;
    } else {
      // A
      totalMm += count * rawWidth;
    }
  }

  return (totalMm * quantity) / 1000; // mm → meters
}

/**
 * Classify a hardware string from hardwareMap into a pricing key.
 * Hardware entries come from the blueprint engine as descriptive strings.
 */
function classifyHardware(
  entry: string,
): { key: string; qty: number } | null {
  const lower = entry.toLowerCase();

  // Quantity prefix patterns: "4x Dobradiça..." or "Dobradiça 110° (x4)"
  let qty = 1;
  const prefixMatch = entry.match(/^(\d+)\s*x\s+/i);
  if (prefixMatch) {
    qty = parseInt(prefixMatch[1], 10);
  }
  const suffixMatch = entry.match(/\(x(\d+)\)/i);
  if (suffixMatch) {
    qty = parseInt(suffixMatch[1], 10);
  }
  const qtyColonMatch = entry.match(/:\s*(\d+)/);
  if (qtyColonMatch) {
    qty = parseInt(qtyColonMatch[1], 10);
  }

  // Classification rules
  if (/dobra[dç]/i.test(lower)) return { key: "dobradica_110", qty };
  if (/corredi[cç]a\s*sapateir/i.test(lower))
    return { key: "corredica_sapateira", qty };
  if (/corredi[cç]a.*500/i.test(lower)) return { key: "corredica_500", qty };
  if (/corredi[cç]a.*450/i.test(lower)) return { key: "corredica_450", qty };
  if (/corredi[cç]a.*350/i.test(lower)) return { key: "corredica_350", qty };
  if (/corredi[cç]a/i.test(lower)) return { key: "corredica_450", qty }; // default slide
  if (/puxador/i.test(lower)) return { key: "puxador", qty };
  if (/p[eé]s?\s*regul[aá]ve[ils]/i.test(lower)) return { key: "pe_regulavel", qty };
  if (/barra.*crom/i.test(lower)) return { key: "barra_cromada", qty };
  if (/suporte.*prateleira|pino.*met[aá]l/i.test(lower))
    return { key: "suporte_prateleira", qty };
  if (/led|fita.*led/i.test(lower)) return { key: "led_metro", qty };
  if (/sensor/i.test(lower)) return { key: "sensor_porta", qty };
  if (/espelho/i.test(lower)) return { key: "espelho_m2", qty };
  if (/vidro.*temper/i.test(lower)) return { key: "vidro_temperado_m2", qty };

  return null;
}

/** Determine if a module type is "complex" (drawers, special mechanisms). */
function isComplexModule(mod: BlueprintModule): boolean {
  const lower = (mod.type + " " + mod.name + " " + mod.moduleId).toLowerCase();
  return /gaveta|drawer|sapateira|shoe|vitrine|arma|gun|makeup|vaidade|vanity|island|ilha/i.test(
    lower,
  );
}

// ============================================================
// Main function
// ============================================================

export function generateBudget(
  briefing: ParsedBriefing,
  results: EngineResults,
  pricingConfig?: Partial<typeof DEFAULT_PRICING>,
): BudgetResult {
  const pricing = mergePricing(DEFAULT_PRICING, pricingConfig);

  const materiais: BudgetLineItem[] = [];
  const ferragens: BudgetLineItem[] = [];
  const maoDeObra: BudgetLineItem[] = [];

  // ----------------------------------------------------------
  // 1. Material sheets — count from nesting by material type
  // ----------------------------------------------------------
  const sheetsByMaterial = new Map<string, number>();
  const sheets = results.nesting?.sheets ?? [];

  for (const sheet of sheets) {
    const mat = sheet.material || "MDF_18mm_branco";
    sheetsByMaterial.set(mat, (sheetsByMaterial.get(mat) ?? 0) + 1);
  }

  for (const [material, count] of sheetsByMaterial) {
    const priceKey = resolveSheetPriceKey(material, pricing.chapas);
    const chapaInfo = priceKey ? pricing.chapas[priceKey] : null;
    const unitPrice = chapaInfo?.price ?? 220; // fallback to 18mm branco

    materiais.push({
      item: `Chapa ${material}`,
      qtd: count,
      unit: "chapa",
      unitPrice,
      total: round2(count * unitPrice),
    });
  }

  // If no sheets came from nesting, add a zero-line so the budget is not empty
  if (sheetsByMaterial.size === 0 && getAllModules(results).length > 0) {
    materiais.push({
      item: "Chapas (estimativa pendente)",
      qtd: 0,
      unit: "chapa",
      unitPrice: 0,
      total: 0,
    });
  }

  // ----------------------------------------------------------
  // 2. Edge banding — sum from all cutList items
  // ----------------------------------------------------------
  let totalEdgeMeters = 0;
  const allModules = getAllModules(results);

  for (const mod of allModules) {
    for (const cut of mod.cutList ?? []) {
      totalEdgeMeters += parseEdgeBandMeters(
        cut.edgeBand,
        cut.rawWidth,
        cut.rawHeight,
        cut.quantity,
      );
    }
  }

  if (totalEdgeMeters > 0) {
    // Determine predominant thickness for pricing
    const fitaKey = detectEdgeBandThickness(allModules, pricing);
    const fitaPrice = pricing.fitas[fitaKey]?.price ?? 3.0;

    materiais.push({
      item: `Fita de borda ${fitaKey}`,
      qtd: round2(totalEdgeMeters),
      unit: "metro",
      unitPrice: fitaPrice,
      total: round2(totalEdgeMeters * fitaPrice),
    });
  }

  // ----------------------------------------------------------
  // 3. Hardware — classify and price from hardwareMap
  // ----------------------------------------------------------
  const hardwareCounts = new Map<string, number>();
  const hardwareMap = results.blueprint?.hardwareMap ?? [];

  for (const entry of hardwareMap) {
    const classified = classifyHardware(entry);
    if (classified) {
      hardwareCounts.set(
        classified.key,
        (hardwareCounts.get(classified.key) ?? 0) + classified.qty,
      );
    } else {
      // Unrecognized hardware — add as generic item
      ferragens.push({
        item: entry,
        qtd: 1,
        unit: "un",
        unitPrice: 0,
        total: 0,
      });
    }
  }

  for (const [key, qty] of hardwareCounts) {
    const info = pricing.ferragens[key];
    if (!info) continue;
    ferragens.push({
      item: info.name,
      qtd: qty,
      unit: info.unit,
      unitPrice: info.price,
      total: round2(qty * info.price),
    });
  }

  // ----------------------------------------------------------
  // 4. Labor — cutting
  // ----------------------------------------------------------
  const totalSheets = sheets.length || sheetsByMaterial.size;
  if (totalSheets > 0) {
    const cutPrice = pricing.maoDeObra.corte_chapa?.price ?? 50;
    maoDeObra.push({
      item: pricing.maoDeObra.corte_chapa?.name ?? "Corte de chapa",
      qtd: totalSheets,
      unit: "chapa",
      unitPrice: cutPrice,
      total: round2(totalSheets * cutPrice),
    });
  }

  // ----------------------------------------------------------
  // 5. Labor — edge banding application
  // ----------------------------------------------------------
  if (totalEdgeMeters > 0) {
    const edgeLaborPrice = pricing.maoDeObra.fita_borda?.price ?? 4.5;
    maoDeObra.push({
      item: pricing.maoDeObra.fita_borda?.name ?? "Aplicação fita de borda",
      qtd: round2(totalEdgeMeters),
      unit: "metro",
      unitPrice: edgeLaborPrice,
      total: round2(totalEdgeMeters * edgeLaborPrice),
    });
  }

  // ----------------------------------------------------------
  // 6. Labor — assembly (1hr simple, 1.5hr complex)
  // ----------------------------------------------------------
  let assemblyHours = 0;
  for (const mod of allModules) {
    assemblyHours += isComplexModule(mod) ? 1.5 : 1;
  }

  if (assemblyHours > 0) {
    const assemblyPrice = pricing.maoDeObra.montagem_hora?.price ?? 85;
    maoDeObra.push({
      item: pricing.maoDeObra.montagem_hora?.name ?? "Montagem",
      qtd: round2(assemblyHours),
      unit: "hora",
      unitPrice: assemblyPrice,
      total: round2(assemblyHours * assemblyPrice),
    });
  }

  // ----------------------------------------------------------
  // 7. Labor — installation (0.5hr per module)
  // ----------------------------------------------------------
  const installHours = allModules.length * 0.5;
  if (installHours > 0) {
    const installPrice = pricing.maoDeObra.instalacao_hora?.price ?? 95;
    maoDeObra.push({
      item: pricing.maoDeObra.instalacao_hora?.name ?? "Instalação no local",
      qtd: round2(installHours),
      unit: "hora",
      unitPrice: installPrice,
      total: round2(installHours * installPrice),
    });
  }

  // ----------------------------------------------------------
  // Subtotals
  // ----------------------------------------------------------
  const subtotalMaterial = round2(sumTotals(materiais));
  const subtotalFerragens = round2(sumTotals(ferragens));
  const subtotalMaoDeObra = round2(sumTotals(maoDeObra));
  const custoTotal = round2(subtotalMaterial + subtotalFerragens + subtotalMaoDeObra);

  // ----------------------------------------------------------
  // 8. Cost per module — distribute proportionally by cut count
  // ----------------------------------------------------------
  const custoPorModulo = computeCostPerModule(allModules, custoTotal);

  // ----------------------------------------------------------
  // 9. Cost per m² — total / sum of sheet areas used
  // ----------------------------------------------------------
  const totalAreaM2 = computeTotalSheetAreaM2(sheets);
  const custoPorM2 = totalAreaM2 > 0 ? round2(custoTotal / totalAreaM2) : 0;

  // ----------------------------------------------------------
  // 10. Sale price = cost × (1 + margin)
  // ----------------------------------------------------------
  const margem = pricing.margem;
  const precoVenda = round2(custoTotal * (1 + margem));

  return {
    materiais,
    ferragens,
    maoDeObra,
    subtotalMaterial,
    subtotalFerragens,
    subtotalMaoDeObra,
    custoTotal,
    margem,
    precoVenda,
    custoPorModulo,
    custoPorM2,
    moeda: "USD",
  };
}

// ============================================================
// Internal utilities
// ============================================================

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sumTotals(items: BudgetLineItem[]): number {
  return items.reduce((acc, i) => acc + i.total, 0);
}

/** Gather all modules from both walls. */
function getAllModules(results: EngineResults): BlueprintModule[] {
  const mods: BlueprintModule[] = [];
  if (results.blueprint?.mainWall?.modules) {
    mods.push(...results.blueprint.mainWall.modules);
  }
  if (results.blueprint?.sideWall?.modules) {
    mods.push(...results.blueprint.sideWall.modules);
  }
  return mods;
}

/**
 * Detect predominant edge band thickness from cut list materials.
 * Falls back to "18mm" which is the most common.
 */
function detectEdgeBandThickness(
  modules: BlueprintModule[],
  pricing: typeof DEFAULT_PRICING,
): string {
  let count15 = 0;
  let count18 = 0;

  for (const mod of modules) {
    for (const cut of mod.cutList ?? []) {
      if (!cut.edgeBand || cut.edgeBand === "none" || cut.edgeBand === "-")
        continue;
      const mat = (cut.material ?? "").toLowerCase();
      if (/15\s*mm/i.test(mat)) {
        count15 += cut.quantity;
      } else {
        count18 += cut.quantity;
      }
    }
  }

  return count15 > count18 ? "15mm" : "18mm";
}

/**
 * Distribute total cost proportionally across modules by their cut count.
 * Modules with more cuts get a proportionally larger share.
 */
function computeCostPerModule(
  modules: BlueprintModule[],
  custoTotal: number,
): { modulo: string; custo: number }[] {
  if (modules.length === 0) return [];

  const cutCounts = modules.map((mod) => {
    const cuts = (mod.cutList ?? []).reduce((acc, c) => acc + c.quantity, 0);
    return { mod, cuts: Math.max(cuts, 1) }; // at least 1 to avoid zero-division
  });

  const totalCuts = cutCounts.reduce((acc, c) => acc + c.cuts, 0);
  if (totalCuts === 0) {
    // Equal distribution fallback
    const perModule = round2(custoTotal / modules.length);
    return modules.map((m) => ({ modulo: m.name || m.id, custo: perModule }));
  }

  return cutCounts.map(({ mod, cuts }) => ({
    modulo: mod.name || mod.id,
    custo: round2((cuts / totalCuts) * custoTotal),
  }));
}

/**
 * Sum total sheet area in m² from nesting sheets.
 * Uses actual sheet dimensions when available, falls back to standard 2750×1850.
 */
function computeTotalSheetAreaM2(sheets: Sheet[]): number {
  if (sheets.length === 0) return 0;

  let totalMm2 = 0;
  for (const sheet of sheets) {
    const w = sheet.width > 0 ? sheet.width : 2750;
    const h = sheet.height > 0 ? sheet.height : 1850;
    totalMm2 += w * h;
  }

  // mm² → m² (÷ 1_000_000)
  return round2(totalMm2 / 1_000_000);
}
