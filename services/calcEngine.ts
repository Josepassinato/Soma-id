
import { CatalogService } from "./catalogService";
import { BlueprintData, BlueprintModule, CutListItem, StandardModuleDefinition, AiLayoutPlan, Project, DrillingPoint, DrillingRule, BoundingBox, ComponentDefinition } from "../types";

// Regras de Ouro do Marceneiro (Vindas de 20 anos de chão de fábrica)
const CARPENTRY_RULES = {
  DOOR_GAP: 3,           // Folga de 3mm entre portas e frentes
  SHELF_SETBACK: 20,     // Prateleira interna recuada 20mm para não bater na porta
  BACK_PANEL_RECESSED: 18, // Fundo recuado 18mm para passar fiação e evitar umidade
  STRUCTURAL_RIB_WIDTH: 70, // Largura padrão de travessas (7cm)
  THICKNESS_DEFAULT: 18
};

const evaluateFormula = (formula: string, vars: { W: number, H: number, D: number, T: number, G: number }): number => {
  let expression = formula
    .replace(/\$W/g, vars.W.toString())
    .replace(/\$H/g, vars.H.toString())
    .replace(/\$D/g, vars.D.toString())
    .replace(/\$T/g, vars.T.toString())
    .replace(/\$G/g, vars.G.toString()); // G = Global Gap
    
  const safeExpression = expression.replace(/[^0-9+\-*/().\s]/g, '');
  try {
    return Math.floor(Function('"use strict";return (' + safeExpression + ')')());
  } catch (e) { 
    console.error(`[MasterEngine] Erro na fórmula: ${formula}`, e);
    return 0; 
  }
};

const calculateDrilling = (rules: DrillingRule[] | undefined, vars: { W: number, H: number, D: number, T: number, G: number }): DrillingPoint[] => {
  if (!rules) return [];
  return rules.map(rule => {
    const x = evaluateFormula(rule.xFormula, vars);
    const y = evaluateFormula(rule.yFormula, vars);
    const safeX = Math.max(8, Math.min(x, vars.W - 8));
    const safeY = Math.max(8, Math.min(y, vars.H - 8));
    return {
      x: safeX,
      y: safeY,
      diameter: rule.diameter,
      depth: Math.min(rule.depth, vars.T - 2), 
      type: rule.type
    };
  });
};

const calculateCutList = (moduleDef: StandardModuleDefinition, width: number, height: number, depth: number, thickness: number, frontMaterial: string, bodyMaterial: string): CutListItem[] => {
  const vars = { W: width, H: height, D: depth, T: thickness, G: CARPENTRY_RULES.DOOR_GAP };
  
  const cutList: CutListItem[] = [];

  // 1. Processar componentes definidos no catálogo
  moduleDef.components.forEach(comp => {
    let w = evaluateFormula(comp.widthFormula, vars);
    let h = evaluateFormula(comp.heightFormula, vars);
    
    // Regra de Especialista: Prateleiras internas precisam de recuo (Setback)
    if (comp.name.toLowerCase().includes('prateleira')) {
        w = w - CARPENTRY_RULES.SHELF_SETBACK;
    }

    let mat = comp.materialInfo === 'frente' ? frontMaterial : bodyMaterial;
    const itemVars = { W: w, H: h, D: depth, T: thickness, G: vars.G };
    
    cutList.push({
      piece: comp.name,
      quantity: comp.quantity,
      measures: `${h} x ${w}`,
      material: mat,
      edgeBand: comp.edgeBand,
      grainDirection: comp.grainDirection,
      rawWidth: w,
      rawHeight: h,
      drillingPoints: calculateDrilling(comp.drillingRules, itemVars)
    });
  });

  // 2. Injeção Automática de Peças Estruturais (Knowledge Injection)
  if (!cutList.some(p => p.piece.toLowerCase().includes('fundo'))) {
      const fw = width - (2 * thickness) + 12; // 6mm de encaixe em cada lateral
      const fh = height - (2 * thickness) + 12;
      cutList.push({
          piece: "Fundo Estrutural (Encaixado)",
          quantity: 1,
          measures: `${fh} x ${fw}`,
          material: "MDF 6mm Branco",
          edgeBand: "none",
          grainDirection: "none",
          rawWidth: fw,
          rawHeight: fh
      });
  }

  if (width > 800 && moduleDef.category === 'base') {
      const tw = CARPENTRY_RULES.STRUCTURAL_RIB_WIDTH;
      const th = width - (2 * thickness);
      cutList.push({
          piece: "Travessa Reforço Central",
          quantity: 1,
          measures: `${tw} x ${th}`,
          material: bodyMaterial,
          edgeBand: "1L",
          grainDirection: "horizontal",
          rawWidth: th,
          rawHeight: tw
      });
  }

  return cutList;
};

