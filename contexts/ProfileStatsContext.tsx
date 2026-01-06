
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { useChild } from './ChildContext';

interface ProfileStatsContextType {
  profileStats: {
    words: number;
    books: number;
  };
  fetchProfileStats: () => Promise<void>;
}

const ProfileStatsContext = createContext<ProfileStatsContextType | undefined>(undefined);

export function ProfileStatsProvider({ children }: { children: React.ReactNode }) {
  const { selectedChild } = useChild();
  const [profileStats, setProfileStats] = useState({
    words: 0,
    books: 0,
  });

  // Always fetch fresh data from database - NO CACHING
  const fetchProfileStats = useCallback(async () => {
    if (!selectedChild?.id) {
      console.log('⚠️ No selected child - resetting stats to 0');
      setProfileStats({ words: 0, books: 0 });
      return;
    }
    
    console.log('🔄 Fetching fresh profile stats from database for child:', selectedChild.id);
    
    try {
      // Fetch words count - using count query for performance
      const { count: wordsCount, error: wordsError } = await supabase
        .from('user_words')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', selectedChild.id);
      
      // Fetch books count - using count query for performance
      const { count: booksCount, error: booksError } = await supabase
        .from('user_books')
        .select('*', { count: 'exact', head: true })
        .eq('child_id', selectedChild.id);
      
      if (wordsError) {
        console.error('❌ Error fetching words count:', wordsError);
        throw wordsError;
      }
      if (booksError) {
        console.error('❌ Error fetching books count:', booksError);
        throw booksError;
      }
      
      const newStats = {
        words: wordsCount || 0,
        books: booksCount || 0,
      };
      
      console.log('✅ Profile stats updated:', newStats);
      setProfileStats(newStats);
    } catch (error) {
      console.error('❌ Error in fetchProfileStats:', error);
    }
  }, [selectedChild?.id]);

  // Fetch stats when selected child changes
  useEffect(() => {
    console.log('📊 Selected child changed - fetching profile stats');
    fetchProfileStats();
  }, [selectedChild?.id, fetchProfileStats]);

  return (
    <ProfileStatsContext.Provider value={{ profileStats, fetchProfileStats }}>
      {children}
    </ProfileStatsContext.Provider>
  );
}

export function useProfileStats() {
  const context = useContext(ProfileStatsContext);
  if (context === undefined) {
    throw new Error('useProfileStats must be used within a ProfileStatsProvider');
  }
  return context;
}
