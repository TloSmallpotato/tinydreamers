
import React, { createContext, useContext, useState, useCallback } from 'react';

interface AddNavigationContextType {
  shouldFocusBookSearch: boolean;
  shouldOpenAddWord: boolean;
  triggerBookSearch: () => void;
  triggerAddWord: () => void;
  resetBookSearch: () => void;
  resetAddWord: () => void;
}

const AddNavigationContext = createContext<AddNavigationContextType>({
  shouldFocusBookSearch: false,
  shouldOpenAddWord: false,
  triggerBookSearch: () => {},
  triggerAddWord: () => {},
  resetBookSearch: () => {},
  resetAddWord: () => {},
});

export const useAddNavigation = () => {
  const context = useContext(AddNavigationContext);
  if (!context) {
    throw new Error('useAddNavigation must be used within an AddNavigationProvider');
  }
  return context;
};

export function AddNavigationProvider({ children }: { children: React.ReactNode }) {
  const [shouldFocusBookSearch, setShouldFocusBookSearch] = useState(false);
  const [shouldOpenAddWord, setShouldOpenAddWord] = useState(false);

  const triggerBookSearch = useCallback(() => {
    console.log('AddNavigationContext: Triggering book search focus');
    setShouldFocusBookSearch(true);
  }, []);

  const triggerAddWord = useCallback(() => {
    console.log('AddNavigationContext: Triggering add word');
    setShouldOpenAddWord(true);
  }, []);

  const resetBookSearch = useCallback(() => {
    console.log('AddNavigationContext: Resetting book search focus');
    setShouldFocusBookSearch(false);
  }, []);

  const resetAddWord = useCallback(() => {
    console.log('AddNavigationContext: Resetting add word');
    setShouldOpenAddWord(false);
  }, []);

  return (
    <AddNavigationContext.Provider
      value={{
        shouldFocusBookSearch,
        shouldOpenAddWord,
        triggerBookSearch,
        triggerAddWord,
        resetBookSearch,
        resetAddWord,
      }}
    >
      {children}
    </AddNavigationContext.Provider>
  );
}
