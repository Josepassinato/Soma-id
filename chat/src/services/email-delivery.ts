/**
 * email-delivery.ts
 * Sends engine results by email with HTML summary + PDF technical sheet + JSON attachment.
 * PDF generation uses Playwright headless Chrome to render the HTML report.
 * SMTP config reused from PayJarvis (Zoho SMTP).
 */

import nodemailer from "nodemailer";
import { chromium } from "playwright";
import type { Browser } from "playwright";
import type { EngineResults, BlueprintModule, Sheet, InterferenceConflict } from "./engine-bridge.js";
import type { ParsedBriefing } from "../types.js";
import { generateHtmlReport } from "./html-report.js";

// SMTP config — same Zoho credentials as PayJarvis
const SMTP_HOST = process.env.SMTP_HOST || "smtp.zoho.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465", 10);
const SMTP_SECURE = process.env.SMTP_SECURE !== "false";
const SMTP_USER = process.env.SMTP_USER || "admin@payjarvis.com";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "";
const SMTP_FROM = process.env.SMTP_FROM || "SOMA ID <admin@payjarvis.com>";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });
  }
  return transporter;
}

export function isEmailConfigured(): boolean {
  return !!SMTP_PASSWORD && SMTP_PASSWORD.length > 0;
}

// ============================================================
// Browser cache — reuse Playwright browser instance across calls
// ============================================================

let cachedBrowser: Browser | null = null;
let browserIdleTimer: ReturnType<typeof setTimeout> | null = null;
const BROWSER_IDLE_MS = 5 * 60 * 1000; // 5 minutes

async function getBrowser(): Promise<Browser> {
  // Reset idle timer on every access
  if (browserIdleTimer) {
    clearTimeout(browserIdleTimer);
    browserIdleTimer = null;
  }

  if (cachedBrowser && cachedBrowser.isConnected()) {
    scheduleBrowserClose();
    return cachedBrowser;
  }

  cachedBrowser = await chromium.launch({ headless: true });
  scheduleBrowserClose();
  return cachedBrowser;
}

function scheduleBrowserClose(): void {
  if (browserIdleTimer) clearTimeout(browserIdleTimer);
  browserIdleTimer = setTimeout(async () => {
    if (cachedBrowser) {
      try { await cachedBrowser.close(); } catch { /* ignore */ }
      cachedBrowser = null;
    }
    browserIdleTimer = null;
  }, BROWSER_IDLE_MS);
}

// ============================================================
// PDF generation via Playwright
// ============================================================

export async function generatePdfBuffer(
  briefing: ParsedBriefing,
  results: EngineResults,
  sessionId?: string,
): Promise<Buffer> {
  const html = generateHtmlReport(briefing, results, sessionId || "unknown");

  try {
    return await renderPdfFromHtml(html, "A2");
  } catch (err) {
    // Fallback: try A3 landscape if A2 fails (some environments have memory limits)
    console.warn("[email-delivery] A2 PDF failed, falling back to A3:", (err as Error).message);
    try {
      return await renderPdfFromHtml(html, "A3");
    } catch (fallbackErr) {
      throw new Error(
        `PDF generation failed (A2 and A3 fallback): ${(fallbackErr as Error).message}`,
      );
    }
  }
}

async function renderPdfFromHtml(
  html: string,
  format: "A2" | "A3",
): Promise<Buffer> {
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.setContent(html, { waitUntil: "networkidle" });

    const pdfBytes = await page.pdf({
      format,
      landscape: true,
      printBackground: true,
    });

    return Buffer.from(pdfBytes);
  } finally {
    await page.close();
    await context.close();
  }
}

// ============================================================
// HTML email body
// ============================================================

