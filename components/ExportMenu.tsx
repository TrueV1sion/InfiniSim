import React from 'react';
import { toast } from 'sonner';

interface ExportMenuProps {
  html: string;
  url: string;
  onClose: () => void;
}

const ExportMenu: React.FC<ExportMenuProps> = ({ html, url, onClose }) => {
  const handleCopyHtml = () => {
    navigator.clipboard.writeText(html);
    toast.success('HTML copied to clipboard', { duration: 2000 });
    onClose();
  };

  const handleDownloadHtml = () => {
    let filename = url.replace(/^https?:\/\//, '').replace(/[^a-z0-9.\-_]/gi, '_');
    if (!filename.toLowerCase().endsWith('.html')) filename += '.html';
    const blob = new Blob([html], { type: 'text/html' });
    const link = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = link;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(link);
    toast.success('Downloaded ' + filename, { duration: 2000 });
    onClose();
  };

  const handleCopyEmbed = () => {
    const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    const embed = `<iframe src="${dataUri}" width="100%" height="600" frameborder="0" sandbox="allow-scripts allow-forms"></iframe>`;
    navigator.clipboard.writeText(embed);
    toast.success('Embed code copied', { duration: 2000 });
    onClose();
  };

  const handleOpenInNewTab = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    toast.success('Opened in new tab', { duration: 2000 });
    onClose();
  };

  const handleCopyDataUri = () => {
    const dataUri = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    navigator.clipboard.writeText(dataUri);
    toast.success('Data URI copied', { duration: 2000 });
    onClose();
  };

  const actions = [
    { label: 'Copy HTML Source', description: 'Copy full HTML to clipboard', action: handleCopyHtml, icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
    { label: 'Download HTML File', description: 'Save as .html file', action: handleDownloadHtml, icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> },
    { label: 'Copy Embed Code', description: 'Copy iframe embed snippet', action: handleCopyEmbed, icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg> },
    { label: 'Open in New Tab', description: 'Preview in standalone tab', action: handleOpenInNewTab, icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg> },
    { label: 'Copy Data URI', description: 'Self-contained URL for sharing', action: handleCopyDataUri, icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> },
  ];

  return (
    <div className="absolute top-4 right-4 z-[60] w-72" onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 -m-96" onClick={onClose} />
      <div className="relative bg-[#111] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-200">Export Options</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="py-1">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={a.action}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors group"
            >
              <span className="text-gray-500 group-hover:text-blue-400 transition-colors">{a.icon}</span>
              <div>
                <div className="text-sm text-gray-200">{a.label}</div>
                <div className="text-[10px] text-gray-600">{a.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExportMenu;
