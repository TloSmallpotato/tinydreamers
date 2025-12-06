
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  const { user, loading: authLoading } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChildren = useCallback(async () => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      console.log('ChildContext: Auth still loading, skipping fetch');
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

    try {
      console.log('ChildContext: Fetching children for user:', user.id);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('ChildContext: Error fetching children:', fetchError);
        setError(fetchError.message);
        // Don't throw, just set error state
        setChildren([]);
        setSelectedChild(null);
      } else {
        console.log('ChildContext: Fetched children:', data?.length || 0);
        setChildren(data || []);

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
      setError(err instanceof Error ? err.message : 'Unknown error');
      setChildren([]);
      setSelectedChild(null);
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, selectedChild]);

  useEffect(() => {
    fetchChildren();
  }, [user, authLoading]);

  const selectChild = (childId: string) => {
    const child = children.find((c) => c.id === childId);
    if (child) {
      console.log('ChildContext: Selected child:', child.name);
      setSelectedChild(child);
    } else {
      console.warn('ChildContext: Child not found:', childId);
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
      
      await fetchChildren();
    } catch (err) {
      console.error('ChildContext: Error in deleteChild:', err);
      throw err;
    }
  };

  const refreshChildren = async () => {
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
