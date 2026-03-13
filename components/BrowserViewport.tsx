import React, { useEffect, useRef } from 'react';

interface BrowserViewportProps {
  htmlContent: string;
  title: string;
  onNavigate: (url: string) => void;
  onSelectKey?: () => void;
}

const BrowserViewport: React.FC<BrowserViewportProps> = ({ htmlContent, title, onNavigate, onSelectKey }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
        // Using blob URL instead of srcdoc for better compatibility with some scripts and resources
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
        const targetUrl = event.data.url;
        onNavigate(targetUrl);
      } else if (event.data && event.data.type === 'INFINITE_WEB_SELECT_KEY' && onSelectKey) {
        onSelectKey();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onNavigate, onSelectKey]);

  return (
    <div className="flex-1 w-full h-full relative bg-white">
      <iframe
        ref={iframeRef}
        title={title}
        className="w-full h-full border-none block"
        // Ensure all necessary permissions for interactive content and games are granted
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals allow-pointer-lock allow-downloads"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      />
    </div>
  );
};

export default BrowserViewport;