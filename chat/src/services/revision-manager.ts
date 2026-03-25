/**
 * revision-manager.ts
 * P1.5 — Revision and versioning workflow.
 * Tracks changes between versions, links proposals to revisions to executives.
 */

import type {
  ProjectRevision, RevisionChange, RevisionLink,
  RevisionStatus, ChangeType, CommercialProposal,
} from "../types.js";
import type { PricingResult } from "./pricing-engine.js";

/* ============================================================
   Storage
   ============================================================ */

const revisions = new Map<string, ProjectRevision[]>();
const links = new Map<string, RevisionLink[]>();

/* ============================================================
   Create Revision
   ============================================================ */

let changeCounter = 0;

export function createRevision(
  projectId: string,
  changeNotes: string,
  options: {
    proposalId?: string;
    pricingResult?: PricingResult;
    catalogId?: string;
    catalogVersion?: string;
    basedOnRevisionId?: string;
    changes?: Array<{
      changeType: ChangeType;
      entityType: string;
      entityTraceId?: string;
      fieldPath?: string;
      beforeValue?: string;
      afterValue?: string;
      impactSummary: string;
    }>;
  } = {},
): ProjectRevision {
  const projectRevisions = revisions.get(projectId) || [];
  const versionNumber = projectRevisions.length + 1;

  const revisionId = `rev-${projectId}-v${versionNumber}`;

  const revisionChanges: RevisionChange[] = (options.changes || []).map(c => ({
    changeId: `chg-${++changeCounter}`,
    revisionId,
    changeType: c.changeType,
    entityType: c.entityType,
    entityTraceId: c.entityTraceId,
    fieldPath: c.fieldPath,
    beforeValue: c.beforeValue,
    afterValue: c.afterValue,
    impactSummary: c.impactSummary,
  }));

  const revision: ProjectRevision = {
    revisionId,
    projectId,
    proposalId: options.proposalId,
    versionNumber,
    status: "draft",
    basedOnRevisionId: options.basedOnRevisionId || (projectRevisions.length > 0 ? projectRevisions[projectRevisions.length - 1].revisionId : undefined),
    changeNotes,
    changes: revisionChanges,
    pricingSnapshotPrice: options.pricingResult?.commercialPrice.finalPrice,
    pricingSnapshotCurrency: options.pricingResult?.currency,
    catalogId: options.catalogId,
    catalogVersion: options.catalogVersion,
    createdAt: new Date().toISOString(),
  };

  projectRevisions.push(revision);
  revisions.set(projectId, projectRevisions);

  return revision;
}

/* ============================================================
   Status Transitions
   ============================================================ */

export function updateRevisionStatus(revisionId: string, projectId: string, status: RevisionStatus): ProjectRevision | null {
  const projectRevisions = revisions.get(projectId);
  if (!projectRevisions) return null;
  const rev = projectRevisions.find(r => r.revisionId === revisionId);
  if (!rev) return null;
  rev.status = status;
  return rev;
}

export function markCommerciallyApproved(projectId: string): ProjectRevision | null {
  const projectRevisions = revisions.get(projectId);
  if (!projectRevisions || projectRevisions.length === 0) return null;
  const latest = projectRevisions[projectRevisions.length - 1];
  latest.status = "commercially_approved";
  return latest;
}

export function markExecutiveGenerated(projectId: string): ProjectRevision | null {
  const projectRevisions = revisions.get(projectId);
  if (!projectRevisions || projectRevisions.length === 0) return null;
  const latest = projectRevisions[projectRevisions.length - 1];
  latest.status = "executive_generated";
  return latest;
}

/* ============================================================
   Link Management
   ============================================================ */

export function createRevisionLink(
  projectId: string,
  proposalVersionNumber: number,
  projectRevisionNumber: number,
  approvalStatus: "draft" | "presented" | "revised" | "approved" | "rejected",
  executiveRevisionNumber?: number,
): RevisionLink {
  const link: RevisionLink = {
    proposalVersionNumber,
    projectRevisionNumber,
    executiveRevisionNumber,
    approvalStatus,
  };
  const projectLinks = links.get(projectId) || [];
  projectLinks.push(link);
  links.set(projectId, projectLinks);
  return link;
}

/* ============================================================
   Queries
   ============================================================ */

export function getRevisions(projectId: string): ProjectRevision[] {
  return revisions.get(projectId) || [];
}

export function getLatestRevision(projectId: string): ProjectRevision | null {
  const projectRevisions = revisions.get(projectId);
  if (!projectRevisions || projectRevisions.length === 0) return null;
  return projectRevisions[projectRevisions.length - 1];
}

export function getRevisionLinks(projectId: string): RevisionLink[] {
  return links.get(projectId) || [];
}

export function getApprovedRevision(projectId: string): ProjectRevision | null {
  const projectRevisions = revisions.get(projectId);
  if (!projectRevisions) return null;
  return projectRevisions.find(r => r.status === "commercially_approved" || r.status === "executive_generated") || null;
}

/* ============================================================
   Change Detection Helper
   ============================================================ */

/** Detect changes between two pricing results */
export function detectPricingChanges(
  revisionId: string,
  before: PricingResult | undefined,
  after: PricingResult,
): RevisionChange[] {
  if (!before) return [];
  const changes: RevisionChange[] = [];

  if (before.commercialPrice.finalPrice !== after.commercialPrice.finalPrice) {
    changes.push({
      changeId: `chg-${++changeCounter}`,
      revisionId,
      changeType: "pricing_changed",
      entityType: "pricing",
      fieldPath: "commercialPrice.finalPrice",
      beforeValue: `${before.currency} ${before.commercialPrice.finalPrice}`,
      afterValue: `${after.currency} ${after.commercialPrice.finalPrice}`,
      impactSummary: `Preco alterado de ${before.commercialPrice.finalPrice} para ${after.commercialPrice.finalPrice}`,
    });
  }

  if (before.commercialPrice.markupApplied !== after.commercialPrice.markupApplied) {
    changes.push({
      changeId: `chg-${++changeCounter}`,
      revisionId,
      changeType: "pricing_changed",
      entityType: "pricing",
      fieldPath: "commercialPrice.markupApplied",
      beforeValue: `${(before.commercialPrice.markupApplied * 100).toFixed(0)}%`,
      afterValue: `${(after.commercialPrice.markupApplied * 100).toFixed(0)}%`,
      impactSummary: `Markup alterado`,
    });
  }

  return changes;
}

/** Detect material changes between briefing versions */
export function detectMaterialChanges(
  revisionId: string,
  beforeMaterials: string[],
  afterMaterials: string[],
): RevisionChange[] {
  const changes: RevisionChange[] = [];
  const added = afterMaterials.filter(m => !beforeMaterials.includes(m));
  const removed = beforeMaterials.filter(m => !afterMaterials.includes(m));

  if (added.length > 0 || removed.length > 0) {
    changes.push({
      changeId: `chg-${++changeCounter}`,
      revisionId,
      changeType: "material_changed",
      entityType: "material",
      beforeValue: beforeMaterials.join(", "),
      afterValue: afterMaterials.join(", "),
      impactSummary: `Materiais: ${added.length > 0 ? `+${added.join(",")}` : ""} ${removed.length > 0 ? `-${removed.join(",")}` : ""}`.trim(),
    });
  }

  return changes;
}
