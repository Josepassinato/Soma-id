import React, { useState } from 'react';
import { useTranslation } from '../context/TranslationContext';

const API_URL = '/api';

interface CabinetArea {
  id: string;
  name: string;
  enabled: boolean;
  style: string;
  doorType: string;
  boxMaterial: string;
  doorMaterial: string;
  finish: string;
  hinges: string;
  slides: string;
  dimensions: string;
  components: string[];
  notes: string;
}

interface BriefingData {
  clientName: string;
  projectAddress: string;
  projectDate: string;
  areas: CabinetArea[];
  includedItems: string[];
  excludedItems: string[];
  generalNotes: string;
}

interface Props {
  onCancel: () => void;
  onSubmit: (briefing: BriefingData) => void;
}

const CABINET_STYLES = [
  { id: 'european_flat', label: 'Custom European - Flat Doors' },
  { id: 'european_shaker', label: 'Custom European - Shaker' },
  { id: 'traditional', label: 'Traditional' },
  { id: 'modern', label: 'Modern Minimalist' },
  { id: 'rustic', label: 'Rustic/Farmhouse' },
];

const DOOR_TYPES = [
  { id: 'flat', label: 'Flat / Slab' },
  { id: 'shaker', label: 'Shaker' },
  { id: 'raised_panel', label: 'Raised Panel' },
  { id: 'glass', label: 'Glass Insert' },
  { id: 'louvered', label: 'Louvered' },
];

const BOX_MATERIALS = [
  { id: 'plywood_3_4', label: '3/4" Plywood' },
  { id: 'plywood_1_2', label: '1/2" Plywood' },
  { id: 'mdf', label: 'MDF' },
  { id: 'particle_board', label: 'Particle Board' },
];

const DOOR_MATERIALS = [
  { id: 'mdf_3_4', label: '3/4" MDF' },
  { id: 'particle_board', label: 'Particle Board' },
  { id: 'solid_wood', label: 'Solid Wood' },
  { id: 'plywood_veneer', label: 'Plywood with Veneer' },
];

const FINISHES = [
  { id: 'wood_textured', label: 'Wood Textured' },
  { id: 'super_matte', label: 'Super Matte' },
  { id: 'high_gloss', label: 'High Gloss' },
  { id: 'satin', label: 'Satin' },
  { id: 'lacquered', label: 'Lacquered' },
  { id: 'painted', label: 'Painted' },
];

const HARDWARE_HINGES = [
  { id: 'blum_soft', label: 'Blum Soft Close' },
  { id: 'grass_soft', label: 'Grass Soft Close' },
  { id: 'standard', label: 'Standard Hinges' },
  { id: 'push_open', label: 'Push to Open' },
];

const HARDWARE_SLIDES = [
  { id: 'blum_undermount', label: 'Blum Soft Close Undermount' },
  { id: 'grass_undermount', label: 'Grass Undermount' },
  { id: 'side_mount', label: 'Side Mount Slides' },
  { id: 'full_extension', label: 'Full Extension' },
];

const ROOM_AREAS = [
  { id: 'kitchen', name: 'Kitchen', icon: '🍳' },
  { id: 'laundry', name: 'Laundry', icon: '🧺' },
  { id: 'master_bath', name: 'Master Bath Vanity', icon: '🚿' },
  { id: 'guest_bath', name: 'Guest Bath Vanity', icon: '🛁' },
  { id: 'closet', name: 'Closet', icon: '👔' },
  { id: 'home_office', name: 'Home Office', icon: '💼' },
  { id: 'living_room', name: 'Living Room/Entertainment', icon: '📺' },
  { id: 'garage', name: 'Garage Storage', icon: '🚗' },
  { id: 'pantry', name: 'Pantry', icon: '🥫' },
  { id: 'mudroom', name: 'Mudroom', icon: '🚪' },
];

const KITCHEN_COMPONENTS = [
  'Refrigerator Panel',
  'Double Oven Tall Cabinet',
  'Single Oven Cabinet',
  'Double Trash Pull Out',
  'Single Trash Pull Out',
  'Spice Pull Out',
  'Corner Lazy Susan',
  'Magic Corner',
  'Island',
  'Peninsula',
  'Wine Rack',
  'Glass Display Cabinet',
  'Pot & Pan Drawers',
  'Cutlery Dividers',
  'Under Cabinet Lighting',
  'Crown Molding',
  'Light Rail',
  'Decorative End Panels',
];

