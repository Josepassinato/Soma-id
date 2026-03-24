import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { processBriefing } from "../services/briefing-parser.js";

export default async function briefingRoutes(app: FastifyInstance) {
  // POST /briefing — multipart upload (PDF + images + audio + text)
  app.post("/briefing", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const files: Array<{ buffer: Buffer; filename: string; mimetype: string }> = [];
      let textMessage = "";

      const parts = request.parts();

      for await (const part of parts) {
        if (part.type === "file") {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          const buffer = Buffer.concat(chunks);

          if (buffer.length === 0) continue;

          files.push({
            buffer,
            filename: part.filename || "unknown",
            mimetype: part.mimetype || "application/octet-stream",
          });
          console.log(`[UPLOAD] File: ${part.filename} (${part.mimetype}, ${buffer.length} bytes)`);
        } else if (part.type === "field" && part.fieldname === "text") {
          textMessage = String(part.value || "");
        }
      }

      if (files.length === 0 && !textMessage.trim()) {
        return reply.status(400).send({
          success: false,
          error: "Envie pelo menos um arquivo (PDF, imagem ou audio) ou uma mensagem de texto.",
          sources_processed: [],
        });
      }

      console.log(`[BRIEFING] Processing ${files.length} files + ${textMessage ? "text" : "no text"}`);

      const result = await processBriefing(files, textMessage);

      return reply.status(result.success ? 200 : 422).send(result);
    } catch (err) {
      console.error("[BRIEFING] Unexpected error:", err);
      return reply.status(500).send({
        success: false,
        error: `Erro interno: ${(err as Error).message}`,
        sources_processed: [],
      });
    }
  });

  // GET /briefing/health
  app.get("/briefing/health", async (_request, reply) => {
    return reply.send({
      status: "ok",
      service: "soma-id-chat",
      version: "1.0.0",
      gemini_configured: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    });
  });
}
