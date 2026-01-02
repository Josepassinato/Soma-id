
import React from 'react';

interface Props {
  onEnter: () => void;
}

const FeatureItem = ({ title, description, icon, isAvailable }: { title: string; description: string; icon: string, isAvailable?: boolean }) => (
  <div className={`group p-12 border border-border transition-all relative overflow-hidden ${!isAvailable ? 'opacity-50 grayscale bg-black/40' : 'bg-white/[0.01] hover:bg-white/[0.03] border-accent/20'}`}>
    {!isAvailable && (
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <span className="text-[10px] font-black font-mono px-3 py-1 border border-white/10 text-gray-600 rounded-full uppercase tracking-widest">
          Roadmap 2025
        </span>
        <span className="text-sm">🔒</span>
      </div>
    )}
    {isAvailable && (
      <div className="absolute top-6 right-6">
        <span className="text-[10px] font-black font-mono px-3 py-1 bg-accent text-white rounded-full uppercase tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.5)] animate-pulse">
          Ativo
        </span>
      </div>
    )}
    
    <div className={`text-5xl mb-10 transition-transform duration-700 ${isAvailable ? 'group-hover:scale-110 group-hover:-rotate-3' : ''}`}>
      {icon}
    </div>
    
    <h4 className={`text-xl font-black uppercase tracking-tighter mb-4 ${isAvailable ? 'text-white' : 'text-gray-600'}`}>
      {title}
    </h4>
    <p className={`text-sm leading-relaxed mb-8 ${isAvailable ? 'text-muted' : 'text-gray-700'}`}>
      {description}
    </p>

    {isAvailable && (
      <div className="pt-8 border-t border-border/50">
        <div className="flex flex-wrap gap-2">
           {['Plantas 2D', 'Renders 4K', 'Contratos', 'Briefing IA'].map(tag => (
             <span key={tag} className="text-[9px] font-mono text-accent/60 border border-accent/20 px-2 py-0.5 rounded uppercase">{tag}</span>
           ))}
        </div>
      </div>
    )}
  </div>
);

export const PublicLandingPage: React.FC<Props> = ({ onEnter }) => {
  return (
    <div className="min-h-screen bg-background text-slate-300 selection:bg-accent selection:text-white font-sans">
      
      {/* Navbar Minimalista */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-8 h-24 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <div className="w-8 h-8 bg-white rounded-lg shadow-[0_0_25px_rgba(255,255,255,0.2)] flex items-center justify-center text-black font-black italic">S</div>
             <span className="font-black text-white tracking-tighter text-xl uppercase italic">SOMA<span className="text-accent">-ID</span></span>
          </div>
          <div className="flex items-center gap-10">
             <button 
                onClick={onEnter}
                className="px-8 py-3 bg-white text-black text-[11px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all rounded-sm shadow-xl"
              >
                Iniciar Operação
              </button>
          </div>
        </div>
      </nav>

      {/* Hero: Foco em Plantas e Projetos */}
      <section className="relative pt-64 pb-48 px-8 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent opacity-50"></div>
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 mb-12 rounded-full border border-accent/20 bg-accent/5">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
             </span>
             <span className="text-accent font-mono text-[10px] font-black uppercase tracking-[0.4em]">SOMA-ID Industrial Engine v2.5</span>
          </div>
          
          <h1 className="text-7xl md:text-9xl font-black text-white leading-[0.85] tracking-tighter mb-14">
            Identidade técnica <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-accent/50">
              SOMA-ID.
            </span>
          </h1>
          
          <div className="flex flex-col md:flex-row gap-16 items-start">
            <div className="flex flex-col gap-6">
                <button
                onClick={onEnter}
                className="px-14 py-8 bg-accent text-white font-black uppercase tracking-[0.3em] text-[13px] hover:bg-white hover:text-black transition-all shadow-[0_25px_60px_rgba(59,130,246,0.3)] group relative overflow-hidden"
                >
                Acessar Dashboard <span className="ml-3 group-hover:translate-x-2 inline-block transition-transform">→</span>
                </button>
                <div className="flex items-center gap-4 px-2">
                    <div className="flex -space-x-3">
                        {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-gray-800"></div>)}
                    </div>
                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">+150 parceiros ativos</p>
                </div>
            </div>
            
            <p className="max-w-lg text-lg text-muted leading-relaxed font-medium pt-2">
              SOMA-ID elimina dias de desenho manual. Converta briefings em **plantas baixas milimétricas e renders 4K** instantaneamente. O padrão ouro da marcenaria industrial.
            </p>
          </div>
        </div>
      </section>

      {/* Grid Binário de Módulos */}
      <section id="features" className="border-y border-border/50 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2">
          <FeatureItem 
            icon="📐"
            title="Módulo 01: Showroom & Projetos"
            description="O cérebro comercial. Gere plantas baixas de visualização rápida , prospectos de imagens fotorrealistas e projetos e plantas profissionais e contratos automatizados. Tudo o que você precisa para o cliente assinar na hora."
            isAvailable={true}
          />
          <FeatureItem 
            icon="🏭"
            title="Módulo 02: Engenharia de Fábrica"
            description="O cérebot industrial SOMA-ID. Detalhamento de peças, furações CNC, nesting de alta performance e integração direta com o chão de fábrica."
            isAvailable={false}
          />
        </div>
      </section>

      <footer className="py-24 border-t border-border bg-[#050505]">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-12 opacity-50">
           <div className="flex flex-col gap-2">
                <p className="text-[11px] font-mono text-gray-400 uppercase tracking-[0.4em]">SOMA-ID Pro v2.5.9</p>
                <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">SOMA-ID OPERATING SYSTEM • 2025</p>
           </div>
           <div className="flex gap-12">
             {['Termos', 'Privacidade', 'Engenharia', 'Documentação'].map(l => (
               <a key={l} href="#" className="text-[10px] font-black text-gray-400 hover:text-accent transition-colors uppercase tracking-[0.2em]">{l}</a>
             ))}
           </div>
        </div>
      </footer>
    </div>
  );
};
