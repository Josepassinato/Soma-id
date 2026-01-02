
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppConfig } from '../config';

// Inicialização segura do cliente usando IIFE com tratamento de erro robusto
export const supabase: SupabaseClient | null = (() => {
  try {
    // Evita execução fora do ambiente do navegador (se houver SSR ou pré-render)
    if (typeof window === 'undefined') return null;

    if (!AppConfig.supabaseUrl || !AppConfig.supabaseAnonKey) {
      console.warn("⚠️ Credenciais Supabase ausentes. App rodará em Modo Offline.");
      return null;
    }

    // Validação de URL para evitar crash no createClient
    try {
        new URL(AppConfig.supabaseUrl);
    } catch (e) {
        console.warn("⚠️ URL do Supabase inválida. App rodará em Modo Offline.");
        return null;
    }
    
    const client = createClient(AppConfig.supabaseUrl, AppConfig.supabaseAnonKey);
    
    console.log("✅ Supabase Client inicializado com sucesso.");
    return client;
  } catch (error) {
    console.error("🔥 Crítico: Falha ao inicializar Supabase client.", error);
    return null;
  }
})();
