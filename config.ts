
export const AppConfig = {
  // Flag para ignorar erros de conexão em ambiente de teste/demonstração
  simulationMode: true, 

  // URL do App da Web do Google Apps Script
  googleAppsScriptUrl: "SUA_URL_APPS_SCRIPT_AQUI",

  // ID do Projeto no Google Cloud Platform (GCP)
  gcpProjectId: "SEU_ID_PROJETO_GCP_AQUI",

  // Configuração do Supabase - usa variáveis de ambiente com fallback
  supabaseUrl: (import.meta as any).env?.VITE_SUPABASE_URL || 'https://eruolbsvomarfxuxchjx.supabase.co',
  supabaseAnonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''
};
