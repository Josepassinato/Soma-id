
import React, { useState } from 'react';
import { Project, Material } from '../types';
import { Blueprint2D } from './Blueprint2D';
import { useTranslation } from '../context/TranslationContext';

interface Props {
  project: Project;
  onUpdateMaterial: (material: Material, slot: 'PRIMARY' | 'SECONDARY') => void;
}

export const ShowroomDashboard: React.FC<Props> = ({ project, onUpdateMaterial }) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'SPLIT' | 'RENDER' | 'TECHNICAL'>('SPLIT');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* View Switcher */}
      <div className="flex justify-center">
        <div className="bg-[#121212] p-1 rounded-lg border border-gray-800 flex gap-1">
          <button 
            onClick={() => setViewMode('SPLIT')}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded transition ${viewMode === 'SPLIT' ? 'bg-cyan-600 text-black' : 'text-gray-500 hover:text-white'}`}
          >
            Dual Presentation
          </button>
          <button 
            onClick={() => setViewMode('RENDER')}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded transition ${viewMode === 'RENDER' ? 'bg-cyan-600 text-black' : 'text-gray-500 hover:text-white'}`}
          >
            Hero Render
          </button>
          <button 
            onClick={() => setViewMode('TECHNICAL')}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded transition ${viewMode === 'TECHNICAL' ? 'bg-cyan-600 text-black' : 'text-gray-500 hover:text-white'}`}
          >
            Blueprints
          </button>
        </div>
      </div>

      <div className={`grid gap-8 ${viewMode === 'SPLIT' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        
        {/* Render View */}
        {(viewMode === 'SPLIT' || viewMode === 'RENDER') && (
          <div className="space-y-4">
            <div className="bg-black rounded-2xl border border-gray-800 aspect-video overflow-hidden relative group shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              {project.generatedImageUrl ? (
                <img src={project.generatedImageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" alt="Render" />
              ) : (
                <div className="h-full flex flex-col items-center justify-center bg-gray-900">
                  <span className="text-4xl mb-4 opacity-20">🖼️</span>
                  <p className="text-xs font-mono text-gray-700 italic tracking-widest">AWAITING AI GENERATION</p>
                </div>
              )}
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <p className="text-[10px] font-bold text-white tracking-widest uppercase">Visual Concept V{project.version}</p>
              </div>
            </div>

            <div className="bg-[#181A1F] border border-gray-800 p-6 rounded-2xl">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">Material Selections</h3>
              <div className="grid grid-cols-2 gap-4">
                {project.materialPalette?.map((mat, i) => (
                  <div key={i} className="flex items-center gap-4 bg-black/30 p-3 rounded-xl border border-white/5">
                    <img src={mat.imageUrl} className="w-12 h-12 rounded-lg object-cover border border-white/10" alt={mat.name} />
                    <div>
                      <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">{i === 0 ? 'External' : 'Internal'}</p>
                      <p className="text-xs font-bold text-white">{mat.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Technical View */}
        {(viewMode === 'SPLIT' || viewMode === 'TECHNICAL') && (
          <div className="space-y-4">
            {project.technicalData ? (
              <Blueprint2D data={project.technicalData} wallWidth={project.wallWidth} />
            ) : (
              <div className="aspect-video bg-[#0F172A] rounded-2xl border border-blue-500/20 flex items-center justify-center">
                 <p className="text-[10px] font-mono text-blue-900 uppercase tracking-[0.5em] animate-pulse">Calculating Engineering...</p>
              </div>
            )}
            
            <div className="bg-[#0F172A]/50 border border-blue-900/30 p-6 rounded-2xl backdrop-blur-sm">
               <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Technical Specs</h3>
               <div className="grid grid-cols-3 gap-4 font-mono">
                  <div className="text-center p-3 bg-blue-950/30 rounded-lg border border-blue-500/10">
                    <p className="text-[9px] text-blue-400 uppercase mb-1">Total Width</p>
                    <p className="text-lg font-bold text-white">{project.wallWidth}mm</p>
                  </div>
                  <div className="text-center p-3 bg-blue-950/30 rounded-lg border border-blue-500/10">
                    <p className="text-[9px] text-blue-400 uppercase mb-1">Modules</p>
                    <p className="text-lg font-bold text-white">{project.technicalData?.mainWall.modules.length || 0}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-950/30 rounded-lg border border-blue-500/10">
                    <p className="text-[9px] text-blue-400 uppercase mb-1">Safety Gap</p>
                    <p className="text-lg font-bold text-white">10mm</p>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
