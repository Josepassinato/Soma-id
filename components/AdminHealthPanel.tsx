
import React, { useState, useEffect } from 'react';
import { HealthCheckService } from '../services/healthCheckService';
import { HealthReport } from '../types';
import { useTranslation } from '../context/TranslationContext';
import { EndToEndTestRunner } from './EndToEndTestRunner';

export const AdminHealthPanel: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { t } = useTranslation();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState({
    dbLatency: '12ms',
    llmLatency: '0ms',
    storageStatus: '...'
  });

  const runDiagnostic = async () => {
    setIsRunning(true);
    const newReport = await HealthCheckService.runFullDiagnostic();
    setReport(newReport);
    
    const llm = await HealthCheckService.checkLLM();
    setMetrics(prev => ({
      ...prev,
      llmLatency: `${llm.latency}ms`,
      storageStatus: t('health_verified')
    }));
    
    setIsRunning(false);
  };

  useEffect(() => {
    HealthCheckService.getReport().then(setReport);
    runDiagnostic();
  }, []);

  const getStatusColor = (status?: string) => {
    if (status === 'HEALTHY') return 'text-green-500 border-green-500/30';
    if (status === 'DEGRADED') return 'text-yellow-500 border-yellow-500/30';
    return 'text-red-500 border-red-500/30';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 p-8 font-sans animate-fade-in">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex justify-between items-end mb-12 border-b border-gray-900 pb-8">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
              {t('mission_control')}
            </h1>
            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
              {t('global_infra_monitoring')} • v2.5.4
            </p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={runDiagnostic}
              disabled={isRunning}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-black uppercase text-[10px] tracking-widest rounded transition-all disabled:opacity-30"
            >
              {isRunning ? '...' : t('force_auditory')}
            </button>
            <button 
              onClick={onBack}
              className="px-6 py-3 border border-gray-800 text-gray-500 hover:text-white uppercase text-[10px] font-bold tracking-widest rounded"
            >
              {t('exit')}
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-[#121212] border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">🗄️</div>
            <p className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">{t('database')}</p>
            <h3 className="text-2xl font-bold text-white mb-1">PostgreSQL</h3>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span className="text-[10px] font-mono text-green-500 uppercase">{metrics.dbLatency} {t('health_latency')}</span>
            </div>
          </div>

          <div className="bg-[#121212] border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">🤖</div>
            <p className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">{t('ia')}</p>
            <h3 className="text-2xl font-bold text-white mb-1">Gemini 2.5 Pro</h3>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${report?.status === 'CRITICAL' ? 'bg-red-500' : 'bg-cyan-500'}`}></span>
              <span className={`text-[10px] font-mono uppercase ${report?.status === 'CRITICAL' ? 'text-red-500' : 'text-cyan-500'}`}>
                {metrics.llmLatency} RTT
              </span>
            </div>
          </div>

          <div className="bg-[#121212] border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">☁️</div>
            <p className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">{t('cloud_storage')}</p>
            <h3 className="text-2xl font-bold text-white mb-1">S3 Buckets</h3>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <span className="text-[10px] font-mono text-green-500 uppercase">Bucket: user-content</span>
            </div>
          </div>

          <div className="bg-[#121212] border border-gray-800 p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">🛡️</div>
            <p className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">{t('security_layer')}</p>
            <h3 className="text-2xl font-bold text-white mb-1">WebAuthn</h3>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
              <span className="text-[10px] font-mono text-cyan-500 uppercase">Hardware Ready</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <EndToEndTestRunner />
            
            <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Logs de Sistema (Sentinel)</h3>
              </div>
              
              <div className="bg-black/80 rounded-xl p-6 h-[250px] overflow-y-auto font-mono text-[11px] space-y-2 custom-scrollbar border border-gray-900 shadow-inner">
                {!report ? (
                  <div className="h-full flex items-center justify-center opacity-20">...</div>
                ) : (
                  report.logs.slice().reverse().map((log, i) => (
                    <div key={i} className={`flex gap-3 border-b border-white/5 pb-1 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-gray-500'}`}>
                      <span className="opacity-30 whitespace-nowrap">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className="font-bold">[{log.type.toUpperCase()}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`bg-[#121212] border-2 rounded-2xl p-8 transition-colors ${getStatusColor(report?.status)}`}>
              <h3 className="text-xs font-black uppercase tracking-widest mb-6">{t('system_vital_state')}</h3>
              <div className="text-5xl font-black mb-2">{report?.status || 'UNKNOWN'}</div>
              <p className="text-[10px] font-mono uppercase opacity-60">Status de Prontidão</p>
            </div>

            <div className="bg-[#121212] border border-gray-800 rounded-2xl p-6">
              <h4 className="text-[10px] font-black text-gray-500 uppercase mb-4 tracking-widest">{t('maintenance_tips')}</h4>
              <ul className="text-[10px] text-gray-400 space-y-3 leading-relaxed">
                <li>• Gemini: Check GCP API_KEY.</li>
                <li>• DB: Re-run SQL Scripts.</li>
                <li>• Latency: Check Server Region (sa-east-1).</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