function buildHtmlBody(
  briefing: ParsedBriefing,
  results: EngineResults,
  sessionId: string,
): string {
  const s = results.summary;
  const client = briefing.client?.name || "Cliente";
  const projectType = briefing.project?.type || "Projeto";
  const designer = briefing.project?.designer || "-";
  const dateDue = briefing.project?.date_due || "-";
  const area = briefing.space?.total_area_m2 || "-";
  const height = briefing.space?.ceiling_height_m || "-";
  const zones = (briefing.zones || []).map(z => z.name).join(", ");
  const colors = (briefing.materials?.colors || []).join(", ") || "-";
  const criticals = results.conflicts.filter(c => c.severity === "CRITICAL").length;
  const warnings = results.conflicts.filter(c => c.severity === "WARNING").length;
  const reportUrl = `https://somaid.12brain.org/session/${sessionId}/report`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
  <div style="background:#1a1a2e;padding:24px 30px;">
    <h1 style="color:#fff;margin:0;font-size:22px;">SOMA ID — Resultado do Projeto</h1>
    <p style="color:#aab;margin:6px 0 0;font-size:13px;">Folha tecnica gerada automaticamente</p>
  </div>

  <div style="padding:24px 30px;">
    <h2 style="color:#1a1a2e;border-bottom:2px solid #e0e0e0;padding-bottom:8px;font-size:16px;">Dados do Projeto</h2>
    <table style="width:100%;font-size:14px;border-collapse:collapse;margin:12px 0;">
      <tr><td style="padding:6px 0;color:#666;width:40%;">Cliente</td><td style="padding:6px 0;font-weight:600;">${client}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Tipo</td><td style="padding:6px 0;">${projectType}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Designer</td><td style="padding:6px 0;">${designer}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Entrega</td><td style="padding:6px 0;">${dateDue}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Area</td><td style="padding:6px 0;">${area} m2</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Pe-direito</td><td style="padding:6px 0;">${height} m</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Zonas</td><td style="padding:6px 0;">${zones}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Materiais</td><td style="padding:6px 0;">${colors}</td></tr>
    </table>

    <h2 style="color:#1a1a2e;border-bottom:2px solid #e0e0e0;padding-bottom:8px;font-size:16px;margin-top:20px;">Resultado dos Engines</h2>
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin:12px 0;">
      <div style="flex:1;min-width:120px;background:#f0f7ff;border-radius:8px;padding:14px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#2c3e50;">${s.total_modules}</div>
        <div style="font-size:12px;color:#666;">Modulos</div>
      </div>
      <div style="flex:1;min-width:120px;background:#f0fff0;border-radius:8px;padding:14px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#27ae60;">${s.total_parts}</div>
        <div style="font-size:12px;color:#666;">Pecas</div>
      </div>
      <div style="flex:1;min-width:120px;background:#fff8f0;border-radius:8px;padding:14px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#e67e22;">${s.total_sheets}</div>
        <div style="font-size:12px;color:#666;">Chapas</div>
      </div>
      <div style="flex:1;min-width:120px;background:#f5f0ff;border-radius:8px;padding:14px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#8e44ad;">${s.efficiency_percent}%</div>
        <div style="font-size:12px;color:#666;">Eficiencia</div>
      </div>
    </div>

    <table style="width:100%;font-size:14px;border-collapse:collapse;margin:12px 0;">
      <tr><td style="padding:6px 0;color:#666;">Ferragens</td><td style="padding:6px 0;">${s.hardware_items} itens</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Custo estimado</td><td style="padding:6px 0;font-weight:700;font-size:18px;color:#27ae60;">US$ ${s.estimated_cost_usd.toLocaleString()}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Conflitos criticos</td><td style="padding:6px 0;color:${criticals > 0 ? '#e74c3c' : '#27ae60'};font-weight:600;">${criticals}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Avisos</td><td style="padding:6px 0;">${warnings}</td></tr>
    </table>

    ${criticals > 0 ? `
    <div style="background:#fdf0f0;border-left:4px solid #e74c3c;padding:12px;margin:12px 0;border-radius:0 8px 8px 0;">
      <strong style="color:#e74c3c;">Conflitos detectados:</strong>
      <ul style="margin:8px 0 0;padding-left:20px;font-size:13px;">
        ${results.conflicts.filter(c => c.severity === 'CRITICAL').map(c => `<li>${c.description}</li>`).join('')}
      </ul>
    </div>` : ''}

    <div style="background:#f0f7ff;border-left:4px solid #2c3e50;padding:14px;margin:16px 0;border-radius:0 8px 8px 0;">
      <strong style="color:#2c3e50;">Ver relatorio online:</strong><br>
      <a href="${reportUrl}" style="color:#2980b9;font-size:14px;word-break:break-all;">${reportUrl}</a>
    </div>

    <p style="font-size:12px;color:#999;margin-top:20px;border-top:1px solid #eee;padding-top:12px;">
      Gerado por SOMA ID em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.<br>
      Anexos: folha tecnica (PDF) e dados completos (JSON).
    </p>
  </div>
</div>
</body>
</html>`;
}

// ============================================================
// Send delivery email
// ============================================================

export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendDeliveryEmail(
  toEmail: string,
  briefing: ParsedBriefing,
  results: EngineResults,
  sessionId: string,
): Promise<DeliveryResult> {
  if (!isEmailConfigured()) {
    return { success: false, error: "SMTP nao configurado. Defina SMTP_PASSWORD no .env." };
  }

  const clientName = briefing.client?.name || "Cliente";
  const projectType = briefing.project?.type || "projeto";
  const today = new Date().toISOString().slice(0, 10);
  const subject = `SOMA-ID — Projeto ${projectType} — ${clientName} — ${today}`;

  // Generate PDF attachment
  const pdfBuffer = await generatePdfBuffer(briefing, results);

  const jsonBuffer = Buffer.from(JSON.stringify({
    session_id: sessionId,
    generated_at: new Date().toISOString(),
    briefing,
    engine_results: results,
  }, null, 2), "utf-8");

  const htmlBody = buildHtmlBody(briefing, results, sessionId);

  const safeClient = clientName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
  const safeType = projectType.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
  const pdfFilename = `SOMA-ID_${safeClient}_${safeType}_${today}.pdf`;

  try {
    const info = await getTransporter().sendMail({
      from: SMTP_FROM,
      to: toEmail,
      subject,
      html: htmlBody,
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
        {
          filename: `soma-id_${safeClient}_dados-completos.json`,
          content: jsonBuffer,
          contentType: "application/json",
        },
      ],
    });

    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    // Reset transporter on auth errors
    if (err.code === "EAUTH" || err.responseCode === 535) {
      transporter = null;
    }
    return { success: false, error: err.message || String(err) };
  }
}
