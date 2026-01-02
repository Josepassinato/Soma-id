
import { GoogleGenAI, Type } from "@google/genai";
import { Project, BlueprintData, ExtractedInsights, ConsultationInput, AiLayoutPlan } from "../types";
import { 
  SYSTEM_INSTRUCTION_DEBURADOR, 
  AGENT_ENCHANTMENT_VISUALIZER_INSTRUCTION,
  AGENT_TECHNICAL_PIPELINE_INSTRUCTION,
  STYLE_PRESETS
} from "../constants";
import { EngineeringService } from './engineeringService';

const cleanResponse = (text: string) => text.replace(/```json/g, '').replace(/```/g, '').trim();

const extractJson = (text: string): any => {
  try {
    const cleaned = cleanResponse(text);
    return JSON.parse(cleaned);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Resposta da IA não contém JSON válido.");
  }
};

/**
 * Helper robusto para converter URLs em Base64
 */
const imageUrlToBase64 = async (url: string): Promise<string | null> => {
  if (!url) return null;
  if (url.startsWith('data:')) return url.split(',')[1];
  try {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String.split(',')[1]);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("CORS ou erro de rede ao carregar amostra de material. Usando fallback textual.", url);
    return null;
  }
};

export const analyzeConsultationWithGemini = async (input: ConsultationInput): Promise<ExtractedInsights> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];
  
  if (input.type === 'TEXT') {
    parts.push({ text: input.content });
  } else if (input.type === 'IMAGE') {
    parts.push({ 
      inlineData: { 
        mimeType: input.mimeType || 'image/jpeg', 
        data: input.content 
      } 
    }); 
    parts.push({ text: "Analise esta foto do ambiente. Identifique o tipo de cômodo, estime a largura da parede principal baseando-se em objetos padrão (portas, tomadas), descreva os materiais existentes e sugira um estilo SOMA-ID que combine." });
  } else { 
    parts.push({ 
      inlineData: { 
        mimeType: input.mimeType!, 
        data: input.content 
      } 
    }); 
    parts.push({ text: "Analise este documento/áudio. Use a ferramenta de busca para verificar feriados de 2025 no local do cliente se mencionado, e as últimas tendências de materiais para o ambiente solicitado." }); 
  }
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      clientName: { type: Type.STRING },
      roomType: { type: Type.STRING },
      wallWidth: { type: Type.NUMBER },
      wallHeight: { type: Type.NUMBER },
      wallDepth: { type: Type.NUMBER },
      styleDescription: { type: Type.STRING },
      technicalBriefing: { type: Type.STRING },
      suggestedMaterials: { type: Type.ARRAY, items: { type: Type.STRING } },
      installationType: { type: Type.STRING, enum: ["PISO", "SUSPENSO"] },
      analysisStatus: { type: Type.STRING, enum: ["COMPLETO", "INCOMPLETO"] }
    },
    required: ["clientName", "roomType", "wallWidth", "analysisStatus"]
  };

  const response = await ai.models.generateContent({ 
    model: 'gemini-3-flash-preview', 
    contents: { parts }, 
    config: { 
      systemInstruction: SYSTEM_INSTRUCTION_DEBURADOR, 
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      tools: [{ googleSearch: {} }] 
    } 
  });
  
  return JSON.parse(cleanResponse(response.text || '{}'));
};

export const generateEnchantmentPrompt = async (project: Project, angle: string = "Frontal View"): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const selectedStyle = STYLE_PRESETS.find(s => s.id === project.styleDescription) || STYLE_PRESETS[0];
  
  const prompt = `
    TASK: Research 2025 architectural trends for ${selectedStyle.label}.
    PROJECT: ${project.clientName} | ${project.roomType}.
    SPECIFICATIONS: Wall width ${project.wallWidth}mm, Height ${project.wallHeight}mm.
    STYLE CONTEXT: ${selectedStyle.keywords}.
    OBJECTIVE: Create a hyper-realistic architectural photography prompt for ${angle}. 
    Incorporate tunable lighting, specific wood grain orientations (Freijó, Walnut), and 2025 hardware.
  `;
  
  const response = await ai.models.generateContent({ 
    model: 'gemini-3-pro-preview', 
    contents: { parts: [{ text: prompt }] }, 
    config: { 
        systemInstruction: AGENT_ENCHANTMENT_VISUALIZER_INSTRUCTION,
        tools: [{ googleSearch: {} }] 
    } 
  });
  return cleanResponse(response.text || '');
};

export const generateEnchantmentImage = async (prompt: string, materialPhoto: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [];
  
  // Converter amostra do material para Base64 se disponível
  const base64Data = await imageUrlToBase64(materialPhoto);
  
  if (base64Data) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: base64Data
      }
    });
  }
  
  parts.push({ 
    text: `URGENT: ACT AS A WORLD-CLASS ARCHITECTURAL PHOTOGRAPHER.
    RENDER TASK: Generate a 3D Digital Twin based on this description: ${prompt}.
    MATERIAL FIDELITY: ${base64Data ? 'EXACTLY use the texture and color from the attached image for all woodworking surfaces.' : 'Use high-end natural oak/walnut textures with deep grains and matte finish.'}
    SCENE: Ultra-realistic 4K architectural render, soft ambient lighting, high contrast, clean minimalist luxury aesthetic 2025.`
  });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
        imageSize: "1K"
      }
    }
  });

  if (!response.candidates?.[0]?.content?.parts) {
    throw new Error("A IA de Imagem não retornou conteúdo. Verifique seu saldo de tokens ou API Key.");
  }

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  
  throw new Error("Falha ao extrair binário da imagem gerada.");
};

export const generateTechnicalData = async (project: Project): Promise<BlueprintData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate technical plan for: ${project.clientName}. Room: ${project.roomType}. Width: ${project.wallWidth}mm.`,
    config: {
      systemInstruction: AGENT_TECHNICAL_PIPELINE_INSTRUCTION,
      responseMimeType: "application/json"
    }
  });

  const aiPlan: AiLayoutPlan = extractJson(response.text || '{}');
  return await EngineeringService.processBlueprint(aiPlan, project);
};
