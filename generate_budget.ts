
import {
  MATERIAL_COSTS_PER_M2,
  STYLE_COMPLEXITY_FACTOR,
  SIMPLE_MODULE_COST,
  INTERMEDIATE_MODULE_COST,
  COMPLEX_MODULE_COST,
  ESTIMATED_MODULE_DISTRIBUTION,
  DESIGN_FEE_BASE,
  MANAGEMENT_FEE_BASE,
  PROJECT_MARKUP_PERCENTAGE,
  PROJECT_MARKUP_DESCRIPTION,
  MATERIAL_USAGE_PROPORTIONS,
  CATEGORY_MATERIAL_COSTS_PER_M2
} from './pricing_data';
import { Project, Material, ExtractedInsights } from './types';
import { MOCK_MATERIALS, STYLE_PRESETS, ROOM_TYPES } from './constants';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface BudgetDetailedItem {
  description: string;
  value: number;
  category: "Fabricação" | "Materiais" | "Serviços" | "Markup" | "Total";
}

interface BudgetResult {
  quoteId: string; // Novo: ID único do orçamento
  budgetVersion: string; // Novo: Versão do orçamento
  generatedAt: string; // Novo: Timestamp de geração em UTC
  environment: string;
  summary: string;
  estimatedRange: { min: number; max: number };
  rangeExplanation: string;
  inclusions: string[];
  toBeDefined: string[];
  legalDisclaimer: string;
  detailedItems: BudgetDetailedItem[];
  baseCalculation: string[];
  validityDays: number;
  paymentTerms: string;
  budgetHash?: string;
}

// Função auxiliar para estimar a área total de marcenaria em m²
function estimateTotalJoineryArea(roomType: string, wallWidth: number | undefined, wallHeight: number | undefined): number {
  if (wallWidth && wallHeight) {
    const usableHeight = Math.min(wallHeight / 1000, 2.7);
    const mainWallArea = (wallWidth / 1000) * usableHeight;

    if (roomType === "Cozinha") {
      return mainWallArea * 1.5;
    } else if (roomType === "Closet") {
      return mainWallArea * 1.8;
    }
    return mainWallArea * 1.2;
  }

  switch (roomType) {
    case "Cozinha": return 25; // m²
    case "Quarto": return 15; // m²
    case "Closet": return 20; // m²
    case "Sala": return 10; // m²
    case "Banheiro": return 5; // m²
    case "Escritorio": return 12; // m²
    case "Gourmet": return 20; // m²
    default: return 15; // m²
  }
}

