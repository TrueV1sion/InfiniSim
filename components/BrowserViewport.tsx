import React, { useEffect, useRef } from 'react';

interface BrowserViewportProps {
  htmlContent: string;
  title: string;
  isLoading?: boolean;
  onNavigate: (url: string, state?: any) => void;
  onSelectKey?: () => void;
  onStateUpdate?: (state: any) => void;
}

const BrowserViewport: React.FC<BrowserViewportProps> = ({ htmlContent, title, isLoading, onNavigate, onSelectKey, onStateUpdate }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previousHtmlRef = useRef('');
  const isDocOpenRef = useRef(false);

  useEffect(() => {
    if (iframeRef.current) {
        if (!isLoading) {
            // For the final render, use srcdoc to ensure a completely fresh environment
            // This guarantees all scripts and styles execute correctly without document.write quirks
            iframeRef.current.srcdoc = htmlContent;
            previousHtmlRef.current = htmlContent;
            isDocOpenRef.current = false;
            return;
        }

        const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
        if (doc) {
            if (htmlContent === previousHtmlRef.current) {
                return;
            }
            
            if (!isDocOpenRef.current || !htmlContent.startsWith(previousHtmlRef.current) || previousHtmlRef.current === '') {
                doc.open();
                doc.write(htmlContent);
                previousHtmlRef.current = htmlContent;
                isDocOpenRef.current = true;
            } else {
                const newChunk = htmlContent.slice(previousHtmlRef.current.length);
                doc.write(newChunk);
                previousHtmlRef.current = htmlContent;
            }
        } else {
            iframeRef.current.srcdoc = htmlContent;
        }
    }
  }, [htmlContent, isLoading]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'INFINITE_WEB_NAVIGATE') {
        const targetUrl = event.data.url;
        onNavigate(targetUrl, event.data.state);
      } else if (event.data && event.data.type === 'INFINITE_WEB_SELECT_KEY' && onSelectKey) {
        onSelectKey();
      } else if (event.data && event.data.type === 'INFINITE_WEB_STATE_UPDATE' && onStateUpdate) {
        onStateUpdate(event.data.state);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onNavigate, onSelectKey, onStateUpdate]);

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