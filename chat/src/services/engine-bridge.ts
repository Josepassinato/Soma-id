/**
 * engine-bridge.ts
 * Transforms the chat ParsedBriefing into the schemas expected by
 * calcEngine (AiLayoutPlan + Project), interferenceEngine, and nestingEngine.
 *
 * The engines live at /root/projetos/soma-id/services/ and use types from types.ts.
 * We replicate the needed interfaces here to avoid import path issues.
 */

import type { ParsedBriefing, NormalizedBriefing } from "../types.js";
import { getModel } from "./gemini.js";
import { normalizeBriefing } from "./briefing-normalizer.js";
import { detectIssues } from "./briefing-issues.js";
import { assessReadiness } from "./briefing-readiness.js";
import { resolveModuleTyping } from "./module-typing.js";
import { buildWallLayouts, distributionSummary } from "./layout-distributor.js";

// ============================================================
// Engine input/output types (mirrored from soma-id/types.ts)
// ============================================================

export interface AiLayoutModule {
  moduleId: string;
  width: number;
  x: number;
  y: number;
  z: number;
  notes: string[];
}

export interface AiLayoutPlan {
  layoutType: string;
  mainWall: {
    modules: AiLayoutModule[];
  };
  sideWall?: {
    modules: AiLayoutModule[];
  };
  factoryNotes: string[];
}

export interface MaterialPalette {
  id: string;
  name: string;
  category: string;
  texture: string;
  color: string;
  imageUrl: string;
}

export interface EngineProject {
  id: string;
  version: number;
  clientName: string;
  roomType: string;
  createdAt: string;
  status: string;
  installationType: "PISO" | "SUSPENSO";
  wallWidth: number;
  wallHeight: number;
  wallDepth: number;
  roomWidth?: number;
  roomDepth?: number;
  materialPalette: MaterialPalette[];
  styleDescription: string;
  m1Status: string;
}

export interface CutListItem {
  piece: string;
  quantity: number;
  measures: string;
  material: string;
  edgeBand: string;
  grainDirection: "vertical" | "horizontal" | "none";
  rawWidth: number;
  rawHeight: number;
  drillingPoints?: Array<{ x: number; y: number; diameter: number; depth: number; type: string }>;
}

export interface BoundingBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface BlueprintModule {
  id: string;
  moduleId: string;
  name: string;
  type: string;
  width: number;
  height: number;
  depth: number;
  position: { x: number; y: number; z: number };
  boundingBox: BoundingBox;
  notes: string[];
  cutList: CutListItem[];
  // P0.2 — Explicit typing fields
  moduleType?: import("./module-typing.js").ModuleType;
  moduleSubtype?: import("./module-typing.js").ModuleSubtype;
  zone?: string;
  features?: string[];
}

/** P0.4 — Wall layout with identity */
export interface WallLayout {
  wallId: string;          // "north", "east", etc.
  label: string;           // "Parede A (Norte)", human-readable
  orientation: string;     // "north", "east", "south", "west"
  wallWidth: number;       // full wall width in mm
  usableWidth: number;     // after doors/windows subtraction
  totalModuleWidth: number;// sum of assigned module widths
  modules: BlueprintModule[];
  distributionNotes: string[]; // why modules were assigned here
}

export interface BlueprintData {
  layout: string;
  materials: {
    mdfColor: string;
    internalColor: string;
    thickness: number;
  };
  // P0.4 — Multi-wall structure (primary)
  walls: WallLayout[];
  // Legacy compatibility — populated from walls[0] and walls[1]
  mainWall: {
    totalWidth: number;
    modules: BlueprintModule[];
  };
  sideWall?: {
    totalWidth: number;
    modules: BlueprintModule[];
  };
  hardwareMap: string[];
  factoryNotes: string[];
  conflicts?: InterferenceConflict[];
}

export interface InterferenceConflict {
  moduleA: string;
  moduleB?: string;
  type: "OVERLAP" | "BOUNDARY_VIOLATION" | "ERGONOMIC_HAZARD";
  severity: "CRITICAL" | "WARNING";
  description: string;
}

export interface PlacedItem {
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  partName: string;
  moduleName: string;
  grainDirection: "vertical" | "horizontal" | "none";
}

export interface Sheet {
  id: number;
  width: number;
  height: number;
  material: string;
  items: PlacedItem[];
  waste: number;
}

export interface NestingResult {
  sheets: Sheet[];
  totalSheets: number;
  totalParts: number;
  globalEfficiency: number;
  totalLinearEdgeBand: number;
  estimatedMachineTime: number;
}

export interface EngineResults {
  blueprint: BlueprintData;
  nesting: NestingResult;
  conflicts: InterferenceConflict[];
  summary: {
    total_modules: number;
    total_parts: number;
    total_sheets: number;
    efficiency_percent: number;
    critical_conflicts: number;
    warnings: number;
    hardware_items: number;
    estimated_cost_usd: number;
    estimated_cost_brl: number;
  };
}

// ============================================================
// Mapping tables
// ============================================================

const ITEM_TO_MODULE_MAP: Record<string, { moduleId: string; defaultWidth: number; defaultHeight: number; defaultDepth: number; category: string }> = {
  hanging_bar:       { moduleId: "closet_cabideiro",    defaultWidth: 800,  defaultHeight: 2400, defaultDepth: 600, category: "base" },
  shelves:           { moduleId: "closet_prateleiras",  defaultWidth: 600,  defaultHeight: 2400, defaultDepth: 600, category: "base" },
  shoe_rack:         { moduleId: "closet_sapateira",    defaultWidth: 600,  defaultHeight: 2400, defaultDepth: 350, category: "base" },
  vitrine:           { moduleId: "closet_vitrine",      defaultWidth: 500,  defaultHeight: 2000, defaultDepth: 400, category: "base" },
  drawers:           { moduleId: "base_gaveteiro_3g",   defaultWidth: 600,  defaultHeight: 900,  defaultDepth: 580, category: "base" },
  vanity:            { moduleId: "closet_bancada",      defaultWidth: 1000, defaultHeight: 750,  defaultDepth: 500, category: "base" },
  luggage_area:      { moduleId: "closet_maleiro",      defaultWidth: 800,  defaultHeight: 400,  defaultDepth: 600, category: "upper" },
  jewelry_display:   { moduleId: "closet_ilha_tampo",   defaultWidth: 1200, defaultHeight: 900,  defaultDepth: 600, category: "base" },
  gun_cases_storage: { moduleId: "closet_armas",        defaultWidth: 1200, defaultHeight: 2400, defaultDepth: 600, category: "base" },
  nicho:             { moduleId: "closet_nicho",         defaultWidth: 500,  defaultHeight: 2400, defaultDepth: 400, category: "base" },
  accessories_drawer:{ moduleId: "closet_acessorios",    defaultWidth: 500,  defaultHeight: 900,  defaultDepth: 500, category: "base" },
  steamer_niche:     { moduleId: "closet_steamer",       defaultWidth: 400,  defaultHeight: 1200, defaultDepth: 400, category: "base" },
  mirror_door:       { moduleId: "closet_espelho_porta", defaultWidth: 600,  defaultHeight: 2000, defaultDepth: 100, category: "base" },
  led_panel:         { moduleId: "closet_painel_led",    defaultWidth: 400,  defaultHeight: 1800, defaultDepth: 50,  category: "base" },
};

