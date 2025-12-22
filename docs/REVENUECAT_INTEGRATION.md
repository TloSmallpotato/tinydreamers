
# RevenueCat Integration Guide - The Tiny Dreamers App

This document provides a complete guide to the RevenueCat integration for the freemium subscription model in The Tiny Dreamers App.

## Overview

The app uses **RevenueCat SDK** to manage in-app subscriptions with a freemium model:

- **Free Tier**: 20 words, 10 books, 1 child
- **Pro Tier**: Unlimited words, unlimited books, 2 children

## Features Implemented

✅ **RevenueCat SDK Integration** - Core purchases functionality
✅ **RevenueCat Paywalls** - Native paywall UI
✅ **Customer Center** - Subscription management UI
✅ **Entitlement Checking** - "The Tiny Dreamers App Pro" entitlement
✅ **Product Configuration** - Monthly and Yearly subscriptions
✅ **Customer Info Management** - Real-time subscription status
✅ **Purchase Restoration** - Cross-device subscription sync

## Setup Instructions

### 1. Create RevenueCat Account

1. Sign up at [RevenueCat](https://www.revenuecat.com)
2. Create a new project named "The Tiny Dreamers App"
3. Note your project name

### 2. Configure API Key

The app is already configured with your test API key:

```typescript
const REVENUECAT_API_KEY = 'test_DYJuwnEXhPtgdogguRsibPkWMCk';
```

**For production**, replace this with your production API key in `contexts/SubscriptionContext.tsx`.

### 3. Create Entitlement

1. In RevenueCat dashboard, go to **Entitlements**
2. Click **+ New**
3. Create entitlement:
   - **Identifier**: `The Tiny Dreamers App Pro` (must match exactly)
   - **Name**: "The Tiny Dreamers App Pro"
4. Save entitlement

### 4. Create Subscription Products

#### In App Store Connect (iOS)

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Go to **Features** → **In-App Purchases**
4. Create two subscriptions:

**Monthly Subscription:**
- **Reference Name**: "Monthly Pro Subscription"
- **Product ID**: `monthly`
- **Subscription Group**: Create new group "The Tiny Dreamers App Pro"
- **Duration**: 1 month
- **Price**: Set your price (e.g., $4.99/month)

**Yearly Subscription:**
- **Reference Name**: "Yearly Pro Subscription"
- **Product ID**: `yearly`
- **Subscription Group**: "The Tiny Dreamers App Pro"
- **Duration**: 1 year
- **Price**: Set your price (e.g., $49.99/year)

5. Add localized descriptions
6. Submit for review

#### In Google Play Console (Android)

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to **Monetize** → **Subscriptions**
4. Create two subscriptions:

**Monthly Subscription:**
- **Product ID**: `monthly`
- **Name**: "Monthly Pro Subscription"
- **Description**: "Unlimited words, books, and 2 children"
- **Billing period**: 1 month
- **Price**: Set your price (e.g., $4.99/month)

**Yearly Subscription:**
- **Product ID**: `yearly`
- **Name**: "Yearly Pro Subscription"
- **Description**: "Unlimited words, books, and 2 children - Save 20%!"
- **Billing period**: 1 year
- **Price**: Set your price (e.g., $49.99/year)

5. Save and activate

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

#### Attach Products to Entitlements

1. In the `The Tiny Dreamers App Pro` entitlement, click **Attach Products**
2. Select both `monthly` and `yearly` for iOS
3. Select both `monthly` and `yearly` for Android
4. Save changes

#### Create Offerings

1. Go to **Offerings** in RevenueCat dashboard
2. Click **+ New**
3. Create offering:
   - **Identifier**: `default`
   - **Name**: "Default Offering"
4. Add packages:
   - **Package 1**: Identifier: `monthly`, Product: `monthly`
   - **Package 2**: Identifier: `yearly`, Product: `yearly`
5. Make this the current offering

### 6. Configure Paywalls (Optional but Recommended)

1. Go to **Paywalls** in RevenueCat dashboard
2. Click **+ New Paywall**
3. Design your paywall:
   - Add title: "Upgrade to Pro"
   - Add subtitle: "Unlock unlimited features"
   - Add feature list:
     - Unlimited words
     - Unlimited books
     - Track up to 2 children
   - Customize colors and branding
4. Attach to your offering
5. Save and publish

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
         RevenueCat Paywall (presentPaywall)
              ↓
         [Purchase Complete?]
              ├─ Yes → Update subscription status
              │        Show success message
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

### Example 3: Show RevenueCat Paywall

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
          Upgrade to Pro
        </Button>
      )}
    </View>
  );
}
```

### Example 4: Show Customer Center

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function SettingsScreen() {
  const { showCustomerCenter, isSubscribed } = useSubscription();

  const handleManageSubscription = async () => {
    await showCustomerCenter();
  };

  return (
    <View>
      {isSubscribed && (
        <Button onPress={handleManageSubscription}>
          Manage Subscription
        </Button>
      )}
    </View>
  );
}
```

