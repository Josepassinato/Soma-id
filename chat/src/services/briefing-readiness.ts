/**
 * briefing-readiness.ts
 * P0.0 — Evaluates whether a NormalizedBriefing is ready for engine generation.
 * Computes readiness score, identifies blocking reasons, and gates the pipeline.
 */

import type { NormalizedBriefing, BriefingReadiness, BriefingIssue } from "../types.js";

const MIN_READINESS_SCORE = 0.8;
const MAX_CRITICAL_CONTRADICTIONS = 0;

/** Critical fields that MUST be present for generation */
const BLOCKING_FIELDS = [
  "project.type",
  "space.ceiling_height_m",
  "space.entry_point.wall",
];

export function assessReadiness(
  briefing: NormalizedBriefing,
  issues: BriefingIssue[],
): BriefingReadiness {
  const confs = briefing._normalization.fieldConfidences;
  const blockingReasons: string[] = [];

  // Count critical missing fields
  const criticalMissing = confs.filter(c =>
    BLOCKING_FIELDS.includes(c.fieldPath) && c.status === "missing"
  );

  // Count critical contradictions
  const criticalContradictions = issues.filter(i =>
    i.severity === "critical" && (i.code === "AD-002" || i.code === "AD-003")
  );

  // Count critical issues total
  const criticalIssues = issues.filter(i => i.severity === "critical");

  // Fields requiring confirmation
  const needsConfirmation = confs
    .filter(c => c.requiresConfirmation)
    .map(c => c.fieldPath);

  // Check blocking conditions
  if (criticalMissing.length > 0) {
    for (const cm of criticalMissing) {
      blockingReasons.push(`Campo critico ausente: ${cm.fieldPath}`);
    }
  }

  if (criticalContradictions.length > MAX_CRITICAL_CONTRADICTIONS) {
    blockingReasons.push(`${criticalContradictions.length} contradicao(oes) critica(s) detectada(s)`);
  }

  // Must have walls
  const hasWalls = (briefing.space.walls || []).some(w => w.length_m > 0);
  if (!hasWalls) {
    blockingReasons.push("Nenhuma parede com dimensoes definidas");
  }

  // Must have at least one zone with items
  const hasZonesWithItems = (briefing.zones || []).some(z => z.items && z.items.length > 0);
  if (!hasZonesWithItems) {
    blockingReasons.push("Nenhuma zona com itens definidos");
  }

  // Calculate readiness score
  const totalCritical = BLOCKING_FIELDS.length + 2; // +2 for walls and zones
  const confirmedCritical = totalCritical - criticalMissing.length
    - (hasWalls ? 0 : 1)
    - (hasZonesWithItems ? 0 : 1);

  // Weighted score: critical fields have most weight
  const criticalScore = confirmedCritical / totalCritical;

  // Bonus for having more confirmed fields vs inferred
  const allFieldCount = confs.length || 1;
  const confirmedCount = confs.filter(c => c.status === "confirmed").length;
  const confirmationBonus = confirmedCount / allFieldCount * 0.2;

  // Penalty for issues
  const issuePenalty = (criticalIssues.length * 0.15) + (issues.filter(i => i.severity === "warning").length * 0.03);

  const rawScore = Math.max(0, Math.min(1, criticalScore * 0.8 + confirmationBonus - issuePenalty));
  const score = Math.round(rawScore * 100) / 100;

  const isReady = score >= MIN_READINESS_SCORE
    && blockingReasons.length === 0
    && criticalContradictions.length <= MAX_CRITICAL_CONTRADICTIONS;

  return {
    isReadyForGeneration: isReady,
    score,
    criticalMissingCount: criticalMissing.length,
    criticalContradictionCount: criticalContradictions.length,
    fieldsRequiringConfirmation: needsConfirmation,
    blockingReasons,
  };
}
