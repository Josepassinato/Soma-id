
import { Project, BlueprintData, ExtractedInsights, ConsultationInput, AiLayoutPlan } from "../types";
import { EngineeringService } from './engineeringService';

// Backend API URL - use the external URL for production
const getBackendUrl = (): string => {
  // Check for Vite env variable first
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_BACKEND_URL) {
    return (import.meta as any).env.VITE_BACKEND_URL;
  }
  // Check for window variable
  if (typeof window !== 'undefined' && (window as any).BACKEND_URL) {
    return (window as any).BACKEND_URL;
  }
  // Default: use relative URL which works with proxy
  return '/api';
};

const API_URL = getBackendUrl();

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
    const response = await fetch(`${API_URL}/gemini/analyze-consultation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
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
 * Note: Returns a description since Gemini doesn't directly generate images
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
      // Since Gemini doesn't generate images directly, return description
      // In production, you'd integrate with DALL-E, Imagen, or similar
      console.log('Image generation note:', result.data.note);
      
      // Return a placeholder or the description
      // For actual image, integrate with an image generation API
      return `data:text/plain;base64,${btoa(result.data.description)}`;
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
