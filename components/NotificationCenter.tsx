
import React from 'react';
import { useNotification, NotificationType } from '../context/NotificationContext';

const getIcon = (type: NotificationType) => {
  switch (type) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'info': return 'ℹ️';
  }
};

const getColors = (type: NotificationType) => {
  switch (type) {
    case 'success': return 'bg-green-900/90 border-green-500 text-green-100';
    case 'error': return 'bg-red-900/90 border-red-500 text-red-100';
    case 'warning': return 'bg-yellow-900/90 border-yellow-500 text-yellow-100';
    case 'info': return 'bg-blue-900/90 border-blue-500 text-blue-100';
  }
};

export const NotificationCenter: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {notifications.map(notif => (
        <div 
          key={notif.id}
          className={`pointer-events-auto min-w-[300px] max-w-md p-4 rounded-lg shadow-2xl border-l-4 flex items-start gap-3 animate-fade-in backdrop-blur-md ${getColors(notif.type)}`}
        >
          <span className="text-xl">{getIcon(notif.type)}</span>
          <div className="flex-grow text-sm font-medium leading-relaxed">
            {notif.message}
          </div>
          <button 
            onClick={() => removeNotification(notif.id)}
            className="text-white/50 hover:text-white"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
