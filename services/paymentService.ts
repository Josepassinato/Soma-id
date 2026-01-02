
import { supabase } from './supabaseClient';
import { CheckoutSession } from '../types';

/**
 * PAYMENT SERVICE (STRICT MODE)
 * 
 * Elimina mocks. Todas as operações financeiras devem passar pelo servidor
 * para validação de segurança e integração com Stripe/GCP Billing.
 */
export const PaymentService = {
  
  /**
   * Cria uma sessão de checkout real via Edge Function.
   */
  createCheckoutSession: async (userId: string, priceId: string = 'price_pro_monthly'): Promise<CheckoutSession> => {
    if (!supabase) {
        throw new Error("Sistema em modo offline. Pagamentos não permitidos.");
    }

    console.log(`💳 [Billing] Iniciando transação para: ${userId}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('billing', {
        body: { 
          action: 'create-checkout', 
          payload: { 
            priceId, 
            userId,
            successUrl: `${window.location.origin}/?payment_status=success`,
            cancelUrl: `${window.location.origin}/?payment_status=cancel`
          } 
        }
      });

      if (error) throw error;
      if (!data?.url) throw new Error("A API de faturamento não retornou uma URL válida.");

      return { 
        sessionId: data.sessionId || `sess_${Date.now()}`, 
        url: data.url 
      };

    } catch (e: any) {
      console.error("🔥 [Billing] Erro fatal na sessão de checkout:", e);
      throw new Error(`Falha no Gateway de Pagamento: ${e.message}`);
    }
  },

  /**
   * Redireciona para o Portal do Cliente do Stripe via Edge Function.
   */
  redirectToCustomerPortal: async () => {
    if (!supabase) return;
    
    try {
        const { data, error } = await supabase.functions.invoke('billing', {
            body: { 
              action: 'create-portal', 
              payload: { returnUrl: window.location.origin } 
            }
        });

        if (error) throw error;
        if (data?.url) {
            window.location.href = data.url;
        }
    } catch (e) {
        console.error("Erro ao acessar portal de faturamento:", e);
        alert("Não foi possível acessar as configurações de faturamento.");
    }
  }
};