export const CalculationEngine = {
  processLayout: (aiLayout: AiLayoutPlan, project: Project): BlueprintData => {
    const thickness = CARPENTRY_RULES.THICKNESS_DEFAULT;
    const frontMaterial = project.materialPalette?.[0]?.name || "Material Externo";
    const bodyMaterial = project.materialPalette?.[1]?.name || "Branco TX";
    
    const hardwareMap = new Set<string>();

    const mainWallModules: BlueprintModule[] = aiLayout.mainWall.modules.map((aiMod, index) => {
      let moduleDef = CatalogService.getModuleById(aiMod.moduleId);
      
      if (!moduleDef) throw new Error(`ENGINE_ERROR: Módulo '${aiMod.moduleId}' inválido.`);

      const height = moduleDef.defaultHeight;
      const depth = moduleDef.defaultDepth;
      const position = { x: aiMod.x, y: aiMod.y, z: aiMod.z };

      // Injeção de Hardware baseado no tipo de instalação (CTO Requirement)
      if (moduleDef.category === 'base') {
          if (project.installationType === 'SUSPENSO') {
              hardwareMap.add("Suporte de Parede Reforçado (80kg/par)");
          } else {
              hardwareMap.add("Pés Reguláveis 100mm");
          }
      }
      
      moduleDef.hardware.forEach(h => hardwareMap.add(h));

      return {
        id: `m_${index}_${moduleDef.id}`,
        moduleId: moduleDef.id,
        name: `${moduleDef.name} [${aiMod.width}mm]`,
        type: moduleDef.category,
        width: aiMod.width,
        height, depth,
        position,
        boundingBox: { 
          min: { ...position }, 
          max: { x: position.x + aiMod.width, y: position.y + height, z: position.z + depth } 
        },
        notes: [
            ...aiMod.notes,
            `Instalação: ${project.installationType}`,
            `Folga de montagem aplicada: ${CARPENTRY_RULES.DOOR_GAP}mm`,
            `Recuo de fundo industrial: ${CARPENTRY_RULES.BACK_PANEL_RECESSED}mm`
        ],
        cutList: calculateCutList(moduleDef, aiMod.width, height, depth, thickness, frontMaterial, bodyMaterial)
      };
    });

    const totalOccupiedWidth = mainWallModules.reduce((max, m) => Math.max(max, m.position.x + m.width), 0);

    return {
      layout: aiLayout.layoutType || "Linear",
      materials: { mdfColor: frontMaterial, internalColor: bodyMaterial, thickness },
      mainWall: { totalWidth: totalOccupiedWidth, modules: mainWallModules },
      hardwareMap: Array.from(hardwareMap),
      factoryNotes: [
          ...aiLayout.factoryNotes,
          `PADRÃO INDUSTRIAL SOMA-ID: Instalação ${project.installationType}`,
          "Travessas de 70mm, Folgas de 3mm, Fundos de 6mm recuados.",
          `Total de módulos processados: ${mainWallModules.length}`
      ]
    };
  }
};
