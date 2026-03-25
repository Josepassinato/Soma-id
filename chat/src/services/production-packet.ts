/**
 * production-packet.ts
 * P2.1 — Production Packet Premium.
 * Consolidates labels, groupings, assembly references into a factory-ready packet.
 */

import type { WallLayout, EngineResults } from "./engine-bridge.js";
import { generatePieceLabels, type PieceLabel } from "./piece-labels.js";
import { generateAssemblyHints, findAssemblyProfile, type AssemblyHint } from "./assembly-hints.js";
import { generateDrillingForPiece, type DrillingPoint } from "./drilling-patterns.js";

/* ============================================================
   Types
   ============================================================ */

export interface ModuleProductionGroup {
  moduleTraceId: string;
  moduleShortLabel: string;
  moduleName: string;
  moduleSubtype: string;
  wallTraceId: string;
  wallLabel: string;
  pieces: PieceLabel[];
  assemblyProfileId: string | null;
  assemblySteps: AssemblyHint[];
  drillingPointCount: number;
  hardwareSummary: string[];
  isFullySupported: boolean;
}

export interface WallProductionGroup {
  wallTraceId: string;
  wallLabel: string;
  modules: ModuleProductionGroup[];
  totalPieces: number;
  totalDrillingPoints: number;
}

export interface ProductionPacket {
  packetId: string;
  projectId: string;
  revisionLabel: string;
  catalogId: string;
  generatedAt: string;
  wallGroups: WallProductionGroup[];
  totalModules: number;
  totalPieces: number;
  totalDrillingPoints: number;
  fullySupported: number;
  unsupported: number;
  productionNotes: string[];
}

/* ============================================================
   Packet Generation
   ============================================================ */

export function generateProductionPacket(
  walls: WallLayout[],
  results: EngineResults,
  projectId: string,
): ProductionPacket {
  const allLabels = generatePieceLabels(walls);
  const wallGroups: WallProductionGroup[] = [];
  let totalDrilling = 0;
  let fullySupported = 0;
  let unsupported = 0;

  for (const wall of walls) {
    const moduleGroups: ModuleProductionGroup[] = [];

    for (const mod of wall.modules) {
      const moduleSubtype = (mod.moduleSubtype || "") as string;
      const modLabels = allLabels.filter(l => l.moduleTraceId === (mod.traceId || ""));
      const assemblyProfile = findAssemblyProfile(moduleSubtype);
      const assemblySteps = generateAssemblyHints(moduleSubtype, mod.traceId || "");

      // Generate drilling points for laterals
      let modDrillingCount = 0;
      for (const cut of mod.cutList) {
        const pieceRole = modLabels.find(l => l.pieceTraceId === (cut.traceId || cut.shortLabel || ""))?.pieceRole || "lateral";
        const drilling = generateDrillingForPiece(moduleSubtype, pieceRole, cut.rawWidth, cut.rawHeight, mod.depth, cut.traceId);
        modDrillingCount += drilling.points.length;
      }

      totalDrilling += modDrillingCount;

      // Hardware summary from notes
      const hwSummary: string[] = [];
      if (assemblyProfile) {
        hwSummary.push(...assemblyProfile.requiredHardware.map(h => h.charAt(0).toUpperCase() + h.slice(1)));
      }

      const isSupported = assemblyProfile !== null && modDrillingCount > 0;
      if (isSupported) fullySupported++;
      else unsupported++;

      moduleGroups.push({
        moduleTraceId: mod.traceId || "",
        moduleShortLabel: mod.shortLabel || "",
        moduleName: mod.name,
        moduleSubtype,
        wallTraceId: wall.traceId || "",
        wallLabel: wall.label,
        pieces: modLabels,
        assemblyProfileId: assemblyProfile?.profileId || null,
        assemblySteps,
        drillingPointCount: modDrillingCount,
        hardwareSummary: hwSummary,
        isFullySupported: isSupported,
      });
    }

    wallGroups.push({
      wallTraceId: wall.traceId || "",
      wallLabel: wall.label,
      modules: moduleGroups,
      totalPieces: moduleGroups.reduce((s, m) => s + m.pieces.length, 0),
      totalDrillingPoints: moduleGroups.reduce((s, m) => s + m.drillingPointCount, 0),
    });
  }

  const totalPieces = wallGroups.reduce((s, w) => s + w.totalPieces, 0);
  const totalModules = wallGroups.reduce((s, w) => s + w.modules.length, 0);

  const notes: string[] = [
    `${totalModules} modulos | ${totalPieces} pecas | ${totalDrilling} pontos de furacao`,
    `${fullySupported} modulos com suporte completo de producao`,
  ];
  if (unsupported > 0) {
    notes.push(`${unsupported} modulo(s) sem perfil de montagem completo — verificar manualmente`);
  }

  return {
    packetId: `pkt-${projectId}`,
    projectId,
    revisionLabel: "Rev.00",
    catalogId: results.catalogUsage?.catalogId || "unknown",
    generatedAt: new Date().toISOString(),
    wallGroups,
    totalModules,
    totalPieces,
    totalDrillingPoints: totalDrilling,
    fullySupported,
    unsupported,
    productionNotes: notes,
  };
}

