
import React, { useState, useEffect } from 'react';
import { HealthCheckService } from '../services/healthCheckService';

export const DatabaseStatus: React.FC = () => {
  const [status, setStatus] = useState<'LOADING' | 'CONNECTED' | 'LOCAL' | 'DEGRADED' | 'OFFLINE'>('LOADING');

  useEffect(() => {
    const check = async () => {
      const infra = await HealthCheckService.checkInfrastructure();
      if (!infra.connection) setStatus('OFFLINE');
      else if (infra.projectsTable) setStatus('CONNECTED');
      else if (infra.connection) setStatus('LOCAL');
      else setStatus('DEGRADED');
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  const styles = {
    LOADING: { color: 'text-gray-500', label: 'Verificando...', dot: 'bg-gray-500' },
    CONNECTED: { color: 'text-green-500', label: 'Cloud Sync', dot: 'bg-green-500 shadow-[0_0_8px_#22c55e]' },
    LOCAL: { color: 'text-cyan-500', label: 'Local Mode', dot: 'bg-cyan-500 shadow-[0_0_8px_#06b6d4]' },
    DEGRADED: { color: 'text-yellow-500', label: 'Tabelas Ausentes', dot: 'bg-yellow-500 animate-pulse' },
    OFFLINE: { color: 'text-red-500', label: 'Sem Conexão', dot: 'bg-red-500 animate-ping' }
  };

  const current = styles[status];

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-black/40 border border-gray-800 rounded-full">
      <div className={`w-1.5 h-1.5 rounded-full ${current.dot}`}></div>
      <span className={`text-[9px] font-black font-mono uppercase tracking-widest ${current.color}`}>
        {current.label}
      </span>
    </div>
  );
};
