/**
 * pricing-engine.ts
 * P1.3 — Calculates technical cost + applies store commercial rules.
 * Separates "what does this cost to make" from "what does the store charge".
 */

import type { BlueprintModule, WallLayout, NestingResult } from "./engine-bridge.js";
import {
  getActiveProfile, findMaterialPrice, findHardwarePrice, applyRounding,
  type StorePricingProfile,
} from "./store-pricing.js";
import { getActiveCatalog, lookupHardware } from "./factory-catalog.js";
import type { CatalogDiagnostic } from "../types.js";

/* ============================================================
   Result Types
   ============================================================ */

export interface TechnicalCostBreakdown {
  materialsCost: number;
  hardwareCost: number;
  laborCost: number;
  wasteCost: number;
  subtotal: number;
  details: Array<{ item: string; qty: number; unitPrice: number; total: number; source: string }>;
}

export interface CommercialPriceBreakdown {
  technicalSubtotal: number;
  markupApplied: number;
  markupAmount: number;
  installationCharge: number;
  roundingAdjustment: number;
  finalPrice: number;
}

export interface PricingResult {
  pricingProfileId: string;
  pricingProfileName: string;
  currency: string;
  technicalCost: TechnicalCostBreakdown;
  commercialPrice: CommercialPriceBreakdown;
  perModuleBreakdown: Array<{ moduleName: string; traceId: string; cost: number }>;
  pricingWarnings: string[];
  usedDefaultProfile: boolean;
}

/* ============================================================
   Pricing Calculation
   ============================================================ */

