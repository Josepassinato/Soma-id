import React from 'react';
import { AppConfig } from '../config';

export const ConfigWarning: React.FC = () => {
  const isConfigured = AppConfig.googleAppsScriptUrl && !AppConfig.googleAppsScriptUrl.includes('AQUI');

  if (isConfigured) {
    return null;
  }

  return (
    <div className="bg-yellow-900/50 border border-yellow-500/50 text-yellow-300 text-xs font-mono text-center p-2 mb-6 rounded-lg">
      <strong>MODO DE FALLBACK ATIVADO:</strong> A URL do backend (Google Apps Script) não está configurada. A sincronização com Google Sheets e a geração de imagem no Drive estão desativadas. Consulte o <strong>Deploy Guide</strong> para a configuração completa.
    </div>
  );
};
