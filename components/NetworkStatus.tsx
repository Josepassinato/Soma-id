
import React, { useState, useEffect } from 'react';

export const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-red-900/90 border border-red-500 text-white px-4 py-2 rounded-lg shadow-2xl flex items-center gap-2 animate-fade-in backdrop-blur-md">
      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
      <div className="flex flex-col">
          <span className="text-xs font-bold uppercase tracking-wider">Modo Offline</span>
          <span className="text-[10px] text-red-200">Verifique sua conexão. Dados locais em uso.</span>
      </div>
    </div>
  );
};
