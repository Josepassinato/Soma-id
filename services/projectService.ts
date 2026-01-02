
import { supabase } from './supabaseClient';
import { Project } from '../types';

const LOCAL_STORAGE_KEY = 'marcenaria_projects_backup_v1';

// Helper para tratar erros desconhecidos
const serializeError = (error: any): string => {
  if (!error) return 'Erro desconhecido';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error.message) return error.message;
  return String(error);
};

// Polyfill robusto para UUID v4
const generateUUID = () => {
  // Tenta usar a API nativa segura se disponível
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (e) {
      console.warn("crypto.randomUUID falhou, usando fallback.", e);
    }
  }
  
  // Fallback compatível com todos os browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const fromDb = (row: any): Project => ({
  id: row.id,
  version: row.version || 1,
  parentId: row.parent_id,
  clientName: row.client_name || 'Sem Nome',
  roomType: row.room_type || 'Cozinha',
  createdAt: row.created_at || new Date().toISOString(),
  // Fix: Ensure m1Status is provided as required by Project interface
  m1Status: (row.m1_status || 'ENCANTAMENTO') as Project['m1Status'],
  status: (row.status || 'RASCUNHO') as Project['status'],
  // Added missing installationType mapping from DB row to fix missing property error
  installationType: (row.installation_type || 'PISO') as Project['installationType'],
  wallWidth: Number(row.wall_width) || 0,
  wallHeight: Number(row.wall_height) || 2700,
  wallDepth: Number(row.wall_depth) || 600,
  roomWidth: row.insights_ia?.roomWidth,
  roomDepth: row.insights_ia?.roomDepth,
  styleDescription: row.style_description || '',
  materialId: row.material_id,
  materialPalette: row.insights_ia?.materialPalette || [], 
  visualPrompt: row.visual_prompt,
  generatedImageUrl: row.generated_image_url,
  renders: row.insights_ia?.renders || [],
  transcriptUrl: row.transcript_url,
  insightsIA: row.insights_ia || {},
  technicalData: row.technical_data,
  isSynced: true // Se veio do banco, está sincronizado
});

const toDb = (project: Partial<Project>) => ({
  id: project.id, 
  version: project.version,
  parent_id: project.parentId,
  client_name: project.clientName,
  // Fix: Corrected room_type mapping to use project.roomType instead of non-existent room_type
  room_type: project.roomType,
  status: project.status,
  // Fix: Map m1Status to database column
  m1_status: project.m1Status,
  // Added installation_type mapping to persist this field in DB
  installation_type: project.installationType,
  wall_width: project.wallWidth,
  wall_height: project.wallHeight,
  wall_depth: project.wallDepth,
  style_description: project.styleDescription,
  material_id: project.materialId,
  visual_prompt: project.visualPrompt,
  generated_image_url: project.generatedImageUrl,
  transcript_url: project.transcriptUrl,
  insights_ia: { 
      ...(project.insightsIA || {}), 
      materialPalette: project.materialPalette,
      roomWidth: project.roomWidth,
      roomDepth: project.roomDepth,
      renders: project.renders 
  },
  technical_data: project.technicalData
});

const getLocalProjects = (): Project[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Erro crítico ao ler LocalStorage:", e);
    return [];
  }
};

const saveLocalProjects = (projects: Project[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error("Erro ao salvar no LocalStorage:", e);
  }
};

export const projectService = {
  getAll: async (): Promise<Project[]> => {
    // 1. Carrega o estado local atual (Source of Truth para itens não sincronizados)
    const localProjects = getLocalProjects();
    const unsyncedProjects = localProjects.filter(p => p.isSynced === false);

    if (!supabase) {
      console.warn('⚠️ Modo Offline (Config). Retornando apenas locais.');
      return localProjects;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const remoteProjects = (data || []).map(fromDb);

      // 2. MERGE STRATEGY: Remote + Local Unsynced
      const mergedProjects = [
        ...unsyncedProjects.filter(local => !remoteProjects.find(remote => remote.id === local.id)),
        ...remoteProjects
      ];

      // Ordena novamente por data (mais recente primeiro)
      mergedProjects.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // 3. Atualiza o cache local
      saveLocalProjects(mergedProjects);
      
      return mergedProjects;

    } catch (error: any) {
      const errorMsg = serializeError(error);
      console.warn('⚠️ Falha no fetch remoto. Usando cache local.', errorMsg);
      return localProjects;
    }
  },

  create: async (project: Partial<Project>): Promise<Project> => {
    const newId = generateUUID(); 
    
    const newLocalProject: Project = {
        ...project as Project,
        id: newId,
        version: 1,
        createdAt: new Date().toISOString(),
        status: project.status || 'RASCUNHO',
        isSynced: false
    };
    
    const current = getLocalProjects();
    saveLocalProjects([newLocalProject, ...current]);

    if (!supabase) return newLocalProject;

    try {
      const dbPayload = toDb(newLocalProject);
      const { data, error } = await supabase
        .from('projects')
        .insert([dbPayload])
        .select()
        .single();

      if (error) throw error;
      
      const savedProject = fromDb(data);
      const freshList = getLocalProjects().map(p => p.id === newId ? savedProject : p);
      saveLocalProjects(freshList);
      
      return savedProject;

    } catch (error: any) {
      console.warn('⚠️ Salvo apenas localmente (Erro Supabase):', serializeError(error));
      return newLocalProject;
    }
  },

  createVersion: async (originalProject: Project): Promise<Project> => {
      const newVersionNum = (originalProject.version || 1) + 1;
      const newVersionProject: Partial<Project> = {
          ...originalProject,
          id: undefined, // ID undefined força geração de novo UUID no create
          version: newVersionNum,
          parentId: originalProject.id,
          status: 'RASCUNHO',
          clientName: `${originalProject.clientName} V${newVersionNum}`,
          generatedImageUrl: undefined,
          renders: [],
          technicalData: undefined,
          isSynced: false
      };
      
      return await projectService.create(newVersionProject);
  },

  update: async (project: Project): Promise<Project> => {
    const projectToSave = { ...project, isSynced: false };
    const current = getLocalProjects();
    const updatedList = current.map(p => p.id === project.id ? projectToSave : p);
    saveLocalProjects(updatedList);

    if (!supabase) return projectToSave;

    try {
      const dbPayload = toDb(project);
      const { data, error } = await supabase
        .from('projects')
        .update(dbPayload)
        .eq('id', project.id)
        .select()
        .single();

      if (error) throw error;

      const updatedRemote = fromDb(data);
      const syncedList = getLocalProjects().map(p => p.id === project.id ? updatedRemote : p);
      saveLocalProjects(syncedList);

      return updatedRemote;

    } catch (error: any) {
      console.warn('⚠️ Update salvo apenas localmente:', serializeError(error));
      return projectToSave;
    }
  }
};
