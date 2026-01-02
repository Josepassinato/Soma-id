
import React, { useEffect, useState } from 'react';
import { HealthCheckService } from '../services/healthCheckService';
import { HealthReport } from '../types';

export const TechnicalGuide: React.FC = () => {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [infra, setInfra] = useState<{ healthTable: boolean; projectsTable: boolean } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const checkAll = async () => {
    try {
        const infraStatus = await HealthCheckService.checkInfrastructure();
        setInfra(infraStatus);
        
        const currentReport = await HealthCheckService.getReport();
        setReport(currentReport);
        
        if (!infraStatus.healthTable) {
            setDbError("Tabela 'system_health' não detectada no Supabase.");
        } else {
            setDbError(null);
        }
    } catch (e) {
        setDbError("Falha crítica de comunicação.");
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAll();
  }, []);

  const handleRunDiagnostic = async () => {
    setIsRunning(true);
    try {
        const newReport = await HealthCheckService.runFullDiagnostic();
        setReport(newReport);
        setDbError(null);
        await checkAll(); // Re-checa infra após rodar
    } catch (e) {
        setDbError("Erro ao tentar salvar diagnóstico no banco.");
    } finally {
        setIsRunning(false);
    }
  };

  const SQL_SCRIPTS = {
    health: `CREATE TABLE IF NOT EXISTS system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_run TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL,
  failed_modules JSONB DEFAULT '[]',
  logs JSONB DEFAULT '[]'
);

ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura para todos" ON system_health FOR SELECT USING (true);
CREATE POLICY "Permitir inserção via App" ON system_health FOR INSERT WITH CHECK (true);`,
    projects: `CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER DEFAULT 1,
  parent_id UUID REFERENCES projects(id),
  client_name TEXT,
  room_type TEXT,
  status TEXT DEFAULT 'RASCUNHO',
  wall_width NUMERIC,
  wall_height NUMERIC,
  wall_depth NUMERIC,
  style_description TEXT,
  material_id TEXT,
  visual_prompt TEXT,
  generated_image_url TEXT,
  transcript_url TEXT,
  insights_ia JSONB DEFAULT '{}',
  technical_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);`
  };

  const getStatusColor = (status: string) => {
    if (status === 'HEALTHY') return 'text-green-400 border-green-500/30 bg-green-900/10';
    if (status === 'DEGRADED') return 'text-yellow-400 border-yellow-500/30 bg-yellow-900/10';
    return 'text-red-400 border-red-500/30 bg-red-900/10';
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center p-20 text-cyan-500 font-mono animate-pulse">
            Sincronizando com Health Server...
        </div>
    );
  }

  const isConfigured = infra?.healthTable && infra?.projectsTable;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in p-4 text-gray-300 pb-20">
      
      {/* Infrastructure Readiness Dashboard */}
      <div className={`p-6 border rounded-xl flex items-center justify-between transition-all duration-700 ${isConfigured ? 'bg-green-900/10 border-green-500/50' : 'bg-red-900/10 border-red-500/50'}`}>
        <div className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-2xl ${isConfigured ? 'bg-green-500 text-black' : 'bg-red-500 text-white animate-pulse'}`}>
                {isConfigured ? '✓' : '!'}
            </div>
            <div>
                <h2 className="text-xl font-bold uppercase tracking-widest">
                    Infraestrutura <span className={isConfigured ? 'text-green-400' : 'text-red-400'}>{isConfigured ? 'CONECTADA' : 'INCOMPLETA'}</span>
                </h2>
                <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${infra?.healthTable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-[10px] font-mono text-gray-400">TABLE: system_health</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${infra?.projectsTable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-[10px] font-mono text-gray-400">TABLE: projects</span>
                    </div>
                </div>
            </div>
        </div>
        {isConfigured && (
            <div className="text-right">
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Enterprise Cloud Sync Active</p>
                <p className="text-[9px] text-gray-500 font-mono mt-1">UUID Gen: DB Side (Standard)</p>
            </div>
        )}
      </div>

      {/* Integrity Sentinel Shield */}
      <div className={`border rounded-xl p-6 transition-all duration-500 shadow-2xl ${report ? getStatusColor(report.status) : 'border-gray-800'}`}>
        <div className="flex justify-between items-start">
          <div className="flex gap-4">
            <div className="text-4xl">
              {report?.status === 'HEALTHY' ? '🛡️' : report?.status === 'CRITICAL' ? '🚨' : '⚠️'}
            </div>
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest flex items-center gap-2">
                Integrity Sentinel <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded">CLOUD MODE</span>
              </h3>
              <p className="text-[10px] font-mono opacity-70">Auditoria Síncrona via Supabase Realtime</p>
              <div className="mt-4 flex gap-6">
                <div>
                  <p className="text-[9px] uppercase font-bold opacity-50">Estado Global</p>
                  <p className={`font-mono font-bold ${report?.status === 'CRITICAL' ? 'animate-pulse' : ''}`}>{report?.status || 'OFFLINE'}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase font-bold opacity-50">Último Scan</p>
                  <p className="font-mono text-xs">
                    {report?.lastRun === 'Nunca' ? 'Pendente' : report?.lastRun === 'Erro de Conexão' ? 'ERRO DB' : new Date(report!.lastRun).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={handleRunDiagnostic}
            disabled={isRunning || !infra?.healthTable}
            className={`px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
              isRunning || !infra?.healthTable ? 'bg-gray-800 text-gray-500' : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
          >
            {isRunning ? 'Escaneando...' : 'Forçar auditoria global'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1e1e1e] border border-cyan-500/30 rounded-xl p-6 shadow-2xl">
          <h3 className="text-xl font-bold text-cyan-400 mb-4 uppercase tracking-widest">Logs Centralizados</h3>
          <div className="bg-black/50 p-4 rounded h-64 overflow-y-auto font-mono text-[10px] space-y-1 custom-scrollbar">
            {!report || report.logs.length === 0 ? (
              <p className="text-gray-600 italic">Aguardando primeiro scan do servidor.</p>
            ) : (
              report.logs.slice().reverse().map((log, i) => (
                <div key={i} className={`flex gap-2 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-gray-500'}`}>
                  <span className="opacity-30 whitespace-nowrap">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span>{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Database Schema Section */}
        <div className="bg-[#1e1e1e] border border-orange-500/30 rounded-xl p-6 shadow-2xl overflow-hidden flex flex-col">
            <h3 className="text-xl font-bold text-orange-400 mb-4 uppercase tracking-widest flex items-center gap-2">
                <span>🗄️</span> Esquema Supabase
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Tabela: system_health</p>
                    <div className={`bg-black/50 p-3 rounded relative group border-l-2 ${infra?.healthTable ? 'border-green-500' : 'border-red-500'}`}>
                        <pre className="text-[9px] text-orange-200/70 font-mono whitespace-pre overflow-x-auto">
                            {SQL_SCRIPTS.health}
                        </pre>
                        {!infra?.healthTable && (
                            <button 
                                onClick={() => navigator.clipboard.writeText(SQL_SCRIPTS.health)}
                                className="absolute top-2 right-2 bg-white/10 px-2 py-1 rounded text-[8px] transition"
                            >
                                COPIAR SQL
                            </button>
                        )}
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Tabela: projects</p>
                    <div className={`bg-black/50 p-3 rounded relative group border-l-2 ${infra?.projectsTable ? 'border-green-500' : 'border-red-500'}`}>
                        <pre className="text-[9px] text-orange-200/70 font-mono whitespace-pre overflow-x-auto">
                            {SQL_SCRIPTS.projects}
                        </pre>
                        {!infra?.projectsTable && (
                            <button 
                                onClick={() => navigator.clipboard.writeText(SQL_SCRIPTS.projects)}
                                className="absolute top-2 right-2 bg-white/10 px-2 py-1 rounded text-[8px] transition"
                            >
                                COPIAR SQL
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
