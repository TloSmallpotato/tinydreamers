
import React, { createContext, useContext, useState, useCallback } from 'react';

interface MomentsRefreshContextType {
  refreshTrigger: number;
  triggerMomentsRefresh: () => void;
}

const MomentsRefreshContext = createContext<MomentsRefreshContextType>({
  refreshTrigger: 0,
  triggerMomentsRefresh: () => {},
});

export const useMomentsRefresh = () => {
  const context = useContext(MomentsRefreshContext);
  if (!context) {
    throw new Error('useMomentsRefresh must be used within a MomentsRefreshProvider');
  }
  return context;
};

export function MomentsRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerMomentsRefresh = useCallback(() => {
    console.log('MomentsRefreshContext: Triggering moments refresh');
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <MomentsRefreshContext.Provider
      value={{
        refreshTrigger,
        triggerMomentsRefresh,
      }}
    >
      {children}
    </MomentsRefreshContext.Provider>
  );
}
