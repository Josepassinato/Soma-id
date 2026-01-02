
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project, BlueprintData, ExtractedInsights, RenderItem } from '../types';
import { generateEnchantmentPrompt, generateEnchantmentImage, generateTechnicalData } from '../services/geminiService';
import { saveTranscriptToDrive, syncProjectToSheets } from '../services/sheetsService';
import { useNotification } from './NotificationContext';
import { UserService } from '../services/userService';
import { StorageService } from '../services/storageService';
import { TokenService, TOKEN_COSTS } from '../services/tokenService';
import { useProjects, useCreateProject, useUpdateProject, useCreateVersion } from '../hooks/useProjectQueries';
import { supabase } from '../services/supabaseClient';

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | undefined;
  isLoading: boolean;
  isPro: boolean; 
  isPricingOpen: boolean;
  setIsPricingOpen: (open: boolean) => void;
  loadProjects: () => Promise<void>;
  selectProject: (id: string) => void;
  createProject: (data: Partial<Project>, extractedData?: ExtractedInsights & { transcript?: string }) => Promise<void>;
  updateProjectStatus: (projectId: string, newStatus: Project['status']) => Promise<void>;
  processProjectAi: (project: Project) => Promise<void>;
  finalizeProject: (project: Project) => Promise<void>;
  createNewVersion: (project: Project) => Promise<void>;
  generateExtraRender: (project: Project, angleName: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  const { data: projects = [], isLoading, refetch } = useProjects();
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const createVersionMutation = useCreateVersion();

  const { addNotification } = useNotification();

  useEffect(() => {
    const checkSub = async () => {
      const profile = await UserService.getProfile();
      setIsPro(profile?.subscription_tier !== 'FREE');
    };
    checkSub();
  }, []);

  const selectProject = (id: string) => setSelectedProjectId(id);
  const activeProject = projects.find(p => p.id === selectedProjectId);

  const createProject = async (data: Partial<Project>, extractedData?: ExtractedInsights & { transcript?: string }) => {
    addNotification('info', 'Iniciando pipeline SOMA-ID...');
    try {
      const { data: { user } } = await supabase!.auth.getUser();
      if (!user) return;

      if (extractedData) {
         const hasTokens = await TokenService.deductTokens(user.id, TOKEN_COSTS.CONSULTATION, `Briefing: ${data.clientName}`);
         if (!hasTokens) {
            setIsPricingOpen(true);
            addNotification('error', 'Saldo insuficiente para análise inicial.');
            return;
         }
      }

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
        roomPhotoData: roomPhotoUrl, 
        isSynced: false,
      };

      const createdProject = await createProjectMutation.mutateAsync(newProjectData);
      setSelectedProjectId(createdProject.id);
      addNotification('success', 'Projeto instanciado.');
    } catch (error: any) {
      addNotification('error', `Erro ao criar projeto: ${error.message}`);
    }
  };

  const processProjectAi = async (project: Project) => {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) return;

    const hasTokens = await TokenService.deductTokens(user.id, TOKEN_COSTS.RENDER, `Digital Twin: ${project.clientName}`);
    if (!hasTokens) {
        setIsPricingOpen(true);
        addNotification('error', 'Tokens insuficientes para o Módulo de Encantamento.');
        return;
    }

    // Set status to processing
    await updateProjectMutation.mutateAsync({ ...project, status: 'PROCESSANDO' }); 
    
    try {
      addNotification('info', 'Gerando prompt arquitetônico...');
      const enchantmentPrompt = await generateEnchantmentPrompt(project, "Frontal View (Luxe)");
      
      await updateProjectMutation.mutateAsync({ 
        ...project, 
        visualPrompt: enchantmentPrompt, 
        status: 'RENDERizando' 
      });

      addNotification('info', 'IA processando Digital Twin 4K...');
      const base64Image = await generateEnchantmentImage(enchantmentPrompt, project.materialPhotoData || '');
      
      addNotification('info', 'Sincronizando ativos na nuvem...');
      const imageUrl = await StorageService.uploadBase64Image(base64Image, 'renders');
      
      await updateProjectMutation.mutateAsync({ 
        ...project, 
        visualPrompt: enchantmentPrompt,
        generatedImageUrl: imageUrl,
        status: 'APROVACAO_VISUAL' 
      });
      
      addNotification('success', 'Digital Twin gerado com sucesso!');
    } catch (e: any) {
      console.error("Critical Render Error:", e);
      await updateProjectMutation.mutateAsync({ ...project, status: 'ERRO', errorMessage: e.message });
      addNotification('error', `Falha no Módulo de Encantamento: ${e.message}`);
    }
  };

  const finalizeProject = async (project: Project) => {
    const { data: { user } } = await supabase!.auth.getUser();
    if (!user) return;

    const hasTokens = await TokenService.deductTokens(user.id, TOKEN_COSTS.ENGINEERING, `Engenharia Industrial: ${project.clientName}`);
    if (!hasTokens) {
        setIsPricingOpen(true);
        addNotification('error', 'Saldo insuficiente para Engenharia de Fábrica.');
        return;
    }

    await updateProjectMutation.mutateAsync({ ...project, status: 'PROCESSANDO' });
    
    try {
      addNotification('info', 'Gerando planos técnicos milimétricos...');
      const technicalResult = await generateTechnicalData(project);
      
      await updateProjectMutation.mutateAsync({ 
        ...project, 
        technicalData: technicalResult, 
        status: 'PRONTO' 
      });
      addNotification('success', 'Engenharia Industrial pronta para exportação.');
    } catch (e: any) {
      await updateProjectMutation.mutateAsync({ ...project, status: 'ERRO', errorMessage: e.message });
      addNotification('error', `Falha na Engenharia: ${e.message}`);
    }
  };

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      activeProject, 
      isLoading,
      isPro,
      isPricingOpen,
      setIsPricingOpen,
      loadProjects: async () => { await refetch(); }, 
      selectProject, 
      createProject, 
      updateProjectStatus: async (id, status) => { 
        const p = projects.find(x => x.id === id);
        if (p) updateProjectMutation.mutate({ ...p, status });
      }, 
      processProjectAi, 
      finalizeProject,
      createNewVersion: async (p) => { await createVersionMutation.mutateAsync(p); },
      generateExtraRender: async (p, angle) => {
         addNotification('info', `Agendando vista adicional: ${angle}`);
      }
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within a ProjectProvider');
  return context;
};
