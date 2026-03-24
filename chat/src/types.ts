export interface ParsedBriefing {
  client: {
    name: string;
    email: string;
    phone: string;
    referral: string;
  };
  project: {
    type: string;
    designer: string;
    date_in: string;
    date_due: string;
  };
  space: {
    total_area_m2: number;
    ceiling_height_m: number;
    walls: Array<{
      id: string;
      length_m: number;
      features: string[];
    }>;
    entry_point: {
      wall: string;
      width_m: number;
    };
  };
  zones: Array<{
    name: string;
    dimensions?: { width_m: number; depth_m: number };
    items: Array<{
      type: string;
      subtype?: string;
      quantity?: number;
      features?: string[];
      sizes?: string[];
      categories?: string[];
      access?: string;
      priority?: string;
    }>;
    constraints?: Array<{
      type: string;
      value_mm: number;
      relative_to: string;
    }>;
  }>;
  materials: {
    colors: string[];
    mood_board: string;
  };
  _meta: {
    sources: string[];
    confidence: number;
    missing_fields: string[];
    raw_text?: string;
    timestamp: string;
    model?: string;
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
