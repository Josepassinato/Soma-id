
/**
 * TOKEN SERVICE - ECONOMIA INDUSTRIAL
 * 
 * Cálculo Base:
 * 1. Gemini 3 Flash (Briefing): ~$0.0006/req
 * 2. Gemini 2.5 Image (Render): ~$0.03/img
 * 3. Gemini 3 Pro (Engenharia): ~$0.005/req
 * Custo Total por Projeto: ~$0.04 USD
 * 
 * Markup Aplicado: 15x
 * Preço Alvo por Projeto: $0.60 USD
 * 
 * Definição: 1 Token = $0.001 USD de valor de venda.
 * Custo de 1 Projeto completo = 600 Tokens.
 */

export const TOKEN_COSTS = {
  CONSULTATION: 50,    // Extração de Briefing (Flash)
  RENDER: 250,          // Geração de Imagem AI
  ENGINEERING: 300,     // Cálculo Geométrico e Modulação (Pro)
  LIVE_ASSISTANT: 10,   // Por minuto de conversa Live
};

export const TOKEN_PACKAGES = [
  { 
    id: 'starter',
    price: 50, 
    tokens: 8500, // $50 / $0.0058 por projeto (~14 projetos)
    label: 'Combo Starter',
    popular: false
  },
  { 
    id: 'professional',
    price: 100, 
    tokens: 18000, // Bônus por volume (~30 projetos)
    label: 'Combo Professional',
    popular: true
  },
  { 
    id: 'industrial',
    price: 300, 
    tokens: 60000, // Melhor custo-benefício (~100 projetos)
    label: 'Combo Industrial',
    popular: false
  }
];

import { supabase } from './supabaseClient';

export const TokenService = {
  getBalance: async (userId: string): Promise<number> => {
    if (!supabase) return 1000; // Mock para sandbox
    const { data } = await supabase.from('profiles').select('tokens_balance').eq('id', userId).single();
    return data?.tokens_balance || 0;
  },

  /**
   * Tenta deduzir tokens de uma operação.
   * Retorna true se houver saldo, false caso contrário.
   */
  deductTokens: async (userId: string, amount: number, description: string): Promise<boolean> => {
    if (!supabase) return true;

    try {
      const { data: profile } = await supabase.from('profiles').select('tokens_balance').eq('id', userId).single();
      const currentBalance = profile?.tokens_balance || 0;

      if (currentBalance < amount) return false;

      const { error } = await supabase.from('profiles')
        .update({ tokens_balance: currentBalance - amount })
        .eq('id', userId);

      if (error) throw error;

      // Log de transação
      await supabase.from('token_transactions').insert([{
        user_id: userId,
        amount,
        type: 'DEBIT',
        description
      }]);

      return true;
    } catch (e) {
      console.error("Erro ao processar tokens:", e);
      return false;
    }
  }
};
