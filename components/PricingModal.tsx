
import React, { useState } from 'react';
import { PaymentService } from '../services/paymentService';
import { UserService } from '../services/userService';
import { TOKEN_PACKAGES } from '../services/tokenService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PricingModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePurchase = async (packageId: string, price: number) => {
    setProcessing(packageId);
    setError(null);
    
    try {
        const profile = await UserService.getProfile();
        if (!profile) throw new Error("Usuário não identificado.");

        const session = await PaymentService.createCheckoutSession(profile.id, packageId);
        window.location.href = session.url;

    } catch (e: any) {
        console.error(e);
        setError("Falha ao iniciar checkout. Tente novamente.");
        setProcessing(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center animate-fade-in p-4">
      <div className="max-w-5xl w-full">
        
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">
            Abastecimento <span className="text-yellow-500">Industrial</span>
          </h2>
          <p className="text-gray-500 text-sm font-mono uppercase tracking-widest">
            Adquira tokens para processar seus projetos com IA de alta precisão.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {TOKEN_PACKAGES.map((pkg) => (
            <div 
              key={pkg.id} 
              className={`bg-[#121212] border-2 rounded-2xl p-8 flex flex-col relative transition-all hover:-translate-y-2 ${
                pkg.popular ? 'border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.2)]' : 'border-gray-800'
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-black px-4 py-1 rounded-full uppercase">
                  Mais Vendido
                </span>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-1">{pkg.label}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-white">${pkg.price}</span>
                  <span className="text-gray-500 font-mono text-xs">USD</span>
                </div>
              </div>

              <div className="flex-grow space-y-6 mb-12">
                <div className="bg-black/50 p-4 rounded-xl border border-gray-800">
                  <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Carga de Energia</p>
                  <p className="text-3xl font-black text-yellow-500">{pkg.tokens.toLocaleString()}</p>
                  <p className="text-[9px] text-gray-600 font-mono mt-1">TOKENS DE PROCESSAMENTO</p>
                </div>

                <ul className="space-y-3">
                   <li className="flex items-center gap-3 text-xs text-gray-400">
                     <span className="text-yellow-500">⚡</span> Aproximadamente {Math.floor(pkg.tokens / 600)} projetos completos
                   </li>
                   <li className="flex items-center gap-3 text-xs text-gray-400">
                     <span className="text-yellow-500">⚡</span> Suporte à Gemini 3 Pro
                   </li>
                   <li className="flex items-center gap-3 text-xs text-gray-400">
                     <span className="text-yellow-500">⚡</span> Exportação CNC Ilimitada
                   </li>
                </ul>
              </div>

              <button 
                onClick={() => handlePurchase(pkg.id, pkg.price)}
                disabled={!!processing}
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${
                  pkg.popular ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'bg-white text-black hover:bg-gray-200'
                } disabled:opacity-50`}
              >
                {processing === pkg.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    Processando...
                  </>
                ) : 'Comprar Combo'}
              </button>
            </div>
          ))}
        </div>

        {error && (
          <p className="mt-8 text-center text-red-500 text-xs font-mono uppercase">{error}</p>
        )}

        <div className="mt-12 text-center">
          <button onClick={onClose} className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition">
            Voltar ao Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};
