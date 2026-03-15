/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserApiKey {
  user_id: string;
  gemini_api_key: string;
  created_at: string;
  updated_at: string;
  is_valid: boolean;
}

export async function getUserApiKey(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('gemini_api_key')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.gemini_api_key;
}

export async function saveUserApiKey(userId: string, apiKey: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_api_keys')
    .upsert({
      user_id: userId,
      gemini_api_key: apiKey,
      updated_at: new Date().toISOString(),
      is_valid: true
    }, {
      onConflict: 'user_id'
    });

  return !error;
}

export async function deleteUserApiKey(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_api_keys')
    .delete()
    .eq('user_id', userId);

  return !error;
}

export async function validateGeminiApiKey(apiKey: string): Promise<boolean> {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const genai = new GoogleGenAI({ apiKey });

    // Try to list models as a validation check
    await genai.models.list();
    return true;
  } catch (error) {
    console.error('API key validation failed:', error);
    return false;
  }
}
