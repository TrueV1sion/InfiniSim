import { Dispatch, SetStateAction } from 'react';
import { DownloadItem, WebPage } from '../types';

interface UseDownloadsResult {
  handleDownload: () => void;
  handleClearDownloads: () => void;
  handleOpenDownload: (download: DownloadItem) => void;
}

export function useDownloads(
  downloads: DownloadItem[],
  setDownloads: Dispatch<SetStateAction<DownloadItem[]>>,
  pageData: WebPage | null,
  currentUrl: string,
  setIsDownloadsOpen: Dispatch<SetStateAction<boolean>>
): UseDownloadsResult {
  const handleDownload = () => {
    if (!pageData) return;
    let filename = (pageData.title || 'page').replace(/^https?:\/\//, '').replace(/[^a-z0-9\.\-_]/gi, '_');
    if (!filename.toLowerCase().endsWith('.html')) filename += '.html';
    const blob = new Blob([pageData.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const newDownload: DownloadItem = {
      id: Date.now().toString(),
      filename,
      url: currentUrl,
      timestamp: Date.now(),
      size: blob.size,
      status: 'completed',
      blobUrl: url,
    };

    setDownloads(prev => [newDownload, ...prev]);
    setIsDownloadsOpen(true);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleClearDownloads = () => {
    downloads.forEach(d => {
      if (d.blobUrl) URL.revokeObjectURL(d.blobUrl);
    });
    setDownloads([]);
  };

  const handleOpenDownload = (download: DownloadItem) => {
    if (download.blobUrl) {
      const a = document.createElement('a');
      a.href = download.blobUrl;
      a.download = download.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return { handleDownload, handleClearDownloads, handleOpenDownload };
}
