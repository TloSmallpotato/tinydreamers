
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Utility class for haptic feedback throughout the app
 * Provides consistent haptic feedback on all touch interactions
 */
export class HapticFeedback {
  /**
   * Medium impact - used for most button presses and interactions
   */
  static medium() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }

  /**
   * Light impact - used for subtle interactions
   */
  static light() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  /**
   * Heavy impact - used for important actions
   */
  static heavy() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }

  /**
   * Selection feedback - used for picker/selector changes
   */
  static selection() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.selectionAsync();
    }
  }

  /**
   * Success notification - used for successful operations
   */
  static success() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  /**
   * Error notification - used for failed operations
   */
  static error() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  /**
   * Warning notification - used for warning messages
   */
  static warning() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }
}
