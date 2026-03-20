import React, { useEffect, useRef } from 'react';
import { DeviceType } from '../types';

export type { DeviceType };

interface BrowserViewportProps {
  htmlContent: string;
  title: string;
  isLoading?: boolean;
  deviceType?: DeviceType;
  webContainerUrl?: string;
  onNavigate: (url: string, state?: any) => void;
  onUrlUpdate?: (url: string, state?: any) => void;
  onSelectKey?: () => void;
  onStateUpdate?: (state: any) => void;
  onApiCall?: (url: string, method: string, body: any, state: any, requestId: string, source: MessageEventSource) => void;
}

const BrowserViewport: React.FC<BrowserViewportProps> = ({ htmlContent, title, isLoading, deviceType = 'desktop', webContainerUrl, onNavigate, onUrlUpdate, onSelectKey, onStateUpdate, onApiCall }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previousHtmlRef = useRef('');
  const isDocOpenRef = useRef(false);

  useEffect(() => {
    if (iframeRef.current) {
        if (webContainerUrl) {
            // If we have a webContainerUrl, we use src instead of srcdoc
            if (iframeRef.current.src !== webContainerUrl) {
                iframeRef.current.removeAttribute('srcdoc');
                iframeRef.current.src = webContainerUrl;
            }
            return;
        }

        // Reset src if switching back to htmlContent
        if (iframeRef.current.hasAttribute('src')) {
            iframeRef.current.removeAttribute('src');
            // If we just removed the src, we should wait for the next tick to write to it
            // or just use srcdoc for this render to avoid the race condition
            iframeRef.current.srcdoc = htmlContent;
            previousHtmlRef.current = htmlContent;
            isDocOpenRef.current = false;
            return;
        }

        if (!isLoading) {
            // For the final render, use srcdoc to ensure a completely fresh environment
            // This guarantees all scripts and styles execute correctly without document.write quirks
            iframeRef.current.srcdoc = htmlContent;
            previousHtmlRef.current = htmlContent;
            isDocOpenRef.current = false;
            return;
        }

        let doc: Document | null = null;
        try {
            doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document || null;
        } catch (e) {
            // Ignore cross-origin errors when switching from webContainerUrl
            console.warn('Cross-origin document access blocked, falling back to srcdoc');
        }

        if (doc) {
            if (htmlContent === previousHtmlRef.current) {
                return;
            }
            
            if (!isDocOpenRef.current || !htmlContent.startsWith(previousHtmlRef.current) || previousHtmlRef.current === '') {
                iframeRef.current.contentWindow?.stop(); // Stop any ongoing loading
                doc.close(); // Close any open document streams
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
  }, [htmlContent, isLoading, webContainerUrl]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'INFINITE_WEB_NAVIGATE') {
        const targetUrl = event.data.url;
        onNavigate(targetUrl, event.data.state);
      } else if (event.data && event.data.type === 'INFINITE_WEB_URL_UPDATE' && onUrlUpdate) {
        onUrlUpdate(event.data.url, event.data.state);
      } else if (event.data && event.data.type === 'INFINITE_WEB_SELECT_KEY' && onSelectKey) {
        onSelectKey();
      } else if (event.data && event.data.type === 'INFINITE_WEB_STATE_UPDATE' && onStateUpdate) {
        onStateUpdate(event.data.state);
      } else if (event.data && event.data.type === 'INFINITE_WEB_API_CALL' && onApiCall && event.source) {
        onApiCall(event.data.url, event.data.method, event.data.body, event.data.state, event.data.requestId, event.source);
      } else if (event.data && event.data.type === 'INFINITE_WEB_XR_SESSION') {
        console.log('XR Session initiated by AI generated content:', event.data.sessionType);
        // Handle XR session logic here (e.g., show a UI overlay, request permissions)
        if (event.data.sessionType === 'immersive-vr') {
          // Example: Notify user or prepare environment for VR
        } else if (event.data.sessionType === 'immersive-ar') {
          // Example: Notify user or prepare environment for AR
        }
      } else if (event.data && event.data.type === 'INFINITE_WEB_XR_TRACKING') {
        // Handle XR tracking data (e.g., pose, hit test results)
        // console.log('XR Tracking Data:', event.data.trackingData);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onNavigate, onSelectKey, onStateUpdate, onApiCall]);

  const getDeviceStyles = () => {
    switch (deviceType) {
      case 'mobile':
        return 'w-[375px] h-[812px] rounded-[3rem] border-[12px] border-gray-900 shadow-2xl mx-auto my-8 overflow-hidden';
      case 'tablet':
        return 'w-[768px] h-[1024px] rounded-[2rem] border-[12px] border-gray-900 shadow-2xl mx-auto my-8 overflow-hidden';
      case 'vr':
        return 'w-[960px] h-[540px] rounded-[3rem] border-[16px] border-gray-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] mx-auto my-8 overflow-hidden relative before:content-[""] before:absolute before:inset-0 before:pointer-events-none before:shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] before:z-50';
      case 'ar':
        return 'w-[375px] h-[812px] rounded-[3rem] border-[12px] border-gray-900 shadow-2xl mx-auto my-8 overflow-hidden relative bg-transparent before:content-[""] before:absolute before:inset-0 before:pointer-events-none before:bg-[url("https://images.unsplash.com/photo-1517055729448-7323861219d3?auto=format&fit=crop&q=80&w=375&h=812")] before:bg-cover before:opacity-30 before:z-[-1]';
      case 'desktop':
      default:
        return 'w-full h-full border-none';
    }
  };

  return (
    <div className="flex-1 w-full h-full relative bg-gray-100 overflow-auto flex items-center justify-center">
      <div className={`${getDeviceStyles()} bg-white transition-all duration-500 ease-in-out`}>
        <iframe
          ref={iframeRef}
          title={title}
          className="w-full h-full border-none block"
          // Ensure all necessary permissions for interactive content and games are granted
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals allow-pointer-lock allow-downloads"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; xr-spatial-tracking"
        />
      </div>
    </div>
  );
};

export default BrowserViewport;