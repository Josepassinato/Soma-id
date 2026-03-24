/**
 * briefing-interpreter.ts
 * Briefing Interpreter Agent — uses Claude Sonnet via Anthropic API
 * to parse raw briefing documents (PDFs, images, audio transcripts, text)
 * into a structured ParsedBriefing JSON.
 */

import Anthropic from "@anthropic-ai/sdk";
import { loadMaterials } from "./material-catalog.js";
import type { ParsedBriefing } from "../types.js";

// --------------- Types ---------------

interface PdfInput {
  filename: string;
  text: string;
}

interface ImageInput {
  filename: string;
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
}

interface AudioTranscriptInput {
  filename: string;
  text: string;
}

export interface BriefingInterpreterInput {
  pdfTexts: PdfInput[];
  images: ImageInput[];
  audioTranscripts: AudioTranscriptInput[];
  userText: string | null;
}

export interface BriefingInterpreterResult {
  success: boolean;
  data?: ParsedBriefing;
  confidence?: number;
  missing_fields?: string[];
  error?: string;
  model_used?: string;
  input_tokens?: number;
  output_tokens?: number;
}

export interface MergeBriefingResult {
  success: boolean;
  data?: ParsedBriefing;
  changes?: string[];
  error?: string;
  model_used?: string;
  input_tokens?: number;
  output_tokens?: number;
}

// --------------- System Prompt ---------------

