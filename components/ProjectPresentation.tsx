import React, { useRef, useState } from 'react';
import { Project } from '../types';
import { useTranslation } from '../context/TranslationContext';
import { ROOM_TYPES, STYLE_PRESETS } from '../constants';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
  project: Project;
  onClose: () => void;
}

export const ProjectPresentation: React.FC<Props> = ({ project, onClose }) => {
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Generate a unique project URL for client access
  const projectId = project.id || project.somaId || 'preview';
  const baseUrl = window.location.origin;
  const projectUrl = `${baseUrl}/projeto/${projectId}`;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(projectUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Projeto SOMA-ID - ${project.clientName}`,
          text: `Visualize a proposta do projeto ${project.somaId || ''}`,
          url: projectUrl,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      setShowShareModal(true);
    }
  };

  const getRoomTypeLabel = (id: string) => {
    const room = ROOM_TYPES.find(r => r.id === id);
    return room ? `${room.icon} ${room.label}` : id;
  };

  const getStyleLabel = (id: string) => {
    const style = STYLE_PRESETS.find(s => s.id === id);
    return style ? style.label : id;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString('pt-BR');
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatDimension = (value?: number) => {
    if (!value) return '-';
    return `${value} mm`;
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 overflow-auto">
      {/* Header with actions */}
      <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex justify-between items-center z-10 print:hidden">
        <h1 className="text-xl font-bold text-white">
          {t('project_presentation')}
        </h1>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded flex items-center gap-2 transition"
            data-testid="print-presentation-btn"
          >
            🖨️ {t('print_export')}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold rounded transition"
            data-testid="close-presentation-btn"
          >
            ✕ {t('close')}
          </button>
        </div>
      </div>

      {/* Printable Content */}
      <div 
        ref={printRef} 
        className="max-w-4xl mx-auto bg-white text-gray-900 my-8 shadow-2xl print:my-0 print:shadow-none"
        data-testid="project-presentation-content"
      >
        {/* Cover / Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-800 text-white p-8 print:p-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-cyan-700 font-black text-2xl shadow-lg">
                  S
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight">SOMA-ID</h1>
                  <p className="text-cyan-200 text-xs uppercase tracking-widest">{t('industrial_identity')}</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-cyan-200 uppercase">{t('document')}</p>
              <p className="text-lg font-bold">{t('project_proposal')}</p>
              <p className="text-sm text-cyan-200">{formatDate(project.createdAt)}</p>
            </div>
          </div>

          <div className="mt-8 border-t border-cyan-500/30 pt-6">
            <p className="text-xs text-cyan-200 uppercase tracking-widest mb-1">{t('client')}</p>
            <h2 className="text-3xl font-black">{project.clientName || t('not_identified')}</h2>
            <p className="text-cyan-200 mt-2">{getRoomTypeLabel(project.roomType)}</p>
          </div>
        </div>

        {/* Project Summary */}
        <div className="p-8 print:p-6 border-b border-gray-200">
          <h3 className="text-lg font-black text-cyan-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-cyan-500 rounded"></span>
            {t('project_summary')}
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-bold">{t('room')}</p>
              <p className="text-lg font-bold text-gray-800">{getRoomTypeLabel(project.roomType)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-bold">{t('style')}</p>
              <p className="text-lg font-bold text-gray-800">{getStyleLabel(project.styleDescription) || '-'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-bold">{t('installation')}</p>
              <p className="text-lg font-bold text-gray-800">{project.installationType || 'PISO'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 uppercase font-bold">Status</p>
              <p className="text-lg font-bold text-cyan-600">{project.status}</p>
            </div>
          </div>
        </div>

        {/* Technical Specifications */}
        <div className="p-8 print:p-6 border-b border-gray-200">
          <h3 className="text-lg font-black text-cyan-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-cyan-500 rounded"></span>
            {t('technical_specs')}
          </h3>

          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-cyan-50">
                <th className="text-left p-3 text-xs font-bold text-cyan-800 uppercase border border-cyan-200">{t('dimension')}</th>
                <th className="text-left p-3 text-xs font-bold text-cyan-800 uppercase border border-cyan-200">{t('value')}</th>
                <th className="text-left p-3 text-xs font-bold text-cyan-800 uppercase border border-cyan-200">{t('unit')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-gray-200 font-medium">{t('width')}</td>
                <td className="p-3 border border-gray-200 text-cyan-700 font-bold">{project.wallWidth || '-'}</td>
                <td className="p-3 border border-gray-200 text-gray-500">mm</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="p-3 border border-gray-200 font-medium">{t('height')}</td>
                <td className="p-3 border border-gray-200 text-cyan-700 font-bold">{project.wallHeight || 2700}</td>
                <td className="p-3 border border-gray-200 text-gray-500">mm</td>
              </tr>
              <tr>
                <td className="p-3 border border-gray-200 font-medium">{t('depth')}</td>
                <td className="p-3 border border-gray-200 text-cyan-700 font-bold">{project.wallDepth || 600}</td>
                <td className="p-3 border border-gray-200 text-gray-500">mm</td>
              </tr>
            </tbody>
          </table>

          {/* Visual Dimension Box */}
          <div className="mt-6 bg-slate-900 rounded-xl p-6 text-white">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-3">{t('dimension_preview')}</p>
            <div className="flex items-center justify-center gap-4 text-2xl font-mono">
              <span className="text-green-400">{project.wallWidth || '???'}</span>
              <span className="text-slate-500">×</span>
              <span className="text-blue-400">{project.wallHeight || 2700}</span>
              <span className="text-slate-500">×</span>
              <span className="text-purple-400">{project.wallDepth || 600}</span>
              <span className="text-slate-500 text-sm">mm</span>
            </div>
            <p className="text-center text-xs text-slate-500 mt-2">
              {t('width')} × {t('height')} × {t('depth')}
            </p>
          </div>
        </div>

        {/* Suggested Materials */}
        {project.insightsIA?.suggestedMaterials && project.insightsIA.suggestedMaterials.length > 0 && (
          <div className="p-8 print:p-6 border-b border-gray-200">
            <h3 className="text-lg font-black text-cyan-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-500 rounded"></span>
              {t('suggested_materials')}
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {project.insightsIA.suggestedMaterials.map((material, index) => (
                <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                  <span className="w-3 h-3 bg-amber-400 rounded-full"></span>
                  <span className="text-sm font-medium text-amber-900">{material}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Briefing */}
        {(project.insightsIA?.technicalBriefing || project.technicalBriefingText) && (
          <div className="p-8 print:p-6 border-b border-gray-200">
            <h3 className="text-lg font-black text-cyan-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-500 rounded"></span>
              {t('technical_briefing')}
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-cyan-500">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {project.insightsIA?.technicalBriefing || project.technicalBriefingText}
              </p>
            </div>
          </div>
        )}

        {/* 3D Render / Digital Twin */}
        {project.generatedImageUrl && (
          <div className="p-8 print:p-6 border-b border-gray-200">
            <h3 className="text-lg font-black text-cyan-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-500 rounded"></span>
              {t('digital_twin_render')}
            </h3>
            <div className="bg-gray-100 rounded-xl overflow-hidden">
              <img 
                src={project.generatedImageUrl} 
                alt="Digital Twin Render" 
                className="w-full h-auto object-cover"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center italic">
              {t('render_generated_by_ai')}
            </p>
          </div>
        )}

        {/* Room Photo (if available) */}
        {project.roomPhotoData && (
          <div className="p-8 print:p-6 border-b border-gray-200">
            <h3 className="text-lg font-black text-cyan-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-500 rounded"></span>
              {t('reference_photo')}
            </h3>
            <div className="bg-gray-100 rounded-xl overflow-hidden">
              <img 
                src={project.roomPhotoData} 
                alt="Room Reference" 
                className="w-full h-auto max-h-96 object-contain"
              />
            </div>
          </div>
        )}

        {/* Technical Data / Cut List (if available) */}
        {project.technicalData && project.technicalData.mainWall?.modules?.length > 0 && (
          <div className="p-8 print:p-6 border-b border-gray-200">
            <h3 className="text-lg font-black text-cyan-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-cyan-500 rounded"></span>
              {t('module_list')}
            </h3>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-cyan-50">
                  <th className="text-left p-2 text-xs font-bold text-cyan-800 uppercase border border-cyan-200">#</th>
                  <th className="text-left p-2 text-xs font-bold text-cyan-800 uppercase border border-cyan-200">{t('module')}</th>
                  <th className="text-left p-2 text-xs font-bold text-cyan-800 uppercase border border-cyan-200">{t('dimensions')}</th>
                  <th className="text-left p-2 text-xs font-bold text-cyan-800 uppercase border border-cyan-200">{t('position')}</th>
                </tr>
              </thead>
              <tbody>
                {project.technicalData.mainWall.modules.map((mod, index) => (
                  <tr key={mod.id} className={index % 2 === 0 ? '' : 'bg-gray-50'}>
                    <td className="p-2 border border-gray-200 font-mono text-gray-500">{index + 1}</td>
                    <td className="p-2 border border-gray-200 font-medium">{mod.name}</td>
                    <td className="p-2 border border-gray-200 font-mono text-cyan-700">
                      {mod.width} × {mod.height} × {mod.depth}
                    </td>
                    <td className="p-2 border border-gray-200 font-mono text-gray-500">
                      X:{mod.position.x} Y:{mod.position.y}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-100 p-6 print:p-4">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-cyan-600 rounded flex items-center justify-center text-white font-bold text-xs">S</div>
              <span className="font-bold">SOMA-ID</span>
              <span>• Industrial Engine v2.5</span>
            </div>
            <div className="text-right">
              <p>{t('generated_on')}: {formatDate()}</p>
              <p className="font-mono">{project.somaId || `DEV-${project.id?.slice(0, 4)}`}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          [data-testid="project-presentation-content"],
          [data-testid="project-presentation-content"] * {
            visibility: visible;
          }
          [data-testid="project-presentation-content"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
