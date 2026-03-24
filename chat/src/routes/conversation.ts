import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { processBriefing } from "../services/briefing-parser.js";
import { interpretBriefing, mergeBriefing, type BriefingInterpreterInput } from "../services/briefing-interpreter.js";
import { extractCanonicalExtras, adaptCanonicalToSession } from "../services/briefing-adapter.js";
import { extractPdfText } from "../services/pdf-parser.js";
import { validateChecklist } from "../services/checklist.js";
import {
  createSession,
  getSession,
  updateSession,
  extractPhoneLast4,
  type Session,
} from "../services/session.js";
import {
  generateQuestions,
  buildQuestionBlocks,
  formatIntroMessage,
  formatBlockMessage,
  processAnswer,
  applyAnswersToBriefing,
} from "../services/questions.js";
import { loadMaterials, materialToVisualDescription, buildMaterialsLegend } from "../services/material-catalog.js";
import {
  generateSummary,
  processCorrection,
  applyCorrections,
} from "../services/summary.js";
import { runEnginePipeline } from "../services/engine-bridge.js";
import { transcribeAudio } from "../services/gemini.js";
import { audioBufferToBase64Wav } from "../services/audio-converter.js";
import { sendDeliveryEmail, isEmailConfigured, generatePdfBuffer } from "../services/email-delivery.js";
import { generateHtmlReport } from "../services/html-report.js";

// === Helper: extract text from request (JSON or multipart) ===
async function extractUserInput(
  request: FastifyRequest
): Promise<{ text: string; hasAudio: boolean }> {
  const contentType = request.headers["content-type"] || "";

  // JSON body
  if (contentType.includes("application/json")) {
    const body = request.body as { text?: string };
    return { text: body.text || "", hasAudio: false };
  }

  // Multipart (text + optional audio)
  if (contentType.includes("multipart")) {
    let text = "";
    let hasAudio = false;

    try {
      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "field" && part.fieldname === "text") {
          text = String(part.value || "");
        } else if (part.type === "file" && part.mimetype?.startsWith("audio/")) {
          hasAudio = true;
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) chunks.push(chunk);
          const buffer = Buffer.concat(chunks);

          const ext = part.mimetype.includes("wav") ? "wav" : part.mimetype.includes("mp3") ? "mp3" : "ogg";
          const { base64, mimeType } = await audioBufferToBase64Wav(buffer, ext);
          const transcript = await transcribeAudio(base64, mimeType);
          if (transcript) {
            text = (text ? text + "\n" : "") + transcript;
          }
        }
      }
    } catch {
      // Fallback: try reading raw body
    }

    return { text, hasAudio };
  }

  // Fallback: try body as-is
  if (request.body && typeof request.body === "object") {
    return { text: (request.body as { text?: string }).text || "", hasAudio: false };
  }

  return { text: "", hasAudio: false };
}

