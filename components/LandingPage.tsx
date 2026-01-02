
import React from 'react';

interface Props {
  onEnter: () => void;
  onViewWorkflow: () => void;
}

const ModuleShowcase = ({ 
  num, 
  title, 
  subtitle, 
  description, 
  features, 
  colorClass, 
  icon 
}: { 
  num: string; 
  title: string; 
  subtitle: string; 
  description: string; 
  features: string[]; 
  colorClass: string; 
  icon: string;
}) => (
  <div className={`group bg-[#1a1a1a] border border-gray-800 rounded-2xl p-8 transition-all duration-500 hover:border-${colorClass.split('-')[1]}-500/50 hover:shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col h-full relative overflow-hidden`}>
    {/* Background Glow */}
    <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[80px] opacity-10 group-hover:opacity-30 transition-opacity ${colorClass}`}></div>
    
    <div className="relative z-10 flex-grow">
      <div className="flex justify-between items-start mb-6">
        <span className={`text-[10px] font-black font-mono px-3 py-1 rounded-full border border-current ${colorClass.replace('bg-', 'text-')} bg-opacity-10`}>
          MODULO {num}
        </span>
        <span className="text-4xl">{icon}</span>
      </div>
      
      <h3 className="text-2xl font-black text-white mb-2 tracking-tighter uppercase">{title}</h3>
      <p className={`text-[10px] font-mono font-bold uppercase tracking-widest mb-4 ${colorClass.replace('bg-', 'text-')}`}>{subtitle}</p>
      
      <p className="text-gray-400 text-sm leading-relaxed mb-8">
        {description}
      </p>
      
      <ul className="space-y-3">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-3 text-xs text-gray-500 group-hover:text-gray-300 transition-colors">
            <span className={colorClass.replace('bg-', 'text-')}>▹</span> {f}
          </li>
        ))}
      </ul>
    </div>
    
    <div className="mt-10 pt-6 border-t border-gray-800/50">
       <span className="text-[10px] text-gray-600 font-mono uppercase tracking-widest">Tecnologia Core:</span>
       <div className="flex gap-2 mt-2 opacity-40 group-hover:opacity-100 transition-opacity">
          <span className="text-[9px] bg-black px-2 py-1 rounded border border-gray-800 text-gray-400">Gemini 2.5</span>
          <span className="text-[9px] bg-black px-2 py-1 rounded border border-gray-800 text-gray-400">Industrial Cloud</span>
       </div>
    </div>
  </div>
);

export const LandingPage: React.FC<Props> = ({ onEnter, onViewWorkflow }) => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-block px-4 py-1.5 mb-8 rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-400 text-[10px] font-black font-mono uppercase tracking-[0.3em] animate-fade-in">
            Next-Gen Woodworking Engine
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tight leading-none uppercase">
            A Marcenaria <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-green-500">
              Transformada
            </span>
          </h1>
          
          <p className="text-gray-500 max-w-2xl mx-auto text-lg mb-12 font-medium leading-relaxed">
            Elimine 90% do trabalho manual de projeto e engenharia. Três módulos integrados que levam sua ideia da conversa ao chão de fábrica em segundos.
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <button
              onClick={onEnter}
              className="group relative px-12 py-5 bg-white text-black font-black uppercase tracking-widest text-sm rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(255,255,255,0.1)] transition-all hover:scale-105 active:scale-95"
            >
              <span className="relative z-10">Iniciar Sandbox Industrial</span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            </button>
            
            <button
              onClick={onViewWorkflow}
              className="px-8 py-5 border border-gray-800 text-gray-400 font-bold uppercase tracking-widest text-xs rounded-xl hover:bg-white/5 hover:text-white transition-all"
            >
              Documentação de Fluxo
            </button>
          </div>
        </div>

        {/* Decorative Grid */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #333 1px, transparent 0)', backgroundSize: '40px 40px' }}>
        </div>
      </section>

      {/* Modules Grid */}
      <section className="py-20 px-6 bg-[#0d0d0d] border-y border-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-[0.5em] mb-4">Arquitetura do Ecossistema</h2>
            <p className="text-3xl font-bold text-white tracking-tighter">Uma plataforma, três soluções lucrativas.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <ModuleShowcase 
              num="01"
              title="Sales & Vision"
              subtitle="Encantamento Instantâneo"
              description="Capture o briefing via áudio ou foto e deixe a IA gerar o projeto visual imediatamente. Perfeito para fechar vendas no primeiro atendimento."
              icon="🎨"
              colorClass="bg-cyan-500"
              features={[
                "Transcrição Live Assistant",
                "Geração de Renders Fotorrealistas",
                "Gêmeos Digitais de Materiais",
                "Extração Automática de Briefing"
              ]}
            />
            
            <ModuleShowcase 
              num="02"
              title="Engineering Core"
              subtitle="Precisão Matemática"
              description="Transforme imagens em plantas baixas milimétricas. O motor geométrico resolve conflitos e calcula furações automaticamente."
              icon="📐"
              colorClass="bg-purple-500"
              features={[
                "Modulação Automática",
                "Detecção de Conflitos 3D",
                "Mapeamento de Furações CNC",
                "Auditoria Dimensional Real"
              ]}
            />
            
            <ModuleShowcase 
              num="03"
              title="Industrial"
              subtitle="Fábrica Conectada"
              description="Otimize o uso de chapas e gere arquivos para máquinas CNC. Sincronização direta com serviços de corte e ERPs."
              icon="🏭"
              colorClass="bg-green-500"
              features={[
                "Algoritmo de Nesting Otimizado",
                "Exportação DXF (Peças + Furos)",
                "Integração Cortecloud (CSV)",
                "Relatórios de Eficiência de Chapa"
              ]}
            />
          </div>
        </div>
      </section>

      {/* Trust & Cloud Section */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-8 tracking-tighter uppercase">Infraestrutura em Nuvem</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 opacity-40 grayscale">
            <div className="flex flex-col items-center">
               <span className="text-3xl mb-2">☁️</span>
               <span className="text-[10px] font-mono font-bold uppercase">Google Cloud</span>
            </div>
            <div className="flex flex-col items-center">
               <span className="text-3xl mb-2">⚡</span>
               <span className="text-[10px] font-mono font-bold uppercase">Stripe Billing</span>
            </div>
            <div className="flex flex-col items-center">
               <span className="text-3xl mb-2">🔥</span>
               <span className="text-[10px] font-mono font-bold uppercase">Supabase Realtime</span>
            </div>
            <div className="flex flex-col items-center">
               <span className="text-3xl mb-2">🤖</span>
               <span className="text-[10px] font-mono font-bold uppercase">Gemini 2.5 Pro</span>
            </div>
          </div>
          
          <div className="mt-20 p-10 border border-gray-800 rounded-3xl bg-gradient-to-b from-gray-900/50 to-transparent">
             <p className="text-gray-400 text-lg italic mb-6">
               "Nossa visão é que o marceneiro passe 90% do seu tempo criando e 10% produzindo, eliminando o estresse do CAD e das planilhas."
             </p>
             <p className="text-cyan-400 font-bold uppercase text-xs tracking-widest">— Product Vision, MarcenariaAI Pro</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-900 text-center">
        <p className="text-gray-700 text-[10px] font-mono uppercase tracking-[0.4em]">
          MarcenariaAI Pro v2.5 • Industrial Operating System
        </p>
      </footer>
    </div>
  );
};