const SYSTEM_PROMPT_TEMPLATE = `Você é o BRIEFING INTERPRETER do SOMA-ID, um sistema de marcenaria industrial de alto padrão.

Sua ÚNICA função é receber documentos brutos de briefing de marcenaria e devolver um JSON estruturado perfeito.

CAPACIDADES:
1. OCR de croquis manuscritos — texto pode estar rotacionado, de lado, de cabeça para baixo, em cursivo. Examine em TODAS as orientações.
2. Extração de PDFs — identifique cliente, projetista, empresa, zonas, requisitos, materiais, cores.
3. Análise de fotos do espaço — identifique dimensões aproximadas, portas, janelas, pontos de luz, ar-condicionado.
4. Compreensão de áudio transcrito — extraia requisitos mencionados verbalmente pelo designer/cliente.
5. Matching de materiais — cruze cores/materiais mencionados com o catálogo real disponível.

REGRAS DE EXTRAÇÃO:
- Extraia TUDO que encontrar, mesmo que parcial. É melhor ter dados com baixa confiança do que perder informação.
- Números manuscritos: "3,64" e "3.64" são a mesma medida (3.64 metros). Aceite ambos formatos.
- Quando uma medida aparece junto a uma parede em um croqui, é o comprimento daquela parede em metros.
- "H=" em croquis indica pé-direito (ceiling height).
- Zonas típicas de closet: "Closet Her", "Closet His", "Ilha Central", "Area Makeup", "Area Armas", "Area Malas".
- Itens típicos: prateleiras, nichos, sapateira, vitrines, gavetas, cabideiros, espelhos.
- Quantidades aparecem como: "30 pares de sapatos", "06 pares de botas", "15 bolsas", "2 grandes e 2 pequenas malas".

REGRAS CRÍTICAS DE DIMENSÕES DE ZONAS:
- zone.dimensions.width_m e zone.dimensions.depth_m referem-se ao ESPAÇO FÍSICO da zona (área do cômodo/setor), NÃO à profundidade dos módulos/armários.
- Exemplo: "Closet Her 3,64m x 3,81m" → zone.dimensions = { width_m: 3.64, depth_m: 3.81 }
- A profundidade dos MÓDULOS (armários) é sempre 550-600mm — isso NÃO é a zone depth.
- Se o croqui mostra uma zona com paredes de 3,64m e 3,81m, essas são as dimensões da ZONA.
- NUNCA use 0.6 (600mm = profundidade de módulo) como depth_m de uma zona. Zonas são tipicamente > 1.5m em ambas dimensões.

REGRAS ERGONÔMICAS (use para validar e completar dados):
- Profundidade padrão closet: 550-600mm
- Cabideiro vestidos longos: 1300-1700mm do piso
- Cabideiro camisas/blazers: 1050-1100mm livre
- Prateleiras: espaçamento 300-400mm, largura máxima 900mm sem suporte
- Sapateira rasteiras: 80mm entre prateleiras
- Sapateira tênis: 140mm entre prateleiras
- Sapateira botas cano alto: até 500mm
- Gavetas roupas íntimas: 150mm altura
- Maleiro no topo: 300-500mm altura
- Circulação mínima: 600mm (apertado), 800-1000mm (confortável)
- Clearance ilha central: mínimo 600mm em todos os lados

CATÁLOGO DE MATERIAIS DISPONÍVEIS:
{{CATALOG}}

REGRAS DE MATCHING DE MATERIAIS:
- Quando o briefing mencionar uma cor/material (ex: "Lana", "Lord", "Freijó"), procure no catálogo acima.
- Use o nome EXATO do catálogo no campo materials.colors.
- Se o material não existir no catálogo, inclua mesmo assim mas adicione em missing_fields.

OUTPUT OBRIGATÓRIO — JSON válido neste schema exato:
{
  "client": {
    "name": "string — nome do cliente",
    "email": "string — email do cliente",
    "phone": "string — telefone do cliente",
    "referral": "string — quem indicou (empresa/designer)"
  },
  "project": {
    "type": "string — tipo: closet, kitchen, bathroom, commercial",
    "designer": "string — nome do projetista/designer",
    "date_in": "string — data de entrada YYYY-MM-DD",
    "date_due": "string — data de entrega YYYY-MM-DD"
  },
  "space": {
    "total_area_m2": "number — área total em m²",
    "ceiling_height_m": "number — pé-direito em metros",
    "walls": [
      {
        "id": "string — identificador: north, south, east, west, A, B, C...",
        "length_m": "number — comprimento em metros",
        "features": ["string — door, window, ac_vent, electrical_panel, etc"]
      }
    ],
    "entry_point": {
      "wall": "string — parede onde está a entrada",
      "width_m": "number — largura da porta/abertura em metros"
    }
  },
  "zones": [
    {
      "name": "string — nome da zona",
      "dimensions": { "width_m": "number", "depth_m": "number" },
      "items": [
        {
          "type": "string — hanging_bar, shelf, shoe_rack, vitrine, drawers, vanity, island, luggage_area, gun_cases_storage, etc",
          "subtype": "string — long_garments, shirts, shoes, boots, bags, jewelry, etc",
          "quantity": "number — quantidade quando especificada",
          "features": ["string — glass_shelves, LED, soft_close, velvet_dividers, mirror, sensor, etc"],
          "sizes": ["string — tamanhos quando mencionados"],
          "categories": ["string — categorias de gavetas: lingerie, pijamas, etc"],
          "access": "string — frequent, occasional, rare",
          "priority": "string — high, medium, low"
        }
      ],
      "constraints": [
        {
          "type": "string — min_passage, max_height, clearance, etc",
          "value_mm": "number — valor em milímetros",
          "relative_to": "string — referência"
        }
      ]
    }
  ],
  "materials": {
    "colors": ["string — nomes de cores/materiais do catálogo"],
    "mood_board": "string — estilo geral: elegant_neutral, modern_dark, rustic_wood, etc"
  },
  "_meta": {
    "sources": ["string — pdf, image, audio, text"],
    "confidence": "number 0-1 — confiança geral na extração",
    "missing_fields": ["string — campos que não foram encontrados nos documentos"],
    "timestamp": "string — ISO timestamp"
  }
}

INSTRUÇÕES FINAIS:
- Responda APENAS com o JSON. Nenhum texto antes ou depois.
- Se um campo não foi encontrado, use string vazia "" para strings, 0 para números, [] para arrays.
- O campo confidence deve refletir: 1.0 = tudo claro e explícito, 0.5 = muita inferência, 0.0 = dados insuficientes.
- missing_fields deve listar TODOS os campos que você não encontrou nos documentos de input.
- Quando houver contradição entre fontes (PDF diz uma coisa, áudio diz outra), priorize: 1° croqui/planta, 2° PDF texto, 3° áudio, 4° texto livre.`;

// --------------- Build catalog string ---------------

