/**
 * factory-release.ts
 * P2.2 — Factory release gate and workflow.
 * Separates commercial approval from factory release with explicit gates.
 */

import type { FabricationValidationSummary } from "./fabrication-validator.js";
import { getMeasurementByProject, hasCriticalDeviations, type MeasurementRecord } from "./measurement-records.js";

/* ============================================================
   Types
   ============================================================ */

export type ReleaseStatus =
  | "awaiting_measurement"
  | "post_measurement_revision"
  | "ready_for_factory_review"
  | "factory_released"
  | "factory_blocked";

export interface ReleaseValidation {
  commercialApprovalConfirmed: boolean;
  measurementConfirmed: boolean;
  measurementWaived: boolean;
  fabricationValidationPassed: boolean;
  requiredArtifactsPresent: boolean;
  blockingIssues: string[];
  canRelease: boolean;
}

export interface FactoryRelease {
  releaseId: string;
  projectId: string;
  revisionId: string;
  proposalId?: string;
  measurementId?: string;
  releasedBy: string;
  releasedAt: string;
  releaseStatus: ReleaseStatus;
  releaseNotes?: string;
  validation: ReleaseValidation;
}

/* ============================================================
   Storage
   ============================================================ */

const releases = new Map<string, FactoryRelease>();

/* ============================================================
   Release Gate — validates all criteria before allowing release
   ============================================================ */

export function validateReleaseGate(
  projectId: string,
  options: {
    commerciallyApproved: boolean;
    fabricationValidation?: FabricationValidationSummary;
    hasReport: boolean;
    hasBom: boolean;
    hasDxf: boolean;
    measurementRequired?: boolean;  // default true
  },
): ReleaseValidation {
  const blockingIssues: string[] = [];

  // RG-001: Commercial approval
  const commercialApprovalConfirmed = options.commerciallyApproved;
  if (!commercialApprovalConfirmed) {
    blockingIssues.push("Proposta comercial nao foi aprovada");
  }

  // RG-002: Measurement
  const measurementRequired = options.measurementRequired !== false;
  const measurement = getMeasurementByProject(projectId);
  const measurementConfirmed = measurement !== null;
  const measurementWaived = !measurementRequired;

  if (measurementRequired && !measurementConfirmed) {
    blockingIssues.push("Medicao final nao registrada");
  }

  // Check measurement deviations
  if (measurement && hasCriticalDeviations(measurement)) {
    blockingIssues.push("Medicao final possui desvios criticos — revisao pos-medicao necessaria");
  }

  // RG-004: Fabrication validation
  const fabricationValidationPassed = options.fabricationValidation
    ? options.fabricationValidation.isReadyForFactory
    : false;
  if (!fabricationValidationPassed) {
    blockingIssues.push("Validacao de fabricabilidade possui problemas criticos");
  }

  // RG-005: Required artifacts
  const requiredArtifactsPresent = options.hasReport && options.hasBom;
  if (!requiredArtifactsPresent) {
    blockingIssues.push("Artefatos minimos ausentes (report tecnico ou BOM)");
  }

  const canRelease = blockingIssues.length === 0;

  return {
    commercialApprovalConfirmed,
    measurementConfirmed,
    measurementWaived,
    fabricationValidationPassed,
    requiredArtifactsPresent,
    blockingIssues,
    canRelease,
  };
}

/* ============================================================
   Release Actions
   ============================================================ */

/** Attempt factory release — validates gates first */
export function releaseToFactory(
  projectId: string,
  revisionId: string,
  releasedBy: string,
  options: {
    commerciallyApproved: boolean;
    fabricationValidation?: FabricationValidationSummary;
    hasReport: boolean;
    hasBom: boolean;
    hasDxf: boolean;
    measurementRequired?: boolean;
    proposalId?: string;
    releaseNotes?: string;
  },
): FactoryRelease {
  const validation = validateReleaseGate(projectId, options);
  const measurement = getMeasurementByProject(projectId);

  const releaseId = `rel-${projectId}-${Date.now()}`;

  const release: FactoryRelease = {
    releaseId,
    projectId,
    revisionId,
    proposalId: options.proposalId,
    measurementId: measurement?.measurementId,
    releasedBy,
    releasedAt: new Date().toISOString(),
    releaseStatus: validation.canRelease ? "factory_released" : "factory_blocked",
    releaseNotes: options.releaseNotes,
    validation,
  };

  releases.set(releaseId, release);
  return release;
}

/** Get release by project */
export function getReleaseByProject(projectId: string): FactoryRelease | null {
  for (const [, release] of releases) {
    if (release.projectId === projectId) return release;
  }
  return null;
}

/** Get release by ID */
export function getRelease(releaseId: string): FactoryRelease | null {
  return releases.get(releaseId) || null;
}