const COLOR_TO_MATERIAL: Record<string, MaterialPalette> = {
  "freijo":          { id: "mdf_freijo",   name: "Freijó Puro 2025", category: "Madeira", texture: "Natural",  color: "#8e6c4e", imageUrl: "" },
  "carvalho":        { id: "mdf_carvalho", name: "Carvalho Dover",   category: "Madeira", texture: "Poro Aberto", color: "#c5b49d", imageUrl: "" },
  "carvalho natural":{ id: "mdf_carvalho", name: "Carvalho Dover",   category: "Madeira", texture: "Poro Aberto", color: "#c5b49d", imageUrl: "" },
  "branco":          { id: "mdf_branco",   name: "Branco Supremo Matt", category: "Unicolor", texture: "Matt", color: "#F5F5F5", imageUrl: "" },
  "branco neve":     { id: "mdf_branco",   name: "Branco Supremo Matt", category: "Unicolor", texture: "Matt", color: "#F5F5F5", imageUrl: "" },
  "grafite":         { id: "mdf_grafite",  name: "Grafite Carbono",  category: "Unicolor", texture: "Matt",   color: "#4a4a4a", imageUrl: "" },
  "lana":            { id: "mdf_areia",    name: "Areia Acetinado (Lana)", category: "Unicolor", texture: "Satin", color: "#e0d5c1", imageUrl: "" },
  "lord":            { id: "bv_lord",      name: "Lord (Boa Vista)", category: "Unicolor", texture: "Matt", color: "#50617D", imageUrl: "" },
  "noce":            { id: "mdf_noce",     name: "Noce Autunno",     category: "Madeira", texture: "Deep Wood", color: "#5d4037", imageUrl: "" },
  "sage":            { id: "mdf_sage",     name: "Verde Sage 2025",  category: "Unicolor", texture: "Matt",   color: "#879b8a", imageUrl: "" },
};

function findMaterial(colorName: string): MaterialPalette {
  const key = colorName.toLowerCase().trim();
  return COLOR_TO_MATERIAL[key] || {
    id: "mdf_custom",
    name: colorName,
    category: "Custom",
    texture: "Matt",
    color: "#cccccc",
    imageUrl: "",
  };
}

// ============================================================
// Briefing → AiLayoutPlan + Project conversion
// ============================================================

export function briefingToProject(briefing: ParsedBriefing, sessionId: string): EngineProject {
  // Use resolveWalls to get consistent wall dimensions
  const walls = resolveWalls(briefing);
  const mainWallLength = walls.length > 0 ? walls[0].usable_mm : 3000;
  const wallHeight = (briefing.space?.ceiling_height_m || 2.7) * 1000;

  const colors = briefing.materials?.colors || [];
  const palette = colors.map((c) => findMaterial(c));
  if (palette.length === 0) {
    palette.push(findMaterial("branco"));
  }

  return {
    id: sessionId,
    version: 1,
    clientName: briefing.client?.name || "Cliente",
    roomType: mapRoomType(briefing.project?.type),
    createdAt: new Date().toISOString(),
    status: "PROCESSANDO",
    installationType: "PISO",
    wallWidth: mainWallLength,
    wallHeight,
    wallDepth: 600,
    roomWidth: mainWallLength,
    roomDepth: walls.length > 1 ? walls[1].usable_mm : 3000,
    materialPalette: palette,
    styleDescription: briefing.materials?.mood_board || "Moderno minimalista",
    m1Status: "BRIEFING_GERADO",
  };
}

function mapRoomType(type?: string): string {
  const map: Record<string, string> = {
    closet: "Closet",
    kitchen: "Cozinha",
    bathroom: "Banheiro",
    commercial: "Escritorio",
    office: "Escritorio",
    living: "Sala",
  };
  return map[type?.toLowerCase() || ""] || "Closet";
}

function getSecondaryDimension(briefing: ParsedBriefing): number {
  const walls = briefing.space?.walls || [];
  const lengths = walls.map((w) => w.length_m * 1000).filter((l) => l > 0);
  if (lengths.length >= 2) {
    lengths.sort((a, b) => b - a);
    return lengths[1];
  }
  return 3000;
}

// ============================================================
// Multi-wall layout distribution
// ============================================================

interface WallSlot {
  wallId: string;
  length_mm: number;
  usable_mm: number; // after subtracting doors, windows, entry
  features: string[];
}

/**
 * Build list of available walls from briefing, sorted longest-first.
 * If the briefing has no explicit walls, estimate from project type + area.
 */
function resolveWalls(briefing: ParsedBriefing): WallSlot[] {
  const walls: WallSlot[] = [];
  const entryWallId = briefing.space?.entry_point?.wall?.toLowerCase() || "";
  const entryWidth = (briefing.space?.entry_point?.width_m || 0.9) * 1000;

  if (briefing.space?.walls?.length) {
    for (const w of briefing.space.walls) {
      const length_mm = w.length_m * 1000;
      // Subtract door/entry width if this wall has the entry
      const isEntryWall = entryWallId && (
        w.id.toLowerCase().includes(entryWallId) || entryWallId.includes(w.id.toLowerCase())
      );
      // Subtract door features
      const doorCount = (w.features || []).filter(f =>
        f.toLowerCase().includes("door") || f.toLowerCase().includes("porta")
      ).length;
      const windowCount = (w.features || []).filter(f =>
        f.toLowerCase().includes("window") || f.toLowerCase().includes("janela")
      ).length;

      let usable_mm = length_mm;
      if (isEntryWall) usable_mm -= entryWidth + 100; // entry + clearance
      usable_mm -= doorCount * 900;   // ~900mm per door
      usable_mm -= windowCount * 600; // ~600mm per window
      usable_mm = Math.max(usable_mm, 0);

      walls.push({ wallId: w.id, length_mm, usable_mm, features: w.features || [] });
    }
  }

  // Fallback: estimate walls from area and project type
  if (walls.length === 0) {
    const area = briefing.space?.total_area_m2 || 12;
    const ratio = 1.2; // typical room aspect ratio
    const sideA = Math.sqrt(area * ratio) * 1000;
    const sideB = (area / (sideA / 1000)) * 1000;
    walls.push(
      { wallId: "wall_A", length_mm: sideA, usable_mm: sideA - entryWidth - 100, features: [] },
      { wallId: "wall_B", length_mm: sideB, usable_mm: sideB, features: [] },
      { wallId: "wall_C", length_mm: sideA, usable_mm: sideA, features: [] },
      { wallId: "wall_D", length_mm: sideB, usable_mm: sideB, features: [] },
    );
  }

  // Ensure at least 2 walls for distribution
  if (walls.length === 1) {
    walls.push({
      wallId: walls[0].wallId + "_opposite",
      length_mm: walls[0].length_mm,
      usable_mm: walls[0].usable_mm,
      features: [],
    });
  }

  // Sort longest usable first
  walls.sort((a, b) => b.usable_mm - a.usable_mm);
  return walls;
}

