
# RevenueCat and Expo Go Limitation

## ⚠️ Critical Information

**RevenueCat Paywalls DO NOT work in Expo Go!**

This is a fundamental limitation because RevenueCat requires native modules that need to be compiled into the app binary. Expo Go is a pre-built app that cannot include custom native modules.

## Why Doesn't It Work in Expo Go?

1. **Native Modules Required**: RevenueCat uses native iOS and Android SDKs that need to be compiled into your app
2. **StoreKit/Google Play Integration**: The payment systems require native code that Expo Go doesn't include
3. **RevenueCat UI**: The paywall UI components are native views that can't be loaded dynamically

## How to Test RevenueCat Paywalls

You have **three options** to test RevenueCat functionality:

### Option 1: Development Build (Recommended for Testing)

Create a development build that includes the RevenueCat native modules:

```bash
# Install EAS CLI if you haven't already
npm install -g eas-cli

# Login to your Expo account
eas login

# Create a development build for iOS
eas build --profile development --platform ios

# Or for Android
eas build --profile development --platform android
```

Once the build is complete:
- **iOS**: Install the build on your device via the provided link
- **Android**: Download and install the APK

The development build works like Expo Go but includes your custom native modules.

### Option 2: TestFlight (iOS) or Internal Testing (Android)

Build a preview/production version and distribute via TestFlight or Google Play Internal Testing:

```bash
# For iOS TestFlight
eas build --profile preview --platform ios

# For Android Internal Testing
eas build --profile preview --platform android
```

### Option 3: Production Build

Build and submit to the App Store or Google Play Store:

```bash
# For iOS App Store
eas build --profile production --platform ios
eas submit --platform ios

# For Android Google Play
eas build --profile production --platform android
eas submit --platform android
```

## Current Implementation

The app now includes proper detection and user-friendly error messages:

### 1. Expo Go Detection

The app detects if it's running in Expo Go using:

```typescript
import Constants from 'expo-constants';
const isExpoGo = Constants.appOwnership === 'expo';
```

### 2. User-Friendly Alerts

When a user tries to access paywall features in Expo Go, they see:

```
Expo Go Not Supported

RevenueCat Paywalls do not work in Expo Go.

To test subscriptions, you need to:

1. Create a development build:
   eas build --profile development

2. Or test in production:
   TestFlight or App Store
```

### 3. Graceful Degradation

- The app still works in Expo Go for all non-subscription features
- Subscription status defaults to "free" tier
- All quota checks still function
- Users can see what features are locked behind Pro

## Testing Checklist

Before releasing to production, test the following:

### In Development Build or Production:

- [ ] Paywall displays correctly when clicking "Upgrade to Pro"
- [ ] Can complete a test purchase (use sandbox accounts)
- [ ] Subscription status updates after purchase
- [ ] Quota limits are enforced correctly
- [ ] Customer Center opens and displays subscription info
- [ ] Restore Purchases works correctly
- [ ] Entitlements are properly checked

### In Expo Go (Expected Behavior):

- [ ] App loads without crashing
- [ ] Clicking "Upgrade to Pro" shows helpful error message
- [ ] Free tier features work normally
- [ ] Quota limits are displayed correctly
- [ ] No native module errors in console

## RevenueCat Dashboard Configuration

Make sure your RevenueCat dashboard is properly configured:

1. **Products**: Create products in App Store Connect and Google Play Console
2. **Entitlements**: Create "The Tiny Dreamers App Pro" entitlement
3. **Offerings**: Create an offering with your products
4. **Paywalls**: Design your paywall in the RevenueCat dashboard
5. **API Keys**: Use the correct API keys (test vs production)

## Current API Key

The app is currently using the **test API key**:
```
test_JPYZciDEShGXlnVDqcTWfLclPCZ
```

This is correct for testing. When you're ready for production, you'll need to:
1. Get your production API keys from RevenueCat
2. Update the `REVENUECAT_API_KEY` constant in `contexts/SubscriptionContext.tsx`

## Debugging Tips

### Enable Debug Logging

The app already has debug logging enabled:

```typescript
Purchases.setLogLevel(LOG_LEVEL.DEBUG);
```

This will show detailed logs in the console about:
- SDK initialization
- User identification
- Offerings fetching
- Purchase attempts
- Entitlement checks

### Check Console Logs

Look for these log messages:

```
✓ RevenueCat initialized successfully
✓ User identified successfully
✓ Current offering: [offering_id]
✓ Paywall result: PURCHASED
```

### Common Issues

1. **"No offering available"**: Configure offerings in RevenueCat dashboard
2. **"Paywall not presented"**: Check that products are properly configured
3. **"Purchase failed"**: Verify sandbox account setup (iOS) or test account (Android)

## Next Steps

1. **Create a development build** to test the paywall functionality
2. **Set up sandbox accounts** for iOS and test accounts for Android
3. **Configure products** in App Store Connect and Google Play Console
4. **Test the complete purchase flow** in the development build
5. **Verify entitlements** are properly granted after purchase

## Resources

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [iOS Sandbox Testing](https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_sandbox)
- [Android Test Purchases](https://developer.android.com/google/play/billing/test)
