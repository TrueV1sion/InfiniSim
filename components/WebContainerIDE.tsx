import React, { useState, useEffect, useRef } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import Editor from '@monaco-editor/react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { readDir, readFile, writeFile, downloadProject } from '../services/webContainerService';
import { Download, Play, Save, File, Folder, ChevronRight, ChevronDown, RefreshCw, MessageSquare } from 'lucide-react';
import { ModelTier } from '../types';

interface FileNode {
  name: string;
  isDirectory: boolean;
  path: string;
  children?: FileNode[];
  isOpen?: boolean;
}

interface WebContainerIDEProps {
  webContainerUrl: string;
  onRestartServer: () => void;
  onChatRequest: (message: string, modelOverride?: ModelTier) => void;
  terminalOutput: string;
}

const WebContainerIDE: React.FC<WebContainerIDEProps> = ({ webContainerUrl, onRestartServer, onChatRequest, terminalOutput }) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [chatInput, setChatInput] = useState('');
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const onChatRequestRef = useRef(onChatRequest);

  useEffect(() => {
    onChatRequestRef.current = onChatRequest;
  }, [onChatRequest]);

  useEffect(() => {
    loadFiles('/');
  }, [webContainerUrl]);

  useEffect(() => {
    if (terminalRef.current && !xtermRef.current) {
      const term = new Terminal({
        theme: { background: '#1e1e1e' },
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
              onChatRequestRef.current(input.substring(7), 'claude');
            } else if (input.startsWith('gemini ')) {
              onChatRequestRef.current(input.substring(7), 'gemini');
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
    if (xtermRef.current && terminalOutput) {
      xtermRef.current.clear();
      xtermRef.current.write(terminalOutput.replace(/\n/g, '\r\n'));
      if (!terminalOutput.endsWith('\n')) {
        xtermRef.current.write('\r\n');
      }
      xtermRef.current.write('$ ');
    }
  }, [terminalOutput]);

  const loadFiles = async (path: string) => {
    try {
      const entries = await readDir(path);
      const nodes: FileNode[] = entries
        .filter(e => e.name !== 'node_modules' && e.name !== '.git')
        .map(e => ({
          name: e.name,
          isDirectory: e.isDirectory(),
          path: path === '/' ? `/${e.name}` : `${path}/${e.name}`,
        }))
        .sort((a, b) => {
          if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
          return a.isDirectory ? -1 : 1;
        });
      
      if (path === '/') {
        setFileTree(nodes);
      }
      return nodes;
    } catch (e) {
      console.error('Failed to load files', e);
      return [];
    }
  };

  const toggleFolder = async (node: FileNode) => {
    if (!node.isDirectory) return;
    
    const updateTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(n => {
        if (n.path === node.path) {
          return { ...n, isOpen: !n.isOpen, children: n.children || [] };
        }
        if (n.children) {
          return { ...n, children: updateTree(n.children) };
        }
        return n;
      });
    };

    if (!node.children) {
      const children = await loadFiles(node.path);
      setFileTree(prev => {
        const addChildren = (nodes: FileNode[]): FileNode[] => {
          return nodes.map(n => {
            if (n.path === node.path) {
              return { ...n, isOpen: true, children };
            }
            if (n.children) {
              return { ...n, children: addChildren(n.children) };
            }
            return n;
          });
        };
        return addChildren(prev);
      });
    } else {
      setFileTree(prev => updateTree(prev));
    }
  };

  const handleFileClick = async (node: FileNode) => {
    if (node.isDirectory) {
      toggleFolder(node);
    } else {
      setSelectedFile(node.path);
      const content = await readFile(node.path);
      setFileContent(content);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFileContent(value);
    }
  };

  const handleSave = async () => {
    if (selectedFile) {
      setIsSaving(true);
      await writeFile(selectedFile, fileContent);
      setIsSaving(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onChatRequest(chatInput);
      setChatInput('');
    }
  };

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts': case 'tsx': return 'typescript';
      case 'js': case 'jsx': return 'javascript';
      case 'json': return 'json';
      case 'css': return 'css';
      case 'html': return 'html';
      default: return 'plaintext';
    }
  };

  const renderTree = (nodes: FileNode[], level = 0) => {
    return nodes.map(node => (
      <div key={node.path}>
        <div 
          className={`flex items-center py-1 px-2 cursor-pointer hover:bg-white/10 text-sm ${selectedFile === node.path ? 'bg-blue-600/30 text-blue-400' : 'text-gray-300'}`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => handleFileClick(node)}
        >
          {node.isDirectory ? (
            <span className="mr-1">{node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
          ) : (
            <span className="mr-1 w-[14px]"></span>
          )}
          {node.isDirectory ? <Folder size={14} className="mr-2 text-blue-400" /> : <File size={14} className="mr-2 text-gray-400" />}
          <span className="truncate">{node.name}</span>
        </div>
        {node.isDirectory && node.isOpen && node.children && (
          <div>{renderTree(node.children, level + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] text-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-sm">WebContainer IDE</span>
          <button onClick={onRestartServer} className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 px-2 py-1 rounded">
            <RefreshCw size={12} /> Restart Server
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={!selectedFile || isSaving} className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1 rounded">
            <Save size={12} /> {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={downloadProject} className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      <Group orientation="horizontal" className="flex-1">
        {/* Sidebar */}
        <Panel defaultSize={20} minSize={15} className="bg-[#252526] border-r border-[#333] flex flex-col">
          <div className="p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Explorer</div>
          <div className="flex-1 overflow-y-auto">
            {renderTree(fileTree)}
          </div>
          
          {/* AI Chat */}
          <div className="h-1/3 border-t border-[#333] flex flex-col bg-[#1e1e1e]">
            <div className="p-2 text-xs font-semibold text-gray-400 flex items-center gap-1">
              <MessageSquare size={12} /> AI Copilot
            </div>
            <div className="flex-1 p-2 overflow-y-auto text-xs text-gray-300">
              Ask the AI to modify files, fix errors, or add features.
            </div>
            <form onSubmit={handleChatSubmit} className="p-2 border-t border-[#333]">
              <input 
                type="text" 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask AI to edit code..." 
                className="w-full bg-[#3c3c3c] text-white text-xs px-2 py-1.5 rounded outline-none focus:ring-1 focus:ring-blue-500"
              />
            </form>
          </div>
        </Panel>
        
        <Separator className="w-1 bg-[#333] hover:bg-blue-500 transition-colors cursor-col-resize" />

        {/* Main Area */}
        <Panel defaultSize={50} className="flex flex-col">
          <Group orientation="vertical">
            {/* Editor */}
            <Panel defaultSize={70} className="relative">
              {selectedFile ? (
                <Editor
                  height="100%"
                  language={getLanguage(selectedFile)}
                  theme="vs-dark"
                  value={fileContent}
                  onChange={handleEditorChange}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: 'on',
                    padding: { top: 16 }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Select a file to edit
                </div>
              )}
            </Panel>
            
            <Separator className="h-1 bg-[#333] hover:bg-blue-500 transition-colors cursor-row-resize" />
            
            {/* Terminal */}
            <Panel defaultSize={30} className="bg-[#1e1e1e] flex flex-col">
              <div className="px-4 py-1 text-xs text-gray-400 bg-[#252526] border-b border-[#333]">Terminal</div>
              <div className="flex-1 p-2 overflow-hidden" ref={terminalRef}></div>
            </Panel>
          </Group>
        </Panel>

        <Separator className="w-1 bg-[#333] hover:bg-blue-500 transition-colors cursor-col-resize" />

        {/* Preview */}
        <Panel defaultSize={30} className="bg-white relative">
          <div className="absolute top-0 left-0 right-0 px-2 py-1 bg-gray-100 border-b text-xs text-gray-500 flex items-center justify-between z-10">
            <span>Preview</span>
            <a href={webContainerUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Open in new tab</a>
          </div>
          <iframe 
            src={webContainerUrl} 
            className="w-full h-full border-none pt-6"
            title="WebContainer Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            allow="cross-origin-isolated"
          />
        </Panel>
      </Group>
    </div>
  );
};

export default WebContainerIDE;