const INCLUDED_ITEMS = [
  'Material',
  'Fabrication',
  'Assembly',
  'Installation',
  'Design Consultation',
  'Delivery',
  'Site Measurement',
];

const EXCLUDED_ITEMS = [
  'Handles/Pulls',
  'Countertops',
  'Backsplash',
  'Appliances',
  'Plumbing',
  'Electrical',
  'Accessories (chosen by client)',
  'Demolition',
  'Permits',
];

export const StructuredBriefingForm: React.FC<Props> = ({ onCancel, onSubmit }) => {
  const { t, language } = useTranslation();
  const [step, setStep] = useState<'IMPORT' | 'CLIENT' | 'AREAS' | 'DETAILS' | 'REVIEW'>('IMPORT');
  const [activeAreaIndex, setActiveAreaIndex] = useState(0);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [documentsProcessed, setDocumentsProcessed] = useState(0);
  
  const [briefing, setBriefing] = useState<BriefingData>({
    clientName: '',
    projectAddress: '',
    projectDate: new Date().toISOString().split('T')[0],
    areas: [],
    includedItems: ['Material', 'Fabrication', 'Assembly', 'Installation'],
    excludedItems: ['Handles/Pulls', 'Accessories (chosen by client)'],
    generalNotes: '',
  });

  // Parse URLs from textarea (one per line or space-separated)
  const parseUrls = (text: string): string[] => {
    return text
      .split(/[\n\s]+/)
      .map(url => url.trim())
      .filter(url => url.startsWith('http'));
  };

  // Import briefing from multiple URLs
  const handleImportFromUrl = async () => {
    const urls = parseUrls(importUrl);
    if (urls.length === 0) return;
    
    setIsImporting(true);
    setImportError('');
    setDocumentsProcessed(0);
    
    try {
      const response = await fetch(`${API_URL}/briefing/import-from-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls, language })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to import');
      }
      
      const result = await response.json();
      
      if (result.status === 'success' && result.data) {
        const importedData = result.data;
        setDocumentsProcessed(result.documents_processed || 1);
        
        // Convert imported areas to our format
        const convertedAreas: CabinetArea[] = (importedData.areas || []).map((area: any, index: number) => ({
          id: `imported_${index}_${Date.now()}`,
          name: area.name || 'Unknown Area',
          enabled: true,
          style: area.style || 'european_flat',
          doorType: area.doorType || 'flat',
          boxMaterial: area.boxMaterial || 'plywood_3_4',
          doorMaterial: area.doorMaterial || 'mdf_3_4',
          finish: area.finish || 'wood_textured',
          hinges: area.hinges || 'blum_soft',
          slides: area.slides || 'blum_undermount',
          dimensions: area.dimensions || '',
          components: area.components || [],
          notes: area.notes || '',
        }));
        
        setBriefing({
          clientName: importedData.clientName || '',
          projectAddress: importedData.projectAddress || '',
          projectDate: new Date().toISOString().split('T')[0],
          areas: convertedAreas,
          includedItems: importedData.includedItems?.length > 0 
            ? importedData.includedItems 
            : ['Material', 'Fabrication', 'Assembly', 'Installation'],
          excludedItems: importedData.excludedItems?.length > 0 
            ? importedData.excludedItems 
            : ['Handles/Pulls', 'Accessories (chosen by client)'],
          generalNotes: importedData.generalNotes || '',
        });
        
        // Skip to review if we have areas, otherwise to areas selection
        if (convertedAreas.length > 0) {
          setStep('REVIEW');
        } else {
          setStep('AREAS');
        }
      }
    } catch (err) {
      setImportError((err as Error).message);
    } finally {
      setIsImporting(false);
    }
  };

  const addArea = (roomId: string) => {
    const room = ROOM_AREAS.find(r => r.id === roomId);
    if (!room) return;
    
    const newArea: CabinetArea = {
      id: `${roomId}_${Date.now()}`,
      name: room.name,
      enabled: true,
      style: 'european_flat',
      doorType: 'flat',
      boxMaterial: 'plywood_3_4',
      doorMaterial: 'mdf_3_4',
      finish: 'wood_textured',
      hinges: 'blum_soft',
      slides: 'blum_undermount',
      dimensions: '',
      components: [],
      notes: '',
    };
    
    setBriefing(prev => ({
      ...prev,
      areas: [...prev.areas, newArea],
    }));
  };

  const updateArea = (index: number, updates: Partial<CabinetArea>) => {
    setBriefing(prev => ({
      ...prev,
      areas: prev.areas.map((area, i) => 
        i === index ? { ...area, ...updates } : area
      ),
    }));
  };

  const removeArea = (index: number) => {
    setBriefing(prev => ({
      ...prev,
      areas: prev.areas.filter((_, i) => i !== index),
    }));
    if (activeAreaIndex >= briefing.areas.length - 1) {
      setActiveAreaIndex(Math.max(0, activeAreaIndex - 1));
    }
  };

  const toggleIncludedItem = (item: string) => {
    setBriefing(prev => ({
      ...prev,
      includedItems: prev.includedItems.includes(item)
        ? prev.includedItems.filter(i => i !== item)
        : [...prev.includedItems, item],
    }));
  };

  const toggleExcludedItem = (item: string) => {
    setBriefing(prev => ({
      ...prev,
      excludedItems: prev.excludedItems.includes(item)
        ? prev.excludedItems.filter(i => i !== item)
        : [...prev.excludedItems, item],
    }));
  };

  const toggleComponent = (areaIndex: number, component: string) => {
    const area = briefing.areas[areaIndex];
    const newComponents = area.components.includes(component)
      ? area.components.filter(c => c !== component)
      : [...area.components, component];
    updateArea(areaIndex, { components: newComponents });
  };

  const getLabel = (options: { id: string; label: string }[], id: string) => {
    return options.find(o => o.id === id)?.label || id;
  };

  const handleSubmit = () => {
    onSubmit(briefing);
  };

  return (
    <div className="max-w-4xl mx-auto bg-[#0F172A] border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-6 bg-slate-950 border-b border-cyan-900/30">
        <h2 className="text-2xl font-bold text-white tracking-widest uppercase">
          <span className="text-cyan-400">{t('structured_briefing')}</span>
        </h2>
        <p className="text-slate-500 text-xs font-mono mt-1">:: {t('cabinetry_quotation_style')} ::</p>
      </div>

      {/* Progress Steps */}
      <div className="flex border-b border-slate-800 overflow-x-auto">
        {['IMPORT', 'CLIENT', 'AREAS', 'DETAILS', 'REVIEW'].map((s, i) => {
          const stepLabels: Record<string, string> = {
            IMPORT: t('import_url'),
            CLIENT: t('client_info'),
            AREAS: t('project_areas'),
            DETAILS: t('specifications'),
            REVIEW: t('review'),
          };
          const stepIcons: Record<string, string> = {
            IMPORT: '🔗',
            CLIENT: '👤',
            AREAS: '🏠',
            DETAILS: '⚙️',
            REVIEW: '✓',
          };
          const isActive = step === s;
          const stepOrder = ['IMPORT', 'CLIENT', 'AREAS', 'DETAILS', 'REVIEW'];
          const isPast = stepOrder.indexOf(step) > i;
          
          return (
            <button
              key={s}
              onClick={() => setStep(s as any)}
              className={`flex-1 py-3 text-[9px] font-bold uppercase tracking-wider transition-all whitespace-nowrap px-2 ${
                isActive 
                  ? 'bg-cyan-600/20 text-cyan-400 border-b-2 border-cyan-400' 
                  : isPast 
                    ? 'text-green-400 bg-green-900/10' 
                    : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              <span className="mr-1">{stepIcons[s]}</span>
              {stepLabels[s]}
            </button>
          );
        })}
      </div>

      {/* Step: IMPORT FROM URL */}
      {step === 'IMPORT' && (
        <div className="p-8 space-y-6">
          <div className="text-center mb-8">
            <span className="text-6xl mb-4 block">📄</span>
            <h3 className="text-xl font-bold text-white mb-2">{t('import_from_link')}</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              {t('import_description')}
            </p>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">
              🔗 {t('document_url')}
            </label>
            <input
              type="url"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://acrobat.adobe.com/id/urn:aaid:sc:..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none font-mono text-sm"
              data-testid="briefing-import-url"
            />
            <p className="text-[10px] text-slate-500 mt-2">
              {t('supported_links')}: Adobe Acrobat, Google Drive, Dropbox
            </p>
          </div>

          {importError && (
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">❌ {importError}</p>
            </div>
          )}

          <button
            onClick={handleImportFromUrl}
            disabled={!importUrl.trim() || isImporting}
            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-black uppercase tracking-widest text-sm rounded-xl shadow-lg transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            data-testid="import-briefing-btn"
          >
            {isImporting ? (
              <>
                <span className="animate-spin">⏳</span>
                {t('analyzing_document')}...
              </>
            ) : (
              <>
                🤖 {t('analyze_and_import')}
              </>
            )}
          </button>

          <div className="relative flex py-6 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-[10px] text-slate-600 font-bold uppercase tracking-widest">{t('or')}</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <button
            onClick={() => setStep('CLIENT')}
            className="w-full py-3 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 font-bold uppercase tracking-widest text-xs rounded-xl transition"
          >
            📝 {t('fill_manually')}
          </button>

          <div className="flex justify-start pt-4 border-t border-slate-800">
            <button 
              onClick={onCancel}
              className="px-6 py-3 text-slate-500 font-bold text-xs hover:text-white transition uppercase tracking-widest"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Step: CLIENT INFO */}
      {step === 'CLIENT' && (
        <div className="p-8 space-y-6">
          <div>
            <label className="block text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">
              {t('client_name')} *
            </label>
            <input
              type="text"
              value={briefing.clientName}
              onChange={(e) => setBriefing(prev => ({ ...prev, clientName: e.target.value }))}
              placeholder="John Smith"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              data-testid="briefing-client-name"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">
              {t('project_address')}
            </label>
            <input
              type="text"
              value={briefing.projectAddress}
              onChange={(e) => setBriefing(prev => ({ ...prev, projectAddress: e.target.value }))}
              placeholder="123 Main St, Miami, FL 33101"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              data-testid="briefing-address"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">
              {t('project_date')}
            </label>
            <input
              type="date"
              value={briefing.projectDate}
              onChange={(e) => setBriefing(prev => ({ ...prev, projectDate: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:outline-none"
              data-testid="briefing-date"
            />
          </div>

          <div className="flex justify-between pt-6 border-t border-slate-800">
            <button 
              onClick={onCancel}
              className="px-6 py-3 text-slate-500 font-bold text-xs hover:text-white transition uppercase tracking-widest"
            >
              {t('cancel')}
            </button>
            <button 
              onClick={() => setStep('AREAS')}
              disabled={!briefing.clientName}
              className="px-10 py-4 bg-cyan-600 hover:bg-cyan-500 text-black font-black uppercase tracking-widest text-xs shadow-lg transition disabled:opacity-30"
            >
              {t('next')} →
            </button>
          </div>
        </div>
      )}

      {/* Step: AREAS */}
      {step === 'AREAS' && (
        <div className="p-8">
          <p className="text-slate-400 text-sm mb-6">{t('select_project_areas')}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {ROOM_AREAS.map(room => {
              const isAdded = briefing.areas.some(a => a.name === room.name);
              return (
                <button
                  key={room.id}
                  onClick={() => !isAdded && addArea(room.id)}
                  disabled={isAdded}
                  className={`p-4 rounded-xl border-2 transition-all text-center ${
                    isAdded 
                      ? 'border-green-500/50 bg-green-900/20 text-green-400' 
                      : 'border-slate-700 hover:border-cyan-500 hover:bg-cyan-900/10 text-slate-300'
                  }`}
                  data-testid={`add-area-${room.id}`}
                >
                  <span className="text-2xl block mb-2">{room.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{room.name}</span>
                  {isAdded && <span className="text-xs block mt-1">✓</span>}
                </button>
              );
            })}
          </div>

          {briefing.areas.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3">{t('selected_areas')}:</h4>
              {briefing.areas.map((area, index) => (
                <div 
                  key={area.id}
                  className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{ROOM_AREAS.find(r => r.name === area.name)?.icon}</span>
                    <span className="text-white font-bold">{area.name}</span>
                  </div>
                  <button
                    onClick={() => removeArea(index)}
                    className="text-red-400 hover:text-red-300 text-xs font-bold uppercase"
                  >
                    {t('remove')}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between pt-6 mt-6 border-t border-slate-800">
            <button 
              onClick={() => setStep('CLIENT')}
              className="px-6 py-3 text-slate-500 font-bold text-xs hover:text-white transition uppercase tracking-widest"
            >
              ← {t('back')}
            </button>
            <button 
              onClick={() => setStep('DETAILS')}
              disabled={briefing.areas.length === 0}
              className="px-10 py-4 bg-cyan-600 hover:bg-cyan-500 text-black font-black uppercase tracking-widest text-xs shadow-lg transition disabled:opacity-30"
            >
              {t('next')} →
            </button>
          </div>
        </div>
      )}

      {/* Step: DETAILS */}
      {step === 'DETAILS' && briefing.areas.length > 0 && (
        <div className="flex">
          {/* Area Tabs */}
          <div className="w-48 bg-slate-950 border-r border-slate-800 p-4 space-y-2">
            {briefing.areas.map((area, index) => (
              <button
                key={area.id}
                onClick={() => setActiveAreaIndex(index)}
                className={`w-full text-left p-3 rounded-lg text-xs font-bold uppercase transition ${
                  activeAreaIndex === index
                    ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/50'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {ROOM_AREAS.find(r => r.name === area.name)?.icon} {area.name}
              </button>
            ))}
          </div>

          {/* Area Details Form */}
          <div className="flex-1 p-6 space-y-5 max-h-[500px] overflow-y-auto">
            {(() => {
              const area = briefing.areas[activeAreaIndex];
              if (!area) return null;

              return (
                <>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {ROOM_AREAS.find(r => r.name === area.name)?.icon}
                    {area.name} {t('specifications')}
                  </h3>

                  {/* Style & Door Type */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">{t('cabinet_style')}</label>
                      <select
                        value={area.style}
                        onChange={(e) => updateArea(activeAreaIndex, { style: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
                      >
                        {CABINET_STYLES.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">{t('door_type')}</label>
                      <select
                        value={area.doorType}
                        onChange={(e) => updateArea(activeAreaIndex, { doorType: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
                      >
                        {DOOR_TYPES.map(d => (
                          <option key={d.id} value={d.id}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Materials */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">{t('box_material')}</label>
                      <select
                        value={area.boxMaterial}
                        onChange={(e) => updateArea(activeAreaIndex, { boxMaterial: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
                      >
                        {BOX_MATERIALS.map(m => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">{t('door_material')}</label>
                      <select
                        value={area.doorMaterial}
                        onChange={(e) => updateArea(activeAreaIndex, { doorMaterial: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
                      >
                        {DOOR_MATERIALS.map(m => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Finish & Hardware */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">{t('finish')}</label>
                      <select
                        value={area.finish}
                        onChange={(e) => updateArea(activeAreaIndex, { finish: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
                      >
                        {FINISHES.map(f => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">{t('hinges')}</label>
                      <select
                        value={area.hinges}
                        onChange={(e) => updateArea(activeAreaIndex, { hinges: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
                      >
                        {HARDWARE_HINGES.map(h => (
                          <option key={h.id} value={h.id}>{h.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">{t('slides')}</label>
                      <select
                        value={area.slides}
                        onChange={(e) => updateArea(activeAreaIndex, { slides: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-500 focus:outline-none"
                      >
                        {HARDWARE_SLIDES.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dimensions */}
                  <div>
                    <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">{t('dimensions_layout')}</label>
                    <input
                      type="text"
                      value={area.dimensions}
                      onChange={(e) => updateArea(activeAreaIndex, { dimensions: e.target.value })}
                      placeholder="e.g., L-shape 12'x10', Linear 15'"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  {/* Components (for Kitchen) */}
                  {area.name === 'Kitchen' && (
                    <div>
                      <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-3">{t('special_components')}</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {KITCHEN_COMPONENTS.map(comp => (
                          <button
                            key={comp}
                            onClick={() => toggleComponent(activeAreaIndex, comp)}
                            className={`p-2 rounded-lg text-[10px] font-bold uppercase border transition ${
                              area.components.includes(comp)
                                ? 'bg-purple-900/30 border-purple-500/50 text-purple-300'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            {area.components.includes(comp) ? '✓ ' : ''}{comp}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">{t('area_notes')}</label>
                    <textarea
                      value={area.notes}
                      onChange={(e) => updateArea(activeAreaIndex, { notes: e.target.value })}
                      placeholder={t('additional_notes_placeholder')}
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                    />
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {step === 'DETAILS' && (
        <div className="p-6 border-t border-slate-800">
          <div className="flex justify-between">
            <button 
              onClick={() => setStep('AREAS')}
              className="px-6 py-3 text-slate-500 font-bold text-xs hover:text-white transition uppercase tracking-widest"
            >
              ← {t('back')}
            </button>
            <button 
              onClick={() => setStep('REVIEW')}
              className="px-10 py-4 bg-cyan-600 hover:bg-cyan-500 text-black font-black uppercase tracking-widest text-xs shadow-lg transition"
            >
              {t('next')} →
            </button>
          </div>
        </div>
      )}

      {/* Step: REVIEW */}
      {step === 'REVIEW' && (
        <div className="p-8 space-y-6 max-h-[600px] overflow-y-auto">
          {/* Client Info Summary */}
          <div className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 p-6 rounded-xl border border-cyan-500/30">
            <h3 className="text-white font-bold text-lg mb-4">{briefing.clientName}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs uppercase">{t('address')}</p>
                <p className="text-slate-300">{briefing.projectAddress || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase">{t('date')}</p>
                <p className="text-slate-300">{briefing.projectDate}</p>
              </div>
            </div>
          </div>

          {/* Areas Summary */}
          {briefing.areas.map((area, index) => (
            <div key={area.id} className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{ROOM_AREAS.find(r => r.name === area.name)?.icon}</span>
                <h4 className="text-white font-bold text-lg">{area.name}</h4>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-slate-500 uppercase mb-1">{t('style')}</p>
                  <p className="text-cyan-400 font-bold">{getLabel(CABINET_STYLES, area.style)}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase mb-1">{t('finish')}</p>
                  <p className="text-cyan-400 font-bold">{getLabel(FINISHES, area.finish)}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase mb-1">{t('hinges')}</p>
                  <p className="text-cyan-400 font-bold">{getLabel(HARDWARE_HINGES, area.hinges)}</p>
                </div>
                <div>
                  <p className="text-slate-500 uppercase mb-1">{t('slides')}</p>
                  <p className="text-cyan-400 font-bold">{getLabel(HARDWARE_SLIDES, area.slides)}</p>
                </div>
              </div>

              {area.dimensions && (
                <p className="text-slate-400 text-sm mt-3">
                  <span className="text-slate-500">{t('dimensions')}:</span> {area.dimensions}
                </p>
              )}

              {area.components.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {area.components.map(comp => (
                    <span key={comp} className="px-2 py-1 bg-purple-900/30 text-purple-300 text-[10px] rounded">
                      {comp}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Included/Excluded */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-900/10 border border-green-500/30 rounded-xl p-4">
              <h4 className="text-green-400 font-bold text-xs uppercase tracking-widest mb-3">✓ {t('included')}</h4>
              <div className="space-y-2">
                {INCLUDED_ITEMS.map(item => (
                  <label key={item} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={briefing.includedItems.includes(item)}
                      onChange={() => toggleIncludedItem(item)}
                      className="w-4 h-4 rounded border-green-500 bg-slate-900 text-green-500 focus:ring-green-500"
                    />
                    <span className={briefing.includedItems.includes(item) ? 'text-green-300' : 'text-slate-500'}>{item}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="bg-red-900/10 border border-red-500/30 rounded-xl p-4">
              <h4 className="text-red-400 font-bold text-xs uppercase tracking-widest mb-3">✗ {t('excluded')}</h4>
              <div className="space-y-2">
                {EXCLUDED_ITEMS.map(item => (
                  <label key={item} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={briefing.excludedItems.includes(item)}
                      onChange={() => toggleExcludedItem(item)}
                      className="w-4 h-4 rounded border-red-500 bg-slate-900 text-red-500 focus:ring-red-500"
                    />
                    <span className={briefing.excludedItems.includes(item) ? 'text-red-300' : 'text-slate-500'}>{item}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* General Notes */}
          <div>
            <label className="block text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">{t('general_notes')}</label>
            <textarea
              value={briefing.generalNotes}
              onChange={(e) => setBriefing(prev => ({ ...prev, generalNotes: e.target.value }))}
              placeholder={t('general_notes_placeholder')}
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-between pt-6 border-t border-slate-800">
            <button 
              onClick={() => setStep('DETAILS')}
              className="px-6 py-3 text-slate-500 font-bold text-xs hover:text-white transition uppercase tracking-widest"
            >
              ← {t('back')}
            </button>
            <button 
              onClick={handleSubmit}
              className="px-12 py-4 bg-green-600 hover:bg-green-500 text-white font-black uppercase tracking-widest text-xs shadow-[0_15px_30px_rgba(34,197,94,0.3)] transition transform hover:-translate-y-1"
              data-testid="submit-briefing-btn"
            >
              ✓ {t('create_project')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
