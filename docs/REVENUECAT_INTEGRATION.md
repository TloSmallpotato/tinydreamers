
# RevenueCat Integration Guide

This document provides a complete guide to the RevenueCat integration for the freemium subscription model in the Natively app.

## Overview

The app uses **RevenueCat** to manage in-app subscriptions with a freemium model:

- **Free Tier**: 20 words, 10 books, 1 child
- **Plus Tier**: Unlimited words, unlimited books, 2 children

## Setup Instructions

### 1. Create RevenueCat Account

1. Sign up at [RevenueCat](https://www.revenuecat.com)
2. Create a new project
3. Note your project name

### 2. Get API Keys

1. In RevenueCat dashboard, go to **Settings** → **API Keys**
2. Copy your **iOS API Key** (starts with `appl_`)
3. Copy your **Android API Key** (starts with `goog_`)
4. Keep these keys safe

### 3. Configure API Keys in App

Update `contexts/SubscriptionContext.tsx` with your actual API keys:

```typescript
const REVENUECAT_API_KEY_IOS = 'appl_YOUR_IOS_KEY_HERE';
const REVENUECAT_API_KEY_ANDROID = 'goog_YOUR_ANDROID_KEY_HERE';
```

### 4. Create Subscription Products

#### In App Store Connect (iOS)

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Go to **Features** → **In-App Purchases**
4. Click **+** to create new subscription
5. Fill in details:
   - **Reference Name**: "Plus Subscription"
   - **Product ID**: `plus_subscription`
   - **Subscription Group**: Create new group "Natively Plus"
   - **Duration**: 1 month
   - **Price**: Set your price (e.g., $4.99/month)
6. Add localized descriptions
7. Submit for review

#### In Google Play Console (Android)

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to **Monetize** → **Subscriptions**
4. Click **Create subscription**
5. Fill in details:
   - **Product ID**: `plus_subscription`
   - **Name**: "Plus Subscription"
   - **Description**: "Unlimited words, books, and 2 children"
   - **Billing period**: 1 month
   - **Price**: Set your price (e.g., $4.99/month)
6. Save and activate

### 5. Configure Products in RevenueCat

#### Add App Store Connect Integration

1. In RevenueCat dashboard, go to **Project Settings** → **App Store Connect**
2. Upload your App Store Connect API Key
3. Select your app
4. RevenueCat will automatically sync your products

#### Add Google Play Integration

1. In RevenueCat dashboard, go to **Project Settings** → **Google Play**
2. Upload your Google Play service account JSON
3. Select your app
4. RevenueCat will automatically sync your products

#### Create Entitlements

1. Go to **Entitlements** in RevenueCat dashboard
2. Click **+ New**
3. Create entitlement:
   - **Identifier**: `plus`
   - **Name**: "Plus Subscription"
4. Save entitlement

#### Attach Products to Entitlements

1. In the `plus` entitlement, click **Attach Products**
2. Select `plus_subscription` for both iOS and Android
3. Save changes

#### Create Offerings

1. Go to **Offerings** in RevenueCat dashboard
2. Click **+ New**
3. Create offering:
   - **Identifier**: `default`
   - **Name**: "Default Offering"
4. Add package:
   - **Identifier**: `monthly`
   - **Product**: `plus_subscription`
5. Make this the current offering

## Architecture

### Components

```
app/
├── _layout.tsx                          # App initialization
contexts/
├── SubscriptionContext.tsx              # RevenueCat integration & state
components/
├── SubscriptionStatusCard.tsx           # Profile subscription display
├── UpgradePromptModal.tsx              # Quota limit modal
hooks/
├── useQuotaCheck.ts                    # Quota checking hook
```

### Data Flow

```
User Action
    ↓
useQuotaCheck hook
    ↓
SubscriptionContext.checkQuota()
    ↓
[Quota Available?]
    ├─ Yes → Proceed with action
    └─ No  → Show UpgradePromptModal
              ↓
         User clicks "Upgrade"
              ↓
         RevenueCat Purchase Flow
              ↓
         [Purchase Complete?]
              ├─ Yes → Update subscription status
              └─ No  → Return to app
```

## Usage Examples

### Example 1: Check Quota Before Adding Word

```typescript
import { useQuotaCheck } from '@/hooks/useQuotaCheck';
import UpgradePromptModal from '@/components/UpgradePromptModal';

function AddWordComponent() {
  const { checkAndProceed, showUpgradeModal, closeUpgradeModal, quotaType } = useQuotaCheck();

  const handleAddWord = async () => {
    await checkAndProceed('word', async () => {
      // Add word logic here
      await addWordToDatabase();
    });
  };

  return (
    <>
      <Button onPress={handleAddWord}>Add Word</Button>
      
      <UpgradePromptModal
        visible={showUpgradeModal}
        onClose={closeUpgradeModal}
        quotaType={quotaType}
      />
    </>
  );
}
```

### Example 2: Display Subscription Status

```typescript
import SubscriptionStatusCard from '@/components/SubscriptionStatusCard';

function ProfileScreen() {
  return (
    <ScrollView>
      {/* Profile content */}
      <SubscriptionStatusCard />
      {/* More content */}
    </ScrollView>
  );
}
```

### Example 3: Manual Paywall Trigger

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function SettingsScreen() {
  const { showPaywall, isSubscribed } = useSubscription();

  const handleUpgrade = async () => {
    await showPaywall();
  };

  return (
    <View>
      {!isSubscribed && (
        <Button onPress={handleUpgrade}>
          Upgrade to Plus
        </Button>
      )}
    </View>
  );
}
```

### Example 4: Restore Purchases

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function SettingsScreen() {
  const { restorePurchases } = useSubscription();

  const handleRestore = async () => {
    await restorePurchases();
  };

  return (
    <Button onPress={handleRestore}>
      Restore Purchases
    </Button>
  );
}
```

## Subscription Context API

### State

```typescript
interface SubscriptionContextType {
  // Subscription status
  tier: 'free' | 'plus';
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
```

### Methods

#### `checkQuota(type)`
Check if user can add more items of a specific type.

```typescript
const { checkQuota } = useSubscription();

if (checkQuota('word')) {
  // User can add more words
} else {
  // Show upgrade prompt
}
```

#### `showPaywall()`
Display RevenueCat purchase flow.

```typescript
const { showPaywall } = useSubscription();

await showPaywall();
```

#### `restorePurchases()`
Restore previous purchases.

```typescript
const { restorePurchases } = useSubscription();

await restorePurchases();
```

#### `refreshUsage()`
Manually refresh usage counts from database.

```typescript
const { refreshUsage } = useSubscription();

await refreshUsage();
```

## Testing

### Test Scenarios

#### 1. Free Tier Limits

**Words:**
1. Add 20 words → Should succeed
2. Try to add 21st word → Should show upgrade modal
3. Click "Upgrade" → Should show RevenueCat purchase flow

**Books:**
1. Add 10 books → Should succeed
2. Try to add 11th book → Should show upgrade modal

**Children:**
1. Add 1 child → Should succeed
2. Try to add 2nd child → Should show upgrade modal

#### 2. Plus Tier Features

1. Subscribe to Plus through purchase flow
2. Verify profile shows "Plus Member" badge
3. Add more than 20 words → Should succeed
4. Add more than 10 books → Should succeed
5. Add 2nd child → Should succeed
6. Try to add 3rd child → Should show limit message

#### 3. Restore Purchases

1. Subscribe on device A
2. Open app on device B (same account)
3. Click "Restore Purchases"
4. Verify Plus status is restored

### Sandbox Testing

RevenueCat automatically uses sandbox mode for development:
- Test purchases don't charge real money
- Subscriptions can be easily managed
- Full feature parity with production

## Troubleshooting

### Issue: "Unable to load subscription options"

**Possible Causes:**
1. API keys not configured correctly
2. Products not synced from app stores
3. Entitlements not configured

**Solution:**
1. Verify API keys in `SubscriptionContext.tsx`
2. Check RevenueCat dashboard for product sync status
3. Ensure entitlements are properly configured

### Issue: Subscription Status Not Updating

**Possible Causes:**
1. User not identified with RevenueCat
2. Network connectivity issues
3. Entitlement identifier mismatch

**Solution:**
1. Check console logs for "Identifying user with RevenueCat"
2. Verify network connection
3. Ensure entitlement identifier is `plus`

### Issue: Restore Purchases Not Working

**Possible Causes:**
1. No previous purchases to restore
2. Different Apple ID / Google account
3. Purchases not synced yet

**Solution:**
1. Verify purchase was made with same account
2. Wait a few minutes for sync
3. Check RevenueCat dashboard for customer info

## Best Practices

### 1. Always Check Quotas Client-Side

```typescript
// ✅ Good
if (!canAddWord) {
  showUpgradeModal();
  return;
}
await addWord();

// ❌ Bad
await addWord(); // No quota check
```

### 2. Provide Clear Upgrade Messaging

```typescript
// ✅ Good
<Text>You've reached the free limit of 20 words.</Text>
<Text>Upgrade to Plus for unlimited words!</Text>

// ❌ Bad
<Text>Limit reached</Text>
```

### 3. Refresh Usage After Changes

```typescript
// ✅ Good
await addWord();
await refreshUsage();

// ❌ Bad
await addWord(); // Usage count not updated
```

### 4. Handle Errors Gracefully

```typescript
// ✅ Good
try {
  await showPaywall();
} catch (error) {
  console.error('Purchase error:', error);
  Alert.alert('Error', 'Unable to complete purchase');
}

// ❌ Bad
await showPaywall(); // No error handling
```

## Migration from Superwall

If you're migrating from Superwall:

1. Remove `expo-superwall` from dependencies
2. Install `react-native-purchases`
3. Update `SubscriptionContext.tsx` to use RevenueCat
4. Update API keys
5. Test all subscription flows

## Support

For RevenueCat-specific issues:
- Documentation: https://docs.revenuecat.com
- Support: https://community.revenuecat.com
- Dashboard: https://app.revenuecat.com

For app-specific issues:
- Check console logs for detailed error messages
- Verify Supabase database queries
- Test with RevenueCat sandbox environment
