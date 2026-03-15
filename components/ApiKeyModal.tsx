import { useState, useEffect } from 'react';
import { saveUserApiKey, validateGeminiApiKey } from '../supabase';
import { getLocalApiKey, setLocalApiKey, removeLocalApiKey } from '../services/apiKeyService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId?: string;
}

export default function ApiKeyModal({ isOpen, onClose, onSuccess, userId }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasExistingKey, setHasExistingKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const existing = getLocalApiKey();
      setHasExistingKey(!!existing);
      setApiKey('');
      setShowKey(false);
      setValidationStatus('idle');
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setErrorMessage('Please enter an API key');
      return;
    }

    setIsSaving(true);
    setIsValidating(true);
    setErrorMessage('');
    setValidationStatus('idle');

    try {
      const isValid = await validateGeminiApiKey(trimmed);
      if (!isValid) {
        setValidationStatus('invalid');
        setErrorMessage('This API key is invalid. Double-check it and try again.');
        setIsSaving(false);
        setIsValidating(false);
        return;
      }

      setValidationStatus('valid');
      setLocalApiKey(trimmed);

      if (userId) {
        await saveUserApiKey(userId, trimmed);
      }

      setTimeout(() => {
        onSuccess();
      }, 600);
    } catch {
      setValidationStatus('invalid');
      setErrorMessage('Could not validate the key. Check your connection and try again.');
    } finally {
      setIsSaving(false);
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    removeLocalApiKey();
    setHasExistingKey(false);
    setApiKey('');
    setValidationStatus('idle');
    onSuccess();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && apiKey.trim()) {
      handleSave();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg mx-4 animate-[fadeScale_0.2s_ease-out]"
        style={{ animation: 'fadeScale 0.2s ease-out' }}
      >
        <style>{`
          @keyframes fadeScale {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        <div className="bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 pb-0">
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {hasExistingKey ? 'Manage API Key' : 'Set Up Your API Key'}
                  </h2>
                  <p className="text-sm text-white/40">Required to generate pages</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            {hasExistingKey && !apiKey && (
              <div className="mb-5 p-4 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-green-300 font-medium">API key configured</p>
                    <p className="text-xs text-white/30">Enter a new key below to replace it</p>
                  </div>
                </div>
                <button
                  onClick={handleRemove}
                  className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                >
                  Remove
                </button>
              </div>
            )}

            {!hasExistingKey && (
              <div className="mb-5 p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mt-0.5 shrink-0">
                    <span className="text-sm">1</span>
                  </div>
                  <div>
                    <p className="text-sm text-white/80 font-medium mb-1">Get a free Gemini API key</p>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Open Google AI Studio
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3 mt-4">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mt-0.5 shrink-0">
                    <span className="text-sm">2</span>
                  </div>
                  <p className="text-sm text-white/80 font-medium">Paste it below</p>
                </div>
              </div>
            )}

            <div className="mb-4">
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setValidationStatus('idle');
                    setErrorMessage('');
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={hasExistingKey ? 'Paste new key to replace...' : 'Paste your Gemini API key here...'}
                  autoFocus
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-white/25 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showKey ? (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {validationStatus === 'valid' && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2.5 text-green-400 text-sm animate-[fadeScale_0.2s_ease-out]">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Key verified -- saving...</span>
              </div>
            )}

            {(validationStatus === 'invalid' || (errorMessage && validationStatus === 'idle')) && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-red-400 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving || !apiKey.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-white/20 text-white font-medium py-3 px-4 rounded-xl transition-all disabled:cursor-not-allowed text-sm"
            >
              {isValidating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying key...
                </span>
              ) : hasExistingKey ? 'Replace Key' : 'Save & Start Browsing'}
            </button>

            <p className="text-[11px] text-white/20 text-center mt-3 leading-relaxed">
              Your key is stored locally on this device and never sent to our servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
