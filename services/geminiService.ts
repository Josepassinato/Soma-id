
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
      console.warn('Image API returned error, using concept render fallback');
      return generateConceptRenderSvg(prompt);
    }

    const result = await response.json();

    if (result.status === 'success' && result.data.generated && result.data.image) {
      console.log('Image generated successfully');
      return result.data.image;
    }

    // Fallback: generate a visual SVG concept render
    console.warn('Image generation unavailable, using concept render fallback');
    return generateConceptRenderSvg(prompt);
  } catch (error) {
    console.warn('Image generation failed, using concept render fallback:', error);
    return generateConceptRenderSvg(prompt);
  }
};

/**
 * Generates a professional SVG concept render as data URI fallback
 * when Gemini Imagen is unavailable.
 */
const generateConceptRenderSvg = (prompt: string): string => {
  const keywords = prompt.toLowerCase();
  const isDark = keywords.includes('dark') || keywords.includes('escur') || keywords.includes('nogueira') || keywords.includes('ebony');
  const hasGold = keywords.includes('gold') || keywords.includes('dourad') || keywords.includes('brass') || keywords.includes('latão');

  const bgColor = isDark ? '#1a1a2e' : '#f0ebe3';
  const cabinetColor = isDark ? '#2d1810' : '#8b7355';
  const cabinetDark = isDark ? '#1a0e08' : '#6b5740';
  const counterColor = '#e8e0d8';
  const accentColor = hasGold ? '#d4af37' : '#8c8c8c';
  const wallColor = isDark ? '#16213e' : '#faf5ef';
  const floorColor = isDark ? '#0f0f1a' : '#d4c5b0';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
    <defs>
      <linearGradient id="floorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:${floorColor};stop-opacity:0.8"/>
        <stop offset="100%" style="stop-color:${floorColor};stop-opacity:1"/>
      </linearGradient>
      <linearGradient id="cabinetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:${cabinetColor};stop-opacity:1"/>
        <stop offset="100%" style="stop-color:${cabinetDark};stop-opacity:1"/>
      </linearGradient>
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000" flood-opacity="0.3"/>
      </filter>
      <linearGradient id="ledGlow" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#fff;stop-opacity:0.6"/>
        <stop offset="100%" style="stop-color:#fff;stop-opacity:0"/>
      </linearGradient>
    </defs>
    <!-- Background wall -->
    <rect width="1200" height="800" fill="${wallColor}"/>
    <!-- Floor -->
    <polygon points="0,550 1200,550 1200,800 0,800" fill="url(#floorGrad)"/>
    <line x1="0" y1="550" x2="1200" y2="550" stroke="${accentColor}" stroke-width="1" opacity="0.3"/>
    <!-- Upper cabinets -->
    <rect x="100" y="80" width="250" height="200" rx="2" fill="url(#cabinetGrad)" filter="url(#shadow)"/>
    <rect x="360" y="80" width="250" height="200" rx="2" fill="url(#cabinetGrad)" filter="url(#shadow)"/>
    <rect x="620" y="80" width="250" height="200" rx="2" fill="url(#cabinetGrad)" filter="url(#shadow)"/>
    <rect x="880" y="80" width="220" height="200" rx="2" fill="url(#cabinetGrad)" filter="url(#shadow)"/>
    <!-- LED strip under uppers -->
    <rect x="100" y="280" width="1000" height="6" fill="url(#ledGlow)" opacity="0.8"/>
    <!-- Counter / backsplash -->
    <rect x="80" y="340" width="1040" height="30" rx="1" fill="${counterColor}" filter="url(#shadow)"/>
    <!-- Base cabinets -->
    <rect x="100" y="370" width="200" height="180" rx="2" fill="url(#cabinetGrad)" filter="url(#shadow)"/>
    <rect x="310" y="370" width="200" height="180" rx="2" fill="url(#cabinetGrad)" filter="url(#shadow)"/>
    <!-- Oven recess -->
    <rect x="520" y="370" width="180" height="180" rx="2" fill="#111" filter="url(#shadow)"/>
    <rect x="530" y="380" width="160" height="140" rx="4" fill="#1a1a1a" stroke="#333" stroke-width="1"/>
    <rect x="545" y="395" width="130" height="100" rx="2" fill="#222" stroke="#444" stroke-width="0.5"/>
    <circle cx="610" cy="535" r="6" fill="${accentColor}"/>
    <!-- More base cabinets -->
    <rect x="710" y="370" width="200" height="180" rx="2" fill="url(#cabinetGrad)" filter="url(#shadow)"/>
    <rect x="920" y="370" width="180" height="180" rx="2" fill="url(#cabinetGrad)" filter="url(#shadow)"/>
    <!-- Cabinet handles -->
    <rect x="290" y="440" width="3" height="40" rx="1" fill="${accentColor}" opacity="0.9"/>
    <rect x="500" y="440" width="3" height="40" rx="1" fill="${accentColor}" opacity="0.9"/>
    <rect x="900" y="440" width="3" height="40" rx="1" fill="${accentColor}" opacity="0.9"/>
    <rect x="1090" y="440" width="3" height="40" rx="1" fill="${accentColor}" opacity="0.9"/>
    <!-- Drawer lines -->
    <line x1="105" y1="430" x2="295" y2="430" stroke="${accentColor}" stroke-width="0.5" opacity="0.4"/>
    <line x1="105" y1="480" x2="295" y2="480" stroke="${accentColor}" stroke-width="0.5" opacity="0.4"/>
    <line x1="715" y1="430" x2="905" y2="430" stroke="${accentColor}" stroke-width="0.5" opacity="0.4"/>
    <line x1="715" y1="480" x2="905" y2="480" stroke="${accentColor}" stroke-width="0.5" opacity="0.4"/>
    <!-- Toe kick LED -->
    <rect x="100" y="548" width="1000" height="3" fill="#fff" opacity="0.15"/>
    <!-- Branding -->
    <rect x="40" y="700" width="200" height="60" rx="8" fill="#000" opacity="0.5"/>
    <text x="140" y="725" font-family="system-ui,sans-serif" font-size="11" fill="#fff" text-anchor="middle" font-weight="bold" letter-spacing="4">SOMA-ID</text>
    <text x="140" y="745" font-family="system-ui,sans-serif" font-size="8" fill="${accentColor}" text-anchor="middle" letter-spacing="2">CONCEPT RENDER</text>
  </svg>`;

  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
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
