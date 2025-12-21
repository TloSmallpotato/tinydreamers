
# Quota Enforcement Implementation Checklist

This checklist helps you add quota enforcement to all parts of the app where users can add words, books, or children.

## ✅ Already Implemented

- [x] Subscription Context (`contexts/SubscriptionContext.tsx`)
- [x] Quota Check Hook (`hooks/useQuotaCheck.ts`)
- [x] Upgrade Prompt Modal (`components/UpgradePromptModal.tsx`)
- [x] Subscription Status Card (`components/SubscriptionStatusCard.tsx`)
- [x] Profile Page - Add Child (`app/(tabs)/profile.tsx`)

## 🔄 To Be Implemented

### 1. Add Word Bottom Sheet

**File**: `components/AddWordBottomSheet.tsx`

**Changes Needed**:

```typescript
import { useQuotaCheck } from '@/hooks/useQuotaCheck';
import { useSubscription } from '@/contexts/SubscriptionContext';
import UpgradePromptModal from './UpgradePromptModal';

// Inside component:
const { checkAndProceed, showUpgradeModal, closeUpgradeModal, quotaType } = useQuotaCheck();
const { refreshUsage } = useSubscription();

// In handleAddWord function:
const handleAddWord = async () => {
  await checkAndProceed('word', async () => {
    // Existing add word logic
    await addWordToDatabase();
    await refreshUsage(); // Refresh quota counts
  });
};

// In JSX, add modal:
<UpgradePromptModal
  visible={showUpgradeModal}
  onClose={closeUpgradeModal}
  quotaType={quotaType}
/>
```

**Testing**:
- [ ] Can add up to 20 words
- [ ] Upgrade prompt shows at 21st word
- [ ] After upgrade, can add unlimited words

---

### 2. Select Word Bottom Sheet

**File**: `components/SelectWordBottomSheet.tsx`

**Changes Needed**:

```typescript
import { useQuotaCheck } from '@/hooks/useQuotaCheck';
import { useSubscription } from '@/contexts/SubscriptionContext';
import UpgradePromptModal from './UpgradePromptModal';

// Inside component:
const { checkAndProceed, showUpgradeModal, closeUpgradeModal, quotaType } = useQuotaCheck();
const { refreshUsage } = useSubscription();

// In handleSelectWord function:
const handleSelectWord = async (word: string) => {
  await checkAndProceed('word', async () => {
    // Existing select word logic
    await addSelectedWord(word);
    await refreshUsage();
  });
};

// In JSX, add modal:
<UpgradePromptModal
  visible={showUpgradeModal}
  onClose={closeUpgradeModal}
  quotaType={quotaType}
/>
```

**Testing**:
- [ ] Can select up to 20 words
- [ ] Upgrade prompt shows at 21st word
- [ ] After upgrade, can select unlimited words

---

### 3. Add Custom Book Bottom Sheet

**File**: `components/AddCustomBookBottomSheet.tsx`

**Changes Needed**:

```typescript
import { useQuotaCheck } from '@/hooks/useQuotaCheck';
import { useSubscription } from '@/contexts/SubscriptionContext';
import UpgradePromptModal from './UpgradePromptModal';

// Inside component:
const { checkAndProceed, showUpgradeModal, closeUpgradeModal, quotaType } = useQuotaCheck();
const { refreshUsage } = useSubscription();

// In handleAddBook function:
const handleAddBook = async () => {
  await checkAndProceed('book', async () => {
    // Existing add book logic
    await addBookToDatabase();
    await refreshUsage();
  });
};

// In JSX, add modal:
<UpgradePromptModal
  visible={showUpgradeModal}
  onClose={closeUpgradeModal}
  quotaType={quotaType}
/>
```

**Testing**:
- [ ] Can add up to 10 books
- [ ] Upgrade prompt shows at 11th book
- [ ] After upgrade, can add unlimited books

---

### 4. Book Search Page

**File**: `app/search-book.tsx`

**Changes Needed**:

```typescript
import { useQuotaCheck } from '@/hooks/useQuotaCheck';
import { useSubscription } from '@/contexts/SubscriptionContext';
import UpgradePromptModal from '@/components/UpgradePromptModal';

// Inside component:
const { checkAndProceed, showUpgradeModal, closeUpgradeModal, quotaType } = useQuotaCheck();
const { refreshUsage } = useSubscription();

// In handleAddBook function:
const handleAddBook = async (book: Book) => {
  await checkAndProceed('book', async () => {
    // Existing add book logic
    await addBookFromSearch(book);
    await refreshUsage();
  });
};

// In JSX, add modal:
<UpgradePromptModal
  visible={showUpgradeModal}
  onClose={closeUpgradeModal}
  quotaType={quotaType}
/>
```

**Testing**:
- [ ] Can add up to 10 books from search
- [ ] Upgrade prompt shows at 11th book
- [ ] After upgrade, can add unlimited books

---

### 5. Barcode Scanner Modal

**File**: `components/BarcodeScannerModal.tsx`

**Changes Needed**:

```typescript
import { useQuotaCheck } from '@/hooks/useQuotaCheck';
import { useSubscription } from '@/contexts/SubscriptionContext';
import UpgradePromptModal from './UpgradePromptModal';

// Inside component:
const { checkAndProceed, showUpgradeModal, closeUpgradeModal, quotaType } = useQuotaCheck();
const { refreshUsage } = useSubscription();

// In handleBarcodeScanned function:
const handleBarcodeScanned = async (isbn: string) => {
  await checkAndProceed('book', async () => {
    // Existing barcode scan logic
    await addBookFromISBN(isbn);
    await refreshUsage();
  });
};

// In JSX, add modal:
<UpgradePromptModal
  visible={showUpgradeModal}
  onClose={closeUpgradeModal}
  quotaType={quotaType}
/>
```

**Testing**:
- [ ] Can scan up to 10 books
- [ ] Upgrade prompt shows at 11th book
- [ ] After upgrade, can scan unlimited books

---

### 6. Words Page

**File**: `app/(tabs)/words.tsx`

**Changes Needed**:

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

// Inside component:
const { canAddWord, remainingWords } = useSubscription();

// Display quota info:
<View style={styles.quotaInfo}>
  {!canAddWord && (
    <Text style={styles.quotaWarning}>
      Word limit reached. Upgrade to add more!
    </Text>
  )}
  {canAddWord && remainingWords < 5 && (
    <Text style={styles.quotaWarning}>
      {remainingWords} words remaining
    </Text>
  )}
</View>
```

**Testing**:
- [ ] Shows remaining words when close to limit
- [ ] Shows warning when limit reached
- [ ] Updates in real-time as words are added

---

### 7. Books Page

**File**: `app/(tabs)/books.tsx`

**Changes Needed**:

```typescript
import { useSubscription } from '@/contexts/SubscriptionContext';

// Inside component:
const { canAddBook, remainingBooks } = useSubscription();

// Display quota info:
<View style={styles.quotaInfo}>
  {!canAddBook && (
    <Text style={styles.quotaWarning}>
      Book limit reached. Upgrade to add more!
    </Text>
  )}
  {canAddBook && remainingBooks < 3 && (
    <Text style={styles.quotaWarning}>
      {remainingBooks} books remaining
    </Text>
  )}
</View>
```

**Testing**:
- [ ] Shows remaining books when close to limit
- [ ] Shows warning when limit reached
- [ ] Updates in real-time as books are added

---

## Implementation Pattern

For each component, follow this pattern:

### 1. Import Required Hooks

```typescript
import { useQuotaCheck } from '@/hooks/useQuotaCheck';
import { useSubscription } from '@/contexts/SubscriptionContext';
import UpgradePromptModal from '@/components/UpgradePromptModal';
```

### 2. Initialize Hooks

```typescript
const { checkAndProceed, showUpgradeModal, closeUpgradeModal, quotaType } = useQuotaCheck();
const { refreshUsage } = useSubscription();
```

### 3. Wrap Add Actions

```typescript
const handleAdd = async () => {
  await checkAndProceed('word', async () => {
    // Your existing add logic
    await addItem();
    await refreshUsage();
  });
};
```

### 4. Add Modal to JSX

```typescript
<UpgradePromptModal
  visible={showUpgradeModal}
  onClose={closeUpgradeModal}
  quotaType={quotaType}
/>
```

## Testing Checklist

After implementing all components:

### Free Tier Testing

- [ ] Can add exactly 20 words
- [ ] Cannot add 21st word
- [ ] Can add exactly 10 books
- [ ] Cannot add 11th book
- [ ] Can add exactly 1 child
- [ ] Cannot add 2nd child
- [ ] Upgrade modal shows correct message for each type
- [ ] Quota counts update in real-time

### Plus Tier Testing

- [ ] Can add unlimited words
- [ ] Can add unlimited books
- [ ] Can add up to 2 children
- [ ] Cannot add 3rd child
- [ ] Profile shows "Plus Member" badge
- [ ] No quota warnings shown

### Edge Cases

- [ ] Quota checks work offline
- [ ] Quota updates after sync
- [ ] Multiple rapid additions handled correctly
- [ ] Subscription status syncs across devices
- [ ] Quota persists after app restart

## Common Issues

### Issue: Quota not updating after adding item

**Solution**: Make sure to call `refreshUsage()` after adding:

```typescript
await addItem();
await refreshUsage(); // Don't forget this!
```

### Issue: Modal not showing

**Solution**: Check that modal is added to JSX:

```typescript
<UpgradePromptModal
  visible={showUpgradeModal}
  onClose={closeUpgradeModal}
  quotaType={quotaType}
/>
```

### Issue: Quota check not working

**Solution**: Verify you're using `checkAndProceed`:

```typescript
// ✅ Correct
await checkAndProceed('word', async () => {
  await addWord();
});

// ❌ Wrong
await addWord(); // No quota check!
```

## Progress Tracking

Use this section to track your implementation progress:

- [ ] AddWordBottomSheet updated
- [ ] SelectWordBottomSheet updated
- [ ] AddCustomBookBottomSheet updated
- [ ] Book search page updated
- [ ] Barcode scanner updated
- [ ] Words page updated
- [ ] Books page updated
- [ ] All components tested
- [ ] Edge cases tested
- [ ] Documentation updated

## Completion

Once all items are checked:

1. Test the entire flow end-to-end
2. Test on both iOS and Android
3. Test with real Superwall purchases
4. Update any remaining documentation
5. Deploy to production!

🎉 **Congratulations!** Your freemium model is fully implemented!