export function calculatePricing(
  walls: WallLayout[],
  nesting: NestingResult,
  hardwareMap: string[],
  profile?: StorePricingProfile,
): PricingResult {
  const p = profile || getActiveProfile();
  const warnings: string[] = [];
  const details: TechnicalCostBreakdown["details"] = [];
  const perModule: PricingResult["perModuleBreakdown"] = [];

  // --- Material cost (from nesting sheets) ---
  let materialsCost = 0;
  for (const sheet of nesting.sheets) {
    const matName = sheet.material || "MDF_18mm";
    const pricePerSheet = findMaterialPrice(matName, p);
    materialsCost += pricePerSheet;
    details.push({
      item: `Chapa ${sheet.id} — ${matName} (${sheet.width}x${sheet.height})`,
      qty: 1,
      unitPrice: pricePerSheet,
      total: pricePerSheet,
      source: "store_profile",
    });
  }

  // --- Hardware cost ---
  let hardwareCost = 0;
  const hwCatalogDiag: CatalogDiagnostic[] = [];
  // Count hardware by category
  const hwCounts = new Map<string, number>();
  for (const hw of hardwareMap) {
    const lower = hw.toLowerCase();
    let category = "outros";
    if (lower.includes("dobradica") || lower.includes("hinge")) category = "dobradica";
    else if (lower.includes("corredica") || lower.includes("slide") || lower.includes("telescop")) category = "corredica";
    else if (lower.includes("puxador") || lower.includes("handle")) category = "puxador";
    else if (lower.includes("barra") || lower.includes("cabideiro")) category = "cabideiro";
    else if (lower.includes("suporte") || lower.includes("support")) category = "suporte";
    else if (lower.includes("led") || lower.includes("iluminacao")) category = "led";
    else if (lower.includes("sensor")) category = "sensor";
    else if (lower.includes("pe") || lower.includes("regulav")) category = "pe";

    hwCounts.set(category, (hwCounts.get(category) || 0) + 1);
  }

  for (const [category, count] of hwCounts) {
    const { price, unit } = findHardwarePrice(category, p);
    const total = price * count;
    hardwareCost += total;
    details.push({
      item: `${category} (×${count})`,
      qty: count,
      unitPrice: price,
      total,
      source: "store_profile",
    });
  }

  // --- Labor cost ---
  let laborCost = 0;
  const cuttingRule = p.laborRules.find(r => r.activity === "cutting");
  if (cuttingRule) {
    const sheetCount = nesting.totalSheets;
    const cuttingCost = cuttingRule.pricePerUnit * sheetCount;
    laborCost += cuttingCost;
    details.push({
      item: `Corte (${sheetCount} chapas)`,
      qty: sheetCount,
      unitPrice: cuttingRule.pricePerUnit,
      total: cuttingCost,
      source: "store_profile",
    });
  }

  const edgeRule = p.laborRules.find(r => r.activity === "edgebanding");
  if (edgeRule) {
    const edgeMeters = nesting.totalLinearEdgeBand / 1000; // convert mm to meters
    const edgeCost = edgeRule.pricePerUnit * edgeMeters;
    laborCost += edgeCost;
    details.push({
      item: `Fita de borda (${edgeMeters.toFixed(1)}m)`,
      qty: Math.ceil(edgeMeters),
      unitPrice: edgeRule.pricePerUnit,
      total: edgeCost,
      source: "store_profile",
    });
  }

  const assemblyRule = p.laborRules.find(r => r.activity === "assembly");
  if (assemblyRule) {
    const allModules = walls.flatMap(w => w.modules);
    const assemblyHours = Math.max(2, allModules.length * 0.5); // ~30min per module
    const assemblyCost = assemblyRule.pricePerUnit * assemblyHours;
    laborCost += assemblyCost;
    details.push({
      item: `Montagem (${assemblyHours.toFixed(1)}h)`,
      qty: assemblyHours,
      unitPrice: assemblyRule.pricePerUnit,
      total: assemblyCost,
      source: "store_profile",
    });
  }

  // --- Waste cost (10% of materials for waste/scrap) ---
  const wasteCost = materialsCost * 0.05; // 5% waste overhead

  // --- Technical subtotal ---
  const techSubtotal = materialsCost + hardwareCost + laborCost + wasteCost;

  // --- Per-module cost allocation ---
  const allModules = walls.flatMap(w => w.modules);
  const moduleCount = allModules.length || 1;
  const costPerModule = techSubtotal / moduleCount;
  for (const mod of allModules) {
    perModule.push({
      moduleName: mod.name,
      traceId: mod.traceId || mod.id,
      cost: Math.round(costPerModule * 100) / 100,
    });
  }

  // --- Commercial price ---
  const markupAmount = techSubtotal * p.globalMarkup;
  let installationCharge = 0;
  if (p.installationMode === "per_module") {
    installationCharge = p.installationRate * moduleCount;
  } else if (p.installationMode === "flat") {
    installationCharge = p.installationRate;
  } else if (p.installationMode === "percentage") {
    installationCharge = techSubtotal * (p.installationRate / 100);
  }

  const rawPrice = techSubtotal + markupAmount + installationCharge;
  const finalPrice = applyRounding(rawPrice, p.roundingPolicy);
  const roundingAdjustment = finalPrice - rawPrice;

  // --- Margin check ---
  const actualMargin = techSubtotal > 0 ? (finalPrice - techSubtotal) / finalPrice : 0;
  if (actualMargin < p.minimumMargin) {
    warnings.push(`Margem efetiva (${(actualMargin * 100).toFixed(1)}%) abaixo do minimo configurado (${(p.minimumMargin * 100).toFixed(1)}%)`);
  }

  return {
    pricingProfileId: p.pricingProfileId,
    pricingProfileName: p.storeName,
    currency: p.currency,
    technicalCost: {
      materialsCost: Math.round(materialsCost * 100) / 100,
      hardwareCost: Math.round(hardwareCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      wasteCost: Math.round(wasteCost * 100) / 100,
      subtotal: Math.round(techSubtotal * 100) / 100,
      details,
    },
    commercialPrice: {
      technicalSubtotal: Math.round(techSubtotal * 100) / 100,
      markupApplied: p.globalMarkup,
      markupAmount: Math.round(markupAmount * 100) / 100,
      installationCharge: Math.round(installationCharge * 100) / 100,
      roundingAdjustment: Math.round(roundingAdjustment * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
    },
    perModuleBreakdown: perModule,
    pricingWarnings: warnings,
    usedDefaultProfile: p.pricingProfileId === "default-south-florida",
  };
}
