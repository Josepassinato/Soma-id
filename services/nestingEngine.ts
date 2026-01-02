
import { BlueprintData, NestingResult, Sheet, PlacedItem, CutListItem, GrainDirection } from "../types";

const SHEET_WIDTH = 2750;
const SHEET_HEIGHT = 1830;
const SAW_BLADE = 4;
const TRIM = 10;

export const NestingEngine = {
  calculateNesting: (blueprint: BlueprintData): NestingResult => {
    let allParts: any[] = [];
    
    // 1. Coletar e Validar Dimensões de cada peça
    const modules = [...blueprint.mainWall.modules, ...(blueprint.sideWall?.modules || [])];
    modules.forEach(mod => {
      mod.cutList.forEach((item: CutListItem) => {
        // VALIDAÇÃO CRÍTICA: Se a peça não cabe na chapa, o projeto é inválido.
        const isTooBig = (item.rawWidth > (SHEET_WIDTH - 2*TRIM) || item.rawHeight > (SHEET_HEIGHT - 2*TRIM)) && 
                         (item.rawHeight > (SHEET_WIDTH - 2*TRIM) || item.rawWidth > (SHEET_HEIGHT - 2*TRIM));
        
        if (isTooBig) {
            throw new Error(`IMPOSSIBLE_CUT: A peça '${item.piece}' do módulo '${mod.name}' (${item.rawHeight}x${item.rawWidth}mm) excede o tamanho da chapa comercial.`);
        }

        for (let i = 0; i < item.quantity; i++) {
          allParts.push({
            w: item.rawWidth,
            h: item.rawHeight,
            name: item.piece,
            module: mod.name,
            grainDirection: item.grainDirection,
            drillingPoints: item.drillingPoints
          });
        }
      });
    });

    // 2. Sorting para algoritimo de Shelf-Packing (Best Fit Height)
    allParts.sort((a, b) => b.h - a.h);

    const sheets: Sheet[] = [];
    let currentSheetId = 1;
    const usefulWidth = SHEET_WIDTH - (2 * TRIM);
    const usefulHeight = SHEET_HEIGHT - (2 * TRIM);
    let remainingParts = [...allParts];

    while (remainingParts.length > 0) {
      const sheet: Sheet = { id: currentSheetId++, width: SHEET_WIDTH, height: SHEET_HEIGHT, material: "MDF 18mm", items: [], waste: 0 };
      let cx = TRIM, cy = TRIM, rowH = 0;
      const nextRemaining: any[] = [];

      for (const part of remainingParts) {
        let fit = false;
        
        // Tenta encaixar na orientação padrão (respeitando grão se houver)
        if (cx + part.w <= usefulWidth + TRIM && cy + part.h <= usefulHeight + TRIM) {
          sheet.items.push({ 
            x: cx, y: cy, width: part.w, height: part.h, rotated: false, 
            partName: part.name, moduleName: part.module, 
            grainDirection: part.grainDirection, drillingPoints: part.drillingPoints 
          });
          cx += part.w + SAW_BLADE;
          rowH = Math.max(rowH, part.h);
          fit = true;
        } 
        // Rotação permitida APENAS se grainDirection for 'none' ou se for necessário e permitido
        else if (part.grainDirection === 'none' && cx + part.h <= usefulWidth + TRIM && cy + part.w <= usefulHeight + TRIM) {
             sheet.items.push({ 
               x: cx, y: cy, width: part.h, height: part.w, rotated: true, 
               partName: part.name, moduleName: part.module, 
               grainDirection: part.grainDirection, drillingPoints: part.drillingPoints 
             });
             cx += part.h + SAW_BLADE;
             rowH = Math.max(rowH, part.w);
             fit = true;
        }

        if (!fit) {
            // Tenta nova linha na mesma chapa
            cx = TRIM;
            cy += rowH + SAW_BLADE;
            rowH = 0;
            
            if (cy + part.h <= usefulHeight + TRIM && cx + part.w <= usefulWidth + TRIM) {
                sheet.items.push({ 
                  x: cx, y: cy, width: part.w, height: part.h, rotated: false, 
                  partName: part.name, moduleName: part.module, 
                  grainDirection: part.grainDirection, drillingPoints: part.drillingPoints 
                });
                cx += part.w + SAW_BLADE;
                rowH = Math.max(rowH, part.h);
            } else {
                nextRemaining.push(part);
            }
        }
      }
      const usedArea = sheet.items.reduce((acc, item) => acc + (item.width * item.height), 0);
      sheet.waste = 1 - (usedArea / (SHEET_WIDTH * SHEET_HEIGHT));
      sheets.push(sheet);
      remainingParts = nextRemaining;
    }

    // Fix: Calculate total linear edge band (approx perimeter sum) and estimated time.
    const totalLinearEdgeBand = allParts.reduce((acc, part) => acc + (2 * (part.w + part.h)) / 1000, 0);
    const estimatedMachineTime = allParts.length * 1.5 + sheets.length * 3;

    return { 
      sheets, 
      totalSheets: sheets.length, 
      totalParts: allParts.length, 
      globalEfficiency: (sheets.reduce((acc, s) => acc + s.items.reduce((a, i) => a + (i.width * i.height), 0), 0) / (sheets.length * SHEET_WIDTH * SHEET_HEIGHT)) * 100,
      totalLinearEdgeBand,
      estimatedMachineTime
    };
  }
};
