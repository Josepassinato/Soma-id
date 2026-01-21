
import React, { useState, useRef } from 'react';
import { ExtractedInsights, ConsultationInput } from '../types';
import { FloorPlanAnalyzer } from './FloorPlanAnalyzer';
import { StructuredBriefingForm } from './StructuredBriefingForm';
import { useTranslation } from '../context/TranslationContext';

interface Props {
  onCancel: () => void;
  onInsightsExtracted: (insights: ExtractedInsights, sourceType: string) => void;
  onProcess: (input: ConsultationInput) => Promise<ExtractedInsights>;
}

export const ConversationRecorder: React.FC<Props> = ({ onCancel, onInsightsExtracted, onProcess }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'RECORD' | 'UPLOAD_AUDIO' | 'UPLOAD_PDF' | 'UPLOAD_IMAGE' | 'FLOOR_PLAN' | 'STRUCTURED'>('RECORD');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userDescription, setUserDescription] = useState('');
  
  // State for recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // State for files
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null); // For recorded audio
  const [imagePreview, setImagePreview] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- RECORDING LOGIC ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); 
        setAudioBlob(audioBlob);
        setFilePreview("Gravação de Voz Finalizada. Pronto para analisar.");
      };

      mediaRecorder.start();
      setIsRecording(true);
      setAudioBlob(null); 
      setFilePreview("");

    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      alert("Permissão de microfone negada.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // --- FILE HANDLING LOGIC ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'AUDIO' | 'PDF' | 'IMAGE') => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFilePreview(file.name);
      setAudioBlob(null); 
      
      if (type === 'IMAGE') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const convertBlobToBase64 = (blob: Blob | File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // --- PROCESS LOGIC ---
  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      let input: ConsultationInput;

      if (activeTab === 'RECORD') {
        if (!audioBlob) throw new Error("Nenhuma gravação encontrada.");
        const base64 = await convertBlobToBase64(audioBlob);
        input = { type: 'AUDIO', content: base64, mimeType: 'audio/webm', userDescription };
      } 
      else if (activeTab === 'UPLOAD_AUDIO') {
        if (!selectedFile) throw new Error("Nenhum arquivo de áudio selecionado.");
        const base64 = await convertBlobToBase64(selectedFile);
        input = { type: 'AUDIO', content: base64, mimeType: selectedFile.type, userDescription };
      } 
      else if (activeTab === 'UPLOAD_IMAGE') {
        if (!selectedFile) throw new Error("Nenhuma foto selecionada.");
        const base64 = await convertBlobToBase64(selectedFile);
        input = { type: 'IMAGE', content: base64, mimeType: selectedFile.type, userDescription };
      }
      else { // PDF
        if (!selectedFile) throw new Error("Nenhum arquivo PDF selecionado.");
        const base64 = await convertBlobToBase64(selectedFile);
        input = { type: 'PDF', content: base64, mimeType: 'application/pdf', userDescription };
      }

      const insights = await onProcess(input);
      const sourceDesc = activeTab === 'RECORD' ? 'Gravação de Voz' : selectedFile?.name || 'Arquivo';
      
      // Se for imagem, anexar a foto original aos insights para o formulário
      if (activeTab === 'UPLOAD_IMAGE' && imagePreview) {
        insights.roomPhotoData = imagePreview;
      }

      onInsightsExtracted(insights, sourceDesc);

    } catch (error) {
      alert((error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setAudioBlob(null);
    setSelectedFile(null);
    setFilePreview('');
    setImagePreview('');
    setIsRecording(false);
    setUserDescription('');
  }

  return (
    <div className="max-w-3xl mx-auto bg-[#0F172A] border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
      <div className="p-6 bg-slate-950 border-b border-cyan-900/30">
        <h2 className="text-2xl font-bold text-white tracking-widest uppercase">
          <span className="text-cyan-400">{t('new_attendance').replace('+ ', '')}</span> SOMA-ID
        </h2>
        <p className="text-slate-500 text-xs font-mono mt-1">:: {t('briefing_extracted').toUpperCase()} ::</p>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-800 bg-slate-900/50 overflow-x-auto">
        <button 
          onClick={() => { setActiveTab('RECORD'); resetState(); }}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-wider transition whitespace-nowrap px-2 ${activeTab === 'RECORD' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5' : 'text-slate-500 hover:text-slate-300'}`}
        >
          🎙️ {t('audio_live')}
        </button>
        <button 
          onClick={() => { setActiveTab('UPLOAD_IMAGE'); resetState(); }}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-wider transition whitespace-nowrap px-2 ${activeTab === 'UPLOAD_IMAGE' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5' : 'text-slate-500 hover:text-slate-300'}`}
        >
          📸 {t('photo_upload')}
        </button>
        <button 
          onClick={() => { setActiveTab('FLOOR_PLAN'); resetState(); }}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-wider transition whitespace-nowrap px-2 ${activeTab === 'FLOOR_PLAN' ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/5' : 'text-slate-500 hover:text-slate-300'}`}
        >
          📐 {t('floor_plan')}
        </button>
        <button 
          onClick={() => { setActiveTab('UPLOAD_AUDIO'); resetState(); }}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-wider transition whitespace-nowrap px-2 ${activeTab === 'UPLOAD_AUDIO' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5' : 'text-slate-500 hover:text-slate-300'}`}
        >
          📤 {t('audio')}
        </button>
        <button 
          onClick={() => { setActiveTab('UPLOAD_PDF'); resetState(); }}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-wider transition whitespace-nowrap px-2 ${activeTab === 'UPLOAD_PDF' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/5' : 'text-slate-500 hover:text-slate-300'}`}
        >
          📄 {t('pdf')}
        </button>
      </div>

      {/* VIEW: FLOOR PLAN ANALYZER */}
      {activeTab === 'FLOOR_PLAN' && (
        <FloorPlanAnalyzer 
          onCancel={onCancel}
          onProjectReady={(insights, roomPhoto) => {
            onInsightsExtracted({ ...insights, roomPhotoData: roomPhoto }, t('floor_plan'));
          }}
        />
      )}
      
      {/* Content for other tabs (not FLOOR_PLAN) */}
      {activeTab !== 'FLOOR_PLAN' && (
        <div className="p-10 min-h-[350px] flex flex-col items-center justify-center">
          
          {/* VIEW: RECORD */}
          {activeTab === 'RECORD' && (
            <div className="flex flex-col items-center space-y-8 w-full">
              <button 
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 border-4 ${
                  isRecording 
                    ? 'bg-red-600 border-red-400 shadow-[0_0_40px_rgba(220,38,38,0.5)] animate-pulse' 
                    : 'bg-cyan-600 border-cyan-400 hover:bg-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
                }`}
              >
                <div className={`w-8 h-8 transition-all ${isRecording ? 'bg-white rounded-sm' : 'bg-black rounded-full'}`}></div>
              </button>
              <div className="text-center">
                <p className="text-sm font-bold text-white uppercase tracking-widest">
                  {isRecording ? t('capture_briefing') : audioBlob ? t('voice_recorded') : t('press_to_record')}
                </p>
                <p className="text-[10px] font-mono text-slate-500 mt-2 uppercase">{t('ai_will_extract')}</p>
              </div>
            </div>
          )}

          {/* VIEW: UPLOAD IMAGE */}
          {activeTab === 'UPLOAD_IMAGE' && (
            <div className="w-full text-center space-y-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center w-full h-56 border-2 border-slate-700 border-dashed rounded-2xl cursor-pointer bg-slate-900/50 hover:bg-slate-800 transition overflow-hidden relative"
              >
                {imagePreview ? (
                  <img src={imagePreview} className="w-full h-full object-cover opacity-60" />
                ) : (
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <span className="text-5xl mb-4">🖼️</span>
                    <p className="mb-2 text-sm text-slate-300 font-bold uppercase tracking-widest">{t('select_photo')}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-mono">{t('gallery_files_camera')}</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'IMAGE')} />
              </div>
              {imagePreview && <p className="text-cyan-400 text-[10px] font-black uppercase tracking-widest">{t('photo_loaded')} • {t('click_to_change')}</p>}
              
              {/* Campo de descrição para ajudar a IA */}
              <div className="w-full text-left">
                <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">
                  💡 {t('additional_description')}
                </label>
                <textarea
                  value={userDescription}
                  onChange={(e) => setUserDescription(e.target.value)}
                  placeholder={t('additional_description_placeholder')}
                  className="w-full h-24 bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500 transition resize-none"
                  data-testid="user-description-input"
                />
                <p className="text-[9px] text-slate-500 mt-1 font-mono">{t('additional_description_hint')}</p>
              </div>
            </div>
          )}

          {/* VIEW: UPLOAD AUDIO / PDF */}
          {(activeTab === 'UPLOAD_AUDIO' || activeTab === 'UPLOAD_PDF') && (
            <div className="w-full text-center">
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-700 border-dashed rounded-2xl cursor-pointer bg-slate-900/50 hover:bg-slate-800 transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <span className="text-4xl mb-4">{activeTab === 'UPLOAD_AUDIO' ? '🎵' : '📄'}</span>
                  <p className="mb-2 text-sm text-slate-300 font-bold uppercase tracking-widest">{activeTab === 'UPLOAD_AUDIO' ? t('upload_audio') : t('upload_pdf')}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-mono">{activeTab === 'UPLOAD_AUDIO' ? t('formats_audio') : t('formats_pdf')}</p>
                </div>
                <input type="file" className="hidden" accept={activeTab === 'UPLOAD_AUDIO' ? 'audio/*' : 'application/pdf'} onChange={(e) => handleFileChange(e, activeTab === 'UPLOAD_AUDIO' ? 'AUDIO' : 'PDF')} />
              </label>
              {filePreview && <p className="mt-4 text-cyan-400 text-[10px] font-black font-mono uppercase">{t('file')}: {filePreview}</p>}
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex justify-between items-center w-full mt-10 pt-8 border-t border-slate-800">
            <button 
              onClick={onCancel}
              className="px-6 py-3 text-slate-500 font-black text-[10px] hover:text-white transition uppercase tracking-widest"
            >
              {t('back')}
            </button>
            <button 
              onClick={handleProcess}
              disabled={(!audioBlob && !selectedFile) || isProcessing}
              className="px-10 py-4 bg-cyan-600 hover:bg-cyan-500 text-black font-black uppercase tracking-widest text-xs shadow-[0_15px_30px_rgba(6,182,212,0.3)] transition-all disabled:opacity-20 transform hover:-translate-y-1"
            >
              {isProcessing ? t('ai_analyzing') : `${t('analyze_briefing')} →`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
