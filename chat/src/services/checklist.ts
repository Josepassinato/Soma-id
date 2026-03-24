import type { ParsedBriefing } from "../types.js";
import type { GapItem } from "./session.js";

interface CheckRule {
  id: string;
  category: GapItem["category"];
  field: string;
  description: string;
  required: boolean;
  check: (b: ParsedBriefing) => "COMPLETE" | "PARTIAL" | "MISSING";
}

const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || v === "" || v === 0;

const CHECKLIST: CheckRule[] = [
  // === PROJECT DATA ===
  {
    id: "client_name",
    category: "project",
    field: "client.name",
    description: "Nome do cliente",
    required: true,
    check: (b) => (b.client?.name ? "COMPLETE" : "MISSING"),
  },
  {
    id: "client_contact",
    category: "project",
    field: "client.email/phone",
    description: "Contato do cliente (email ou telefone)",
    required: false,
    check: (b) =>
      b.client?.email && b.client?.phone
        ? "COMPLETE"
        : b.client?.email || b.client?.phone
          ? "PARTIAL"
          : "MISSING",
  },
  {
    id: "designer",
    category: "project",
    field: "project.designer",
    description: "Designer/arquiteto responsavel",
    required: false,
    check: (b) => (b.project?.designer ? "COMPLETE" : "MISSING"),
  },
  {
    id: "date_due",
    category: "project",
    field: "project.date_due",
    description: "Data de entrega desejada",
    required: false,
    check: (b) => (b.project?.date_due ? "COMPLETE" : "MISSING"),
  },
  {
    id: "project_type",
    category: "project",
    field: "project.type",
    description: "Tipo de projeto (closet, cozinha, banheiro, etc.)",
    required: true,
    check: (b) => (b.project?.type ? "COMPLETE" : "MISSING"),
  },

  // === SPACE DIMENSIONS ===
  {
    id: "ceiling_height",
    category: "space",
    field: "space.ceiling_height_m",
    description: "Pe-direito (altura do teto)",
    required: true,
    check: (b) => (b.space?.ceiling_height_m > 0 ? "COMPLETE" : "MISSING"),
  },
  {
    id: "walls",
    category: "space",
    field: "space.walls",
    description: "Dimensoes das paredes (largura de cada parede)",
    required: true,
    check: (b) => {
      const walls = b.space?.walls;
      if (!walls || walls.length === 0) return "MISSING";
      const withLength = walls.filter((w) => w.length_m > 0);
      if (withLength.length === walls.length) return "COMPLETE";
      if (withLength.length > 0) return "PARTIAL";
      return "MISSING";
    },
  },
  {
    id: "entry_point",
    category: "space",
    field: "space.entry_point",
    description: "Posicao e largura da porta de entrada",
    required: true,
    check: (b) => {
      const ep = b.space?.entry_point;
      if (!ep) return "MISSING";
      if (ep.wall && ep.width_m > 0) return "COMPLETE";
      if (ep.wall || ep.width_m > 0) return "PARTIAL";
      return "MISSING";
    },
  },
  {
    id: "total_area",
    category: "space",
    field: "space.total_area_m2",
    description: "Area total do espaco",
    required: false,
    check: (b) => (b.space?.total_area_m2 > 0 ? "COMPLETE" : "MISSING"),
  },

  // === ZONES ===
  {
    id: "zones_defined",
    category: "zones",
    field: "zones",
    description: "Zonas/areas do projeto definidas",
    required: true,
    check: (b) => {
      if (!b.zones || b.zones.length === 0) return "MISSING";
      return "COMPLETE";
    },
  },
  {
    id: "zones_items",
    category: "zones",
    field: "zones[].items",
    description: "Itens de cada zona (o que contem: cabideiro, prateleiras, etc.)",
    required: true,
    check: (b) => {
      if (!b.zones || b.zones.length === 0) return "MISSING";
      const withItems = b.zones.filter((z) => z.items && z.items.length > 0);
      if (withItems.length === b.zones.length) return "COMPLETE";
      if (withItems.length > 0) return "PARTIAL";
      return "MISSING";
    },
  },
  {
    id: "zones_quantities",
    category: "zones",
    field: "zones[].items[].quantity",
    description: "Quantidades especificas por item (pares de sapato, bolsas, etc.)",
    required: false,
    check: (b) => {
      if (!b.zones) return "MISSING";
      const quantitativeTypes = ["shoe_rack", "vitrine", "drawers", "luggage_area", "shelves"];
      let total = 0;
      let withQty = 0;
      for (const z of b.zones) {
        for (const item of z.items || []) {
          if (quantitativeTypes.includes(item.type)) {
            total++;
            if (item.quantity && item.quantity > 0) withQty++;
          }
        }
      }
      if (total === 0) return "COMPLETE";
      if (withQty === total) return "COMPLETE";
      if (withQty > 0) return "PARTIAL";
      return "MISSING";
    },
  },
  {
    id: "zones_dimensions",
    category: "zones",
    field: "zones[].dimensions",
    description: "Dimensoes de cada zona (largura x profundidade)",
    required: false,
    check: (b) => {
      if (!b.zones || b.zones.length === 0) return "MISSING";
      const withDims = b.zones.filter(
        (z) => z.dimensions && (z.dimensions.width_m > 0 || z.dimensions.depth_m > 0)
      );
      if (withDims.length === b.zones.length) return "COMPLETE";
      if (withDims.length > 0) return "PARTIAL";
      return "MISSING";
    },
  },

  // === MATERIALS ===
  {
    id: "main_color",
    category: "materials",
    field: "materials.colors",
    description: "Cor/padrao principal do MDP/MDF",
    required: true,
    check: (b) => {
      if (!b.materials?.colors || b.materials.colors.length === 0) return "MISSING";
      return b.materials.colors.length >= 1 ? "COMPLETE" : "MISSING";
    },
  },
  {
    id: "hardware_type",
    category: "materials",
    field: "materials (hardware)",
    description: "Tipo de ferragens (soft-close, push-to-open, puxador)",
    required: false,
    check: (b) => {
      const mb = b.materials?.mood_board || "";
      const allItems = b.zones?.flatMap((z) => z.items || []) || [];
      const hasHardwareInfo =
        mb.toLowerCase().includes("soft-close") ||
        mb.toLowerCase().includes("puxador") ||
        mb.toLowerCase().includes("push") ||
        allItems.some((i) => i.features?.some((f) => f.includes("soft_close")));
      return hasHardwareInfo ? "COMPLETE" : "MISSING";
    },
  },
  {
    id: "lighting",
    category: "materials",
    field: "materials (LED/lighting)",
    description: "Especificacao de iluminacao (LED fita, spot, temperatura de cor)",
    required: false,
    check: (b) => {
      const mb = b.materials?.mood_board || "";
      const allItems = b.zones?.flatMap((z) => z.items || []) || [];
      const hasLightInfo =
        mb.toLowerCase().includes("led") ||
        allItems.some((i) => i.features?.some((f) => f.toLowerCase().includes("led")));
      return hasLightInfo ? "COMPLETE" : "MISSING";
    },
  },
];

