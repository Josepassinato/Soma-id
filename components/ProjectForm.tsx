
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, Material, ExtractedInsights, UserProfile } from '../types';
import { MaterialService } from '../services/materialService'; 
import { UserService } from '../services/userService';
import { ROOM_TYPES, STYLE_PRESETS } from '../constants';
import { useTranslation } from '../context/TranslationContext';

interface Props {
  onSubmit: (p: Partial<Project>) => void;
  onCancel: () => void;
  initialData?: ExtractedInsights;
}

const CATEGORIES = ['Todos', 'Madeira', 'Unicolor', 'Laca', 'Metal', 'Vidro', 'Custom'];

export const ProjectForm: React.FC<Props> = ({ onSubmit, onCancel, initialData }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<Project>>({
    clientName: '',
    roomType: 'Cozinha',
    sellerId: '',
    wallWidth: 3000,
    wallHeight: 2700,
    wallDepth: 600,
    styleDescription: 'moderno',
    materialPalette: [],
    installationType: 'PISO',
    roomPhotoData: '',
    materialPhotoData: ''
  });
  
  const [activeSlot, setActiveSlot] = useState<'PRIMARY' | 'SECONDARY'>('PRIMARY');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const roomInputRef = useRef<HTMLInputElement>(null);
  const materialInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    UserService.getProfile().then(profile => {
      setUserProfile(profile);
      if (profile?.sellerId) {
        setFormData(prev => ({ ...prev, sellerId: profile.sellerId }));
      }
    });

    if (initialData) {
      setFormData(prev => ({
        ...prev,
        clientName: initialData.clientName,
        roomType: initialData.roomType || prev.roomType,
        wallWidth: initialData.wallWidth || prev.wallWidth,
        styleDescription: initialData.styleDescription || 'moderno',
        installationType: initialData.installationType || 'PISO',
        roomPhotoData: initialData.roomPhotoData || prev.roomPhotoData
      }));
    }
  }, [initialData]);

  const allMaterials = useMemo(() => MaterialService.getAll(), []);
  const filteredMaterials = useMemo(() => {
    return allMaterials.filter(m => categoryFilter === 'Todos' || m.category === categoryFilter);
  }, [allMaterials, categoryFilter]);

  const handleMaterialSelect = (material: Material) => {
    setFormData(prev => {
      const currentPalette = [...(prev.materialPalette || [])];
      if (activeSlot === 'PRIMARY') {
        currentPalette[0] = material;
        // Ao selecionar do catálogo, simulamos a captura do material para o render
        setTimeout(() => setActiveSlot('SECONDARY'), 300);
        return { ...prev, materialPalette: currentPalette, materialId: material.id, materialPhotoData: material.imageUrl };
      } else {
        currentPalette[1] = material;
        return { ...prev, materialPalette: currentPalette };
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'roomPhotoData' | 'materialPhotoData') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-[#0F172A] border border-slate-800 rounded-xl shadow-2xl max-w-6xl mx-auto overflow-hidden animate-fade-in mb-20">
      <div className="bg-gradient-to-r from-slate-950 to-slate-900 p-6 border-b border-cyan-900/30 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-widest uppercase">
            Protocolo <span className="text-cyan-400">SOMA-ID</span>
          </h2>
          <p className="text-slate-500 text-[9px] font-mono mt-1">:: CONFIGURAÇÃO DE ATENDIMENTO E ENCANTAMENTO ::</p>
        </div>
        <div className="flex gap-4">
           <div className="text-right px-4 border-r border-slate-800">
              <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">Modo:</p>
              <p className="text-[10px] font-black text-cyan-400 uppercase">Venda Assistida</p>
           </div>
           {userProfile?.shopName && (
            <div className="text-right">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Unidade:</p>
              <p className="text-xs font-black text-white">{userProfile.shopName}</p>
            </div>
           )}
        </div>
      </div>
      
      <div className="p-8 space-y-10">
        <div className="grid md:grid-cols-3 gap-10">
          
          {/* Coluna 1: Captura Visual (Input para o Render) */}
          <div className="space-y-6">
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <label className="block text-[10px] font-black text-cyan-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span> 01. Documentação Visual
                </label>
                
                <div className="space-y-4">
                    {/* Foto do Ambiente */}
                    <div 
                      onClick={() => roomInputRef.current?.click()}
                      className="group relative h-40 bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/50 transition-all overflow-hidden"
                    >
                      {formData.roomPhotoData ? (
                        <>
                          <img src={formData.roomPhotoData} className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20">
                            <span className="text-white text-[10px] font-black uppercase tracking-widest bg-cyan-600 px-3 py-1 rounded">Trocar Foto Ambiente</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl mb-2">📸</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Foto do Ambiente</span>
                          <span className="text-[8px] text-slate-600 font-mono mt-1">(UPLOAD OU CÂMERA)</span>
                        </>
                      )}
                      <input ref={roomInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'roomPhotoData')} />
                    </div>

                    {/* Amostra do Material (Gêmeo Digital) */}
                    <div 
                      onClick={() => materialInputRef.current?.click()}
                      className="group relative h-32 bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/50 transition-all overflow-hidden"
                    >
                      {formData.materialPhotoData ? (
                        <>
                          <img src={formData.materialPhotoData} className="w-full h-full object-cover opacity-50" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20">
                            <span className="text-white text-[9px] font-black uppercase tracking-widest bg-purple-600 px-2 py-1 rounded">Trocar Gêmeo Digital</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl mb-2">🪵</span>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Gêmeo Digital (Amostra)</span>
                          <span className="text-[8px] text-slate-600 font-mono mt-1">(PARA TEXTURA REAL NO RENDER)</span>
                        </>
                      )}
                      <input ref={materialInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'materialPhotoData')} />
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-900/20 border border-slate-800/50 rounded-2xl">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest">Dados de Identificação</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-cyan-400 outline-none font-mono text-xs mb-3"
                  value={formData.clientName} 
                  onChange={e => setFormData({...formData, clientName: e.target.value})}
                  placeholder="NOME COMPLETO DO CLIENTE"
                />
                <input 
                  type="text" 
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-cyan-400 outline-none font-mono text-xs"
                  value={formData.sellerId} 
                  onChange={e => setFormData({...formData, sellerId: e.target.value})}
                  placeholder="ID VENDEDOR (OPCIONAL)"
                />
            </div>
          </div>

          {/* Coluna 2: Configuração de Estilo (Decoração) */}
          <div className="space-y-6">
            <label className="block text-[10px] font-black text-cyan-400 uppercase mb-2 tracking-widest flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span> 02. Direção Criativa
            </label>
            
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {STYLE_PRESETS.map(style => (
                    <div 
                        key={style.id}
                        onClick={() => setFormData({...formData, styleDescription: style.id})}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${formData.styleDescription === style.id ? 'bg-cyan-500/10 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <h4 className={`text-[11px] font-black uppercase tracking-widest ${formData.styleDescription === style.id ? 'text-cyan-400' : 'text-slate-300'}`}>{style.label}</h4>
                            {formData.styleDescription === style.id && <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]"></div>}
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">"{style.description}"</p>
                    </div>
                ))}
            </div>

            <div className="pt-2">
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-3 tracking-widest">Técnica de Instalação</label>
                <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button onClick={() => setFormData({...formData, installationType: 'PISO'})} className={`flex-1 py-3 rounded-lg text-[10px] font-black transition-all ${formData.installationType === 'PISO' ? 'bg-slate-800 text-cyan-400 border border-cyan-400/20' : 'text-slate-600 hover:text-slate-400'}`}>BASE PISO</button>
                    <button onClick={() => setFormData({...formData, installationType: 'SUSPENSO'})} className={`flex-1 py-3 rounded-lg text-[10px] font-black transition-all ${formData.installationType === 'SUSPENSO' ? 'bg-slate-800 text-cyan-400 border border-cyan-400/20' : 'text-slate-600 hover:text-slate-400'}`}>SUSPENSO</button>
                </div>
            </div>
          </div>

          {/* Coluna 3: Ambiente & Materiais do Catálogo */}
          <div className="space-y-8">
            <div>
                <label className="block text-[10px] font-black text-cyan-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span> 03. Definição Técnica
                </label>
                
                <div className="grid grid-cols-2 gap-2 mb-6">
                    {ROOM_TYPES.map(room => (
                        <button 
                            key={room.id}
                            onClick={() => setFormData({...formData, roomType: room.id})}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 text-left ${formData.roomType === room.id ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}
                        >
                            <span className="text-xl grayscale group-hover:grayscale-0">{room.icon}</span>
                            <span className="text-[10px] font-black uppercase tracking-tighter leading-none">{room.label}</span>
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner mb-6">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Largura</span>
                      <input type="number" className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-cyan-400 font-mono text-center outline-none focus:border-cyan-500" value={formData.wallWidth} onChange={e => setFormData({...formData, wallWidth: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Altura</span>
                      <input type="number" className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-slate-400 font-mono text-center outline-none focus:border-cyan-500" value={formData.wallHeight} onChange={e => setFormData({...formData, wallHeight: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Profund.</span>
                      <input type="number" className="w-full bg-slate-900 border border-slate-800 p-2 rounded text-slate-400 font-mono text-center outline-none focus:border-cyan-500" value={formData.wallDepth} onChange={e => setFormData({...formData, wallDepth: Number(e.target.value) })} />
                    </div>
                </div>
            </div>

            <div className="pt-2">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[10px] font-black text-white uppercase tracking-widest">Catálogo SOMA-ID</label>
                  <div className="flex gap-2">
                     <div onClick={() => setActiveSlot('PRIMARY')} className={`w-10 h-10 rounded-lg border-2 cursor-pointer transition-all overflow-hidden ${activeSlot === 'PRIMARY' ? 'border-cyan-400 scale-110 shadow-lg' : 'border-slate-800 opacity-40'}`}>
                        {formData.materialPalette?.[0] ? <img src={formData.materialPalette[0].imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-900"></div>}
                     </div>
                     <div onClick={() => setActiveSlot('SECONDARY')} className={`w-10 h-10 rounded-lg border-2 cursor-pointer transition-all overflow-hidden ${activeSlot === 'SECONDARY' ? 'border-purple-400 scale-110 shadow-lg' : 'border-slate-800 opacity-40'}`}>
                        {formData.materialPalette?.[1] ? <img src={formData.materialPalette[1].imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-900"></div>}
                     </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <div className="flex gap-1 overflow-x-auto pb-3 mb-4 no-scrollbar border-b border-slate-800">
                        {CATEGORIES.map(cat => (
                            <button key={cat} onClick={() => setCategoryFilter(cat)} className={`px-4 py-1.5 text-[9px] rounded-full uppercase font-black transition-all whitespace-nowrap ${categoryFilter === cat ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' : 'text-slate-500 bg-slate-900 hover:bg-slate-800'}`}>{cat}</button>
                        ))}
                    </div>
                    <div className="grid grid-cols-4 gap-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {filteredMaterials.map(m => (
                            <div key={m.id} onClick={() => handleMaterialSelect(m)} className={`group cursor-pointer aspect-square rounded-xl overflow-hidden border transition-all relative ${formData.materialPalette?.some(p => p.id === m.id) ? 'border-cyan-500 ring-2 ring-cyan-500/20' : 'border-slate-800'}`}>
                                <img src={m.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition" />
                                <div className="absolute inset-0 bg-cyan-900/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                   <span className="text-[10px] text-white font-black">SEL</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-slate-800 pt-10">
          <button onClick={onCancel} className="px-10 py-4 text-slate-500 font-black text-xs hover:text-white transition-colors uppercase tracking-[0.2em]">{t('abort')}</button>
          
          <div className="flex items-center gap-6">
             <div className="hidden lg:block text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Próxima Etapa:</p>
                <p className="text-[11px] font-black text-cyan-400 uppercase">Geração de Digital Twin (Encantamento)</p>
             </div>
             <button 
              onClick={() => onSubmit(formData)} 
              disabled={!formData.materialPalette?.[0] || !formData.clientName || !formData.roomPhotoData} 
              className="px-16 py-6 bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-[0.3em] text-sm rounded-2xl shadow-[0_20px_50px_rgba(6,182,212,0.3)] transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-30 disabled:grayscale"
            >
              Criar Projeto e Gerar Render →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
