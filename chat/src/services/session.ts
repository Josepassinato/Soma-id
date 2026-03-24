import type { ParsedBriefing } from "../types.js";
import type { EngineResults } from "./engine-bridge.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = join(__dirname, "..", "..", "data", "sessions");

export type SessionState =
  | "PARSED"        // Briefing parsed, checklist validated, gaps identified
  | "QUESTIONING"   // Asking clarifying questions
  | "REVIEWING"     // All data complete, showing summary
  | "CONFIRMED"     // User confirmed
  | "GENERATING"    // Engines running
  | "COMPLETED"     // Engines finished, results ready
  | "DELIVERED";    // Results sent by email

export interface GapItem {
  id: string;
  category: "project" | "space" | "zones" | "materials";
  field: string;
  status: "MISSING" | "PARTIAL" | "AMBIGUOUS";
  description: string;
  current_value?: unknown;
}

export interface QuestionBlock {
  block_number: number;
  total_blocks: number;
  total_questions: number;
  answered_so_far: number;
  remaining: number;
  questions: Array<{
    id: string;
    gap_id: string;
    text: string;
    theme: string;
  }>;
}

export interface Session {
  id: string;
  project_id: string;
  state: SessionState;
  briefing: ParsedBriefing;
  gaps: GapItem[];
  questions_total: number;
  questions_answered: number;
  current_block: number;
  question_blocks: QuestionBlock[];
  corrections: Array<{ field: string; old_value: unknown; new_value: unknown; timestamp: string }>;
  interpreter_used?: boolean;
  engine_results?: EngineResults;
  engine_error?: string;
  created_at: string;
  updated_at: string;
}

// In-memory session store with disk persistence
const sessions = new Map<string, Session>();
let sequentialCounter = 0;

// Persist session to disk
function persistSession(session: Session): void {
  try {
    if (!existsSync(SESSIONS_DIR)) mkdirSync(SESSIONS_DIR, { recursive: true });
    const filePath = join(SESSIONS_DIR, `${session.id}.json`);
    writeFileSync(filePath, JSON.stringify(session));
  } catch (err) {
    console.error(`[SESSION] Failed to persist ${session.id}:`, err);
  }
}

// Load sessions from disk on startup
function loadSessionsFromDisk(): void {
  try {
    if (!existsSync(SESSIONS_DIR)) return;
    const files = readdirSync(SESSIONS_DIR).filter(f => f.endsWith(".json"));
    for (const file of files) {
      try {
        const data = readFileSync(join(SESSIONS_DIR, file), "utf-8");
        const session = JSON.parse(data) as Session;
        if (session.id) {
          sessions.set(session.id, session);
          // Track sequential counter
          const match = session.project_id?.match(/-(\d+)$/);
          if (match) {
            const seq = parseInt(match[1], 10);
            if (seq > sequentialCounter) sequentialCounter = seq;
          }
        }
      } catch { /* skip corrupted files */ }
    }
    console.log(`[SESSION] Loaded ${sessions.size} sessions from disk`);
  } catch (err) {
    console.error("[SESSION] Failed to load sessions from disk:", err);
  }
}

// Load on module init
loadSessionsFromDisk();

function generateId(): string {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Extract last 4 digits from a phone string.
 * Handles formats like (954) 555-1234, +55 11 99999-1234, 9541234, etc.
 */
export function extractPhoneLast4(phone?: string | null): string {
  if (!phone) return "0000";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "0000";
  return digits.slice(-4);
}

/**
 * Try to find a phone number in raw text via regex.
 * Looks for sequences of 7+ digits (with optional formatting chars in between).
 */
function findPhoneInText(text?: string | null): string | null {
  if (!text) return null;
  // Match phone patterns: (xxx) xxx-xxxx, +xx xx xxxxx-xxxx, xxx.xxx.xxxx, etc.
  const phoneRegex = /[\+]?[\d\s\(\)\-\.]{7,20}\d/g;
  const matches = text.match(phoneRegex);
  if (!matches) return null;
  // Return first match that has at least 7 digits
  for (const m of matches) {
    const digits = m.replace(/\D/g, "");
    if (digits.length >= 7) return m;
  }
  return null;
}

/**
 * Generate project ID: SOMA-[last4phone]-[YYMM]-[sequential]
 */
export function generateProjectId(briefing: ParsedBriefing): string {
  // Try to get phone from briefing
  let phone = briefing.client?.phone || null;

  // Fallback: search in raw text
  if (!phone && briefing._meta?.raw_text) {
    phone = findPhoneInText(briefing._meta.raw_text);
  }

  const last4 = extractPhoneLast4(phone);

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  sequentialCounter++;
  const seq = String(sequentialCounter).padStart(3, "0");

  return `SOMA-${last4}-${yy}${mm}-${seq}`;
}

export function createSession(briefing: ParsedBriefing, gaps: GapItem[]): Session {
  const id = generateId();
  const projectId = generateProjectId(briefing);
  const session: Session = {
    id,
    project_id: projectId,
    state: gaps.length > 0 ? "PARSED" : "REVIEWING",
    briefing,
    gaps,
    questions_total: 0,
    questions_answered: 0,
    current_block: 0,
    question_blocks: [],
    corrections: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  sessions.set(id, session);
  persistSession(session);
  return session;
}

export function getSession(id: string): Session | undefined {
  return sessions.get(id);
}

export function updateSession(id: string, updates: Partial<Session>): Session | undefined {
  const session = sessions.get(id);
  if (!session) return undefined;
  Object.assign(session, updates, { updated_at: new Date().toISOString() });
  persistSession(session);
  return session;
}

export function deleteSession(id: string): boolean {
  return sessions.delete(id);
}