/**
 * Calculate the total width needed for a zone's modules.
 */
function calcZoneWidth(zone: ParsedBriefing["zones"][number]): { modules: Array<{ item: ParsedBriefing["zones"][number]["items"][number]; width: number }>; totalWidth: number } {
  const mods: Array<{ item: ParsedBriefing["zones"][number]["items"][number]; width: number }> = [];
  let total = 0;

  // Consolidate multiple drawer items into one gaveteiro per zone
  // (5 categories of underwear = 1 gaveteiro with dividers, not 5 separate units)
  const drawerItems = (zone.items || []).filter(i => i.type === "drawers");
  const nonDrawerItems = (zone.items || []).filter(i => i.type !== "drawers");
  let drawerConsolidated = false;

  for (const item of zone.items || []) {
    const mapping = ITEM_TO_MODULE_MAP[item.type];
    if (!mapping) continue;

    // Upper modules (maleiro) sit on top of other modules, not beside them
    if (UPPER_ITEM_TYPES.has(item.type)) {
      mods.push({ item, width: mapping.defaultWidth });
      // Don't add to total width — they stack vertically on top
      continue;
    }

    // Skip individual drawer items after the first — they're consolidated
    if (item.type === "drawers") {
      if (drawerConsolidated) continue;
      drawerConsolidated = true;
      // One gaveteiro for all drawer categories in this zone
      const allCategories = drawerItems.flatMap(d => d.categories || []);
      const consolidatedItem = {
        ...item,
        categories: allCategories.length > 0 ? allCategories : item.categories,
      };
      // Width: if zone has a jewelry_display, drawers go under it (same width)
      const zoneHasIslandTop = nonDrawerItems.some(i => i.type === "jewelry_display");
      let width = mapping.defaultWidth;
      if (zoneHasIslandTop) {
        // Drawers are beneath the island top — use island width
        const islandWidth = zone.dimensions?.width_m ? zone.dimensions.width_m * 1000 : 1200;
        width = islandWidth;
      }
      mods.push({ item: consolidatedItem, width });
      total += width + 18;
      continue;
    }

    let width = mapping.defaultWidth;
    if (item.type === "shoe_rack" && item.quantity) {
      if (item.subtype === "boots") {
        width = Math.max(400, Math.min(1500, item.quantity * 70));
      } else {
        width = Math.max(500, Math.min(1500, item.quantity * 50));
      }
    } else if (item.type === "shelves" && item.quantity) {
      width = Math.max(400, Math.min(1200, item.quantity * 100));
    } else if (item.type === "hanging_bar") {
      if (item.subtype === "long_garments") width = 1000;
      else if (item.subtype === "short_garments") width = 800;
      else if (item.subtype === "mixed") width = 1200;
      else width = 900;
    } else if (item.type === "vitrine" && item.quantity) {
      width = Math.max(500, Math.min(1500, item.quantity * 100));
    } else if (item.type === "jewelry_display") {
      width = zone.dimensions?.width_m ? zone.dimensions.width_m * 1000 : 1200;
    }

    mods.push({ item, width });
    total += width + 18; // 18mm divider
  }

  if (total > 0) total -= 18; // remove trailing divider
  return { modules: mods, totalWidth: total };
}

// Zones that are freestanding (not against a wall) — placed separately
const FREESTANDING_ZONES = new Set(["ilha central", "ilha", "island"]);

function isFreestanding(zoneName: string): boolean {
  const lower = zoneName.toLowerCase().trim();
  return FREESTANDING_ZONES.has(lower) || lower.includes("ilha");
}

// Upper modules (maleiro, etc.) sit on top of wall modules — don't consume wall width
const UPPER_ITEM_TYPES = new Set(["luggage_area"]);