async function buildCatalogString(): Promise<string> {
  const materials = await loadMaterials();
  if (materials.length === 0) {
    return "Nenhum material carregado no catálogo. Aceite os nomes de materiais como informados no briefing.";
  }

  const lines = ["ID | Nome | Categoria | Hex | Fabricante"];
  for (const m of materials) {
    lines.push(
      `${m.id} | ${m.name} | ${m.category} | ${m.color_hex || m.color || "-"} | ${m.manufacturer || "Boa Vista"}`
    );
  }
  return lines.join("\n");
}

// --------------- Build user message content ---------------

function buildUserContent(
  input: BriefingInterpreterInput
): Anthropic.MessageCreateParams["messages"][0]["content"] {
  const parts: Anthropic.ContentBlockParam[] = [];

  // PDFs as text blocks
  for (const pdf of input.pdfTexts) {
    parts.push({
      type: "text",
      text: `=== PDF: ${pdf.filename} ===\n${pdf.text}`,
    });
  }

  // Images as vision blocks
  for (const img of input.images) {
    parts.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType,
        data: img.base64,
      },
    });
    parts.push({
      type: "text",
      text: `[Imagem acima: ${img.filename} — Examine em TODAS as orientações para OCR de texto manuscrito, dimensões, e layout do espaço]`,
    });
  }

  // Audio transcripts as text blocks
  for (const audio of input.audioTranscripts) {
    parts.push({
      type: "text",
      text: `=== ÁUDIO TRANSCRITO: ${audio.filename} ===\n${audio.text}`,
    });
  }

  // User text
  if (input.userText?.trim()) {
    parts.push({
      type: "text",
      text: `=== MENSAGEM DO DESIGNER ===\n${input.userText}`,
    });
  }

  // Final instruction
  parts.push({
    type: "text",
    text: "Analise TODOS os documentos acima e retorne o JSON estruturado do briefing. Apenas JSON, sem texto adicional.",
  });

  return parts;
}

// --------------- Main function ---------------

export async function interpretBriefing(
  input: BriefingInterpreterInput
): Promise<BriefingInterpreterResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { success: false, error: "ANTHROPIC_API_KEY não configurada no .env" };
  }

  // Validate that we have at least some input
  const hasInput =
    input.pdfTexts.length > 0 ||
    input.images.length > 0 ||
    input.audioTranscripts.length > 0 ||
    (input.userText && input.userText.trim().length > 0);

  if (!hasInput) {
    return {
      success: false,
      error: "Nenhum conteúdo para interpretar. Envie PDF, imagem, áudio ou texto.",
    };
  }

  // Load material catalog
  const catalogString = await buildCatalogString();
  const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace("{{CATALOG}}", catalogString);

  // Build message content
  const userContent = buildUserContent(input);

  // Call Claude API
  const client = new Anthropic({ apiKey });

  try {
    console.log(
      `[BRIEFING-INTERPRETER] Calling Claude Sonnet — ${input.pdfTexts.length} PDFs, ${input.images.length} images, ${input.audioTranscripts.length} audios`
    );

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    // Extract text from response
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return {
        success: false,
        error: "Claude não retornou texto na resposta.",
        model_used: response.model,
        input_tokens: response.usage?.input_tokens,
        output_tokens: response.usage?.output_tokens,
      };
    }

    // Parse JSON from response — handle markdown code blocks
    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      // Try to extract JSON from the response text
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return {
          success: false,
          error: `JSON inválido na resposta do Claude: ${(parseErr as Error).message}`,
          model_used: response.model,
          input_tokens: response.usage?.input_tokens,
          output_tokens: response.usage?.output_tokens,
        };
      }
    }

    // Map to ParsedBriefing structure
    const meta = (parsed._meta as Record<string, unknown>) || {};
    const sources: string[] = [];
    if (input.pdfTexts.length > 0) sources.push("pdf");
    if (input.images.length > 0) sources.push("image");
    if (input.audioTranscripts.length > 0) sources.push("audio");
    if (input.userText?.trim()) sources.push("text");

    const briefing: ParsedBriefing = {
      client: (parsed.client as ParsedBriefing["client"]) || {
        name: "",
        email: "",
        phone: "",
        referral: "",
      },
      project: (parsed.project as ParsedBriefing["project"]) || {
        type: "",
        designer: "",
        date_in: "",
        date_due: "",
      },
      space: (parsed.space as ParsedBriefing["space"]) || {
        total_area_m2: 0,
        ceiling_height_m: 0,
        walls: [],
        entry_point: { wall: "", width_m: 0 },
      },
      zones: (parsed.zones as ParsedBriefing["zones"]) || [],
      materials: (parsed.materials as ParsedBriefing["materials"]) || {
        colors: [],
        mood_board: "",
      },
      _meta: {
        sources,
        confidence: (meta.confidence as number) || 0,
        missing_fields: (meta.missing_fields as string[]) || [],
        raw_text: input.pdfTexts.map((p) => p.text).join("\n").substring(0, 2000),
        timestamp: new Date().toISOString(),
      },
    };

    console.log(
      `[BRIEFING-INTERPRETER] Success — confidence: ${briefing._meta.confidence}, zones: ${briefing.zones.length}, missing: ${briefing._meta.missing_fields.length}`
    );

    return {
      success: true,
      data: briefing,
      confidence: briefing._meta.confidence,
      missing_fields: briefing._meta.missing_fields,
      model_used: response.model,
      input_tokens: response.usage?.input_tokens,
      output_tokens: response.usage?.output_tokens,
    };
  } catch (err) {
    const error = err as Error & { status?: number; error?: { type?: string } };
    console.error(`[BRIEFING-INTERPRETER] Error:`, error.message);

    return {
      success: false,
      error: `Falha na API Claude: ${error.message}${error.status ? ` (HTTP ${error.status})` : ""}`,
    };
  }
}

