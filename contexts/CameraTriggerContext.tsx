
import React, { createContext, useContext, useState, useCallback } from 'react';

interface CameraTriggerContextType {
  shouldOpenCamera: boolean;
  triggerCamera: () => void;
  resetCameraTrigger: () => void;
}

const CameraTriggerContext = createContext<CameraTriggerContextType>({
  shouldOpenCamera: false,
  triggerCamera: () => {},
  resetCameraTrigger: () => {},
});

export const useCameraTrigger = () => {
  const context = useContext(CameraTriggerContext);
  if (!context) {
    throw new Error('useCameraTrigger must be used within a CameraTriggerProvider');
  }
  return context;
};

export function CameraTriggerProvider({ children }: { children: React.ReactNode }) {
  const [shouldOpenCamera, setShouldOpenCamera] = useState(false);

  const triggerCamera = useCallback(() => {
    console.log('CameraTriggerContext: Triggering camera');
    setShouldOpenCamera(true);
  }, []);

  const resetCameraTrigger = useCallback(() => {
    console.log('CameraTriggerContext: Resetting camera trigger');
    setShouldOpenCamera(false);
  }, []);

  return (
    <CameraTriggerContext.Provider
      value={{
        shouldOpenCamera,
        triggerCamera,
        resetCameraTrigger,
      }}
    >
      {children}
    </CameraTriggerContext.Provider>
  );
}
