import { useState } from 'react';
import {
  clearKimiApiKey,
  getKimiApiKey,
  saveKimiApiKey,
  validateKimiApiKey,
} from '@/services/kimiArticleService';

export function useExtractionCredentialPrompt(options: {
  onSuccess: (message: string, duration?: number) => void;
}) {
  const { onSuccess } = options;

  const [kimiApiKey, setKimiApiKey] = useState(getKimiApiKey() || '');
  const [showKimiKeyDialog, setShowKimiKeyDialog] = useState(false);
  const [kimiKeyInput, setKimiKeyInput] = useState('');
  const [kimiKeyValidating, setKimiKeyValidating] = useState(false);

  const handleSaveKimiKey = async () => {
    if (!kimiKeyInput.trim()) return;

    setKimiKeyValidating(true);
    const result = await validateKimiApiKey(kimiKeyInput.trim());
    setKimiKeyValidating(false);

    if (result.valid) {
      saveKimiApiKey(kimiKeyInput.trim());
      setKimiApiKey(kimiKeyInput.trim());
      setShowKimiKeyDialog(false);
      onSuccess('Kimi API Key 配置成功！');
      return;
    }

    setKimiKeyInput('');
  };

  const handleClearKimiKey = () => {
    clearKimiApiKey();
    setKimiApiKey('');
    onSuccess('已清除Kimi API Key');
  };

  return {
    kimiApiKey,
    showKimiKeyDialog,
    setShowKimiKeyDialog,
    kimiKeyInput,
    setKimiKeyInput,
    kimiKeyValidating,
    handleSaveKimiKey,
    handleClearKimiKey,
  };
}

export type ExtractionCredentialPromptReturn = ReturnType<typeof useExtractionCredentialPrompt>;
