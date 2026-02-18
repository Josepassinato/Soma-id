
import { DxfService } from './services/dxfService';
import { PartDxfInput } from './types';
import * as fs from 'fs';

const dxfService = new DxfService();

const testParts: PartDxfInput[] = [
  // 1: 300x700 – 0 furos (agora com um DRILL_H para teste)
  { projectId: "PROJ_TEST_001", moduleId: "MOD_TEST_001", partId: "P001", width: 300, height: 700, thicknessMm: 18, material: "MDF_BRANCO", drillingPoints: [], drillHoles: [{ face: "L", x: 0, y: 50, diameter: 5, depthMm: 40 }] },
  // 2: 600x700 – 2 furos (igual ao teste)
  { projectId: "PROJ_TEST_001", moduleId: "MOD_TEST_001", partId: "P002", width: 600, height: 700, thicknessMm: 18, material: "MDF_BRANCO", drillingPoints: [{ x: 50, y: 50, diameter: 5 }, { x: 50, y: 650, diameter: 5 }] },
  // 3: 900x700 – 6 furos (grid)
  { projectId: "PROJ_TEST_001", moduleId: "MOD_TEST_001", partId: "P003", width: 900, height: 700, thicknessMm: 18, material: "MDF_BRANCO", drillingPoints: [{ x: 50, y: 50, diameter: 5 }, { x: 450, y: 50, diameter: 5 }, { x: 850, y: 50, diameter: 5 }, { x: 50, y: 650, diameter: 5 }, { x: 450, y: 650, diameter: 5 }, { x: 850, y: 650, diameter: 5 }] },
  // 4: 600x2200 – 4 furos (painel alto)
  { projectId: "PROJ_TEST_001", moduleId: "MOD_TEST_001", partId: "P004", width: 600, height: 2200, thicknessMm: 18, material: "MDF_BRANCO_FOSCO", drillingPoints: [{ x: 50, y: 50, diameter: 5 }, { x: 550, y: 50, diameter: 5 }, { x: 50, y: 2150, diameter: 5 }, { x: 550, y: 2150, diameter: 5 }] },
  // 5: 100x700 – 2 furos (painel estreito)
  { projectId: "PROJ_TEST_001", moduleId: "MOD_TEST_001", partId: "P005", width: 100, height: 700, thicknessMm: 15, material: "COMPENSADO", drillingPoints: [{ x: 20, y: 50, diameter: 3 }, { x: 80, y: 650, diameter: 3 }] },
  // 6: 600x100 – 2 furos (travessa)
  { projectId: "PROJ_TEST_001", moduleId: "MOD_TEST_001", partId: "P006", width: 600, height: 100, thicknessMm: 18, material: "MDF_PRETO", drillingPoints: [{ x: 50, y: 50, diameter: 5 }, { x: 550, y: 50, diameter: 5 }] },
  // 7: 600x700 – furo perto da borda (x=5, y=5) (stress)
  { projectId: "PROJ_TEST_001", moduleId: "MOD_TEST_001", partId: "P007", width: 600, height: 700, thicknessMm: 18, material: "MDP_CARVALHO", drillingPoints: [{ x: 5, y: 5, diameter: 5 }] },
  // 8: 600x700 – furo “quase fora” (x=599, y=699) (stress)
  { projectId: "PROJ_TEST_001", moduleId: "MOD_TEST_001", partId: "P008", width: 600, height: 700, thicknessMm: 18, material: "MDF_BRANCO", drillingPoints: [{ x: 599, y: 699, diameter: 5 }] },
  // 9: 1200x700 – 0 furos + metadata longa (material com espaços)
  { projectId: "PROJ_TEST_001", moduleId: "MOD_TEST_001", partId: "P009", width: 1200, height: 700, thicknessMm: 25, material: "LAMINADO DE ALTA PRESSAO COM ACABAMENTO TEXTURIZADO", drillingPoints: [] },
  // 10: 600x700 – 20 furos (stress de volume)
  { projectId: "PROJ_TEST_001", moduleId: "MOD_TEST_001", partId: "P010", width: 600, height: 700, thicknessMm: 18, material: "MDF_BRANCO", drillingPoints: Array.from({ length: 20 }, (_, i) => ({ x: (i % 4) * 100 + 50, y: Math.floor(i / 4) * 100 + 50, diameter: 5 })) },
  // 11: 600x700 – Furo horizontal na borda direita (com warning de borda)
  { projectId: "PROJ_TEST_001", moduleId: "MOD_TEST_001", partId: "P011", width: 600, height: 700, thicknessMm: 18, material: "MDF_BRANCO", drillingPoints: [], drillHoles: [{ face: "R", x: 600, y: 5, diameter: 5, depthMm: 40 }] },
  // 12: 600x700 – Furo horizontal com profundidade inválida
  { projectId: "PROJ_TEST_001", moduleId: "MOD_TEST_001", partId: "P012", width: 600, height: 700, thicknessMm: 18, material: "MDF_BRANCO", drillingPoints: [], drillHoles: [{ face: "R", x: 600, y: 350, diameter: 5, depthMm: 700 }] }
];

const outputDir = './exports/PROJECT_TEST_001/MOD_TEST_001';

let allPassed = true;

for (const part of testParts) {
  try {
    const dxfContent = dxfService.generatePartDxf(part);
    const fileName = `${part.projectId}__${part.moduleId}__${part.partId}__A.dxf`;
    fs.writeFileSync(`${outputDir}/${fileName}`, dxfContent);
    console.log(`DXF de teste '${fileName}' gerado com sucesso e passou no lint.`);
    const warnings = dxfService.getWarnings();
    if (warnings.length > 0) {
      console.warn(`Warnings para ${part.partId}:\n  - ${warnings.join('\n  - ')}`);
      allPassed = false; // Considerar warnings como falha para este teste inicial
    }
  } catch (error) {
    console.error(`Erro ao gerar DXF de teste para ${part.partId}:`, error.message);
    allPassed = false;
  }
}

if (allPassed) {
  console.log("Todos os 10 DXFs de teste foram gerados com sucesso e passaram no lint!");
} else {
  console.error("Pelo menos um DXF de teste falhou.");
}
