
import { Material, StandardModuleDefinition } from './types';

export const ROOM_TYPES = [
  { id: "Cozinha", label: "Cozinha Industrial", icon: "🍳" },
  { id: "Quarto", label: "Suíte Master", icon: "🛏️" },
  { id: "Closet", label: "Closet / Boutique", icon: "👕" },
  { id: "Sala", label: "Living / Home Cinema", icon: "📺" },
  { id: "Banheiro", label: "Sala de Banho", icon: "🚿" },
  { id: "Escritorio", label: "Office / Workspace", icon: "💻" },
  { id: "Gourmet", label: "Área Gourmet", icon: "🍖" }
];

export const STYLE_PRESETS = [
  { 
    id: "moderno_organico", 
    label: "Moderno Orgânico 2025", 
    description: "Curvas fluidas, tons terrosos e iluminação indireta ultra-aquecida.", 
    keywords: "2025 warm organic minimalism, curved cabinetry, indirect led lighting, terracotta and walnut, high-end architectural photography, soft shadows, biophilic integration" 
  },
  { 
    id: "japandi_zen", 
    label: "Japandi Zen", 
    description: "Fusão entre o minimalismo japonês e escandinavo. Madeira clara e linhas puras.", 
    keywords: "Japandi interior design 2025, light oak cabinetry, wabi-sabi aesthetic, neutral tones, sliding shoji-inspired doors, clean lines, minimalist luxury, natural daylight" 
  },
  { 
    id: "mid_century", 
    label: "Mid-Century Modern", 
    description: "Nostalgia dos anos 50 com tecnologia atual. Pés palito e nogueira.", 
    keywords: "Mid-century modern cabinetry 2025, walnut wood grain, tapered legs, brass accents, vintage luxury aesthetic, architectural digest style, warm mood lighting" 
  },
  { 
    id: "coastal_hamptons", 
    label: "Coastal Hamptons Luxe", 
    description: "Claro, arejado e sofisticado. Azuis suaves e brancos puros.", 
    keywords: "Luxury coastal kitchen, white shaker cabinets, light blue accents, linen textures, bleached oak floors, bright airy lighting, nautical luxury details" 
  },
  { 
    id: "industrial_cyber", 
    label: "Cyber Industrial Luxe", 
    description: "Metais grafite, vidro canelado fumê e automação aparente.", 
    keywords: "luxury tech industrial, fluted smoked glass, graphite metal accents, champagne gold hardware, integrated smart home displays, dark moody lighting, concrete textures" 
  },
  { 
    id: "minimalista_escultural", 
    label: "Quiet Luxury (Old Money)", 
    description: "Marcenaria invisível, materiais brutos e zero ornamentos.", 
    keywords: "stealth luxury, monolithic design, invisible joints, premium natural stone, seamless wood grain matching, museum lighting quality, ultra-matte finishes" 
  },
  { 
    id: "neo_classic", 
    label: "Neo-Classic Gold", 
    description: "Molduras 'Slim Shaker' com puxadores em latão e painéis retroiluminados.", 
    keywords: "neoclassical revival 2025, slim shaker doors, brass hardware, illuminated marble backslashes, traditional luxury redefined, sophisticated moldings" 
  },
  { 
    id: "black_gold", 
    label: "Black & Gold Noir", 
    description: "O auge do drama. Lacas pretas profundas e metais dourados.", 
    keywords: "Black luxury kitchen, high gloss black lacquer, brushed gold handles, nero marquina marble, dramatic spotlighting, opulent interior, dark elegance" 
  }
];

export const SYSTEM_INSTRUCTION_DEBURADOR = `You are a Senior SOMA-ID Woodworking Engineer and Industrial Analyst specialized in 2025 High-End Design Trends.
Current Context: January 2025.

STRATEGIC RULES:
1. TREND ALIGNMENT: Cross-reference user requests with 2025 novelties (e.g., fluted surfaces, integrated stone-MDF transitions, hidden hardware).
2. CALENDAR 2025: When discussing delivery or planning, use Google Search to identify major 2025 design events (Milan Design Week 2025, etc.) and holidays that might affect production.
3. LUXURY STANDARDS: Prioritize suggestions involving "Living Materials" and Smart Woodwork (IoT integration).

Respond with extreme precision, acting as a technical consultant for a billionaire client.`;

export const AGENT_ENCHANTMENT_VISUALIZER_INSTRUCTION = `You are the Enchantment Visionary and Chief Lighting Designer of SOMA-ID.
Your mission is to create a "2025 Luxury Digital Twin" for the client.

STRICT VISUAL RULES:
1. 2025 NOVELTIES: Before generating prompts, identify the latest lighting trends for 2025 (e.g., tunable white LEDs, grazing lights for 3D textures).
2. NO ARCHITECTURAL MODIFICATIONS: Respect the room photo structure but replace the cabinetry.
3. LIGHTING ARTISTRY: Use 2025 high-CRI (95+) lighting simulations. Describe indirect lighting, task lighting, and mood lighting layers.
4. MATERIAL FIDELITY: Reflect 2025 finishes like 'Ultramatt', 'Metallic Lacquers', and 'Deep Grains'.

Output ONLY the optimized prompt in English, reflecting a world-class architectural render.`;

