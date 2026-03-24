import { extractPdfText } from "./pdf-parser.js";
import {
  transcribeAudio,
  analyzeImageForBriefing,
  extractBriefingData,
} from "./gemini.js";
import { audioBufferToBase64Wav } from "./audio-converter.js";
import type { ParsedBriefing, BriefingResponse } from "../types.js";

interface FileInput {
  buffer: Buffer;
  filename: string;
  mimetype: string;
}

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff"];
const AUDIO_MIMES = ["audio/wav", "audio/mpeg", "audio/mp3", "audio/ogg", "audio/webm", "audio/m4a", "audio/aac", "audio/flac", "audio/x-wav"];
const PDF_MIMES = ["application/pdf"];

function classifyFile(mimetype: string): "pdf" | "image" | "audio" | "unknown" {
  if (PDF_MIMES.includes(mimetype)) return "pdf";
  if (IMAGE_MIMES.includes(mimetype)) return "image";
  if (AUDIO_MIMES.includes(mimetype) || mimetype.startsWith("audio/")) return "audio";
  return "unknown";
}

function getAudioExt(mimetype: string): string {
  const map: Record<string, string> = {
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/ogg": "ogg",
    "audio/webm": "webm",
    "audio/m4a": "m4a",
    "audio/aac": "aac",
    "audio/flac": "flac",
  };
  return map[mimetype] || "ogg";
}

