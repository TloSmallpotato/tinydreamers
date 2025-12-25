
# RevenueCat Troubleshooting Guide

## Error: "No subscription offerings are available"

This error occurs when the app cannot fetch subscription offerings from RevenueCat. Here's how to diagnose and fix it:

### 🔍 Diagnostic Steps

1. **Check the Console Logs**
   - Look for detailed diagnostic information in the console
   - The app now logs comprehensive information about:
     - Platform (iOS/Android/Web)
     - API Key status
     - Offerings availability
     - Entitlement configuration

2. **Verify RevenueCat Dashboard Configuration**

   #### Step 1: Check Products
   - Go to RevenueCat Dashboard → Products
   - Ensure you have created products for both iOS and Android
   - Products should be linked to App Store Connect / Google Play Console

   #### Step 2: Check Offerings
   - Go to RevenueCat Dashboard → Products → Offerings
   - **You must have at least one offering**
   - **One offering must be set as "current"**
   - Each offering should have at least one package

   #### Step 3: Check Entitlements
   - Go to RevenueCat Dashboard → Entitlements
   - Ensure you have an entitlement named: **"The Tiny Dreamers App Pro"**
   - This entitlement should be linked to your products

3. **Verify API Keys**
   - Current API Key: `appl_CAIIKFRhCsQOKYjSgyJfgnhuBsK`
   - This key should work for both iOS and Android
   - Verify in RevenueCat Dashboard → API Keys

### 🛠️ Common Fixes

#### Fix 1: Create an Offering
```
1. Go to RevenueCat Dashboard
2. Navigate to Products → Offerings
3. Click "New Offering"
4. Add a name (e.g., "Default Offering")
5. Set it as "Current Offering"
6. Add packages (e.g., Monthly, Annual)
7. Save
```

#### Fix 2: Set Current Offering
```
1. Go to RevenueCat Dashboard → Products → Offerings
2. Find your offering
3. Click the three dots menu
4. Select "Set as Current"
```

#### Fix 3: Verify Entitlement Name
```
The entitlement identifier in the code is:
"The Tiny Dreamers App Pro"

Make sure this EXACTLY matches the entitlement name in RevenueCat Dashboard.
```

#### Fix 4: Check Product Configuration
```
1. Go to RevenueCat Dashboard → Products
2. Ensure products are created for both platforms
3. Verify products are linked to App Store Connect / Google Play Console
4. Check that products are active (not archived)
```

### 📱 Platform-Specific Issues

#### iOS
- Ensure you have configured products in App Store Connect
- Products must be in "Ready to Submit" or "Approved" status
- Sandbox testing requires a sandbox test account

#### Android
- Ensure you have configured products in Google Play Console
- Products must be published (at least to internal testing track)
- Testing requires a test account added to the internal testing track

### 🧪 Testing

#### Development Build
```bash
# Create a development build
eas build --profile development --platform ios
eas build --profile development --platform android
```

#### TestFlight / Internal Testing
```bash
# Create a production build
eas build --profile production --platform ios
eas build --profile production --platform android
```

### 📊 Diagnostic Information

The app now provides detailed diagnostic information when showing the paywall. This includes:
- Platform information
- API Key status
- Number of offerings found
- Current offering identifier
- Error messages (if any)

To view this information:
1. Try to upgrade to Pro
2. If an error occurs, the diagnostic info will be shown in the alert
3. Check the console logs for even more detailed information

### 🔗 Useful Links

- [RevenueCat Dashboard](https://app.revenuecat.com/)
- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [RevenueCat Offerings Guide](https://docs.revenuecat.com/docs/entitlements)
- [RevenueCat Testing Guide](https://docs.revenuecat.com/docs/testing)

### 💡 Quick Checklist

Before testing subscriptions, ensure:
- [ ] Products are created in RevenueCat Dashboard
- [ ] Products are linked to App Store Connect / Google Play Console
- [ ] At least one offering exists
- [ ] One offering is set as "current"
- [ ] Offering has at least one package
- [ ] Entitlement "The Tiny Dreamers App Pro" exists
- [ ] Entitlement is linked to products
- [ ] API Key is correct
- [ ] Testing on a development build or TestFlight (not Expo Go)

### 🆘 Still Having Issues?

If you're still experiencing issues after following this guide:

1. **Check the detailed console logs** - They now provide comprehensive diagnostic information
2. **Verify all steps in the Quick Checklist** - Missing even one step can cause issues
3. **Test with a fresh install** - Sometimes cached data can cause problems
4. **Contact RevenueCat Support** - They can help verify your dashboard configuration

### 📝 Notes

- **Expo Go is NOT supported** - You must use a development build or production build
- **Web is NOT supported** - RevenueCat only works on iOS and Android
- **Sandbox testing** - Make sure you're using the correct test accounts
- **Production testing** - Use TestFlight (iOS) or Internal Testing (Android)
