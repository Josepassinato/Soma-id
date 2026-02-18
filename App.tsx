
import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import { ExtractedInsights, ConsultationInput, UserProfile } from './types';
import { ProjectForm } from './components/ProjectForm';
import { ProjectView } from './components/ProjectView';
import { BriefingReview } from './components/BriefingReview';
import { PublicLandingPage } from './components/PublicLandingPage';
import { ConversationRecorder } from './components/ConversationRecorder';
import { analyzeConsultationWithGemini } from './services/geminiService';
import { AdminHealthPanel } from './components/AdminHealthPanel'; 
import { ConfigWarning } from './components/ConfigWarning';
import { AuthPage } from './components/AuthPage';
import { NetworkStatus } from './components/NetworkStatus';
import { SecuritySettings } from './components/SecuritySettings';
import { DatabaseStatus } from './components/DatabaseStatus';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { TokenWallet } from './components/TokenWallet';
import { PricingModal } from './components/PricingModal';

// Contexts
import { NotificationProvider } from './context/NotificationContext';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { TranslationProvider, useTranslation } from './context/TranslationContext';
import { NotificationCenter } from './components/NotificationCenter';
import { useNotification } from './context/NotificationContext';
import { MaterialService } from './services/materialService';
import { CatalogService } from './services/catalogService';
import { UserService } from './services/userService';

