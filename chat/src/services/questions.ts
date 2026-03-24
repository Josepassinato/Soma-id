import { getModel } from "./gemini.js";
import type { GapItem, QuestionBlock } from "./session.js";
import type { ParsedBriefing } from "../types.js";

const MAX_PER_BLOCK = 3;

const QUESTION_PROMPT = `Voce e um projetista senior de moveis planejados (marcenaria industrial).
Gere APENAS perguntas tecnicas necessarias para o calculo de engenharia do projeto de marcenaria.

PERGUNTE APENAS sobre:
- Dimensoes da parede (largura, altura, profundidade) se nao informadas
- Pe-direito se nao informado
- Tipo de instalacao (piso ou suspenso) se nao informado
- Modulos/moveis especificos desejados se nao claros
- Material do corpo dos modulos se nao especificado
- Quantidade de itens especificos (gavetas, prateleiras, cabideiros) se ambiguo
- Tipo de ferragem (corredica, dobradica) se relevante

NUNCA pergunte sobre:
- Data de entrega ou cronograma de producao
- Contato do cliente (email, telefone)
- Forma de pagamento
- Nome do designer/arquiteto
- Orcamento/budget do cliente
- Indicacao/referencia
- Qualquer dado comercial, administrativo ou de CRM

Se todos os dados tecnicos necessarios ja existem no briefing, retorne array vazio [].
Nao invente perguntas so pra ter perguntas.

REGRAS OBRIGATORIAS:
1. Maximo 3 perguntas por bloco
2. Agrupe por tema: primeiro dimensoes, depois zonas/itens, depois materiais
3. Perguntas devem ser em portugues brasileiro, tom profissional mas acessivel
4. Perguntas devem ser ESPECIFICAS — nao genericas. Use os dados ja conhecidos como contexto
5. Se uma lacuna pode ser inferida de outros dados, sugira o valor e pergunte confirmacao
6. Nunca pergunte algo que ja foi respondido no briefing
7. IGNORE lacunas de campos comerciais/CRM — so gere perguntas para lacunas tecnicas

DADOS JA CONHECIDOS DO BRIEFING:
{BRIEFING_CONTEXT}

LACUNAS A COBRIR (FILTRE: so pergunte sobre lacunas tecnicas):
{GAPS}

Retorne EXCLUSIVAMENTE JSON valido (sem markdown, sem code fences):
{
  "questions": [
    {
      "gap_id": "id da lacuna que esta pergunta cobre",
      "theme": "dimensoes" | "zonas" | "materiais",
      "text": "texto da pergunta em portugues"
    }
  ]
}`;

// Gap IDs that are commercial/CRM — never generate questions for these
const NON_TECHNICAL_GAPS = new Set([
  "client_name", "client_contact", "designer", "date_due",
]);

export async function generateQuestions(
  briefing: ParsedBriefing,
  gaps: GapItem[]
): Promise<Array<{ gap_id: string; theme: string; text: string }>> {
  // Filter out non-technical gaps before sending to Gemini
  const technicalGaps = gaps.filter((g) => !NON_TECHNICAL_GAPS.has(g.id));
  if (technicalGaps.length === 0) return [];

  const model = getModel();

  const briefingContext = JSON.stringify(
    {
      client: briefing.client,
      project: briefing.project,
      space: {
        area: briefing.space?.total_area_m2,
        ceiling: briefing.space?.ceiling_height_m,
        walls_count: briefing.space?.walls?.length,
      },
      zones: briefing.zones?.map((z) => ({
        name: z.name,
        items_count: z.items?.length,
        has_dimensions: !!z.dimensions,
      })),
      materials: briefing.materials,
    },
    null,
    2
  );

  const gapsText = technicalGaps
    .map((g) => `- [${g.id}] ${g.description} (status: ${g.status}, campo: ${g.field})`)
    .join("\n");

  const prompt = QUESTION_PROMPT.replace("{BRIEFING_CONTEXT}", briefingContext).replace(
    "{GAPS}",
    gapsText
  );

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(text);
    return parsed.questions || [];
  } catch (err) {
    console.error("[QUESTIONS] Generation failed:", (err as Error).message);
    // Fallback: generate basic questions from technical gaps only
    return technicalGaps.map((g) => ({
      gap_id: g.id,
      theme: g.category === "space" ? "dimensoes" : g.category === "materials" ? "materiais" : "zonas",
      text: `Poderia informar: ${g.description}?`,
    }));
  }
}

