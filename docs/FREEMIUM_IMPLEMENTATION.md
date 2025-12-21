
# Freemium Implementation with RevenueCat

## Overview

This app implements a freemium subscription model using **RevenueCat** for in-app purchase management.

## Subscription Tiers

### Free Tier
- **Words**: 20 maximum
- **Books**: 10 maximum
- **Children**: 1 maximum
- **Cost**: Free

### Plus Tier
- **Words**: Unlimited
- **Books**: Unlimited
- **Children**: 2 maximum
- **Cost**: $4.99/month (configurable)

## Implementation Details

### Core Components

#### 1. SubscriptionContext (`contexts/SubscriptionContext.tsx`)
- Manages subscription state using RevenueCat
- Tracks current usage from Supabase database
- Provides quota checking functionality
- Handles purchase flow and restoration

#### 2. SubscriptionStatusCard (`components/SubscriptionStatusCard.tsx`)
- Displays subscription status on profile page
- Shows usage bars for free tier users
- Provides upgrade button
- Includes restore purchases button

#### 3. UpgradePromptModal (`components/UpgradePromptModal.tsx`)
- Shown when user hits quota limits
- Displays comparison between Free and Plus tiers
- Triggers RevenueCat purchase flow

#### 4. useQuotaCheck Hook (`hooks/useQuotaCheck.ts`)
- Simplifies quota checking in components
- Automatically shows upgrade modal when limit reached
- Provides clean API for quota-gated actions

### User Flow

```
1. User tries to add word/book/child
   ↓
2. useQuotaCheck.checkAndProceed()
   ↓
3. Check current usage vs. tier limits
   ↓
4a. If under limit → Proceed with action
4b. If over limit → Show UpgradePromptModal
   ↓
5. User clicks "Upgrade to Plus"
   ↓
6. RevenueCat purchase flow
   ↓
7. On success → Update tier to 'plus'
   ↓
8. User can now add unlimited items
```

### Database Integration

The subscription system integrates with Supabase to track usage:

```typescript
// Count user's words
SELECT COUNT(*) FROM user_words 
WHERE child_id IN (
  SELECT id FROM children WHERE user_id = current_user_id
)

// Count user's books
SELECT COUNT(*) FROM user_books 
WHERE user_id = current_user_id

// Count user's children
SELECT COUNT(*) FROM children 
WHERE user_id = current_user_id
```

### Quota Enforcement

Quotas are enforced client-side before database operations:

```typescript
// Example: Adding a word
const { checkAndProceed } = useQuotaCheck();

await checkAndProceed('word', async () => {
  // This only runs if quota is available
  await supabase.from('user_words').insert({ ... });
});
```

## Setup Instructions

### Quick Setup (5 minutes)

1. **Get RevenueCat API Keys**
   - Sign up at https://www.revenuecat.com
   - Create a project
   - Copy iOS and Android API keys

2. **Configure App**
   - Open `contexts/SubscriptionContext.tsx`
   - Replace placeholder API keys with your actual keys

3. **Create Products**
   - Create `plus_subscription` in App Store Connect
   - Create `plus_subscription` in Google Play Console

4. **Configure RevenueCat**
   - Connect App Store Connect
   - Connect Google Play
   - Create `plus` entitlement
   - Attach products to entitlement
   - Create `default` offering

See `docs/REVENUECAT_QUICKSTART.md` for detailed instructions.

## Testing

### Test Free Tier Limits

```typescript
// Add 20 words - should succeed
for (let i = 0; i < 20; i++) {
  await addWord();
}

// Try to add 21st word - should show upgrade modal
await addWord(); // UpgradePromptModal appears
```

### Test Plus Tier

```typescript
// Subscribe to Plus
await showPaywall();
// Complete purchase

// Add unlimited words - should succeed
for (let i = 0; i < 100; i++) {
  await addWord(); // No limit
}
```

### Test Restore Purchases

```typescript
// On new device with same account
await restorePurchases();
// Subscription status should update to Plus
```

