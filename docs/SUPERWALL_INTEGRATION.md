
# Superwall Integration Guide

This document provides a complete guide to the Superwall integration for the freemium subscription model in the Natively app.

## Overview

The app uses **Superwall** to manage in-app subscriptions with a freemium model:

- **Free Tier**: 20 words, 10 books, 1 child
- **Plus Tier**: Unlimited words, unlimited books, 2 children

## Setup Instructions

### 1. Get Superwall API Keys

1. Sign up at [Superwall](https://superwall.com)
2. Create a new project
3. Get your API keys from the dashboard:
   - iOS API Key
   - Android API Key

### 2. Configure API Keys

Update `app/_layout.tsx` with your actual API keys:

```typescript
const SUPERWALL_API_KEY_IOS = 'pk_your_ios_key_here';
const SUPERWALL_API_KEY_ANDROID = 'pk_your_android_key_here';
```

### 3. Configure Products in Superwall Dashboard

Create a subscription product:

**Product Details:**
- Product ID: `plus_subscription`
- Name: "Plus Plan"
- Type: Auto-renewable subscription
- Duration: Monthly (or your preferred billing cycle)

**Features:**
- Unlimited words
- Unlimited books
- Support for 2 children

### 4. Create Placements

Configure these placements in your Superwall dashboard:

| Placement ID | Description | Trigger |
|-------------|-------------|---------|
| `upgrade_prompt` | General upgrade prompt | Manual trigger |
| `profile_upgrade` | Upgrade from profile | Profile page button |
| `word_limit` | Word limit reached | After 20 words |
| `book_limit` | Book limit reached | After 10 books |
| `child_limit` | Child limit reached | After 1 child |

### 5. Design Your Paywall

In the Superwall dashboard:
1. Go to Paywalls section
2. Create a new paywall design
3. Add your product (`plus_subscription`)
4. Customize the design to match your app's branding
5. Assign the paywall to your placements

## Architecture

### Components

```
app/
├── _layout.tsx                          # SuperwallProvider setup
contexts/
├── SubscriptionContext.tsx              # Subscription state management
components/
├── SubscriptionStatusCard.tsx           # Profile subscription display
├── UpgradePromptModal.tsx              # Quota limit modal
hooks/
├── useQuotaCheck.ts                    # Quota checking hook
utils/
├── quotaHandling.md                    # Quota handling documentation
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
         Superwall Paywall
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
    await showPaywall('profile_upgrade');
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
  showPaywall: (placement?: string) => Promise<void>;
  checkQuota: (type: 'word' | 'book' | 'child') => boolean;
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

#### `showPaywall(placement)`
Display Superwall paywall for a specific placement.

```typescript
const { showPaywall } = useSubscription();

await showPaywall('upgrade_prompt');
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
3. Verify modal shows correct message
4. Click "Upgrade" → Should show Superwall paywall

**Books:**
1. Add 10 books → Should succeed
2. Try to add 11th book → Should show upgrade modal

**Children:**
1. Add 1 child → Should succeed
2. Try to add 2nd child → Should show upgrade modal

#### 2. Plus Tier Features

1. Subscribe to Plus through paywall
2. Verify profile shows "Plus Member" badge
3. Add more than 20 words → Should succeed
4. Add more than 10 books → Should succeed
5. Add 2nd child → Should succeed
6. Try to add 3rd child → Should show limit message

#### 3. Subscription Status Sync

1. Subscribe on device A
2. Open app on device B (same account)
3. Verify Plus status syncs automatically
4. Test quota limits on both devices

### Test Accounts

For testing, use Superwall's sandbox environment:
- Test purchases don't charge real money
- Subscriptions can be easily reset
- Full feature parity with production

## Troubleshooting

### Issue: Paywall Not Showing

**Possible Causes:**
1. API keys not configured correctly
2. Placement not created in dashboard
3. Paywall not assigned to placement

**Solution:**
1. Verify API keys in `app/_layout.tsx`
2. Check Superwall dashboard for placement configuration
3. Ensure paywall is published and assigned

### Issue: Subscription Status Not Updating

**Possible Causes:**
1. User not identified with Superwall
2. Network connectivity issues
3. Subscription not properly configured

**Solution:**
1. Check console logs for "Identifying user with Superwall"
2. Verify network connection
3. Test with Superwall's test purchases

### Issue: Quota Counts Incorrect

**Possible Causes:**
1. Database queries not filtering correctly
2. Real-time subscriptions not working
3. Usage not refreshing after changes

**Solution:**
1. Check Supabase RLS policies
2. Verify real-time subscriptions are active
3. Call `refreshUsage()` manually

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
  await showPaywall('upgrade');
} catch (error) {
  console.error('Paywall error:', error);
  Alert.alert('Error', 'Unable to show upgrade options');
}

// ❌ Bad
await showPaywall('upgrade'); // No error handling
```

## Analytics

Track these events for subscription analytics:

1. **Quota Limit Reached**
   - Event: `quota_limit_reached`
   - Properties: `{ type: 'word' | 'book' | 'child' }`

2. **Upgrade Modal Shown**
   - Event: `upgrade_modal_shown`
   - Properties: `{ trigger: string }`

3. **Paywall Presented**
   - Event: `paywall_presented`
   - Properties: `{ placement: string }`

4. **Subscription Purchased**
   - Event: `subscription_purchased`
   - Properties: `{ product_id: string, price: number }`

## Support

For Superwall-specific issues:
- Documentation: https://docs.superwall.com
- Support: support@superwall.com
- Dashboard: https://superwall.com/dashboard

For app-specific issues:
- Check console logs for detailed error messages
- Verify Supabase database queries
- Test with Superwall sandbox environment