### Example 5: Restore Purchases

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
  tier: 'free' | 'pro';
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
Display RevenueCat native paywall UI.

```typescript
const { showPaywall } = useSubscription();

await showPaywall();
// Paywall will be presented as a native modal
// Handles purchase flow automatically
```

#### `showCustomerCenter()`
Display RevenueCat Customer Center for subscription management.

```typescript
const { showCustomerCenter } = useSubscription();

await showCustomerCenter();
// Customer Center will be presented as a native modal
// Users can manage their subscription, view billing info, etc.
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

## Modern RevenueCat Features

### 1. Native Paywalls

The app uses RevenueCat's native paywall UI via `presentPaywall()`:

**Benefits:**
- No custom UI code needed
- Automatically handles purchase flow
- A/B testing support in RevenueCat dashboard
- Localization support
- Optimized conversion rates

**Implementation:**
```typescript
import { presentPaywall, PaywallResult } from 'react-native-purchases-ui';

const result = await presentPaywall();

if (result === PaywallResult.PURCHASED) {
  // User completed purchase
} else if (result === PaywallResult.RESTORED) {
  // User restored purchases
} else if (result === PaywallResult.CANCELLED) {
  // User cancelled
}
```

### 2. Customer Center

The app uses RevenueCat's Customer Center via `presentCustomerCenter()`:

**Benefits:**
- Self-service subscription management
- View billing information
- Cancel/modify subscriptions
- Contact support
- Reduces support tickets

**Implementation:**
```typescript
import { presentCustomerCenter, CustomerCenterResult } from 'react-native-purchases-ui';

const result = await presentCustomerCenter();

if (result === CustomerCenterResult.RESTORED) {
  // User restored purchases
}
```

### 3. Real-time Customer Info Updates

The app listens for customer info updates:

```typescript
Purchases.addCustomerInfoUpdateListener((info) => {
  // Automatically update subscription status
  updateSubscriptionStatus(info);
});
```

**Benefits:**
- Instant subscription status updates
- No manual polling needed
- Handles cross-device syncing automatically

## Testing

### Test Scenarios

#### 1. Free Tier Limits

**Words:**
1. Add 20 words → Should succeed
2. Try to add 21st word → Should show upgrade modal
3. Click "Upgrade to Pro" → Should show RevenueCat paywall

**Books:**
1. Add 10 books → Should succeed
2. Try to add 11th book → Should show upgrade modal

**Children:**
1. Add 1 child → Should succeed
2. Try to add 2nd child → Should show upgrade modal

#### 2. Pro Tier Features

1. Subscribe to Pro through paywall
2. Verify profile shows "Pro Member" badge
3. Add more than 20 words → Should succeed
4. Add more than 10 books → Should succeed
5. Add 2nd child → Should succeed
6. Try to add 3rd child → Should show limit message

#### 3. Customer Center

1. Subscribe to Pro
2. Click "Manage Subscription" button
3. Verify Customer Center opens
4. Test subscription management features

#### 4. Restore Purchases

1. Subscribe on device A
2. Open app on device B (same account)
3. Click "Restore Purchases" or use Customer Center
4. Verify Pro status is restored

### Sandbox Testing

RevenueCat automatically uses sandbox mode for development:
- Test purchases don't charge real money
- Subscriptions can be easily managed
- Full feature parity with production

## Troubleshooting

### Issue: "Unable to show subscription options"

**Possible Causes:**
1. API key not configured correctly
2. Products not synced from app stores
3. Entitlements not configured
4. Offering not set as current

**Solution:**
1. Verify API key in `SubscriptionContext.tsx`
2. Check RevenueCat dashboard for product sync status
3. Ensure entitlement identifier is exactly `The Tiny Dreamers App Pro`
4. Verify offering is marked as "Current" in dashboard

### Issue: Subscription Status Not Updating

**Possible Causes:**
1. User not identified with RevenueCat
2. Network connectivity issues
3. Entitlement identifier mismatch

**Solution:**
1. Check console logs for "Identifying user with RevenueCat"
2. Verify network connection
3. Ensure entitlement identifier matches exactly: `The Tiny Dreamers App Pro`

### Issue: Paywall Not Displaying

**Possible Causes:**
1. No offerings configured
2. Offering not set as current
3. Products not attached to offering

**Solution:**
1. Check RevenueCat dashboard → Offerings
2. Verify offering is marked as "Current"
3. Ensure packages are attached to offering
4. Verify products are attached to entitlements

### Issue: Customer Center Not Working

**Possible Causes:**
1. User not subscribed
2. Customer Center not configured in dashboard

**Solution:**
1. Verify user has active subscription
2. Check RevenueCat dashboard → Customer Center settings
3. Ensure Customer Center is enabled for your project

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

### 2. Use Native Paywalls

```typescript
// ✅ Good - Uses RevenueCat's optimized paywall
await showPaywall();

