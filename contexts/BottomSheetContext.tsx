
import React, { createContext, useContext, useState, useCallback } from 'react';

interface BottomSheetContextType {
  isBottomSheetOpen: boolean;
  openBottomSheet: () => void;
  closeBottomSheet: () => void;
}

const BottomSheetContext = createContext<BottomSheetContextType>({
  isBottomSheetOpen: false,
  openBottomSheet: () => {},
  closeBottomSheet: () => {},
});

export const useBottomSheetState = () => {
  const context = useContext(BottomSheetContext);
  if (!context) {
    throw new Error('useBottomSheetState must be used within a BottomSheetProvider');
  }
  return context;
};

export function BottomSheetProvider({ children }: { children: React.ReactNode }) {
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const openBottomSheet = useCallback(() => {
    console.log('BottomSheetContext: Opening bottom sheet');
    setIsBottomSheetOpen(true);
  }, []);

  const closeBottomSheet = useCallback(() => {
    console.log('BottomSheetContext: Closing bottom sheet');
    setIsBottomSheetOpen(false);
  }, []);

  return (
    <BottomSheetContext.Provider
      value={{
        isBottomSheetOpen,
        openBottomSheet,
        closeBottomSheet,
      }}
    >
      {children}
    </BottomSheetContext.Provider>
  );
}
