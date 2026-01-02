
import { supabase } from './supabaseClient';
import { CalculationEngine } from './calcEngine';
import { NestingEngine } from './nestingEngine';
import { InterferenceEngine } from './interferenceEngine';
import { BlueprintData, NestingResult, AiLayoutPlan, Project } from '../types';

/**
 * ENGINEERING SERVICE (ENTERPRISE EDITION)
 * 
 * Agora atua como um Proxy para as Edge Functions do Supabase.
 * A inteligência reside no servidor para proteger a PI e garantir consistência.
 */
export const EngineeringService = {
  
  /**
   * Calcula a engenharia e auditoria 3D via Cloud Engine.
   */
  processBlueprint: async (aiLayout: AiLayoutPlan, project: Project): Promise<BlueprintData> => {
    // 1. Tenta execução na Nuvem (Source of Truth)
    if (supabase) {
      try {
        console.log("🛰️ [Engineering] Solicitando cálculo remoto...");
        const { data, error } = await supabase.functions.invoke('engineering-core', {
          body: { 
            action: 'calculateBlueprint', 
            payload: { 
              aiLayout, 
              project,
              constraints: {
                wallW: project.wallWidth,
                wallH: project.wallHeight || 2700,
                wallD: project.wallDepth || 600
              }
            } 
          }
        });

        if (error) throw error;

        if (data?.status === 'success' && data?.data) {
           console.log("✅ [Engineering] Resultado processado com sucesso pelo Cloud Engine.");
           return data.data as BlueprintData; 
        }
      } catch (e) {
        console.warn("⚠️ [Engineering] Falha na Cloud Function. Usando Engine Local como redundância.", e);
      }
    }

    // 2. FALLBACK LOCAL (Redundância para modo offline)
    console.log("🛠️ [Engineering] Executando Engine Local.");
    const blueprint = CalculationEngine.processLayout(aiLayout, project);
    
    // Executa auditoria 3D localmente
    const constraints = {
      wallW: project.wallWidth,
      wallH: project.wallHeight || 2700,
      wallD: project.wallDepth || 600
    };
    const conflicts = InterferenceEngine.auditLayout(blueprint, constraints);
    if (conflicts.length > 0) {
      blueprint.conflicts = conflicts;
      const criticals = conflicts.filter(c => c.severity === 'CRITICAL');
      if (criticals.length > 0) {
          blueprint.factoryNotes.push(...criticals.map(c => `ALERTA LOCAL: ${c.description}`));
      }
    }
    
    return blueprint;
  },

  /**
   * Calcula o Nesting (Otimização de Corte) via Cloud Engine.
   */
  processNesting: async (blueprint: BlueprintData): Promise<NestingResult> => {
    if (supabase) {
      try {
        console.log("🛰️ [Nesting] Solicitando otimização remota...");
        const { data, error } = await supabase.functions.invoke('engineering-core', {
          body: { action: 'calculateNesting', payload: blueprint }
        });

        if (!error && data?.status === 'success' && data?.data) {
           return data.data as NestingResult;
        }
      } catch (e) {
        console.warn("⚠️ [Nesting] Falha remota. Usando otimização local.");
      }
    }

    return NestingEngine.calculateNesting(blueprint);
  }
};
