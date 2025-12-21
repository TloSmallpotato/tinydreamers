
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, { 
  CustomerInfo, 
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL 
} from 'react-native-purchases';
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
  showPaywall: () => Promise<void>;
  checkQuota: (type: 'word' | 'book' | 'child') => boolean;
  restorePurchases: () => Promise<void>;
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
  restorePurchases: async () => {},
});

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// RevenueCat API Keys - Replace with your actual keys
const REVENUECAT_API_KEY_IOS = 'YOUR_IOS_API_KEY_HERE';
const REVENUECAT_API_KEY_ANDROID = 'YOUR_ANDROID_API_KEY_HERE';

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUsage, setCurrentUsage] = useState({
    words: 0,
    books: 0,
    children: 0,
  });
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);

  // Initialize RevenueCat
  useEffect(() => {
    const initializeRevenueCat = async () => {
      try {
        console.log('SubscriptionContext: Initializing RevenueCat');
        
        // Set log level for debugging
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        // Configure RevenueCat
        const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
        await Purchases.configure({ apiKey });

        console.log('SubscriptionContext: RevenueCat initialized successfully');
      } catch (error) {
        console.error('SubscriptionContext: Error initializing RevenueCat:', error);
      }
    };

    initializeRevenueCat();
  }, []);

  // Identify user with RevenueCat
  useEffect(() => {
    const identifyUser = async () => {
      if (!authUser?.id) {
        console.log('SubscriptionContext: No auth user, skipping identification');
        return;
      }

      try {
        console.log('SubscriptionContext: Identifying user with RevenueCat:', authUser.id);
        await Purchases.logIn(authUser.id);
        
        // Get customer info
        const customerInfo = await Purchases.getCustomerInfo();
        updateSubscriptionStatus(customerInfo);
      } catch (error) {
        console.error('SubscriptionContext: Error identifying user:', error);
      }
    };

    identifyUser();
  }, [authUser?.id, updateSubscriptionStatus]);

  // Update subscription status based on customer info
  const updateSubscriptionStatus = useCallback((customerInfo: CustomerInfo) => {
    console.log('SubscriptionContext: Updating subscription status');
    console.log('SubscriptionContext: Active entitlements:', Object.keys(customerInfo.entitlements.active));

    // Check if user has active "plus" entitlement
    const hasPlus = customerInfo.entitlements.active['plus'] !== undefined;
    
    if (hasPlus) {
      console.log('SubscriptionContext: User has active Plus subscription');
      setTier('plus');
    } else {
      console.log('SubscriptionContext: User is on Free tier');
      setTier('free');
    }
    
    setIsLoading(false);
  }, []);

  // Fetch offerings
  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        console.log('SubscriptionContext: Fetching offerings');
        const offerings = await Purchases.getOfferings();
        
        if (offerings.current !== null) {
          console.log('SubscriptionContext: Current offering:', offerings.current.identifier);
          setOfferings(offerings.current);
        } else {
          console.log('SubscriptionContext: No current offering available');
        }
      } catch (error) {
        console.error('SubscriptionContext: Error fetching offerings:', error);
      }
    };

    fetchOfferings();
  }, []);

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
  const showPaywall = useCallback(async () => {
    console.log('SubscriptionContext: Showing paywall');
    
    try {
      if (!offerings) {
        Alert.alert('Error', 'Unable to load subscription options. Please try again later.');
        return;
      }

      // Get the package to purchase (assuming first package is the Plus subscription)
      const packageToPurchase = offerings.availablePackages[0];
      
      if (!packageToPurchase) {
        Alert.alert('Error', 'No subscription packages available.');
        return;
      }

      console.log('SubscriptionContext: Purchasing package:', packageToPurchase.identifier);

      // Make the purchase
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      
      // Update subscription status
      updateSubscriptionStatus(customerInfo);
      
      Alert.alert('Success', 'Welcome to Plus! You now have unlimited access.');
    } catch (error: any) {
      console.error('SubscriptionContext: Error showing paywall:', error);
      
      if (!error.userCancelled) {
        Alert.alert('Error', 'Unable to complete purchase. Please try again.');
      }
    }
  }, [offerings, updateSubscriptionStatus]);

  // Restore purchases function
  const restorePurchases = useCallback(async () => {
    console.log('SubscriptionContext: Restoring purchases');
    
    try {
      const customerInfo = await Purchases.restorePurchases();
      updateSubscriptionStatus(customerInfo);
      
      if (customerInfo.entitlements.active['plus']) {
        Alert.alert('Success', 'Your Plus subscription has been restored!');
      } else {
        Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
      }
    } catch (error) {
      console.error('SubscriptionContext: Error restoring purchases:', error);
      Alert.alert('Error', 'Unable to restore purchases. Please try again.');
    }
  }, [updateSubscriptionStatus]);

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
    restorePurchases,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
