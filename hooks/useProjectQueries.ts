
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import { Project } from '../types';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
};

export const useProjects = () => {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: projectService.getAll,
  });
};

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectService.create,
    onSuccess: (newProject) => {
      // Atualiza o cache imediatamente
      queryClient.setQueryData(projectKeys.lists(), (old: Project[] | undefined) => {
        return old ? [newProject, ...old] : [newProject];
      });
    },
  });
};

export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectService.update,
    onMutate: async (updatedProject) => {
      // Cancela refetchs em andamento
      await queryClient.cancelQueries({ queryKey: projectKeys.lists() });

      // Snapshot do estado anterior
      const previousProjects = queryClient.getQueryData<Project[]>(projectKeys.lists());

      // Atualização Otimista
      queryClient.setQueryData(projectKeys.lists(), (old: Project[] | undefined) => {
        return old ? old.map((p) => (p.id === updatedProject.id ? updatedProject : p)) : [];
      });

      return { previousProjects };
    },
    onError: (err, newProject, context) => {
      // Rollback em caso de erro
      if (context?.previousProjects) {
        queryClient.setQueryData(projectKeys.lists(), context.previousProjects);
      }
    },
    onSettled: () => {
      // Revalida após sucesso ou erro para garantir consistência (opcional em offline-first, mas recomendado)
      // queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
};

export const useCreateVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectService.createVersion,
    onSuccess: (newProject) => {
      queryClient.setQueryData(projectKeys.lists(), (old: Project[] | undefined) => {
        return old ? [newProject, ...old] : [newProject];
      });
    },
  });
};
