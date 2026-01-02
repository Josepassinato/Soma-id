

import { UserProfile, AppModule, ModuleAccess } from '../types';

/**
 * Módulo de Controle de Acesso Comercial.
 * Define quais funcionalidades estão disponíveis baseado na assinatura.
 */
export const ModuleService = {
  
  /**
   * Retorna as permissões padrão para um usuário free ou inicial.
   * Atualmente liberando SALES para todos no lançamento.
   */
  // Fix: Added sales, industrial, and showroom to default access to match the updated ModuleAccess interface
  getDefaultAccess: (): ModuleAccess => ({
    showroom: true,
    sales: true,       // Módulo 1: Sempre ativo
    engineering: false, // Módulo 2: Requer upgrade
    industrial: false   // Módulo 3: Requer upgrade
  }),

  /**
   * Verifica se um módulo específico está habilitado para o usuário.
   */
  isModuleEnabled: (profile: UserProfile | null, module: AppModule): boolean => {
    if (!profile) return ModuleService.getDefaultAccess()[module.toLowerCase() as keyof ModuleAccess];
    
    const access = profile.module_access || ModuleService.getDefaultAccess();
    
    // Fix: Updated switch to handle SHOWROOM, SALES and INDUSTRIAL cases correctly
    switch (module) {
      case 'SHOWROOM':
      case 'SALES': return access.sales;
      case 'ENGINEERING': return access.engineering || profile.subscription_tier !== 'FREE';
      case 'INDUSTRIAL': return access.industrial || profile.subscription_tier === 'ENTERPRISE';
      default: return false;
    }
  },

  /**
   * Retorna metadados para UI de bloqueio.
   */
  getModuleInfo: (module: AppModule) => {
    // Fix: Updated switch to handle SHOWROOM, SALES and INDUSTRIAL cases correctly
    switch (module) {
      case 'SHOWROOM':
      case 'SALES': return { title: 'Vendas & Visão', icon: '🎨', description: 'IA de Encantamento e Renders' };
      case 'ENGINEERING': return { title: 'Núcleo de Engenharia', icon: '📐', description: 'Plantas Técnicas e Conflitos' };
      case 'INDUSTRIAL': return { title: 'Conexão Industrial', icon: '🏭', description: 'Nesting e Exportação CNC' };
      default: return { title: 'Módulo Desconhecido', icon: '❓', description: 'Funcionalidade não identificada' };
    }
  }
};
