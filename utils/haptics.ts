
import * as Haptics from 'expo-haptics';

/**
 * Utility class for haptic feedback throughout the app
 * Provides consistent haptic feedback on all touch interactions
 * Note: Expo handles platform checks internally, so no need for Platform.OS checks
 */
export class HapticFeedback {
  /**
   * Medium impact - used for most button presses and interactions
   */
  static medium() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  /**
   * Light impact - used for subtle interactions
   */
  static light() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  /**
   * Heavy impact - used for important actions
   */
  static heavy() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  /**
   * Selection feedback - used for picker/selector changes
   */
  static selection() {
    Haptics.selectionAsync();
  }

  /**
   * Success notification - used for successful operations
   */
  static success() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  /**
   * Error notification - used for failed operations
   */
  static error() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  /**
   * Warning notification - used for warning messages
   */
  static warning() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}