## Usage Examples

### Check Quota Before Action

```typescript
import { useQuotaCheck } from '@/hooks/useQuotaCheck';

function MyComponent() {
  const { checkAndProceed, showUpgradeModal, closeUpgradeModal, quotaType } = useQuotaCheck();

  const handleAddWord = async () => {
    await checkAndProceed('word', async () => {
      // Add word to database
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

### Display Subscription Status

```typescript
import SubscriptionStatusCard from '@/components/SubscriptionStatusCard';

function ProfileScreen() {
  return (
    <ScrollView>
      <SubscriptionStatusCard />
    </ScrollView>
  );
}
```

### Manual Upgrade Trigger

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function SettingsScreen() {
  const { showPaywall, isSubscribed } = useSubscription();

  return (
    <View>
      {!isSubscribed && (
        <Button onPress={showPaywall}>
          Upgrade to Plus
        </Button>
      )}
    </View>
  );
}
```

## API Reference

### SubscriptionContext

```typescript
interface SubscriptionContextType {
  // Status
  tier: 'free' | 'plus';
  isSubscribed: boolean;
  isLoading: boolean;

  // Usage
  currentUsage: {
    words: number;
    books: number;
    children: number;
  };

  // Quota checks
  canAddWord: boolean;
  canAddBook: boolean;
  canAddChild: boolean;

  // Remaining
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

### useQuotaCheck Hook

```typescript
interface UseQuotaCheckReturn {
  checkAndProceed: (
    type: 'word' | 'book' | 'child',
    onProceed: () => void | Promise<void>
  ) => Promise<boolean>;
  showUpgradeModal: boolean;
  closeUpgradeModal: () => void;
  quotaType: 'word' | 'book' | 'child';
}
```

## Best Practices

### 1. Always Check Quotas

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

### 2. Refresh Usage After Changes

```typescript
// ✅ Good
await addWord();
await refreshUsage();

// ❌ Bad
await addWord(); // Usage not updated
```

### 3. Handle Errors

```typescript
// ✅ Good
try {
  await showPaywall();
} catch (error) {
  Alert.alert('Error', 'Unable to complete purchase');
}

// ❌ Bad
await showPaywall(); // No error handling
```

## Troubleshooting

### Issue: Paywall Not Showing

**Cause**: API keys not configured or offerings not set up

**Solution**:
1. Check API keys in `SubscriptionContext.tsx`
2. Verify offerings in RevenueCat dashboard
3. Ensure products are synced

### Issue: Subscription Not Updating

**Cause**: User not identified or entitlement mismatch

**Solution**:
1. Check console logs for "Identifying user"
2. Verify entitlement identifier is `plus`
3. Test with RevenueCat sandbox

### Issue: Quota Counts Wrong

**Cause**: Database queries or RLS policies

**Solution**:
1. Check Supabase RLS policies
2. Verify database queries
3. Call `refreshUsage()` manually

## Migration Notes

### From Superwall to RevenueCat

Changes made:
- ✅ Removed `expo-superwall` dependency
- ✅ Installed `react-native-purchases`
- ✅ Updated `SubscriptionContext.tsx` to use RevenueCat
- ✅ Removed Superwall-specific code from `app/_layout.tsx`
- ✅ Updated documentation
- ✅ Added restore purchases functionality

No changes needed to:
- ✅ Database schema
- ✅ Quota limits
- ✅ User flow
- ✅ UI components (except minor updates)

## Resources

- **RevenueCat Docs**: https://docs.revenuecat.com
- **Quick Start Guide**: `docs/REVENUECAT_QUICKSTART.md`
- **Full Integration Guide**: `docs/REVENUECAT_INTEGRATION.md`
- **RevenueCat Dashboard**: https://app.revenuecat.com

## Support

For issues:
1. Check console logs for errors
2. Review RevenueCat dashboard
3. Verify product configuration
4. Test with sandbox environment
5. Contact RevenueCat support: https://community.revenuecat.com
