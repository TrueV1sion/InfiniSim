import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { ModelTier, ChatMessage } from '../types';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

interface DevToolsPanelProps {
  isOpen: boolean;
  code: string;
  model: ModelTier;
  onApplyCode: (newCode: string) => void;
  onAiRefine: (instruction: string) => Promise<void>;
  isGenerating: boolean;
  onClose: () => void;
}

interface ConsoleLog {
  id: string;
  level: 'log' | 'error' | 'warn' | 'info';
  content: string[];
  timestamp: number;
}

const DevToolsPanel: React.FC<DevToolsPanelProps> = ({
  isOpen, code, model, onApplyCode, onAiRefine, isGenerating, onClose
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'ai'>('ai');
  const [localCode, setLocalCode] = useState(code);
  const [debouncedCode, setDebouncedCode] = useState(code);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [bottomTab, setBottomTab] = useState<'problems' | 'console'>('problems');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [hasDraft, setHasDraft] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'I am the architect of this simulation. What would you like to change?', timestamp: Date.now() }
  ]);
  const [issues, setIssues] = useState<Map<number, string>>(new Map());
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [consoleInput, setConsoleInput] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('infiniteWeb_draft');
    if (saved && saved !== code) setHasDraft(true);
    else setHasDraft(false);
  }, [code]);

  useEffect(() => {
    if (localCode !== code) {
      localStorage.setItem('infiniteWeb_draft', localCode);
      setHasDraft(true);
    }
  }, [localCode, code]);

  const restoreDraft = () => {
    const saved = localStorage.getItem('infiniteWeb_draft');
    if (saved) {
      setLocalCode(saved);
      setDebouncedCode(saved);
    }
  };

  useEffect(() => {
    setLocalCode(code);
    setDebouncedCode(code);
    setHasDraft(false);
    localStorage.removeItem('infiniteWeb_draft');
    setConsoleLogs([]);
  }, [code]);

  useEffect(() => {
    if (!showLivePreview) return;
    const timer = setTimeout(() => setDebouncedCode(localCode), 800);
    return () => clearTimeout(timer);
  }, [localCode, showLivePreview]);

  useEffect(() => {
    if (activeTab === 'ai') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, activeTab]);

  useEffect(() => {
    if (bottomTab === 'console') consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs, bottomTab]);

  useEffect(() => {
    const newIssues = new Map<number, string>();
    const lines = localCode.split('\n');
    let inStyleBlock = false;
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();
      if (trimmed.includes('<style')) inStyleBlock = true;
      if (trimmed.includes('</style>')) inStyleBlock = false;
      if (inStyleBlock) {
        if (trimmed.match(/^[a-zA-Z-]+:\s*[^;{}]+$/) && !trimmed.endsWith(';')) {
          newIssues.set(lineNum, 'CSS Error: Missing semicolon');
        }
        if (trimmed.match(/[^{]+\{\s*\}/)) {
          newIssues.set(lineNum, 'CSS Warning: Empty rule');
        }
      }
      if (trimmed.includes('<img') && !trimmed.includes('alt=')) {
        newIssues.set(lineNum, 'A11y Warning: Image missing alt text');
      }
    });
    setIssues(newIssues);
  }, [localCode]);

  const previewContent = useMemo(() => {
    if (!showLivePreview) return '';
    const script = `<script>(function(){function sendLog(l,a){try{window.parent.postMessage({type:'DEVTOOLS_CONSOLE_LOG',level:l,payload:a.map(function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}})}, '*')}catch(e){}}['log','error','warn','info'].forEach(function(l){var o=console[l];console[l]=function(){o.apply(console,arguments);sendLog(l,[].slice.call(arguments))}});window.addEventListener('error',function(e){sendLog('error',[e.message])});window.addEventListener('message',function(e){if(e.data&&e.data.type==='DEVTOOLS_EXEC_JS'){try{console.log(window.eval(e.data.code))}catch(err){console.error(err.message)}}})})()</script>`;
    return debouncedCode.replace('<head>', '<head>' + script);
  }, [debouncedCode, showLivePreview]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'DEVTOOLS_CONSOLE_LOG') {
        setConsoleLogs(prev => [...prev, {
          id: Math.random().toString(36).substr(2, 9),
          level: e.data.level,
          content: e.data.payload,
          timestamp: Date.now()
        }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConsoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consoleInput.trim()) return;
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'DEVTOOLS_EXEC_JS', code: consoleInput }, '*');
      setConsoleLogs(prev => [...prev, { id: Math.random().toString(), level: 'info', content: [`> ${consoleInput}`], timestamp: Date.now() }]);
    } else {
      setConsoleLogs(prev => [...prev, { id: Math.random().toString(), level: 'warn', content: ['Live Preview not active.'], timestamp: Date.now() }]);
    }
    setConsoleInput('');
  };

  const handleManualApply = () => {
    onApplyCode(localCode);
    localStorage.removeItem('infiniteWeb_draft');
    setHasDraft(false);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isGenerating) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    try {
      await onAiRefine(userMsg.content);
      setChatHistory(prev => [...prev, { role: 'assistant', content: `I've updated the page based on your request. Check the preview.`, timestamp: Date.now() }]);
    } catch {
      setChatHistory(prev => [...prev, { role: 'assistant', content: 'I encountered an error trying to modify the page.', timestamp: Date.now() }]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full sm:w-[500px] flex flex-col border-l border-glassBorder bg-[#0a0a0a] h-full shadow-2xl transition-all duration-300">
      <div className="flex border-b border-glassBorder bg-[#0f0f0f] items-center pr-2">
        <button onClick={() => setActiveTab('ai')} className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'ai' ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          AI Architect
        </button>
        <button onClick={() => setActiveTab('code')} className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'code' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          Source Code
          {(issues.size > 0 || consoleLogs.filter(l => l.level === 'error').length > 0) && (
            <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded-full border border-yellow-500/30">
              {issues.size + consoleLogs.filter(l => l.level === 'error').length}
            </span>
          )}
        </button>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-md ml-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        <div className={`absolute inset-0 flex flex-col ${activeTab === 'ai' ? 'z-10 bg-[#0a0a0a]' : 'z-0 invisible'}`}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[#1a1a1a] text-gray-200 border border-glassBorder rounded-bl-none'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="flex justify-start">
                <div className="bg-[#1a1a1a] px-4 py-3 rounded-2xl rounded-bl-none border border-glassBorder flex gap-2 items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChatSubmit} className="p-4 border-t border-glassBorder bg-[#0f0f0f]">
            <div className="relative">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask AI to make changes..." disabled={isGenerating} className="w-full bg-[#1a1a1a] text-white rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 border border-glassBorder placeholder-gray-600" />
              <button type="submit" disabled={!chatInput.trim() || isGenerating} className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          </form>
        </div>

        <div className={`absolute inset-0 flex flex-col ${activeTab === 'code' ? 'z-10 bg-[#0a0a0a]' : 'z-0 invisible'}`}>
          <div className={`flex relative transition-all duration-300 ${showLivePreview ? 'h-1/2 border-b border-glassBorder' : 'flex-1'}`}>
            <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-600 text-sm">Loading editor...</div>}>
              <MonacoEditor
                height="100%"
                defaultLanguage="html"
                value={localCode}
                onChange={(val) => setLocalCode(val || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 11,
                  lineNumbers: 'on',
                  wordWrap: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 8 },
                  renderWhitespace: 'none',
                  bracketPairColorization: { enabled: true },
                  suggest: { showWords: false },
                }}
              />
            </Suspense>
          </div>

          {showLivePreview && (
            <div className="flex-1 bg-[#1a1a1a] relative overflow-hidden flex flex-col items-center">
              <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-[#0f0f0f] border border-glassBorder rounded-full p-1 z-20 shadow-xl backdrop-blur-md">
                {(['mobile', 'tablet', 'desktop'] as const).map((mode) => (
                  <button key={mode} onClick={() => setPreviewMode(mode)} className={`p-1.5 rounded-full transition-colors ${previewMode === mode ? 'text-blue-400 bg-white/10' : 'text-gray-400 hover:text-white'}`} title={mode}>
                    {mode === 'mobile' && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                    {mode === 'tablet' && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
                    {mode === 'desktop' && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                  </button>
                ))}
              </div>
              <div className={`transition-all duration-300 ease-in-out border-x border-glassBorder shadow-2xl bg-white mt-0 h-full overflow-hidden ${previewMode === 'mobile' ? 'w-[375px]' : previewMode === 'tablet' ? 'w-[768px]' : 'w-full'}`}>
                <iframe ref={iframeRef} srcDoc={previewContent} className="w-full h-full border-none" title="Live Preview" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals" />
              </div>
            </div>
          )}

          <div className="bg-[#111] border-t border-glassBorder flex flex-col shrink-0 max-h-[200px] h-[160px]">
            <div className="flex bg-[#0f0f0f] border-b border-glassBorder">
              <button onClick={() => setBottomTab('problems')} className={`px-4 py-1.5 text-xs font-medium flex items-center gap-2 border-r border-glassBorder ${bottomTab === 'problems' ? 'bg-[#1a1a1a] text-yellow-500' : 'text-gray-500 hover:text-gray-300'}`}>
                Problems ({issues.size})
              </button>
              <button onClick={() => setBottomTab('console')} className={`px-4 py-1.5 text-xs font-medium flex items-center gap-2 border-r border-glassBorder ${bottomTab === 'console' ? 'bg-[#1a1a1a] text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
                Console {consoleLogs.length > 0 && `(${consoleLogs.length})`}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {bottomTab === 'problems' && (
                <div className="divide-y divide-white/5">
                  {issues.size === 0 && <div className="p-4 text-xs text-gray-600 italic">No problems detected.</div>}
                  {Array.from(issues.entries()).map(([line, msg]) => (
                    <div key={line} className="px-4 py-1.5 text-[10px] text-gray-400 hover:bg-white/5 flex gap-2 cursor-pointer">
                      <span className="font-mono text-gray-500">Ln {line}</span>
                      <span>{msg}</span>
                    </div>
                  ))}
                </div>
              )}
              {bottomTab === 'console' && (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px] space-y-1">
                    {consoleLogs.map((log) => (
                      <div key={log.id} className={`flex gap-2 border-b border-white/5 pb-1 ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-gray-300'}`}>
                        <span className="opacity-50 select-none">[{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}]</span>
                        <span className="whitespace-pre-wrap">{log.content.join(' ')}</span>
                      </div>
                    ))}
                    <div ref={consoleEndRef} />
                  </div>
                  <form onSubmit={handleConsoleSubmit} className="border-t border-glassBorder p-1 flex bg-[#0a0a0a]">
                    <span className="text-blue-500 px-2 font-mono text-sm">{'>'}</span>
                    <input type="text" value={consoleInput} onChange={(e) => setConsoleInput(e.target.value)} className="flex-1 bg-transparent text-gray-200 text-xs font-mono outline-none" placeholder="Run JS in preview context..." />
                  </form>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 border-t border-glassBorder bg-[#0f0f0f] flex items-center justify-between shrink-0">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-gray-200 transition-colors select-none">
              <div className={`w-8 h-4 rounded-full relative transition-colors ${showLivePreview ? 'bg-blue-600' : 'bg-gray-700'}`}>
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showLivePreview ? 'left-[18px]' : 'left-0.5'}`} />
              </div>
              Live Preview
              <input type="checkbox" className="hidden" checked={showLivePreview} onChange={(e) => setShowLivePreview(e.target.checked)} />
            </label>
            <div className="flex gap-2 items-center">
              <span className="text-[10px] text-gray-600 mr-2">{hasDraft ? 'Unsaved changes' : 'Saved'}</span>
              {hasDraft && (
                <button onClick={restoreDraft} className="px-3 py-1.5 rounded text-xs font-medium text-orange-400 hover:text-orange-300 border border-orange-500/20 hover:bg-orange-500/10 transition-colors">
                  Restore Draft
                </button>
              )}
              <button onClick={() => setLocalCode(code)} className="px-3 py-1.5 rounded text-xs font-medium text-gray-400 hover:text-white transition-colors">
                Reset
              </button>
              <button onClick={handleManualApply} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors shadow-lg shadow-blue-900/20">
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevToolsPanel;
