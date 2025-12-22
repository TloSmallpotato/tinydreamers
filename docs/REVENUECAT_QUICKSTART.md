
# RevenueCat Quick Start Guide - The Tiny Dreamers App

Get your freemium subscription model up and running in 5 steps!

## Prerequisites

✅ **Dependencies Installed:**
- `react-native-purchases` (v9.6.11) - Core SDK
- `react-native-purchases-ui` (v9.6.11) - Paywalls & Customer Center

✅ **API Key Configured:**
- Test key: `test_DYJuwnEXhPtgdogguRsibPkWMCk`

## Step 1: Create RevenueCat Account (5 minutes)

1. Go to [https://www.revenuecat.com](https://www.revenuecat.com)
2. Click "Sign Up" and create an account
3. Create a new project: "The Tiny Dreamers App"
4. Note your project name

## Step 2: Configure Entitlement (3 minutes)

1. In RevenueCat dashboard, go to **Entitlements**
2. Click **+ New**
3. Create entitlement:
   - **Identifier**: `The Tiny Dreamers App Pro` (must match exactly)
   - **Name**: "The Tiny Dreamers App Pro"
4. Save entitlement

⚠️ **Important**: The entitlement identifier must be exactly `The Tiny Dreamers App Pro` to match the app code.

## Step 3: Create Subscription Products (15 minutes)

### In App Store Connect (iOS)

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Go to **Features** → **In-App Purchases**
4. Create two subscriptions:

**Monthly Subscription:**
- Click **+** to create new subscription
- **Reference Name**: "Monthly Pro Subscription"
- **Product ID**: `monthly`
- **Subscription Group**: Create new group "The Tiny Dreamers App Pro"
- **Duration**: 1 month
- **Price**: $4.99/month (or your preferred price)
- Add localized descriptions
- Submit for review

**Yearly Subscription:**
- Click **+** to create new subscription
- **Reference Name**: "Yearly Pro Subscription"
- **Product ID**: `yearly`
- **Subscription Group**: "The Tiny Dreamers App Pro"
- **Duration**: 1 year
- **Price**: $49.99/year (or your preferred price)
- Add localized descriptions
- Submit for review

### In Google Play Console (Android)

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Go to **Monetize** → **Subscriptions**
4. Create two subscriptions:

**Monthly Subscription:**
- Click **Create subscription**
- **Product ID**: `monthly`
- **Name**: "Monthly Pro Subscription"
- **Description**: "Unlimited words, books, and 2 children"
- **Billing period**: 1 month
- **Price**: $4.99/month (or your preferred price)
- Save and activate

**Yearly Subscription:**
- Click **Create subscription**
- **Product ID**: `yearly`
- **Name**: "Yearly Pro Subscription"
- **Description**: "Unlimited words, books, and 2 children - Save 20%!"
- **Billing period**: 1 year
- **Price**: $49.99/year (or your preferred price)
- Save and activate

## Step 4: Configure RevenueCat (10 minutes)

### Connect App Store Connect

1. In RevenueCat dashboard, go to **Project Settings** → **App Store Connect**
2. Follow the instructions to upload your App Store Connect API Key
3. Select your app
4. Wait for products to sync (may take a few minutes)

### Connect Google Play

1. In RevenueCat dashboard, go to **Project Settings** → **Google Play**
2. Follow the instructions to upload your Google Play service account JSON
3. Select your app
4. Wait for products to sync (may take a few minutes)

### Attach Products to Entitlements

1. Go to **Entitlements** in RevenueCat dashboard
2. Click on `The Tiny Dreamers App Pro` entitlement
3. Click **Attach Products**
4. Select both `monthly` and `yearly` for iOS
5. Select both `monthly` and `yearly` for Android
6. Save changes

### Create Offerings

1. Go to **Offerings** in RevenueCat dashboard
2. Click **+ New**
3. Create offering:
   - **Identifier**: `default`
   - **Name**: "Default Offering"
4. Add packages:
   - Click **Add Package**
   - **Package 1**: 
     - Identifier: `monthly`
     - Product: `monthly` (iOS and Android)
   - **Package 2**: 
     - Identifier: `yearly`
     - Product: `yearly` (iOS and Android)
5. Click **Make Current** to set as the current offering
6. Save

## Step 5: Configure Paywalls (Optional - 10 minutes)

1. Go to **Paywalls** in RevenueCat dashboard
2. Click **+ New Paywall**
3. Design your paywall:
   - **Title**: "Upgrade to Pro"
   - **Subtitle**: "Unlock unlimited features for your family"
   - **Features**:
     - ✓ Unlimited words
     - ✓ Unlimited books
     - ✓ Track up to 2 children
   - Customize colors to match your app
   - Add your app icon/branding
4. Attach to your `default` offering
5. Save and publish

## Step 6: Test Your Integration (10 minutes)

### Test in Sandbox Mode

1. Build and run your app
2. Navigate to Profile screen
3. Verify subscription status card shows "Free Plan"
4. Try to add 21 words (should show upgrade prompt)
5. Click "Upgrade to Pro"
6. Verify RevenueCat paywall displays
7. Complete test purchase (won't charge real money)
8. Verify subscription status updates to "Pro Member"
9. Try adding more words (should work now)
10. Click "Manage Subscription" to test Customer Center

### Test Checklist

- [ ] App launches without errors
- [ ] Profile shows subscription status card
- [ ] Can add up to 20 words (free tier)
- [ ] Upgrade prompt appears at 21st word
- [ ] RevenueCat paywall displays correctly
- [ ] Test purchase completes successfully
- [ ] Subscription status updates to "Pro Member"
- [ ] Can add unlimited words after purchase
- [ ] "Manage Subscription" button appears for Pro users
- [ ] Customer Center opens and displays correctly
- [ ] Restore purchases works on new device

## Features Overview

### For Free Users

**Subscription Status Card:**
- Shows current usage (words, books, children)
- Displays progress bars for each quota
- "Upgrade to Pro" button

**Quota Enforcement:**
- 20 words maximum
- 10 books maximum
- 1 child maximum
- Upgrade prompt when limit reached

### For Pro Users

**Subscription Status Card:**
- "Pro Member" badge with crown icon
- Shows unlimited features
- "Manage Subscription" button

**Unlimited Access:**
- Unlimited words
- Unlimited books
- Up to 2 children

**Self-Service:**
- Customer Center for subscription management
- View billing information
- Cancel/modify subscription
- Contact support

## Troubleshooting

### "Unable to show subscription options"

**Problem**: API key not configured or products not synced

**Solution**:
1. Verify API key in `contexts/SubscriptionContext.tsx`
2. Check products are synced in RevenueCat dashboard
3. Wait a few minutes for sync to complete
4. Rebuild app

### "No subscription packages available"

**Problem**: Offerings not configured correctly

**Solution**:
1. Check RevenueCat dashboard → Offerings
2. Verify offering is marked as "Current"
3. Ensure packages are attached to offering
4. Verify products are attached to entitlements

### Paywall not displaying

**Problem**: Offering not configured or not current

**Solution**:
1. Verify offering exists in RevenueCat dashboard
2. Check offering is marked as "Current"
3. Ensure packages are properly configured
4. Check console logs for errors

### Purchase not working

**Problem**: Product not configured correctly

**Solution**:
1. Verify product IDs match:
   - App Store Connect / Google Play Console
   - RevenueCat dashboard
2. Check products are active
3. Wait for product to sync (can take 24 hours)
4. Test with sandbox account

### Customer Center not opening

**Problem**: User not subscribed or Customer Center not enabled

**Solution**:
1. Verify user has active subscription
2. Check RevenueCat dashboard → Customer Center settings
3. Ensure Customer Center is enabled for your project

## Production Deployment

Before launching to production:

### 1. Update API Key

Replace the test API key with your production key in `contexts/SubscriptionContext.tsx`:

```typescript
const REVENUECAT_API_KEY = 'YOUR_PRODUCTION_API_KEY_HERE';
```

### 2. Test on Real Devices

- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Test subscription purchase
- [ ] Test subscription restoration
- [ ] Test Customer Center
- [ ] Test on different iOS/Android versions

### 3. Verify Pricing

- [ ] Check pricing in all regions
- [ ] Verify currency conversions
- [ ] Test promotional offers (if any)

### 4. Legal Requirements

- [ ] Add privacy policy link
- [ ] Add terms of service link
- [ ] Add subscription terms
- [ ] Add auto-renewal disclosure

### 5. Submit for Review

- [ ] Submit iOS app for App Store review
- [ ] Submit Android app for Google Play review
- [ ] Include test account credentials
- [ ] Provide subscription testing instructions

## Next Steps

### Customize Your Experience

1. **Update Paywall Design**
   - Customize colors in RevenueCat dashboard
   - Add your branding
   - A/B test different designs

2. **Add Promotional Offers**
   - Create introductory offers
   - Add promotional codes
   - Implement win-back campaigns

3. **Implement Analytics**
   - Track conversion rates
   - Monitor churn
   - Analyze user behavior
   - Set up webhooks for events

### Advanced Features

1. **Experiments**
   - A/B test different paywalls
   - Test pricing strategies
   - Optimize conversion rates

2. **Customer Lists**
   - Segment users by behavior
   - Target specific user groups
   - Send targeted campaigns

3. **Webhooks**
   - Integrate with your backend
   - Send notifications
   - Update user records

## Resources

- **RevenueCat Docs**: https://docs.revenuecat.com
- **Paywalls Guide**: https://www.revenuecat.com/docs/tools/paywalls
- **Customer Center Guide**: https://www.revenuecat.com/docs/tools/customer-center
- **React Native SDK**: https://docs.revenuecat.com/docs/reactnative
- **App Store Connect**: https://appstoreconnect.apple.com
- **Google Play Console**: https://play.google.com/console
- **Full Integration Guide**: `docs/REVENUECAT_INTEGRATION.md`

## Support

Need help? Check these resources:

1. **Documentation**: `docs/REVENUECAT_INTEGRATION.md`
2. **RevenueCat Community**: https://community.revenuecat.com
3. **RevenueCat Support**: support@revenuecat.com
4. **Console Logs**: Check for error messages in your app

## Congratulations! 🎉

Your RevenueCat integration is complete! Users can now:

- ✅ Start with free tier (20 words, 10 books, 1 child)
- ✅ See their usage and limits with progress bars
- ✅ Upgrade to Pro via native paywall
- ✅ Choose between monthly and yearly subscriptions
- ✅ Manage subscriptions via Customer Center
- ✅ Restore purchases on new devices
- ✅ Get unlimited access to all features

Happy monetizing! 💰
