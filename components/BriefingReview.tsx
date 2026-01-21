
import React, { useState } from 'react';
import { ExtractedInsights } from '../types';
import { ROOM_TYPES, STYLE_PRESETS } from '../constants';
import { useTranslation } from '../context/TranslationContext';

interface Props {
  data: ExtractedInsights;
  onConfirm: () => void;
  onBack: () => void;
  onEdit: (field: keyof ExtractedInsights, value: any) => void; 
}

export const BriefingReview: React.FC<Props> = ({ data, onConfirm, onBack, onEdit }) => {
  const { t } = useTranslation();
  const [newMaterial, setNewMaterial] = useState('');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
  const hasMissingInfo = data.missingInfo && data.missingInfo.length > 0;
  const isWallWidthMissing = !data.wallWidth;
  const isClientMissing = !data.clientName || data.clientName === 'Não identificado';
  
  const statusColor = data.analysisStatus === 'COMPLETO' ? 'text-green-400 border-green-500' : 'text-yellow-400 border-yellow-500';

  // Add new material to the list
  const handleAddMaterial = () => {
    if (newMaterial.trim()) {
      const currentMaterials = data.suggestedMaterials || [];
      onEdit('suggestedMaterials', [...currentMaterials, newMaterial.trim()]);
      setNewMaterial('');
    }
  };

  // Remove material from the list
  const handleRemoveMaterial = (index: number) => {
    const currentMaterials = data.suggestedMaterials || [];
    const newMaterials = currentMaterials.filter((_, i) => i !== index);
    onEdit('suggestedMaterials', newMaterials);
  };

  // Edit existing material
  const handleEditMaterial = (index: number, value: string) => {
    const currentMaterials = [...(data.suggestedMaterials || [])];
    currentMaterials[index] = value;
    onEdit('suggestedMaterials', currentMaterials);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-widest">
            {t('briefing_review')} <span className="text-cyan-400">✏️</span>
          </h2>
          <p className="text-gray-500 font-mono text-xs mt-1">:: EDITE OS DADOS EXTRAÍDOS PELA IA ::</p>
        </div>
        <div className={`px-4 py-2 border rounded bg-opacity-10 bg-black flex flex-col items-end ${statusColor}`}>
          <span className="text-[10px] font-bold uppercase tracking-widest">{t('analysis_status')}</span>
          <span className="font-mono font-bold">{data.analysisStatus || '...'}</span>
        </div>
      </div>

      {/* Edit Mode Banner */}
      <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">✏️</span>
        <div>
          <p className="text-cyan-400 font-bold text-sm">Modo de Edição Ativo</p>
          <p className="text-cyan-200/70 text-xs">Todos os campos abaixo podem ser editados. Clique em qualquer campo para modificar.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Basic Data */}
        <div className="space-y-6">
          <div className="bg-[#1e1e1e] p-5 rounded-xl border border-gray-800">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
              Dados do Cliente
            </h3>
            <div className="space-y-4">
              {/* Client Name */}
              <div>
                <label className="text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-2">
                  {t('client')}
                  <span className="text-[8px] text-gray-500 bg-gray-800 px-1 rounded">EDITÁVEL</span>
                </label>
                <input 
                  type="text" 
                  value={data.clientName || ''}
                  onChange={(e) => onEdit('clientName', e.target.value)}
                  placeholder="Nome do cliente..."
                  className={`w-full mt-1 bg-black border ${isClientMissing ? 'border-red-500/50 focus:border-red-400' : 'border-gray-700 focus:border-cyan-400'} rounded p-2 text-white font-mono text-lg outline-none transition`}
                />
              </div>

              {/* Room Type */}
              <div>
                <label className="text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-2">
                  {t('room')}
                  <span className="text-[8px] text-gray-500 bg-gray-800 px-1 rounded">EDITÁVEL</span>
                </label>
                <select
                  value={data.roomType || 'Cozinha'}
                  onChange={(e) => onEdit('roomType', e.target.value)}
                  className="w-full mt-1 bg-black border border-gray-700 rounded p-2 text-white font-bold text-sm outline-none focus:border-cyan-400 cursor-pointer"
                >
                  {ROOM_TYPES.map(room => (
                    <option key={room.id} value={room.id}>{room.icon} {room.label}</option>
                  ))}
                </select>
              </div>

              {/* Style */}
              <div>
                <label className="text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-2">
                  {t('style')}
                  <span className="text-[8px] text-gray-500 bg-gray-800 px-1 rounded">EDITÁVEL</span>
                </label>
                <select
                  value={data.styleDescription || ''}
                  onChange={(e) => onEdit('styleDescription', e.target.value)}
                  className="w-full mt-1 bg-black border border-gray-700 rounded p-2 text-white font-bold text-sm outline-none focus:border-cyan-400 cursor-pointer"
                >
                  <option value="">Selecione um estilo...</option>
                  {STYLE_PRESETS.map(style => (
                    <option key={style.id} value={style.id}>{style.label}</option>
                  ))}
                  <option value="custom">Personalizado</option>
                </select>
                {data.styleDescription === 'custom' && (
                  <input 
                    type="text"
                    placeholder="Descreva o estilo..."
                    className="w-full mt-2 bg-black border border-gray-700 rounded p-2 text-white text-sm outline-none focus:border-cyan-400"
                    onChange={(e) => onEdit('styleDescription', e.target.value)}
                  />
                )}
              </div>

              {/* Installation Type */}
              <div>
                <label className="text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-2">
                  Tipo de Instalação
                  <span className="text-[8px] text-gray-500 bg-gray-800 px-1 rounded">EDITÁVEL</span>
                </label>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => onEdit('installationType', 'PISO')}
                    className={`flex-1 py-2 px-3 rounded border text-xs font-bold uppercase transition ${
                      data.installationType === 'PISO' 
                        ? 'bg-cyan-600 border-cyan-500 text-white' 
                        : 'bg-black border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    📦 Piso
                  </button>
                  <button
                    onClick={() => onEdit('installationType', 'SUSPENSO')}
                    className={`flex-1 py-2 px-3 rounded border text-xs font-bold uppercase transition ${
                      data.installationType === 'SUSPENSO' 
                        ? 'bg-cyan-600 border-cyan-500 text-white' 
                        : 'bg-black border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    🔗 Suspenso
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Missing Info Alert */}
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

        {/* Middle Column - Dimensions */}
        <div className="space-y-6">
          <div className="bg-[#1e1e1e] p-5 rounded-xl border border-gray-800">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Medidas (mm)
            </h3>
            <div className="space-y-4">
              {/* Width */}
              <div>
                <label className="text-[10px] text-cyan-400 uppercase font-bold flex items-center justify-between">
                  {t('width')}
                  <span className="text-[8px] text-red-400 bg-red-900/30 px-1 rounded">OBRIGATÓRIO</span>
                </label>
                <div className={`mt-1 bg-black p-2 rounded border ${isWallWidthMissing ? 'border-red-500/50' : 'border-gray-700'} flex items-center`}>
                  <input 
                    type="number" 
                    value={data.wallWidth || ''} 
                    onChange={(e) => onEdit('wallWidth', Number(e.target.value))}
                    placeholder="Ex: 3000"
                    className={`bg-transparent text-center w-full font-mono text-xl outline-none ${isWallWidthMissing ? 'text-red-400 placeholder-red-700' : 'text-green-400'}`}
                  />
                  <span className="text-gray-600 text-xs font-bold ml-1">mm</span>
                </div>
              </div>

              {/* Height */}
              <div>
                <label className="text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-2">
                  {t('height')}
                  <span className="text-[8px] text-gray-500 bg-gray-800 px-1 rounded">EDITÁVEL</span>
                </label>
                <div className="mt-1 bg-black p-2 rounded border border-gray-700 flex items-center">
                  <input 
                    type="number" 
                    value={data.wallHeight || 2700} 
                    onChange={(e) => onEdit('wallHeight', Number(e.target.value))}
                    placeholder="2700"
                    className="bg-transparent text-center w-full font-mono text-xl outline-none text-blue-400"
                  />
                  <span className="text-gray-600 text-xs font-bold ml-1">mm</span>
                </div>
              </div>

              {/* Depth */}
              <div>
                <label className="text-[10px] text-cyan-400 uppercase font-bold flex items-center gap-2">
                  {t('depth')}
                  <span className="text-[8px] text-gray-500 bg-gray-800 px-1 rounded">EDITÁVEL</span>
                </label>
                <div className="mt-1 bg-black p-2 rounded border border-gray-700 flex items-center">
                  <input 
                    type="number" 
                    value={data.wallDepth || 600} 
                    onChange={(e) => onEdit('wallDepth', Number(e.target.value))}
                    placeholder="600"
                    className="bg-transparent text-center w-full font-mono text-xl outline-none text-purple-400"
                  />
                  <span className="text-gray-600 text-xs font-bold ml-1">mm</span>
                </div>
              </div>
            </div>

            {/* Dimension Preview */}
            <div className="mt-6 p-4 bg-black/50 rounded-lg border border-gray-800">
              <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Visualização</p>
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-green-400 font-mono">{data.wallWidth || '???'}</span>
                <span className="text-gray-600">×</span>
                <span className="text-blue-400 font-mono">{data.wallHeight || 2700}</span>
                <span className="text-gray-600">×</span>
                <span className="text-purple-400 font-mono">{data.wallDepth || 600}</span>
                <span className="text-gray-500 text-xs">mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Technical Details */}
        <div className="space-y-6">
          <div className="bg-[#1e1e1e] p-5 rounded-xl border border-gray-800">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              {t('technical_briefing')}
            </h3>
            <textarea
              value={data.technicalBriefing || ''}
              onChange={(e) => onEdit('technicalBriefing', e.target.value)}
              placeholder="Descreva os detalhes técnicos do projeto..."
              className="w-full h-40 bg-black/50 border border-gray-700 p-3 text-gray-300 text-sm leading-relaxed outline-none focus:border-purple-500 transition resize-none rounded"
            />
          </div>

          {/* Materials Section */}
          <div className="bg-[#1e1e1e] p-5 rounded-xl border border-gray-800">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              {t('suggested_materials')}
            </h3>
            
            {/* Materials List */}
            <div className="space-y-2 mb-4">
              {data.suggestedMaterials?.map((mat, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  {isEditing === `material-${i}` ? (
                    <input
                      type="text"
                      value={mat}
                      onChange={(e) => handleEditMaterial(i, e.target.value)}
                      onBlur={() => setIsEditing(null)}
                      onKeyPress={(e) => e.key === 'Enter' && setIsEditing(null)}
                      autoFocus
                      className="flex-1 bg-black border border-yellow-500 rounded px-3 py-1.5 text-yellow-200 text-xs outline-none"
                    />
                  ) : (
                    <span 
                      onClick={() => setIsEditing(`material-${i}`)}
                      className="flex-1 px-3 py-1.5 bg-yellow-900/30 text-yellow-200 text-xs rounded border border-yellow-700/50 cursor-pointer hover:bg-yellow-900/50 transition"
                    >
                      {mat}
                    </span>
                  )}
                  <button
                    onClick={() => handleRemoveMaterial(i)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition p-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Material */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newMaterial}
                onChange={(e) => setNewMaterial(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddMaterial()}
                placeholder="Adicionar material..."
                className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-white text-xs outline-none focus:border-yellow-500"
              />
              <button
                onClick={handleAddMaterial}
                disabled={!newMaterial.trim()}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-bold rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Adicionar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-800">
        <button 
          onClick={onBack}
          className="px-6 py-3 text-gray-500 font-mono text-xs uppercase tracking-widest hover:text-white transition flex items-center gap-2"
        >
          ← {t('back')}
        </button>
        <div className="flex gap-4">
          <button 
            onClick={onConfirm}
            disabled={!data.wallWidth}
            className={`px-8 py-3 font-bold uppercase tracking-wider text-sm rounded transition-all transform hover:-translate-y-1 shadow-[0_0_20px_rgba(0,255,100,0.2)] flex items-center gap-2
              ${!data.wallWidth ? 'bg-gray-700 text-gray-400 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-500 text-white'}`}
          >
            ✓ {t('confirm_data')} →
          </button>
        </div>
      </div>
    </div>
  );
};
