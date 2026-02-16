import React, { useEffect, useRef } from 'react';

interface BrowserViewportProps {
  htmlContent: string;
  title: string;
  onNavigate: (url: string) => void;
}

const BrowserViewport: React.FC<BrowserViewportProps> = ({ htmlContent, title, onNavigate }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // We update the srcdoc whenever content changes.
    // This is safer than document.write and provides good isolation.
    if (iframeRef.current) {
        iframeRef.current.srcdoc = htmlContent;
    }
  }, [htmlContent]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'INFINITE_WEB_NAVIGATE') {
        const targetUrl = event.data.url;
        onNavigate(targetUrl);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onNavigate]);

  return (
    <div className="flex-1 w-full h-full relative bg-white">
       {/* To handle click interception, we rely on the injected script in the HTML 
           sending postMessages to window.parent */}
      <iframe
        ref={iframeRef}
        title={title}
        className="w-full h-full border-none block"
        sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
      />
    </div>
  );
};

export default BrowserViewport;