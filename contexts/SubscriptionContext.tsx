
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import Purchases, { 
  CustomerInfo, 
  PurchasesOfferings,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL 
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useAuth } from './AuthContext';
import { supabase } from '@/app/integrations/supabase/client';
import Constants from 'expo-constants';

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
  showPaywall: (offeringId?: string) => Promise<void>;
  showPaywallIfNeeded: (offeringId?: string) => Promise<void>;
  showCustomerCenter: () => Promise<void>;
  checkQuota: (type: 'word' | 'book' | 'child') => boolean;
  restorePurchases: () => Promise<void>;
  
  // Customer info
  customerInfo: CustomerInfo | null;
  
  // Offerings
  offerings: PurchasesOfferings | null;
  
  // Diagnostics
  diagnosticInfo: string;
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
  showPaywallIfNeeded: async () => {},
  showCustomerCenter: async () => {},
  checkQuota: () => true,
  restorePurchases: async () => {},
  customerInfo: null,
  offerings: null,
  diagnosticInfo: '',
});

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// RevenueCat API Key - Production
const REVENUECAT_API_KEY = 'appl_CAIIKFRhCsQOKYjSgyJfgnhuBsK';

// Entitlement identifier - must match RevenueCat dashboard
const ENTITLEMENT_ID = 'The Tiny Dreamers App Pro';

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user: authUser } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUsage, setCurrentUsage] = useState({
    words: 0,
    books: 0,
    children: 0,
  });
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isRevenueCatReady, setIsRevenueCatReady] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState('');

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
      // Skip RevenueCat initialization on web
      if (Platform.OS === 'web') {
        console.log('SubscriptionContext: Skipping RevenueCat initialization on web');
        setDiagnosticInfo('Platform: Web (RevenueCat not supported)');
        setIsLoading(false);
        return;
      }

      // Warn if running in Expo Go
      if (isExpoGo) {
        console.warn('========================================');
        console.warn('⚠️  EXPO GO DETECTED');
        console.warn('RevenueCat Paywalls do NOT work in Expo Go!');
        console.warn('To test paywalls, you need to:');
        console.warn('1. Create a development build: eas build --profile development');
        console.warn('2. Or test in production: TestFlight or App Store');
        console.warn('========================================');
        setDiagnosticInfo('Platform: Expo Go (RevenueCat not supported)');
        setIsLoading(false);
        return;
      }

      try {
        console.log('========================================');
        console.log('🔧 REVENUECAT INITIALIZATION DIAGNOSTICS');
        console.log('========================================');
        console.log('Platform:', Platform.OS);
        console.log('API Key:', REVENUECAT_API_KEY);
        console.log('Entitlement ID:', ENTITLEMENT_ID);
        console.log('========================================');
        
        // Set log level for debugging
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);

        // Configure RevenueCat with the same API key for both platforms
        await Purchases.configure({ 
          apiKey: REVENUECAT_API_KEY,
        });

        console.log('✅ RevenueCat initialized successfully');
        setIsRevenueCatReady(true);
        setDiagnosticInfo(`Platform: ${Platform.OS}\nAPI Key: ${REVENUECAT_API_KEY.substring(0, 15)}...\nStatus: Initialized`);

        // Set up customer info update listener
        Purchases.addCustomerInfoUpdateListener((info) => {
          console.log('SubscriptionContext: Customer info updated');
          updateSubscriptionStatus(info);
        });
      } catch (error: any) {
        console.error('========================================');
        console.error('❌ ERROR INITIALIZING REVENUECAT');
        console.error('Error:', error);
        console.error('Error message:', error?.message);
        console.error('========================================');
        setDiagnosticInfo(`Platform: ${Platform.OS}\nError: ${error?.message || 'Unknown error'}`);
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

      // Skip RevenueCat identification on web or Expo Go
      if (Platform.OS === 'web' || isExpoGo) {
        console.log('SubscriptionContext: Skipping RevenueCat identification (web or Expo Go)');
        setIsLoading(false);
        return;
      }

      if (!isRevenueCatReady) {
        console.log('SubscriptionContext: RevenueCat not ready yet, waiting...');
        return;
      }

      try {
        console.log('========================================');
        console.log('👤 IDENTIFYING USER WITH REVENUECAT');
        console.log('User ID:', authUser.id);
        console.log('========================================');
        
        // Log in user with their Supabase user ID
        const { customerInfo: info } = await Purchases.logIn(authUser.id);
        
        console.log('✅ User identified successfully');
        console.log('Customer Info:', {
          originalAppUserId: info.originalAppUserId,
          activeSubscriptions: info.activeSubscriptions,
          allPurchasedProductIdentifiers: info.allPurchasedProductIdentifiers,
          entitlements: Object.keys(info.entitlements.all),
          activeEntitlements: Object.keys(info.entitlements.active),
        });
        console.log('========================================');
        
        updateSubscriptionStatus(info);
      } catch (error: any) {
        console.error('========================================');
        console.error('❌ ERROR IDENTIFYING USER');
        console.error('Error:', error);
        console.error('Error message:', error?.message);
        console.error('========================================');
        setIsLoading(false);
      }
    };

    identifyUser();
  }, [authUser?.id, isRevenueCatReady, updateSubscriptionStatus]);

  // Fetch offerings
  useEffect(() => {
    const fetchOfferings = async () => {
      // Skip fetching offerings on web or Expo Go
      if (Platform.OS === 'web' || isExpoGo) {
        console.log('SubscriptionContext: Skipping offerings fetch (web or Expo Go)');
        return;
      }

      if (!isRevenueCatReady) {
        console.log('SubscriptionContext: RevenueCat not ready yet, waiting...');
        return;
      }

      try {
        console.log('========================================');
        console.log('📦 FETCHING REVENUECAT OFFERINGS');
        console.log('========================================');
        
        const fetchedOfferings = await Purchases.getOfferings();
        
        console.log('Offerings Response:', {
          current: fetchedOfferings.current?.identifier || 'null',
          allOfferingIds: Object.keys(fetchedOfferings.all),
          totalOfferings: Object.keys(fetchedOfferings.all).length,
        });

        if (fetchedOfferings.current !== null) {
          console.log('✅ Current Offering Found:', fetchedOfferings.current.identifier);
          console.log('Available Packages:', fetchedOfferings.current.availablePackages.length);
          console.log('Package Details:');
          fetchedOfferings.current.availablePackages.forEach((pkg, index) => {
            console.log(`  Package ${index + 1}:`, {
              identifier: pkg.identifier,
              packageType: pkg.packageType,
              product: {
                identifier: pkg.product.identifier,
                title: pkg.product.title,
                description: pkg.product.description,
                price: pkg.product.priceString,
              },
            });
          });
          setOfferings(fetchedOfferings);
          setDiagnosticInfo(prev => `${prev}\nOfferings: ${Object.keys(fetchedOfferings.all).length} found\nCurrent: ${fetchedOfferings.current.identifier}`);
        } else {
          console.warn('========================================');
          console.warn('⚠️  NO CURRENT OFFERING AVAILABLE');
          console.warn('========================================');
          console.warn('This means:');
          console.warn('1. No offering is set as "current" in RevenueCat dashboard');
          console.warn('2. Or no offerings are configured at all');
          console.warn('');
          console.warn('To fix this:');
          console.warn('1. Go to RevenueCat Dashboard');
          console.warn('2. Navigate to Products > Offerings');
          console.warn('3. Create an offering if none exists');
          console.warn('4. Set one offering as "current"');
          console.warn('5. Add products/packages to the offering');
          console.warn('========================================');
          
          // Check if there are any offerings at all
          const allOfferingIds = Object.keys(fetchedOfferings.all);
          if (allOfferingIds.length > 0) {
            console.warn('Available offerings (not set as current):');
            allOfferingIds.forEach(id => {
              console.warn(`  - ${id}`);
            });
            setDiagnosticInfo(prev => `${prev}\nOfferings: ${allOfferingIds.length} found but none set as current\nAvailable: ${allOfferingIds.join(', ')}`);
          } else {
            console.warn('No offerings configured at all!');
            setDiagnosticInfo(prev => `${prev}\nOfferings: None configured in RevenueCat dashboard`);
          }
        }
        
        console.log('========================================');
      } catch (error: any) {
        console.error('========================================');
        console.error('❌ ERROR FETCHING OFFERINGS');
        console.error('Error:', error);
        console.error('Error message:', error?.message);
        console.error('Error code:', error?.code);
        console.error('========================================');
        setDiagnosticInfo(prev => `${prev}\nOfferings Error: ${error?.message || 'Unknown error'}`);
      }
    };

    fetchOfferings();
  }, [isRevenueCatReady]);

  // Fetch current usage from database
  const refreshUsage = useCallback(async () => {
    if (!authUser?.id) {
      console.log('SubscriptionContext: No auth user, skipping usage refresh');
      setCurrentUsage({ words: 0, books: 0, children: 0 });
      return;
    }

    try {
      console.log('SubscriptionContext: Refreshing usage for user:', authUser.id);

      // First, get the child IDs for this user
      const { data: childrenData, error: childrenError } = await supabase
        .from('children')
        .select('id')
        .eq('user_id', authUser.id);

      if (childrenError) {
        console.error('SubscriptionContext: Error fetching children:', childrenError);
        return;
      }

      const childIds = childrenData?.map(child => child.id) || [];
      console.log('SubscriptionContext: Found child IDs:', childIds);

      // If no children, set usage to 0
      if (childIds.length === 0) {
        console.log('SubscriptionContext: No children found, setting usage to 0');
        setCurrentUsage({ words: 0, books: 0, children: 0 });
        return;
      }

      // Fetch counts for words, books, and children
      const [wordsResult, booksResult, childrenResult] = await Promise.allSettled([
        supabase
          .from('user_words')
          .select('*', { count: 'exact', head: true })
          .in('child_id', childIds),
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

  // Show RevenueCat Paywall
  const showPaywall = useCallback(async (offeringId?: string) => {
    console.log('========================================');
    console.log('💳 SHOWING PAYWALL');
    console.log('Platform:', Platform.OS);
    console.log('Offering ID:', offeringId || 'default');
    console.log('Is Expo Go:', isExpoGo);
    console.log('Is RevenueCat Ready:', isRevenueCatReady);
    console.log('Offerings Available:', offerings !== null);
    console.log('========================================');
    
    // Check if we're on web - RevenueCat doesn't support web
    if (Platform.OS === 'web') {
      console.warn('⚠️ RevenueCat is not supported on web');
      Alert.alert(
        'Web Not Supported',
        'Subscriptions are only available on iOS and Android. Please use the mobile app to upgrade to Pro.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if running in Expo Go
    if (isExpoGo) {
      console.warn('⚠️ Running in Expo Go');
      Alert.alert(
        'Expo Go Not Supported',
        'RevenueCat Paywalls do not work in Expo Go.\n\nTo test subscriptions, you need to:\n\n1. Create a development build:\n   eas build --profile development\n\n2. Or test in production:\n   TestFlight or App Store',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isRevenueCatReady) {
      console.error('❌ RevenueCat not initialized');
      Alert.alert(
        'Not Ready',
        'Subscription system is not ready. Please try again in a moment.\n\nIf this persists, please restart the app.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    try {
      console.log('Preparing to show paywall...');
      
      // Get the offering to display
      let offeringToShow: PurchasesOffering | undefined;
      
      if (offeringId && offerings) {
        // Use specific offering if provided
        offeringToShow = offerings.all[offeringId];
        console.log('Using specific offering:', offeringId);
      } else if (offerings?.current) {
        // Use current offering as default
        offeringToShow = offerings.current;
        console.log('Using current offering:', offerings.current.identifier);
      }

      if (!offeringToShow) {
        console.error('========================================');
        console.error('❌ NO OFFERING AVAILABLE');
        console.error('========================================');
        console.error('Diagnostic Info:');
        console.error(diagnosticInfo);
        console.error('========================================');
        
        Alert.alert(
          'Configuration Error',
          `No subscription offerings are available. Please check your RevenueCat dashboard configuration.\n\n📋 Diagnostic Info:\n${diagnosticInfo}\n\n🔧 Steps to fix:\n1. Go to RevenueCat Dashboard\n2. Navigate to Products > Offerings\n3. Create an offering\n4. Set it as "current"\n5. Add products to the offering\n6. Ensure entitlement "${ENTITLEMENT_ID}" is configured`,
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('Calling RevenueCatUI.presentPaywall()...');
      console.log('Offering:', offeringToShow.identifier);
      console.log('Packages:', offeringToShow.availablePackages.length);
      
      // Present the paywall using RevenueCat UI with the offering
      const result: PAYWALL_RESULT = await RevenueCatUI.presentPaywall({
        offering: offeringToShow,
      });
      
      console.log('✅ Paywall result:', result);
      
      // Handle the result
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        console.log('🎉 Purchase successful! Refreshing customer info...');
        // Get updated customer info
        const info = await Purchases.getCustomerInfo();
        updateSubscriptionStatus(info);
        
        Alert.alert(
          'Success! 🎉', 
          'Welcome to The Tiny Dreamers App Pro! You now have unlimited access to all features.'
        );
      } else if (result === PAYWALL_RESULT.CANCELLED) {
        console.log('User cancelled paywall');
      } else if (result === PAYWALL_RESULT.ERROR) {
        console.error('❌ Paywall error');
        Alert.alert('Error', 'Unable to complete purchase. Please try again.');
      } else if (result === PAYWALL_RESULT.NOT_PRESENTED) {
        console.warn('⚠️ Paywall not presented');
        Alert.alert('Error', 'Unable to show paywall. Please check your RevenueCat configuration.');
      }
      
      console.log('========================================');
    } catch (error: any) {
      console.error('========================================');
      console.error('❌ ERROR SHOWING PAYWALL');
      console.error('Error:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('Diagnostic Info:', diagnosticInfo);
      console.error('========================================');
      
      Alert.alert(
        'Error',
        `Unable to show subscription options.\n\nError: ${error?.message || 'Unknown error'}\n\n📋 Diagnostic Info:\n${diagnosticInfo}`,
        [{ text: 'OK' }]
      );
    }
  }, [offerings, isRevenueCatReady, updateSubscriptionStatus, diagnosticInfo]);

  // Show RevenueCat Paywall If Needed (conditional)
  const showPaywallIfNeeded = useCallback(async (offeringId?: string) => {
    console.log('========================================');
    console.log('💳 SHOWING PAYWALL IF NEEDED');
    console.log('Platform:', Platform.OS);
    console.log('Offering ID:', offeringId || 'default');
    console.log('Is Expo Go:', isExpoGo);
    console.log('========================================');
    
    // Check if we're on web - RevenueCat doesn't support web
    if (Platform.OS === 'web') {
      console.warn('⚠️ RevenueCat is not supported on web');
      Alert.alert(
        'Web Not Supported',
        'Subscriptions are only available on iOS and Android. Please use the mobile app to upgrade to Pro.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if running in Expo Go
    if (isExpoGo) {
      console.warn('⚠️ Running in Expo Go');
      Alert.alert(
        'Expo Go Not Supported',
        'RevenueCat Paywalls do not work in Expo Go.\n\nTo test subscriptions, you need to:\n\n1. Create a development build:\n   eas build --profile development\n\n2. Or test in production:\n   TestFlight or App Store',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isRevenueCatReady) {
      console.error('❌ RevenueCat not initialized');
      Alert.alert('Error', 'Subscription system is not ready. Please try again in a moment.');
      return;
    }
    
    try {
      console.log('Preparing to show conditional paywall...');
      
      // Get the offering to display
      let offeringToShow: PurchasesOffering | undefined;
      
      if (offeringId && offerings) {
        // Use specific offering if provided
        offeringToShow = offerings.all[offeringId];
        console.log('Using specific offering:', offeringId);
      } else if (offerings?.current) {
        // Use current offering as default
        offeringToShow = offerings.current;
        console.log('Using current offering:', offerings.current.identifier);
      }

      if (!offeringToShow) {
        console.error('❌ No offering available');
        Alert.alert(
          'Configuration Error',
          `No subscription offerings are available. Please check your RevenueCat dashboard configuration.\n\n📋 Diagnostic Info:\n${diagnosticInfo}`,
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('Calling RevenueCatUI.presentPaywallIfNeeded()...');
      console.log('Offering:', offeringToShow.identifier);
      console.log('Required entitlement:', ENTITLEMENT_ID);
      
      // Present the paywall conditionally using RevenueCat UI
      const result: PAYWALL_RESULT = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_ID,
        offering: offeringToShow,
      });
      
      console.log('✅ Conditional paywall result:', result);
      
      // Handle the result
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        console.log('🎉 Purchase successful! Refreshing customer info...');
        // Get updated customer info
        const info = await Purchases.getCustomerInfo();
        updateSubscriptionStatus(info);
        
        Alert.alert(
          'Success! 🎉', 
          'Welcome to The Tiny Dreamers App Pro! You now have unlimited access to all features.'
        );
      } else if (result === PAYWALL_RESULT.CANCELLED) {
        console.log('User cancelled paywall');
      } else if (result === PAYWALL_RESULT.ERROR) {
        console.error('❌ Paywall error');
        Alert.alert('Error', 'Unable to complete purchase. Please try again.');
      } else if (result === PAYWALL_RESULT.NOT_PRESENTED) {
        console.log('ℹ️ Paywall not needed (user already has entitlement)');
      }
      
      console.log('========================================');
    } catch (error: any) {
      console.error('========================================');
      console.error('❌ ERROR SHOWING CONDITIONAL PAYWALL');
      console.error('Error:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      console.error('========================================');
      Alert.alert('Error', `Unable to show subscription options: ${error?.message || 'Unknown error'}`);
    }
  }, [offerings, isRevenueCatReady, updateSubscriptionStatus, diagnosticInfo]);

  // Show RevenueCat Customer Center
  const showCustomerCenter = useCallback(async () => {
    console.log('SubscriptionContext: Showing RevenueCat Customer Center');
    
    // Check if we're on web - RevenueCat doesn't support web
    if (Platform.OS === 'web') {
      console.warn('SubscriptionContext: RevenueCat is not supported on web');
      Alert.alert(
        'Web Not Supported',
        'Subscription management is only available on iOS and Android. Please use the mobile app to manage your subscription.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if running in Expo Go
    if (isExpoGo) {
      console.warn('SubscriptionContext: ⚠️ Running in Expo Go');
      Alert.alert(
        'Expo Go Not Supported',
        'RevenueCat Customer Center does not work in Expo Go.\n\nTo manage subscriptions, you need to use a development build or production app.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isRevenueCatReady) {
      console.error('SubscriptionContext: ✗ RevenueCat not initialized');
      Alert.alert('Error', 'Subscription system is not ready. Please try again in a moment.');
      return;
    }
    
    try {
      // Present the customer center using RevenueCat UI
      await RevenueCatUI.presentCustomerCenter();
      
      console.log('SubscriptionContext: Customer Center dismissed');
      
      // Refresh customer info after customer center is dismissed
      const info = await Purchases.getCustomerInfo();
      updateSubscriptionStatus(info);
    } catch (error: any) {
      console.error('SubscriptionContext: Error showing customer center:', error);
      Alert.alert('Error', 'Unable to open customer center. Please try again later.');
    }
  }, [isRevenueCatReady, updateSubscriptionStatus]);

  // Restore purchases function
  const restorePurchases = useCallback(async () => {
    console.log('SubscriptionContext: Restoring purchases');
    
    // Check if we're on web - RevenueCat doesn't support web
    if (Platform.OS === 'web') {
      console.warn('SubscriptionContext: RevenueCat is not supported on web');
      Alert.alert(
        'Web Not Supported',
        'Purchase restoration is only available on iOS and Android. Please use the mobile app to restore your purchases.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if running in Expo Go
    if (isExpoGo) {
      console.warn('SubscriptionContext: ⚠️ Running in Expo Go');
      Alert.alert(
        'Expo Go Not Supported',
        'Purchase restoration does not work in Expo Go.\n\nTo restore purchases, you need to use a development build or production app.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isRevenueCatReady) {
      console.error('SubscriptionContext: ✗ RevenueCat not initialized');
      Alert.alert('Error', 'Subscription system is not ready. Please try again in a moment.');
      return;
    }
    
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
  }, [isRevenueCatReady, updateSubscriptionStatus]);

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
    showPaywallIfNeeded,
    showCustomerCenter,
    checkQuota,
    restorePurchases,
    customerInfo,
    offerings,
    diagnosticInfo,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
