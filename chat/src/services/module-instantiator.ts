/**
 * module-instantiator.ts
 * P1.2 — Bridges the parametric module library with the engine pipeline.
 * Resolves briefing items into configured modules from templates.
 */

import { findTemplate, configureModule, type ModuleTemplate, type ConfiguredModule } from "./module-library.js";
import { resolveModuleTyping } from "./module-typing.js";

export interface InstantiationResult {
  moduleId: string;
  templateId: string | null;
  width: number;
  height: number;
  depth: number;
  category: string;
  usedParametricTemplate: boolean;
  diagnosticNote: string;
}

/** Known item type → moduleSubtype mapping for template lookup */
const ITEM_TYPE_TO_SUBTYPE: Record<string, string> = {
  hanging_bar: "long_garment",
  shelves: "shelves",
  shoe_rack: "shoe",
  vitrine: "glass_display",
  drawers: "drawer_bank",
  vanity: "vanity",
  luggage_area: "suitcase",
  jewelry_display: "jewelry",
  gun_cases_storage: "gun_safe",
  nicho: "niche",
  accessories_drawer: "drawer_bank",
  // Kitchen
  oven_tower: "oven_tower",
  sink_cabinet: "sink_base",
  cooktop_cabinet: "cooktop_base",
  upper_cabinet: "upper_cabinet",
  corner_cabinet: "corner_cabinet",
};

/** Normalize briefing subtypes (plural→singular, aliases) */
const SUBTYPE_ALIASES: Record<string, string> = {
  long_garments: "long_garment",
  short_garments: "short_garment",
  shoes: "shoe",
  boots: "boot",
  bags: "bag",
  suitcases: "suitcase",
  cases: "gun_safe",
  jewelry: "jewelry",
  shelves: "shelves",
  gavetas: "drawer_bank",
  gaveteiro: "drawer_bank",
};

/**
 * Instantiate a module from a briefing item using the parametric library.
 * Falls back to legacy defaults if no template found.
 */
export function instantiateModule(
  itemType: string,
  itemSubtype: string | undefined,
  quantity: number | undefined,
  notes: string[],
  wallHeight: number,
): InstantiationResult {
  // Determine the target subtype (normalize aliases)
  const rawSubtype = itemSubtype || ITEM_TYPE_TO_SUBTYPE[itemType] || "generic";
  const targetSubtype = SUBTYPE_ALIASES[rawSubtype] || rawSubtype;

  // Find parametric template directly by subtype first (most reliable)
  let template = findTemplate("", targetSubtype);

  // If not found, try via module typing resolver
  if (!template) {
    const typing = resolveModuleTyping(`closet_${targetSubtype}`, notes);
    template = findTemplate(typing.moduleType, typing.moduleSubtype);
  }

  if (template) {
    // Calculate width based on template's widthMode
    let desiredWidth = template.defaultWidth;
    if (template.widthMode === "quantity_based" && template.widthPerUnit && quantity) {
      desiredWidth = Math.max(
        template.dimensionRules.widthMin,
        Math.min(template.dimensionRules.widthMax, quantity * template.widthPerUnit)
      );
    }

    // Refine subtype for hanging bar
    if (itemType === "hanging_bar" && itemSubtype === "short_garments") {
      const shortTemplate = findTemplate("closet_storage", "short_garment");
      if (shortTemplate) {
        const configured = configureModule(shortTemplate, desiredWidth, Math.min(wallHeight, shortTemplate.defaultHeight));
        return {
          moduleId: `closet_${shortTemplate.moduleSubtype}`,
          templateId: shortTemplate.templateId,
          width: configured.resolvedWidth,
          height: configured.resolvedHeight,
          depth: configured.resolvedDepth,
          category: shortTemplate.category,
          usedParametricTemplate: true,
          diagnosticNote: `Template: ${shortTemplate.templateId}`,
        };
      }
    }

    const configured = configureModule(template, desiredWidth, Math.min(wallHeight, template.defaultHeight));

    return {
      moduleId: template.moduleSubtype === "shoe" ? "closet_sapateira" :
                template.moduleSubtype === "glass_display" ? "closet_vitrine" :
                template.moduleSubtype === "suitcase" ? "closet_maleiro" :
                template.moduleSubtype === "long_garment" ? "closet_cabideiro" :
                template.moduleSubtype === "short_garment" ? "closet_cabideiro" :
                template.moduleSubtype === "drawer_bank" ? "base_gaveteiro_3g" :
                template.moduleSubtype === "sink_base" ? "kitchen_sink_base" :
                template.moduleSubtype === "cooktop_base" ? "kitchen_cooktop_base" :
                template.moduleSubtype === "oven_tower" ? "kitchen_oven_tower" :
                template.moduleSubtype === "upper_cabinet" ? "kitchen_upper_cabinet" :
                template.moduleSubtype === "niche" ? "closet_nicho" :
                `tpl_${template.moduleSubtype}`,
      templateId: template.templateId,
      width: configured.resolvedWidth,
      height: configured.resolvedHeight,
      depth: configured.resolvedDepth,
      category: template.category,
      usedParametricTemplate: true,
      diagnosticNote: `Template: ${template.templateId} (${template.displayName})`,
    };
  }

  // Fallback: no template found
  return {
    moduleId: ITEM_TYPE_TO_SUBTYPE[itemType] ? `fallback_${ITEM_TYPE_TO_SUBTYPE[itemType]}` : `fallback_${itemType}`,
    templateId: null,
    width: 600,
    height: Math.min(wallHeight, 2400),
    depth: 600,
    category: "base",
    usedParametricTemplate: false,
    diagnosticNote: `No parametric template for ${itemType}/${targetSubtype} — using fallback`,
  };
}