export interface ChecklistResult {
  total_checks: number;
  complete: number;
  partial: number;
  missing: number;
  gaps: GapItem[];
  is_complete: boolean;
  summary: Record<string, { complete: number; partial: number; missing: number }>;
}

export function validateChecklist(briefing: ParsedBriefing): ChecklistResult {
  const gaps: GapItem[] = [];
  const summary: Record<string, { complete: number; partial: number; missing: number }> = {
    project: { complete: 0, partial: 0, missing: 0 },
    space: { complete: 0, partial: 0, missing: 0 },
    zones: { complete: 0, partial: 0, missing: 0 },
    materials: { complete: 0, partial: 0, missing: 0 },
  };

  let complete = 0;
  let partial = 0;
  let missing = 0;

  for (const rule of CHECKLIST) {
    const status = rule.check(briefing);

    if (status === "COMPLETE") {
      complete++;
      summary[rule.category].complete++;
    } else if (status === "PARTIAL") {
      partial++;
      summary[rule.category].partial++;
      gaps.push({
        id: rule.id,
        category: rule.category,
        field: rule.field,
        status: "PARTIAL",
        description: rule.description,
      });
    } else {
      missing++;
      summary[rule.category].missing++;
      gaps.push({
        id: rule.id,
        category: rule.category,
        field: rule.field,
        status: "MISSING",
        description: rule.description,
      });
    }
  }

  // If the interpreter provided structured gaps, merge them in
  // Interpreter gaps are more specific (e.g., "zones[3].dimensions")
  // and include priority/category information
  if (briefing.gaps && briefing.gaps.length > 0) {
    const existingGapFields = new Set(gaps.map((g) => g.field));

    for (const ig of briefing.gaps) {
      // Skip commercial/low-priority gaps that don't affect engineering
      if (ig.category === "commercial" && ig.priority === "LOW") continue;

      // Check if a similar gap already exists from checklist rules
      const alreadyCovered = gaps.some(
        (g) => ig.field.startsWith(g.field) || g.field.startsWith(ig.field)
      );

      if (!alreadyCovered) {
        const categoryMap: Record<string, GapItem["category"]> = {
          technical: "zones",
          dimensional: "space",
          commercial: "project",
        };

        gaps.push({
          id: `interp_${ig.field.replace(/[.\[\]]/g, "_")}`,
          category: categoryMap[ig.category] || "zones",
          field: ig.field,
          status: ig.priority === "HIGH" ? "MISSING" : "PARTIAL",
          description: ig.description,
        });
      }
    }
  }

  // Filter: only required gaps prevent is_complete
  const requiredGapIds = new Set(CHECKLIST.filter((r) => r.required).map((r) => r.id));

  return {
    total_checks: CHECKLIST.length,
    complete,
    partial,
    missing,
    gaps,
    is_complete: gaps.filter((g) => requiredGapIds.has(g.id)).length === 0,
    summary,
  };
}
