
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useUser, useSuperwall } from 'expo-superwall';
import { useAuth } from './AuthContext';
import { supabase } from '@/app/integrations/supabase/client';

// Subscription tiers
export type SubscriptionTier = 'free' | 'plus';

// Quota limits
export const QUOTA_LIMITS = {
  free: {
    words: 20,
    books: 10,
    children: 1,
  },
  plus: {
    words: Infinity,
    books: Infinity,
    children: 2,
  },
};

interface SubscriptionContextType {
  // Subscription status
  tier: SubscriptionTier;
  isSubscribed: boolean;
  isLoading: boolean;

  // Current usage
  currentUsage: {
    words: number;
    books: number;
    children: number;
  };

  // Quota checks
  canAddWord: boolean;
  canAddBook: boolean;
  canAddChild: boolean;

  // Remaining quotas
  remainingWords: number;
  remainingBooks: number;
  remainingChildren: number;

  // Actions
  refreshUsage: () => Promise<void>;
  showPaywall: (placement?: string) => Promise<void>;
  checkQuota: (type: 'word' | 'book' | 'child') => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  tier: 'free',
  isSubscribed: false,
  isLoading: true,
  currentUsage: { words: 0, books: 0, children: 0 },
  canAddWord: true,
  canAddBook: true,
  canAddChild: true,
  remainingWords: 0,
  remainingBooks: 0,
  remainingChildren: 0,
  refreshUsage: async () => {},
  showPaywall: async () => {},
  checkQuota: () => true,
});

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser } = useAuth();
  const { subscriptionStatus, user: superwallUser } = useUser();
  const { registerPlacement } = useSuperwall();

  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUsage, setCurrentUsage] = useState({
    words: 0,
    books: 0,
    children: 0,
  });

  // Determine subscription tier based on Superwall status
  useEffect(() => {
    console.log('SubscriptionContext: Subscription status changed:', subscriptionStatus);
    
    if (subscriptionStatus?.status === 'ACTIVE') {
      console.log('SubscriptionContext: User has active subscription - setting tier to PLUS');
      setTier('plus');
    } else {
      console.log('SubscriptionContext: User has no active subscription - setting tier to FREE');
      setTier('free');
    }
    
    setIsLoading(false);
  }, [subscriptionStatus]);

  // Identify user with Superwall when auth user changes
  useEffect(() => {
    if (authUser?.id && !superwallUser) {
      console.log('SubscriptionContext: Identifying user with Superwall:', authUser.id);
      const { identify } = useUser();
      identify(authUser.id).catch(err => {
        console.error('SubscriptionContext: Error identifying user:', err);
      });
    }
  }, [authUser?.id, superwallUser]);

  // Fetch current usage from database
  const refreshUsage = useCallback(async () => {
    if (!authUser?.id) {
      console.log('SubscriptionContext: No auth user, skipping usage refresh');
      setCurrentUsage({ words: 0, books: 0, children: 0 });
      return;
    }

    try {
      console.log('SubscriptionContext: Refreshing usage for user:', authUser.id);

      const [wordsResult, booksResult, childrenResult] = await Promise.allSettled([
        supabase
          .from('user_words')
          .select('*', { count: 'exact', head: true })
          .in('child_id', 
            supabase
              .from('children')
              .select('id')
              .eq('user_id', authUser.id)
          ),
        supabase
          .from('user_books')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id),
        supabase
          .from('children')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id),
      ]);

      const wordsCount = wordsResult.status === 'fulfilled' && !wordsResult.value.error
        ? wordsResult.value.count || 0
        : 0;

      const booksCount = booksResult.status === 'fulfilled' && !booksResult.value.error
        ? booksResult.value.count || 0
        : 0;

      const childrenCount = childrenResult.status === 'fulfilled' && !childrenResult.value.error
        ? childrenResult.value.count || 0
        : 0;

      console.log('SubscriptionContext: Usage counts - Words:', wordsCount, 'Books:', booksCount, 'Children:', childrenCount);

      setCurrentUsage({
        words: wordsCount,
        books: booksCount,
        children: childrenCount,
      });
    } catch (err) {
      console.error('SubscriptionContext: Error refreshing usage:', err);
    }
  }, [authUser?.id]);

  // Refresh usage when auth user changes
  useEffect(() => {
    if (authUser?.id) {
      refreshUsage();
    }
  }, [authUser?.id, refreshUsage]);

  // Calculate quota availability
  const isSubscribed = tier === 'plus';
  const limits = QUOTA_LIMITS[tier];

  const canAddWord = currentUsage.words < limits.words;
  const canAddBook = currentUsage.books < limits.books;
  const canAddChild = currentUsage.children < limits.children;

  const remainingWords = Math.max(0, limits.words - currentUsage.words);
  const remainingBooks = Math.max(0, limits.books - currentUsage.books);
  const remainingChildren = Math.max(0, limits.children - currentUsage.children);

  // Show paywall function
  const showPaywall = useCallback(async (placement: string = 'upgrade_prompt') => {
    console.log('SubscriptionContext: Showing paywall for placement:', placement);
    
    try {
      await registerPlacement(placement, {}, null);
    } catch (err) {
      console.error('SubscriptionContext: Error showing paywall:', err);
    }
  }, [registerPlacement]);

  // Check quota function
  const checkQuota = useCallback((type: 'word' | 'book' | 'child'): boolean => {
    console.log('SubscriptionContext: Checking quota for:', type);
    
    switch (type) {
      case 'word':
        return canAddWord;
      case 'book':
        return canAddBook;
      case 'child':
        return canAddChild;
      default:
        return false;
    }
  }, [canAddWord, canAddBook, canAddChild]);

  const value: SubscriptionContextType = {
    tier,
    isSubscribed,
    isLoading,
    currentUsage,
    canAddWord,
    canAddBook,
    canAddChild,
    remainingWords,
    remainingBooks,
    remainingChildren,
    refreshUsage,
    showPaywall,
    checkQuota,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
