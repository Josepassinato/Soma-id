import React from 'react';

interface Props {
  onClose: () => void;
}

const TutorialStep = ({ num, icon, title, description, image }: { num: string; icon: string; title: string; description: string; image: string; }) => (
  <div className="bg-gray-900/50 border border-gray-800 p-6 flex flex-col md:flex-row items-start gap-6">
    <div className="flex-shrink-0 flex items-center gap-4">
       <div className="w-12 h-12 bg-gray-800 border border-gray-700 flex items-center justify-center text-3xl">{icon}</div>
       <div>
         <p className="text-cyan-400 font-mono text-xs">ETAPA {num}</p>
         <h3 className="font-bold text-lg text-white uppercase tracking-wider">{title}</h3>
       </div>
    </div>
    <div className="flex-grow">
      <p className="text-sm text-gray-400 leading-relaxed mb-4">{description}</p>
      <div className="bg-black border border-gray-700 p-2">
        <img src={image} alt={`Exemplo da etapa ${title}`} className="w-full h-auto object-contain opacity-75" />
      </div>
    </div>
  </div>
);

export const TutorialPage: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
      <div className="bg-[#181818] border border-cyan-500/30 w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white uppercase tracking-widest">Guia Rápido de Uso</h2>
          <p className="text-gray-500 font-mono text-xs">Siga estes 4 passos para transformar uma conversa em um projeto final.</p>
        </div>
        
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          <TutorialStep
            num="01"
            icon="🎙️"
            title="Inicie o Atendimento"
            description="No Dashboard, clique em '+ Iniciar Atendimento'. Na tela seguinte, clique no botão central para começar a gravar a conversa com seu cliente. A IA irá transcrever tudo em tempo real."
            image="https://i.imgur.com/8Fk2b0k.png"
          />
          <TutorialStep
            num="02"
            icon="🧠"
            title="Análise com IA"
            description="Após a conversa, clique em 'Analisar com IA'. O sistema irá ler a transcrição e extrair automaticamente o nome do cliente, medidas, estilo e um briefing técnico."
            image="https://i.imgur.com/uRjc4g9.png"
          />
          <TutorialStep
            num="03"
            icon="✅"
            title="Valide e Detalhe"
            description="Você será levado ao formulário do projeto, já pré-preenchido. Valide as informações, edite o briefing se necessário, selecione o material no catálogo e anexe uma foto do ambiente."
            image="https://i.imgur.com/V7Yq0x1.png"
          />
           <TutorialStep
            num="04"
            icon="🚀"
            title="Execute a Engenharia"
            description="Na tela de detalhes do projeto, clique em 'Executar AI Engine'. O sistema irá gerar a engenharia, o render fotorrealista e salvar tudo no Google Sheets e Drive."
            image="https://i.imgur.com/I7yG7t8.png"
          />
        </div>
        
        <div className="p-6 border-t border-gray-800 text-center">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-bold uppercase tracking-wider text-sm shadow-[0_0_20px_rgba(0,229,255,0.2)] transition"
          >
            Entendi, vamos começar!
          </button>
        </div>
      </div>
    </div>
  );
};
