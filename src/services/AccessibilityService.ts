import { AccessibilityInfo, Platform } from 'react-native';
import { Logger } from '../services/LoggerService';

export interface AccessibilityState {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isHighContrastEnabled: boolean;
  isVoiceOverRunning: boolean;
}

/**
 * Comprehensive Accessibility Service
 * Manages accessibility states and provides utility functions
 */
class AccessibilityService {
  private listeners: Set<(state: AccessibilityState) => void> = new Set();
  private subscriptions: Array<{ remove: () => void }> = [];
  private currentState: AccessibilityState = {
    isScreenReaderEnabled: false,
    isReduceMotionEnabled: false,
    isHighContrastEnabled: false,
    isVoiceOverRunning: false,
  };

  constructor() {
    this.initialize();
  }

  /**
   * Initialize accessibility service and set up listeners
   */
  private async initialize(): Promise<void> {
    try {
      // Check initial accessibility states
      const [
        isScreenReaderEnabled,
        isReduceMotionEnabled,
        // isHighContrastEnabled, // Not available in React Native yet
        // isVoiceOverRunning, // iOS specific, use screen reader for cross-platform
      ] = await Promise.all([
        AccessibilityInfo.isScreenReaderEnabled(),
        AccessibilityInfo.isReduceMotionEnabled(),
      ]);

      this.currentState = {
        isScreenReaderEnabled,
        isReduceMotionEnabled,
        isHighContrastEnabled: false, // Will be implemented when available
        isVoiceOverRunning: isScreenReaderEnabled && Platform.OS === 'ios',
      };

      // Set up listeners for accessibility changes
      const screenReaderSub = AccessibilityInfo.addEventListener(
        'screenReaderChanged',
        this.handleScreenReaderChange
      );
      const reduceMotionSub = AccessibilityInfo.addEventListener(
        'reduceMotionChanged',
        this.handleReduceMotionChange
      );

      this.subscriptions.push(screenReaderSub, reduceMotionSub);

      // Notify initial state
      this.notifyListeners();
    } catch (error) {
      Logger.warn('Accessibility initialization failed:', error);
    }
  }

  /**
   * Handle screen reader state changes
   */
  private handleScreenReaderChange = (isEnabled: boolean) => {
    this.currentState.isScreenReaderEnabled = isEnabled;
    this.currentState.isVoiceOverRunning = isEnabled && Platform.OS === 'ios';
    this.notifyListeners();
  };

  /**
   * Handle reduce motion state changes
   */
  private handleReduceMotionChange = (isEnabled: boolean) => {
    this.currentState.isReduceMotionEnabled = isEnabled;
    this.notifyListeners();
  };

  /**
   * Get current accessibility state
   */
  getState(): AccessibilityState {
    return { ...this.currentState };
  }

  /**
   * Add listener for accessibility state changes
   */
  addListener(listener: (state: AccessibilityState) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentState);
      } catch (error) {
        Logger.warn('Accessibility listener error:', error);
      }
    });
  }

  /**
   * Announce message to screen reader
   */
  announceForAccessibility(message: string): void {
    if (this.currentState.isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  }

  /**
   * Set focus to specific element
   */
  setAccessibilityFocus(reactTag: number): void {
    if (this.currentState.isScreenReaderEnabled) {
      AccessibilityInfo.setAccessibilityFocus(reactTag);
    }
  }

  /**
   * Check if animations should be reduced
   */
  shouldReduceMotion(): boolean {
    return this.currentState.isReduceMotionEnabled;
  }

  /**
   * Check if screen reader is active
   */
  isScreenReaderActive(): boolean {
    return this.currentState.isScreenReaderEnabled;
  }

  /**
   * Check if VoiceOver is running (iOS)
   */
  isVoiceOverActive(): boolean {
    return this.currentState.isVoiceOverRunning;
  }

  /**
   * Get appropriate animation duration based on reduce motion setting
   */
  getAnimationDuration(
    normalDuration: number,
    reducedDuration: number = 0
  ): number {
    return this.shouldReduceMotion() ? reducedDuration : normalDuration;
  }

  /**
   * Generate accessibility label for recipe items
   */
  generateRecipeAccessibilityLabel(recipe: {
    name: string;
    difficulty?: string;
    cookingTime?: number;
    matchingIngredientsCount?: number;
    totalIngredientsCount?: number;
    isFavorite?: boolean;
  }): string {
    const parts = [`Tarif: ${recipe.name}`];

    if (recipe.difficulty) {
      parts.push(`Zorluk: ${recipe.difficulty}`);
    }

    if (recipe.cookingTime) {
      parts.push(`Pişirme süresi: ${recipe.cookingTime} dakika`);
    }

    if (recipe.matchingIngredientsCount && recipe.totalIngredientsCount) {
      parts.push(
        `${recipe.matchingIngredientsCount}/${recipe.totalIngredientsCount} malzeme mevcut`
      );
    }

    if (recipe.isFavorite) {
      parts.push('Favori');
    }

    return parts.join(', ');
  }

  /**
   * Generate accessibility hint for interactive elements
   */
  generateAccessibilityHint(action: string, context?: string): string {
    const hints: Record<string, string> = {
      add_ingredient: 'Malzemeyi listeye eklemek için çift dokunun',
      remove_ingredient: 'Malzemeyi listeden çıkarmak için çift dokunun',
      start_voice_input: 'Sesli malzeme girişi başlatmak için çift dokunun',
      search_recipes: 'Yemek tariflerini aramak için çift dokunun',
      view_recipe: 'Tarif detaylarını görüntülemek için çift dokunun',
      add_to_favorites: 'Favorilere eklemek için çift dokunun',
      remove_from_favorites: 'Favorilerden çıkarmak için çift dokunun',
      toggle_theme: 'Tema değiştirmek için çift dokunın',
      close_modal: 'Pencereyi kapatmak için çift dokunun',
      navigate_back: 'Önceki sayfaya dönmek için çift dokunun',
    };

    const baseHint = hints[action] || 'Etkinleştirmek için çift dokunun';
    return context ? `${baseHint}. ${context}` : baseHint;
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    this.subscriptions.forEach(sub => sub.remove());
    this.subscriptions = [];
    this.listeners.clear();
  }
}

const accessibilityManager = new AccessibilityService();
export { accessibilityManager as AccessibilityManager };
export default accessibilityManager;
