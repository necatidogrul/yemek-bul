import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Logger } from '../services/LoggerService';

export type HapticFeedbackType = 
  | 'light'
  | 'medium' 
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection'
  | 'impact'
  | 'notification';

interface HapticOptions {
  enabled?: boolean;
  delay?: number;
}

/**
 * Comprehensive Haptic Feedback Service
 * Provides consistent haptic feedback across the app
 */
class HapticService {
  private enabled: boolean = true;

  /**
   * Set global haptic feedback preference
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if haptic feedback is available on device
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  /**
   * Trigger haptic feedback with delay option
   */
  private async triggerHaptic(
    hapticFunction: () => Promise<void>,
    options: HapticOptions = {}
  ): Promise<void> {
    const { enabled = this.enabled, delay = 0 } = options;

    if (!enabled || !this.isAvailable()) {
      return;
    }

    try {
      if (delay > 0) {
        setTimeout(async () => {
          await hapticFunction();
        }, delay);
      } else {
        await hapticFunction();
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  /**
   * Light impact feedback - for subtle interactions
   * Use for: hovering, light touches, minor selections
   */
  async light(options?: HapticOptions): Promise<void> {
    await this.triggerHaptic(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
      options
    );
  }

  /**
   * Medium impact feedback - for standard interactions
   * Use for: button presses, menu selections, toggles
   */
  async medium(options?: HapticOptions): Promise<void> {
    await this.triggerHaptic(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
      options
    );
  }

  /**
   * Heavy impact feedback - for important interactions
   * Use for: confirmations, major actions, deletions
   */
  async heavy(options?: HapticOptions): Promise<void> {
    await this.triggerHaptic(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
      options
    );
  }

  /**
   * Success notification feedback
   * Use for: successful operations, completions, achievements
   */
  async success(options?: HapticOptions): Promise<void> {
    await this.triggerHaptic(
      () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
      options
    );
  }

  /**
   * Warning notification feedback
   * Use for: warnings, cautions, non-critical errors
   */
  async warning(options?: HapticOptions): Promise<void> {
    await this.triggerHaptic(
      () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
      options
    );
  }

  /**
   * Error notification feedback
   * Use for: errors, failures, critical issues
   */
  async error(options?: HapticOptions): Promise<void> {
    await this.triggerHaptic(
      () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
      options
    );
  }

  /**
   * Selection feedback - for picker/scroll interactions
   * Use for: scrolling through lists, picker selections
   */
  async selection(options?: HapticOptions): Promise<void> {
    await this.triggerHaptic(
      () => Haptics.selectionAsync(),
      options
    );
  }

  // Convenience methods for common app interactions

  /**
   * Button press feedback
   */
  async buttonPress(): Promise<void> {
    await this.medium();
  }

  /**
   * Toggle switch feedback
   */
  async toggle(): Promise<void> {
    await this.light();
  }

  /**
   * Tab navigation feedback
   */
  async tabPress(): Promise<void> {
    await this.light();
  }

  /**
   * Modal/sheet presentation feedback
   */
  async modalPresent(): Promise<void> {
    await this.light();
  }

  /**
   * Modal/sheet dismissal feedback
   */
  async modalDismiss(): Promise<void> {
    await this.light();
  }

  /**
   * Add to favorites feedback
   */
  async addFavorite(): Promise<void> {
    await this.success();
  }

  /**
   * Remove from favorites feedback
   */
  async removeFavorite(): Promise<void> {
    await this.warning();
  }

  /**
   * Recipe search start feedback
   */
  async searchStart(): Promise<void> {
    await this.medium();
  }

  /**
   * Recipe found feedback
   */
  async searchComplete(): Promise<void> {
    await this.success();
  }

  /**
   * No recipes found feedback
   */
  async searchEmpty(): Promise<void> {
    await this.warning();
  }

  /**
   * Voice input start feedback
   */
  async voiceStart(): Promise<void> {
    await this.medium();
  }

  /**
   * Voice input stop feedback
   */
  async voiceStop(): Promise<void> {
    await this.light();
  }

  /**
   * Voice input success feedback
   */
  async voiceSuccess(): Promise<void> {
    await this.success();
  }

  /**
   * Voice input error feedback
   */
  async voiceError(): Promise<void> {
    await this.error();
  }

  /**
   * Payment/subscription success feedback
   */
  async purchaseSuccess(): Promise<void> {
    await this.success();
  }

  /**
   * Payment/subscription error feedback
   */
  async purchaseError(): Promise<void> {
    await this.error();
  }

  /**
   * Onboarding step completion feedback
   */
  async onboardingStep(): Promise<void> {
    await this.success();
  }

  /**
   * Onboarding completion feedback
   */
  async onboardingComplete(): Promise<void> {
    // Double success for celebration
    await this.success();
    setTimeout(() => this.success(), 200);
  }

  /**
   * Long press feedback
   */
  async longPress(): Promise<void> {
    await this.heavy();
  }

  /**
   * Pull to refresh feedback
   */
  async pullRefresh(): Promise<void> {
    await this.medium();
  }

  /**
   * Generic feedback by type
   */
  async trigger(type: HapticFeedbackType, options?: HapticOptions): Promise<void> {
    switch (type) {
      case 'light':
        await this.light(options);
        break;
      case 'medium':
        await this.medium(options);
        break;
      case 'heavy':
        await this.heavy(options);
        break;
      case 'success':
        await this.success(options);
        break;
      case 'warning':
        await this.warning(options);
        break;
      case 'error':
        await this.error(options);
        break;
      case 'selection':
        await this.selection(options);
        break;
      case 'impact':
        await this.medium(options);
        break;
      case 'notification':
        await this.success(options);
        break;
      default:
        await this.medium(options);
    }
  }
}

export const HapticFeedback = new HapticService();
export default HapticFeedback;