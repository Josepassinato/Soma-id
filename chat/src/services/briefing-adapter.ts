/**
 * briefing-adapter.ts
 * Adapts the canonical JSON returned by Claude Sonnet (briefing-interpreter)
 * into the session format expected by chat.html and engine-bridge.ts.
 */

import type { ParsedBriefing } from "../types.js";
import type { Session } from "./session.js";

/**
 * Canonical JSON from Claude Sonnet may include extra fields beyond ParsedBriefing.
 * This interface captures those extras.
 */
export interface CanonicalExtras {
  constraints?: Array<{
    type: string;
    description: string;
    status: "ok" | "warning" | "critical";
    value_mm?: number;
    relative_to?: string;
  }>;
  gaps?: Array<{
    field: string;
    description: string;
    priority: "high" | "medium" | "low";
  }>;
  color_assignments?: Record<string, string | null>;
}

/**
 * Extract canonical extras from the raw Claude response that aren't
 * part of the standard ParsedBriefing type.
 */
export function extractCanonicalExtras(raw: Record<string, unknown>): CanonicalExtras {
  const extras: CanonicalExtras = {};

  // Top-level constraints (from zones or top-level)
  const allConstraints: CanonicalExtras["constraints"] = [];
  const zones = (raw.zones as Array<Record<string, unknown>>) || [];
  for (const zone of zones) {
    const zoneConstraints = (zone.constraints as Array<Record<string, unknown>>) || [];
    for (const c of zoneConstraints) {
      allConstraints.push({
        type: String(c.type || ""),
        description: `${zone.name || "Zona"}: ${c.type} ${c.value_mm ? c.value_mm + "mm" : ""}${c.relative_to ? " rel. " + c.relative_to : ""}`,
        status: classifyConstraintStatus(c),
        value_mm: (c.value_mm as number) || undefined,
        relative_to: (c.relative_to as string) || undefined,
      });
    }
  }
  if (allConstraints.length > 0) extras.constraints = allConstraints;

  // Gaps from _meta.missing_fields
  const meta = (raw._meta as Record<string, unknown>) || {};
  const missingFields = (meta.missing_fields as string[]) || [];
  if (missingFields.length > 0) {
    extras.gaps = missingFields.map((field, i) => ({
      field,
      description: humanizeField(field),
      priority: i < 3 ? "high" as const : i < 6 ? "medium" as const : "low" as const,
    }));
  }

  // Color assignments from materials
  const materials = (raw.materials as Record<string, unknown>) || {};
  const colorAssignments = (materials.color_assignments as Record<string, string | null>) || null;
  if (colorAssignments) {
    extras.color_assignments = colorAssignments;
  } else {
    // Auto-assign from colors array
    const colors = (materials.colors as string[]) || [];
    if (colors.length > 0) {
      extras.color_assignments = {
        primary: colors[0] || null,
        secondary: colors[1] || colors[0] || null,
        accent: colors[2] || null,
        island: colors[3] || null,
        internal: colors[4] || null,
      };
    }
  }

  return extras;
}

/**
 * Classify a constraint status based on ergonomic rules.
 */
function classifyConstraintStatus(c: Record<string, unknown>): "ok" | "warning" | "critical" {
  const type = String(c.type || "");
  const value = (c.value_mm as number) || 0;

  if (type === "min_passage" || type === "clearance") {
    if (value < 600) return "critical";
    if (value < 800) return "warning";
    return "ok";
  }
  if (type === "max_height") {
    if (value > 2200) return "warning";
    return "ok";
  }
  return "ok";
}

/**
 * Convert a field path to a human-readable description.
 */
function humanizeField(field: string): string {
  const map: Record<string, string> = {
    "client.name": "Nome do cliente",
    "client.email": "Email do cliente",
    "client.phone": "Telefone do cliente",
    "client.referral": "Indicacao/referencia",
    "project.type": "Tipo do projeto",
    "project.designer": "Projetista",
    "project.date_in": "Data de entrada",
    "project.date_due": "Data de entrega",
    "space.total_area_m2": "Area total",
    "space.ceiling_height_m": "Pe-direito",
    "space.walls": "Dimensoes das paredes",
    "space.entry_point": "Ponto de entrada",
    "zones": "Zonas/modulos do projeto",
    "materials.colors": "Cores/materiais",
    "materials.mood_board": "Estilo/mood board",
  };
  return map[field] || field.replace(/[._]/g, " ");
}

/**
 * Adapt the canonical briefing + extras onto a session object.
 * Mutates the session in place for convenience.
 */
export function adaptCanonicalToSession(
  briefing: ParsedBriefing,
  extras: CanonicalExtras,
  session: Session
): void {
  // 1. Core briefing is already ParsedBriefing — assign directly
  session.briefing = briefing;

  // 2. Color assignments → store in session for image generation
  if (extras.color_assignments) {
    (session as unknown as Record<string, unknown>).color_assignments = extras.color_assignments;
  }

  // 3. Constraints → store for UI display
  if (extras.constraints) {
    (session as unknown as Record<string, unknown>).interpreter_constraints = extras.constraints;
  }

  // 4. Gaps from interpreter → merge with checklist gaps
  if (extras.gaps) {
    (session as unknown as Record<string, unknown>).interpreter_gaps = extras.gaps;
  }
}
