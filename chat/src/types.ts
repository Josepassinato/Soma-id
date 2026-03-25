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
