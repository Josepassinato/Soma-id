
import { GoogleGenAI, Modality, Type, FunctionDeclaration } from "@google/genai";

const updateDimensionsDeclaration: FunctionDeclaration = {
  name: 'update_dimensions',
  parameters: {
    type: Type.OBJECT,
    description: 'Atualiza as dimensões físicas da parede ou do projeto.',
    properties: {
      width: { type: Type.NUMBER, description: 'Nova largura em milímetros.' },
      height: { type: Type.NUMBER, description: 'Nova altura em milímetros.' },
      depth: { type: Type.NUMBER, description: 'Nova profundidade em milímetros.' }
    }
  }
};

const changeMaterialDeclaration: FunctionDeclaration = {
  name: 'change_material',
  parameters: {
    type: Type.OBJECT,
    description: 'Altera o material ou acabamento do projeto.',
    properties: {
      materialName: { type: Type.STRING, description: 'Nome do material (ex: Carvalho, Branco Supremo).' },
      slot: { type: Type.STRING, enum: ['PRIMARY', 'SECONDARY'], description: 'Se altera as frentes ou o corpo.' }
    },
    required: ['materialName']
  }
};

export const LiveService = {
  connect: async (callbacks: {
    onOpen: () => void;
    onMessage: (msg: any) => void;
    onClose: () => void;
    onToolCall: (calls: any[]) => void;
  }) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    return ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } }
        },
        tools: [{ 
            functionDeclarations: [
                updateDimensionsDeclaration, 
                changeMaterialDeclaration
            ] 
        }],
        systemInstruction: `Você é o Engenheiro Assistente da MarcenariaAI Pro. 
        Sua função é auxiliar o marceneiro a ajustar projetos via voz.
        Seja técnico, breve e execute as funções sempre que o usuário pedir mudanças de medidas ou materiais.
        Exemplo: "Aumente a largura para 4 metros" -> chame update_dimensions(width: 4000).`
      },
      callbacks: {
        onopen: callbacks.onOpen,
        onclose: callbacks.onClose,
        onmessage: (msg) => {
            if (msg.toolCall) {
                callbacks.onToolCall(msg.toolCall.functionCalls);
            }
            callbacks.onMessage(msg);
        },
        onerror: (e) => console.error("Live API Error:", e)
      }
    });
  }
};
