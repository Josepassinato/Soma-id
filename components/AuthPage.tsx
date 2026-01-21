
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { PasskeyService } from '../services/passkeyService';
import { useTranslation } from '../context/TranslationContext';

interface AuthPageProps {
  onGuestAccess?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onGuestAccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [biometrySupported, setBiometrySupported] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'info', text: string } | null>(null);

  useEffect(() => {
    PasskeyService.isSupported().then(setBiometrySupported);
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (!supabase) {
        setMessage({ type: 'error', text: t('auth_server_offline') });
        setLoading(false);
        return;
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'success', text: t('auth_signup_requested') });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        if (biometrySupported && data.user) {
            const { data: profile } = await supabase.from('profiles').select('biometric_id').eq('id', data.user.id).single();
            if (!profile?.biometric_id) {
                setMessage({ type: 'info', text: t('auth_login_success_faceid') });
            }
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || t('auth_failed') });
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const result = await PasskeyService.login();
      
      if (result.success) {
        setMessage({ type: 'success', text: `${t('auth_validated')}: ${result.email}. ${t('auth_initializing')}` });
        setTimeout(() => window.location.reload(), 800);
      } else {
        setMessage({ 
          type: 'error', 
          text: result.error || t('auth_biometric_failed')
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0F172A] border border-slate-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
             <div className="w-14 h-14 bg-cyan-500 rounded-lg flex items-center justify-center text-black font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)] text-3xl transform -rotate-3 hover:rotate-0 transition-transform">S</div>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SOMA<span className="text-cyan-400">-ID</span> PRO</h1>
          <p className="text-slate-500 text-[10px] font-mono mt-2 uppercase tracking-[0.2em]">{t('auth_industrial_identity')}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">{t('auth_corporate_id')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-3.5 text-white focus:border-cyan-400 outline-none transition-all font-mono text-sm placeholder-slate-700"
              placeholder="vendas@soma-id.pro"
              data-testid="auth-email-input"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">{t('auth_access_key')}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-3.5 text-white focus:border-cyan-400 outline-none transition-all font-mono text-sm placeholder-slate-700"
              placeholder="••••••••"
              data-testid="auth-password-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-white text-black font-black uppercase tracking-widest text-xs rounded-lg transition-all hover:bg-cyan-400 active:scale-95 disabled:opacity-50 disabled:cursor-wait shadow-lg mt-2"
            data-testid="auth-submit-button"
          >
            {loading ? t('auth_authenticating') : (isSignUp ? t('auth_create_access') : t('auth_enter_system'))}
          </button>
        </form>

        {biometrySupported && !isSignUp && (
          <div className="mt-6">
            <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-slate-800/50"></div>
                <span className="flex-shrink mx-4 text-[8px] text-slate-600 font-bold uppercase tracking-widest">{t('auth_or_instant_access')}</span>
                <div className="flex-grow border-t border-slate-800/50"></div>
            </div>
            
            <button
              onClick={handleBiometricLogin}
              disabled={loading}
              className="w-full py-4 border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 font-bold uppercase tracking-widest text-[10px] rounded-lg flex items-center justify-center gap-3 hover:bg-cyan-500/10 transition-all active:bg-cyan-500/20"
              data-testid="auth-biometric-button"
            >
              <span className="text-lg">🆔</span> {t('auth_biometric_login')}
            </button>
          </div>
        )}

        {message && (
          <div className={`mt-6 p-4 rounded-lg text-[10px] font-mono border leading-relaxed animate-fade-in ${
            message.type === 'error' ? 'bg-red-900/10 border-red-500/30 text-red-400' : 
            message.type === 'info' ? 'bg-cyan-900/10 border-cyan-500/30 text-cyan-400' :
            'bg-green-900/10 border-green-500/30 text-green-400'}`}
            data-testid="auth-message"
          >
            <div className="flex gap-2">
              <span className="font-bold">[{message.type.toUpperCase()}]</span>
              <p>{message.text}</p>
            </div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-slate-800/50 text-center">
            <button
              onClick={onGuestAccess}
              className="w-full py-2 bg-yellow-600/10 border border-yellow-600/30 text-yellow-500 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-yellow-600/20 transition-all"
              data-testid="auth-guest-button"
            >
              ⚡ {t('auth_quick_sandbox')}
            </button>
        </div>
      </div>
      
      <p className="mt-8 text-[9px] text-slate-700 font-mono uppercase tracking-[0.3em]">SOMA-ID • {t('auth_engine_version')}</p>
    </div>
  );
};
