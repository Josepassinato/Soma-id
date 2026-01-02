import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, BlueprintData, ExtractedInsights, RenderItem } from '../types';
import { projectService } from '../services/projectService'; // Apenas para tipos se necessário, mas mutations usam hooks
import { generateEnchantmentPrompt, generateEnchantmentImage, generateTechnicalData } from '../services/geminiService';
import { saveTranscriptToDrive, syncProjectToSheets } from '../services/sheetsService';
import { useNotification } from './NotificationContext';
import { UserService } from '../services/userService';
import { StorageService } from '../services/storageService';
import { useProjects, useCreateProject, useUpdateProject, useCreateVersion } from '../hooks/useProjectQueries';

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | undefined;
  isLoading: boolean;
  isPro: boolean; 
  upgradeToPro: () => Promise<void>; 
  loadProjects: () => Promise<void>;
  selectProject: (id: string) => void;
  createProject: (data: Partial<Project>, extractedData?: ExtractedInsights & { transcript?: string }) => Promise<void>;
  updateProjectStatus: (projectId: string, newStatus: Project['status']) => Promise<void>;
  processProjectAi: (project: Project) => Promise<void>;
  finalizeProject: (project: Project) => Promise<void>;
  createNewVersion: (project: Project) => Promise<void>;
  generateExtraRender: (project: Project, angleName: string) => Promise<void>;
  checkSubscriptionStatus: () => Promise<void>; 
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);

  // --- REACT QUERY HOOKS ---
  const { data: projects = [], isLoading, refetch } = useProjects();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const createVersionMutation = useCreateVersion();

  const { addNotification } = useNotification();

  useEffect(() => {
      checkSubscriptionStatus();
      
      // Checa retorno do Stripe via URL
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('payment_status') === 'success') {
          // Limpa URL
          window.history.replaceState({}, document.title, window.location.pathname);
          // Força upgrade local (MOCK: Em prod, isso já estaria no banco via Webhook)
          upgradeToPro();
      }
  }, []);

  const checkSubscriptionStatus = async () => {
      const profile = await UserService.getProfile();
      if (profile && (profile.subscription_tier === 'PRO' || profile.subscription_tier === 'ENTERPRISE')) {
          setIsPro(true);
      } else {
          setIsPro(false);
      }
  };

  const upgradeToPro = async () => {
      const profile = await UserService.getProfile();
      if (!profile) {
          addNotification('error', 'Erro ao identificar usuário para upgrade.');
          return;
      }
      // Aqui, em produção, nós apenas recarregaríamos o perfil, pois o webhook já teria atualizado.
      // Como estamos em mock, forçamos o update.
      const success = await UserService.upgradeSubscription(profile.id);
      if (success) {
          setIsPro(true);
          addNotification('success', 'Pagamento confirmado! Assinatura PRO ativada.');
      } else {
          addNotification('error', 'Falha ao processar assinatura.');
      }
  };

  // Mantido para compatibilidade, mas agora apenas dispara refetch do Query
  const loadProjects = async () => {
    await refetch();
  };

  const selectProject = (id: string) => setSelectedProjectId(id);

  const activeProject = projects.find(p => p.id === selectedProjectId);

  const createProject = async (data: Partial<Project>, extractedData?: ExtractedInsights & { transcript?: string }) => {
    addNotification('info', 'Criando projeto e processando uploads...');
    try {
      // STORAGE: Verifica se há foto de ambiente em Base64 e faz upload
      let roomPhotoUrl = data.roomPhotoData;
      if (data.roomPhotoData && data.roomPhotoData.startsWith('data:')) {
          roomPhotoUrl = await StorageService.uploadBase64Image(data.roomPhotoData, 'rooms');
      }

      const newProjectData: Partial<Project> = {
        ...data,
        clientName: data.clientName || 'CLIENT_UNKNOWN',
        roomType: data.roomType || 'Cozinha',
        status: 'RASCUNHO',
        wallWidth: data.wallWidth || 3000,
        transcricao: extractedData?.transcript,
        insightsIA: data.insightsIA || extractedData,
        roomPhotoData: roomPhotoUrl, // URL limpa
        isSynced: false,
      };

      const createdProject = await createProjectMutation.mutateAsync(newProjectData);
      
      setSelectedProjectId(createdProject.id);
      addNotification('success', 'Projeto criado com sucesso!');
      
      // Auto-start AI Process
      processProjectAi(createdProject);
    } catch (error: any) {
      console.error(error);
      addNotification('error', `Erro ao criar projeto: ${error.message}`);
    }
  };

  const createNewVersion = async (project: Project) => {
      try {
          const newVersion = await createVersionMutation.mutateAsync(project);
          setSelectedProjectId(newVersion.id);
          addNotification('success', `Versão V${newVersion.version} criada com sucesso!`);
      } catch (e: any) {
          addNotification('error', `Erro ao versionar: ${e.message}`);
      }
  }

  const updateProjectStatus = async (projectId: string, newStatus: Project['status']) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      const updated = { ...project, status: newStatus };
      // O hook useUpdateProject cuida do update otimista na UI
      updateProjectMutation.mutate(updated);
    }
  };

  const processProjectAi = async (project: Project) => {
    // Estado inicial: Processando
    let updatedProject = { ...project, status: 'PROCESSANDO' as Project['status'] };
    // Update assíncrono para garantir que UI atualize antes de prosseguir
    await updateProjectMutation.mutateAsync(updatedProject); 
    
    addNotification('info', 'Iniciando processamento de IA...');
    
    try {
      // 1. Prompt de Encantamento
      const enchantmentPrompt = await generateEnchantmentPrompt(updatedProject, "Frontal View (Standard)");
      updatedProject = { ...updatedProject, visualPrompt: enchantmentPrompt, status: 'RENDERizando' };
      // Update otimista
      updateProjectMutation.mutate(updatedProject);

      // 2. Geração de Imagem Principal
      if (updatedProject.visualPrompt && updatedProject.materialPhotoData) {
        const base64Image = await generateEnchantmentImage(updatedProject.visualPrompt, updatedProject.materialPhotoData);
        // STORAGE: Upload imediato
        const imageUrl = await StorageService.uploadBase64Image(base64Image, 'renders');
        updatedProject = { ...updatedProject, generatedImageUrl: imageUrl };
      }
      
      updatedProject = { ...updatedProject, status: 'APROVACAO_VISUAL' };
      await updateProjectMutation.mutateAsync(updatedProject);
      
      addNotification('success', 'Renderização concluída! Aguardando aprovação.');

    } catch (e: any) {
      console.error(e);
      const errorMessage = e.message;
      const errorProject = { ...project, status: 'ERRO' as Project['status'], errorMessage };
      updateProjectMutation.mutate(errorProject);
      addNotification('error', `Falha no processamento: ${errorMessage}`);
    }
  };

  const generateExtraRender = async (project: Project, angleName: string) => {
    addNotification('info', `Gerando vista: ${angleName}...`);
    try {
        const prompt = await generateEnchantmentPrompt(project, angleName);
        if (!project.materialPhotoData) throw new Error("Material não definido.");
        
        const base64Image = await generateEnchantmentImage(prompt, project.materialPhotoData);
        const imageUrl = await StorageService.uploadBase64Image(base64Image, 'renders');
        
        const newRender: RenderItem = {
            id: Date.now().toString(),
            name: angleName,
            url: imageUrl,
            promptUsed: prompt,
            createdAt: new Date().toISOString()
        };

        const updatedProject = {
            ...project,
            renders: [...(project.renders || []), newRender]
        };

        await updateProjectMutation.mutateAsync(updatedProject);
        addNotification('success', `Vista ${angleName} gerada!`);

    } catch(e: any) {
        addNotification('error', `Erro ao gerar vista extra: ${e.message}`);
    }
  };

  const finalizeProject = async (project: Project) => {
    let updatedProject = { ...project, status: 'PROCESSANDO' as Project['status'] };
    updateProjectMutation.mutate(updatedProject);
    addNotification('info', 'Finalizando engenharia e sincronizando...');
    
    try {
      if (project.transcricao && !project.transcriptUrl) {
        try {
          const transcriptUrl = await saveTranscriptToDrive(project.transcricao, project.clientName);
          updatedProject = { ...updatedProject, transcriptUrl };
        } catch (e) {
          console.warn("Falha ao salvar transcrição, continuando...", e);
        }
      }

      const technicalResult: BlueprintData = await generateTechnicalData(updatedProject);
      
      updatedProject = {
        ...updatedProject,
        technicalData: technicalResult,
        status: 'PRONTO',
      };
      // Salva dados técnicos
      await updateProjectMutation.mutateAsync(updatedProject);

      const syncSuccess = await syncProjectToSheets(updatedProject);
      if (syncSuccess) {
         updatedProject = { ...updatedProject, isSynced: true };
         updateProjectMutation.mutate(updatedProject);
         addNotification('success', 'Projeto finalizado e sincronizado com sucesso!');
      } else {
         addNotification('warning', 'Projeto finalizado, mas houve erro na sincronização com Sheets.');
      }

    } catch (e: any) {
      console.error(e);
      const errorMessage = e.message;
      const errorProject = { ...project, status: 'ERRO' as Project['status'], errorMessage, isSynced: false };
      updateProjectMutation.mutate(errorProject);
      addNotification('error', `Erro na finalização: ${errorMessage}`);
    }
  };

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      activeProject, 
      isLoading,
      isPro,
      upgradeToPro,
      loadProjects, 
      selectProject, 
      createProject, 
      updateProjectStatus, 
      processProjectAi, 
      finalizeProject,
      createNewVersion,
      generateExtraRender,
      checkSubscriptionStatus
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};