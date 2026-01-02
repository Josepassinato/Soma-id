import React from 'react';

interface Props {
  onBack: () => void;
}

const StepCard = ({ num, icon, title, description }: { num: string; icon: string; title: string; description: string }) => (
  <div className="relative flex items-start space-x-6">
    <div className="flex flex-col items-center">
      <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center">
        <span className="text-3xl">{icon}</span>
      </div>
      <div className="w-px h-24 bg-gray-700 mt-2"></div>
    </div>
    <div className="pt-2">
      <p className="text-cyan-400 font-mono text-xs mb-1">FASE {num}</p>
      <h3 className="font-bold text-lg text-white mb-2 uppercase tracking-wider">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed max-w-md">{description}</p>
    </div>
  </div>
);

export const LobbyistGuidePage: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#121212] font-sans text-gray-200 flex flex-col items-center justify-center p-8 animate-fade-in">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-white mb-2">Guia Estratégico para Lobbistas</h1>
          <p className="text-gray-500 font-mono">Usando IA para Transformar Inteligência em Influência.</p>
        </div>
        
        <div className="space-y-0">
          <StepCard 
            num="01"
            icon="🤝"
            title="Coleta de Inteligência"
            description="Grave reuniões com stakeholders, deputados ou especialistas. A IA captura e transcreve a inteligência bruta, garantindo que nenhum insight seja perdido."
          />
          <StepCard 
            num="02"
            icon="🎯"
            title="Análise Estratégica"
            description="A IA analisa a transcrição para extrair os principais argumentos, pontos de oposição, objeções e o sentimento geral. Isso forma a base da sua estratégia."
          />
          <StepCard 
            num="03"
            icon="📝"
            title="Formulação do Dossiê"
            description="Com base na análise, a IA gera um 'Briefing Técnico' que estrutura sua Proposta de Política Pública (PLP), artigo ou emenda de forma lógica e persuasiva."
          />
           <StepCard 
            num="04"
            icon="📊"
            title="Visualização de Impacto"
            description="Transforme dados complexos em 'renders' visuais (infográficos, gráficos de impacto) e 'listas de corte' (pontos-chave da proposta) para apresentar aos tomadores de decisão."
          />
          <div className="relative flex items-start space-x-6">
             <div className="flex-shrink-0 w-16 h-16 rounded-full bg-green-900/40 border-2 border-green-500 flex items-center justify-center">
                <span className="text-3xl">🏛️</span>
              </div>
              <div className="pt-2">
                <p className="text-green-400 font-mono text-xs mb-1">FASE 05</p>
                <h3 className="font-bold text-lg text-white mb-2 uppercase tracking-wider">Arquivamento e Conformidade</h3>
                <p className="text-sm text-gray-400 leading-relaxed max-w-md">Todos os artefatos (gravação, análise, dossiê, visualizações) são salvos no Drive, criando um registro auditável e seguro para fins de conformidade e relatórios."</p>
              </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={onBack}
            className="text-cyan-400 text-xs font-mono uppercase tracking-widest hover:text-white transition"
          >
            ← Voltar ao Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};