import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  loadMaterials,
  getAllMaterials,
  getMaterialsByCategory,
  searchMaterials,
  getMaterialByName,
  findBestMatch,
  materialToVisualDescription,
  buildMaterialsLegend,
} from "../services/material-catalog.js";

export default async function catalogRoutes(app: FastifyInstance) {
  // Ensure catalog is loaded on first request
  let loaded = false;
  app.addHook("onRequest", async () => {
    if (!loaded) {
      await loadMaterials();
      loaded = true;
    }
  });

  // GET /catalog/materials — list all, with optional ?category= and ?search= filters
  app.get(
    "/catalog/materials",
    async (
      request: FastifyRequest<{ Querystring: { category?: string; search?: string } }>,
      reply: FastifyReply
    ) => {
      const { category, search } = request.query;

      let materials = getAllMaterials();

      if (category) {
        materials = getMaterialsByCategory(category);
      }

      if (search) {
        materials = search
          ? searchMaterials(search)
          : materials;
      }

      return reply.send({
        status: "success",
        count: materials.length,
        data: materials,
      });
    }
  );

  // GET /catalog/materials/resolve?name=lord — resolve a name to a catalog material
  app.get(
    "/catalog/materials/resolve",
    async (
      request: FastifyRequest<{ Querystring: { name: string } }>,
      reply: FastifyReply
    ) => {
      const { name } = request.query;
      if (!name) {
        return reply.status(400).send({ error: "Parametro 'name' obrigatorio." });
      }

      // Try exact match first
      const exact = getMaterialByName(name);
      if (exact) {
        return reply.send({
          status: "found",
          confidence: 1.0,
          material: exact,
        });
      }

      // Try fuzzy match
      const fuzzy = findBestMatch(name);
      if (fuzzy) {
        const isPartial =
          fuzzy.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(fuzzy.name.toLowerCase());
        return reply.send({
          status: "found",
          confidence: isPartial ? 0.85 : 0.7,
          material: fuzzy,
        });
      }

      // Try search
      const searchResults = searchMaterials(name);
      if (searchResults.length > 0) {
        return reply.send({
          status: "suggestions",
          confidence: 0,
          suggestions: searchResults.slice(0, 5),
          message: `Material "${name}" nao encontrado. Sugestoes do catalogo:`,
        });
      }

      return reply.send({
        status: "not_found",
        confidence: 0,
        message: `Material "${name}" nao existe no catalogo Boa Vista. Use /catalog/materials para ver opcoes disponiveis.`,
      });
    }
  );

  // POST /catalog/image-prompt — build concept image prompt from catalog materials
  app.post(
    "/catalog/image-prompt",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as {
        color_assignments?: Record<string, string | null>;
        colors?: string[];
        project_type?: string;
        style?: string;
        space?: { walls?: Array<{ id: string; length_m: number }>; ceiling_height_m?: number; total_area_m2?: number };
        zones?: Array<{ name: string; dimensions?: { width_m: number; depth_m: number }; items?: Array<{ name?: string; type?: string }> }>;
        elements?: string[];
      };

      const roleToEnglish: Record<string, string> = {
        primary: "Cabinet body and structure",
        secondary: "Door fronts and drawer faces",
        accent: "Hardware and accent details",
        island: "Island countertop",
        internal: "Interior surfaces",
      };

      const descriptions: string[] = [];

      // Resolve color_assignments, or auto-assign from colors array
      let assignments = body.color_assignments || {};
      if ((!assignments.primary) && body.colors && body.colors.length > 0) {
        // Auto-assign: first color = body, second = doors
        assignments = {
          primary: body.colors[0] || null,
          secondary: body.colors[1] || body.colors[0] || null,
          accent: body.colors[2] || null,
          island: body.colors[3] || null,
          internal: body.colors[4] || null,
        };
      }

      // Build descriptions from assignments
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

      // Build room dimensions string from ALL walls
      let dimensionsStr = "";
      if (body.space) {
        const walls = body.space.walls || [];
        const height = body.space.ceiling_height_m || 2.7;
        if (walls.length > 0) {
          const wallDescs = walls.map((w, i) => `wall ${w.id || i + 1}: ${w.length_m}m`).join(", ");
          dimensionsStr = `Room dimensions: ${wallDescs}. Ceiling height: ${height}m.`;
        }
        if (body.space.total_area_m2) {
          dimensionsStr += ` Total area: ${body.space.total_area_m2}m².`;
        }
      }

      // Build zones description with items from all zones
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

      // Build elements string
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

      // Build legend from resolved assignments
      const legend = buildMaterialsLegend(assignments);

      return reply.send({
        prompt,
        descriptions,
        legend,
      });
    }
  );

  // GET /catalog/categories — list all categories with counts
  app.get("/catalog/categories", async (_request, reply) => {
    const all = getAllMaterials();
    const counts: Record<string, number> = {};
    for (const m of all) {
      counts[m.category] = (counts[m.category] || 0) + 1;
    }
    return reply.send({
      status: "success",
      categories: Object.entries(counts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, count]) => ({ name, count })),
    });
  });
}
