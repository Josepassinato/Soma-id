import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import briefingRoutes from "./routes/briefing.js";
import conversationRoutes from "./routes/conversation.js";
import catalogRoutes from "./routes/catalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === "production" ? "warn" : "info",
  },
});

// CORS
await app.register(cors, {
  origin: true,
  credentials: true,
});

// Multipart (file uploads) — 50MB max
await app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 10,
  },
});

// Static files (test page)
await app.register(fastifyStatic, {
  root: join(__dirname, "..", "public"),
  prefix: "/",
  decorateReply: false,
});

// Routes
await app.register(briefingRoutes);
await app.register(conversationRoutes);
await app.register(catalogRoutes);

// Health check
app.get("/health", async () => {
  return { status: "ok", service: "soma-id-chat", uptime: process.uptime() };
});

// Root — redirect to test page
app.get("/", async (_req, reply) => {
  return reply.redirect("/chat.html");
});

// Start
const port = parseInt(process.env.CHAT_PORT ?? "8091", 10);

try {
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`\n  SOMA ID Chat listening on http://0.0.0.0:${port}`);
  console.log(`  Gemini API: ${process.env.GEMINI_API_KEY ? "configured" : "NOT CONFIGURED"}\n`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