// --------------- Merge supplementary documents into existing briefing ---------------

const MERGE_SYSTEM_PROMPT = `Você é o BRIEFING MERGER do SOMA-ID, um sistema de marcenaria industrial de alto padrão.

Você recebe:
1. Um briefing EXISTENTE (JSON estruturado) que já foi interpretado anteriormente
2. NOVOS DOCUMENTOS complementares enviados pelo cliente/designer

Sua função é ATUALIZAR o briefing existente incorporando as novas informações.

REGRAS DE MERGE:
- Se o novo documento contém MEDIDAS que faltavam → adicione nas zonas/paredes correspondentes
- Se o novo documento contém CORES/MATERIAIS não mencionados antes → adicione em materials
- Se o novo documento contém NOVAS ZONAS ou ITENS → adicione nas zonas
- Se o novo documento CONTRADIZ algo do briefing original → use o valor mais recente (o novo documento tem prioridade)
- Se o novo documento é um CROQUI com medidas → extraia todas as medidas e cruze com as zonas existentes
- Se o novo documento são FOTOS do espaço → analise e adicione observações em _meta
- Quando um campo já tem valor e o novo documento tem valor diferente, use o NOVO
- Quando um campo está vazio/zero e o novo documento tem valor, PREENCHA

RETORNE um JSON com DOIS campos:
1. "briefing" — o briefing COMPLETO ATUALIZADO (não só o delta — retorne o JSON inteiro com as novas informações incorporadas)
2. "changes" — array de strings descrevendo o que mudou, em português. Ex: ["Adicionada medida 3.5m na parede norte", "Novo material: Lord (Unicolor)", "Nova zona: Ilha Central"]

Responda APENAS com o JSON. Nenhum texto antes ou depois.`;

