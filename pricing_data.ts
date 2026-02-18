
// pricing_data.ts
// Este arquivo contém os valores estimados de custos e fatores de complexidade para o orçamento.
// José, você pode editar estes valores para ajustar as estimativas.

export const MATERIAL_COSTS_PER_M2: { [key: string]: number } = {
  "Madeira": 350, // Ex: Freijó, Carvalho - R$ por m²
  "Unicolor": 200, // Ex: MDF Branco, Grafite - R$ por m²
  "Especial": 500, // Ex: Metais, Vidros - R$ por m² (ex: Latão, Vidro Canelado)
  "Stone_Padrao": 600, // Ex: Quartzo branco, Granito - R$ por m²
  "Stone_Premium": 1000, // Ex: Mármores exóticos, Quartzitos de alta gama - R$ por m²
  "Ferragens_Basicas": 50, // Custo médio por ferragem básica (puxadores, dobradiças simples) - por módulo
  "Ferragens_Premium": 200, // Custo médio por ferragem premium (corrediças telescópicas c/ amortecimento, articuladores) - por módulo
  "Iluminacao_LED": 80, // Custo por metro linear de fita LED integrada
};

export const STYLE_COMPLEXITY_FACTOR: { [key: string]: number } = {
  "moderno_organico": 1.2,
  "japandi_zen": 1.1,
  "mid_century": 1.3,
  "coastal_hamptons": 1.1,
  "industrial_cyber": 1.4,
  "minimalista_escultural": 1.5, // Estilos mais luxuosos/complexos
  "neo_classic": 1.3,
  "black_gold": 1.4,
};

// Custos base por tipo de módulo (sem material e estilo ainda)
export const SIMPLE_MODULE_COST = 800;    // Ex: armário de 1 porta, prateleira
export const INTERMEDIATE_MODULE_COST = 1500; // Ex: gaveteiro 3 gavetas, armário com 2 portas
export const COMPLEX_MODULE_COST = 2500;  // Ex: canto, torre para forno, módulo com ferragens especiais

// Distribuição estimada de módulos por tipo de ambiente
export const ESTIMATED_MODULE_DISTRIBUTION: { [key: string]: { simple: number; intermediate: number; complex: number } } = {
  "Cozinha": { simple: 4, intermediate: 4, complex: 2 }, // Total 10
  "Quarto": { simple: 3, intermediate: 2, complex: 1 }, // Total 6
  "Closet": { simple: 4, intermediate: 3, complex: 1 }, // Total 8
  "Sala": { simple: 2, intermediate: 2, complex: 0 },   // Total 4
  "Banheiro": { simple: 2, intermediate: 1, complex: 0 },// Total 3
  "Escritorio": { simple: 3, intermediate: 2, complex: 0 },// Total 5
  "Gourmet": { simple: 4, intermediate: 3, complex: 1 }, // Total 8
};

// Taxa fixa para o serviço de design inicial
export const DESIGN_FEE_BASE = 2500; 

// Taxa fixa para o serviço de gestão e acompanhamento
export const MANAGEMENT_FEE_BASE = 1500;

// Margem de segurança / lucro (em percentual) - Aplicada sobre CUSTOS + SERVIÇOS
export const PROJECT_MARKUP_PERCENTAGE = 0.20; // 20%
export const PROJECT_MARKUP_DESCRIPTION = "Markup geral do projeto (inclui risco, garantias, gestão e variação de mercado)";

// Percentual de variação para a faixa de preço (ex: 0.10 para +/- 10%)
// Agora não é um percentual simples, mas uma base para o cálculo de cenários. Manter para futura referência se necessário
export const BUDGET_RANGE_SCENARIO_VARIATION_PERCENTAGE = 0.15; // +/- 15% para simular cenários básico/premium nos itens específicos

// Heurística para estimar a proporção de uso de materiais em uma cozinha
// Usado para distribuir a área total entre FRENTES, CAIXAS, TAMPOS, DETALHES
export const MATERIAL_USAGE_PROPORTIONS: { [key: string]: { proportion: number; materialCategory: string }[] } = {
  "Cozinha": [
    { proportion: 0.40, materialCategory: "Frentes" }, // Ex: MDF madeirado ou unicolor
    { proportion: 0.30, materialCategory: "Caixas" },  // Ex: MDF unicolor (branco)
    { proportion: 0.20, materialCategory: "Stone" },   // Ex: Bancada de mármore/quartzito
    { proportion: 0.10, materialCategory: "Especial" }, // Ex: Detalhes metálicos, vidro
  ],
  // Adicionar proporções para outros ROOM_TYPES conforme necessário
};

// Custos por categoria de material (para MATERIAL_USAGE_PROPORTIONS)
// Estes são custos base; o material específico selecionado pode sobrescrever.
export const CATEGORY_MATERIAL_COSTS_PER_M2: { [key: string]: number } = {
  "Madeira": 350,
  "Unicolor": 200,
  "Especial": 500,
  "Stone": 800, // Custo médio para Stone (pode ser Stone_Padrao ou Stone_Premium)
  "Frentes": 300, // Custo médio para frentes (pode variar entre Madeira/Unicolor/Laca)
  "Caixas": 180, // Custo médio para caixas (geralmente unicolor/MDF branco)
};

