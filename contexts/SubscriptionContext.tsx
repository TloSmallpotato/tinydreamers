
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, { 
  CustomerInfo, 
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL 
} from 'react-native-purchases';
import { 
  presentPaywall,
  presentCustomerCenter,
  PaywallResult,
  CustomerCenterResult
} from 'react-native-purchases-ui';
import { useAuth } from './AuthContext';
import { supabase } from '@/app/integrations/supabase/client';

// Subscription tiers
export type SubscriptionTier = 'free' | 'pro';

// Quota limits
export const QUOTA_LIMITS = {
  free: {
    words: 20,
    books: 10,
    children: 1,
  },
  pro: {
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
  showCustomerCenter: () => Promise<void>;
  checkQuota: (type: 'word' | 'book' | 'child') => boolean;
  restorePurchases: () => Promise<void>;
  
  // Customer info
  customerInfo: CustomerInfo | null;
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
  showCustomerCenter: async () => {},
  checkQuota: () => true,
  restorePurchases: async () => {},
  customerInfo: null,
});

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// RevenueCat API Key - Updated to new test key
const REVENUECAT_API_KEY = 'test_JPYZciDEShGXlnVDqcTWfLclPCZ';

// Entitlement identifier - must match RevenueCat dashboard
const ENTITLEMENT_ID = 'The Tiny Dreamers App Pro';

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
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  // Update subscription status based on customer info
  const updateSubscriptionStatus = useCallback((info: CustomerInfo) => {
    console.log('SubscriptionContext: Updating subscription status');
    console.log('SubscriptionContext: Active entitlements:', Object.keys(info.entitlements.active));

    // Store customer info
    setCustomerInfo(info);

    // Check if user has active "The Tiny Dreamers App Pro" entitlement
    const hasPro = info.entitlements.active[ENTITLEMENT_ID] !== undefined;
    
    if (hasPro) {
      console.log('SubscriptionContext: User has active Pro subscription');
      setTier('pro');
    } else {
      console.log('SubscriptionContext: User is on Free tier');
      setTier('free');
    }
    
    setIsLoading(false);
  }, []);

  // Initialize RevenueCat
  useEffect(() => {
    const initializeRevenueCat = async () => {
      try {
        console.log('SubscriptionContext: Initializing RevenueCat');
        
        // Set log level for debugging
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        // Configure RevenueCat with the same API key for both platforms
        await Purchases.configure({ 
          apiKey: REVENUECAT_API_KEY,
        });

        console.log('SubscriptionContext: RevenueCat initialized successfully');

        // Set up customer info update listener
        Purchases.addCustomerInfoUpdateListener((info) => {
          console.log('SubscriptionContext: Customer info updated');
          updateSubscriptionStatus(info);
        });
      } catch (error) {
        console.error('SubscriptionContext: Error initializing RevenueCat:', error);
        setIsLoading(false);
      }
    };

    initializeRevenueCat();
  }, [updateSubscriptionStatus]);

  // Identify user with RevenueCat
  useEffect(() => {
    const identifyUser = async () => {
      if (!authUser?.id) {
        console.log('SubscriptionContext: No auth user, skipping identification');
        setIsLoading(false);
        return;
      }

      try {
        console.log('SubscriptionContext: Identifying user with RevenueCat:', authUser.id);
        
        // Log in user with their Supabase user ID
        const { customerInfo: info } = await Purchases.logIn(authUser.id);
        
        console.log('SubscriptionContext: User identified successfully');
        updateSubscriptionStatus(info);
      } catch (error) {
        console.error('SubscriptionContext: Error identifying user:', error);
        setIsLoading(false);
      }
    };

    identifyUser();
  }, [authUser?.id, updateSubscriptionStatus]);

  // Fetch offerings
  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        console.log('SubscriptionContext: Fetching offerings');
        const offerings = await Purchases.getOfferings();
        
        if (offerings.current !== null) {
          console.log('SubscriptionContext: Current offering:', offerings.current.identifier);
          console.log('SubscriptionContext: Available packages:', offerings.current.availablePackages.length);
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
  const isSubscribed = tier === 'pro';
  const limits = QUOTA_LIMITS[tier];

  const canAddWord = currentUsage.words < limits.words;
  const canAddBook = currentUsage.books < limits.books;
  const canAddChild = currentUsage.children < limits.children;

  const remainingWords = Math.max(0, limits.words - currentUsage.words);
  const remainingBooks = Math.max(0, limits.books - currentUsage.books);
  const remainingChildren = Math.max(0, limits.children - currentUsage.children);

  // Show RevenueCat Paywall (modern method)
  const showPaywall = useCallback(async () => {
    console.log('SubscriptionContext: Showing RevenueCat Paywall');
    
    try {
      // Present the paywall using RevenueCat UI
      const result: PaywallResult = await presentPaywall();
      
      console.log('SubscriptionContext: Paywall result:', result);
      
      // Handle the result
      if (result === PaywallResult.PURCHASED || result === PaywallResult.RESTORED) {
        // Get updated customer info
        const info = await Purchases.getCustomerInfo();
        updateSubscriptionStatus(info);
        
        Alert.alert(
          'Success! 🎉', 
          'Welcome to The Tiny Dreamers App Pro! You now have unlimited access to all features.'
        );
      } else if (result === PaywallResult.CANCELLED) {
        console.log('SubscriptionContext: User cancelled paywall');
      } else if (result === PaywallResult.ERROR) {
        console.error('SubscriptionContext: Paywall error');
        Alert.alert('Error', 'Unable to complete purchase. Please try again.');
      }
    } catch (error: any) {
      console.error('SubscriptionContext: Error showing paywall:', error);
      Alert.alert('Error', 'Unable to show subscription options. Please try again later.');
    }
  }, [updateSubscriptionStatus]);

  // Show RevenueCat Customer Center (modern method)
  const showCustomerCenter = useCallback(async () => {
    console.log('SubscriptionContext: Showing RevenueCat Customer Center');
    
    try {
      // Present the customer center using RevenueCat UI
      const result: CustomerCenterResult = await presentCustomerCenter();
      
      console.log('SubscriptionContext: Customer Center result:', result);
      
      // Handle the result
      if (result === CustomerCenterResult.RESTORED) {
        // Get updated customer info
        const info = await Purchases.getCustomerInfo();
        updateSubscriptionStatus(info);
        
        Alert.alert('Success', 'Your purchases have been restored!');
      }
    } catch (error: any) {
      console.error('SubscriptionContext: Error showing customer center:', error);
      Alert.alert('Error', 'Unable to open customer center. Please try again later.');
    }
  }, [updateSubscriptionStatus]);

  // Restore purchases function
  const restorePurchases = useCallback(async () => {
    console.log('SubscriptionContext: Restoring purchases');
    
    try {
      const info = await Purchases.restorePurchases();
      updateSubscriptionStatus(info);
      
      if (info.entitlements.active[ENTITLEMENT_ID]) {
        Alert.alert('Success', 'Your Pro subscription has been restored!');
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
    showCustomerCenter,
    checkQuota,
    restorePurchases,
    customerInfo,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
