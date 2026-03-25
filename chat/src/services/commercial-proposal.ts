/**
 * commercial-proposal.ts
 * P1.4 — Commercial Proposal Workflow.
 * Creates, revises, approves/rejects proposals before executive generation.
 */

import type {
  CommercialProposal, ProposalVersion, ProposalApproval, ProposalStatus,
  ParsedBriefing,
} from "../types.js";
import type { EngineResults } from "./engine-bridge.js";
import type { PricingResult } from "./pricing-engine.js";

/* ============================================================
   Proposal Storage (in-memory, persisted via session)
   ============================================================ */

const proposals = new Map<string, CommercialProposal>();

/* ============================================================
   Create Proposal
   ============================================================ */

export function createProposal(
  sessionId: string,
  projectId: string,
  briefing: ParsedBriefing,
  results: EngineResults,
): CommercialProposal {
  const pricing = results.pricing;
  const catalog = results.catalogUsage;

  const proposalId = `prop-${sessionId}`;

  // Build first version
  const v1: ProposalVersion = {
    versionNumber: 1,
    summary: buildProposalSummary(briefing, results),
    pricingSnapshot: {
      currency: pricing?.currency || "USD",
      technicalCost: pricing?.technicalCost.subtotal || 0,
      commercialPrice: pricing?.commercialPrice.finalPrice || 0,
      markupPercent: (pricing?.commercialPrice.markupApplied || 0) * 100,
      installationCharge: pricing?.commercialPrice.installationCharge || 0,
    },
    selectedMaterials: briefing.materials?.colors || [],
    moduleCount: results.summary.total_modules,
    scopeNotes: `${results.summary.total_modules} modulos, ${results.summary.total_parts} pecas, ${results.summary.total_sheets} chapas`,
    commercialTerms: "Prazo de entrega: a combinar. Validade da proposta: 15 dias.",
    generatedAt: new Date().toISOString(),
  };

  const proposal: CommercialProposal = {
    proposalId,
    sessionId,
    projectId,
    pricingProfileId: pricing?.pricingProfileId || "unknown",
    catalogId: catalog?.catalogId || "unknown",
    catalogVersion: catalog?.catalogVersion || "unknown",
    clientName: briefing.client?.name || "Cliente",
    projectType: briefing.project?.type || "projeto",
    designer: briefing.project?.designer || "-",
    currentVersion: 1,
    versions: [v1],
    approvals: [],
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  proposals.set(proposalId, proposal);
  return proposal;
}

/* ============================================================
   Revise Proposal
   ============================================================ */

export function reviseProposal(
  proposalId: string,
  changeNotes: string,
  updatedPricing?: PricingResult,
  updatedMaterials?: string[],
  updatedTerms?: string,
): CommercialProposal | null {
  const proposal = proposals.get(proposalId);
  if (!proposal) return null;

  if (proposal.status === "approved" || proposal.status === "rejected") {
    return null; // Can't revise final states
  }

  const prev = proposal.versions[proposal.versions.length - 1];
  const newVersion: ProposalVersion = {
    versionNumber: proposal.currentVersion + 1,
    summary: prev.summary, // keep same summary unless changed
    commercialImageUrl: prev.commercialImageUrl,
    pricingSnapshot: updatedPricing ? {
      currency: updatedPricing.currency,
      technicalCost: updatedPricing.technicalCost.subtotal,
      commercialPrice: updatedPricing.commercialPrice.finalPrice,
      markupPercent: updatedPricing.commercialPrice.markupApplied * 100,
      installationCharge: updatedPricing.commercialPrice.installationCharge,
    } : prev.pricingSnapshot,
    selectedMaterials: updatedMaterials || prev.selectedMaterials,
    moduleCount: prev.moduleCount,
    scopeNotes: prev.scopeNotes,
    commercialTerms: updatedTerms || prev.commercialTerms,
    changeNotes,
    generatedAt: new Date().toISOString(),
  };

  proposal.versions.push(newVersion);
  proposal.currentVersion++;
  proposal.status = "revised";
  proposal.updatedAt = new Date().toISOString();

  return proposal;
}

/* ============================================================
   Approve / Reject
   ============================================================ */

export function approveProposal(proposalId: string, reason?: string): CommercialProposal | null {
  const proposal = proposals.get(proposalId);
  if (!proposal) return null;

  proposal.status = "approved";
  proposal.approvals.push({
    status: "approved",
    reason: reason || "Aprovado pelo cliente",
    timestamp: new Date().toISOString(),
  });
  proposal.updatedAt = new Date().toISOString();

  return proposal;
}

export function rejectProposal(proposalId: string, reason: string, requestedChanges?: string[]): CommercialProposal | null {
  const proposal = proposals.get(proposalId);
  if (!proposal) return null;

  proposal.status = "rejected";
  proposal.approvals.push({
    status: "rejected",
    reason,
    requestedChanges,
    timestamp: new Date().toISOString(),
  });
  proposal.updatedAt = new Date().toISOString();

  return proposal;
}

export function presentProposal(proposalId: string): CommercialProposal | null {
  const proposal = proposals.get(proposalId);
  if (!proposal) return null;
  if (proposal.status === "draft" || proposal.status === "revised") {
    proposal.status = "presented";
    proposal.updatedAt = new Date().toISOString();
  }
  return proposal;
}

/* ============================================================
   Lookup
   ============================================================ */

export function getProposal(proposalId: string): CommercialProposal | null {
  return proposals.get(proposalId) || null;
}

export function getProposalBySession(sessionId: string): CommercialProposal | null {
  return proposals.get(`prop-${sessionId}`) || null;
}

/* ============================================================
   Summary Builder
   ============================================================ */

function buildProposalSummary(briefing: ParsedBriefing, results: EngineResults): string {
  const client = briefing.client?.name || "Cliente";
  const type = briefing.project?.type || "projeto";
  const designer = briefing.project?.designer || "-";
  const zones = (briefing.zones || []).map(z => z.name).join(", ");
  const materials = (briefing.materials?.colors || []).join(", ");
  const modules = results.summary.total_modules;
  const price = results.pricing?.commercialPrice.finalPrice || 0;
  const currency = results.pricing?.currency || "USD";

  return [
    `PROPOSTA COMERCIAL — ${type.toUpperCase()}`,
    `Cliente: ${client}`,
    `Designer: ${designer}`,
    ``,
    `Ambiente: ${type}`,
    `Zonas: ${zones || "a definir"}`,
    `Materiais: ${materials || "a definir"}`,
    ``,
    `${modules} modulos configurados`,
    `${results.summary.total_parts} pecas | ${results.summary.total_sheets} chapas`,
    `Eficiencia de corte: ${results.summary.efficiency_percent}%`,
    ``,
    `Preco: ${currency} ${price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
  ].join("\n");
}

/* ============================================================
   Render Proposal as HTML (simple, not technical prancha)
   ============================================================ */

export function renderProposalHtml(proposal: CommercialProposal): string {
  const v = proposal.versions[proposal.versions.length - 1];
  const statusColors: Record<ProposalStatus, string> = {
    draft: "#888", presented: "#2196F3", revised: "#FF9800",
    approved: "#4CAF50", rejected: "#F44336",
  };
  const statusLabels: Record<ProposalStatus, string> = {
    draft: "RASCUNHO", presented: "APRESENTADA", revised: "REVISADA",
    approved: "APROVADA", rejected: "REJEITADA",
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Proposta ${proposal.proposalId}</title>
<style>
body{font-family:'Segoe UI',system-ui,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#333}
.header{text-align:center;border-bottom:3px solid #c9a84c;padding-bottom:20px;margin-bottom:30px}
.header h1{font-size:28px;letter-spacing:3px;color:#333}
.status{display:inline-block;padding:6px 16px;border-radius:4px;color:#fff;font-weight:bold;font-size:14px;background:${statusColors[proposal.status]}}
.section{margin:20px 0;padding:15px;background:#f9f9f9;border-radius:8px}
.section h3{margin:0 0 10px;color:#333;font-size:16px}
.price-box{text-align:center;padding:20px;background:#333;color:#fff;border-radius:8px;margin:20px 0}
.price-box .amount{font-size:32px;font-weight:bold;color:#c9a84c}
.price-box .detail{font-size:12px;opacity:0.8;margin-top:8px}
.terms{font-size:13px;color:#666;line-height:1.6;border-left:3px solid #c9a84c;padding-left:15px}
.versions{font-size:12px;color:#888}
.footer{text-align:center;font-size:11px;color:#aaa;margin-top:40px;padding-top:20px;border-top:1px solid #eee}
</style></head>
<body>
<div class="header">
  <h1>SOMA-ID</h1>
  <p style="color:#888;font-size:13px">Proposta Comercial</p>
  <div class="status">${statusLabels[proposal.status]}</div>
</div>

<div class="section">
  <h3>Projeto</h3>
  <p><strong>Cliente:</strong> ${proposal.clientName}</p>
  <p><strong>Ambiente:</strong> ${proposal.projectType}</p>
  <p><strong>Designer:</strong> ${proposal.designer}</p>
  <p><strong>Projeto:</strong> ${proposal.projectId}</p>
</div>

<div class="section">
  <h3>Escopo</h3>
  <p><strong>Modulos:</strong> ${v.moduleCount}</p>
  <p><strong>Materiais:</strong> ${v.selectedMaterials.join(", ") || "A definir"}</p>
  <p>${v.scopeNotes || ""}</p>
</div>

<div class="price-box">
  <div class="amount">${v.pricingSnapshot.currency} ${v.pricingSnapshot.commercialPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
  <div class="detail">Custo tecnico: ${v.pricingSnapshot.currency} ${v.pricingSnapshot.technicalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} | Markup: ${v.pricingSnapshot.markupPercent.toFixed(0)}% | Instalacao: ${v.pricingSnapshot.currency} ${v.pricingSnapshot.installationCharge.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
</div>

${v.commercialTerms ? `<div class="terms"><strong>Condicoes:</strong><br>${v.commercialTerms}</div>` : ""}

<div class="versions">
  <p>Versao ${v.versionNumber} | Gerada em ${v.generatedAt.split("T")[0]}</p>
  ${v.changeNotes ? `<p>Alteracoes: ${v.changeNotes}</p>` : ""}
  ${proposal.versions.length > 1 ? `<p>Historico: ${proposal.versions.length} versoes</p>` : ""}
</div>

${proposal.approvals.length > 0 ? `<div class="section"><h3>Historico de Aprovacao</h3>${proposal.approvals.map(a => `<p><strong>${statusLabels[a.status]}:</strong> ${a.reason || "-"} (${a.timestamp.split("T")[0]})</p>`).join("")}</div>` : ""}

<div class="footer">
  SOMA-ID — Sistema Inteligente de Marcenaria Industrial<br>
  Catalogo: ${proposal.catalogId} v${proposal.catalogVersion} | Perfil: ${proposal.pricingProfileId}
</div>
</body></html>`;
}
