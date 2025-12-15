
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Child {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

interface ChildContextType {
  children: Child[];
  selectedChild: Child | null;
  loading: boolean;
  error: string | null;
  selectChild: (childId: string) => void;
  addChild: (name: string, birthDate: Date) => Promise<void>;
  updateChild: (childId: string, updates: Partial<Child>) => Promise<void>;
  deleteChild: (childId: string) => Promise<void>;
  refreshChildren: () => Promise<void>;
}

const ChildContext = createContext<ChildContextType>({
  children: [],
  selectedChild: null,
  loading: true,
  error: null,
  selectChild: () => {},
  addChild: async () => {},
  updateChild: async () => {},
  deleteChild: async () => {},
  refreshChildren: async () => {},
});

export const useChild = () => {
  const context = useContext(ChildContext);
  if (!context) {
    throw new Error('useChild must be used within a ChildProvider');
  }
  return context;
};

export function ChildProvider({ children: childrenProp }: { children: React.ReactNode }) {
  const { user, loading: authLoading, isInitialized } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isFetching = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchChildren = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetching.current) {
      console.log('ChildContext: Already fetching, skipping');
      return;
    }

    // Don't fetch if auth is still loading or not initialized
    if (authLoading || !isInitialized) {
      console.log('ChildContext: Auth not ready, skipping fetch');
      return;
    }

    if (!user) {
      console.log('ChildContext: No user, clearing children');
      setChildren([]);
      setSelectedChild(null);
      setLoading(false);
      setError(null);
      return;
    }

    isFetching.current = true;

    try {
      console.log('ChildContext: Fetching children for user:', user.id);
      setError(null);
      
      // Extended delay to ensure database and native modules are ready
      // This prevents TurboModule crashes during data loading
      await new Promise(resolve => {
        fetchTimeoutRef.current = setTimeout(resolve, 500);
      });
      
      const { data, error: fetchError } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('ChildContext: Error fetching children:', fetchError);
        setError(fetchError.message);
        
        // Retry logic for transient errors
        if (retryCount < 3 && (fetchError.message.includes('timeout') || fetchError.message.includes('network'))) {
          console.log(`ChildContext: Retrying fetch (attempt ${retryCount + 1}/3)...`);
          setRetryCount(prev => prev + 1);
          isFetching.current = false;
          setTimeout(() => fetchChildren(), 2000 * (retryCount + 1));
          return;
        }
        
        setChildren([]);
        setSelectedChild(null);
      } else {
        console.log('ChildContext: Fetched children:', data?.length || 0);
        setChildren(data || []);
        setRetryCount(0); // Reset retry count on success

        // Auto-select first child if none selected and children exist
        if (data && data.length > 0 && !selectedChild) {
          console.log('ChildContext: Auto-selecting first child:', data[0].name);
          setSelectedChild(data[0]);
        } else if (data && data.length === 0) {
          // No children, clear selection
          setSelectedChild(null);
        }
      }
    } catch (err) {
      console.error('ChildContext: Unexpected error in fetchChildren:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      // Retry logic for unexpected errors
      if (retryCount < 3) {
        console.log(`ChildContext: Retrying after unexpected error (attempt ${retryCount + 1}/3)...`);
        setRetryCount(prev => prev + 1);
        isFetching.current = false;
        setTimeout(() => fetchChildren(), 2000 * (retryCount + 1));
        return;
      }
      
      setChildren([]);
      setSelectedChild(null);
    } finally {
      setLoading(false);
      isFetching.current = false;
    }
  }, [user, authLoading, isInitialized, selectedChild, retryCount]);

  useEffect(() => {
    // Only fetch when auth is initialized and done loading
    if (isInitialized && !authLoading) {
      fetchChildren();
    }

    // Cleanup function
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = null;
      }
    };
  }, [user, authLoading, isInitialized, fetchChildren]);

  const selectChild = (childId: string) => {
    try {
      const child = children.find((c) => c.id === childId);
      if (child) {
        console.log('ChildContext: Selected child:', child.name);
        setSelectedChild(child);
      } else {
        console.warn('ChildContext: Child not found:', childId);
      }
    } catch (err) {
      console.error('ChildContext: Error selecting child:', err);
    }
  };

  const addChild = async (name: string, birthDate: Date) => {
    if (!user) {
      console.error('ChildContext: Cannot add child, no user');
      throw new Error('No user logged in');
    }

    try {
      console.log('ChildContext: Adding child:', name);
      const { data, error: insertError } = await supabase
        .from('children')
        .insert({
          user_id: user.id,
          name,
          birth_date: birthDate.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (insertError) {
        console.error('ChildContext: Error adding child:', insertError);
        throw insertError;
      }

      console.log('ChildContext: Child added successfully');
      
      // Reset retry count before refresh
      setRetryCount(0);
      isFetching.current = false;
      
      await fetchChildren();
      
      // Auto-select the newly added child
      if (data) {
        setSelectedChild(data);
      }
    } catch (err) {
      console.error('ChildContext: Error in addChild:', err);
      throw err;
    }
  };

  const updateChild = async (childId: string, updates: Partial<Child>) => {
    if (!user) {
      console.error('ChildContext: Cannot update child, no user');
      throw new Error('No user logged in');
    }

    try {
      console.log('ChildContext: Updating child:', childId);
      const { error: updateError } = await supabase
        .from('children')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', childId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('ChildContext: Error updating child:', updateError);
        throw updateError;
      }

      console.log('ChildContext: Child updated successfully');
      
      // Reset retry count before refresh
      setRetryCount(0);
      isFetching.current = false;
      
      await fetchChildren();
    } catch (err) {
      console.error('ChildContext: Error in updateChild:', err);
      throw err;
    }
  };

  const deleteChild = async (childId: string) => {
    if (!user) {
      console.error('ChildContext: Cannot delete child, no user');
      throw new Error('No user logged in');
    }

    try {
      console.log('ChildContext: Deleting child:', childId);
      const { error: deleteError } = await supabase
        .from('children')
        .delete()
        .eq('id', childId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('ChildContext: Error deleting child:', deleteError);
        throw deleteError;
      }

      console.log('ChildContext: Child deleted successfully');
      
      // If deleted child was selected, clear selection
      if (selectedChild?.id === childId) {
        setSelectedChild(null);
      }
      
      // Reset retry count before refresh
      setRetryCount(0);
      isFetching.current = false;
      
      await fetchChildren();
    } catch (err) {
      console.error('ChildContext: Error in deleteChild:', err);
      throw err;
    }
  };

  const refreshChildren = async () => {
    console.log('ChildContext: Manual refresh requested');
    setRetryCount(0); // Reset retry count on manual refresh
    isFetching.current = false; // Reset fetching flag
    await fetchChildren();
  };

  return (
    <ChildContext.Provider
      value={{
        children,
        selectedChild,
        loading,
        error,
        selectChild,
        addChild,
        updateChild,
        deleteChild,
        refreshChildren,
      }}
    >
      {childrenProp}
    </ChildContext.Provider>
  );
}
