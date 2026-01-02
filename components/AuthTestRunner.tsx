
import React, { useState } from 'react';
import { PasskeyService } from '../services/passkeyService';
import { supabase } from '../services/supabaseClient';

export const AuthTestRunner: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'PASS' | 'FAIL'>('IDLE');

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    setLogs(prev => [...prev, `${icon} ${msg}`]);
  };

  const runDiagnostics = async () => {
    setLogs([]);
    setStatus('RUNNING');
    addLog("Iniciando Diagnóstico de Segurança...");

    try {
      const diag = await PasskeyService.getDiagnostics();
      
      // 1. Protocolo
      if (diag.isSecure) addLog("Protocolo Seguro (HTTPS/Localhost): OK", 'success');
      else addLog("Protocolo Inseguro detectado.", 'error');

      // 2. Iframe
      if (!diag.isIframe) addLog("Execução fora de Iframe: OK", 'success');
      else addLog("Executando dentro de Iframe (Atenção: Biometria pode ser bloqueada)", 'info');

      // 3. Suporte WebAuthn
      if (diag.hasWebAuthn) addLog("API WebAuthn disponível: OK", 'success');
      else addLog("Navegador não suporta WebAuthn.", 'error');

      // 4. Hardware
      if (diag.platformAuthenticator) addLog("Autenticador de Plataforma (FaceID/TouchID): Detectado", 'success');
      else addLog("Nenhum hardware biométrico detectado ou disponível.", 'info');

      // 5. Sessão Supabase
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) addLog(`Sessão ativa para: ${session.user.email}`, 'success');
        else addLog("Nenhuma sessão de usuário ativa no Supabase.", 'error');
      }

      setStatus(diag.isSecure && diag.hasWebAuthn ? 'PASS' : 'FAIL');
    } catch (e: any) {
      addLog(`Falha no diagnóstico: ${e.message}`, 'error');
      setStatus('FAIL');
    }
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-xl">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h4 className="font-bold text-lg text-white">Segurança & Biometria</h4>
          <p className="text-xs text-gray-500 font-mono">Validação de Hardware e Ambiente</p>
        </div>
        <button
          onClick={runDiagnostics}
          className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-bold uppercase text-xs rounded transition"
        >
          Diagnosticar
        </button>
      </div>
      <div className="bg-black font-mono text-[10px] text-gray-400 p-4 h-48 overflow-y-auto border border-gray-800 rounded">
        {logs.map((log, i) => (
          <p key={i} className={`mb-1 ${log.includes('✅') ? 'text-green-400' : log.includes('❌') ? 'text-red-400' : ''}`}>
            {log}
          </p>
        ))}
        {logs.length === 0 && <p className="italic opacity-30">Aguardando execução...</p>}
      </div>
    </div>
  );
};