// ❌ Bad - Custom paywall requires more maintenance
<CustomPaywallModal />
```

### 3. Provide Self-Service Options

```typescript
// ✅ Good - Let users manage their own subscriptions
<Button onPress={showCustomerCenter}>
  Manage Subscription
</Button>

// ❌ Bad - Requires support team intervention
<Text>Email support@example.com to cancel</Text>
```

### 4. Handle Errors Gracefully

```typescript
// ✅ Good
try {
  await showPaywall();
} catch (error) {
  console.error('Paywall error:', error);
  Alert.alert('Error', 'Unable to show subscription options');
}

// ❌ Bad
await showPaywall(); // No error handling
```

### 5. Refresh Usage After Changes

```typescript
// ✅ Good
await addWord();
await refreshUsage();

// ❌ Bad
await addWord(); // Usage count not updated
```

## Product Configuration

### Monthly Subscription
- **Product ID**: `monthly`
- **Duration**: 1 month
- **Recommended Price**: $4.99/month
- **Features**: Unlimited words, unlimited books, 2 children

### Yearly Subscription
- **Product ID**: `yearly`
- **Duration**: 1 year
- **Recommended Price**: $49.99/year (save ~17%)
- **Features**: Unlimited words, unlimited books, 2 children

## Entitlement Configuration

### The Tiny Dreamers App Pro
- **Identifier**: `The Tiny Dreamers App Pro`
- **Products**: `monthly`, `yearly`
- **Features**:
  - Unlimited words
  - Unlimited books
  - Track up to 2 children

## Support

For RevenueCat-specific issues:
- Documentation: https://docs.revenuecat.com
- Paywalls Guide: https://www.revenuecat.com/docs/tools/paywalls
- Customer Center Guide: https://www.revenuecat.com/docs/tools/customer-center
- Support: https://community.revenuecat.com
- Dashboard: https://app.revenuecat.com

For app-specific issues:
- Check console logs for detailed error messages
- Verify Supabase database queries
- Test with RevenueCat sandbox environment

## Migration Notes

This integration replaces the previous Superwall implementation with RevenueCat:

**Changes:**
- ✅ Removed Superwall dependency
- ✅ Installed `react-native-purchases` and `react-native-purchases-ui`
- ✅ Updated `SubscriptionContext` to use RevenueCat
- ✅ Configured with test API key
- ✅ Changed tier from "plus" to "pro"
- ✅ Updated entitlement to "The Tiny Dreamers App Pro"
- ✅ Added native paywall support
- ✅ Added Customer Center support

**Testing Required:**
- Test all subscription flows
- Verify quota enforcement
- Test paywall display
- Test Customer Center
- Test purchase restoration
