
import { Platform } from 'react-native';

/**
 * Configuration for BottomSheet components to prevent snapshot crashes on iOS/macOS
 * 
 * The crash occurs when React Native tries to take snapshots of views during animations,
 * which is a known issue with macOS Catalyst builds. Disabling animations prevents this.
 */
export const getBottomSheetConfig = () => ({
  // Disable mount animation to prevent snapshot crashes
  animateOnMount: false,
  
  // Disable content panning gesture on iOS to prevent snapshot issues during gestures
  enableContentPanningGesture: Platform.OS !== 'ios',
});

export const getModalConfig = () => ({
  // Use 'none' animation type to prevent snapshot crashes
  animationType: 'none' as const,
});
