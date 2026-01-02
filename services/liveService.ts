
/**
 * LIVE SERVICE - Assistente de Voz Industrial
 * 
 * NOTA: Este serviço usa a Live API do Gemini que requer conexão WebSocket.
 * Para produção, implemente um WebSocket proxy no backend para proteger a API key.
 * 
 * Por enquanto, este serviço está desabilitado até implementação do proxy.
 */

// Tipos para compatibilidade com componentes existentes
interface LiveCallbacks {
  onOpen: () => void;
  onMessage: (msg: any) => void;
  onClose: () => void;
  onToolCall: (calls: any[]) => void;
}

export const LiveService = {
  /**
   * Conecta ao assistente de voz (DESABILITADO)
   * 
   * @deprecated Migração para backend pendente - requer WebSocket proxy
   */
  connect: async (callbacks: LiveCallbacks) => {
    console.warn('[LiveService] Assistente de voz temporariamente desabilitado. Migração para backend em andamento.');
    
    // Retorna um mock para não quebrar componentes existentes
    return {
      send: (msg: any) => {
        console.warn('[LiveService] Mensagem não enviada - serviço desabilitado:', msg);
      },
      close: () => {
        console.log('[LiveService] Conexão mock fechada.');
        callbacks.onClose();
      },
      isConnected: false
    };
  },

  /**
   * Verifica se o serviço Live está disponível
   */
  isAvailable: () => {
    return false; // Desabilitado até implementação do WebSocket proxy
  }
};
