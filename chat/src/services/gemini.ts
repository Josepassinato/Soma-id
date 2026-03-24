import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  if (!genAI) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return genAI;
}

export function getModel(systemInstruction?: string) {
  const client = getClient();
  return client.getGenerativeModel({
    model: "gemini-2.5-flash",
    ...(systemInstruction ? { systemInstruction } : {}),
  });
}

export async function transcribeAudio(
  audioBase64: string,
  mimeType = "audio/wav"
): Promise<string | null> {
  const model = getModel();

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      },
      "Transcreva este audio em texto. Retorne APENAS o texto transcrito, sem formatacao, sem aspas, sem explicacao. Se o audio estiver em portugues, transcreva em portugues. Se em ingles, em ingles.",
    ]);

    const text = result.response.text().trim();
    console.log(`[STT] Transcribed: ${text.substring(0, 100)}${text.length > 100 ? "..." : ""}`);
    return text || null;
  } catch (err) {
    console.error("[STT] Gemini transcription failed:", (err as Error).message);
    return null;
  }
}

export async function analyzeImage(
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<string | null> {
  const model = getModel();

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
      prompt,
    ]);

    const text = result.response.text().trim();
    console.log(`[VISION] Response: ${text.substring(0, 100)}...`);
    return text || null;
  } catch (err) {
    console.error("[VISION] Gemini analysis failed:", (err as Error).message);
    return null;
  }
}

const BRIEFING_EXTRACTION_PROMPT = `Voce e um projetista senior de moveis planejados no Brasil/EUA.
Analise o conteudo abaixo (que pode ser texto de briefing, transcricao de audio, ou descricao de imagem/croqui) e extraia dados estruturados para producao de moveis.

EXTRAIA o maximo possivel dos seguintes campos:

CLIENT: name, email, phone, referral (quem indicou)
PROJECT: type (closet, kitchen, bathroom, commercial), designer, date_in, date_due
SPACE: total_area_m2, ceiling_height_m, walls (id, length_m, features), entry_point (wall, width_m)
ZONES: cada zona com name, dimensions (width_m, depth_m), items (type, subtype, quantity, features)
MATERIALS: colors, mood_board description
CONSTRAINTS: min_passage, clearances, etc.

Tipos de items comuns:
- hanging_bar (subtype: long_garments, short_garments)
- shelves, shoe_rack, vitrine, drawers, vanity, luggage_area
- jewelry_display, gun_cases_storage

Features comuns: glass_shelves, LED, mirror, lighting, seating, velvet_dividers, glass_top, mirror_door_front, LED_shelves, door_sensor, soft_close

REGRAS:
- Todas as medidas devem estar em metros (m) para dimensoes de espaco, milimetros (mm) para moveis
- Se um dado nao estiver disponivel, use null
- Se houver ambiguidade, indique no campo confidence
- Extraia quantidades especificas (ex: "30 pares de sapatos" → quantity: 30)

Responda EXCLUSIVAMENTE com JSON valido. Sem markdown, sem explicacao, sem code fences. Apenas o JSON.

JSON schema esperado:
{
  "client": { "name": "", "email": "", "phone": "", "referral": "" },
  "project": { "type": "", "designer": "", "date_in": "", "date_due": "" },
  "space": {
    "total_area_m2": 0,
    "ceiling_height_m": 0,
    "walls": [{ "id": "", "length_m": 0, "features": [] }],
    "entry_point": { "wall": "", "width_m": 0 }
  },
  "zones": [{
    "name": "",
    "dimensions": { "width_m": 0, "depth_m": 0 },
    "items": [{ "type": "", "subtype": "", "quantity": 0, "features": [], "categories": [] }],
    "constraints": [{ "type": "", "value_mm": 0, "relative_to": "" }]
  }],
  "materials": { "colors": [], "mood_board": "" },
  "confidence": 0.0,
  "missing_fields": []
}`;

export async function extractBriefingData(content: string): Promise<{
  parsed: Record<string, unknown>;
  confidence: number;
  missing_fields: string[];
}> {
  const model = getModel();

  const prompt = `${BRIEFING_EXTRACTION_PROMPT}\n\n---\nCONTEUDO PARA ANALISE:\n${content}`;

  try {
    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();

    // Strip markdown code fences if present
    if (responseText.startsWith("```")) {
      responseText = responseText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(responseText);
    const confidence = parsed.confidence ?? 0.5;
    const missing = parsed.missing_fields ?? [];

    delete parsed.confidence;
    delete parsed.missing_fields;

    console.log(`[BRIEFING] Extracted with confidence ${confidence}, missing: ${missing.length} fields`);

    return { parsed, confidence, missing_fields: missing };
  } catch (err) {
    console.error("[BRIEFING] Extraction failed:", (err as Error).message);
    throw new Error(`Briefing extraction failed: ${(err as Error).message}`);
  }
}

const VISION_BRIEFING_PROMPT = `Voce e um projetista senior de moveis planejados.
Analise esta imagem. Pode ser:
1. Um croqui/planta baixa desenhada a mao — extraia todas as medidas em metros, posicoes de paredes, portas, janelas, zonas de mobilia
2. Uma foto de espaco vazio — estime dimensoes do ambiente, identifique portas, janelas, ar condicionado, piso, pe-direito
3. Um mood board — identifique cores, materiais, estilos

Retorne APENAS um JSON com os dados extraidos:
{
  "image_type": "croqui" | "photo" | "mood_board" | "other",
  "description": "descricao do que voce ve",
  "dimensions": { "walls": [{"id": "...", "length_m": 0}], "ceiling_height_m": 0 },
  "features": ["porta", "janela", "ar_condicionado"],
  "zones": [{"name": "...", "position": "...", "estimated_dimensions": {...}}],
  "materials": { "colors": [], "textures": [], "style": "" },
  "confidence": 0.0,
  "notes": "observacoes adicionais"
}

Sem markdown, sem explicacao, sem code fences. Apenas JSON.`;

export async function analyzeImageForBriefing(
  imageBase64: string,
  mimeType: string
): Promise<Record<string, unknown>> {
  const model = getModel();

  try {
    const result = await model.generateContent([
      { inlineData: { mimeType, data: imageBase64 } },
      VISION_BRIEFING_PROMPT,
    ]);

    let responseText = result.response.text().trim();
    if (responseText.startsWith("```")) {
      responseText = responseText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(responseText);
  } catch (err) {
    console.error("[VISION-BRIEFING] Failed:", (err as Error).message);
    throw new Error(`Image analysis failed: ${(err as Error).message}`);
  }
}

export { SchemaType };
