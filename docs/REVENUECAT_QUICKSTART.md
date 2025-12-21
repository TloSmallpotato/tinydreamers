
# RevenueCat Quick Start Guide

Get your freemium subscription model up and running in 5 steps!

## Step 1: Sign Up for RevenueCat (5 minutes)

1. Go to [https://www.revenuecat.com](https://www.revenuecat.com)
2. Click "Sign Up" and create an account
3. Create a new project for your app
4. Note your project name

## Step 2: Get Your API Keys (2 minutes)

1. In RevenueCat dashboard, go to **Settings** → **API Keys**
2. Copy your **iOS API Key** (starts with `appl_`)
3. Copy your **Android API Key** (starts with `goog_`)
4. Keep these keys safe - you'll need them in the next step

## Step 3: Configure Your App (3 minutes)

1. Open `contexts/SubscriptionContext.tsx` in your code editor
2. Find these lines:

```typescript
const REVENUECAT_API_KEY_IOS = 'YOUR_IOS_API_KEY_HERE';
const REVENUECAT_API_KEY_ANDROID = 'YOUR_ANDROID_API_KEY_HERE';
```

3. Replace with your actual API keys:

```typescript
const REVENUECAT_API_KEY_IOS = 'appl_YOUR_ACTUAL_IOS_KEY';
const REVENUECAT_API_KEY_ANDROID = 'goog_YOUR_ACTUAL_ANDROID_KEY';
```

4. Save the file

## Step 4: Create Your Subscription Product (15 minutes)

### In App Store Connect (iOS)

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

### In Google Play Console (Android)

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

## Step 5: Configure RevenueCat (10 minutes)

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

### Create Entitlements

1. Go to **Entitlements** in RevenueCat dashboard
2. Click **+ New**
3. Create entitlement:
   - **Identifier**: `plus` (must be exactly this)
   - **Name**: "Plus Subscription"
4. Save entitlement

### Attach Products

1. In the `plus` entitlement, click **Attach Products**
2. Select `plus_subscription` for both iOS and Android
3. Save changes

### Create Offerings

1. Go to **Offerings** in RevenueCat dashboard
2. Click **+ New**
3. Create offering:
   - **Identifier**: `default`
   - **Name**: "Default Offering"
4. Add package:
   - **Identifier**: `monthly`
   - **Product**: `plus_subscription`
5. Click **Make Current** to set as the current offering
6. Save

## Step 6: Test Your Integration (10 minutes)

### Test in Sandbox Mode

1. Build and run your app
2. Try to add 21 words (should show upgrade prompt)
3. Click "Upgrade to Plus"
4. Complete test purchase (won't charge real money)
5. Verify subscription status updates
6. Try adding more words (should work now)

### Test Checklist

- [ ] App launches without errors
- [ ] Profile shows subscription status
- [ ] Can add up to 20 words (free)
- [ ] Upgrade prompt appears at 21st word
- [ ] Purchase flow displays correctly
- [ ] Test purchase completes
- [ ] Subscription status updates
- [ ] Can add unlimited words after purchase
- [ ] "Restore Purchases" button works

## Troubleshooting

### "Unable to load subscription options"

**Problem**: API keys not configured or products not synced

**Solution**:
1. Check API keys in `SubscriptionContext.tsx`
2. Verify products are synced in RevenueCat dashboard
3. Wait a few minutes for sync to complete
4. Rebuild app after changing keys

### "No subscription packages available"

**Problem**: Offerings not configured correctly

**Solution**:
1. Check RevenueCat dashboard → Offerings
2. Verify offering is marked as "Current"
3. Ensure package is attached to offering
4. Verify products are attached to entitlements

### Purchase not working

**Problem**: Product not configured correctly

**Solution**:
1. Verify product ID matches in:
   - App Store Connect / Google Play Console
   - RevenueCat dashboard
2. Check product is active
3. Wait for product to sync (can take 24 hours)
4. Test with sandbox account

## Next Steps

### Customize Your Experience

1. **Update Paywall Design**
   - Customize the upgrade modal in `UpgradePromptModal.tsx`
   - Add your branding and messaging

2. **Add More Features**
   - Create additional entitlements
   - Add different subscription tiers
   - Implement promotional offers

3. **Implement Analytics**
   - Track conversion rates
   - Monitor churn
   - Analyze user behavior

### Launch Checklist

Before launching to production:

- [ ] Replace test API keys with production keys
- [ ] Test on real devices
- [ ] Test subscription restoration
- [ ] Test on both iOS and Android
- [ ] Verify pricing in all regions
- [ ] Test cancellation flow
- [ ] Add privacy policy link
- [ ] Add terms of service link
- [ ] Submit for App Store review
- [ ] Submit for Google Play review

## Resources

- **RevenueCat Docs**: https://docs.revenuecat.com
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

Your freemium subscription model is now set up! Users can:

- ✅ Start with free tier (20 words, 10 books, 1 child)
- ✅ See their usage and limits
- ✅ Upgrade to Plus for unlimited access
- ✅ Restore purchases on new devices

Happy monetizing! 💰