export function briefingToLayout(briefing: ParsedBriefing): AiLayoutPlan {
  const factoryNotes: string[] = [];
  const availableWalls = resolveWalls(briefing);
  factoryNotes.push(`Paredes disponíveis: ${availableWalls.map(w => `${w.wallId}(${w.usable_mm}mm)`).join(", ")}`);

  // Separate freestanding zones from wall zones
  const wallZones: Array<{ zone: ParsedBriefing["zones"][number]; mods: ReturnType<typeof calcZoneWidth> }> = [];
  const freestandingZones: Array<{ zone: ParsedBriefing["zones"][number]; mods: ReturnType<typeof calcZoneWidth> }> = [];

  for (const zone of briefing.zones || []) {
    const mods = calcZoneWidth(zone);
    if (mods.modules.length === 0) {
      factoryNotes.push(`Zona: ${zone.name} [SKIP — sem módulos]`);
      continue;
    }
    if (isFreestanding(zone.name)) {
      freestandingZones.push({ zone, mods });
    } else {
      wallZones.push({ zone, mods });
    }
  }

  // Sort wall zones by width descending (place biggest first for best fit)
  wallZones.sort((a, b) => b.mods.totalWidth - a.mods.totalWidth);

  // Track remaining space per wall
  const wallRemaining = availableWalls.map(w => ({ ...w, remaining: w.usable_mm }));

  // Assign zones to walls (first-fit decreasing)
  const wallAssignments: Map<string, Array<{ zone: ParsedBriefing["zones"][number]; mods: ReturnType<typeof calcZoneWidth> }>> = new Map();
  for (const w of wallRemaining) {
    wallAssignments.set(w.wallId, []);
  }

  for (const zoneEntry of wallZones) {
    const { zone, mods } = zoneEntry;

    // Try to find a wall that fits the entire zone
    let assigned = false;
    for (const wall of wallRemaining) {
      if (mods.totalWidth <= wall.remaining) {
        wallAssignments.get(wall.wallId)!.push(zoneEntry);
        wall.remaining -= mods.totalWidth + 18; // inter-zone gap
        factoryNotes.push(`Zona: ${zone.name} → ${wall.wallId} (${mods.totalWidth}mm, sobra ${wall.remaining}mm)`);
        assigned = true;
        break;
      }
    }

    // If no single wall fits, split the zone across walls
    if (!assigned) {
      factoryNotes.push(`Zona: ${zone.name} — dividindo entre paredes (${mods.totalWidth}mm total)`);
      let remainingMods = [...mods.modules];

      for (const wall of wallRemaining) {
        if (remainingMods.length === 0) break;
        if (wall.remaining < 300) continue; // too small

        const batch: typeof mods.modules = [];
        let batchWidth = 0;

        while (remainingMods.length > 0) {
          const next = remainingMods[0];
          const nextTotal = batchWidth + next.width + (batch.length > 0 ? 18 : 0);
          if (nextTotal <= wall.remaining) {
            batch.push(next);
            batchWidth = nextTotal;
            remainingMods.shift();
          } else {
            break;
          }
        }

        if (batch.length > 0) {
          wallAssignments.get(wall.wallId)!.push({
            zone: { ...zone, name: `${zone.name} (cont.)` },
            mods: { modules: batch, totalWidth: batchWidth },
          });
          wall.remaining -= batchWidth + 18;
          factoryNotes.push(`  → ${wall.wallId}: ${batch.length} módulos (${batchWidth}mm)`);
        }
      }

      // If still remaining, force onto the wall with most space
      if (remainingMods.length > 0) {
        const bestWall = wallRemaining.reduce((a, b) => a.remaining > b.remaining ? a : b);
        const forced = { modules: remainingMods, totalWidth: remainingMods.reduce((s, m) => s + m.width + 18, -18) };
        wallAssignments.get(bestWall.wallId)!.push({ zone: { ...zone, name: `${zone.name} (overflow)` }, mods: forced });
        factoryNotes.push(`  → ${bestWall.wallId}: ${remainingMods.length} módulos OVERFLOW`);
      }
    }
  }

  // Build modules per wall with correct x positioning
  function buildWallModules(wallId: string): AiLayoutModule[] {
    const zoneEntries = wallAssignments.get(wallId) || [];
    const modules: AiLayoutModule[] = [];
    const upperModules: AiLayoutModule[] = [];
    let xCursor = 0;

    for (const { zone, mods } of zoneEntries) {
      for (const { item, width } of mods.modules) {
        const mapping = ITEM_TO_MODULE_MAP[item.type];
        if (!mapping) continue;

        const notes: string[] = [`Zona: ${zone.name}`, `Parede: ${wallId}`];
        if (item.subtype) notes.push(`Subtipo: ${item.subtype}`);
        if (item.quantity) notes.push(`Qtd: ${item.quantity}`);
        if (item.features?.length) notes.push(`Features: ${item.features.join(", ")}`);
        if (item.categories?.length) notes.push(`Categorias: ${item.categories.join(", ")}`);

        // Upper modules (maleiro) stack on top — don't advance xCursor
        if (UPPER_ITEM_TYPES.has(item.type)) {
          notes.push("Upper");
          upperModules.push({
            moduleId: mapping.moduleId,
            width,
            x: 0, // will be positioned later, spanning across top
            y: 2200, // near ceiling (below 2700mm, accessible per ergonomic rule)
            z: 0,
            notes,
          });
          continue;
        }

        modules.push({
          moduleId: mapping.moduleId,
          width,
          x: xCursor,
          y: 0,
          z: 0,
          notes,
        });

        xCursor += width + 18;
      }
    }

    // Position upper modules spanning across the top of existing modules
    let upperX = 0;
    for (const um of upperModules) {
      um.x = upperX;
      modules.push(um);
      upperX += um.width + 18;
    }

    return modules;
  }

  // Assign walls: mainWall = first (longest), sideWall = second
  const mainWallId = availableWalls[0].wallId;
  const sideWallId = availableWalls.length > 1 ? availableWalls[1].wallId : undefined;

  const mainModules = buildWallModules(mainWallId);
  const sideModules = sideWallId ? buildWallModules(sideWallId) : [];

  // Add modules from any additional walls (3rd, 4th) into sideWall
  for (let i = 2; i < availableWalls.length; i++) {
    const extraModules = buildWallModules(availableWalls[i].wallId);
    if (extraModules.length > 0) {
      // Offset x positions to continue after existing sideWall modules
      const sideMaxX = sideModules.length > 0
        ? Math.max(...sideModules.map(m => m.x + m.width)) + 18
        : 0;
      for (const m of extraModules) {
        m.x += sideMaxX;
        sideModules.push(m);
      }
    }
  }

  // Handle freestanding zones — add to sideWall (island etc.)
  if (freestandingZones.length > 0) {
    let freeX = sideModules.length > 0
      ? Math.max(...sideModules.map(m => m.x + m.width)) + 18
      : 0;

    for (const { zone, mods } of freestandingZones) {
      factoryNotes.push(`Zona: ${zone.name} → freestanding (ilha)`);
      for (const { item, width } of mods.modules) {
        const mapping = ITEM_TO_MODULE_MAP[item.type];
        if (!mapping) continue;

        const notes: string[] = [`Zona: ${zone.name}`, `Freestanding`];
        if (item.subtype) notes.push(`Subtipo: ${item.subtype}`);
        if (item.quantity) notes.push(`Qtd: ${item.quantity}`);
        if (item.features?.length) notes.push(`Features: ${item.features.join(", ")}`);
        if (item.categories?.length) notes.push(`Categorias: ${item.categories.join(", ")}`);

        sideModules.push({
          moduleId: mapping.moduleId,
          width,
          x: freeX,
          y: 0,
          z: 0,
          notes,
        });
        freeX += width + 18;
      }
    }
  }

  // Fallback: at least one module
  if (mainModules.length === 0 && sideModules.length === 0) {
    mainModules.push({
      moduleId: "base_gaveteiro_3g",
      width: 600,
      x: 0,
      y: 0,
      z: 0,
      notes: ["Modulo padrao (nenhum item no briefing)"],
    });
  }

  const result: AiLayoutPlan = {
    layoutType: mainModules.length > 0 && sideModules.length > 0 ? "L-Shape" : "Linear",
    mainWall: { modules: mainModules },
    factoryNotes,
  };

  if (sideModules.length > 0) {
    result.sideWall = { modules: sideModules };
  }

  return result;
}

// ============================================================
// Local engine implementations
// (simplified versions — production uses the real engines)
// ============================================================

const THICKNESS = 18;
const BACK_THICKNESS = 6;
const DOOR_GAP = 3;
const SHELF_SETBACK = 20;

