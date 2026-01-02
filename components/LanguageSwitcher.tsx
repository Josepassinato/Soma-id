
import React from 'react';
import { useTranslation } from '../context/TranslationContext';
import { Language } from '../types';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useTranslation();

  const langs: { code: Language; label: string; flag: string }[] = [
    { code: 'pt', label: 'PT', flag: '🇧🇷' },
    { code: 'en', label: 'EN', flag: '🇺🇸' },
    { code: 'es', label: 'ES', flag: '🇪🇸' },
  ];

  return (
    <div className="flex items-center gap-1 bg-black/60 border border-gray-700 rounded-xl p-1 shadow-lg">
      {langs.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          title={lang.label}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black font-mono transition-all rounded-lg ${
            language === lang.code
              ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,229,255,0.4)] scale-105'
              : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
          }`}
        >
          <span>{lang.flag}</span>
          <span className="hidden md:inline">{lang.label}</span>
        </button>
      ))}
    </div>
  );
};
