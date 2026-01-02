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
      <p className="text-cyan-400 font-mono text-xs mb-1">PASSO {num}</p>
      <h3 className="font-bold text-lg text-white mb-2 uppercase tracking-wider">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed max-w-md">{description}</p>
    </div>
  </div>
);

export const WorkflowPage: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#121212] font-sans text-gray-200 flex flex-col items-center justify-center p-8 animate-fade-in">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-white mb-2">Fluxo de Trabalho Automatizado</h1>
          <p className="text-gray-500 font-mono">Do Vendedor ao Robô da Fábrica em 5 Passos.</p>
        </div>
        
        <div className="space-y-0">
          <StepCard 
            num="01"
            icon="🎙️"
            title="Gravação e Análise"
            description="O vendedor grava a conversa com o cliente. A IA transcreve e extrai os principais requisitos (medidas, estilo, dores) para iniciar o projeto."
          />
          <StepCard 
            num="02"
            icon="✍️"
            title="Validação e Inputs"
            description="O vendedor confirma os dados extraídos pela IA, insere a foto do ambiente e seleciona o material do catálogo (Gêmeo Digital)."
          />
          {/* FIX: Updated model name to reflect actual implementation. */}
          <StepCard 
            num="03"
            icon="🧠"
            title="Engenharia AI"
            description="Os dados são enviados ao Gemini 2.5, que calcula a modulação, a lista de corte e gera o prompt visual para o render."
          />
           <StepCard 
            num="04"
            icon="🖼️"
            title="Render & Salvar"
            description="A imagem fotorrealista (usando o Gêmeo Digital do material) é gerada e salva automaticamente no seu Google Drive."
          />
          <div className="relative flex items-start space-x-6">
             <div className="flex-shrink-0 w-16 h-16 rounded-full bg-green-900/40 border-2 border-green-500 flex items-center justify-center">
                <span className="text-3xl">☁️</span>
              </div>
              <div className="pt-2">
                <p className="text-green-400 font-mono text-xs mb-1">PASSO 05</p>
                <h3 className="font-bold text-lg text-white mb-2 uppercase tracking-wider">Sincronização Final</h3>
                <p className="text-sm text-gray-400 leading-relaxed max-w-md">O link da imagem e os dados técnicos são salvos como uma nova linha no seu Google Sheets, finalizando o processo.</p>
              </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={onBack}
            className="text-cyan-400 text-xs font-mono uppercase tracking-widest hover:text-white transition"
          >
            ← Voltar para o Início
          </button>
        </div>
      </div>
    </div>
  );
};
