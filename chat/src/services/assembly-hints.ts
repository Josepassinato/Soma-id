/**
 * assembly-hints.ts
 * P1.6 — Minimal assembly hints for supported module types.
 * Not a full assembly manual — groundwork for production bridge.
 */

/* ============================================================
   Types
   ============================================================ */

export interface AssemblyHint {
  hintId: string;
  moduleTraceId: string;
  pieceRole: string;
  joinType: "minifix" | "cavilha" | "parafuso" | "cola" | "encaixe";
  relatedPieceRole: string;
  notes: string;
  sequence: number;   // assembly order hint (lower = first)
}

export interface AssemblyProfile {
  profileId: string;
  moduleSubtype: string;
  displayName: string;
  supportedJoinTypes: string[];
  requiredHardware: string[];
  hints: Array<{
    pieceRole: string;
    joinType: string;
    relatedPieceRole: string;
    notes: string;
    sequence: number;
  }>;
}

/* ============================================================
   Built-in Assembly Profiles
   ============================================================ */

let hintCounter = 0;

const PROFILES: AssemblyProfile[] = [
  {
    profileId: "asm-drawer-bank",
    moduleSubtype: "drawer_bank",
    displayName: "Gaveteiro — Montagem Base",
    supportedJoinTypes: ["minifix", "cavilha", "corredica"],
    requiredHardware: ["corredica", "puxador", "minifix"],
    hints: [
      { pieceRole: "base", joinType: "minifix", relatedPieceRole: "lateral", notes: "Fixar base nas laterais com minifix (2 por lado)", sequence: 1 },
      { pieceRole: "lateral", joinType: "minifix", relatedPieceRole: "tampo", notes: "Fixar tampo nas laterais com minifix", sequence: 2 },
      { pieceRole: "fundo", joinType: "parafuso", relatedPieceRole: "lateral", notes: "Parafusar fundo 6mm nas laterais e tampo/base", sequence: 3 },
      { pieceRole: "lateral", joinType: "corredica", relatedPieceRole: "gaveta", notes: "Instalar corredicas telescopicas nas laterais", sequence: 4 },
      { pieceRole: "frente_gaveta", joinType: "parafuso", relatedPieceRole: "gaveta", notes: "Fixar frontal da gaveta no corpo da gaveta", sequence: 5 },
      { pieceRole: "puxador", joinType: "parafuso", relatedPieceRole: "frente_gaveta", notes: "Instalar puxador na frente da gaveta", sequence: 6 },
    ],
  },
  {
    profileId: "asm-long-hanging",
    moduleSubtype: "long_garment",
    displayName: "Cabideiro Longo — Montagem",
    supportedJoinTypes: ["minifix", "cavilha", "cabideiro"],
    requiredHardware: ["cabideiro", "suporte", "minifix"],
    hints: [
      { pieceRole: "base", joinType: "minifix", relatedPieceRole: "lateral", notes: "Fixar base nas laterais", sequence: 1 },
      { pieceRole: "lateral", joinType: "minifix", relatedPieceRole: "tampo", notes: "Fixar tampo", sequence: 2 },
      { pieceRole: "fundo", joinType: "parafuso", relatedPieceRole: "lateral", notes: "Parafusar fundo", sequence: 3 },
      { pieceRole: "lateral", joinType: "cabideiro", relatedPieceRole: "barra", notes: "Instalar suportes + barra cabideiro oval 25mm", sequence: 4 },
    ],
  },
  {
    profileId: "asm-shelves",
    moduleSubtype: "shelves",
    displayName: "Prateleiras — Montagem",
    supportedJoinTypes: ["minifix", "suporte_prateleira"],
    requiredHardware: ["suporte", "minifix"],
    hints: [
      { pieceRole: "base", joinType: "minifix", relatedPieceRole: "lateral", notes: "Fixar base", sequence: 1 },
      { pieceRole: "lateral", joinType: "minifix", relatedPieceRole: "tampo", notes: "Fixar tampo", sequence: 2 },
      { pieceRole: "fundo", joinType: "parafuso", relatedPieceRole: "lateral", notes: "Parafusar fundo", sequence: 3 },
      { pieceRole: "prateleira", joinType: "suporte_prateleira", relatedPieceRole: "lateral", notes: "Inserir suportes e apoiar prateleiras", sequence: 4 },
    ],
  },
  {
    profileId: "asm-sink-base",
    moduleSubtype: "sink_base",
    displayName: "Bancada Pia — Montagem",
    supportedJoinTypes: ["minifix", "dobradica"],
    requiredHardware: ["dobradica", "puxador", "minifix", "pe"],
    hints: [
      { pieceRole: "base", joinType: "minifix", relatedPieceRole: "lateral", notes: "Fixar base", sequence: 1 },
      { pieceRole: "fundo", joinType: "parafuso", relatedPieceRole: "lateral", notes: "Parafusar fundo", sequence: 2 },
      { pieceRole: "porta", joinType: "dobradica", relatedPieceRole: "lateral", notes: "Instalar dobradicas 35mm nas portas", sequence: 3 },
      { pieceRole: "pe", joinType: "parafuso", relatedPieceRole: "base", notes: "Instalar pes regulaveis", sequence: 4 },
    ],
  },
  {
    profileId: "asm-oven-tower",
    moduleSubtype: "oven_tower",
    displayName: "Torre Forno — Montagem",
    supportedJoinTypes: ["minifix", "cavilha", "suporte_prateleira"],
    requiredHardware: ["dobradica", "suporte", "minifix"],
    hints: [
      { pieceRole: "base", joinType: "minifix", relatedPieceRole: "lateral", notes: "Fixar base nas laterais", sequence: 1 },
      { pieceRole: "lateral", joinType: "minifix", relatedPieceRole: "tampo", notes: "Fixar tampo", sequence: 2 },
      { pieceRole: "fundo", joinType: "parafuso", relatedPieceRole: "lateral", notes: "Parafusar fundo", sequence: 3 },
      { pieceRole: "prateleira", joinType: "minifix", relatedPieceRole: "lateral", notes: "Fixar prateleiras internas (nicho forno + micro)", sequence: 4 },
      { pieceRole: "lateral", joinType: "parafuso", relatedPieceRole: "parede", notes: "Fixar torre na parede (obrigatorio por seguranca)", sequence: 5 },
    ],
  },
];

/* ============================================================
   Profile Lookup & Hint Generation
   ============================================================ */

export function findAssemblyProfile(moduleSubtype: string): AssemblyProfile | null {
  return PROFILES.find(p => p.moduleSubtype === moduleSubtype) || null;
}

export function generateAssemblyHints(moduleSubtype: string, moduleTraceId: string): AssemblyHint[] {
  const profile = findAssemblyProfile(moduleSubtype);
  if (!profile) return [];

  return profile.hints.map(h => ({
    hintId: `hint-${++hintCounter}`,
    moduleTraceId,
    pieceRole: h.pieceRole,
    joinType: h.joinType as AssemblyHint["joinType"],
    relatedPieceRole: h.relatedPieceRole,
    notes: h.notes,
    sequence: h.sequence,
  }));
}

export function getAllProfiles(): AssemblyProfile[] {
  return [...PROFILES];
}
