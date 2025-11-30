
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
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchChildren = useCallback(async () => {
    if (!user) {
      setChildren([]);
      setSelectedChild(null);
      setLoading(false);
      return;
    }

    try {
      console.log('ChildContext: Fetching children for user:', user.id);
      const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('ChildContext: Error fetching children:', error);
        throw error;
      }

      console.log('ChildContext: Fetched children:', data?.length || 0);
      setChildren(data || []);

      // Auto-select first child if none selected
      if (data && data.length > 0 && !selectedChild) {
        setSelectedChild(data[0]);
      }
    } catch (error) {
      console.error('ChildContext: Error in fetchChildren:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedChild]);

  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  const selectChild = (childId: string) => {
    const child = children.find((c) => c.id === childId);
    if (child) {
      console.log('ChildContext: Selected child:', child.name);
      setSelectedChild(child);
    }
  };

  const addChild = async (name: string, birthDate: Date) => {
    if (!user) return;

    try {
      console.log('ChildContext: Adding child:', name);
      const { data, error } = await supabase
        .from('children')
        .insert({
          user_id: user.id,
          name,
          birth_date: birthDate.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) {
        console.error('ChildContext: Error adding child:', error);
        throw error;
      }

      console.log('ChildContext: Child added successfully');
      await fetchChildren();
      
      // Auto-select the newly added child
      if (data) {
        setSelectedChild(data);
      }
    } catch (error) {
      console.error('ChildContext: Error in addChild:', error);
      throw error;
    }
  };

  const updateChild = async (childId: string, updates: Partial<Child>) => {
    if (!user) return;

    try {
      console.log('ChildContext: Updating child:', childId);
      const { error } = await supabase
        .from('children')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', childId)
        .eq('user_id', user.id);

      if (error) {
        console.error('ChildContext: Error updating child:', error);
        throw error;
      }

      console.log('ChildContext: Child updated successfully');
      await fetchChildren();
    } catch (error) {
      console.error('ChildContext: Error in updateChild:', error);
      throw error;
    }
  };

  const deleteChild = async (childId: string) => {
    if (!user) return;

    try {
      console.log('ChildContext: Deleting child:', childId);
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', childId)
        .eq('user_id', user.id);

      if (error) {
        console.error('ChildContext: Error deleting child:', error);
        throw error;
      }

      console.log('ChildContext: Child deleted successfully');
      
      // If deleted child was selected, select another one
      if (selectedChild?.id === childId) {
        setSelectedChild(null);
      }
      
      await fetchChildren();
    } catch (error) {
      console.error('ChildContext: Error in deleteChild:', error);
      throw error;
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
