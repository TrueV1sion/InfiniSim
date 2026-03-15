import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { User } from 'firebase/auth';
import { getUserApiKey } from '../supabase';

interface UseApiKeyResult {
  hasKey: boolean;
  setHasKey: Dispatch<SetStateAction<boolean>>;
  showApiKeyModal: boolean;
  setShowApiKeyModal: Dispatch<SetStateAction<boolean>>;
  handleSelectKey: () => Promise<void>;
  handleApiKeySuccess: () => Promise<void>;
  handleOpenApiKeySettings: () => void;
}

export function useApiKey(
  user: User | null,
  userHasApiKey: boolean,
  setUserHasApiKey: (val: boolean) => void
): UseApiKeyResult {
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (user) {
      setShowApiKeyModal(true);
    } else if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleApiKeySuccess = async () => {
    if (user) {
      const apiKey = await getUserApiKey(user.uid);
      setUserHasApiKey(!!apiKey);
      if (apiKey) {
        setHasKey(true);
      }
    }
  };

  const handleOpenApiKeySettings = () => {
    if (user) {
      setShowApiKeyModal(true);
    }
  };

  return {
    hasKey,
    setHasKey,
    showApiKeyModal,
    setShowApiKeyModal,
    handleSelectKey,
    handleApiKeySuccess,
    handleOpenApiKeySettings,
  };
}