function generateCutList(mod: AiLayoutModule, project: EngineProject): CutListItem[] {
  const W = mod.width;
  const mapping = ITEM_TO_MODULE_MAP[
    Object.entries(ITEM_TO_MODULE_MAP).find(([, v]) => v.moduleId === mod.moduleId)?.[0] || ""
  ] || { defaultHeight: 2400, defaultDepth: 600 };

  // Cap height to project wall height (closet modules go floor-to-ceiling)
  const moduleH = Math.min(mapping.defaultHeight, project.wallHeight);
  const H = moduleH;
  const D = mapping.defaultDepth;

  const bodyMat = project.materialPalette[0]?.name || "MDP 18mm";
  const frontMat = project.materialPalette[1]?.name || project.materialPalette[0]?.name || "MDP 18mm";

  const items: CutListItem[] = [];

  const lateralH = H - 100; // minus rodape
  // Laterals: grain="none" for structural pieces — allows nesting rotation
  items.push({
    piece: "Lateral",
    quantity: 2,
    measures: `${lateralH} x ${D}`,
    material: bodyMat,
    edgeBand: "1L1C",
    grainDirection: "none",
    rawWidth: D,
    rawHeight: lateralH,
  });

  // Top/Bottom
  items.push({
    piece: "Tampo/Base",
    quantity: 2,
    measures: `${W - 2 * THICKNESS} x ${D}`,
    material: bodyMat,
    edgeBand: "1L",
    grainDirection: "none",
    rawWidth: W - 2 * THICKNESS,
    rawHeight: D,
  });

  // Back panel
  items.push({
    piece: "Fundo",
    quantity: 1,
    measures: `${lateralH - THICKNESS} x ${W - 2 * THICKNESS}`,
    material: `MDF ${BACK_THICKNESS}mm`,
    edgeBand: "none",
    grainDirection: "none",
    rawWidth: W - 2 * THICKNESS,
    rawHeight: lateralH - THICKNESS,
  });

  // Shelves (based on module type)
  if (mod.moduleId.includes("prateleira") || mod.moduleId.includes("sapateira")) {
    const shelfCount = 6;
    items.push({
      piece: "Prateleira",
      quantity: shelfCount,
      measures: `${W - 2 * THICKNESS - SHELF_SETBACK} x ${D - SHELF_SETBACK}`,
      material: bodyMat,
      edgeBand: "1L",
      grainDirection: "none",
      rawWidth: W - 2 * THICKNESS - SHELF_SETBACK,
      rawHeight: D - SHELF_SETBACK,
    });
  }

  // Drawers
  if (mod.moduleId.includes("gaveteiro") || mod.moduleId.includes("ilha")) {
    const drawerCount = 3;
    items.push({
      piece: "Frente Gaveta",
      quantity: drawerCount,
      measures: `${W - DOOR_GAP} x 176`,
      material: frontMat,
      edgeBand: "4L",
      grainDirection: "horizontal", // drawer fronts: visible, keep grain
      rawWidth: W - DOOR_GAP,
      rawHeight: 176,
    });
  }

  // Doors for cabideiro/vitrine/armas — visible pieces, keep grain direction
  if (mod.moduleId.includes("cabideiro") || mod.moduleId.includes("vitrine") || mod.moduleId.includes("armas")) {
    const doorH = lateralH - DOOR_GAP;
    items.push({
      piece: "Porta",
      quantity: 2,
      measures: `${W / 2 - DOOR_GAP} x ${doorH}`,
      material: frontMat,
      edgeBand: "4L",
      grainDirection: "vertical", // doors: visible, must be vertical
      rawWidth: W / 2 - DOOR_GAP,
      rawHeight: doorH,
    });
  }

  return items;
}

function humanModuleName(mod: AiLayoutModule): string {
  const id = mod.moduleId;
  const notes = mod.notes.join(" ").toLowerCase();
  const nameMap: Record<string, string> = {
    "closet_cabideiro": notes.includes("long") ? "Cabideiro Longo" : notes.includes("short") ? "Cabideiro Curto" : "Cabideiro",
    "closet_prateleiras": "Prateleiras",
    "closet_sapateira": notes.includes("boot") ? "Sapateira Botas" : "Sapateira",
    "closet_vitrine": "Vitrine Bolsas LED",
    "base_gaveteiro_3g": "Gaveteiro",
    "closet_bancada": "Bancada Makeup",
    "closet_maleiro": "Maleiro",
    "closet_ilha_tampo": "Ilha Central",
    "closet_armas": "Armario Armas",
    "closet_nicho": "Nicho",
    "closet_acessorios": "Gaveteiro Acessorios",
    "closet_steamer": "Nicho Steamer",
    "closet_espelho_porta": "Porta Espelho",
    "closet_painel_led": "Painel LED",
  };
  return nameMap[id] || id.replace(/_/g, " ");
}

function processWallModules(
  wallModules: AiLayoutModule[],
  project: EngineProject,
  prefix: string,
  allHardware: string[]
): BlueprintModule[] {
  const modules: BlueprintModule[] = [];

  for (let i = 0; i < wallModules.length; i++) {
    const mod = wallModules[i];
    const mapping = Object.entries(ITEM_TO_MODULE_MAP).find(([, v]) => v.moduleId === mod.moduleId);
    const info = mapping ? mapping[1] : { defaultHeight: 2400, defaultDepth: 600, category: "base" };
    const H = info.defaultHeight;
    const D = info.defaultDepth;

    const cutList = generateCutList(mod, project);

    const bpModule: BlueprintModule = {
      id: `${prefix}_${i}_${mod.moduleId}`,
      moduleId: mod.moduleId,
      name: `${humanModuleName(mod)} [${mod.width}mm]`,
      type: info.category,
      width: mod.width,
      height: H,
      depth: D,
      position: { x: mod.x, y: mod.y, z: mod.z },
      boundingBox: {
        min: { x: mod.x, y: mod.y, z: mod.z },
        max: { x: mod.x + mod.width, y: mod.y + H, z: mod.z + D },
      },
      notes: mod.notes,
      cutList,
    };

    // P0.2 — Resolve explicit typing
    const typing = resolveModuleTyping(mod.moduleId, mod.notes);
    bpModule.moduleType = typing.moduleType;
    bpModule.moduleSubtype = typing.moduleSubtype;
    bpModule.zone = typing.zone;
    bpModule.features = typing.features;

    modules.push(bpModule);

    // Hardware — base support
    if (project.installationType === "PISO") {
      allHardware.push(`Pés Reguláveis 100mm x4 (${bpModule.name})`);
    } else {
      allHardware.push(`Suporte Parede Reforçado 80kg/par (${bpModule.name})`);
    }

    // Drawers — slides
    if (mod.moduleId.includes("gaveteiro") || mod.moduleId.includes("ilha")) {
      allHardware.push(`Corrediças Telescópicas 500mm soft-close x3 pares (${bpModule.name})`);
    }

    // Hanging bar
    if (mod.moduleId.includes("cabideiro")) {
      allHardware.push(`Barra cromada Ø25mm + 2 suportes laterais (${bpModule.name})`);
    }

    // Doors → hinges + handles
    const hasDoors = mod.moduleId.includes("cabideiro") || mod.moduleId.includes("vitrine") || mod.moduleId.includes("armas");
    if (hasDoors) {
      const doorCount = 2;
      const hingesPerDoor = bpModule.width > 1200 ? 3 : 2;
      allHardware.push(`Dobradiça Blum clip-top 110° soft-close x${doorCount * hingesPerDoor} (${bpModule.name})`);
      allHardware.push(`Puxador x${doorCount} (${bpModule.name})`);
    }

    // Shelves → supports (4 per shelf)
    if (mod.moduleId.includes("prateleira") || mod.moduleId.includes("sapateira")) {
      const shelfCount = 6;
      allHardware.push(`Suportes de prateleira (pino metálico) x${shelfCount * 4} (${bpModule.name})`);
    }

    // Vitrines — glass shelf supports + LED
    if (mod.moduleId.includes("vitrine")) {
      const glassShelfCount = 5;
      allHardware.push(`Suportes prateleira vidro x${glassShelfCount * 4} (${bpModule.name})`);
      allHardware.push(`Fita LED branco quente 3000K + driver (${bpModule.name})`);
    }

    // Gun safe — LED + sensor + heavy-duty hinges
    if (mod.moduleId.includes("armas")) {
      allHardware.push(`Fita LED branco quente 3000K + driver (${bpModule.name})`);
      allHardware.push(`Sensor abertura porta LED (${bpModule.name})`);
    }

    // Vanity / bancada — mirror + LED
    if (mod.moduleId.includes("bancada")) {
      allHardware.push(`Espelho com moldura (${bpModule.name})`);
      allHardware.push(`Fita LED branco quente 3000K + driver (${bpModule.name})`);
      allHardware.push(`Corrediças Telescópicas 500mm soft-close x3 pares (${bpModule.name})`);
    }

    // Sapateira — inclined shelf supports
    if (mod.moduleId.includes("sapateira")) {
      allHardware.push(`Corrediça sapateira inclinada 15° x6 (${bpModule.name})`);
    }
  }

  return modules;
}

