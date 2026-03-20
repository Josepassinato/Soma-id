
import React, { useState, useEffect } from 'react';
import { PasskeyService } from '../services/passkeyService';
import { supabase } from '../services/supabaseClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SecuritySettings: React.FC<Props> = ({ isOpen, onClose }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkStatus();
      setIsInIframe(window.self !== window.top);
    }
  }, [isOpen]);

  const checkStatus = async () => {
    setError(null);
    const supported = await PasskeyService.isSupported();
    setIsSupported(supported);
    
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('biometric_id').eq('id', user.id).single();
        setIsEnrolled(!!data?.biometric_id);
      }
    }
  };

  const handleToggleBiometry = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isEnrolled) {
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        const { error: dbError } = await supabase.from('profiles').update({ biometric_id: null }).eq('id', user?.id);
        if (!dbError) {
          setIsEnrolled(false);
        } else {
          setError("Falha ao comunicar com o servidor de segurança.");
        }
      } else {
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const result = await PasskeyService.register(user.id, user.email!);
          if (result.success) {
            setIsEnrolled(true);
          } else {
            setError(result.error || "Falha ao registrar biometria.");
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-[#1e1e1e] border border-cyan-500/30 w-full max-w-md rounded-xl overflow-hidden shadow-2xl animate-fade-in">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">Segurança Industrial</h2>
            <p className="text-[10px] text-gray-500 font-mono">Hardware Security Module</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>
        
        <div className="p-8 space-y-6">
          {isInIframe && (
            <div className="p-4 bg-orange-900/20 border border-orange-500/50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">⚠️</span>
                <p className="text-xs font-bold text-orange-400 uppercase">Ambiente de Visualização</p>
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed">
                Você está visualizando o app dentro de um painel de visualização (iframe). O navegador bloqueia a biometria por motivos de segurança neste modo.
              </p>
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="mt-3 text-[9px] font-bold text-orange-400 underline hover:text-orange-300"
              >
                ABRIR EM NOVA ABA PARA ATIVAR FACEID
              </button>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-gray-800">
            <div>
              <p className="text-white font-bold text-sm">FaceID / TouchID</p>
              <p className="text-[10px] text-gray-500 uppercase font-mono mt-1">Vincular este dispositivo</p>
            </div>
            {isSupported ? (
              <button 
                onClick={handleToggleBiometry}
                disabled={loading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${isEnrolled ? 'bg-cyan-500' : 'bg-gray-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnrolled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            ) : (
              <div className="text-right">
                <span className="text-[9px] text-red-400 font-mono block">Incompatível</span>
                <span className="text-[8px] text-gray-600 font-mono">Verifique HTTPS</span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/50 rounded text-[10px] text-red-400 font-mono animate-shake">
              <p className="font-bold mb-1">ERRO DE SEGURANÇA:</p>
              {error}
            </div>
          )}

          <div className="bg-cyan-900/10 p-4 rounded border border-cyan-500/20">
            <p className="text-[10px] text-gray-400 leading-relaxed">
              O acesso biométrico usa o chip de segurança do seu dispositivo (Secure Enclave). Suas informações faciais ou digitais nunca saem deste hardware e nunca são enviadas para nossos servidores.
            </p>
          </div>
        </div>

        <div className="p-4 bg-black/50 text-center border-t border-gray-800">
           <button onClick={onClose} className="text-[10px] text-gray-500 font-bold uppercase hover:text-white transition">Fechar e Voltar ao Sistema</button>
        </div>
      </div>
    </div>
  );
};
