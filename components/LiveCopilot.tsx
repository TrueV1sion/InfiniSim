import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';

interface LiveCopilotProps {
  onNavigate: (url: string) => void;
  onScroll: (direction: 'up' | 'down') => void;
  onReadPage: () => string;
}

export const LiveCopilot: React.FC<LiveCopilotProps> = ({ onNavigate, onScroll, onReadPage }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  const startCopilot = async () => {
    setIsConnecting(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key not found");

      const ai = new GoogleGenAI({ apiKey });

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextPlayTimeRef.current = audioContextRef.current.currentTime;

      const navigateFunc: FunctionDeclaration = {
        name: "navigate",
        description: "Navigate the browser to a specific URL or search query.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: { type: Type.STRING, description: "The URL or search query to navigate to." }
          },
          required: ["url"]
        }
      };

      const scrollFunc: FunctionDeclaration = {
        name: "scroll",
        description: "Scroll the current page up or down.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            direction: { type: Type.STRING, description: "Direction to scroll: 'up' or 'down'." }
          },
          required: ["direction"]
        }
      };

      const readPageFunc: FunctionDeclaration = {
        name: "readPage",
        description: "Read the content of the current page.",
        parameters: {
          type: Type.OBJECT,
          properties: {}
        }
      };

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }
          },
          systemInstruction: "You are the InfiniteWeb Copilot, a helpful AI assistant built directly into the browser. You can navigate to URLs, scroll the page, and read the page content to help the user. Be concise and conversational.",
          tools: [{ functionDeclarations: [navigateFunc, scrollFunc, readPageFunc] }]
        },
        callbacks: {
          onopen: async () => {
            setIsConnecting(false);
            setIsActive(true);
            
            // Start microphone
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
            const source = audioContextRef.current!.createMediaStreamSource(mediaStreamRef.current);
            processorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
              }
              const buffer = new ArrayBuffer(pcm16.length * 2);
              const view = new DataView(buffer);
              for (let i = 0; i < pcm16.length; i++) {
                view.setInt16(i * 2, pcm16[i], true);
              }
              const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
            
            source.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              const binaryString = atob(base64Audio);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              const int16Array = new Int16Array(bytes.buffer);
              const float32Array = new Float32Array(int16Array.length);
              for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 0x7FFF;
              }
              
              const audioBuffer = audioContextRef.current!.createBuffer(1, float32Array.length, 24000);
              audioBuffer.getChannelData(0).set(float32Array);
              
              const source = audioContextRef.current!.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContextRef.current!.destination);
              
              const playTime = Math.max(audioContextRef.current!.currentTime, nextPlayTimeRef.current);
              source.start(playTime);
              nextPlayTimeRef.current = playTime + audioBuffer.duration;
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              nextPlayTimeRef.current = audioContextRef.current!.currentTime;
            }

            // Handle tool calls
            if (message.toolCall) {
              const responses = message.toolCall.functionCalls.map(call => {
                let result: any = { success: true };
                try {
                  if (call.name === 'navigate') {
                    const args = call.args as any;
                    onNavigate(args.url);
                    result = { status: `Navigating to ${args.url}` };
                  } else if (call.name === 'scroll') {
                    const args = call.args as any;
                    onScroll(args.direction);
                    result = { status: `Scrolled ${args.direction}` };
                  } else if (call.name === 'readPage') {
                    result = { content: onReadPage() };
                  }
                } catch (e: any) {
                  result = { error: e.message };
                }
                return {
                  id: call.id,
                  name: call.name,
                  response: result
                };
              });

              sessionPromise.then(session => {
                session.sendToolResponse({ functionResponses: responses });
              });
            }
          },
          onclose: () => {
            stopCopilot();
          },
          onerror: (e) => {
            console.error("Live API Error:", e);
            stopCopilot();
          }
        }
      });
      
      sessionRef.current = sessionPromise;
    } catch (e) {
      console.error("Failed to start copilot:", e);
      setIsConnecting(false);
    }
  };

  const stopCopilot = () => {
    setIsActive(false);
    setIsConnecting(false);
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close()).catch(() => {});
      sessionRef.current = null;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <button
        onClick={isActive ? stopCopilot : startCopilot}
        disabled={isConnecting}
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 ${
          isActive 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse shadow-red-500/50' 
            : isConnecting 
              ? 'bg-blue-500/50 cursor-wait' 
              : 'bg-gradient-to-tr from-blue-600 to-purple-600 hover:scale-110 shadow-purple-500/30'
        }`}
      >
        {isConnecting ? (
          <svg className="w-6 h-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : isActive ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /></svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
        )}
      </button>
      {isActive && (
        <div className="absolute bottom-16 right-0 bg-[#111] border border-white/10 rounded-xl p-3 shadow-2xl w-48 text-center">
          <p className="text-xs text-blue-400 font-mono animate-pulse">Copilot Listening...</p>
        </div>
      )}
    </div>
  );
};