// Função para calcular o custo total de um cenário (básico ou premium)
function calculateScenarioCost(projectInsights: ExtractedInsights, selectedStyleId: string, selectedMaterials: Material[], scenario: "basic" | "premium"): { total: number; items: BudgetDetailedItem[]; baseModulesInfo: string } {
  let currentTotal = 0;
  const currentDetailedItems: BudgetDetailedItem[] = [];

  const roomType = projectInsights.roomType || "Cozinha";
  const styleLabel = STYLE_PRESETS.find(s => s.id === selectedStyleId)?.label || selectedStyleId;
  const styleFactor = STYLE_COMPLEXITY_FACTOR[selectedStyleId] || 1.0;

  // --- CUSTOS DE FABRICAÇÃO E MONTAGEM DE MÓDULOS ---
  let fabricationCost = 0;
  const moduleDistribution = ESTIMATED_MODULE_DISTRIBUTION[roomType] || { simple: 0, intermediate: 0, complex: 0 };
  const totalModules = moduleDistribution.simple + moduleDistribution.intermediate + moduleDistribution.complex;

  const simpleModulesCost = moduleDistribution.simple * SIMPLE_MODULE_COST;
  fabricationCost += simpleModulesCost;
  currentDetailedItems.push({ description: `Módulos Simples (${moduleDistribution.simple}x)`, value: simpleModulesCost, category: "Fabricação" });

  const intermediateModulesCost = moduleDistribution.intermediate * INTERMEDIATE_MODULE_COST;
  fabricationCost += intermediateModulesCost;
  currentDetailedItems.push({ description: `Módulos Intermediários (${moduleDistribution.intermediate}x)`, value: intermediateModulesCost, category: "Fabricação" });

  const complexModulesCost = moduleDistribution.complex * COMPLEX_MODULE_COST;
  fabricationCost += complexModulesCost;
  currentDetailedItems.push({ description: `Módulos Complexos (${moduleDistribution.complex}x)`, value: complexModulesCost, category: "Fabricação" });

  const fabricationStyleAdjustment = fabricationCost * (styleFactor - 1.0);
  fabricationCost += fabricationStyleAdjustment;
  currentDetailedItems.push({ description: `Ajuste de Fabricação por Estilo (${styleLabel} - x${styleFactor})`, value: fabricationStyleAdjustment, category: "Fabricação" });

  currentTotal += fabricationCost;

  // --- CUSTOS DE MATERIAIS ---
  let materialCosts = 0;
  const totalJoineryArea = estimateTotalJoineryArea(roomType, projectInsights.wallWidth, projectInsights.wallHeight);

  const materialProportions = MATERIAL_USAGE_PROPORTIONS[roomType] || [];

  materialProportions.forEach(prop => {
    const estimatedAreaForCategory = totalJoineryArea * prop.proportion;
    let costPerM2 = CATEGORY_MATERIAL_COSTS_PER_M2[prop.materialCategory] || 0;

    let materialName = prop.materialCategory;
    const primaryMaterial = selectedMaterials.find(m => m.category === "Madeira" || m.category === "Unicolor");
    const stoneMaterial = selectedMaterials.find(m => m.category === "Stone");
    const specialMaterial = selectedMaterials.find(m => m.category === "Especial" || m.category === "Vidro" || m.category === "Metal");

    if (prop.materialCategory === "Frentes" && primaryMaterial) {
      materialName = primaryMaterial.name;
      costPerM2 = MATERIAL_COSTS_PER_M2[primaryMaterial.category] || costPerM2;
    } else if (prop.materialCategory === "Caixas" && primaryMaterial) {
      materialName = MOCK_MATERIALS.find(m => m.id === 'mdf_branco')?.name || "MDF Branco";
      costPerM2 = CATEGORY_MATERIAL_COSTS_PER_M2["Caixas"] || 180;
    } else if (prop.materialCategory === "Stone") {
      materialName = (stoneMaterial && scenario === "premium") ? stoneMaterial.name : (stoneMaterial ? stoneMaterial.name + " (Padrão)" : "Stone Padrão");
      costPerM2 = (scenario === "premium") ? MATERIAL_COSTS_PER_M2.Stone_Premium : MATERIAL_COSTS_PER_M2.Stone_Padrao;
    } else if (prop.materialCategory === "Especial" && specialMaterial) {
      materialName = specialMaterial.name;
      costPerM2 = MATERIAL_COSTS_PER_M2[specialMaterial.category] || costPerM2;
    }

    const currentMaterialCost = estimatedAreaForCategory * costPerM2;
    materialCosts += currentMaterialCost;
    currentDetailedItems.push({
      description: `${materialName} (${prop.materialCategory} - ~${estimatedAreaForCategory.toFixed(1)}m² @ R$${costPerM2}/m²)`,
      value: currentMaterialCost,
      category: "Materiais"
    });
  });

  // Ferragens
  const hardwareCost = (scenario === "premium") ? totalModules * MATERIAL_COSTS_PER_M2.Ferragens_Premium : totalModules * MATERIAL_COSTS_PER_M2.Ferragens_Basicas;
  materialCosts += hardwareCost;
  currentDetailedItems.push({ description: `Ferragens (${scenario === "premium" ? "Premium" : "Básicas"} - aprox. ${totalModules} módulos)`, value: hardwareCost, category: "Materiais" });

  // Iluminação
  const estimatedLEDLength = (projectInsights.wallWidth || 4000) / 1000;
  const lightingCost = estimatedLEDLength * MATERIAL_COSTS_PER_M2.Iluminacao_LED;
  materialCosts += lightingCost;
  currentDetailedItems.push({ description: `Iluminação LED integrada (~${estimatedLEDLength.toFixed(1)}m @ R$${MATERIAL_COSTS_PER_M2.Iluminacao_LED}/m)`, value: lightingCost, category: "Materiais" });

  currentTotal += materialCosts;

  // --- SERVIÇOS ---
  let serviceCost = 0;
  serviceCost += DESIGN_FEE_BASE;
  currentDetailedItems.push({ description: "Serviço de Design e Projeto", value: DESIGN_FEE_BASE, category: "Serviços" });

  serviceCost += MANAGEMENT_FEE_BASE;
  currentDetailedItems.push({ description: "Serviço de Gestão e Acompanhamento", value: MANAGEMENT_FEE_BASE, category: "Serviços" });

  currentTotal += serviceCost;

  // --- MARKUP ---
  const markupValue = currentTotal * PROJECT_MARKUP_PERCENTAGE;
  currentTotal += markupValue;
  currentDetailedItems.push({ description: PROJECT_MARKUP_DESCRIPTION, value: markupValue, category: "Markup" });

  return { total: currentTotal, items: currentDetailedItems, baseModulesInfo: `${moduleDistribution.simple} simples, ${moduleDistribution.intermediate} intermediários, ${moduleDistribution.complex} complexos` };
}

