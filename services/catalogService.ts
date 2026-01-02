
import { STANDARD_CATALOG } from '../constants';
import { StandardModuleDefinition } from '../types';
import { supabase } from './supabaseClient';

let cachedModules: StandardModuleDefinition[] = [];

/**
 * Service Layer para Catálogo Técnico.
 * Centraliza a lógica de busca de módulos e especificações de engenharia.
 */
export const CatalogService = {
  initialize: async () => {
    if (cachedModules.length > 0) return;

    if (supabase) {
        try {
            const { data, error } = await supabase.from('modules').select('*');
            if (data && data.length > 0) {
                // Adaptação dos dados do banco para a interface (caso necessário)
                // Assumindo que o JSONB no banco casa com a interface TS
                cachedModules = data as unknown as StandardModuleDefinition[];
                console.log(`✅ ${data.length} módulos carregados do Supabase.`);
                return;
            }
            if (error) console.warn("⚠️ Falha ao buscar módulos do banco:", error.message);
        } catch (e) {
            console.error("Erro no fetch de módulos:", e);
        }
    }

    console.warn("⚠️ Usando Catálogo de Módulos Local. Execute o SQL de Seed.");
    cachedModules = STANDARD_CATALOG;
  },

  getAllModules: (): StandardModuleDefinition[] => {
    return cachedModules.length > 0 ? cachedModules : STANDARD_CATALOG;
  },

  getModuleById: (id: string): StandardModuleDefinition | undefined => {
    return CatalogService.getAllModules().find(m => m.id === id);
  },

  getHardwareList: (): string[] => {
    const hardwareSet = new Set<string>();
    CatalogService.getAllModules().forEach(mod => {
      mod.hardware.forEach(h => hardwareSet.add(h));
    });
    return Array.from(hardwareSet);
  }
};
