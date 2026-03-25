export interface ParsedBriefing {
  client: {
    name: string;
    email: string;
    phone: string | null;
    referral: string;
  };
  project: {
    type: string;
    scope?: string;
    designer: string;
    date_in: string;
    date_due: string | null;
  };
  space: {
    total_area_m2: number;
    ceiling_height_m: number;
    walls: Array<{
      id: string;
      label?: string;
      length_m: number;
      features: string[];
      segments?: Array<{
        length_m: number;
        function: string;
      }>;
    }>;
    entry_point: {
      wall: string;
      width_m: number;
      position?: string;
    };
  };
  zones: Array<{
    name: string;
    wall?: string;
    position?: string;
    dimensions?: { width_m: number; depth_m: number };
    priority_rule?: string;
    items: Array<{
      type: string;
      subtype?: string;
      quantity?: number;
      features?: string[];
      sizes?: string[];
      categories?: string[];
      access?: string;
      priority?: string;
      notes?: string;
    }>;
    constraints?: Array<{
      type: string;
      value_mm: number;
      relative_to: string;
      notes?: string;
    }>;
  }>;
  materials: {
    colors: string[];
    color_assignments?: {
      body: string | null;
      doors: string | null;
      accent: string | null;
    };
    manufacturer?: string;
    thickness_mm?: number;
    mood_board: string;
  };
  gaps?: Array<{
    field: string;
    description: string;
    priority: string;
    category: string;
  }>;
  _meta: {
    sources: string[];
    confidence: number;
    missing_fields: string[];
    cross_reference_notes?: string[];
    raw_text?: string;
    timestamp: string;
    model?: string;
  };
}

/* ============================================================
   Briefing Normalization & Confidence Layer (P0.0)
   ============================================================ */

/** Status of a single field's confidence */
export type FieldStatus = "confirmed" | "inferred" | "ambiguous" | "contradictory" | "missing";

/** Source of the field data */
export type FieldSource = "user_text" | "user_audio" | "pdf" | "image" | "system_default" | "system_inference" | "merged";

/** Confidence metadata for a single critical field */
export interface FieldConfidence {
  fieldPath: string;
  score: number;             // 0.0 to 1.0
  status: FieldStatus;
  source: FieldSource;
  wasInferred: boolean;
  requiresConfirmation: boolean;
  notes?: string;
}

/** Issue severity */
export type IssueSeverity = "info" | "warning" | "critical";

/** A detected problem in the briefing */
export interface BriefingIssue {
  code: string;              // e.g. "NR-001", "AD-002"
  severity: IssueSeverity;
  fieldPath: string;
  message: string;
  rawEvidence?: string;      // the original text that caused the issue
  suggestedQuestion?: string; // question to ask the user to resolve
}

/** Readiness assessment for engine generation */
export interface BriefingReadiness {
  isReadyForGeneration: boolean;
  score: number;             // 0.0 to 1.0
  criticalMissingCount: number;
  criticalContradictionCount: number;
  fieldsRequiringConfirmation: string[];
  blockingReasons: string[];
}

/** Normalized briefing — extends ParsedBriefing with confidence layer */
export interface NormalizedBriefing extends ParsedBriefing {
  _normalization: {
    fieldConfidences: FieldConfidence[];
    issues: BriefingIssue[];
    readiness: BriefingReadiness;
    normalizedAt: string;
    version: number;          // schema version for backward compat
  };
}

/* ============================================================
   Factory Catalog Truth Layer (P1.1)
   ============================================================ */

export interface CatalogMaterial {
  materialId: string;
  displayName: string;
  normalizedName: string;     // lowercase, no accents
  category: string;           // "madeirado", "unicolor", "vidro", "metal", etc.
  colorFamily: string;        // "brown", "white", "gray", etc.
  colorHex: string;
  texture: string;
  manufacturer?: string;
  isAvailable: boolean;
  allowedEnvironments?: string[];  // ["closet", "kitchen", "bathroom"]
  costBasis?: number;         // base cost per sheet/unit
  catalogVersion: string;
}

export interface CatalogHardware {
  hardwareId: string;
  displayName: string;
  category: string;           // "dobradica", "corredica", "puxador", "led", "sensor", etc.
  specs?: string;             // "35mm copo, soft-close"
  allowedModuleTypes?: string[];
  costBasis?: number;
  isAvailable: boolean;
}

export interface CatalogModuleTemplate {
  templateId: string;
  displayName: string;
  moduleType: string;
  moduleSubtype: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultDepth: number;
  category: string;           // "base", "upper", "freestanding"
  allowedMaterials?: string[];
  requiredHardware?: string[];
  dimensionRules?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    minDepth?: number;
    maxDepth?: number;
  };
}

export interface CatalogRule {
  ruleId: string;
  ruleType: "compatibility" | "availability" | "constraint" | "pricing";
  scope: string;              // "material", "hardware", "module", "global"
  description: string;
  severity: "info" | "warning" | "critical";
  payload?: Record<string, unknown>;
}

export interface FactoryCatalog {
  catalogId: string;
  catalogName: string;
  factoryName: string;
  storeName?: string;
  version: string;
  status: "active" | "draft" | "archived";
  materials: CatalogMaterial[];
  hardware: CatalogHardware[];
  moduleTemplates: CatalogModuleTemplate[];
  rules: CatalogRule[];
  updatedAt: string;
}

/** Diagnostic record for catalog usage vs fallback */
export interface CatalogDiagnostic {
  entityType: "material" | "hardware" | "module_template";
  entityName: string;
  source: "catalog" | "fallback" | "hardcoded";
  catalogId?: string;
  catalogVersion?: string;
  notes?: string;
}

/** Summary of catalog usage in a project */
export interface CatalogUsageSummary {
  catalogId: string;
  catalogVersion: string;
  catalogName: string;
  totalLookups: number;
  catalogHits: number;
  fallbackHits: number;
  hardcodedHits: number;
  diagnostics: CatalogDiagnostic[];
}

/* ============================================================
   Commercial Proposal Workflow (P1.4)
   ============================================================ */

export type ProposalStatus = "draft" | "presented" | "revised" | "approved" | "rejected";

export interface ProposalVersion {
  versionNumber: number;
  summary: string;
  commercialImageUrl?: string;
  pricingSnapshot: {
    currency: string;
    technicalCost: number;
    commercialPrice: number;
    markupPercent: number;
    installationCharge: number;
  };
  selectedMaterials: string[];
  moduleCount: number;
  scopeNotes?: string;
  commercialTerms?: string;
  changeNotes?: string;
  generatedAt: string;
}

export interface ProposalApproval {
  status: ProposalStatus;
  reason?: string;
  requestedChanges?: string[];
  timestamp: string;
}

export interface CommercialProposal {
  proposalId: string;
  sessionId: string;
  projectId: string;
  pricingProfileId: string;
  catalogId: string;
  catalogVersion: string;
  clientName: string;
  projectType: string;
  designer: string;
  currentVersion: number;
  versions: ProposalVersion[];
  approvals: ProposalApproval[];
  status: ProposalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BriefingResponse {
  success: boolean;
  data?: ParsedBriefing;
  error?: string;
  sources_processed: Array<{
    type: "pdf" | "image" | "audio" | "text";
    filename?: string;
    size_bytes?: number;
    extracted_text?: string;
  }>;
}
