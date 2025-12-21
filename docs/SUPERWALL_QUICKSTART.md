
# Superwall Quick Start Guide

Get your freemium subscription model up and running in 5 steps!

## Step 1: Sign Up for Superwall (5 minutes)

1. Go to [https://superwall.com](https://superwall.com)
2. Click "Sign Up" and create an account
3. Create a new project for your app
4. Note your project name

## Step 2: Get Your API Keys (2 minutes)

1. In Superwall dashboard, go to **Settings** → **API Keys**
2. Copy your **iOS API Key** (starts with `pk_`)
3. Copy your **Android API Key** (starts with `pk_`)
4. Keep these keys safe - you'll need them in the next step

## Step 3: Configure Your App (3 minutes)

1. Open `app/_layout.tsx` in your code editor
2. Find these lines:

```typescript
const SUPERWALL_API_KEY_IOS = 'pk_d1efcfe344e34a8dcc4a5664a5dde7b4c4c4c4c4';
const SUPERWALL_API_KEY_ANDROID = 'pk_d1efcfe344e34a8dcc4a5664a5dde7b4c4c4c4c4';
```

3. Replace with your actual API keys:

```typescript
const SUPERWALL_API_KEY_IOS = 'pk_YOUR_IOS_KEY_HERE';
const SUPERWALL_API_KEY_ANDROID = 'pk_YOUR_ANDROID_KEY_HERE';
```

4. Save the file

## Step 4: Create Your Subscription Product (10 minutes)

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

### In Superwall Dashboard

1. Go to **Products** in Superwall dashboard
2. Click **Add Product**
3. Select your app store product:
   - iOS: `plus_subscription`
   - Android: `plus_subscription`
4. Set display name: "Plus Plan"
5. Add features:
   - "Unlimited words"
   - "Unlimited books"
   - "2 children"
6. Save product

## Step 5: Create Your Paywall (15 minutes)

### Design Your Paywall

1. In Superwall dashboard, go to **Paywalls**
2. Click **Create Paywall**
3. Choose a template or start from scratch
4. Customize the design:
   - Add your app logo
   - Set brand colors
   - Add compelling copy
   - Highlight benefits

### Example Paywall Copy

**Headline**: "Unlock Unlimited Learning"

**Subheadline**: "Track unlimited words and books for your child's development"

**Features**:
- ✓ Unlimited words
- ✓ Unlimited books
- ✓ Support for 2 children
- ✓ All future features

**Call to Action**: "Start Plus Plan"

### Create Placements

1. Go to **Placements** in Superwall dashboard
2. Create these placements:

| Placement ID | Trigger | Paywall |
|-------------|---------|---------|
| `upgrade_prompt` | Manual | Your paywall |
| `profile_upgrade` | Manual | Your paywall |
| `word_limit` | Manual | Your paywall |
| `book_limit` | Manual | Your paywall |
| `child_limit` | Manual | Your paywall |

3. For each placement:
   - Click **Create Placement**
   - Enter the Placement ID
   - Select your paywall
   - Set trigger to "Manual"
   - Save

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
- [ ] Paywall displays correctly
- [ ] Test purchase completes
- [ ] Subscription status updates
- [ ] Can add unlimited words after purchase

## Troubleshooting

### "Superwall configuration error"

**Problem**: API keys not configured correctly

**Solution**:
1. Check API keys in `app/_layout.tsx`
2. Verify keys are correct in Superwall dashboard
3. Rebuild app after changing keys

### "Paywall not showing"

**Problem**: Placement not configured

**Solution**:
1. Check Superwall dashboard → Placements
2. Verify placement ID matches code
3. Ensure paywall is assigned to placement
4. Check paywall is published

### "Purchase not working"

**Problem**: Product not configured correctly

**Solution**:
1. Verify product ID matches in:
   - App Store Connect / Google Play Console
   - Superwall dashboard
2. Check product is active
3. Wait for product to sync (can take 24 hours)

## Next Steps

### Customize Your Experience

1. **Update Paywall Design**
   - Match your app's branding
   - Add screenshots
   - Improve copy

2. **Add More Placements**
   - Onboarding paywall
   - Feature-specific paywalls
   - Time-based triggers

3. **Implement Analytics**
   - Track conversion rates
   - Monitor churn
   - A/B test paywalls

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

- **Superwall Docs**: https://docs.superwall.com
- **App Store Connect**: https://appstoreconnect.apple.com
- **Google Play Console**: https://play.google.com/console
- **Full Integration Guide**: `docs/SUPERWALL_INTEGRATION.md`

## Support

Need help? Check these resources:

1. **Documentation**: `docs/SUPERWALL_INTEGRATION.md`
2. **Superwall Support**: support@superwall.com
3. **Superwall Slack**: Join the community
4. **Console Logs**: Check for error messages

## Congratulations! 🎉

Your freemium subscription model is now set up! Users can:

- ✅ Start with free tier (20 words, 10 books, 1 child)
- ✅ See their usage and limits
- ✅ Upgrade to Plus for unlimited access
- ✅ Manage their subscription

Happy monetizing! 💰
