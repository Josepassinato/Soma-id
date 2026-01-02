
import { supabase } from './supabaseClient';
import { UserProfile } from '../types';

export const UserService = {
  getProfile: async (): Promise<UserProfile | null> => {
    if (!supabase) {
      return {
        id: 'dev_user',
        email: 'vendas@marcenariapro.com',
        shopName: 'MARCENARIA DESIGN PREMIUM',
        sellerId: 'SELL-089',
        subscription_tier: 'PRO',
        tokens_balance: 1500,
        // Added missing properties 'sales' and 'industrial' to satisfy ModuleAccess interface requirements
        module_access: { showroom: true, engineering: false, sales: true, industrial: false }
      };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
          console.warn("⚠️ Perfil não encontrado no DB.");
          return null;
      }
      
      return data as UserProfile;
    } catch (e) {
      console.error("Erro ao buscar perfil:", e);
      return null;
    }
  },

  upgradeSubscription: async (userId: string): Promise<boolean> => {
    console.log(`🔄 [Security] Solicitando upgrade para ${userId}.`);
    await new Promise(r => setTimeout(r, 2000));
    return true;
  }
};
