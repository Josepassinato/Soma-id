
import { STANDARD_CATALOG } from '../constants';
import { StandardModuleDefinition } from '../types';

let cachedModules: StandardModuleDefinition[] = [];

/**
 * Service Layer para Catálogo Técnico.
 * Fonte primária: MongoDB via backend API.
 * Fallback: dados locais (STANDARD_CATALOG) se o backend estiver indisponível.
 */
export const CatalogService = {
  initialize: async () => {
    if (cachedModules.length > 0) return;

    try {
      const res = await fetch('/api/catalog/modules');
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && json.data && json.data.length > 0) {
          cachedModules = json.data as StandardModuleDefinition[];
          console.log(`✅ ${cachedModules.length} módulos carregados do MongoDB (source: ${json.source}).`);
          return;
        }
      }
      console.warn('⚠️ Backend não retornou módulos. Usando catálogo local.');
    } catch (e) {
      console.warn('⚠️ Backend indisponível para catálogo. Usando catálogo local.', e);
    }

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
