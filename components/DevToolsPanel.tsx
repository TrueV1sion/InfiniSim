import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { ModelTier, ChatMessage } from '../types';

interface DevToolsPanelProps {
  isOpen: boolean;
  code: string;
  model: ModelTier;
  onApplyCode: (newCode: string) => void;
  onAiRefine: (instruction: string, modelOverride?: ModelTier) => Promise<void>;
  onClearCache: () => void;
  isGenerating: boolean;
  onClose: () => void;
  webContainerOutput?: string;
}

interface ConsoleLog {
  id: string;
  level: 'log' | 'error' | 'warn' | 'info';
  content: string[];
  timestamp: number;
}

const DevToolsPanel: React.FC<DevToolsPanelProps> = ({
  isOpen,
  code,
  model,
  onApplyCode,
  onAiRefine,
  onClearCache,
  isGenerating,
  onClose,
  webContainerOutput
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'ai' | 'terminal'>('ai');
  const [localCode, setLocalCode] = useState(code);
  const [debouncedCode, setDebouncedCode] = useState(code);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [bottomTab, setBottomTab] = useState<'problems' | 'console'>('problems');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  
  // Auto-save state
  const [hasDraft, setHasDraft] = useState(false);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'I am the architect of this simulation. What would you like to change?', timestamp: Date.now() }
  ]);
  
  // Linting & Console state
  const [issues, setIssues] = useState<Map<number, string>>(new Map());
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [consoleInput, setConsoleInput] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const onAiRefineRef = useRef(onAiRefine);

  useEffect(() => {
    onAiRefineRef.current = onAiRefine;
  }, [onAiRefine]);

  useEffect(() => {
    if (terminalRef.current && !xtermRef.current) {
      const term = new Terminal({
        theme: { background: '#050505' },
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 12,
        cursorBlink: true,
      });
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();
      
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;

      let currentLine = '';
      term.onData(e => {
        if (e === '\r') {
          // Enter
          term.write('\r\n');
          const input = currentLine.trim();
          if (input) {
            if (input.startsWith('claude ')) {
              onAiRefineRef.current(input.substring(7), 'claude');
            } else if (input.startsWith('gemini ')) {
              onAiRefineRef.current(input.substring(7), 'gemini');
            } else {
              term.write(`Command not found: ${input.split(' ')[0]}. Try 'claude <prompt>' or 'gemini <prompt>'\r\n`);
            }
          }
          currentLine = '';
          term.write('$ ');
        } else if (e === '\u007F') {
          // Backspace
          if (currentLine.length > 0) {
            currentLine = currentLine.substring(0, currentLine.length - 1);
            term.write('\b \b');
          }
        } else {
          currentLine += e;
          term.write(e);
        }
      });
      
      term.write('$ ');

      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
      });
      resizeObserver.observe(terminalRef.current);
      
      return () => resizeObserver.disconnect();
    }
  }, []);

  useEffect(() => {
    if (xtermRef.current && webContainerOutput) {
      xtermRef.current.clear();
      xtermRef.current.write(webContainerOutput.replace(/\n/g, '\r\n'));
      if (!webContainerOutput.endsWith('\n')) {
        xtermRef.current.write('\r\n');
      }
      xtermRef.current.write('$ ');
    }
  }, [webContainerOutput]);

  // --- Auto-Save Logic ---
  useEffect(() => {
    const saved = localStorage.getItem('infiniteWeb_draft');
    if (saved && saved !== code) {
      setHasDraft(true);
    } else {
      setHasDraft(false);
    }
  }, [code]);

  useEffect(() => {
    // Save draft if modified from original prop
    if (localCode !== code) {
      try {
        localStorage.setItem('infiniteWeb_draft', localCode);
        setHasDraft(true);
      } catch (e: any) {
        const isQuotaExceeded = e instanceof DOMException && (
          e.name === 'QuotaExceededError' ||
          e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          e.code === 22 ||
          e.code === 1014
        );
        if (isQuotaExceeded) {
          console.warn('Draft too large for localStorage, skipping save.');
        } else {
          console.error('Local storage error saving draft:', e);
        }
      }
    }
  }, [localCode, code]);

  const restoreDraft = () => {
    const saved = localStorage.getItem('infiniteWeb_draft');
    if (saved) {
      setLocalCode(saved);
      // If we restore, we trigger debounce/update immediately
      setDebouncedCode(saved);
    }
  };

  // --- Sync props ---
  useEffect(() => {
    // When incoming code changes (nav), reset local unless we want to persist draft?
    // Standard behavior: Navigation overrides draft for new page.
    setLocalCode(code);
    setDebouncedCode(code);
    setHasDraft(false); 
    localStorage.removeItem('infiniteWeb_draft');
    setConsoleLogs([]); // Clear logs on nav
  }, [code]);

  // --- Debounce for Preview ---
  useEffect(() => {
    if (!showLivePreview) return;
    const timer = setTimeout(() => {
        setDebouncedCode(localCode);
    }, 800); 
    return () => clearTimeout(timer);
  }, [localCode, showLivePreview]);

  // --- Scroll Helpers ---
  useEffect(() => {
    if (activeTab === 'ai') {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab]);

  useEffect(() => {
    if (bottomTab === 'console') {
      consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs, bottomTab]);

  // --- Linting ---
  useEffect(() => {
    const newIssues = new Map<number, string>();
    const lines = localCode.split('\n');
    let inStyleBlock = false;

    // Grid analysis state
    let isGridContainer = false;
    let hasGap = false;
    let hasTemplate = false;
    let hasAlignment = false;

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();

      if (trimmed.includes('<style')) inStyleBlock = true;
      if (trimmed.includes('</style>')) inStyleBlock = false;

      if (inStyleBlock) {
          // Detect start of rule block
          if (trimmed.includes('{')) {
              isGridContainer = false;
              hasGap = false;
              hasTemplate = false;
              hasAlignment = false;
          }

          // Existing simple checks
          if (trimmed.match(/^[a-zA-Z-]+:\s*[^;{}]+$/) && !trimmed.endsWith(';')) {
             newIssues.set(lineNum, 'CSS Error: Missing semicolon');
          }
          if (trimmed.match(/[^{]+\{\s*\}/)) {
             newIssues.set(lineNum, 'CSS Warning: Empty rule');
          }
          if (trimmed.match(/:\s*[1-9][0-9]*;/) && !trimmed.includes('#')) {
             newIssues.set(lineNum, 'CSS Warning: Missing unit (px, %, rem)');
          }

          // --- CSS Grid Analysis ---
          if (trimmed.match(/display:\s*(grid|inline-grid)/)) {
              isGridContainer = true;
          }

          if (isGridContainer) {
              if (trimmed.match(/grid-gap|gap:/)) hasGap = true;
              if (trimmed.match(/grid-template/)) hasTemplate = true;
              if (trimmed.match(/align-|justify-|place-/)) hasAlignment = true;

              // Check grid-template-areas syntax
              if (trimmed.includes('grid-template-areas:')) {
                  if (!trimmed.includes('"') && !trimmed.includes("'")) {
                       newIssues.set(lineNum, 'CSS Grid Hint: grid-template-areas should use quoted strings.');
                  }
              }
          }

          // End of rule block analysis
          if (trimmed.includes('}')) {
              if (isGridContainer) {
                   const hints = [];
                   if (!hasTemplate) hints.push("'grid-template-columns/rows'");
                   if (!hasGap) hints.push("'gap'");
                   if (!hasAlignment) hints.push("alignment (e.g. 'align-items')");
                   
                   if (hints.length > 0) {
                       newIssues.set(lineNum, `CSS Grid Suggestion: Consider adding ${hints.join(', ')}.`);
                   }
              }
              // Reset
              isGridContainer = false;
          }
      }
      if (trimmed.includes('<img') && !trimmed.includes('alt=')) {
          newIssues.set(lineNum, 'A11y Warning: Image missing alt text');
      }
    });
    setIssues(newIssues);
  }, [localCode]);

  // --- Console Integration ---
  
  // Inject console interceptor script
  const previewContent = useMemo(() => {
    if (!showLivePreview) return '';
    const script = `
      <script>
        (function() {
          function sendLog(level, args) {
            try {
              window.parent.postMessage({
                type: 'DEVTOOLS_CONSOLE_LOG',
                level,
                payload: args.map(a => {
                  try { 
                    if (typeof a === 'object') return JSON.stringify(a);
                    return String(a);
                  } catch(e) { return String(a); }
                })
              }, '*');
            } catch(e) {}
          }
          
          ['log', 'error', 'warn', 'info'].forEach(level => {
             const original = console[level];
             console[level] = (...args) => {
               original.apply(console, args);
               sendLog(level, args);
             };
          });
          
          window.addEventListener('error', (e) => {
             sendLog('error', [e.message]);
          });

          window.addEventListener('message', (e) => {
             if (e.data && e.data.type === 'DEVTOOLS_EXEC_JS') {
                try {
                  const result = window.eval(e.data.code);
                  console.log(result);
                } catch(err) {
                  console.error(err.message);
                }
             }
          });
        })();
      </script>
    `;
    // Insert after <head> or at start
    return debouncedCode.replace('<head>', '<head>' + script);
  }, [debouncedCode, showLivePreview]);

  // Listen for console logs
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'DEVTOOLS_CONSOLE_LOG') {
         const newLog: ConsoleLog = {
           id: Math.random().toString(36).substr(2, 9),
           level: e.data.level,
           content: e.data.payload,
           timestamp: Date.now()
         };
         setConsoleLogs(prev => [...prev, newLog]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConsoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consoleInput.trim()) return;
    
    // Send to iframe
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'DEVTOOLS_EXEC_JS',
        code: consoleInput
      }, '*');
      
      // Echo input
      setConsoleLogs(prev => [...prev, {
        id: Math.random().toString(),
        level: 'info',
        content: [`> ${consoleInput}`],
        timestamp: Date.now()
      }]);
    } else {
      setConsoleLogs(prev => [...prev, {
        id: Math.random().toString(),
        level: 'warn',
        content: ['Live Preview not active. Enable it to run commands.'],
        timestamp: Date.now()
      }]);
    }
    setConsoleInput('');
  };

  const handleManualApply = () => {
    onApplyCode(localCode);
    localStorage.removeItem('infiniteWeb_draft');
    setHasDraft(false);
  };

  const handleChatSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = editorRef.current?.innerHTML || '';
    const textContent = editorRef.current?.textContent || '';
    if (!textContent.trim() || isGenerating) return;

    const userMsg: ChatMessage = { role: 'user', content: content, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
    setChatInput('');

    try {
      await onAiRefine(content);
      const aiMsg: ChatMessage = { 
        role: 'assistant', 
        content: `I've updated the page based on your request. Check the preview.`, 
        timestamp: Date.now() 
      };
      setChatHistory(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = { 
        role: 'assistant', 
        content: 'I encountered an error trying to modify the matrix.', 
        timestamp: Date.now() 
      };
      setChatHistory(prev => [...prev, errorMsg]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  };

  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const lineCount = useMemo(() => localCode.split('\n').length, [localCode]);

  if (!isOpen) return null;

  return (
    <div className="w-[500px] flex flex-col border-l border-glassBorder bg-[#0a0a0a] h-full shadow-2xl transition-all duration-300">
      {/* Tabs */}
      <div className="flex border-b border-glassBorder bg-[#0f0f0f] items-center pr-2">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'ai' ? 'text-blue-400 border-b-2 border-blue-400 bg-white/5' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          AI Architect
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'code' ? 'text-purple-400 border-b-2 border-purple-400 bg-white/5' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
          Source Code
          {(issues.size > 0 || consoleLogs.filter(l => l.level === 'error').length > 0) && (
            <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded-full border border-yellow-500/30">
                {issues.size + consoleLogs.filter(l => l.level === 'error').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'terminal' ? 'text-green-400 border-b-2 border-green-400 bg-white/5' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          Terminal
        </button>
        <button 
          onClick={() => {
            if (window.confirm('Are you sure you want to clear the AI context cache? This will reset the virtual state for this session.')) {
              onClearCache();
              setChatHistory(prev => [...prev, { role: 'assistant', content: 'Context cache cleared. Starting fresh.', timestamp: Date.now() }]);
            }
          }} 
          className="text-gray-500 hover:text-red-400 transition-colors p-1.5 hover:bg-white/10 rounded-md ml-2"
          title="Clear AI Context Cache"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
        <button
          onClick={handleManualApply}
          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-medium transition-colors shadow-lg shadow-purple-900/20 ml-2"
        >
          Apply Changes
        </button>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-md ml-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        
        {/* AI Tab */}
        <div className={`absolute inset-0 flex flex-col ${activeTab === 'ai' ? 'z-10 bg-[#0a0a0a]' : 'z-0 invisible'}`}>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-[#1a1a1a] text-gray-200 border border-glassBorder rounded-bl-none'
                  }`}
                  dangerouslySetInnerHTML={{ __html: msg.content }}
                />
              </div>
            ))}
            {isGenerating && (
               <div className="flex justify-start">
                  <div className="bg-[#1a1a1a] px-4 py-3 rounded-2xl rounded-bl-none border border-glassBorder flex gap-2 items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100"></span>
                  </div>
               </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-glassBorder bg-[#0f0f0f] flex flex-col gap-2">
            <div className="flex gap-1 px-1">
              <button 
                type="button"
                onClick={() => document.execCommand('bold', false)}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors font-serif font-bold"
                title="Bold"
              >
                B
              </button>
              <button 
                type="button"
                onClick={() => document.execCommand('italic', false)}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors font-serif italic"
                title="Italic"
              >
                I
              </button>
            </div>
            <div className="relative">
              <div
                ref={editorRef}
                contentEditable={!isGenerating}
                onKeyDown={handleKeyDown}
                onInput={(e) => setChatInput(e.currentTarget.textContent || '')}
                className="w-full bg-[#1a1a1a] text-white rounded-lg pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 border border-glassBorder min-h-[46px] max-h-[150px] overflow-y-auto whitespace-pre-wrap break-words"
              />
              {!chatInput && (
                <div className="absolute left-4 top-3 text-gray-600 pointer-events-none text-sm">
                  Ask AI to make changes...
                </div>
              )}
              <button
                type="button"
                onClick={() => handleChatSubmit()}
                disabled={!chatInput.trim() || isGenerating}
                className="absolute right-2 bottom-2 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Code Tab */}
        <div className={`absolute inset-0 flex flex-col ${activeTab === 'code' ? 'z-10 bg-[#0a0a0a]' : 'z-0 invisible'}`}>
           <div className={`flex relative transition-all duration-300 ${showLivePreview ? 'h-1/2 border-b border-glassBorder' : 'flex-1'}`}>
             {/* Line Numbers */}
             <div 
                ref={lineNumbersRef}
                className="w-12 bg-[#0f0f0f] text-gray-600 text-[10px] leading-5 font-mono text-right pr-2 pt-4 pb-4 select-none overflow-hidden border-r border-glassBorder shrink-0"
             >
                {Array.from({ length: lineCount }).map((_, i) => {
                   const lineNum = i + 1;
                   const hasIssue = issues.has(lineNum);
                   return (
                     <div key={i} className={`relative ${hasIssue ? 'text-yellow-500 font-bold' : ''}`}>
                       {lineNum}
                       {hasIssue && <div className="absolute right-full mr-1 top-0 text-yellow-500">●</div>}
                     </div>
                   );
                })}
             </div>

             {/* Editor */}
             <textarea
               ref={textareaRef}
               value={localCode}
               onChange={(e) => setLocalCode(e.target.value)}
               onScroll={handleScroll}
               className="flex-1 w-full h-full bg-[#0a0a0a] text-green-400 font-mono text-[10px] leading-5 p-4 resize-none outline-none border-none whitespace-pre"
               spellCheck="false"
             />
           </div>

           {/* Live Preview Pane */}
           {showLivePreview && (
             <div className="flex-1 bg-[#1a1a1a] relative overflow-hidden flex flex-col items-center">
                {/* Device Toolbar */}
                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-[#0f0f0f] border border-glassBorder rounded-full p-1 z-20 shadow-xl backdrop-blur-md">
                    <button
                    onClick={() => setPreviewMode('mobile')}
                    className={`p-1.5 rounded-full transition-colors ${previewMode === 'mobile' ? 'text-blue-400 bg-white/10' : 'text-gray-400 hover:text-white'}`}
                    title="Mobile (375px)"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    </button>
                    <button
                    onClick={() => setPreviewMode('tablet')}
                    className={`p-1.5 rounded-full transition-colors ${previewMode === 'tablet' ? 'text-blue-400 bg-white/10' : 'text-gray-400 hover:text-white'}`}
                    title="Tablet (768px)"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                    </button>
                    <button
                    onClick={() => setPreviewMode('desktop')}
                    className={`p-1.5 rounded-full transition-colors ${previewMode === 'desktop' ? 'text-blue-400 bg-white/10' : 'text-gray-400 hover:text-white'}`}
                    title="Desktop (100%)"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>
                
                {/* Iframe Wrapper */}
                <div className={`transition-all duration-300 ease-in-out border-x border-glassBorder shadow-2xl bg-white mt-0 h-full overflow-hidden
                    ${previewMode === 'mobile' ? 'w-[375px]' : ''}
                    ${previewMode === 'tablet' ? 'w-[768px]' : ''}
                    ${previewMode === 'desktop' ? 'w-full' : ''}
                `}>
                    <iframe 
                    ref={iframeRef}
                    srcdoc={previewContent} 
                    className="w-full h-full border-none" 
                    title="Live Preview"
                    sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
                    />
                </div>
             </div>
           )}
           
           {/* Bottom Panel (Tabs for Problems/Console) */}
           <div className="bg-[#111] border-t border-glassBorder flex flex-col shrink-0 max-h-[200px] h-[160px]">
             {/* Bottom Panel Tabs */}
             <div className="flex bg-[#0f0f0f] border-b border-glassBorder">
                <button 
                  onClick={() => setBottomTab('problems')}
                  className={`px-4 py-1.5 text-xs font-medium flex items-center gap-2 border-r border-glassBorder ${bottomTab === 'problems' ? 'bg-[#1a1a1a] text-yellow-500' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Problems ({issues.size})
                </button>
                <button 
                  onClick={() => setBottomTab('console')}
                  className={`px-4 py-1.5 text-xs font-medium flex items-center gap-2 border-r border-glassBorder ${bottomTab === 'console' ? 'bg-[#1a1a1a] text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Console {consoleLogs.length > 0 && `(${consoleLogs.length})`}
                </button>
             </div>

             {/* Bottom Panel Content */}
             <div className="flex-1 overflow-y-auto">
                {bottomTab === 'problems' && (
                   <div className="divide-y divide-white/5">
                     {issues.size === 0 && <div className="p-4 text-xs text-gray-600 italic">No problems detected.</div>}
                     {Array.from(issues.entries()).map(([line, msg]) => (
                       <div key={line} className="px-4 py-1.5 text-[10px] text-gray-400 hover:bg-white/5 flex gap-2 cursor-pointer"
                            onClick={() => { if(textareaRef.current) textareaRef.current.scrollTop = (line - 1) * 20; }}
                       >
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
                        <input 
                           type="text" 
                           value={consoleInput}
                           onChange={(e) => setConsoleInput(e.target.value)}
                           className="flex-1 bg-transparent text-gray-200 text-xs font-mono outline-none"
                           placeholder="Run JS in preview context..."
                        />
                     </form>
                  </div>
                )}
             </div>
           </div>

           {/* Toolbar */}
           <div className="p-3 border-t border-glassBorder bg-[#0f0f0f] flex items-center justify-between shrink-0">
             {/* Left: Toggles */}
             <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-gray-200 transition-colors select-none">
                 <div className={`w-8 h-4 rounded-full relative transition-colors ${showLivePreview ? 'bg-blue-600' : 'bg-gray-700'}`}>
                     <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showLivePreview ? 'left-4.5 translate-x-0.5' : 'left-0.5'}`}></div>
                 </div>
                 Live Preview
                 <input 
                     type="checkbox" 
                     className="hidden"
                     checked={showLivePreview}
                     onChange={(e) => setShowLivePreview(e.target.checked)}
                 />
             </label>

             {/* Right: Actions */}
             <div className="flex gap-2 items-center">
                <span className="text-[10px] text-gray-600 mr-2">
                   {hasDraft ? 'Unsaved changes' : 'Saved'}
                </span>
                
                {hasDraft && (
                  <button
                   onClick={restoreDraft}
                   className="px-3 py-1.5 rounded text-xs font-medium text-orange-400 hover:text-orange-300 border border-orange-500/20 hover:bg-orange-500/10 transition-colors"
                  >
                   Restore Draft
                  </button>
                )}

                <button
                onClick={() => setLocalCode(code)}
                className="px-3 py-1.5 rounded text-xs font-medium text-gray-400 hover:text-white transition-colors"
                >
                Reset
                </button>
             </div>
           </div>
        </div>

        {/* Terminal Tab */}
        <div className={`absolute inset-0 flex flex-col ${activeTab === 'terminal' ? 'z-10 bg-[#0a0a0a]' : 'z-0 invisible'}`}>
          <div className="flex-1 overflow-hidden p-2 bg-[#050505]" ref={terminalRef}></div>
        </div>

      </div>
    </div>
  );
};

export default DevToolsPanel;