
import React, { useState, useEffect } from 'react';
import { Project, UserProfile, NestingResult } from '../types';
import { EngineeringService } from '../services/engineeringService';
import { UserService } from '../services/userService';
import { useTranslation } from '../context/TranslationContext';
import { Module1Workflow } from './Module1Workflow';
import { PricingModal } from './PricingModal';
import { LiveAssistant } from './LiveAssistant';
import { ProjectPresentation } from './ProjectPresentation';

const getProgressInfo = (status: Project['status'], t: any) => {
  switch (status) {
    case 'PROCESSANDO': return { percent: 45, label: t('status_processing'), color: 'bg-yellow-500' };
    case 'RENDERizando': return { percent: 75, label: t('status_processing'), color: 'bg-accent' };
    case 'PRONTO': return { percent: 100, label: t('status_ready'), color: 'bg-green-500' };
    default: return { percent: 0, label: '', color: 'bg-gray-500' };
  }
};

export const ProjectView: React.FC<{ 
    project: Project; 
    onBack: () => void; 
    onGenerate: (p: Project) => void; 
    onFinalize: (p: Project) => void; 
    onStatusChange: (projectId: string, newStatus: Project['status']) => void; 
}> = ({ project, onBack, onGenerate, onFinalize, onStatusChange }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'SHOWROOM' | 'ENGINEERING'>('SHOWROOM');
  const [showPricing, setShowPricing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const isProcessing = project.status === 'PROCESSANDO' || project.status === 'RENDERizando';
  const progress = getProgressInfo(project.status, t);

  useEffect(() => {
    UserService.getProfile().then(setUserProfile);
  }, [project.id]);

  const handleUpdate = (updates: Partial<Project>) => {
    onGenerate({ ...project, ...updates });
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-fade-in relative text-gray-200">
        <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
        <LiveAssistant project={project} onUpdateProject={handleUpdate} />

        {/* Header do Projeto */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
            <div>
                <div className="flex items-center gap-4 mb-2">
                    <h2 className="text-5xl font-black text-white tracking-tighter uppercase">{project.clientName}</h2>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-accent/10 text-accent text-[9px] font-black uppercase tracking-widest border border-accent/20 rounded-full">
                          Atendimento Ativo
                      </span>
                      <span className="px-3 py-1 bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase tracking-widest border border-purple-500/20 rounded-full flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>
                          IA Trends 2025 Active
                      </span>
                    </div>
                </div>
                <div className="flex items-center gap-5 text-gray-500 font-mono text-[10px] uppercase tracking-widest">
                    <span>{project.roomType}</span>
                    <span className="text-gray-800">/</span>
                    <span className="text-accent/60 font-black">SOMA-ID: {project.somaId || '---'}</span>
                </div>
            </div>
            <div className="flex gap-4">
                <button 
                  onClick={onBack} 
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white text-[11px] font-black uppercase tracking-widest rounded-sm transition border border-white/5"
                >
                  Dashboard
                </button>
            </div>
        </div>

        {/* Status IA */}
        {isProcessing && (
          <div className="mb-12 p-8 bg-black border border-border rounded-sm shadow-2xl overflow-hidden relative">
             <div className="absolute top-0 left-0 h-1 bg-accent animate-pulse w-full"></div>
             <div className="flex justify-between items-end mb-4">
               <div className="flex flex-col">
                  <p className="text-[10px] font-black uppercase text-accent tracking-[0.4em] mb-1">IA_PIPELINE_ACTIVE (2025_MODEL)</p>
                  <p className="text-xs text-muted uppercase font-mono">{progress.label}</p>
               </div>
               <p className="text-4xl font-black text-white font-mono tracking-tighter">{progress.percent}%</p>
             </div>
             <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                <div className={`h-full ${progress.color} transition-all duration-1000 shadow-[0_0_15px_rgba(59,130,246,0.5)]`} style={{ width: `${progress.percent}%` }}></div>
             </div>
          </div>
        )}

        {/* Navegação Binária */}
        <div className="flex gap-12 mb-12 border-b border-border px-4">
          <button 
            onClick={() => setActiveTab('SHOWROOM')} 
            className={`pb-5 text-[12px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'SHOWROOM' ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}
          >
            Showroom & Projetos
            {activeTab === 'SHOWROOM' && <div className="absolute bottom-0 left-0 w-full h-1 bg-accent shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>}
          </button>
          
          <button 
            onClick={() => setActiveTab('ENGINEERING')} 
            className={`pb-5 text-[12px] font-black uppercase tracking-[0.3em] transition-all relative ${activeTab === 'ENGINEERING' ? 'text-white' : 'text-gray-800 hover:text-gray-600'}`}
          >
            Engenharia de Fábrica
            <span className="ml-4 text-[9px] bg-white/5 text-gray-500 px-2 py-0.5 rounded-full border border-border">Roadmap</span>
            {activeTab === 'ENGINEERING' && <div className="absolute bottom-0 left-0 w-full h-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.4)]"></div>}
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-[700px]">
            {activeTab === 'SHOWROOM' ? (
              <Module1Workflow project={project} onUpdate={handleUpdate} />
            ) : (
              <div className="bg-[#080808] border border-border rounded-[2rem] p-24 flex flex-col items-center justify-center text-center animate-fade-in relative overflow-hidden">
                 {/* ... existing Engineering Roadmap UI ... */}
              </div>
            )}
        </div>
    </div>
  );
};
