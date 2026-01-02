
import React, { useEffect, useRef, useState } from 'react';
import { LiveService } from '../services/liveService';
import { Project } from '../types';

interface Props {
  project: Project;
  onUpdateProject: (updates: Partial<Project>) => void;
}

// Funções de utilidade manuais conforme diretrizes do SDK para evitar estouro de pilha
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const LiveAssistant: React.FC<Props> = ({ project, onUpdateProject }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = audioContext;

      const sessionPromise = LiveService.connect({
        onOpen: async () => {
          setIsActive(true);
          setIsConnecting(false);
          
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const source = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          
          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
            }
            
            const pcmBase64 = encode(new Uint8Array(int16.buffer));
            
            sessionPromise.then(s => {
                s.sendRealtimeInput({
                    media: {
                        data: pcmBase64,
                        mimeType: 'audio/pcm;rate=16000'
                    }
                });
            });
          };
          
          source.connect(processor);
          processor.connect(audioContext.destination);
        },
        onMessage: async (msg) => {
          const audioBase64 = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioBase64 && audioContextRef.current) {
            const bytes = decode(audioBase64);
            const dataInt16 = new Int16Array(bytes.buffer);
            const buffer = audioContextRef.current.createBuffer(1, dataInt16.length, 24000);
            const channelData = buffer.getChannelData(0);
            for (let i = 0; i < dataInt16.length; i++) {
                channelData[i] = dataInt16[i] / 32768.0;
            }

            const source = audioContextRef.current.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContextRef.current.destination);
            
            const startTime = Math.max(nextStartTimeRef.current, audioContextRef.current.currentTime);
            source.start(startTime);
            nextStartTimeRef.current = startTime + buffer.duration;
          }
        },
        onToolCall: (calls) => {
          calls.forEach(call => {
            if (call.name === 'update_dimensions') {
              onUpdateProject({
                wallWidth: call.args.width || project.wallWidth,
                wallHeight: call.args.height || project.wallHeight,
                wallDepth: call.args.depth || project.wallDepth
              });
            }
            sessionPromise.then(s => s.sendToolResponse({
                functionResponses: { id: call.id, name: call.name, response: { result: "ok" } }
            }));
          });
        },
        onClose: () => setIsActive(false)
      });

      sessionRef.current = await sessionPromise;
    } catch (e) {
      console.error(e);
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsActive(false);
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <button
        onClick={isActive ? stopSession : startSession}
        disabled={isConnecting}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl border-2 ${
          isActive 
            ? 'bg-red-500 border-red-400 animate-pulse shadow-red-500/50' 
            : 'bg-cyan-600 border-cyan-400 hover:scale-110 shadow-cyan-500/50'
        } ${isConnecting ? 'opacity-50 grayscale' : ''}`}
      >
        {isConnecting ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <span className="text-2xl">{isActive ? '⏹' : '🎙️'}</span>
        )}
      </button>
      {isActive && (
        <div className="absolute bottom-20 right-0 bg-black/80 border border-cyan-500/30 p-3 rounded-lg backdrop-blur-md min-w-[200px] animate-fade-in">
          <p className="text-[10px] font-mono text-cyan-400 uppercase mb-1">Live Assistant Active</p>
          <div className="flex gap-1 h-4 items-end">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex-1 bg-cyan-500 rounded-t animate-bounce" style={{ animationDelay: `${i*0.1}s`, height: `${Math.random()*100}%` }}></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