export function buildQuestionBlocks(
  questions: Array<{ gap_id: string; theme: string; text: string }>
): QuestionBlock[] {
  // Sort by theme priority: dimensoes → zonas → materiais → projeto
  const themeOrder: Record<string, number> = {
    dimensoes: 0,
    zonas: 1,
    materiais: 2,
    projeto: 3,
  };
  const sorted = [...questions].sort(
    (a, b) => (themeOrder[a.theme] ?? 99) - (themeOrder[b.theme] ?? 99)
  );

  const blocks: QuestionBlock[] = [];
  const totalQuestions = sorted.length;
  const totalBlocks = Math.ceil(totalQuestions / MAX_PER_BLOCK);

  for (let i = 0; i < sorted.length; i += MAX_PER_BLOCK) {
    const blockQuestions = sorted.slice(i, i + MAX_PER_BLOCK);
    const blockNumber = Math.floor(i / MAX_PER_BLOCK) + 1;

    blocks.push({
      block_number: blockNumber,
      total_blocks: totalBlocks,
      total_questions: totalQuestions,
      answered_so_far: 0,
      remaining: totalQuestions,
      questions: blockQuestions.map((q, idx) => ({
        id: `q_${blockNumber}_${idx + 1}`,
        gap_id: q.gap_id,
        text: q.text,
        theme: q.theme,
      })),
    });
  }

  return blocks;
}

export function formatIntroMessage(totalQuestions: number): string {
  if (totalQuestions <= 3) {
    return `Tenho so ${totalQuestions} perguntinha${totalQuestions > 1 ? "s" : ""} rapida${totalQuestions > 1 ? "s" : ""} pra completar o projeto. Posso fazer?`;
  } else if (totalQuestions <= 7) {
    return `Tenho ${totalQuestions} perguntas pra completar o projeto. Posso fazer?`;
  } else {
    return `O briefing veio bem resumido, vou precisar de ${totalQuestions} informacoes. Quer responder agora ou prefere me mandar um audio explicando tudo de uma vez?`;
  }
}

export function formatBlockMessage(block: QuestionBlock, answeredTotal: number): string {
  const lines: string[] = [];

  if (block.block_number === 1) {
    // First block — include theme intro
    const theme = block.questions[0]?.theme || "";
    if (theme === "dimensoes") lines.push("Vou comecar pelas medidas:\n");
    else if (theme === "materiais") lines.push("Sobre materiais e acabamentos:\n");
    else if (theme === "zonas") lines.push("Sobre as zonas do projeto:\n");
  } else {
    const remaining = block.total_questions - answeredTotal;
    lines.push(`Otimo! Faltam so mais ${remaining}:\n`);
  }

  const startNum = answeredTotal + 1;
  block.questions.forEach((q, idx) => {
    lines.push(`${startNum + idx}. ${q.text}`);
  });

  return lines.join("\n");
}

const ANSWER_PROCESSING_PROMPT = `Voce e um projetista de moveis planejados analisando respostas do cliente.

O cliente respondeu as seguintes perguntas. Extraia os dados estruturados das respostas.

PERGUNTAS FEITAS:
{QUESTIONS}

RESPOSTA DO CLIENTE:
{ANSWER}

BRIEFING ATUAL (para contexto):
{BRIEFING}

Retorne EXCLUSIVAMENTE JSON valido:
{
  "answered_gaps": [
    {
      "gap_id": "id da lacuna respondida",
      "extracted_value": "valor extraido da resposta",
      "field_path": "caminho no JSON do briefing para atualizar (ex: space.ceiling_height_m)",
      "confidence": 0.0
    }
  ],
  "still_unclear": ["lista de gap_ids que continuam sem resposta clara"]
}`;

export async function processAnswer(
  questions: QuestionBlock,
  answer: string,
  briefing: ParsedBriefing
): Promise<{
  answered: Array<{ gap_id: string; extracted_value: unknown; field_path: string; confidence: number }>;
  still_unclear: string[];
}> {
  const model = getModel();

  const questionsText = questions.questions
    .map((q) => `[${q.gap_id} → ${q.id}] ${q.text}`)
    .join("\n");

  const prompt = ANSWER_PROCESSING_PROMPT.replace("{QUESTIONS}", questionsText)
    .replace("{ANSWER}", answer)
    .replace("{BRIEFING}", JSON.stringify(briefing, null, 2).substring(0, 3000));

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const parsed = JSON.parse(text);
    return {
      answered: parsed.answered_gaps || [],
      still_unclear: parsed.still_unclear || [],
    };
  } catch (err) {
    console.error("[ANSWER] Processing failed:", (err as Error).message);
    return { answered: [], still_unclear: questions.questions.map((q) => q.gap_id) };
  }
}

export function applyAnswersToBriefing(
  briefing: ParsedBriefing,
  answers: Array<{ field_path: string; extracted_value: unknown }>
): ParsedBriefing {
  const updated = JSON.parse(JSON.stringify(briefing)) as ParsedBriefing;

  for (const ans of answers) {
    const parts = ans.field_path.split(".");
    let target: Record<string, unknown> = updated as unknown as Record<string, unknown>;

    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      if (target[key] === undefined || target[key] === null) {
        target[key] = {};
      }
      target = target[key] as Record<string, unknown>;
    }

    const lastKey = parts[parts.length - 1];
    target[lastKey] = ans.extracted_value;
  }

  return updated;
}
