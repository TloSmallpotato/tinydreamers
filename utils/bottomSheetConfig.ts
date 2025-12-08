
import { Platform } from 'react-native';

/**
 * Configuration for BottomSheet components
 * 
 * Updated approach: Enable animations for better UX while maintaining stability.
 * The previous crash issues on iOS/macOS have been resolved by the @gorhom/bottom-sheet library updates.
 */
export const getBottomSheetConfig = () => ({
  // Enable mount animation for smooth slide-in effect
  animateOnMount: true,
  
  // Enable content panning gesture for better interaction
  enableContentPanningGesture: true,
});

export const getModalConfig = () => ({
  // Use 'slide' animation type for smooth transitions
  animationType: 'slide' as const,
});
