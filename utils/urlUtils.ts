export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('wc://') || trimmed.startsWith('infinite://') || trimmed.startsWith('search://')) {
    return trimmed;
  }

  if (!trimmed.startsWith('http') && !trimmed.includes('.')) {
    return `search://${encodeURIComponent(trimmed)}`;
  }

  if (!trimmed.startsWith('http') && !trimmed.startsWith('search://')) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

export function resolveRelativeUrl(targetUrl: string, currentUrl: string): string {
  if (!targetUrl.startsWith('/')) return targetUrl;
  try {
    const base = currentUrl.startsWith('http') ? currentUrl : `https://${currentUrl}`;
    const currentObj = new URL(base);
    return currentObj.origin + targetUrl;
  } catch {
    return targetUrl;
  }
}

export function getUrlDisplayIcon(url: string): 'search' | 'lock' | 'container' | 'directory' {
  if (url.startsWith('search://')) return 'search';
  if (url.startsWith('wc://')) return 'container';
  if (url.startsWith('infinite://')) return 'directory';
  return 'lock';
}
