
import { supabase } from './supabaseClient';
import { HealthReport } from '../types';
import { LayoutValidator } from './layoutValidator';
import { GoogleGenAI } from "@google/genai";

export const HealthCheckService = {
  
  /**
   * Testa a conectividade com a API da Gemini.
   */
  checkLLM: async (): Promise<{ status: boolean; latency: number; error?: string }> => {
    const start = Date.now();
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // Teste leve usando o modelo flash
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: 'ping',
      });
      return { 
        status: !!response.text, 
        latency: Date.now() - start 
      };
    } catch (e: any) {
      return { status: false, latency: 0, error: e.message };
    }
  },

  /**
   * Verifica se os Buckets de Storage estão acessíveis.
   */
  checkStorage: async (): Promise<{ status: boolean; error?: string }> => {
    if (!supabase) return { status: false, error: 'Supabase não inicializado' };
    try {
      const { data, error } = await supabase.storage.getBucket('user-content');
      if (error) throw error;
      return { status: !!data };
    } catch (e: any) {
      return { status: false, error: e.message };
    }
  },

  checkInfrastructure: async (): Promise<{ healthTable: boolean; projectsTable: boolean; profilesTable: boolean; connection: boolean }> => {
    if (!supabase) return { healthTable: false, projectsTable: false, profilesTable: false, connection: false };
    
    const checkTable = async (name: string) => {
        try {
          const { error } = await supabase.from(name).select('id').limit(1);
          return !error || error.code !== '42P01';
        } catch {
          return false;
        }
    };

    const [health, projects, profiles] = await Promise.all([
        checkTable('system_health'),
        checkTable('projects'),
        checkTable('profiles')
    ]);

    return {
        healthTable: health,
        projectsTable: projects,
        profilesTable: profiles,
        connection: true
    };
  },

  runFullDiagnostic: async (): Promise<HealthReport> => {
    const logs: HealthReport['logs'] = [];
    const failedModules: string[] = [];
    let status: HealthReport['status'] = 'HEALTHY';
    // Fix: Declare 'infra' outside the try block so it is accessible for the database check at the end.
    let infra: { healthTable: boolean; projectsTable: boolean; profilesTable: boolean; connection: boolean } | null = null;

    const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
      logs.push({ timestamp: new Date().toISOString(), message, type });
    };

    addLog('🚀 [SENTINEL] Iniciando Diagnóstico de Sistema...', 'info');

    try {
      // 1. Teste de Banco
      // Fix: Assign to the 'infra' variable declared in the outer scope.
      infra = await HealthCheckService.checkInfrastructure();
      if (!infra.projectsTable || !infra.profilesTable) {
        status = 'DEGRADED';
        failedModules.push('Database_Tables');
        addLog('ERRO: Tabelas de produção ausentes.', 'error');
      } else {
        addLog('Sucesso: Tabelas do Banco OK.', 'success');
      }

      // 2. Teste de LLM (Gemini)
      const llm = await HealthCheckService.checkLLM();
      if (!llm.status) {
        status = 'CRITICAL';
        failedModules.push('LLM_Gemini');
        addLog(`FALHA LLM: ${llm.error}`, 'error');
      } else {
        addLog(`Sucesso: Gemini API respondendo (${llm.latency}ms).`, 'success');
      }

      // 3. Teste de Storage
      const storage = await HealthCheckService.checkStorage();
      if (!storage.status) {
        if (status !== 'CRITICAL') status = 'DEGRADED';
        failedModules.push('Storage_Buckets');
        addLog(`AVISO: Storage inacessível. Uploads de imagem podem falhar.`, 'error');
      } else {
        addLog('Sucesso: Supabase Storage OK.', 'success');
      }

    } catch (e: any) {
      status = 'CRITICAL';
      failedModules.push('System_Exception');
      addLog(`FALHA NO DIAGNÓSTICO: ${e.message}`, 'error');
    }

    const reportData = {
      last_run: new Date().toISOString(),
      status,
      failed_modules: failedModules,
      logs: logs.slice(-50)
    };

    // Fix: Use optional chaining to safely check if 'infra' was successfully assigned.
    if (supabase && infra?.healthTable) {
      await supabase.from('system_health').insert([reportData]);
    }

    return {
        lastRun: reportData.last_run,
        status: reportData.status,
        failedModules: reportData.failed_modules,
        logs: reportData.logs
    };
  },

  getReport: async (): Promise<HealthReport> => {
    if (!supabase) return { lastRun: 'Offline', status: 'HEALTHY', failedModules: [], logs: [] };
    try {
      const { data, error } = await supabase
        .from('system_health')
        .select('*')
        .order('last_run', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data || { lastRun: 'Nunca', status: 'DEGRADED', failedModules: ['No Data'], logs: [] };
    } catch {
      return { lastRun: 'Erro', status: 'CRITICAL', failedModules: ['DB'], logs: [] };
    }
  }
};
