
import React, { createContext, useContext, useState, useCallback } from 'react';

interface WordNavigationContextType {
  targetWordIdToOpen: string | null;
  setTargetWordIdToOpen: (wordId: string | null) => void;
  clearTargetWordIdToOpen: () => void;
}

const WordNavigationContext = createContext<WordNavigationContextType>({
  targetWordIdToOpen: null,
  setTargetWordIdToOpen: () => {},
  clearTargetWordIdToOpen: () => {},
});

export const useWordNavigation = () => {
  const context = useContext(WordNavigationContext);
  if (!context) {
    throw new Error('useWordNavigation must be used within a WordNavigationProvider');
  }
  return context;
};

export function WordNavigationProvider({ children }: { children: React.ReactNode }) {
  const [targetWordIdToOpen, setTargetWordIdToOpenState] = useState<string | null>(null);

  const setTargetWordIdToOpen = useCallback((wordId: string | null) => {
    console.log('WordNavigationContext: Setting target word to open:', wordId);
    setTargetWordIdToOpenState(wordId);
  }, []);

  const clearTargetWordIdToOpen = useCallback(() => {
    console.log('WordNavigationContext: Clearing target word to open');
    setTargetWordIdToOpenState(null);
  }, []);

  return (
    <WordNavigationContext.Provider
      value={{
        targetWordIdToOpen,
        setTargetWordIdToOpen,
        clearTargetWordIdToOpen,
      }}
    >
      {children}
    </WordNavigationContext.Provider>
  );
}
