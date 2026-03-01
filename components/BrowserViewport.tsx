import React, { useEffect, useRef } from 'react';

interface BrowserViewportProps {
  htmlContent: string;
  title: string;
  onNavigate: (url: string) => void;
  isStreaming?: boolean;
}

const BrowserViewport: React.FC<BrowserViewportProps> = ({ htmlContent, title, onNavigate, isStreaming }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const oldUrl = iframeRef.current.src;
      iframeRef.current.src = url;
      return () => {
        if (oldUrl.startsWith('blob:')) {
          URL.revokeObjectURL(oldUrl);
        }
      };
    }
  }, [htmlContent]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'INFINITE_WEB_NAVIGATE') {
        onNavigate(event.data.url);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onNavigate]);

  return (
    <div className="flex-1 w-full h-full relative bg-white">
      {isStreaming && (
        <div className="absolute bottom-4 left-4 z-10 bg-[#0a0a0a]/80 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2 shadow-xl">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-[10px] text-white/60 font-mono uppercase tracking-wider">Building page...</span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        title={title}
        className="w-full h-full border-none block"
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals allow-pointer-lock allow-downloads"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      />
    </div>
  );
};

export default BrowserViewport;
