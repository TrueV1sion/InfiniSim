export function parseGeminiError(err: unknown): string {
  let errorMessage = '';
  if (err instanceof Error) {
    errorMessage = err.message;
  } else if (typeof err === 'object' && err !== null) {
    try {
      errorMessage = JSON.stringify(err);
    } catch {
      errorMessage = String(err);
    }
  } else {
    errorMessage = String(err);
  }

  try {
    const parsed = JSON.parse(errorMessage);
    if (parsed.error?.message) {
      errorMessage = parsed.error.message;
      try {
        const innerParsed = JSON.parse(errorMessage);
        if (innerParsed.error?.message) {
          errorMessage = innerParsed.error.message;
        }
      } catch {
        // not nested JSON
      }
    }
  } catch {
    // not JSON
  }

  return errorMessage;
}

export type ErrorCategory = 'api_key_missing' | 'quota_exceeded' | 'context_limit' | 'generic';

export function categorizeError(message: string): ErrorCategory {
  if (message.includes('Requested entity was not found') || message.includes('API Key not found')) {
    return 'api_key_missing';
  }
  if (message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
    return 'quota_exceeded';
  }
  if (message.includes('token count exceeds') || message.includes('400')) {
    return 'context_limit';
  }
  return 'generic';
}