export function runCalcEngine(layout: AiLayoutPlan, project: EngineProject): BlueprintData {
  const allHardware: string[] = [];

  const mainModules = processWallModules(layout.mainWall.modules, project, "m", allHardware);
  const mainTotalWidth = mainModules.reduce((max, m) => Math.max(max, m.position.x + m.width), 0);

  const result: BlueprintData = {
    layout: layout.layoutType,
    materials: {
      mdfColor: project.materialPalette[1]?.name || project.materialPalette[0]?.name || "MDP 18mm",
      internalColor: project.materialPalette[0]?.name || "MDP 18mm",
      thickness: THICKNESS,
    },
    walls: [], // P0.4 — populated by buildWallLayouts in runEnginePipeline
    mainWall: {
      totalWidth: mainTotalWidth,
      modules: mainModules,
    },
    hardwareMap: allHardware,
    factoryNotes: layout.factoryNotes,
  };

  if (layout.sideWall && layout.sideWall.modules.length > 0) {
    const sideModules = processWallModules(layout.sideWall.modules, project, "s", allHardware);
    const sideTotalWidth = sideModules.reduce((max, m) => Math.max(max, m.position.x + m.width), 0);
    result.sideWall = {
      totalWidth: sideTotalWidth,
      modules: sideModules,
    };
  }

  return result;
}

export function runInterferenceEngine(
  blueprint: BlueprintData,
  constraints: { wallW: number; wallH: number; wallD: number; roomDepth?: number; sideWallW?: number }
): InterferenceConflict[] {
  const conflicts: InterferenceConflict[] = [];
  const TOLERANCE = 2;

  function checkWallModules(modules: BlueprintModule[], wallWidth: number, wallLabel: string) {
    for (const mod of modules) {
      // Skip boundary checks for freestanding modules (islands, etc.) and upper modules (maleiro)
      const isFreestandingMod = mod.notes.some(n => n.includes("Freestanding") || n.includes("Upper"));
      if (isFreestandingMod) continue;

      // Boundary checks against this wall's width
      if (mod.boundingBox.max.x > wallWidth + TOLERANCE) {
        conflicts.push({
          moduleA: mod.name,
          type: "BOUNDARY_VIOLATION",
          severity: "CRITICAL",
          description: `Módulo ${mod.name} excede largura da ${wallLabel} (${mod.boundingBox.max.x}mm > ${wallWidth}mm)`,
        });
      }
      if (mod.boundingBox.max.y > constraints.wallH + TOLERANCE) {
        conflicts.push({
          moduleA: mod.name,
          type: "BOUNDARY_VIOLATION",
          severity: "WARNING",
          description: `Módulo ${mod.name} excede altura da ${wallLabel} (${mod.boundingBox.max.y}mm > ${constraints.wallH}mm)`,
        });
      }

      // Swing access check
      if (constraints.roomDepth) {
        const swingProjection = mod.depth + 500;
        if (swingProjection > constraints.roomDepth) {
          conflicts.push({
            moduleA: mod.name,
            type: "ERGONOMIC_HAZARD",
            severity: "WARNING",
            description: `Abertura de ${mod.name} pode conflitar com parede oposta (${swingProjection}mm projeção > ${constraints.roomDepth}mm profundidade)`,
          });
        }
      }
    }

    // Pairwise overlap checks within same wall (skip upper modules — they stack on top by design)
    for (let i = 0; i < modules.length; i++) {
      if (modules[i].notes.some(n => n.includes("Upper"))) continue;
      for (let j = i + 1; j < modules.length; j++) {
        if (modules[j].notes.some(n => n.includes("Upper"))) continue;
        const a = modules[i].boundingBox;
        const b = modules[j].boundingBox;
        if (
          a.min.x < b.max.x && a.max.x > b.min.x &&
          a.min.y < b.max.y && a.max.y > b.min.y &&
          a.min.z < b.max.z && a.max.z > b.min.z
        ) {
          conflicts.push({
            moduleA: modules[i].name,
            moduleB: modules[j].name,
            type: "OVERLAP",
            severity: "CRITICAL",
            description: `Sobreposição entre ${modules[i].name} e ${modules[j].name}`,
          });
        }
      }
    }
  }

  // Check mainWall modules against mainWall width
  checkWallModules(blueprint.mainWall.modules, constraints.wallW, "parede principal");

  // Check sideWall modules against sideWall width
  if (blueprint.sideWall && blueprint.sideWall.modules.length > 0) {
    const sideW = constraints.sideWallW || constraints.wallW;
    checkWallModules(blueprint.sideWall.modules, sideW, "parede lateral");
  }

  return conflicts;
}

const SHEET_W = 2750;
const SHEET_H = 1830;
const SAW_BLADE = 4;
const TRIM = 10;

