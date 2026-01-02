
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Language } from '../types';

const translations = {
  pt: {
    dashboard: "Painel de Controle",
    new_attendance: "+ Novo Atendimento",
    auditory: "⚙️ Auditoria",
    mission_control: "Sentinel Mission Control",
    global_infra_monitoring: "Monitoramento Global de Infraestrutura",
    force_auditory: "Forçar Auditoria Global",
    database: "Banco de Dados",
    ia: "Inteligência Artificial",
    cloud_storage: "Armazenamento em Nuvem",
    security_layer: "Camada de Segurança",
    system_vital_state: "Estado Vital do Sistema",
    maintenance_tips: "Dicas de Manutenção",
    exit: "Sair",
    client: "Cliente",
    room: "Ambiente",
    measures: "Medidas",
    style: "Estilo",
    material: "Material",
    create_project: "Criar Projeto",
    abort: "Abortar",
    status_ready: "Pronto",
    status_processing: "Processando",
    status_error: "Erro",
    projects_found: "Projetos encontrados",
    no_projects: "Nenhum projeto encontrado.",
    setup: "Configuração",
    logout: "Sair",
    health_verified: "Verificado",
    health_latency: "Latência",
    health_tables_ok: "Tabelas do Banco OK",
    health_llm_ok: "Gemini API respondendo",
    health_storage_ok: "Supabase Storage OK",
    // Novas chaves para Form e View
    project_config: "Configuração do Projeto",
    external: "Externo (Frentes)",
    internal: "Interno (Corpo)",
    width: "Largura",
    height: "Altura",
    depth: "Profundidade",
    visual_tab: "Visual & Encantamento",
    eng_tab: "Engenharia",
    ind_tab: "Industrial",
    start_ai: "Iniciar Processamento IA",
    finalize_eng: "Finalizar Engenharia",
    retry: "Tentar Novamente",
    briefing_extracted: "Briefing Extraído",
    voice_assistant: "Assistente de Voz Industrial",
    voice_hint: "Controle as alterações via voz no canto da tela.",
    efficiency: "Eficiência Global",
    sheets: "Chapas Utilizadas",
    total_parts: "Total de Peças",
    download_cnc: "Download DXF para CNC",
    export_cloud: "Exportar Cortecloud",
    briefing_review: "Revisão de Briefing",
    missing_info: "Atenção Necessária",
    confirm_data: "Confirmar Dados",
    technical_briefing: "Resumo da Engenharia",
    suggested_materials: "Sugestão de Materiais",
    analysis_status: "Status da Análise",
    back_dashboard: "Voltar ao Dashboard"
  },
  en: {
    dashboard: "Dashboard",
    new_attendance: "+ New Service",
    auditory: "⚙️ Audit",
    mission_control: "Sentinel Mission Control",
    global_infra_monitoring: "Global Infrastructure Monitoring",
    force_auditory: "Force Global Audit",
    database: "Database",
    ia: "Artificial Intelligence",
    cloud_storage: "Cloud Storage",
    security_layer: "Security Layer",
    system_vital_state: "System Vital State",
    maintenance_tips: "Maintenance Tips",
    exit: "Exit",
    client: "Client",
    room: "Room",
    measures: "Measures",
    style: "Style",
    material: "Material",
    create_project: "Create Project",
    abort: "Abort",
    status_ready: "Ready",
    status_processing: "Processing",
    status_error: "Error",
    projects_found: "Projects found",
    no_projects: "No projects found.",
    setup: "Setup",
    logout: "Logout",
    health_verified: "Verified",
    health_latency: "Latency",
    health_tables_ok: "Database Tables OK",
    health_llm_ok: "Gemini API responding",
    health_storage_ok: "Supabase Storage OK",
    // New keys
    project_config: "Project Setup",
    external: "External (Fronts)",
    internal: "Internal (Body)",
    width: "Width",
    height: "Height",
    depth: "Depth",
    visual_tab: "Visual & Enchantment",
    eng_tab: "Engineering",
    ind_tab: "Industrial",
    start_ai: "Start AI Process",
    finalize_eng: "Finalize Engineering",
    retry: "Retry",
    briefing_extracted: "Extracted Briefing",
    voice_assistant: "Industrial Voice Assistant",
    voice_hint: "Control changes via voice in the screen corner.",
    efficiency: "Global Efficiency",
    sheets: "Sheets Used",
    total_parts: "Total Parts",
    download_cnc: "Download DXF for CNC",
    export_cloud: "Export Cortecloud",
    briefing_review: "Briefing Review",
    missing_info: "Action Required",
    confirm_data: "Confirm Data",
    technical_briefing: "Engineering Summary",
    suggested_materials: "Suggested Materials",
    analysis_status: "Analysis Status",
    back_dashboard: "Back to Dashboard"
  },
  es: {
    dashboard: "Tablero",
    new_attendance: "+ Nueva Atención",
    auditory: "⚙️ Auditoría",
    mission_control: "Sentinel Mission Control",
    global_infra_monitoring: "Monitoreo Global de Infraestructura",
    force_auditory: "Forzar Auditoría Global",
    database: "Base de Datos",
    ia: "Inteligencia Artificial",
    cloud_storage: "Almacenamiento en la Nube",
    security_layer: "Capa de Seguridad",
    system_vital_state: "Estado Vital del Sistema",
    maintenance_tips: "Consejos de Mantenimiento",
    exit: "Salir",
    client: "Cliente",
    room: "Ambiente",
    measures: "Medidas",
    style: "Estilo",
    material: "Material",
    create_project: "Crear Proyecto",
    abort: "Abortar",
    status_ready: "Listo",
    status_processing: "Procesando",
    status_error: "Error",
    projects_found: "Proyectos encontrados",
    no_projects: "No se encontraron proyectos.",
    setup: "Configuração",
    logout: "Salir",
    health_verified: "Verificado",
    health_latency: "Latencia",
    health_tables_ok: "Tablas de Base de Datos OK",
    health_llm_ok: "Gemini API respondiendo",
    health_storage_ok: "Supabase Storage OK",
    // New keys
    project_config: "Configuración del Proyecto",
    external: "Externo (Frentes)",
    internal: "Interno (Cuerpo)",
    width: "Ancho",
    height: "Altura",
    depth: "Profundidad",
    visual_tab: "Visual y Encanto",
    eng_tab: "Ingeniería",
    ind_tab: "Industrial",
    start_ai: "Iniciar Proceso IA",
    finalize_eng: "Finalizar Ingeniería",
    retry: "Reintentar",
    briefing_extracted: "Briefing Extraído",
    voice_assistant: "Asistente de Voz Industrial",
    voice_hint: "Controla los cambios vía voz en la esquina.",
    efficiency: "Eficiencia Global",
    sheets: "Planchas Utilizadas",
    total_parts: "Total de Piezas",
    download_cnc: "Descargar DXF para CNC",
    export_cloud: "Exportar Cortecloud",
    briefing_review: "Revisión de Briefing",
    missing_info: "Acción Requerida",
    confirm_data: "Confirmar Datos",
    technical_briefing: "Resumen de Ingeniería",
    suggested_materials: "Sugerencia de Materiales",
    analysis_status: "Estado del Análisis",
    back_dashboard: "Volver al Tablero"
  }
};

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['pt']) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('marcenaria_lang');
    return (saved as Language) || 'pt';
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('marcenaria_lang', lang);
  };

  const t = (key: keyof typeof translations['pt']): string => {
    return translations[language][key] || translations['pt'][key] || key;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) throw new Error('useTranslation must be used within a TranslationProvider');
  return context;
};
