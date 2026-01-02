
import React from 'react';
import { ExtractedInsights } from '../types';
import { ROOM_TYPES } from '../constants';
import { useTranslation } from '../context/TranslationContext';

interface Props {
  data: ExtractedInsights;
  onConfirm: () => void;
  onBack: () => void;
  onEdit: (field: keyof ExtractedInsights, value: any) => void; 
}

export const BriefingReview: React.FC<Props> = ({ data, onConfirm, onBack, onEdit }) => {
  const { t } = useTranslation();
  const hasMissingInfo = data.missingInfo && data.missingInfo.length > 0;
  const isWallWidthMissing = !data.wallWidth;
  const isClientMissing = !data.clientName || data.clientName === 'Não identificado';
  
  const statusColor = data.analysisStatus === 'COMPLETO' ? 'text-green-400 border-green-500' : 'text-yellow-400 border-yellow-500';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-widest">
            {t('briefing_review').split(' ')[0]} <span className="text-cyan-400">{t('briefing_review').split(' ').slice(1).join(' ')}</span>
          </h2>
          <p className="text-gray-500 font-mono text-xs mt-1">:: CONFIRM AND EDIT AI INTERPRETATION ::</p>
        </div>
        <div className={`px-4 py-2 border rounded bg-opacity-10 bg-black flex flex-col items-end ${statusColor}`}>
          <span className="text-[10px] font-bold uppercase tracking-widest">{t('analysis_status')}</span>
          <span className="font-mono font-bold">{data.analysisStatus || '...'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6 text-gray-200">
          <div className="bg-[#1e1e1e] p-5 rounded-xl border border-gray-800">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Detected Data</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-cyan-400 uppercase font-bold">{t('client')}</label>
                <input 
                  type="text" 
                  value={data.clientName || ''}
                  onChange={(e) => onEdit('clientName', e.target.value)}
                  className={`w-full mt-1 bg-black border ${isClientMissing ? 'border-red-500/50 focus:border-red-400' : 'border-gray-700 focus:border-cyan-400'} rounded p-2 text-white font-mono text-lg outline-none transition`}
                />
              </div>
              <div>
                <label className="text-[10px] text-cyan-400 uppercase font-bold">{t('room')}</label>
                <select
                  value={data.roomType || 'Cozinha'}
                  onChange={(e) => onEdit('roomType', e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded p-2 text-white font-bold text-sm outline-none focus:border-cyan-400"
                >
                  {ROOM_TYPES.map(room => (
                       <option key={room.id} value={room.id}>{room.icon} {room.label}</option>
                  ))}
                </select>
              </div>
              <div>
                 <label className="text-[10px] text-cyan-400 uppercase font-bold flex items-center justify-between">
                    {t('width')} (Móvel)
                    <span className="text-[8px] text-gray-500 bg-gray-800 px-1 rounded">REQUIRED</span>
                 </label>
                 <div className={`mt-1 bg-black p-2 rounded border ${isWallWidthMissing ? 'border-red-500/50' : 'border-gray-700'} flex items-center`}>
                    <input 
                      type="number" 
                      value={data.wallWidth || ''} 
                      onChange={(e) => onEdit('wallWidth', Number(e.target.value))}
                      className={`bg-transparent text-center w-full font-mono text-xl outline-none ${isWallWidthMissing ? 'text-red-400 placeholder-red-700' : 'text-green-400'}`}
                    />
                    <span className="text-gray-600 text-xs font-bold ml-1">mm</span>
                 </div>
              </div>
            </div>
          </div>

          {hasMissingInfo && (
            <div className="bg-red-900/10 p-5 rounded-xl border border-red-500/30">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">⚠ {t('missing_info')}</h3>
              <ul className="list-disc list-inside space-y-1 mb-3">
                {data.missingInfo?.map((info, idx) => (
                  <li key={idx} className="text-[10px] text-red-300 opacity-80">{info}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="md:col-span-2 space-y-6 text-gray-300">
           <div className="bg-[#1e1e1e] p-6 rounded-xl border border-gray-800 h-full flex flex-col">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">{t('technical_briefing')}</h3>
              <div className="flex-grow space-y-6">
                <div>
                  <textarea
                    value={data.technicalBriefing || ''}
                    onChange={(e) => onEdit('technicalBriefing', e.target.value)}
                    className="w-full h-32 bg-black/30 border-l-2 border-purple-500 p-3 text-gray-300 text-sm leading-relaxed outline-none focus:bg-black/50 transition resize-none rounded-r"
                  />
                </div>
                <div>
                   <label className="text-[10px] text-yellow-400 uppercase font-bold mb-1 block">{t('suggested_materials')}</label>
                   <div className="flex flex-wrap gap-2">
                      {data.suggestedMaterials?.map((mat, i) => (
                        <span key={i} className="px-3 py-1 bg-yellow-900/30 text-yellow-200 text-xs rounded border border-yellow-700/50">
                           {mat}
                        </span>
                      ))}
                   </div>
                </div>
              </div>
           </div>
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t border-gray-800">
        <button 
          onClick={onBack}
          className="px-6 py-3 text-gray-500 font-mono text-xs uppercase tracking-widest hover:text-white transition"
        >
          ← {t('abort')}
        </button>
        <button 
          onClick={onConfirm}
          disabled={!data.wallWidth}
          className={`px-8 py-3 font-bold uppercase tracking-wider text-sm rounded transition-all transform hover:-translate-y-1 shadow-[0_0_20px_rgba(0,255,100,0.2)] 
            ${!data.wallWidth ? 'bg-gray-700 text-gray-400 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-500 text-white'}`}
        >
          {t('confirm_data')} →
        </button>
      </div>
    </div>
  );
};
