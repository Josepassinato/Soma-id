
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados considerados "frescos" por 5 minutos.
      // Evita refetchs desnecessários quando o usuário navega entre telas.
      staleTime: 1000 * 60 * 5, 
      
      // Se a query falhar, tenta novamente 3 vezes (Resiliência de Rede)
      retry: 3,
      
      // Mantém dados em cache por 30 minutos mesmo sem uso (Garbage Collection)
      gcTime: 1000 * 60 * 30,
      
      // Não revalidar ao focar a janela (Economiza dados em 3G/4G)
      refetchOnWindowFocus: false,
    },
    mutations: {
        // Tenta novamente mutações de rede se falharem por erro de conexão
        retry: 1, 
    }
  },
});