export default async function conversationRoutes(app: FastifyInstance) {
  // ================================================================
  // POST /session/free-chat — Proxy Gemini free-chat (keeps API key server-side)
  // ================================================================
  app.post("/session/free-chat", async (request: FastifyRequest, reply: FastifyReply) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return reply.status(500).send({ error: "GEMINI_API_KEY nao configurada." });
    }
    const body = request.body as { prompt?: string };
    if (!body?.prompt) {
      return reply.status(400).send({ error: "Campo 'prompt' obrigatorio." });
    }
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: body.prompt }] }],
            generationConfig: { maxOutputTokens: 200 },
          }),
        }
      );
      if (!res.ok) throw new Error(`Gemini ${res.status}`);
      const data = await res.json() as any;
      const parts = data.candidates?.[0]?.content?.parts;
      const text = parts?.[0]?.text || "";
      return reply.send({ text });
    } catch (err: any) {
      return reply.status(502).send({ error: err.message });
    }
  });

  // ================================================================
  // POST /session/start — Upload briefing, parse, validate → session
  // ================================================================
  app.post("/session/start", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const files: Array<{ buffer: Buffer; filename: string; mimetype: string }> = [];
      let textMessage = "";

      const parts = request.parts();
      for await (const part of parts) {
        if (part.type === "file") {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) chunks.push(chunk);
          const buffer = Buffer.concat(chunks);
          if (buffer.length === 0) continue;
          files.push({
            buffer,
            filename: part.filename || "unknown",
            mimetype: part.mimetype || "application/octet-stream",
          });
        } else if (part.type === "field" && part.fieldname === "text") {
          textMessage = String(part.value || "");
        }
      }

      console.log('[SESSION/START] Files received:', files.map(f => ({ name: f.filename, type: f.mimetype, size: f.buffer.length })));

      if (files.length === 0 && !textMessage.trim()) {
        return reply.status(400).send({
          error: "Envie pelo menos um arquivo ou mensagem de texto.",
        });
      }

      // ---------- Phase 1: Parse briefing ----------
      let briefingData: import("../types.js").ParsedBriefing | null = null;
      let sourcesProcessed: import("../types.js").BriefingResponse["sources_processed"] = [];
      let interpreterUsed = false;
      let interpreterModelUsed: string | undefined;

      const useInterpreter = process.env.USE_CLAUDE_INTERPRETER === "true";

      if (useInterpreter) {
        try {
          console.log("[INTERPRETER] Claude Sonnet interpreter enabled, preparing inputs...");

          // Classify and prepare inputs for the interpreter
          const pdfTexts: BriefingInterpreterInput["pdfTexts"] = [];
          const images: BriefingInterpreterInput["images"] = [];
          const audioTranscripts: BriefingInterpreterInput["audioTranscripts"] = [];

          const IMAGE_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff"];
          const AUDIO_MIMES_PREFIX = "audio/";

          for (const file of files) {
            if (file.mimetype === "application/pdf") {
              try {
                const { text } = await extractPdfText(file.buffer);
                pdfTexts.push({ filename: file.filename, text });
              } catch {
                // PDF text extraction failed — send as image to Claude vision
                images.push({
                  filename: file.filename,
                  base64: file.buffer.toString("base64"),
                  mediaType: "image/png",
                });
              }
            } else if (IMAGE_MIMES.includes(file.mimetype)) {
              const mediaType = file.mimetype as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
              images.push({
                filename: file.filename,
                base64: file.buffer.toString("base64"),
                mediaType,
              });
            } else if (file.mimetype.startsWith(AUDIO_MIMES_PREFIX)) {
              // Transcribe audio via Gemini (Claude doesn't do STT)
              try {
                const ext = file.mimetype.includes("wav") ? "wav" : file.mimetype.includes("mp3") ? "mp3" : "ogg";
                const { base64, mimeType } = await audioBufferToBase64Wav(file.buffer, ext);
                const transcript = await transcribeAudio(base64, mimeType);
                if (transcript) {
                  audioTranscripts.push({ filename: file.filename, text: transcript });
                }
              } catch (audioErr) {
                console.warn("[INTERPRETER] Audio transcription failed:", (audioErr as Error).message);
              }
            }
          }

          console.log('[SESSION/START] PDFs extracted:', pdfTexts.length);
          console.log('[SESSION/START] Images:', images.length);
          console.log('[SESSION/START] Calling interpreter with:', { pdfs: pdfTexts.length, images: images.length, hasText: !!textMessage });

          const interpreterInput: BriefingInterpreterInput = {
            pdfTexts,
            images,
            audioTranscripts,
            userText: textMessage || null,
          };

          const result = await interpretBriefing(interpreterInput);

          if (result.success && result.data) {
            console.log(`[INTERPRETER] Claude Sonnet usado, tokens: ${result.input_tokens} input, ${result.output_tokens} output`);
            briefingData = result.data;
            interpreterUsed = true;
            interpreterModelUsed = result.model_used;

            // Build sources_processed from inputs
            for (const pdf of pdfTexts) {
              sourcesProcessed.push({ type: "pdf", filename: pdf.filename, extracted_text: pdf.text.substring(0, 500) });
            }
            for (const img of images) {
              sourcesProcessed.push({ type: "image", filename: img.filename, extracted_text: "[Claude Vision]" });
            }
            for (const audio of audioTranscripts) {
              sourcesProcessed.push({ type: "audio", filename: audio.filename, extracted_text: audio.text.substring(0, 500) });
            }
            if (textMessage?.trim()) {
              sourcesProcessed.push({ type: "text", extracted_text: textMessage.substring(0, 500) });
            }
          } else {
            console.warn(`[INTERPRETER] Claude Sonnet falhou: ${result.error}, fallback pro Gemini Flash`);
          }
        } catch (interpreterErr) {
          console.warn(`[INTERPRETER] Exception, fallback pro Gemini Flash:`, (interpreterErr as Error).message);
        }
      }

      // Fallback: use Gemini Flash (original flow)
      if (!briefingData) {
        const parseResult = await processBriefing(files, textMessage);
        if (!parseResult.success || !parseResult.data) {
          return reply.status(422).send({
            error: parseResult.error || "Falha ao processar briefing",
            sources_processed: parseResult.sources_processed,
          });
        }
        briefingData = parseResult.data;
        sourcesProcessed = parseResult.sources_processed;
      }

      // Phase 2: Validate checklist
      const checklist = validateChecklist(briefingData);

      // Create session
      const session = createSession(briefingData, checklist.gaps);

      // If interpreter was used, adapt canonical extras onto session
      if (interpreterUsed) {
        const rawCanonical = briefingData as unknown as Record<string, unknown>;
        const extras = extractCanonicalExtras(rawCanonical);
        adaptCanonicalToSession(briefingData, extras, session);
      }

      // Save interpreter metadata on session
      if (interpreterUsed) {
        session.interpreter_used = true;
        session.briefing._meta.model = interpreterModelUsed || 'claude-sonnet-4-20250514';
      } else {
        session.interpreter_used = false;
        session.briefing._meta.model = 'gemini-2.5-flash';
      }

      // If no gaps → go straight to REVIEWING
      if (checklist.gaps.length === 0) {
        updateSession(session.id, { state: "REVIEWING" });
        const summary = generateSummary(session.briefing);
        return reply.send({
          session_id: session.id,
          project_id: session.project_id,
          state: "REVIEWING",
          checklist,
          message: summary,
          briefing: session.briefing,
        });
      }

      // Phase 3: Generate questions for gaps
      const questions = await generateQuestions(briefingData, checklist.gaps);
      const blocks = buildQuestionBlocks(questions);
      const introMessage = formatIntroMessage(questions.length);

      updateSession(session.id, {
        state: "PARSED",
        questions_total: questions.length,
        question_blocks: blocks,
      });

      return reply.send({
        session_id: session.id,
        project_id: session.project_id,
        state: "PARSED",
        checklist,
        intro_message: introMessage,
        total_questions: questions.length,
        total_gaps: checklist.gaps.length,
        gaps: checklist.gaps,
        sources_processed: sourcesProcessed,
        interpreter_used: interpreterUsed,
      });
    } catch (err) {
      console.error("[SESSION/START] Error:", err);
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ================================================================
  // POST /session/:id/add-documents — Add supplementary documents to existing session
  // ================================================================
  app.post(
    "/session/:id/add-documents",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = getSession(request.params.id);
      if (!session) return reply.status(404).send({ error: "Sessao nao encontrada" });

      try {
        const files: Array<{ buffer: Buffer; filename: string; mimetype: string }> = [];
        let textMessage = "";

        const parts = request.parts();
        for await (const part of parts) {
          if (part.type === "file") {
            const chunks: Buffer[] = [];
            for await (const chunk of part.file) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);
            if (buffer.length === 0) continue;
            files.push({
              buffer,
              filename: part.filename || "unknown",
              mimetype: part.mimetype || "application/octet-stream",
            });
          } else if (part.type === "field" && part.fieldname === "text") {
            textMessage = String(part.value || "");
          }
        }

        if (files.length === 0 && !textMessage.trim()) {
          return reply.status(400).send({
            error: "Envie pelo menos um arquivo ou mensagem de texto complementar.",
          });
        }

        // Classify inputs (same logic as /session/start)
        const pdfTexts: BriefingInterpreterInput["pdfTexts"] = [];
        const images: BriefingInterpreterInput["images"] = [];
        const audioTranscripts: BriefingInterpreterInput["audioTranscripts"] = [];

        const IMAGE_MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff"];

        for (const file of files) {
          if (file.mimetype === "application/pdf") {
            try {
              const { text } = await extractPdfText(file.buffer);
              pdfTexts.push({ filename: file.filename, text });
            } catch {
              images.push({
                filename: file.filename,
                base64: file.buffer.toString("base64"),
                mediaType: "image/png",
              });
            }
          } else if (IMAGE_MIMES.includes(file.mimetype)) {
            const mediaType = file.mimetype as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
            images.push({
              filename: file.filename,
              base64: file.buffer.toString("base64"),
              mediaType,
            });
          } else if (file.mimetype.startsWith("audio/")) {
            try {
              const ext = file.mimetype.includes("wav") ? "wav" : file.mimetype.includes("mp3") ? "mp3" : "ogg";
              const { base64, mimeType } = await audioBufferToBase64Wav(file.buffer, ext);
              const transcript = await transcribeAudio(base64, mimeType);
              if (transcript) {
                audioTranscripts.push({ filename: file.filename, text: transcript });
              }
            } catch (audioErr) {
              console.warn("[ADD-DOCS] Audio transcription failed:", (audioErr as Error).message);
            }
          }
        }

        const newInput: BriefingInterpreterInput = {
          pdfTexts,
          images,
          audioTranscripts,
          userText: textMessage || null,
        };

        console.log(
          `[ADD-DOCS] Session ${session.id} — merging ${pdfTexts.length} PDFs, ${images.length} images, ${audioTranscripts.length} audios`
        );

        // Call Claude Sonnet merge
        const mergeResult = await mergeBriefing(session.briefing, newInput);

        if (!mergeResult.success || !mergeResult.data) {
          return reply.status(422).send({
            error: mergeResult.error || "Falha ao processar documentos complementares.",
          });
        }

        // Recalculate gaps with updated briefing
        const oldGaps = session.gaps.map((g) => g.id);
        const newChecklist = validateChecklist(mergeResult.data);
        const newGapIds = newChecklist.gaps.map((g) => g.id);

        const resolvedGaps = oldGaps.filter((id) => !newGapIds.includes(id));
        const addedGaps = newChecklist.gaps.filter((g) => !oldGaps.includes(g.id));

        // Update session with merged briefing and new gaps
        updateSession(session.id, {
          briefing: mergeResult.data,
          gaps: newChecklist.gaps,
        });

        // After merge, ALWAYS regenerate question blocks based on updated gaps
        if (session.state === "PARSED" || session.state === "QUESTIONING") {
          if (newChecklist.gaps.length === 0) {
            // All gaps resolved — skip to review
            updateSession(session.id, {
              state: "REVIEWING",
              question_blocks: [],
              questions_total: 0,
              questions_answered: 0,
              current_block: 0,
            });
          } else {
            // Gaps remain — regenerate questions from scratch based on UPDATED briefing + gaps
            const newQuestions = await generateQuestions(mergeResult.data, newChecklist.gaps);
            const newBlocks = buildQuestionBlocks(newQuestions);
            updateSession(session.id, {
              state: "PARSED",
              question_blocks: newBlocks,
              questions_total: newQuestions.length,
              questions_answered: 0,
              current_block: 0,
            });
            console.log(
              `[ADD-DOCS] Regenerated ${newQuestions.length} questions for ${newChecklist.gaps.length} remaining gaps (resolved: ${resolvedGaps.length})`
            );
          }
        }

        return reply.send({
          session_id: session.id,
          state: getSession(session.id)!.state,
          briefing: mergeResult.data,
          changes: mergeResult.changes || [],
          gaps_resolved: resolvedGaps,
          gaps_added: addedGaps.map((g) => g.description),
          remaining_gaps: newChecklist.gaps.length,
          questions_regenerated: true,
          model_used: mergeResult.model_used,
        });
      } catch (err) {
        console.error("[ADD-DOCS] Error:", err);
        return reply.status(500).send({ error: (err as Error).message });
      }
    }
  );

  // ================================================================
  // POST /session/:id/questions — Get next question block
  // ================================================================
  app.post(
    "/session/:id/questions",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = getSession(request.params.id);
      if (!session) return reply.status(404).send({ error: "Sessao nao encontrada" });

      if (session.question_blocks.length === 0) {
        // No questions needed, go to review
        updateSession(session.id, { state: "REVIEWING" });
        const summary = generateSummary(session.briefing);
        return reply.send({
          state: "REVIEWING",
          message: summary,
          briefing: session.briefing,
        });
      }

      const blockIdx = session.current_block;
      if (blockIdx >= session.question_blocks.length) {
        // All blocks done — move to REVIEWING
        updateSession(session.id, { state: "REVIEWING" });
        const summary = generateSummary(session.briefing);
        return reply.send({
          state: "REVIEWING",
          message: "Pronto, era isso! Vou montar o resumo pra voce confirmar.\n\n" + summary,
          briefing: session.briefing,
        });
      }

      const block = session.question_blocks[blockIdx];
      block.answered_so_far = session.questions_answered;
      block.remaining = session.questions_total - session.questions_answered;

      updateSession(session.id, { state: "QUESTIONING" });

      const message = formatBlockMessage(block, session.questions_answered);

      return reply.send({
        state: "QUESTIONING",
        block,
        message,
        progress: {
          answered: session.questions_answered,
          total: session.questions_total,
          remaining: session.questions_total - session.questions_answered,
          current_block: blockIdx + 1,
          total_blocks: session.question_blocks.length,
        },
      });
    }
  );

  // ================================================================
  // POST /session/:id/answer — Answer current question block
  // ================================================================
  app.post(
    "/session/:id/answer",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = getSession(request.params.id);
      if (!session) return reply.status(404).send({ error: "Sessao nao encontrada" });

      const { text, hasAudio } = await extractUserInput(request);
      if (!text.trim()) {
        return reply.status(400).send({ error: "Envie uma resposta (texto ou audio)." });
      }

      const blockIdx = session.current_block;
      if (blockIdx >= session.question_blocks.length) {
        return reply.status(400).send({ error: "Nao ha perguntas pendentes." });
      }

      const currentBlock = session.question_blocks[blockIdx];

      // Process answer via Gemini
      const result = await processAnswer(currentBlock, text, session.briefing);

      // Apply answered values to briefing
      if (result.answered.length > 0) {
        const updatedBriefing = applyAnswersToBriefing(
          session.briefing,
          result.answered.map((a) => ({
            field_path: a.field_path,
            extracted_value: a.extracted_value,
          }))
        );

        const answeredCount = session.questions_answered + result.answered.length;
        const resolvedGaps = session.gaps.filter(
          (g) => !result.answered.some((a) => a.gap_id === g.id)
        );

        updateSession(session.id, {
          briefing: updatedBriefing,
          questions_answered: answeredCount,
          current_block: blockIdx + 1,
          gaps: resolvedGaps,
        });
      } else {
        // No answers extracted, still advance block
        updateSession(session.id, { current_block: blockIdx + 1 });
      }

      const updatedSession = getSession(session.id)!;
      const remaining = updatedSession.questions_total - updatedSession.questions_answered;

      // Check if all blocks done
      if (updatedSession.current_block >= updatedSession.question_blocks.length || remaining <= 0) {
        updateSession(session.id, { state: "REVIEWING" });
        const summary = generateSummary(updatedSession.briefing);

        let prefix = "";
        if (hasAudio) {
          prefix = `Entendi seu audio! `;
        }
        if (result.answered.length > 0) {
          prefix += `Com sua resposta voce ja completou ${result.answered.length} informacao${result.answered.length > 1 ? "es" : ""}. `;
        }

        return reply.send({
          state: "REVIEWING",
          message: `${prefix}Pronto, era isso! Vou montar o resumo pra voce confirmar.\n\n${summary}`,
          answered_count: result.answered.length,
          still_unclear: result.still_unclear,
          briefing: updatedSession.briefing,
        });
      }

      // More blocks to go
      let progressMsg = "";
      if (hasAudio) {
        progressMsg += `Entendi seu audio! `;
      }
      if (result.answered.length > 0) {
        progressMsg += `Otimo! Voce respondeu ${result.answered.length} pergunta${result.answered.length > 1 ? "s" : ""}. `;
      }
      progressMsg += `Faltam so mais ${remaining}.`;

      return reply.send({
        state: "QUESTIONING",
        message: progressMsg,
        answered_count: result.answered.length,
        still_unclear: result.still_unclear,
        progress: {
          answered: updatedSession.questions_answered,
          total: updatedSession.questions_total,
          remaining,
        },
      });
    }
  );

  // ================================================================
  // GET /session/:id/summary — Get double-check summary (Phase 4)
  // ================================================================
  app.get(
    "/session/:id/summary",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = getSession(request.params.id);
      if (!session) return reply.status(404).send({ error: "Sessao nao encontrada" });

      const summary = generateSummary(session.briefing);
      const checklist = validateChecklist(session.briefing);

      return reply.send({
        session_id: session.id,
        state: session.state,
        summary,
        checklist,
        briefing: session.briefing,
        corrections_history: session.corrections,
      });
    }
  );

  // ================================================================
  // POST /session/:id/confirm — Confirm or correct (Phase 4)
  // ================================================================
  app.post(
    "/session/:id/confirm",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = getSession(request.params.id);
      if (!session) return reply.status(404).send({ error: "Sessao nao encontrada" });

      const { text, hasAudio } = await extractUserInput(request);
      if (!text.trim()) {
        return reply.status(400).send({ error: "Envie sua confirmacao ou correcao." });
      }

      const lowerText = text.toLowerCase().trim();

      // Check for explicit confirmation
      const confirmWords = [
        "confirmo",
        "confirmado",
        "sim",
        "ok",
        "pode comecar",
        "aprovado",
        "tudo certo",
        "correto",
        "confirma",
        "pode",
        "perfeito",
        "isso",
        "exato",
      ];

      // Strip trailing punctuation for matching (e.g. "confirmo!" or "confirmo, tudo certo")
      const cleanText = lowerText.replace(/[.,!?;:]+/g, " ").replace(/\s+/g, " ").trim();
      const isConfirmation = confirmWords.some(
        (w) => lowerText === w || lowerText.startsWith(w + " ") || lowerText.startsWith(w + "!") ||
               cleanText === w || cleanText.startsWith(w + " ")
      );

      if (isConfirmation) {
        updateSession(session.id, { state: "CONFIRMED" });
        return reply.send({
          state: "CONFIRMED",
          message:
            "Projeto confirmado! O briefing esta pronto para processamento pelos engines (calcEngine, interferenceEngine, nestingEngine).",
          briefing: session.briefing,
        });
      }

      // It's a correction request
      const corrResult = await processCorrection(session.briefing, text);

      if (!corrResult.understood) {
        return reply.send({
          state: "REVIEWING",
          message: corrResult.clarification_needed || "Nao entendi a correcao. Pode reformular?",
          briefing: session.briefing,
        });
      }

      if (corrResult.corrections.length === 0) {
        return reply.send({
          state: "REVIEWING",
          message: "Nao identifiquei alteracoes no seu pedido. Pode especificar o que mudar?",
          briefing: session.briefing,
        });
      }

      // Apply corrections
      const updated = applyCorrections(
        session.briefing,
        corrResult.corrections.map((c) => ({
          field_path: c.field_path,
          new_value: c.new_value,
        }))
      );

      // Store correction history
      const newCorrections = [
        ...session.corrections,
        ...corrResult.corrections.map((c) => ({
          field: c.field_path,
          old_value: c.old_value,
          new_value: c.new_value,
          timestamp: new Date().toISOString(),
        })),
      ];

      updateSession(session.id, {
        briefing: updated,
        corrections: newCorrections,
      });

      // Generate new summary
      const newSummary = generateSummary(updated);
      const changesSummary = corrResult.corrections
        .map((c) => `- ${c.description}`)
        .join("\n");

      return reply.send({
        state: "REVIEWING",
        message: `Alteracoes aplicadas:\n${changesSummary}\n\nResumo atualizado:\n\n${newSummary}`,
        corrections_applied: corrResult.corrections,
        briefing: updated,
      });
    }
  );

  // ================================================================
  // POST /session/:id/generate — Run engine pipeline
  // ================================================================
  app.post(
    "/session/:id/generate",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = getSession(request.params.id);
      if (!session) return reply.status(404).send({ error: "Sessao nao encontrada" });

      if (session.state !== "CONFIRMED") {
        return reply.status(400).send({
          error: `Sessao deve estar CONFIRMED para gerar. Estado atual: ${session.state}`,
        });
      }

      updateSession(session.id, { state: "GENERATING" });

      try {
        const results = runEnginePipeline(session.briefing, session.id);

        updateSession(session.id, {
          state: "COMPLETED",
          engine_results: results,
        });

        return reply.send({
          state: "COMPLETED",
          message: `Pipeline concluido! ${results.summary.total_modules} modulos, ${results.summary.total_parts} pecas, ${results.summary.total_sheets} chapas, eficiencia ${results.summary.efficiency_percent}%.`,
          summary: results.summary,
          conflicts: results.conflicts,
        });
      } catch (err) {
        updateSession(session.id, {
          state: "CONFIRMED",
          engine_error: (err as Error).message,
        });
        return reply.status(500).send({
          error: `Falha no pipeline: ${(err as Error).message}`,
          state: "CONFIRMED",
        });
      }
    }
  );

  // ================================================================
  // GET /session/:id/result — Full engine results
  // ================================================================
  app.get(
    "/session/:id/result",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = getSession(request.params.id);
      if (!session) return reply.status(404).send({ error: "Sessao nao encontrada" });

      if (session.state !== "COMPLETED") {
        return reply.status(400).send({
          error: `Resultados disponiveis apenas no estado COMPLETED. Estado atual: ${session.state}`,
        });
      }

      return reply.send({
        session_id: session.id,
        state: session.state,
        briefing: session.briefing,
        engine_results: session.engine_results,
      });
    }
  );

  // ================================================================
  // GET /session/:id/report — HTML technical report
  // ================================================================
  app.get(
    "/session/:id/report",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = getSession(request.params.id);
      if (!session) return reply.status(404).send({ error: "Sessao nao encontrada" });

      if (!session.engine_results) {
        return reply.status(400).send({ error: "Sem resultados dos engines. Gere o projeto primeiro." });
      }

      const html = generateHtmlReport(session.briefing, session.engine_results, session.id);
      return reply.header("Content-Type", "text/html; charset=utf-8").send(html);
    }
  );

  // ================================================================
  // GET /session/:id/pdf — Download PDF technical sheet
  // ================================================================
  app.get(
    "/session/:id/pdf",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = getSession(request.params.id);
      if (!session) return reply.status(404).send({ error: "Sessao nao encontrada" });

      if (!session.engine_results) {
        return reply.status(400).send({ error: "Sem resultados dos engines. Gere o projeto primeiro." });
      }

      try {
        const pdfBuffer = await generatePdfBuffer(session.briefing, session.engine_results, session.id);
        const clientName = (session.briefing.client?.name || "Cliente").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
        const projectType = (session.briefing.project?.type || "Projeto").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 20);
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `SOMA-ID_${clientName}_${projectType}_${dateStr}.pdf`;

        return reply
          .header("Content-Type", "application/pdf")
          .header("Content-Disposition", `attachment; filename="${filename}"`)
          .header("Content-Length", pdfBuffer.length)
          .send(pdfBuffer);
      } catch (err: any) {
        console.error("[PDF] Generation error:", err);
        return reply.status(500).send({ error: `Erro ao gerar PDF: ${err.message}` });
      }
    }
  );

  // ================================================================
  // GET /session/:id — Get session state
  // ================================================================
  app.get(
    "/session/:id",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = getSession(request.params.id);
      if (!session) return reply.status(404).send({ error: "Sessao nao encontrada" });

      return reply.send({
        session_id: session.id,
        project_id: session.project_id,
        state: session.state,
        briefing: session.briefing,
        gaps: session.gaps,
        progress: {
          questions_total: session.questions_total,
          questions_answered: session.questions_answered,
          current_block: session.current_block,
          total_blocks: session.question_blocks.length,
        },
        corrections: session.corrections,
      });
    }
  );

  // ================================================================
  // POST /session/:id/deliver — Send results by email
  // ================================================================
  app.post(
    "/session/:id/deliver",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = getSession(request.params.id);
      if (!session) return reply.status(404).send({ error: "Sessao nao encontrada" });

      if (session.state !== "COMPLETED" && session.state !== "DELIVERED") {
        return reply.status(400).send({
          error: `Sessao deve estar COMPLETED para enviar. Estado atual: ${session.state}`,
        });
      }

      if (!session.engine_results) {
        return reply.status(400).send({ error: "Sem resultados dos engines para enviar." });
      }

      // Extract email from body
      let email = "";
      try {
        const body = request.body as any;
        email = body?.email || "";
      } catch {}

      if (!email || !email.includes("@")) {
        return reply.status(400).send({ error: "Informe um email valido no campo 'email'." });
      }

      if (!isEmailConfigured()) {
        return reply.status(500).send({ error: "SMTP nao configurado no servidor." });
      }

      try {
        const result = await sendDeliveryEmail(
          email,
          session.briefing,
          session.engine_results,
          session.id
        );

        if (result.success) {
          updateSession(session.id, { state: "DELIVERED" });
          return reply.send({
            state: "DELIVERED",
            message: `Resultado enviado para ${email} com sucesso.`,
            messageId: result.messageId,
          });
        } else {
          return reply.status(500).send({
            error: `Falha ao enviar email: ${result.error}`,
          });
        }
      } catch (err: any) {
        return reply.status(500).send({
          error: `Erro ao enviar email: ${err.message || String(err)}`,
        });
      }
    }
  );

  // ================================================================
  // POST /session/:id/update-phone — Update projectId with phone
  // ================================================================
  app.post(
    "/session/:id/update-phone",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = getSession(request.params.id);
      if (!session) return reply.status(404).send({ error: "Sessao nao encontrada" });

      let phone = "";
      try {
        const body = request.body as { phone?: string };
        phone = body?.phone || "";
      } catch {}

      if (!phone || phone.replace(/\D/g, "").length < 4) {
        return reply.status(400).send({ error: "Telefone invalido." });
      }

      // Update briefing with phone
      const updatedBriefing = { ...session.briefing };
      if (!updatedBriefing.client) {
        updatedBriefing.client = { name: "", email: "", phone: "", referral: "" };
      }
      updatedBriefing.client.phone = phone;

      // Regenerate project_id with the new phone
      const last4 = extractPhoneLast4(phone);
      const oldId = session.project_id;
      // Keep same YYMM and sequential, just replace phone part
      const parts = oldId.split("-");
      const newProjectId = `SOMA-${last4}-${parts[2]}-${parts[3]}`;

      updateSession(session.id, {
        briefing: updatedBriefing,
        project_id: newProjectId,
      });

      return reply.send({
        project_id: newProjectId,
        old_project_id: oldId,
        phone_last4: last4,
      });
    }
  );

  // ================================================================
  // POST /session/:id/generate-image — Generate concept image via backend
  // Keeps GEMINI_KEY server-side, builds prompt via catalog, calls Imagen/Gemini
  // ================================================================
  app.post(
    "/session/:id/generate-image",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = getSession(request.params.id);
      if (!session) return reply.status(404).send({ error: "Sessao nao encontrada" });

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return reply.status(500).send({ error: "GEMINI_API_KEY nao configurada no servidor." });
      }

      // Ensure material catalog is loaded
      await loadMaterials();

      const body = (request.body || {}) as {
        color_assignments?: Record<string, string | null>;
        colors?: string[];
        project_type?: string;
        style?: string;
        space?: { walls?: Array<{ id: string; length_m: number }>; ceiling_height_m?: number };
        zones?: Array<{ name: string; items?: Array<{ name?: string; type?: string; features?: string[] }> }>;
        elements?: string[];
      };

      // ---- Build prompt via catalog resolution (same logic as /catalog/image-prompt) ----
      const roleToEnglish: Record<string, string> = {
        primary: "Cabinet body and structure",
        secondary: "Door fronts and drawer faces",
        accent: "Hardware and accent details",
        island: "Island countertop",
        internal: "Interior surfaces",
      };

      const descriptions: string[] = [];
      let assignments = body.color_assignments || {};

      // Merge colors from features in zones
      const allColors = [...(body.colors || [])];
      if (body.zones) {
        for (const z of body.zones) {
          if (z.items) {
            for (const it of z.items) {
              if (it.features) {
                for (const f of it.features) {
                  if (/color|cream|beige|brown|white|black|blue|wood|canela|taupe/i.test(f)) {
                    allColors.push(f);
                  }
                }
              }
            }
          }
        }
      }

      if (!assignments.primary && allColors.length > 0) {
        assignments = {
          primary: allColors[0] || null,
          secondary: allColors[1] || allColors[0] || null,
          accent: allColors[2] || null,
          island: allColors[3] || null,
          internal: allColors[4] || null,
        };
      }

      for (const [role, name] of Object.entries(assignments)) {
        if (!name) continue;
        const desc = materialToVisualDescription(name);
        if (!desc.includes("not found")) {
          descriptions.push(`${roleToEnglish[role] || role}: ${desc}`);
        }
      }

      const projectType = body.project_type || "walk-in closet";
      const style = body.style || "modern luxury";
      const colorScheme = descriptions.length > 0
        ? `Color and material scheme: ${descriptions.join(". ")}.`
        : "";

      // Build dimensions from ALL walls
      let dimensionsStr = "";
      if (body.space) {
        const walls = body.space.walls || [];
        const height = body.space.ceiling_height_m || 2.7;
        if (walls.length > 0) {
          const wallDescs = walls.map((w, i) => `wall ${w.id || i + 1}: ${w.length_m}m`).join(", ");
          dimensionsStr = `Room dimensions: ${wallDescs}. Ceiling height: ${height}m.`;
        }
      }

      // Build zones + elements description
      let zonesStr = "";
      if (body.zones && body.zones.length > 0) {
        const zoneDescs = body.zones.map(z => {
          const items = z.items ? z.items.map(it => it.name || it.type).filter(Boolean).join(", ") : "";
          return items ? `${z.name} (${items})` : z.name;
        }).filter(Boolean);
        if (zoneDescs.length > 0) {
          zonesStr = `The space contains: ${zoneDescs.join("; ")}.`;
        }
      }

      let elementsStr = "";
      if (body.elements && body.elements.length > 0) {
        elementsStr = `Key furniture elements: ${body.elements.join(", ")}.`;
      }

      const prompt = [
        `Ultra-wide angle full room photorealistic interior design render of a high-end custom ${projectType}.`,
        dimensionsStr,
        colorScheme,
        zonesStr,
        elementsStr,
        `${style} style.`,
        `Wide-angle lens (14mm equivalent), shot from the entrance looking toward the far corner.`,
        `Camera position: standing at the room entrance, eye-level (1.6m height). Show the COMPLETE room from corner to corner — ALL walls, floor, and ceiling visible in a single frame.`,
        `Professional interior photography, warm LED accent lighting, 8k quality, architectural digest style.`,
        `Do NOT show a close-up of shelves. Do NOT show a partial wall. Do NOT crop the image. Full panoramic room view only.`,
      ].filter(Boolean).join(" ");

      const legend = buildMaterialsLegend(assignments);

      // ---- Call Imagen-4 (primary) or Gemini Flash Image (fallback) ----
      let imageBase64 = "";
      let imageMime = "image/png";

      try {
        const imgRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instances: [{ prompt }],
              parameters: { sampleCount: 1, aspectRatio: "16:9" },
            }),
          }
        );

        if (!imgRes.ok) throw new Error(`Imagen ${imgRes.status}`);
        const imgData = await imgRes.json() as any;

        if (imgData.predictions?.[0]?.bytesBase64Encoded) {
          imageBase64 = imgData.predictions[0].bytesBase64Encoded;
          imageMime = imgData.predictions[0].mimeType || "image/png";
        } else {
          throw new Error("No image in Imagen response");
        }
      } catch (e1: any) {
        console.warn(`[GENERATE-IMAGE] Imagen-4 failed: ${e1.message}, trying fallback...`);
        try {
          const fbRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
              }),
            }
          );

          if (!fbRes.ok) throw new Error(`Fallback ${fbRes.status}`);
          const fbData = await fbRes.json() as any;
          const parts = fbData.candidates?.[0]?.content?.parts;
          if (parts) {
            for (const p of parts) {
              if (p.inlineData) {
                imageBase64 = p.inlineData.data;
                imageMime = p.inlineData.mimeType || "image/png";
                break;
              }
            }
          }
          if (!imageBase64) throw new Error("No image in fallback response");
        } catch (e2: any) {
          console.error(`[GENERATE-IMAGE] All image gen failed: ${e2.message}`);
          return reply.status(502).send({
            error: `Falha na geracao de imagem: ${e2.message}`,
            prompt,
            legend,
          });
        }
      }

      return reply.send({
        image: `data:${imageMime};base64,${imageBase64}`,
        prompt,
        legend,
        descriptions,
      });
    }
  );
}
