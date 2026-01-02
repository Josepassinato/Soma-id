
import { MOCK_MATERIALS } from '../constants';
import { Material } from '../types';
import { supabase } from './supabaseClient';

let cachedMaterials: Material[] = [];

/**
 * Service Layer para Materiais.
 * Híbrido: Tenta buscar do Banco, se falhar ou estiver vazio, usa Mocks.
 */
export const MaterialService = {
  initialize: async () => {
    if (cachedMaterials.length > 0) return;

    if (supabase) {
        try {
            const { data, error } = await supabase.from('materials').select('*');
            if (data && data.length > 0) {
                cachedMaterials = data;
                console.log(`✅ ${data.length} materiais carregados do Supabase.`);
                return;
            }
            if (error) console.warn("⚠️ Falha ao buscar materiais do banco:", error.message);
        } catch (e) {
            console.error("Erro no fetch de materiais:", e);
        }
    }
    
    console.warn("⚠️ Usando Catálogo de Materiais Local (Mock). Execute o SQL de Seed.");
    cachedMaterials = MOCK_MATERIALS;
  },

  getAll: (): Material[] => {
    return cachedMaterials.length > 0 ? cachedMaterials : MOCK_MATERIALS;
  },

  getById: (id: string): Material | undefined => {
    return MaterialService.getAll().find(m => m.id === id);
  },

  search: (query: string): Material | undefined => {
    if (!query) return undefined;
    const items = MaterialService.getAll();
    const lowerSearch = query.toLowerCase();
    let match = items.find(m => m.name.toLowerCase() === lowerSearch);
    if (!match) match = items.find(m => m.name.toLowerCase().includes(lowerSearch));
    if (!match) match = items.find(m => lowerSearch.includes(m.color.toLowerCase()));
    return match;
  },

  getCategories: (): string[] => {
    return ['Todos', ...new Set(MaterialService.getAll().map(m => m.category))];
  },
  
  getTextures: (): string[] => {
    return ['Todas', ...new Set(MaterialService.getAll().map(m => m.texture))];
  }
};
