/**
 * store-pricing.ts
 * P1.3 — Store pricing profile: configurable commercial rules.
 * The store owner defines markups, margins, installation fees, and rounding.
 */

/* ============================================================
   Types
   ============================================================ */

export interface MaterialPriceRule {
  materialPattern: string;  // "MDF_18mm*", "MDF_6mm*", etc.
  pricePerSheet: number;
  currency: string;
}

export interface HardwarePriceRule {
  hardwareCategory: string; // "dobradica", "corredica", "puxador", etc.
  pricePerUnit: number;
  unit: string;             // "un", "pair", "meter"
}

export interface LaborRule {
  activity: string;         // "cutting", "edgebanding", "assembly", "installation"
  pricePerUnit: number;
  unit: string;             // "sheet", "meter", "hour", "module"
}

export interface StorePricingProfile {
  pricingProfileId: string;
  storeName: string;
  catalogId: string;
  currency: string;
  version: string;

  // Material costs
  materialRules: MaterialPriceRule[];

  // Hardware costs
  hardwareRules: HardwarePriceRule[];

  // Labor costs
  laborRules: LaborRule[];

  // Commercial rules
  globalMarkup: number;         // e.g., 0.30 = 30% margin
  minimumMargin: number;        // floor margin
  installationRate: number;     // per module or flat
  installationMode: "per_module" | "flat" | "percentage";
  roundingPolicy: "none" | "round_up_10" | "round_up_50" | "round_up_100";

  updatedAt: string;
}

/* ============================================================
   Default Store Profile (South Florida, USD)
   ============================================================ */

export const DEFAULT_STORE_PROFILE: StorePricingProfile = {
  pricingProfileId: "default-south-florida",
  storeName: "Default Store (South Florida)",
  catalogId: "builtin-default-v1",
  currency: "USD",
  version: "1.0.0",

  materialRules: [
    { materialPattern: "MDF_18mm_branco", pricePerSheet: 55, currency: "USD" },
    { materialPattern: "MDF_18mm",        pricePerSheet: 62, currency: "USD" },
    { materialPattern: "MDF_15mm_branco", pricePerSheet: 45, currency: "USD" },
    { materialPattern: "MDF_15mm",        pricePerSheet: 52, currency: "USD" },
    { materialPattern: "MDF_6mm",         pricePerSheet: 22, currency: "USD" },
    { materialPattern: "default",         pricePerSheet: 60, currency: "USD" },
  ],

  hardwareRules: [
    { hardwareCategory: "dobradica",  pricePerUnit: 4.50,  unit: "un" },
    { hardwareCategory: "corredica",  pricePerUnit: 15.00, unit: "pair" },
    { hardwareCategory: "puxador",    pricePerUnit: 6.00,  unit: "un" },
    { hardwareCategory: "cabideiro",  pricePerUnit: 12.00, unit: "un" },
    { hardwareCategory: "suporte",    pricePerUnit: 0.50,  unit: "un" },
    { hardwareCategory: "led",        pricePerUnit: 8.00,  unit: "meter" },
    { hardwareCategory: "sensor",     pricePerUnit: 6.00,  unit: "un" },
    { hardwareCategory: "sapateira",  pricePerUnit: 10.00, unit: "pair" },
    { hardwareCategory: "pe",         pricePerUnit: 1.50,  unit: "un" },
  ],

  laborRules: [
    { activity: "cutting",       pricePerUnit: 15.00, unit: "sheet" },
    { activity: "edgebanding",   pricePerUnit: 1.50,  unit: "meter" },
    { activity: "assembly",      pricePerUnit: 45.00, unit: "hour" },
    { activity: "installation",  pricePerUnit: 55.00, unit: "hour" },
  ],

  globalMarkup: 0.30,
  minimumMargin: 0.15,
  installationRate: 150.00,
  installationMode: "per_module",
  roundingPolicy: "round_up_10",

  updatedAt: new Date().toISOString(),
};

/* ============================================================
   Profile Management
   ============================================================ */

let activeProfile: StorePricingProfile = DEFAULT_STORE_PROFILE;

export function getActiveProfile(): StorePricingProfile {
  return activeProfile;
}

export function setActiveProfile(profile: StorePricingProfile): void {
  activeProfile = profile;
}

/** Find material price rule */
export function findMaterialPrice(materialName: string, profile: StorePricingProfile = activeProfile): number {
  const lower = materialName.toLowerCase();
  const rule = profile.materialRules.find(r =>
    lower.includes(r.materialPattern.toLowerCase()) || r.materialPattern === "default"
  );
  return rule?.pricePerSheet || 60;
}

/** Find hardware price rule */
export function findHardwarePrice(category: string, profile: StorePricingProfile = activeProfile): { price: number; unit: string } {
  const rule = profile.hardwareRules.find(r => r.hardwareCategory === category);
  return rule ? { price: rule.pricePerUnit, unit: rule.unit } : { price: 5, unit: "un" };
}

/** Apply rounding policy */
export function applyRounding(price: number, policy: string): number {
  switch (policy) {
    case "round_up_10": return Math.ceil(price / 10) * 10;
    case "round_up_50": return Math.ceil(price / 50) * 50;
    case "round_up_100": return Math.ceil(price / 100) * 100;
    default: return Math.round(price * 100) / 100;
  }
}