/* ============================================================
   Render as HTML section (for report integration)
   ============================================================ */

export function renderProductionPacketHtml(packet: ProductionPacket): string {
  let html = `
  <h3 style="font-size:14px;font-weight:700;margin:16px 0 8px;color:#333">Pacote de Producao</h3>
  <div class="metrics" style="margin-bottom:12px">
    <div class="metric green"><div class="val">${packet.fullySupported}</div><div class="lbl">Modulos Suportados</div></div>
    <div class="metric ${packet.unsupported > 0 ? "orange" : "green"}"><div class="val">${packet.unsupported}</div><div class="lbl">Sem Perfil Completo</div></div>
    <div class="metric blue"><div class="val">${packet.totalDrillingPoints}</div><div class="lbl">Pontos Furacao</div></div>
    <div class="metric purple"><div class="val">${packet.totalPieces}</div><div class="lbl">Pecas Total</div></div>
  </div>`;

  for (const wg of packet.wallGroups) {
    html += `<h4 style="font-size:13px;font-weight:700;margin:12px 0 6px;color:#444">${wg.wallLabel} — ${wg.modules.length} modulos, ${wg.totalPieces} pecas</h4>`;

    for (const mg of wg.modules) {
      const statusIcon = mg.isFullySupported ? "&#9989;" : "&#9888;&#65039;";
      html += `<div style="border:1px solid #ddd;border-radius:6px;padding:10px;margin:8px 0;background:#fafafa">`;
      html += `<div style="font-weight:bold;font-size:12px">${statusIcon} <span style="font-family:monospace">${mg.moduleShortLabel}</span> — ${mg.moduleName}</div>`;
      html += `<div style="font-size:11px;color:#666;margin:4px 0">${mg.pieces.length} pecas | ${mg.drillingPointCount} furos | ${mg.hardwareSummary.join(", ") || "sem ferragem especificada"}</div>`;

      if (mg.assemblySteps.length > 0) {
        html += `<div style="font-size:10px;color:#888;margin-top:4px"><strong>Montagem:</strong> `;
        html += mg.assemblySteps.sort((a, b) => a.sequence - b.sequence).map(s => `${s.sequence}. ${s.notes}`).join(" → ");
        html += `</div>`;
      }

      // Piece label table
      html += `<table style="font-size:10px;margin-top:6px;width:100%"><tr><th>Cod.</th><th>Peca</th><th>Material</th><th>L×A</th><th>Fita</th><th>Veio</th><th>Furacao</th></tr>`;
      for (const p of mg.pieces) {
        const drillIcon = p.drillingStatus === "supported" ? "&#9679;" : p.drillingStatus === "none" ? "-" : "&#9675;";
        html += `<tr>
          <td style="font-family:monospace;font-weight:bold">${p.shortLabel}</td>
          <td>${p.pieceRole}</td>
          <td>${p.material}</td>
          <td>${p.widthMm}×${p.heightMm}</td>
          <td>${p.edgeBand}</td>
          <td>${p.grainDirection === "none" ? "-" : p.grainDirection}</td>
          <td style="text-align:center">${drillIcon}</td>
        </tr>`;
      }
      html += `</table></div>`;
    }
  }

  if (packet.productionNotes.length > 0) {
    html += `<div style="font-size:11px;color:#888;margin-top:12px;border-top:1px solid #eee;padding-top:8px"><strong>Notas:</strong> ${packet.productionNotes.join(" | ")}</div>`;
  }

  return html;
}
