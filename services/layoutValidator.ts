
import { AiLayoutPlan, StandardModuleDefinition } from "../types";
import { CatalogService } from "./catalogService";

/**
 * LAYOUT VALIDATOR & CONSTRAINT SOLVER (HARDENED)
 */
export const LayoutValidator = {
    validateAndFixLayout: (aiLayout: AiLayoutPlan, wallWidth: number): AiLayoutPlan => {
        console.log(`🔍 [Validator] Auditoria técnica v3...`);
        
        const ASSEMBLY_GAP = 10; // 10mm de folga mínima
        
        // 1. Validar existência e dimensões mínimas
        const validModules = aiLayout.mainWall.modules.filter(mod => {
            const definition = CatalogService.getModuleById(mod.moduleId);
            if (!definition) return false;
            if (mod.width < definition.minWidth) mod.width = definition.minWidth;
            return true;
        });

        aiLayout.mainWall.modules = validModules;

        // 2. Cálculo de Overflow
        let currentTotalWidth = aiLayout.mainWall.modules.reduce((sum, mod) => sum + mod.width, 0);
        const limit = wallWidth - ASSEMBLY_GAP;

        if (currentTotalWidth > limit) {
            const excess = currentTotalWidth - limit;
            for (let mod of aiLayout.mainWall.modules) {
                const def = CatalogService.getModuleById(mod.moduleId);
                const canReduce = mod.width - (def?.minWidth || 150);
                if (canReduce > 0) {
                    const reduction = Math.min(excess, canReduce);
                    mod.width -= reduction;
                    currentTotalWidth -= reduction;
                    if (currentTotalWidth <= limit) break;
                }
            }
            if (currentTotalWidth > limit) throw new Error("OVERFLOW_GEOMETRICO: Módulos não cabem na parede.");
        }

        // 3. Injeção Inteligente de Fechamento (Filler)
        const finalGap = wallWidth - currentTotalWidth;
        
        if (finalGap >= 15) { // Mínimo de 15mm para uma régua de MDF ser viável
             // Tenta pegar a altura do último módulo para o filler não ficar gigante
             const lastMod = aiLayout.mainWall.modules[aiLayout.mainWall.modules.length - 1];
             const lastDef = lastMod ? CatalogService.getModuleById(lastMod.moduleId) : null;
             const fillerHeight = lastDef?.defaultHeight || 870;

             // Fix: Added required x, y, z coordinates for the filler module based on current total width
             aiLayout.mainWall.modules.push({
                 moduleId: 'filler_technical',
                 width: finalGap,
                 x: currentTotalWidth,
                 y: 0,
                 z: 0,
                 notes: [`Fechamento automático de ${finalGap}mm para ajuste de montagem. Altura: ${fillerHeight}mm`]
             });
        }

        return aiLayout;
    }
};
