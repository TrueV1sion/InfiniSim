import { supabase } from '../lib/supabase';
import { ModelTier } from '../types';

export async function getCachedPage(
  url: string,
  model: ModelTier,
  deepResearch: boolean
): Promise<string | null> {
  const { data, error } = await supabase
    .from('page_cache')
    .select('id, content')
    .eq('url', url)
    .eq('model', model)
    .eq('deep_research', deepResearch)
    .maybeSingle();

  if (error || !data) return null;

  supabase
    .from('page_cache')
    .update({
      access_count: undefined,
      last_accessed_at: new Date().toISOString(),
    })
    .eq('id', data.id)
    .then(() => {});

  await supabase.rpc('increment_access_count', { page_id: data.id }).catch(() => {});

  return data.content;
}

export async function cachePage(
  url: string,
  content: string,
  model: ModelTier,
  deepResearch: boolean
): Promise<void> {
  await supabase
    .from('page_cache')
    .upsert(
      {
        url,
        content,
        model,
        deep_research: deepResearch,
        created_at: new Date().toISOString(),
        access_count: 1,
        last_accessed_at: new Date().toISOString(),
      },
      { onConflict: 'url,model,deep_research' }
    )
    .catch((err) => console.error('Cache write error:', err));
}