export function runNestingEngine(blueprint: BlueprintData): NestingResult {
  // Collect all cut items from ALL walls
  const allParts: Array<{ partName: string; moduleName: string; w: number; h: number; grain: "vertical" | "horizontal" | "none"; qty: number }> = [];

  const allModules = [...blueprint.mainWall.modules, ...(blueprint.sideWall?.modules || [])];
  for (const mod of allModules) {
    for (const item of mod.cutList) {
      allParts.push({
        partName: item.piece,
        moduleName: mod.name,
        w: item.rawWidth,
        h: item.rawHeight,
        grain: item.grainDirection,
        qty: item.quantity,
      });
    }
  }

  // Expand quantities
  type Part = { partName: string; moduleName: string; w: number; h: number; grain: "vertical" | "horizontal" | "none" };
  const expanded: Part[] = [];
  for (const p of allParts) {
    for (let i = 0; i < p.qty; i++) {
      expanded.push({ partName: `${p.partName}_${i + 1}`, moduleName: p.moduleName, w: p.w, h: p.h, grain: p.grain });
    }
  }

  const usableW = SHEET_W - 2 * TRIM;
  const usableH = SHEET_H - 2 * TRIM;

  // Normalize: auto-rotate pieces that don't fit in normal orientation
  for (const part of expanded) {
    if (part.w > usableW || part.h > usableH) {
      if (part.grain === "none" && part.h <= usableW && part.w <= usableH) {
        [part.w, part.h] = [part.h, part.w];
      }
    }
  }

  // Sort by max dimension descending, then by area
  expanded.sort((a, b) => {
    const maxA = Math.max(a.w, a.h);
    const maxB = Math.max(b.w, b.h);
    if (maxB !== maxA) return maxB - maxA;
    return (b.w * b.h) - (a.w * a.h);
  });

  // ---- Maximal Rectangles Bin Packing ----
  // Each sheet tracks a list of free rectangles where parts can be placed.
  // When a part is placed, the free rect is split into remaining free rects.
  interface FreeRect { x: number; y: number; w: number; h: number; }

  interface SheetState {
    sheet: Sheet;
    freeRects: FreeRect[];
  }

  const sheetStates: SheetState[] = [];

  function createSheetState(): SheetState {
    return {
      sheet: {
        id: sheetStates.length + 1,
        width: SHEET_W,
        height: SHEET_H,
        material: blueprint.materials.internalColor,
        items: [],
        waste: 0,
      },
      freeRects: [{ x: TRIM, y: TRIM, w: usableW, h: usableH }],
    };
  }

  // Find the best free rectangle for a piece (Best Short Side Fit)
  function findBestFit(
    freeRects: FreeRect[], pw: number, ph: number, canRotate: boolean
  ): { rectIdx: number; x: number; y: number; placedW: number; placedH: number; rotated: boolean } | null {
    let bestScore = Infinity;
    let best: { rectIdx: number; x: number; y: number; placedW: number; placedH: number; rotated: boolean } | null = null;

    for (let i = 0; i < freeRects.length; i++) {
      const r = freeRects[i];

      // Normal orientation
      if (pw <= r.w && ph <= r.h) {
        {
          const leftover = Math.min(r.w - pw, r.h - ph);
          if (leftover < bestScore) {
            bestScore = leftover;
            best = { rectIdx: i, x: r.x, y: r.y, placedW: pw, placedH: ph, rotated: false };
          }
        }
      }

      // Rotated
      if (canRotate && ph <= r.w && pw <= r.h) {
        const leftover = Math.min(r.w - ph, r.h - pw);
        if (leftover < bestScore) {
          bestScore = leftover;
          best = { rectIdx: i, x: r.x, y: r.y, placedW: ph, placedH: pw, rotated: true };
        }
      }
    }

    return best;
  }

  // After placing a piece, split affected free rects (guillotine split)
  function splitFreeRects(freeRects: FreeRect[], px: number, py: number, pw: number, ph: number): void {
    const newRects: FreeRect[] = [];

    for (let i = freeRects.length - 1; i >= 0; i--) {
      const r = freeRects[i];

      // Check if this free rect overlaps with the placed piece (including saw blade kerf)
      const pieceEndX = px + pw + SAW_BLADE;
      const pieceEndY = py + ph + SAW_BLADE;
      if (px >= r.x + r.w || pieceEndX <= r.x ||
          py >= r.y + r.h || pieceEndY <= r.y) {
        continue; // No overlap
      }

      // Remove this rect and create new ones from the remaining space
      freeRects.splice(i, 1);

      // Right remainder
      const rightX = px + pw + SAW_BLADE;
      if (rightX < r.x + r.w) {
        newRects.push({ x: rightX, y: r.y, w: r.x + r.w - rightX, h: r.h });
      }

      // Bottom remainder
      const bottomY = py + ph + SAW_BLADE;
      if (bottomY < r.y + r.h) {
        newRects.push({ x: r.x, y: bottomY, w: r.w, h: r.y + r.h - bottomY });
      }

      // Left remainder (if piece doesn't start at rect's left edge)
      if (px > r.x + SAW_BLADE) {
        newRects.push({ x: r.x, y: r.y, w: px - r.x - SAW_BLADE, h: r.h });
      }

      // Top remainder (if piece doesn't start at rect's top edge)
      if (py > r.y + SAW_BLADE) {
        newRects.push({ x: r.x, y: r.y, w: r.w, h: py - r.y - SAW_BLADE });
      }
    }

    // Add new rects (filter tiny ones)
    for (const nr of newRects) {
      if (nr.w >= 50 && nr.h >= 50) { // Min 50mm to be useful
        freeRects.push(nr);
      }
    }

    // Remove redundant rects (contained within others)
    for (let i = freeRects.length - 1; i >= 0; i--) {
      for (let j = 0; j < freeRects.length; j++) {
        if (i === j) continue;
        const a = freeRects[i];
        const b = freeRects[j];
        if (a.x >= b.x && a.y >= b.y &&
            a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h) {
          freeRects.splice(i, 1);
          break;
        }
      }
    }
  }

  // Place each part using First Fit Decreasing with maximal rectangles
  for (const part of expanded) {
    const canRotate = part.grain === "none";
    let placed = false;

    // Try all existing sheets
    for (const state of sheetStates) {
      const fit = findBestFit(state.freeRects, part.w, part.h, canRotate);
      if (fit) {
        state.sheet.items.push({
          x: fit.x, y: fit.y,
          width: fit.placedW, height: fit.placedH,
          rotated: fit.rotated,
          partName: part.partName,
          moduleName: part.moduleName,
          grainDirection: part.grain,
        });
        splitFreeRects(state.freeRects, fit.x, fit.y, fit.placedW, fit.placedH);
        placed = true;
        break;
      }
    }

    if (!placed) {
      // New sheet
      const state = createSheetState();
      sheetStates.push(state);

      const fit = findBestFit(state.freeRects, part.w, part.h, canRotate);
      if (fit) {
        state.sheet.items.push({
          x: fit.x, y: fit.y,
          width: fit.placedW, height: fit.placedH,
          rotated: fit.rotated,
          partName: part.partName,
          moduleName: part.moduleName,
          grainDirection: part.grain,
        });
        splitFreeRects(state.freeRects, fit.x, fit.y, fit.placedW, fit.placedH);
      } else {
        // Oversized — place anyway
        state.sheet.items.push({
          x: TRIM, y: TRIM,
          width: part.w, height: part.h,
          rotated: false,
          partName: part.partName,
          moduleName: part.moduleName,
          grainDirection: part.grain,
        });
      }
    }
  }

  // Post-processing: try to consolidate low-efficiency sheets into earlier sheets
  // Move items from low-efficiency sheets (< 30%) into free space on other sheets
  for (let i = sheetStates.length - 1; i >= 1; i--) {
    const srcState = sheetStates[i];
    const srcArea = srcState.sheet.items.reduce((sum, it) => sum + it.width * it.height, 0);
    const srcEff = srcArea / (SHEET_W * SHEET_H);
    if (srcEff >= 0.3) continue; // Only try to merge low-efficiency sheets

    const movedItems: number[] = [];
    for (let itemIdx = 0; itemIdx < srcState.sheet.items.length; itemIdx++) {
      const item = srcState.sheet.items[itemIdx];
      const canRotateItem = item.grainDirection === "none";
      // Try earlier sheets
      for (let j = 0; j < i; j++) {
        const dstState = sheetStates[j];
        const fit = findBestFit(dstState.freeRects, item.width, item.height, canRotateItem);
        if (fit) {
          dstState.sheet.items.push({
            x: fit.x, y: fit.y,
            width: fit.placedW, height: fit.placedH,
            rotated: fit.rotated || item.rotated,
            partName: item.partName,
            moduleName: item.moduleName,
            grainDirection: item.grainDirection,
          });
          splitFreeRects(dstState.freeRects, fit.x, fit.y, fit.placedW, fit.placedH);
          movedItems.push(itemIdx);
          break;
        }
      }
    }
    // Remove moved items from source (reverse order to preserve indices)
    for (const idx of movedItems.reverse()) {
      srcState.sheet.items.splice(idx, 1);
    }
  }

  // Build final sheets array (exclude empty sheets after consolidation)
  const sheets = sheetStates.map(s => s.sheet).filter(s => s.items.length > 0);
  // Re-number sheets
  sheets.forEach((s, i) => { s.id = i + 1; });

  // Calculate efficiency (capped at 100%)
  const totalSheetArea = sheets.length * SHEET_W * SHEET_H;
  const totalPartArea = expanded.reduce((sum, p) => sum + p.w * p.h, 0);
  const globalEfficiency = totalSheetArea > 0 ? Math.min(100, (totalPartArea / totalSheetArea) * 100) : 0;

  // Calculate waste per sheet (cap at 0 minimum — negative means overlapping pieces)
  for (const sheet of sheets) {
    const sheetPartArea = sheet.items.reduce((sum, it) => sum + it.width * it.height, 0);
    const rawWaste = 1 - sheetPartArea / (SHEET_W * SHEET_H);
    if (rawWaste < 0) {
      console.warn(`[NESTING] Chapa ${sheet.id}: waste negativo (${(rawWaste * 100).toFixed(1)}%) — possível sobreposição de peças. Ajustando para 0.`);
    }
    sheet.waste = Math.max(0, rawWaste);
  }

  // Edge band linear meters
  const totalLinearEdgeBand = expanded.reduce((sum, p) => sum + 2 * (p.w + p.h), 0) / 1000;

  return {
    sheets,
    totalSheets: sheets.length,
    totalParts: expanded.length,
    globalEfficiency: Math.round(globalEfficiency * 10) / 10,
    totalLinearEdgeBand: Math.round(totalLinearEdgeBand * 10) / 10,
    estimatedMachineTime: Math.round((expanded.length * 0.5) * 10) / 10,
  };
}

