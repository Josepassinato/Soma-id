/**
 * briefing-issues.ts
 * P0.0 — Detects ambiguities, contradictions, and missing data in a NormalizedBriefing.
 * Returns structured BriefingIssue[] for inspection and question generation.
 */

import type { NormalizedBriefing, BriefingIssue } from "../types.js";

export function detectIssues(briefing: NormalizedBriefing): BriefingIssue[] {
  const issues: BriefingIssue[] = [];
  const confs = briefing._normalization.fieldConfidences;

  // --- AD-005: Missing critical fields ---
  const criticalFields = [
    { path: "project.type", label: "Tipo de projeto" },
    { path: "space.ceiling_height_m", label: "Pe-direito" },
    { path: "space.entry_point.wall", label: "Parede de entrada" },
    { path: "client.name", label: "Nome do cliente" },
  ];

  for (const cf of criticalFields) {
    const fc = confs.find(c => c.fieldPath === cf.path);
    if (fc && fc.status === "missing") {
      issues.push({
        code: "AD-005",
        severity: "critical",
        fieldPath: cf.path,
        message: `Campo critico ausente: ${cf.label}`,
        suggestedQuestion: `Qual e o(a) ${cf.label.toLowerCase()} do projeto?`,
      });
    }
  }

  // Check walls exist
  const wallConfs = confs.filter(c => c.fieldPath.startsWith("space.walls["));
  const missingWalls = wallConfs.filter(c => c.status === "missing");
  if (wallConfs.length === 0) {
    issues.push({
      code: "AD-005",
      severity: "critical",
      fieldPath: "space.walls",
      message: "Nenhuma parede definida com dimensoes",
      suggestedQuestion: "Quais sao as medidas das paredes do ambiente?",
    });
  } else if (missingWalls.length > 0) {
    issues.push({
      code: "AD-005",
      severity: "warning",
      fieldPath: "space.walls",
      message: `${missingWalls.length} parede(s) sem dimensoes definidas`,
      suggestedQuestion: "Pode confirmar as medidas de todas as paredes?",
    });
  }

  // Check zones exist
  const zoneConfs = confs.filter(c => c.fieldPath.match(/^zones\[\d+\]$/));
  if (zoneConfs.length === 0) {
    issues.push({
      code: "AD-005",
      severity: "critical",
      fieldPath: "zones",
      message: "Nenhuma zona definida no projeto",
      suggestedQuestion: "Quais areas/zonas o projeto deve ter? (ex: cabideiro, sapateira, gavetas, vitrine)",
    });
  }

  // Check materials
  const matConf = confs.find(c => c.fieldPath === "materials.colors");
  if (matConf && matConf.status === "missing") {
    issues.push({
      code: "AD-004",
      severity: "warning",
      fieldPath: "materials.colors",
      message: "Material/cor nao especificado — sistema usara default",
      suggestedQuestion: "Qual material/cor sera usado? (ex: Lana, Lord, Freijo, Cinza Grafite)",
    });
  }

  // --- AD-001: Quantity ambiguity ---
  const ambiguousQty = confs.filter(c => c.fieldPath.includes(".quantity") && c.status === "ambiguous");
  for (const aq of ambiguousQty) {
    issues.push({
      code: "AD-001",
      severity: "warning",
      fieldPath: aq.fieldPath,
      message: aq.notes || "Quantidade ambigua — nao esta claro se sao itens ou pares",
      rawEvidence: aq.notes,
      suggestedQuestion: "Pode confirmar: quando diz a quantidade, sao itens individuais ou pares?",
    });
  }

  // --- AD-002: Dimension contradiction ---
  // Check if ceiling height was inferred with low confidence
  const ceilingConf = confs.find(c => c.fieldPath === "space.ceiling_height_m");
  if (ceilingConf && ceilingConf.wasInferred && ceilingConf.score < 0.7) {
    issues.push({
      code: "AD-002",
      severity: "warning",
      fieldPath: "space.ceiling_height_m",
      message: `Pe-direito inferido (${briefing.space.ceiling_height_m}m) — pode nao corresponder ao real`,
      suggestedQuestion: "Qual e o pe-direito exato do ambiente?",
    });
  }

  // --- AD-003: Zone issues ---
  for (let zi = 0; zi < (briefing.zones || []).length; zi++) {
    const zone = briefing.zones[zi];
    const zc = confs.find(c => c.fieldPath === `zones[${zi}]`);

    // Zone without items
    if (!zone.items || zone.items.length === 0) {
      issues.push({
        code: "AD-003",
        severity: "warning",
        fieldPath: `zones[${zi}].items`,
        message: `Zona "${zone.name}" definida sem itens — nao sera possivel gerar modulos`,
        suggestedQuestion: `O que a zona "${zone.name}" deve conter? (prateleiras, gavetas, cabideiro, etc.)`,
      });
    }

    // Zone without wall assignment
    if (!zone.wall) {
      issues.push({
        code: "AD-003",
        severity: "info",
        fieldPath: `zones[${zi}].wall`,
        message: `Zona "${zone.name}" sem parede atribuida — sera colocada na parede principal`,
      });
    }
  }

  // --- AD-006: Inferred fields requiring confirmation ---
  const inferredHighImpact = confs.filter(c =>
    c.wasInferred && c.requiresConfirmation && c.score < 0.7
  );
  for (const inf of inferredHighImpact) {
    // Don't duplicate if already reported above
    if (!issues.some(i => i.fieldPath === inf.fieldPath)) {
      issues.push({
        code: "AD-006",
        severity: "warning",
        fieldPath: inf.fieldPath,
        message: `Campo inferido com baixa confianca: ${inf.fieldPath} (score: ${inf.score})`,
        rawEvidence: inf.notes,
      });
    }
  }

  return issues;
}
