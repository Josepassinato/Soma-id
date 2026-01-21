
import { Project, BlueprintData, ExtractedInsights, ConsultationInput, AiLayoutPlan } from "../types";
import { EngineeringService } from './engineeringService';

// Backend API URL - use relative URL for Kubernetes ingress routing
// The ingress automatically routes /api/* requests to the backend service
const API_URL = '/api';

// Get current language from localStorage
const getCurrentLanguage = (): string => {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('marcenaria_lang') || 'pt';
  }
  return 'pt';
};

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
 * Analyze consultation input via backend Gemini API
 */
export const analyzeConsultationWithGemini = async (input: ConsultationInput): Promise<ExtractedInsights> => {
  try {
    const language = getCurrentLanguage();
    
    const response = await fetch(`${API_URL}/gemini/analyze-consultation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input, language }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to analyze consultation');
    }

    const result = await response.json();
    
    if (result.status === 'success') {
      return result.data as ExtractedInsights;
    }
    
    throw new Error('Invalid response from server');
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
};

/**
 * Generate architectural visualization prompt via backend
 */
export const generateEnchantmentPrompt = async (project: Project, angle: string = "Frontal View"): Promise<string> => {
  try {
    const language = getCurrentLanguage();
    
    const response = await fetch(`${API_URL}/gemini/generate-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientName: project.clientName,
        roomType: project.roomType,
        wallWidth: project.wallWidth,
        wallHeight: project.wallHeight || 2700,
        styleDescription: project.styleDescription,
        angle: angle,
        language: language,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate prompt');
    }

    const result = await response.json();
    
    if (result.status === 'success') {
      return result.data.prompt;
    }
    
    throw new Error('Invalid response from server');
  } catch (error) {
    console.error('Error generating prompt:', error);
    throw error;
  }
};

/**
 * Generate architectural visualization image via backend
 * Uses Gemini Nano Banana for actual image generation
 */
export const generateEnchantmentImage = async (prompt: string, materialPhoto: string): Promise<string> => {
  try {
    const response = await fetch(`${API_URL}/gemini/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        materialPhoto: materialPhoto || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate image');
    }

    const result = await response.json();
    
    if (result.status === 'success') {
      // Check if we have an actual generated image
      if (result.data.generated && result.data.image) {
        console.log('Image generated successfully');
        return result.data.image; // This is already a data URI (data:image/png;base64,...)
      }
      
      // Fallback: no image was generated, throw error to inform user
      console.warn('Image generation note:', result.data.note);
      throw new Error('A geração de imagem retornou apenas uma descrição. Por favor, tente novamente.');
    }
    
    throw new Error('Invalid response from server');
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
};

/**
 * Generate technical blueprint data via backend
 */
export const generateTechnicalData = async (project: Project): Promise<BlueprintData> => {
  try {
    const language = getCurrentLanguage();
    
    const response = await fetch(`${API_URL}/gemini/generate-technical-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientName: project.clientName,
        roomType: project.roomType,
        wallWidth: project.wallWidth,
        wallHeight: project.wallHeight || 2700,
        wallDepth: project.wallDepth || 600,
        styleDescription: project.styleDescription,
        language: language,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate technical data');
    }

    const result = await response.json();
    
    if (result.status === 'success') {
      const aiPlan: AiLayoutPlan = result.data;
      return await EngineeringService.processBlueprint(aiPlan, project);
    }
    
    throw new Error('Invalid response from server');
  } catch (error) {
    console.error('Error generating technical data:', error);
    throw error;
  }
};

/**
 * Check Gemini API health via backend
 */
export const checkGeminiHealth = async (): Promise<{ status: boolean; latency: number; error?: string }> => {
  try {
    const response = await fetch(`${API_URL}/gemini/health`);
    const result = await response.json();
    
    return {
      status: result.status === 'healthy',
      latency: result.latency || 0,
      error: result.message,
    };
  } catch (error) {
    return {
      status: false,
      latency: 0,
      error: (error as Error).message,
    };
  }
};