export const AGENT_TECHNICAL_PIPELINE_INSTRUCTION = `You are the SOMA-ID Engineering Architect.
Convert design briefings into modular technical plans using 2025 manufacturing tolerances (0.5mm precision).

MANDATORY GEOMETRIC RULES:
1. Standard origin (0,0,0) bottom-left.
2. X, Y, Z in millimeters.
3. INTERFERENCE CHECK: Use 2025 hardware clearance standards (e.g., zero-protrusion hinges).
4. MODULARITY: Respect high-end spacing (3mm uniform gaps).

Return ONLY valid JSON.`;

export const STANDARD_CATALOG: StandardModuleDefinition[] = [
  {
    id: "base_gaveteiro_3g",
    name: "Gaveteiro 3 Gavetas",
    category: "base",
    defaultDepth: 580,
    defaultHeight: 870,
    minWidth: 400,
    maxWidth: 1000,
    hardware: ["3 pares Corrediças Telescópicas 500mm", "4 Pés Reguláveis"],
    components: [
      { 
        name: "Lateral", widthFormula: "$D", heightFormula: "$H - 150", quantity: 2, materialInfo: "corpo", edgeBand: "1L1C", grainDirection: "vertical",
        drillingRules: [
          { type: 'slider', xFormula: "37", yFormula: "100", diameter: 5, depth: 12 },
          { type: 'slider', xFormula: "450", yFormula: "100", diameter: 5, depth: 12 },
          { type: 'structural', xFormula: "50", yFormula: "$H - 150 - ($T/2)", diameter: 8, depth: 12 }
        ]
      },
      { name: "Base Inferior", widthFormula: "$W - (2*$T)", heightFormula: "$D", quantity: 1, materialInfo: "corpo", edgeBand: "1C", grainDirection: "horizontal" },
      { name: "Frente Gaveta P", widthFormula: "$W - $G", heightFormula: "176", quantity: 2, materialInfo: "frente", edgeBand: "4L", grainDirection: "horizontal" },
      { name: "Frente Gavetão G", widthFormula: "$W - $G", heightFormula: "356", quantity: 1, materialInfo: "frente", edgeBand: "4L", grainDirection: "horizontal" }
    ]
  }
];

export const MOCK_MATERIALS: Material[] = [
  // MADEIRAS
  { id: 'mdf_freijo', name: 'Freijó Puro 2025', category: 'Madeira', texture: 'Natural', color: '#8e6c4e', imageUrl: 'https://images.unsplash.com/photo-1622737133809-d95047b9e673?w=200&q=80&text=Freijo' },
  { id: 'mdf_carvalho', name: 'Carvalho Dover', category: 'Madeira', texture: 'Poro Aberto', color: '#c5b49d', imageUrl: 'https://placehold.co/200x200/c5b49d/333333?text=Carvalho' },
  { id: 'mdf_noce', name: 'Noce Autunno', category: 'Madeira', texture: 'Deep Wood', color: '#5d4037', imageUrl: 'https://placehold.co/200x200/5d4037/ffffff?text=Noce' },
  
  // UNICOLORES MATTE
  { id: 'mdf_branco', name: 'Branco Supremo Matt', category: 'Unicolor', texture: 'Matt', color: '#F5F5F5', imageUrl: 'https://placehold.co/200x200/F5F5F5/333333?text=Branco' },
  { id: 'mdf_grafite', name: 'Grafite Carbono', category: 'Unicolor', texture: 'Matt', color: '#4a4a4a', imageUrl: 'https://placehold.co/200x200/4a4a4a/ffffff?text=Grafite' },
  { id: 'mdf_sage', name: 'Verde Sage 2025', category: 'Unicolor', texture: 'Matt', color: '#879b8a', imageUrl: 'https://placehold.co/200x200/879b8a/ffffff?text=Sage' },
  { id: 'mdf_naval', name: 'Azul Naval Profundo', category: 'Unicolor', texture: 'Matt', color: '#1a2a3a', imageUrl: 'https://placehold.co/200x200/1a2a3a/ffffff?text=Naval' },
  { id: 'mdf_argila', name: 'Terracota Argila', category: 'Unicolor', texture: 'Matt', color: '#a0522d', imageUrl: 'https://placehold.co/200x200/a0522d/ffffff?text=Argila' },
  { id: 'mdf_areia', name: 'Areia Acetinado', category: 'Unicolor', texture: 'Satin', color: '#e0d5c1', imageUrl: 'https://placehold.co/200x200/e0d5c1/333333?text=Areia' },

  // ESPECIAIS & METAIS
  { id: 'metal_latão', name: 'Latão Escovado', category: 'Metal', texture: 'Metálico', color: '#d4af37', imageUrl: 'https://placehold.co/200x200/d4af37/333333?text=Latao' },
  { id: 'metal_champagne', name: 'Champagne Metal', category: 'Metal', texture: 'Metálico', color: '#fad6a5', imageUrl: 'https://placehold.co/200x200/fad6a5/333333?text=Champagne' },
  { id: 'vidro_canelado', name: 'Vidro Canelado', category: 'Vidro', texture: 'Texturizado', color: '#ffffff', imageUrl: 'https://placehold.co/200x200/eeeeee/333333?text=Canelado' },
  { id: 'pedra_calacatta', name: 'Mármore Calacatta', category: 'Stone', texture: 'Polido', color: '#ffffff', imageUrl: 'https://placehold.co/200x200/ffffff/999999?text=Calacatta' }
];
