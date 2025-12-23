
# RevenueCat Quick Start Guide

## 🚨 Important: Expo Go Limitation

**RevenueCat does NOT work in Expo Go!** You must create a development build or production build to test subscriptions.

## Quick Commands

### Create Development Build (Recommended for Testing)

```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

### Create Production Build

```bash
# iOS
eas build --profile production --platform ios

# Android
eas build --profile production --platform android
```

## What Works in Expo Go

✅ App loads and runs normally
✅ Free tier features work
✅ Quota limits are displayed
✅ Subscription status card shows
✅ Helpful error messages when trying to upgrade

## What Doesn't Work in Expo Go

❌ Showing the paywall
❌ Making purchases
❌ Restoring purchases
❌ Customer center
❌ Any RevenueCat native functionality

## Current Implementation Status

### ✅ Completed

- RevenueCat SDK integrated (`react-native-purchases`)
- RevenueCat UI integrated (`react-native-purchases-ui`)
- Subscription context with full functionality
- Expo Go detection and user-friendly error messages
- Proper offering fetching and passing
- Support for both `showPaywall()` and `showPaywallIfNeeded()`
- Customer center integration
- Restore purchases functionality
- Comprehensive error handling and logging

### 📋 Configuration Needed

1. **RevenueCat Dashboard**
   - Create products in App Store Connect and Google Play Console
   - Configure entitlement: "The Tiny Dreamers App Pro"
   - Create an offering with your products
   - Design your paywall

2. **Test Accounts**
   - iOS: Create sandbox test accounts in App Store Connect
   - Android: Add test accounts in Google Play Console

3. **API Keys**
   - Currently using test key: `test_JPYZciDEShGXlnVDqcTWfLclPCZ`
   - Update to production keys when ready

## Testing Workflow

### Step 1: Create Development Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for your platform
eas build --profile development --platform ios
```

### Step 2: Install on Device

- **iOS**: Open the build link on your device and install
- **Android**: Download and install the APK

### Step 3: Test Subscription Flow

1. Open the app on your device
2. Go to Profile tab
3. Click "Upgrade to Pro"
4. Paywall should appear
5. Complete test purchase with sandbox account
6. Verify subscription status updates

### Step 4: Test Restore Purchases

1. Delete and reinstall the app
2. Go to Settings
3. Click "Restore Purchases"
4. Verify subscription is restored

## Code Structure

### Main Files

- `contexts/SubscriptionContext.tsx` - Core subscription logic
- `components/SubscriptionStatusCard.tsx` - UI component showing subscription status
- `hooks/useQuotaCheck.ts` - Quota checking hook
- `components/UpgradePromptModal.tsx` - Modal shown when quota exceeded

### Key Functions

```typescript
// Show paywall (always shows)
await showPaywall();
await showPaywall('specific_offering_id');

// Show paywall if needed (only if user doesn't have entitlement)
await showPaywallIfNeeded();
await showPaywallIfNeeded('specific_offering_id');

// Show customer center
await showCustomerCenter();

// Restore purchases
await restorePurchases();

// Check quota
const canAdd = checkQuota('word'); // or 'book' or 'child'
```

### Subscription Status

```typescript
const {
  tier,              // 'free' | 'pro'
  isSubscribed,      // boolean
  currentUsage,      // { words, books, children }
  canAddWord,        // boolean
  canAddBook,        // boolean
  canAddChild,       // boolean
  remainingWords,    // number
  remainingBooks,    // number
  remainingChildren, // number
} = useSubscription();
```

## Debugging

### Enable Logs

Logs are already enabled in the code:

```typescript
Purchases.setLogLevel(LOG_LEVEL.DEBUG);
```

### Check Console

Look for these messages:

```
✓ RevenueCat initialized successfully
✓ User identified successfully
✓ Current offering: [offering_id]
✓ Paywall result: PURCHASED
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Expo Go Not Supported" alert | Create a development build |
| "No offering available" | Configure offerings in RevenueCat dashboard |
| "Paywall not presented" | Check product configuration |
| Purchase fails | Verify sandbox account setup |

## Next Steps

1. ✅ Code is ready and properly configured
2. 🔨 Create a development build
3. 📱 Install on your device
4. 🧪 Test the subscription flow
5. ✅ Verify everything works
6. 🚀 Build for production

## Resources

- [RevenueCat Docs](https://docs.revenuecat.com/)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Full Documentation](./REVENUECAT_EXPO_GO_LIMITATION.md)

## Support

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify RevenueCat dashboard configuration
3. Ensure you're using a development build (not Expo Go)
4. Check that test accounts are properly configured
5. Review the full documentation in `REVENUECAT_EXPO_GO_LIMITATION.md`
