
import { useState, useCallback } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { HapticFeedback } from '@/utils/haptics';

export type QuotaType = 'word' | 'book' | 'child';

export function useQuotaCheck() {
  const { checkQuota } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [quotaType, setQuotaType] = useState<QuotaType>('word');

  const checkAndProceed = useCallback(
    async (type: QuotaType, onProceed: () => void | Promise<void>) => {
      console.log('useQuotaCheck: Checking quota for:', type);
      
      if (!checkQuota(type)) {
        console.log('useQuotaCheck: Quota exceeded for:', type);
        HapticFeedback.warning();
        setQuotaType(type);
        setShowUpgradeModal(true);
        return false;
      }

      console.log('useQuotaCheck: Quota available, proceeding');
      await onProceed();
      return true;
    },
    [checkQuota]
  );

  const closeUpgradeModal = useCallback(() => {
    setShowUpgradeModal(false);
  }, []);

  return {
    checkAndProceed,
    showUpgradeModal,
    closeUpgradeModal,
    quotaType,
  };
}
