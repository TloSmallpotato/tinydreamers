
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { useChild } from './ChildContext';

interface ProfileStatsContextType {
  stats: {
    books: number;
    words: number;
  };
  fetchProfileStats: () => Promise<void>;
}

const ProfileStatsContext = createContext<ProfileStatsContextType | null>(null);

const getStartOfWeek = (): Date => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

export const ProfileStatsProvider = ({ children }: { children: React.ReactNode }) => {
  const { selectedChild } = useChild();
  const [stats, setStats] = useState({ books: 0, words: 0 });

  const fetchProfileStats = useCallback(async () => {
    if (!selectedChild) {
      console.log('ProfileStatsContext: No child selected, resetting stats');
      setStats({ books: 0, words: 0 });
      return;
    }

    try {
      console.log('ProfileStatsContext: Fetching stats for child:', selectedChild.id);

      const [booksResult, wordsResult] = await Promise.allSettled([
        supabase
          .from('user_books')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id),
        supabase
          .from('user_words')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id),
      ]);

      const bookCount = booksResult.status === 'fulfilled' && !booksResult.value.error
        ? booksResult.value.count || 0
        : 0;

      const wordCount = wordsResult.status === 'fulfilled' && !wordsResult.value.error
        ? wordsResult.value.count || 0
        : 0;

      console.log('ProfileStatsContext: Stats fetched - Books:', bookCount, 'Words:', wordCount);
      setStats({ books: bookCount, words: wordCount });
    } catch (error) {
      console.error('ProfileStatsContext: Error fetching stats:', error);
    }
  }, [selectedChild]);

  // Fetch initial stats when selected child changes
  useEffect(() => {
    fetchProfileStats();
  }, [fetchProfileStats]);

  return (
    <ProfileStatsContext.Provider value={{ stats, fetchProfileStats }}>
      {children}
    </ProfileStatsContext.Provider>
  );
};

export const useProfileStats = () => {
  const context = useContext(ProfileStatsContext);
  if (context === null) {
    throw new Error('useProfileStats must be used within a ProfileStatsProvider');
  }
  return context;
};
