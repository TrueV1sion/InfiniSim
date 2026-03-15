import { supabase } from '../supabase';

const CACHE_VERSION = 'v2';

export function generateCacheKey(url: string, model: string): string {
  const input = `${CACHE_VERSION}::${url}::${model}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `cache_${Math.abs(hash).toString(36)}_${btoa(input).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)}`;
}

export async function getCachedPage(cacheKey: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('page_cache')
      .select('html_content, hit_count')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (error || !data) return null;

    supabase
      .from('page_cache')
      .update({ hit_count: (data.hit_count || 0) + 1 })
      .eq('cache_key', cacheKey)
      .then(() => {});

    return data.html_content;
  } catch {
    return null;
  }
}

export async function setCachedPage(
  cacheKey: string,
  url: string,
  model: string,
  html: string
): Promise<void> {
  try {
    await supabase
      .from('page_cache')
      .upsert({
        cache_key: cacheKey,
        url,
        model,
        html_content: html,
        created_at: new Date().toISOString(),
        hit_count: 0,
      }, { onConflict: 'cache_key' });
  } catch {
    // cache write failure is non-critical
  }
}
