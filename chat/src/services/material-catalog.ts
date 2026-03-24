/**
 * material-catalog.ts
 * Loads all materials from MongoDB (via backend API) with in-memory cache.
 * Provides search, filter, and lookup functions for use in Gemini prompts
 * and engine-bridge material resolution.
 */

interface CatalogMaterial {
  id: string;
  name: string;
  code: string | null;
  category: string;
  color_hex: string;
  color: string;
  texture: string | null;
  manufacturer: string;
  subcategory: string | null;
  dimensions: string | null;
}

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8003/api";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cachedMaterials: CatalogMaterial[] = [];
let cacheTimestamp = 0;

/**
 * Load all materials from MongoDB via the backend API.
 * Results are cached for 10 minutes.
 */
export async function loadMaterials(): Promise<CatalogMaterial[]> {
  const now = Date.now();
  if (cachedMaterials.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedMaterials;
  }

  try {
    const resp = await fetch(`${BACKEND_URL}/catalog/materials`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    const data: CatalogMaterial[] = json.data || json;
    if (Array.isArray(data) && data.length > 0) {
      cachedMaterials = data;
      cacheTimestamp = now;
      console.log(`📦 Material catalog loaded: ${data.length} materials`);
    }
  } catch (err) {
    console.warn(`⚠️ Failed to load materials from backend: ${err}`);
    // Keep stale cache if available
  }

  return cachedMaterials;
}

/**
 * Get a material by exact name (case-insensitive).
 */
export function getMaterialByName(name: string): CatalogMaterial | undefined {
  const lower = name.toLowerCase().trim();
  return cachedMaterials.find((m) => m.name.toLowerCase() === lower);
}

/**
 * Get a material by product code.
 */
export function getMaterialByCode(code: string): CatalogMaterial | undefined {
  const lower = code.toLowerCase().trim();
  return cachedMaterials.find(
    (m) => m.code && m.code.toLowerCase() === lower
  );
}

/**
 * Filter materials by category (case-insensitive).
 */
export function getMaterialsByCategory(category: string): CatalogMaterial[] {
  const lower = category.toLowerCase().trim();
  return cachedMaterials.filter((m) => m.category.toLowerCase() === lower);
}

/**
 * Fuzzy text search across name, code, category, subcategory, and texture.
 */
export function searchMaterials(query: string): CatalogMaterial[] {
  const terms = normalize(query).split(/\s+/);
  return cachedMaterials.filter((m) => {
    const searchable = normalize(
      [m.name, m.code, m.category, m.subcategory, m.texture]
        .filter(Boolean)
        .join(" ")
    );
    return terms.every((t) => searchable.includes(t));
  });
}

/**
 * Find best matching material by partial name (for engine-bridge resolution).
 * Tries exact match first, then partial match, then first-word match.
 */
/**
 * Normalize string: remove accents and convert to lowercase.
 */
function normalize(s: string): string {
  return s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function findBestMatch(colorName: string): CatalogMaterial | undefined {
  const lower = colorName.toLowerCase().trim();
  const norm = normalize(colorName);

  // 1. Exact match (with and without accents)
  const exact = cachedMaterials.find((m) =>
    m.name.toLowerCase() === lower || normalize(m.name) === norm
  );
  if (exact) return exact;

  // 2. Name contains the query (accent-insensitive)
  const partial = cachedMaterials.find((m) =>
    m.name.toLowerCase().includes(lower) || normalize(m.name).includes(norm)
  );
  if (partial) return partial;

  // 3. Query contains a material name (accent-insensitive)
  const reverse = cachedMaterials.find((m) =>
    lower.includes(m.name.toLowerCase()) || norm.includes(normalize(m.name))
  );
  if (reverse) return reverse;

  // 4. First word match (accent-insensitive)
  const firstWord = norm.split(/\s+/)[0];
  if (firstWord.length >= 3) {
    const wordMatch = cachedMaterials.find((m) =>
      normalize(m.name).startsWith(firstWord) || normalize(m.name).split(/\s+/).some(w => w.startsWith(firstWord))
    );
    if (wordMatch) return wordMatch;
  }

  return undefined;
}

/**
 * Get all materials (from cache).
 */
export function getAllMaterials(): CatalogMaterial[] {
  return cachedMaterials;
}

/**
 * Get material by ID.
 */
export function getMaterialById(id: string): CatalogMaterial | undefined {
  return cachedMaterials.find((m) => m.id === id);
}

// ============================================================
// Visual description from catalog data (zero hardcoded colors)
// ============================================================

/**
 * Convert hex color to HSL components.
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Derive a color name algorithmically from HSL values.
 * Zero hardcoded color names — purely from HSL ranges.
 */
function hslToColorName(h: number, s: number, l: number): string {
  // Grayscale
  if (s < 20) {
    if (l < 15) return "black";
    if (l < 35) return "dark charcoal";
    if (l < 65) return "gray";
    if (l < 85) return "light gray";
    return "white";
  }

  // Lightness prefix
  const prefix = l < 30 ? "deep dark " : l > 70 ? "light " : "";

  // Hue ranges
  let base: string;
  if (h < 15 || h >= 345) {
    base = "red";
  } else if (h < 45) {
    // Orange/brown range — depends on lightness
    if (l < 40) base = "dark brown";
    else if (l < 60) base = "brown";
    else base = "warm beige";
  } else if (h < 65) {
    base = l < 50 ? "golden" : "yellow";
  } else if (h < 165) {
    base = "green";
  } else if (h < 195) {
    base = "teal";
  } else if (h < 255) {
    if (l < 35) base = "dark navy blue";
    else if (l < 60) base = "blue";
    else base = "light blue";
  } else if (h < 285) {
    base = "purple";
  } else {
    base = "pink";
  }

  // Avoid redundant prefixes (e.g. "deep dark dark brown")
  if (base.startsWith("dark") && prefix.includes("dark")) return base;
  if (base.startsWith("light") && prefix.includes("light")) return base;

  return (prefix + base).trim();
}

/**
 * Derive texture description from the material's category field in the DB.
 */
function categoryToTexture(category: string): string {
  const lower = (category || "").toLowerCase();
  if (lower.includes("madeirado") || lower.includes("madeira")) return "wood grain texture";
  if (lower.includes("unicolor")) return "smooth matte laminate";
  if (lower.includes("vidro")) return "glass";
  if (lower.includes("tecido")) return "fabric upholstery";
  if (lower.includes("espelho")) return "mirror finish";
  if (lower.includes("pintura")) return "painted finish";
  if (lower.includes("metal") || lower.includes("puxador")) return "metal hardware";
  if (lower.includes("perfil")) return "aluminum profile";
  return "laminate";
}

/**
 * Convert a catalog material to a visual description for image generation prompts.
 * ALL data comes from the MongoDB fields — zero hardcoded colors or textures.
 */
export function materialToVisualDescription(materialIdOrName: string): string {
  // Try by ID first, then by name
  let mat = getMaterialById(materialIdOrName);
  if (!mat) mat = getMaterialByName(materialIdOrName);
  if (!mat) mat = findBestMatch(materialIdOrName);

  if (!mat) return `material not found in catalog: "${materialIdOrName}"`;

  const hex = mat.color_hex || mat.color || "";
  const hsl = hex ? hexToHsl(hex) : { h: 0, s: 0, l: 50 };
  const colorName = hex ? hslToColorName(hsl.h, hsl.s, hsl.l) : "neutral";
  const textureDesc = categoryToTexture(mat.category);

  // Enrich with DB texture field if available
  const textureSuffix = mat.texture && mat.texture !== "Liso"
    ? ` with ${mat.texture.toLowerCase()} finish`
    : "";

  return `${colorName} ${textureDesc}${textureSuffix} (${mat.name} by Boa Vista)`;
}

/**
 * Build a materials legend string for display alongside concept images.
 */
export function buildMaterialsLegend(
  assignments: Record<string, string | null>
): string {
  const roleLabels: Record<string, string> = {
    primary: "Corpo principal",
    secondary: "Portas e gavetas",
    accent: "Detalhes/Puxadores",
    island: "Ilha central",
    internal: "Interior dos modulos",
  };

  const lines: string[] = [];
  for (const [role, name] of Object.entries(assignments)) {
    if (!name) continue;
    const mat = getMaterialByName(name) || findBestMatch(name);
    if (mat) {
      lines.push(`${roleLabels[role] || role}: ${mat.name} — ${mat.color_hex || mat.color} (Boa Vista)`);
    }
  }
  return lines.length > 0
    ? "Materiais aplicados nesta imagem conceito:\n" + lines.map(l => "• " + l).join("\n")
    : "";
}

/**
 * Build a formatted catalog string for injection into Gemini prompts.
 * Groups materials by category with color hex and texture info.
 */
export function buildCatalogPrompt(): string {
  if (cachedMaterials.length === 0) {
    return "CATALOGO DE MATERIAIS: Nenhum material carregado.";
  }

  const grouped: Record<string, CatalogMaterial[]> = {};
  for (const m of cachedMaterials) {
    const cat = m.category || "Outros";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(m);
  }

  let text =
    "CATALOGO DE MATERIAIS DISPONIVEIS BOA VISTA (apresente estas opcoes ao cliente quando perguntar sobre materiais/cores):\n";

  for (const cat of Object.keys(grouped).sort()) {
    text += `\n${cat.toUpperCase()} (${grouped[cat].length} opcoes):\n`;
    for (const m of grouped[cat].sort((a, b) => a.name.localeCompare(b.name))) {
      const parts = [`- ${m.name}`];
      if (m.code) parts[0] += ` [${m.code}]`;
      if (m.color_hex) parts.push(`cor ${m.color_hex}`);
      if (m.texture) parts.push(`textura ${m.texture}`);
      text += parts.join(", ") + "\n";
    }
  }

  text += `\nFERRAGENS DISPONIVEIS:\n`;
  text += `- Corredicas telescopicas com soft-close (full extension)\n`;
  text += `- Dobradicas 35mm copo com soft-close\n`;
  text += `- Suportes de prateleira (pino metalico ou invisivel)\n`;
  text += `- Barra cabideiro oval cromada 25mm\n`;
  text += `- Corredica sapateira telescopica com inclinacao 15 graus\n`;
  text += `- Sensores LED (acionamento por porta)\n`;
  text += `- Fitas de LED para vitrines e prateleiras\n`;
  text += `\nTIPOS DE INSTALACAO:\n- Piso (apoiado no chao com rodape)\n- Suspenso (fixado na parede)\n`;

  return text;
}

/**
 * Build COLOR_TO_MATERIAL lookup map for engine-bridge.
 * Creates entries keyed by lowercase name and common aliases.
 */
export function buildColorToMaterialMap(): Record<
  string,
  { id: string; name: string; category: string; texture: string; color: string; imageUrl: string }
> {
  const map: Record<string, { id: string; name: string; category: string; texture: string; color: string; imageUrl: string }> = {};

  for (const m of cachedMaterials) {
    const entry = {
      id: m.id,
      name: m.name,
      category: m.category,
      texture: m.texture || "Liso",
      color: m.color_hex || m.color,
      imageUrl: "",
    };

    // Add by full name lowercase
    map[m.name.toLowerCase()] = entry;

    // Add by first word (e.g. "freijó" -> entry)
    const firstWord = m.name.toLowerCase().split(/\s+/)[0];
    if (firstWord.length >= 3 && !map[firstWord]) {
      map[firstWord] = entry;
    }

    // Add by id
    if (m.id && !map[m.id]) {
      map[m.id] = entry;
    }
  }

  return map;
}