export async function mergeBriefing(
  existingBriefing: ParsedBriefing,
  newDocuments: BriefingInterpreterInput
): Promise<MergeBriefingResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { success: false, error: "ANTHROPIC_API_KEY não configurada no .env" };
  }

  const hasInput =
    newDocuments.pdfTexts.length > 0 ||
    newDocuments.images.length > 0 ||
    newDocuments.audioTranscripts.length > 0 ||
    (newDocuments.userText && newDocuments.userText.trim().length > 0);

  if (!hasInput) {
    return { success: false, error: "Nenhum conteúdo complementar para processar." };
  }

  // Load material catalog
  const catalogString = await buildCatalogString();

  // Build the merge prompt
  const parts: Anthropic.ContentBlockParam[] = [];

  parts.push({
    type: "text",
    text: `=== BRIEFING ATUAL ===\n${JSON.stringify(existingBriefing, null, 2)}`,
  });

  parts.push({
    type: "text",
    text: `=== CATÁLOGO DE MATERIAIS DISPONÍVEIS ===\n${catalogString}`,
  });

  // Add new documents
  for (const pdf of newDocuments.pdfTexts) {
    parts.push({ type: "text", text: `=== NOVO DOCUMENTO PDF: ${pdf.filename} ===\n${pdf.text}` });
  }

  for (const img of newDocuments.images) {
    parts.push({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.base64 },
    });
    parts.push({
      type: "text",
      text: `[Nova imagem: ${img.filename} — Examine em TODAS as orientações para OCR de texto manuscrito, dimensões, e layout do espaço]`,
    });
  }

  for (const audio of newDocuments.audioTranscripts) {
    parts.push({ type: "text", text: `=== NOVO ÁUDIO TRANSCRITO: ${audio.filename} ===\n${audio.text}` });
  }

  if (newDocuments.userText?.trim()) {
    parts.push({ type: "text", text: `=== MENSAGEM COMPLEMENTAR DO DESIGNER ===\n${newDocuments.userText}` });
  }

  parts.push({
    type: "text",
    text: 'Analise os novos documentos e retorne o JSON com "briefing" (completo atualizado) e "changes" (lista do que mudou). Apenas JSON.',
  });

  const client = new Anthropic({ apiKey });

  try {
    console.log(
      `[BRIEFING-MERGE] Calling Claude Sonnet — ${newDocuments.pdfTexts.length} PDFs, ${newDocuments.images.length} images, ${newDocuments.audioTranscripts.length} audios`
    );

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: MERGE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: parts }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return {
        success: false,
        error: "Claude não retornou texto na resposta de merge.",
        model_used: response.model,
        input_tokens: response.usage?.input_tokens,
        output_tokens: response.usage?.output_tokens,
      };
    }

    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return {
          success: false,
          error: "JSON inválido na resposta de merge do Claude.",
          model_used: response.model,
          input_tokens: response.usage?.input_tokens,
          output_tokens: response.usage?.output_tokens,
        };
      }
    }

    // Extract updated briefing and changes
    const updatedRaw = (parsed.briefing || parsed) as Record<string, unknown>;
    const changes = (parsed.changes as string[]) || [];

    // Map to ParsedBriefing structure (same as interpretBriefing)
    const meta = (updatedRaw._meta as Record<string, unknown>) || {};
    const existingSources = existingBriefing._meta?.sources || [];
    const newSources: string[] = [...existingSources];
    if (newDocuments.pdfTexts.length > 0 && !newSources.includes("pdf_supplement")) newSources.push("pdf_supplement");
    if (newDocuments.images.length > 0 && !newSources.includes("image_supplement")) newSources.push("image_supplement");
    if (newDocuments.audioTranscripts.length > 0 && !newSources.includes("audio_supplement")) newSources.push("audio_supplement");
    if (newDocuments.userText?.trim() && !newSources.includes("text_supplement")) newSources.push("text_supplement");

    const briefing: ParsedBriefing = {
      client: (updatedRaw.client as ParsedBriefing["client"]) || existingBriefing.client,
      project: (updatedRaw.project as ParsedBriefing["project"]) || existingBriefing.project,
      space: (updatedRaw.space as ParsedBriefing["space"]) || existingBriefing.space,
      zones: (updatedRaw.zones as ParsedBriefing["zones"]) || existingBriefing.zones,
      materials: (updatedRaw.materials as ParsedBriefing["materials"]) || existingBriefing.materials,
      _meta: {
        sources: newSources,
        confidence: (meta.confidence as number) || existingBriefing._meta?.confidence || 0,
        missing_fields: (meta.missing_fields as string[]) || [],
        raw_text: existingBriefing._meta?.raw_text || "",
        timestamp: new Date().toISOString(),
      },
    };

    console.log(
      `[BRIEFING-MERGE] Success — changes: ${changes.length}, zones: ${briefing.zones.length}, confidence: ${briefing._meta.confidence}`
    );

    return {
      success: true,
      data: briefing,
      changes,
      model_used: response.model,
      input_tokens: response.usage?.input_tokens,
      output_tokens: response.usage?.output_tokens,
    };
  } catch (err) {
    const error = err as Error & { status?: number };
    console.error(`[BRIEFING-MERGE] Error:`, error.message);
    return {
      success: false,
      error: `Falha na API Claude (merge): ${error.message}${error.status ? ` (HTTP ${error.status})` : ""}`,
    };
  }
}