const MainContent: React.FC<{ session: Session | null, isGuest?: boolean, onLogout: () => void }> = ({ session, isGuest, onLogout }) => {
  const [view, setView] = useState<'LIST' | 'CONVERSATION' | 'REVIEW' | 'NEW' | 'DETAIL' | 'QA_REPORT'>('LIST'); 
  const [extractedData, setExtractedData] = useState<ExtractedInsights & { transcript?: string } | undefined>(undefined);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const { projects, activeProject, isLoading, loadProjects, selectProject, createProject, processProjectAi, finalizeProject, updateProjectStatus, isPricingOpen, setIsPricingOpen } = useProject();
  const { addNotification } = useNotification();
  const { t } = useTranslation();

  useEffect(() => {
    const initData = async () => {
        const profile = await UserService.getProfile();
        setUserProfile(profile);
        await MaterialService.initialize();
        await CatalogService.initialize();
        loadProjects();
    };
    initData();
  }, [session, isGuest]);

  const handleDepurar = async (input: ConsultationInput) => {
    return await analyzeConsultationWithGemini(input);
  };

  const handleInsightsExtracted = (insights: ExtractedInsights, sourceType: string) => {
    setExtractedData({ ...insights, transcript: `Fonte: ${sourceType}` });
    setView('REVIEW');
  };

  // Handler for creating multiple projects from multi-area briefing
  const handleCreateMultipleProjects = async (projects: ExtractedInsights[]) => {
    addNotification('info', `Criando ${projects.length} projetos...`);
    
    for (let i = 0; i < projects.length; i++) {
      const projectInsights = projects[i];
      try {
        await createProject(
          {
            clientName: projectInsights.clientName,
            roomType: projectInsights.roomType || 'Cozinha',
            wallWidth: projectInsights.wallWidth || 3000,
            styleDescription: projectInsights.styleDescription || '',
          },
          projectInsights
        );
        addNotification('success', `Projeto ${i + 1}/${projects.length} criado: ${projectInsights.roomType}`);
      } catch (error: any) {
        addNotification('error', `Erro ao criar projeto ${projectInsights.roomType}: ${error.message}`);
      }
    }
    
    addNotification('success', `${projects.length} projetos criados com sucesso!`);
    setView('LIST');
  };

  const handleCreateProject = async (data: any) => {
    // Se vier foto do ambiente da análise inicial, garantir que ela seja passada
    const finalData = {
      ...data,
      roomPhotoData: data.roomPhotoData || extractedData?.roomPhotoData
    };
    await createProject(finalData, extractedData);
    setView('DETAIL'); 
    setExtractedData(undefined);
  };

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case 'PRONTO': return 'text-green-500 bg-green-500/10';
      case 'APROVACAO_VISUAL': return 'text-accent bg-accent/10';
      case 'PROCESSANDO': case 'RENDERizando': return 'text-yellow-500 bg-yellow-500/10';
      case 'ERRO': return 'text-red-500 bg-red-500/10';
      default: return 'text-slate-500 bg-slate-500/10';
    }
  };

  if (view === 'QA_REPORT') {
    return <AdminHealthPanel onBack={() => setView('LIST')} />;
  }

  const renderContent = () => {
    if (view === 'CONVERSATION') {
      return <ConversationRecorder 
        onCancel={() => setView('LIST')} 
        onInsightsExtracted={handleInsightsExtracted} 
        onProcess={handleDepurar}
        onCreateMultipleProjects={handleCreateMultipleProjects}
      />;
    }
    if (view === 'REVIEW' && extractedData) {
      return (
        <BriefingReview 
          data={extractedData} 
          onConfirm={() => setView('NEW')} 
          onBack={() => setView('CONVERSATION')}
          onEdit={(field, value) => setExtractedData({ ...extractedData, [field]: value })}
        />
      );
    }
    if (view === 'NEW') {
      return <ProjectForm onSubmit={handleCreateProject} onCancel={() => setView('LIST')} initialData={extractedData} />;
    }
    if (view === 'DETAIL' && activeProject) {
      return (
        <ProjectView 
          project={activeProject} 
          onBack={() => setView('LIST')} 
          onGenerate={processProjectAi} 
          onFinalize={finalizeProject} 
          onStatusChange={updateProjectStatus} 
        />
      );
    }
    
    return (
      <div className="animate-fade-in">
        <ConfigWarning />
        <div className="flex justify-between items-center mb-10 border-b border-border pb-8">
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-tighter">SOMA-ID Dashboard</h2>
            <div className="flex items-center gap-3 mt-1">
               <p className="text-muted text-[10px] font-mono uppercase tracking-[0.2em]">
                  Vendedor: <span className="text-cyan-400 font-black">{userProfile?.sellerId || 'ID-000'}</span>
               </p>
               <span className="text-gray-800">|</span>
               <p className="text-muted text-[10px] font-mono uppercase tracking-[0.2em]">
                  Status: {isGuest ? 'SANDBOX' : 'PRO_ACCESS'}
               </p>
            </div>
          </div>
          <div className="flex gap-4 items-center">
             <TokenWallet onOpenPricing={() => setIsPricingOpen(true)} />
             <button onClick={() => setView('CONVERSATION')} className="bg-white text-black px-6 py-2.5 hover:bg-accent hover:text-white transition-all font-bold uppercase text-[10px] tracking-widest shadow-sm">
               {t('new_attendance')}
             </button>
          </div>
        </div>
        
        {/* Lista de Projetos SOMA-ID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
          {projects.length === 0 && !isLoading ? (
            <div className="col-span-full text-center py-32 bg-background">
              <p className="font-mono text-[10px] text-muted uppercase tracking-[0.2em]">{t('no_projects')}</p>
            </div>
          ) : projects.map(p => (
            <div key={p.id} onClick={() => { selectProject(p.id); setView('DETAIL'); }} className="group bg-background p-8 hover:bg-white/[0.02] transition-all cursor-pointer">
              <div className="flex justify-between items-start mb-6">
                 <div className="flex flex-col">
                    <span className="font-mono text-[9px] text-muted tracking-widest">SOMA-ID</span>
                    <span className="font-mono text-[10px] text-cyan-500 font-black">{p.somaId || `DEV-${p.id.slice(0,4)}`}</span>
                 </div>
                 <span className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-sm ${getStatusColorClass(p.status || 'RASCUNHO')}`}>
                    {(p.status || 'RASCUNHO').replace('_', ' ')}
                </span>
              </div>
              <p className="text-white font-bold text-base mb-1 tracking-tight">{p.clientName}</p>
              <div className="flex justify-between items-end">
                <p className="text-[10px] text-muted uppercase font-bold tracking-widest">{p.roomType}</p>
                <div className="flex items-center gap-2">
                   <span className="text-[8px] text-gray-700 font-mono">SELLER: {p.sellerId || userProfile?.sellerId}</span>
                   <span className="text-accent group-hover:translate-x-2 transition-transform">→</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background font-sans text-slate-300">
      <NetworkStatus />
      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
      {!isGuest && <SecuritySettings isOpen={isSecurityOpen} onClose={() => setIsSecurityOpen(false)} />}
      
      <nav className="glass border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          
          {/* Espaço de Personalização da Loja */}
          <div className="flex items-center gap-6 cursor-pointer" onClick={() => setView('LIST')}>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center text-black font-black text-[10px]">S</div>
              <div className="flex flex-col">
                <span className="text-white font-black text-xs uppercase tracking-tighter leading-none">
                  {userProfile?.shopName || 'SOMA-ID'}
                </span>
                <span className="text-accent text-[8px] font-bold uppercase tracking-[0.2em] leading-none mt-1">
                  INDUSTRIAL OS
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             <LanguageSwitcher />
             <DatabaseStatus />
             <div className="h-4 w-px bg-border"></div>
             <button onClick={onLogout} className="text-[9px] font-bold text-muted hover:text-white uppercase tracking-widest transition-colors">
               {t('logout')}
             </button>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        {renderContent()}
      </main>
      
      <NotificationCenter />
    </div>
  );
};

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showHotPage, setShowHotPage] = useState(true);

  useEffect(() => {
    if (supabase) {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsLoading(false);
            if (session) setShowHotPage(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                setIsGuest(false);
                setShowHotPage(false);
            }
        });
        return () => subscription.unsubscribe();
    } else {
        setIsLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setSession(null);
    setIsGuest(false);
    setShowHotPage(true);
  }

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted font-mono text-[10px] uppercase tracking-widest animate-pulse">Initializing SOMA-ID OS...</div>
  }

  if (!session && !isGuest && showHotPage) {
    return (
        <TranslationProvider>
            <PublicLandingPage onEnter={() => setShowHotPage(false)} />
        </TranslationProvider>
    );
  }

  if (!session && !isGuest && !showHotPage) {
    return (
      <TranslationProvider>
        <AuthPage onGuestAccess={() => setIsGuest(true)} />
      </TranslationProvider>
    );
  }

  return (
    <TranslationProvider>
      <NotificationProvider>
        <ProjectProvider>
          <MainContent session={session} isGuest={isGuest} onLogout={handleLogout} />
        </ProjectProvider>
      </NotificationProvider>
    </TranslationProvider>
  );
}

export default App;