// ============================================================
// Full pipeline: briefing → all engines → results
// ============================================================

export function runEnginePipeline(
  briefing: ParsedBriefing,
  sessionId: string
): EngineResults {
  console.log("[ENGINE] Starting pipeline...");

  // Step 0: Normalize briefing & assess readiness (P0.0)
  const normalized = normalizeBriefing(briefing);
  const issues = detectIssues(normalized);
  normalized._normalization.issues = issues;
  const readiness = assessReadiness(normalized, issues);
  normalized._normalization.readiness = readiness;

  const criticalIssues = issues.filter(i => i.severity === "critical");
  if (criticalIssues.length > 0) {
    console.log(`[ENGINE] Normalization: ${issues.length} issues (${criticalIssues.length} critical)`);
    for (const ci of criticalIssues) {
      console.log(`[ENGINE]   CRITICAL: ${ci.message} [${ci.fieldPath}]`);
    }
  }

  if (!readiness.isReadyForGeneration) {
    console.log(`[ENGINE] Readiness score: ${readiness.score} — BLOCKED`);
    console.log(`[ENGINE] Blocking reasons: ${readiness.blockingReasons.join("; ")}`);
    throw new Error(
      `Briefing nao esta pronto para geracao (score: ${readiness.score}). ` +
      `Razoes: ${readiness.blockingReasons.join("; ")}. ` +
      `Resolva os ${criticalIssues.length} problema(s) critico(s) antes de gerar.`
    );
  }

  console.log(`[ENGINE] Normalization OK — readiness: ${readiness.score}, issues: ${issues.length} (0 critical)`);

  // Step 1: Transform briefing (use normalized version)
  const project = briefingToProject(normalized, sessionId);
  const layout = briefingToLayout(normalized);
  console.log(`[ENGINE] Layout: ${layout.mainWall.modules.length} modules`);

  // Step 2: calcEngine
  const blueprint = runCalcEngine(layout, project);
  const totalParts = blueprint.mainWall.modules.reduce(
    (sum, m) => sum + m.cutList.reduce((s, c) => s + c.quantity, 0), 0
  );
  console.log(`[ENGINE] Blueprint: ${blueprint.mainWall.modules.length} modules, ${totalParts} parts`);

  // Step 2.5: Build multi-wall layout (P0.4)
  const resolvedWalls = resolveWalls(briefing);
  const { walls: wallLayouts, decisions } = buildWallLayouts(
    blueprint.mainWall,
    blueprint.sideWall,
    resolvedWalls,
  );
  blueprint.walls = wallLayouts;
  // Update mainWall/sideWall from walls[] for backward compat
  if (wallLayouts.length > 0) {
    blueprint.mainWall = { totalWidth: wallLayouts[0].totalModuleWidth, modules: wallLayouts[0].modules };
  }
  if (wallLayouts.length > 1) {
    const sideMods = wallLayouts.slice(1).flatMap(w => w.modules);
    blueprint.sideWall = {
      totalWidth: sideMods.reduce((max, m) => Math.max(max, (m.position?.x || 0) + m.width), 0),
      modules: sideMods,
    };
  }
  const distNotes = distributionSummary(wallLayouts);
  blueprint.factoryNotes.push(...distNotes);
  console.log(`[ENGINE] Multi-wall: ${wallLayouts.length} walls, ${decisions.length} assignments`);

  // Step 3: interferenceEngine — pass per-wall widths
  const walls = resolvedWalls;
  const sideWallW = walls.length > 1 ? walls[1].usable_mm : project.wallWidth;
  const conflicts = runInterferenceEngine(blueprint, {
    wallW: project.wallWidth,
    wallH: project.wallHeight,
    wallD: project.wallDepth,
    roomDepth: project.roomDepth,
    sideWallW,
  });
  blueprint.conflicts = conflicts;
  const criticals = conflicts.filter((c) => c.severity === "CRITICAL").length;
  const warnings = conflicts.filter((c) => c.severity === "WARNING").length;
  console.log(`[ENGINE] Interference: ${criticals} critical, ${warnings} warnings`);

  // Step 4: nestingEngine
  const nesting = runNestingEngine(blueprint);
  console.log(`[ENGINE] Nesting: ${nesting.totalSheets} sheets, ${nesting.globalEfficiency}% efficiency`);

  // Estimated cost (rough: ~$85/sheet + hardware USD, R$280/sheet BRL)
  const sheetCostUsd = nesting.totalSheets * 85;
  const hardwareCostUsd = blueprint.hardwareMap.length * 15;
  const estimatedCostUsd = sheetCostUsd + hardwareCostUsd;
  const estimatedCostBrl = nesting.totalSheets * 280 + blueprint.hardwareMap.length * 45;

  const totalModules = blueprint.mainWall.modules.length + (blueprint.sideWall?.modules?.length || 0);

  return {
    blueprint,
    nesting,
    conflicts,
    summary: {
      total_modules: totalModules,
      total_parts: nesting.totalParts,
      total_sheets: nesting.totalSheets,
      efficiency_percent: nesting.globalEfficiency,
      critical_conflicts: criticals,
      warnings,
      hardware_items: blueprint.hardwareMap.length,
      estimated_cost_usd: estimatedCostUsd,
      estimated_cost_brl: estimatedCostBrl,
    },
  };
}
