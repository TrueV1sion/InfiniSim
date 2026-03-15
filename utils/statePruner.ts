const NOISE_KEYS = new Set([
  '_ga', '_gid', '_gat', '__cfduid', '_fbp', '_fbc',
  'intercom-session', 'amplitude_id', 'mp_', 'mixpanel',
  '_hjid', '_hjFirstSeen', 'ajs_user_id', 'ajs_anonymous_id',
  '__stripe_mid', '__stripe_sid',
]);

function isNoiseKey(key: string): boolean {
  if (NOISE_KEYS.has(key)) return true;
  for (const prefix of NOISE_KEYS) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value as object).length === 0) return true;
  return false;
}

export function pruneVirtualState(
  state: any,
  maxKeys: number = 50,
  maxValueLength: number = 2000
): any {
  if (!state || typeof state !== 'object') return state;

  const pruned: Record<string, unknown> = {};
  const entries = Object.entries(state);

  let kept = 0;
  for (let i = entries.length - 1; i >= 0 && kept < maxKeys; i--) {
    const [key, value] = entries[i];

    if (isNoiseKey(key)) continue;
    if (isEmpty(value)) continue;

    let prunedValue = value;
    if (typeof value === 'string' && value.length > maxValueLength) {
      prunedValue = value.substring(0, maxValueLength) + ' [TRUNCATED]';
    } else if (typeof value === 'object' && value !== null) {
      try {
        const serialized = JSON.stringify(value);
        if (serialized.length > maxValueLength) {
          prunedValue = JSON.parse(serialized.substring(0, maxValueLength) + '"}');
        }
      } catch {
        prunedValue = value;
      }
    }

    pruned[key] = prunedValue;
    kept++;
  }

  return pruned;
}
