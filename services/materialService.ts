
import { MOCK_MATERIALS } from '../constants';
import { Material } from '../types';

let cachedMaterials: Material[] = [];

/**
 * Service Layer para Materiais.
 * Fonte primária: MongoDB via backend API.
 * Fallback: dados locais (MOCK_MATERIALS) se o backend estiver indisponível.
 */
export const MaterialService = {
  initialize: async () => {
    if (cachedMaterials.length > 0) return;

    try {
      const res = await fetch('/api/catalog/materials');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data && json.data.length > 0) {
          cachedMaterials = json.data as Material[];
          console.log(`✅ ${cachedMaterials.length} materiais carregados do MongoDB (source: ${json.source}).`);
          return;
        }
      }
      console.warn('⚠️ Backend não retornou materiais. Usando catálogo local.');
    } catch (e) {
      console.warn('⚠️ Backend indisponível para materiais. Usando catálogo local.', e);
    }

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
