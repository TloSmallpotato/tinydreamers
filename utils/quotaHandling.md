
# Quota Handling with Superwall

This document explains how the freemium subscription model is implemented in the app using Superwall.

## Subscription Tiers

### Free Tier
- **Words**: 20 maximum
- **Books**: 10 maximum
- **Children**: 1 maximum

### Plus Tier
- **Words**: Unlimited
- **Books**: Unlimited
- **Children**: 2 maximum

## Implementation

### 1. Subscription Context (`contexts/SubscriptionContext.tsx`)

The `SubscriptionContext` manages:
- Current subscription tier (free/plus)
- Usage tracking for words, books, and children
- Quota checks before allowing actions
- Paywall presentation

Key functions:
- `checkQuota(type)`: Check if user can add more items
- `showPaywall(placement)`: Display upgrade prompt
- `refreshUsage()`: Update current usage counts

### 2. Upgrade Prompt Modal (`components/UpgradePromptModal.tsx`)

A modal that displays when users hit quota limits:
- Shows comparison between Free and Plus tiers
- Explains benefits of upgrading
- Triggers Superwall paywall on "Upgrade" button

### 3. Subscription Status Card (`components/SubscriptionStatusCard.tsx`)

Displays on the profile page:
- Shows current tier (Free/Plus)
- For free users: displays quota usage with progress bars
- For plus users: shows unlimited benefits
- Includes upgrade button for free users

## Usage in Components

### Checking Quotas Before Actions

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

function MyComponent() {
  const { canAddWord, canAddBook, canAddChild, showPaywall } = useSubscription();
  
  const handleAddWord = () => {
    if (!canAddWord) {
      // Show upgrade prompt
      showPaywall('word_limit');
      return;
    }
    
    // Proceed with adding word
  };
}
```

### Showing Upgrade Modals

```typescript
import UpgradePromptModal from '@/components/UpgradePromptModal';

function MyComponent() {
  const [showUpgrade, setShowUpgrade] = useState(false);
  
  return (
    <>
      {/* Your component UI */}
      <UpgradePromptModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        quotaType="word" // or "book" or "child"
      />
    </>
  );
}
```

## Superwall Configuration

### API Keys

Set your Superwall API keys in `app/_layout.tsx`:

```typescript
const SUPERWALL_API_KEY_IOS = 'your_ios_key';
const SUPERWALL_API_KEY_ANDROID = 'your_android_key';
```

Get your API keys from the [Superwall Dashboard](https://superwall.com/dashboard).

### Placements

Configure these placements in your Superwall dashboard:
- `upgrade_prompt`: General upgrade prompt
- `profile_upgrade`: Upgrade from profile page
- `word_limit`: When word limit is reached
- `book_limit`: When book limit is reached
- `child_limit`: When child limit is reached

### Products

Create a subscription product in your Superwall dashboard:
- Product ID: `plus_subscription`
- Name: "Plus Plan"
- Features: Unlimited words, unlimited books, 2 children

## Real-time Usage Updates

The subscription context automatically:
1. Tracks usage when items are added/removed
2. Updates quota availability in real-time
3. Refreshes on pull-to-refresh in profile page
4. Syncs with Superwall subscription status

## Testing

### Test Free Tier Limits

1. Create a new account
2. Add 20 words - should succeed
3. Try to add 21st word - should show upgrade prompt
4. Add 10 books - should succeed
5. Try to add 11th book - should show upgrade prompt
6. Add 1 child - should succeed
7. Try to add 2nd child - should show upgrade prompt

### Test Plus Tier

1. Subscribe to Plus plan through Superwall paywall
2. Verify unlimited words and books
3. Verify can add up to 2 children
4. Check profile shows "Plus Member" status

## Notes

- Quota checks happen client-side for instant feedback
- Server-side validation should be added for security
- Usage counts are fetched from Supabase database
- Subscription status comes from Superwall SDK
- All quota limits are defined in `QUOTA_LIMITS` constant