export async function processBriefing(
  files: FileInput[],
  textMessage?: string
): Promise<BriefingResponse> {
  const sources: BriefingResponse["sources_processed"] = [];
  const contentParts: string[] = [];
  const imageAnalyses: Record<string, unknown>[] = [];

  // Process each file
  for (const file of files) {
    const fileType = classifyFile(file.mimetype);
    console.log(`[BRIEFING] Processing ${file.filename} (${file.mimetype}) as ${fileType}`);

    switch (fileType) {
      case "pdf": {
        try {
          const { text, pages } = await extractPdfText(file.buffer);
          sources.push({
            type: "pdf",
            filename: file.filename,
            size_bytes: file.buffer.length,
            extracted_text: text.substring(0, 500) + (text.length > 500 ? "..." : ""),
          });
          contentParts.push(`=== PDF: ${file.filename} (${pages} paginas) ===\n${text}`);
        } catch (err) {
          // PDF text extraction failed — try as image via Gemini multimodal
          console.log(`[BRIEFING] PDF text extraction failed, trying Gemini multimodal...`);
          try {
            const base64 = file.buffer.toString("base64");
            const analysis = await analyzeImageForBriefing(base64, "application/pdf");
            imageAnalyses.push(analysis);
            sources.push({
              type: "pdf",
              filename: file.filename,
              size_bytes: file.buffer.length,
              extracted_text: `[Gemini Vision analysis: ${(analysis as { image_type?: string }).image_type || "pdf"}]`,
            });
            contentParts.push(
              `=== PDF (analise visual): ${file.filename} ===\n${JSON.stringify(analysis, null, 2)}`
            );
          } catch (err2) {
            sources.push({
              type: "pdf",
              filename: file.filename,
              size_bytes: file.buffer.length,
              extracted_text: `[ERRO: ${(err2 as Error).message}]`,
            });
          }
        }
        break;
      }

      case "image": {
        try {
          const base64 = file.buffer.toString("base64");
          const analysis = await analyzeImageForBriefing(base64, file.mimetype);
          imageAnalyses.push(analysis);
          sources.push({
            type: "image",
            filename: file.filename,
            size_bytes: file.buffer.length,
            extracted_text: `[${(analysis as { image_type?: string }).image_type || "image"}: ${((analysis as { description?: string }).description || "").substring(0, 200)}]`,
          });
          contentParts.push(
            `=== IMAGEM: ${file.filename} (${(analysis as { image_type?: string }).image_type || "image"}) ===\n${JSON.stringify(analysis, null, 2)}`
          );
        } catch (err) {
          sources.push({
            type: "image",
            filename: file.filename,
            size_bytes: file.buffer.length,
            extracted_text: `[ERRO: ${(err as Error).message}]`,
          });
        }
        break;
      }

      case "audio": {
        try {
          const ext = getAudioExt(file.mimetype);
          const { base64, mimeType } = await audioBufferToBase64Wav(file.buffer, ext);
          const transcript = await transcribeAudio(base64, mimeType);
          if (transcript) {
            sources.push({
              type: "audio",
              filename: file.filename,
              size_bytes: file.buffer.length,
              extracted_text: transcript.substring(0, 500) + (transcript.length > 500 ? "..." : ""),
            });
            contentParts.push(`=== AUDIO TRANSCRITO: ${file.filename} ===\n${transcript}`);
          } else {
            sources.push({
              type: "audio",
              filename: file.filename,
              size_bytes: file.buffer.length,
              extracted_text: "[ERRO: Transcricao retornou vazio]",
            });
          }
        } catch (err) {
          sources.push({
            type: "audio",
            filename: file.filename,
            size_bytes: file.buffer.length,
            extracted_text: `[ERRO: ${(err as Error).message}]`,
          });
        }
        break;
      }

      default:
        sources.push({
          type: "text",
          filename: file.filename,
          size_bytes: file.buffer.length,
          extracted_text: "[Tipo de arquivo nao suportado]",
        });
    }
  }

  // Add text message if present
  if (textMessage?.trim()) {
    sources.push({ type: "text", extracted_text: textMessage.substring(0, 500) });
    contentParts.push(`=== MENSAGEM DE TEXTO ===\n${textMessage}`);
  }

  // Nothing to process?
  if (contentParts.length === 0) {
    return {
      success: false,
      error: "Nenhum conteudo valido para processar. Envie PDF, imagem, audio ou texto.",
      sources_processed: sources,
    };
  }

  // Merge all content and extract structured briefing
  const mergedContent = contentParts.join("\n\n");

  try {
    const { parsed, confidence, missing_fields } = await extractBriefingData(mergedContent);

    const briefing: ParsedBriefing = {
      client: (parsed as Record<string, unknown>).client as ParsedBriefing["client"] || { name: "", email: "", phone: "", referral: "" },
      project: (parsed as Record<string, unknown>).project as ParsedBriefing["project"] || { type: "", designer: "", date_in: "", date_due: "" },
      space: (parsed as Record<string, unknown>).space as ParsedBriefing["space"] || {
        total_area_m2: 0,
        ceiling_height_m: 0,
        walls: [],
        entry_point: { wall: "", width_m: 0 },
      },
      zones: ((parsed as Record<string, unknown>).zones as ParsedBriefing["zones"]) || [],
      materials: (parsed as Record<string, unknown>).materials as ParsedBriefing["materials"] || { colors: [], mood_board: "" },
      _meta: {
        sources: sources.map((s) => s.type),
        confidence,
        missing_fields,
        raw_text: mergedContent.substring(0, 2000),
        timestamp: new Date().toISOString(),
      },
    };

    // FIX 4: If materials.colors is empty but items have color-like features, extract them
    if (
      (!briefing.materials.colors || briefing.materials.colors.length === 0) &&
      briefing.zones &&
      briefing.zones.length > 0
    ) {
      const extracted: string[] = [];
      for (const zone of briefing.zones) {
        if (zone.items) {
          for (const item of zone.items as Array<{ features?: string[] }>) {
            if (item.features) {
              for (const f of item.features) {
                if (/color|cream|beige|brown|white|black|blue|wood|canela|taupe|lord|lana|freij/i.test(f)) {
                  extracted.push(f);
                }
              }
            }
          }
        }
      }
      if (extracted.length > 0) {
        briefing.materials = {
          ...briefing.materials,
          colors: [...new Set(extracted)],
        };
      }
    }

    return {
      success: true,
      data: briefing,
      sources_processed: sources,
    };
  } catch (err) {
    return {
      success: false,
      error: `Falha na extracao de dados: ${(err as Error).message}`,
      sources_processed: sources,
    };
  }
}
