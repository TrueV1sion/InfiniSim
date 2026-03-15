import { getUserApiKey, saveUserApiKey } from '../supabase';

const STORAGE_KEY = 'infiniteweb_gemini_api_key';

export function getLocalApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setLocalApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // silent fail
  }
}

export function removeLocalApiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent fail
  }
}

export async function resolveApiKey(userId?: string): Promise<string | null> {
  const localKey = getLocalApiKey();
  if (localKey) return localKey;

  const envKey = process.env.API_KEY;
  if (envKey) return envKey;

  if (userId) {
    const supabaseKey = await getUserApiKey(userId);
    if (supabaseKey) {
      setLocalApiKey(supabaseKey);
      return supabaseKey;
    }
  }

  return null;
}

export async function syncApiKeyToSupabase(userId: string): Promise<void> {
  const localKey = getLocalApiKey();
  if (localKey) {
    await saveUserApiKey(userId, localKey);
  }
}

export async function loadApiKeyFromSupabase(userId: string): Promise<boolean> {
  const supabaseKey = await getUserApiKey(userId);
  if (supabaseKey) {
    setLocalApiKey(supabaseKey);
    return true;
  }
  return false;
}
