
import React, { useState, useEffect } from 'react';
import { TokenService } from '../services/tokenService';
import { useTranslation } from '../context/TranslationContext';
import { supabase } from '../services/supabaseClient';

export const TokenWallet: React.FC<{ onOpenPricing: () => void }> = ({ onOpenPricing }) => {
  const [balance, setBalance] = useState<number>(0);
  const { t } = useTranslation();

  const fetchBalance = async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const b = await TokenService.getBalance(user.id);
      setBalance(b);
    }
  };

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      onClick={onOpenPricing}
      className="flex items-center gap-3 bg-white/[0.03] border border-border px-4 py-2 hover:bg-white/[0.06] cursor-pointer transition-all rounded-sm"
    >
      <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-white leading-none">
          {balance.toLocaleString()} <span className="text-muted font-normal">TOKENS</span>
        </span>
      </div>
    </div>
  );
};
