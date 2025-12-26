
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/app/integrations/supabase/client';
import { useChild } from './ChildContext';

interface StatsContextType {
  incrementWordCount: () => void;
  decrementWordCount: () => void;
  incrementBookCount: () => void;
  decrementBookCount: () => void;
  incrementMomentCount: () => void;
  decrementMomentCount: () => void;
  refreshStats: () => Promise<void>;
  stats: {
    totalWords: number;
    totalBooks: number;
    wordsThisWeek: number;
    booksThisWeek: number;
    momentsThisWeek: number;
  };
  isLoading: boolean;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

const getStartOfWeek = (): Date => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

export function StatsProvider({ children }: { children: React.ReactNode }) {
  const { selectedChild } = useChild();
  const [stats, setStats] = useState({
    totalWords: 0,
    totalBooks: 0,
    wordsThisWeek: 0,
    booksThisWeek: 0,
    momentsThisWeek: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch stats from database
  const fetchStats = useCallback(async (showLoading = true) => {
    if (!selectedChild) {
      console.log('StatsContext: No child selected, resetting stats');
      setStats({
        totalWords: 0,
        totalBooks: 0,
        wordsThisWeek: 0,
        booksThisWeek: 0,
        momentsThisWeek: 0,
      });
      if (showLoading) {
        setIsLoading(false);
      }
      return;
    }

    try {
      console.log('StatsContext: Fetching stats for child:', selectedChild.id);
      if (showLoading) {
        setIsLoading(true);
      }
      const startOfWeek = getStartOfWeek();
      const startOfWeekISO = startOfWeek.toISOString();

      const [
        totalWordsResult,
        wordsThisWeekResult,
        totalBooksResult,
        booksThisWeekResult,
        momentsThisWeekResult,
      ] = await Promise.allSettled([
        supabase
          .from('user_words')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id),
        supabase
          .from('user_words')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id)
          .gte('created_at', startOfWeekISO),
        supabase
          .from('user_books')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id),
        supabase
          .from('user_books')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id)
          .gte('created_at', startOfWeekISO),
        supabase
          .from('moments')
          .select('*', { count: 'exact', head: true })
          .eq('child_id', selectedChild.id)
          .gte('created_at', startOfWeekISO),
      ]);

      const totalWordsCount = totalWordsResult.status === 'fulfilled' && !totalWordsResult.value.error
        ? totalWordsResult.value.count || 0
        : 0;

      const wordsThisWeekCount = wordsThisWeekResult.status === 'fulfilled' && !wordsThisWeekResult.value.error
        ? wordsThisWeekResult.value.count || 0
        : 0;

      const totalBooksCount = totalBooksResult.status === 'fulfilled' && !totalBooksResult.value.error
        ? totalBooksResult.value.count || 0
        : 0;

      const booksThisWeekCount = booksThisWeekResult.status === 'fulfilled' && !booksThisWeekResult.value.error
        ? booksThisWeekResult.value.count || 0
        : 0;

      const momentsThisWeekCount = momentsThisWeekResult.status === 'fulfilled' && !momentsThisWeekResult.value.error
        ? momentsThisWeekResult.value.count || 0
        : 0;

      console.log('StatsContext: Stats loaded -', {
        totalWords: totalWordsCount,
        wordsThisWeek: wordsThisWeekCount,
        totalBooks: totalBooksCount,
        booksThisWeek: booksThisWeekCount,
        momentsThisWeek: momentsThisWeekCount,
      });

      setStats({
        totalWords: totalWordsCount,
        totalBooks: totalBooksCount,
        wordsThisWeek: wordsThisWeekCount,
        booksThisWeek: booksThisWeekCount,
        momentsThisWeek: momentsThisWeekCount,
      });
    } catch (error) {
      console.error('StatsContext: Error fetching stats:', error);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [selectedChild]);

  // Fetch initial stats when selected child changes
  useEffect(() => {
    fetchStats(true);
  }, [fetchStats]);

  // Silent refresh function - fetches stats without showing loader
  // Added small delay to ensure database consistency
  const refreshStats = useCallback(async () => {
    console.log('StatsContext: Silent refresh triggered');
    // Add a small delay to ensure database has committed changes
    await new Promise(resolve => setTimeout(resolve, 100));
    await fetchStats(false);
  }, [fetchStats]);

  const incrementWordCount = useCallback(() => {
    console.log('StatsContext: Incrementing word count');
    setStats(prev => ({
      ...prev,
      totalWords: prev.totalWords + 1,
      wordsThisWeek: prev.wordsThisWeek + 1,
    }));
  }, []);

  const decrementWordCount = useCallback(() => {
    console.log('StatsContext: Decrementing word count');
    setStats(prev => ({
      ...prev,
      totalWords: Math.max(0, prev.totalWords - 1),
      wordsThisWeek: Math.max(0, prev.wordsThisWeek - 1),
    }));
  }, []);

  const incrementBookCount = useCallback(() => {
    console.log('StatsContext: Incrementing book count');
    setStats(prev => ({
      ...prev,
      totalBooks: prev.totalBooks + 1,
      booksThisWeek: prev.booksThisWeek + 1,
    }));
  }, []);

  const decrementBookCount = useCallback(() => {
    console.log('StatsContext: Decrementing book count');
    setStats(prev => ({
      ...prev,
      totalBooks: Math.max(0, prev.totalBooks - 1),
      booksThisWeek: Math.max(0, prev.booksThisWeek - 1),
    }));
  }, []);

  const incrementMomentCount = useCallback(() => {
    console.log('StatsContext: Incrementing moment count');
    setStats(prev => ({
      ...prev,
      momentsThisWeek: prev.momentsThisWeek + 1,
    }));
  }, []);

  const decrementMomentCount = useCallback(() => {
    console.log('StatsContext: Decrementing moment count');
    setStats(prev => ({
      ...prev,
      momentsThisWeek: Math.max(0, prev.momentsThisWeek - 1),
    }));
  }, []);

  return (
    <StatsContext.Provider
      value={{
        incrementWordCount,
        decrementWordCount,
        incrementBookCount,
        decrementBookCount,
        incrementMomentCount,
        decrementMomentCount,
        refreshStats,
        stats,
        isLoading,
      }}
    >
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  const context = useContext(StatsContext);
  if (context === undefined) {
    throw new Error('useStats must be used within a StatsProvider');
  }
  return context;
}
