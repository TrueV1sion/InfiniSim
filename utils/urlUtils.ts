const IGNORED_PROTOCOLS = ['mailto:', 'tel:', 'javascript:', 'data:', 'blob:'];

export function resolveUrl(targetUrl: string, currentUrl: string): string | null {
  if (!targetUrl || targetUrl === '#') return null;

  const trimmed = targetUrl.trim();

  for (const proto of IGNORED_PROTOCOLS) {
    if (trimmed.startsWith(proto)) return null;
  }

  if (trimmed.startsWith('#')) return null;

  if (trimmed.startsWith('//')) {
    return 'https:' + trimmed;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('search://') || trimmed.startsWith('infinite://')) {
    return trimmed;
  }

  let base: URL;
  try {
    base = new URL(currentUrl.startsWith('http') ? currentUrl : `https://${currentUrl}`);
  } catch {
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return base.origin + trimmed;
  }

  try {
    const resolved = new URL(trimmed, base.href);
    return resolved.href;
  } catch {
    return base.origin + '/' + trimmed;
  }
}

export function isHashNavigation(href: string): boolean {
  return !!href && href.startsWith('#') && href.length > 1;
}

export function parseQueryParams(url: string): Record<string, string> {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const params: Record<string, string> = {};
    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch {
    return {};
  }
}

export function isSameSite(url1: string, url2: string): boolean {
  try {
    const a = new URL(url1.startsWith('http') ? url1 : `https://${url1}`);
    const b = new URL(url2.startsWith('http') ? url2 : `https://${url2}`);
    return a.hostname === b.hostname;
  } catch {
    return false;
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60);
}
