
import React, { useState, useRef, useEffect } from 'react';
import { ExtractedInsights } from '../types';
import { useTranslation } from '../context/TranslationContext';

interface FloorPlanRoom {
  name: string;
  dimensions?: string;
  area_sqft?: number;
  features: string[];
  woodwork_potential: string[];
}

interface FloorPlanAnalysis {
  rooms: FloorPlanRoom[];
  total_bedrooms: number;
  total_bathrooms: number;
  layout_type: string;
  floor_level: string;
  questions_for_user: string[];
  woodwork_opportunities: any[];
  summary: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  suggestedActions?: string[];
}

interface Props {
  onCancel: () => void;
  onProjectReady: (insights: ExtractedInsights, roomPhoto: string) => void;
}

const API_URL = '/api';

export const FloorPlanAnalyzer: React.FC<Props> = ({ onCancel, onProjectReady }) => {
  const { t, language } = useTranslation();
  const [step, setStep] = useState<'UPLOAD' | 'ANALYZING' | 'RESULTS' | 'CHAT'>('UPLOAD');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileMimeType, setFileMimeType] = useState<string>('image/jpeg');
  const [fileName, setFileName] = useState<string>('');
  const [analysis, setAnalysis] = useState<FloorPlanAnalysis | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Translated messages based on language
  const getAnalysisMessage = (roomCount: number, questions: string[]) => {
    const messages = {
      pt: `Analisei a planta baixa! Encontrei ${roomCount} cômodos.\n\nTenho algumas dúvidas para confirmar:\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`,
      en: `I analyzed the floor plan! Found ${roomCount} rooms.\n\nI have some questions to confirm:\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`,
      es: `¡Analicé el plano de planta! Encontré ${roomCount} habitaciones.\n\nTengo algunas preguntas para confirmar:\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
    };
    return messages[language] || messages.pt;
  };

  const getWelcomeMessage = (roomCount: number, summary: string) => {
    const messages = {
      pt: `Olá! Analisei sua planta baixa e encontrei ${roomCount} cômodos com potencial para marcenaria.\n\n**Resumo:** ${summary}\n\nQual cômodo você gostaria de trabalhar? Ou tem alguma dúvida sobre a análise?`,
      en: `Hello! I analyzed your floor plan and found ${roomCount} rooms with woodworking potential.\n\n**Summary:** ${summary}\n\nWhich room would you like to work on? Or do you have any questions about the analysis?`,
      es: `¡Hola! Analicé su plano de planta y encontré ${roomCount} habitaciones con potencial para carpintería.\n\n**Resumen:** ${summary}\n\n¿En qué habitación le gustaría trabajar? ¿O tiene alguna pregunta sobre el análisis?`
    };
    return messages[language] || messages.pt;
  };

  const getWorkOnRoomText = (roomName: string) => {
    const messages = {
      pt: `Trabalhar no ${roomName}`,
      en: `Work on ${roomName}`,
      es: `Trabajar en ${roomName}`
    };
    return messages[language] || messages.pt;
  };

  const getErrorMessage = () => {
    const messages = {
      pt: 'Desculpe, houve um erro ao processar sua mensagem. Tente novamente.',
      en: 'Sorry, there was an error processing your message. Please try again.',
      es: 'Lo siento, hubo un error al procesar su mensaje. Por favor, intente de nuevo.'
    };
    return messages[language] || messages.pt;
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isPDF = file.type === 'application/pdf';
      setFileName(file.name);
      setFileMimeType(file.type || (isPDF ? 'application/pdf' : 'image/jpeg'));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        
        if (isPDF) {
          // For PDFs, show a placeholder preview and store the base64 data
          setImagePreview(''); // No image preview for PDFs
          const base64 = result.split(',')[1];
          setFileBase64(base64);
        } else {
          // For images, show preview
          setImagePreview(result);
          const base64 = result.split(',')[1];
          setFileBase64(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeFloorPlan = async () => {
    if (!fileBase64) return;
    
    setStep('ANALYZING');
    setIsProcessing(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/floorplan/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: fileBase64,
          mimeType: fileMimeType,
          language: language
        })
      });
      
      if (!response.ok) {
        throw new Error(t('error'));
      }
      
      const result = await response.json();
      
      if (result.status === 'success') {
        setAnalysis(result.data);
        setSessionId(result.sessionId);
        setStep('RESULTS');
        
        if (result.data.questions_for_user?.length > 0) {
          setChatMessages([{
            role: 'assistant',
            content: getAnalysisMessage(result.data.rooms?.length || 0, result.data.questions_for_user),
            suggestedActions: result.data.questions_for_user
          }]);
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setStep('UPLOAD');
    } finally {
      setIsProcessing(false);
    }
  };

  const sendChatMessage = async (message: string) => {
    if (!message.trim() || isProcessing) return;
    
    const userMessage: ChatMessage = { role: 'user', content: message };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsProcessing(true);
    
    try {
      const response = await fetch(`${API_URL}/floorplan/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message,
          floorPlanAnalysis: analysis,
          imageBase64: imageBase64,
          language: language
        })
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: result.data.message,
          suggestedActions: result.data.suggestedActions
        };
        setChatMessages(prev => [...prev, assistantMessage]);
        
        if (result.data.updatedAnalysis) {
          setAnalysis(prev => ({ ...prev, ...result.data.updatedAnalysis }));
        }
        
        if (result.data.readyToCreateProject) {
          handleRoomSelection(
            result.data.readyToCreateProject.roomName,
            result.data.readyToCreateProject.woodworkType
          );
        }
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: getErrorMessage()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRoomSelection = async (roomName: string, woodworkType: string) => {
    setIsProcessing(true);
    
    try {
      const response = await fetch(`${API_URL}/floorplan/select-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          roomName,
          woodworkType,
          floorPlanAnalysis: analysis,
          language: language
        })
      });
      
      const result = await response.json();
      
      if (result.status === 'success') {
        const insights: ExtractedInsights = {
          clientName: result.data.clientName || 'Cliente',
          roomType: result.data.roomType,
          wallWidth: result.data.wallWidth,
          wallHeight: result.data.wallHeight,
          styleDescription: result.data.styleDescription,
          technicalBriefing: result.data.technicalBriefing,
          suggestedMaterials: result.data.suggestedMaterials,
          installationType: result.data.installationType,
          analysisStatus: result.data.analysisStatus
        };
        
        onProjectReady(insights, imagePreview);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const openChat = () => {
    setStep('CHAT');
    if (chatMessages.length === 0 && analysis) {
      setChatMessages([{
        role: 'assistant',
        content: getWelcomeMessage(analysis.rooms?.length || 0, analysis.summary),
        suggestedActions: analysis.rooms?.map(r => getWorkOnRoomText(r.name)) || []
      }]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-[#0F172A] border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="p-6 bg-slate-950 border-b border-cyan-900/30">
        <h2 className="text-2xl font-bold text-white tracking-widest uppercase">
          <span className="text-cyan-400">{t('floor_plan_analyzer')}</span>
        </h2>
        <p className="text-slate-500 text-xs font-mono mt-1">:: {t('import_arch_project')} ::</p>
      </div>

      {/* Step: UPLOAD */}
      {step === 'UPLOAD' && (
        <div className="p-10">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-full h-72 border-2 border-slate-700 border-dashed rounded-2xl cursor-pointer bg-slate-900/50 hover:bg-slate-800 transition overflow-hidden relative"
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} className="w-full h-full object-contain" alt={t('floor_plan')} />
                <div className="absolute bottom-4 left-4 right-4 bg-black/80 p-3 rounded-lg">
                  <p className="text-cyan-400 text-xs font-bold">{t('plan_loaded')} • {t('click_to_change')}</p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <span className="text-6xl mb-6">📐</span>
                <p className="mb-2 text-lg text-slate-300 font-bold uppercase tracking-widest">{t('upload_floor_plan')}</p>
                <p className="text-sm text-slate-500">{t('accepted_formats')}</p>
                <p className="text-xs text-slate-600 mt-4 max-w-md text-center">
                  {t('ai_will_analyze')}
                </p>
              </div>
            )}
            <input 
              ref={fileInputRef} 
              type="file" 
              className="hidden" 
              accept="image/*,.pdf" 
              onChange={handleFileChange} 
            />
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-800">
            <button 
              onClick={onCancel}
              className="px-6 py-3 text-slate-500 font-black text-[10px] hover:text-white transition uppercase tracking-widest"
            >
              {t('back')}
            </button>
            <button 
              onClick={analyzeFloorPlan}
              disabled={!imageBase64}
              className="px-10 py-4 bg-cyan-600 hover:bg-cyan-500 text-black font-black uppercase tracking-widest text-xs shadow-[0_15px_30px_rgba(6,182,212,0.3)] transition-all disabled:opacity-20 transform hover:-translate-y-1"
            >
              {t('analyze_plan')} →
            </button>
          </div>
        </div>
      )}

      {/* Step: ANALYZING */}
      {step === 'ANALYZING' && (
        <div className="p-16 flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-20 h-20 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-8"></div>
          <p className="text-white font-bold text-lg uppercase tracking-widest mb-2">{t('analyzing_floor_plan')}</p>
          <p className="text-slate-500 text-sm font-mono">{t('extracting_rooms')}</p>
        </div>
      )}

      {/* Step: RESULTS */}
      {step === 'RESULTS' && analysis && (
        <div className="p-8">
          {/* Summary Card */}
          <div className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 p-6 rounded-xl border border-cyan-500/30 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-white font-bold text-lg mb-2">{t('analysis_complete')}</h3>
                <p className="text-slate-400 text-sm">{analysis.summary}</p>
              </div>
              <div className="flex gap-4 text-center">
                <div className="bg-black/40 px-4 py-2 rounded-lg">
                  <p className="text-2xl font-bold text-cyan-400">{analysis.total_bedrooms}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{t('bedrooms')}</p>
                </div>
                <div className="bg-black/40 px-4 py-2 rounded-lg">
                  <p className="text-2xl font-bold text-purple-400">{analysis.total_bathrooms}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{t('bathrooms')}</p>
                </div>
                <div className="bg-black/40 px-4 py-2 rounded-lg">
                  <p className="text-2xl font-bold text-green-400">{analysis.rooms?.length || 0}</p>
                  <p className="text-[10px] text-slate-500 uppercase">{t('rooms')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Questions Alert */}
          {analysis.questions_for_user?.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 p-4 rounded-xl mb-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">💬</span>
                <h4 className="text-yellow-400 font-bold uppercase text-sm">{t('questions_to_confirm')}</h4>
              </div>
              <ul className="space-y-2">
                {analysis.questions_for_user.map((q, i) => (
                  <li key={i} className="text-yellow-200 text-sm flex items-start gap-2">
                    <span className="text-yellow-500">•</span>
                    {q}
                  </li>
                ))}
              </ul>
              <button 
                onClick={openChat}
                className="mt-4 px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold text-xs uppercase rounded-lg transition"
              >
                {t('answer_questions')} →
              </button>
            </div>
          )}

          {/* Rooms Grid */}
          <h4 className="text-white font-bold uppercase text-sm mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
            {t('rooms_identified')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {analysis.rooms?.map((room, index) => (
              <div 
                key={index}
                onClick={() => setSelectedRoom(room.name)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedRoom === room.name 
                    ? 'bg-cyan-900/30 border-cyan-500' 
                    : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h5 className="text-white font-bold">{room.name}</h5>
                  {room.dimensions && (
                    <span className="text-xs text-cyan-400 font-mono bg-cyan-900/30 px-2 py-1 rounded">
                      {room.dimensions}
                    </span>
                  )}
                </div>
                
                {room.features?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {room.features.slice(0, 3).map((f, i) => (
                      <span key={i} className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
                
                {room.woodwork_potential?.length > 0 && (
                  <div className="border-t border-slate-700 pt-3 mt-3">
                    <p className="text-[10px] text-purple-400 uppercase font-bold mb-2">{t('woodwork_opportunities')}:</p>
                    <div className="flex flex-wrap gap-1">
                      {room.woodwork_potential.map((w, i) => (
                        <span key={i} className="text-[10px] text-purple-300 bg-purple-900/30 px-2 py-0.5 rounded">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-800">
            <button 
              onClick={() => setStep('UPLOAD')}
              className="px-6 py-3 text-slate-500 font-black text-[10px] hover:text-white transition uppercase tracking-widest"
            >
              ← {t('new_plan')}
            </button>
            <div className="flex gap-4">
              <button 
                onClick={openChat}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold uppercase tracking-widest text-xs rounded-lg transition"
              >
                💬 {t('chat_with_ai')}
              </button>
              {selectedRoom && (
                <button 
                  onClick={() => handleRoomSelection(selectedRoom, 'Armários')}
                  disabled={isProcessing}
                  className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-black uppercase tracking-widest text-xs shadow-lg transition disabled:opacity-50"
                >
                  {isProcessing ? t('processing') : `${t('create_project_room')}: ${selectedRoom} →`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step: CHAT */}
      {step === 'CHAT' && (
        <div className="flex flex-col h-[600px]">
          {/* Chat Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold">
                IA
              </div>
              <div>
                <h4 className="text-white font-bold text-sm">{t('soma_assistant')}</h4>
                <p className="text-slate-500 text-xs">{t('floor_plan_analysis')}</p>
              </div>
            </div>
            <button 
              onClick={() => setStep('RESULTS')}
              className="text-slate-500 hover:text-white text-xs uppercase tracking-widest"
            >
              {t('view_analysis')} →
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg, index) => (
              <div 
                key={index} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-cyan-600 text-white' 
                    : 'bg-slate-800 text-slate-200'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  
                  {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                      {msg.suggestedActions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => sendChatMessage(action)}
                          className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-slate-800 p-4 rounded-2xl">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage(chatInput)}
                placeholder={t('type_message')}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              <button
                onClick={() => sendChatMessage(chatInput)}
                disabled={!chatInput.trim() || isProcessing}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded-xl transition disabled:opacity-50"
              >
                {t('send')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
