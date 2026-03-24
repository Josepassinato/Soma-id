import { getModel } from "./gemini.js";
import type { ParsedBriefing } from "../types.js";

export function generateSummary(briefing: ParsedBriefing): string {
  const lines: string[] = [];

  lines.push("Perfeito! Tenho todas as informacoes. Vou listar tudo pra voce confirmar:\n");

  // Project info
  const p = briefing.project;
  const c = briefing.client;
  lines.push(`PROJETO: ${p?.type || "Movel planejado"} ${c?.name || ""}`);
  if (p?.designer) lines.push(`DESIGNER: ${p.designer}`);
  if (p?.date_due) lines.push(`ENTREGA: ${p.date_due}`);

  // Space
  const s = briefing.space;
  if (s) {
    const wallDims = s.walls
      ?.filter((w) => w.length_m > 0)
      .map((w) => `${w.length_m}m`)
      .join(" x ");
    const spaceDesc = wallDims || `${s.total_area_m2}m2`;
    lines.push(
      `ESPACO: ${spaceDesc}${s.ceiling_height_m ? `, pe-direito ${s.ceiling_height_m}m` : ""}`
    );
    if (s.entry_point?.wall) {
      lines.push(
        `  Entrada: parede ${s.entry_point.wall}${s.entry_point.width_m ? ` (${s.entry_point.width_m}m)` : ""}`
      );
    }
  }

  // Zones
  if (briefing.zones && briefing.zones.length > 0) {
    lines.push("\nZONAS:");
    briefing.zones.forEach((zone, idx) => {
      const dimStr = zone.dimensions
        ? ` (${zone.dimensions.width_m || "?"}m x ${zone.dimensions.depth_m || "?"}m)`
        : "";
      lines.push(`${idx + 1}. ${zone.name}${dimStr}`);

      for (const item of zone.items || []) {
        let desc = `   - ${formatItemType(item.type)}`;
        if (item.subtype) desc += ` (${item.subtype})`;
        if (item.quantity) desc += `: ${item.quantity}`;
        if (item.categories?.length) desc += ` [${item.categories.join(", ")}]`;
        if (item.features?.length) desc += ` — ${item.features.join(", ")}`;
        lines.push(desc);
      }

      if (zone.constraints?.length) {
        for (const c of zone.constraints) {
          lines.push(`   * ${c.type}: ${c.value_mm}mm (ref: ${c.relative_to})`);
        }
      }
    });
  }

  // Materials
  const m = briefing.materials;
  if (m) {
    lines.push("\nMATERIAIS:");
    if (m.colors?.length) lines.push(`- Cores: ${m.colors.join(", ")}`);
    if (m.mood_board) lines.push(`- ${m.mood_board}`);
  }

  lines.push("\nVoce confirma tudo isso? Se precisar mudar algo, me diz.");

  return lines.join("\n");
}

function formatItemType(type: string): string {
  const map: Record<string, string> = {
    hanging_bar: "Cabideiro",
    shelves: "Prateleiras",
    shoe_rack: "Sapateira",
    vitrine: "Vitrine",
    drawers: "Gavetas",
    vanity: "Bancada/Penteadeira",
    luggage_area: "Area de malas",
    jewelry_display: "Display de joias",
    gun_cases_storage: "Armario de armas",
  };
  return map[type] || type;
}

const CORRECTION_PROMPT = `Voce e um assistente de projetos de moveis planejados.
O usuario quer fazer correcoes no briefing. Analise o pedido e extraia as alteracoes.

BRIEFING ATUAL:
{BRIEFING}

PEDIDO DO USUARIO:
{REQUEST}

Retorne EXCLUSIVAMENTE JSON valido:
{
  "corrections": [
    {
      "field_path": "caminho no JSON (ex: client.name, zones[0].items[1].quantity, materials.colors)",
      "old_value": "valor atual",
      "new_value": "novo valor solicitado",
      "description": "descricao da mudanca em portugues"
    }
  ],
  "understood": true,
  "clarification_needed": null
}

Se nao entendeu o pedido, retorne:
{
  "corrections": [],
  "understood": false,
  "clarification_needed": "pergunta de esclarecimento"
}`;

export async function processCorrection(
  briefing: ParsedBriefing,
  userRequest: string
): Promise<{
  corrections: Array<{
    field_path: string;
    old_value: unknown;
    new_value: unknown;
    description: string;
  }>;
  understood: boolean;
  clarification_needed: string | null;
}> {
  const model = getModel();

  const prompt = CORRECTION_PROMPT.replace(
    "{BRIEFING}",
    JSON.stringify(briefing, null, 2).substring(0, 4000)
  ).replace("{REQUEST}", userRequest);

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    return JSON.parse(text);
  } catch (err) {
    console.error("[CORRECTION] Processing failed:", (err as Error).message);
    return {
      corrections: [],
      understood: false,
      clarification_needed: "Desculpe, nao entendi a correcao. Pode reformular?",
    };
  }
}

export function applyCorrections(
  briefing: ParsedBriefing,
  corrections: Array<{ field_path: string; new_value: unknown }>
): ParsedBriefing {
  const updated = JSON.parse(JSON.stringify(briefing)) as ParsedBriefing;

  for (const corr of corrections) {
    const parts = corr.field_path.split(/[.\[\]]+/).filter(Boolean);
    let target: unknown = updated;

    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      const asNum = parseInt(key, 10);

      if (Array.isArray(target)) {
        target = (target as unknown[])[asNum];
      } else if (target && typeof target === "object") {
        target = (target as Record<string, unknown>)[key];
      }
    }

    const lastKey = parts[parts.length - 1];
    const lastNum = parseInt(lastKey, 10);

    if (Array.isArray(target)) {
      (target as unknown[])[lastNum] = corr.new_value;
    } else if (target && typeof target === "object") {
      (target as Record<string, unknown>)[lastKey] = corr.new_value;
    }
  }

  return updated;
}