// Função para gerar um orçamento estimado (v3 - vendável e defensável)
export async function runSimulation(projectInsights: ExtractedInsights, selectedStyleId: string, selectedMaterials: Material[]): Promise<BudgetResult> {

  const roomType = projectInsights.roomType || "Cozinha";
  const styleLabel = STYLE_PRESETS.find(s => s.id === selectedStyleId)?.label || selectedStyleId;

  // Calcular cenários básico e premium
  const basicScenario = calculateScenarioCost(projectInsights, selectedStyleId, selectedMaterials, "basic");
  const premiumScenario = calculateScenarioCost(projectInsights, selectedStyleId, selectedMaterials, "premium");

  const estimatedRange = {
    min: parseFloat(basicScenario.total.toFixed(2)),
    max: parseFloat(premiumScenario.total.toFixed(2)),
  };

  // Detalhes do orçamento para o valor base (min)
  const detailedItems = basicScenario.items;
  const baseCalculation = [
    `${basicScenario.baseModulesInfo}`,
    `Área total de marcenaria estimada: ${estimateTotalJoineryArea(roomType, projectInsights.wallWidth, projectInsights.wallHeight).toFixed(1)}m²`
  ];

  // Sumário do Escopo
  const materialsList = selectedMaterials.map(m => m.name).join(', ');
  const totalModules = (ESTIMATED_MODULE_DISTRIBUTION[roomType]?.simple || 0) + (ESTIMATED_MODULE_DISTRIBUTION[roomType]?.intermediate || 0) + (ESTIMATED_MODULE_DISTRIBUTION[roomType]?.complex || 0);
  const summary = `Projeto de marcenaria para ${roomType} em estilo "${styleLabel}", com ${totalModules} módulos e utilização de materiais como ${materialsList}.`;

  // Explicação da faixa de preço
  const rangeExplanation = "A faixa de preço varia principalmente pela escolha de ferragens (básicas/premium), tipo e complexidade da pedra (padrão/premium), quantidade e complexidade de módulos especiais (gaveteiros, cantos, torres) e acabamentos personalizados.";

  const budget: BudgetResult = {
    quoteId: `QT-${new Date().getFullYear()}-002`, // Usar o quote_id fixo para este ciclo
    budgetVersion: "v1.0", // Versão inicial
    generatedAt: new Date().toISOString(), // Timestamp atual em UTC
    environment: roomType,
    summary: summary,
    estimatedRange: estimatedRange,
    rangeExplanation: rangeExplanation,
    inclusions: [
      "Render 4K do Projeto (encantamento)",
      "Layout Conceitual (SVG)",
      "Lista de Materiais e Peças (genérica)",
      "Acompanhamento virtual até a aprovação do projeto",
    ],
    toBeDefined: [
      "Medidas exatas após visita técnica e levantamento no local",
      "Seleção final de ferragens e acessórios específicos",
      "Detalhes de acabamentos personalizados e texturas",
      "Cronograma de fabricação e logística de instalação",
    ],
    legalDisclaimer: "Este é um orçamento estimado não executivo para fins de aprovação comercial. O valor final será confirmado após detalhamento técnico, levantamento de medidas no local e seleção final de todos os componentes. Sujeito a ajustes com base em requisitos específicos e condições de mercado.",
    detailedItems: detailedItems,
    baseCalculation: baseCalculation,
    validityDays: 7,
    paymentTerms: "Pagamento em etapas (entrada + marcos do projeto). Detalhes a serem definidos em contrato.",
  };

  // Gerar e salvar budget.json (sem o hash ainda)
  const exportsBaseDir = path.join("exports", budget.quoteId); // Base para exports
  const exportsCommercialDir = path.join(exportsBaseDir, "commercial");
  if (!fs.existsSync(exportsCommercialDir)) {
    fs.mkdirSync(exportsCommercialDir, { recursive: true });
  }
  const budgetJsonPath = path.join(exportsCommercialDir, 'budget.json');

  // Para garantir o hash canônico, removemos o campo budgetHash antes de stringificar para o cálculo
  const budgetToHash = { ...budget };
  delete budgetToHash.budgetHash;

  const budgetJsonContent = JSON.stringify(budgetToHash, null, 2);

  const hash = crypto.createHash('sha256').update(budgetJsonContent).digest('hex');
  budget.budgetHash = hash; // Atribui o hash canônico ao objeto budget para retorno

  // Salvar o JSON (sem o campo budgetHash, para que o sha256sum do arquivo bata com o hash canônico)
  fs.writeFileSync(budgetJsonPath, JSON.stringify(budgetToHash, null, 2));
  console.log(`✅ Orçamento salvo em: ${budgetJsonPath}`);
  console.log(`🔗 Hash SHA256 do Orçamento (canônico): ${hash}`);

  console.log("\n--- ORÇAMENTO ESTIMADO (NÃO EXECUTIVO) ---");
  console.log(`ID do Orçamento: ${budget.quoteId}`);
  console.log(`Versão: ${budget.budgetVersion}`);
  console.log(`Gerado em (UTC): ${budget.generatedAt}`);
  console.log(`Faixa estimada: R$ ${budget.estimatedRange.min.toFixed(2)} a R$ ${budget.estimatedRange.max.toFixed(2)}`);
  console.log(`Explicação da Faixa: ${budget.rangeExplanation}`);
  console.log(`Ambiente: ${budget.environment}`);
  console.log(`Resumo: ${budget.summary}`);
  console.log("\nBase de cálculo:");
  budget.baseCalculation.forEach(item => console.log(`  - ${item}`));

  let currentCategory: string | null = null;
  budget.detailedItems.forEach(item => {
    if (item.category !== currentCategory) {
      console.log(`\n${item.category.toUpperCase()}:`);
      currentCategory = item.category;
    }
    console.log(`  - ${item.description}: R$ ${item.value.toFixed(2)}`);
  });

  console.log("\nIncluído:");
  budget.inclusions.forEach(item => console.log(`  - ${item}`));
  console.log("\nA ser Definido:");
  budget.toBeDefined.forEach(item => console.log(`  - ${item}`));
  console.log("\nCondições de Pagamento:", budget.paymentTerms);
  console.log("Validade do Orçamento:", `${budget.validityDays} dias a partir de ${new Date(budget.generatedAt).toLocaleDateString('pt-BR')}`);
  console.log("\nAviso Legal:", budget.legalDisclaimer);
  console.log(`Hash do Orçamento (SHA256): ${budget.budgetHash}`);
  return budget;
}
