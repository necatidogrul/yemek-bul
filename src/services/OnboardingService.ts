import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPreferencesService } from './UserPreferencesService';
import { Logger } from './LoggerService';

export interface OnboardingStep {
  id: string;
  type:
    | 'welcome'
    | 'feature-discovery'
    | 'preferences'
    | 'dietary-preferences'
    | 'tutorial'
    | 'completion';
  title: string;
  subtitle: string;
  description?: string;
  icon: string;
  color: string;
  gradient: string[];
  interactive?: boolean;
  skippable?: boolean;
  features?: string[];
  tips?: string[];
}

export interface OnboardingProgress {
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  startTime: number;
  preferences: {
    favoriteCategories: string[];
    cookingLevel: 'başlangıç' | 'orta' | 'uzman';
    dietaryRestrictions: string[];
    dietaryPreferences: string[]; // Yeni diyet tercihleri
    notifications: boolean;
    language: 'tr' | 'en';
  };
}

export class OnboardingService {
  private static readonly ONBOARDING_KEY = 'onboarding_progress';
  private static readonly COMPLETED_KEY = 'onboarding_completed';

  private static defaultSteps: OnboardingStep[] = [
    {
      id: 'welcome',
      type: 'welcome',
      title: "Yemek Bulucu'ya Hoş Geldin!",
      subtitle: 'AI destekli tarif keşfetme deneyimin başlıyor',
      description:
        'Elindeki malzemelerle harika tarifler bul, favorilere kaydet ve mutfakta ustalaş!',
      icon: 'restaurant-outline',
      color: '#6366F1',
      gradient: ['#6366F1', '#8B5CF6'],
      skippable: false,
      tips: [
        'AI teknologisi ile kişiselleştirilmiş tarifler',
        'Binlerce tarif arasından en uygununu bul',
        'Adım adım pişirme rehberi',
      ],
    },
    {
      id: 'ai-features',
      type: 'feature-discovery',
      title: 'AI Gücü ile Tarif Keşfi',
      subtitle: 'Malzemelerinizi girin, biz gerisini halledelim',
      description:
        'Yapay zeka destekli sistemimiz size en uygun tarifleri önerir',
      icon: 'sparkles-outline',
      color: '#EC4899',
      gradient: ['#EC4899', '#F97316'],
      interactive: true,
      features: [
        'Akıllı malzeme analizi',
        'Kişiselleştirilmiş öneriler',
        'Beslenme bilgisi hesaplama',
        'Alternatif malzeme önerileri',
      ],
    },
    {
      id: 'personalization',
      type: 'preferences',
      title: 'Mutfak Profilini Oluştur',
      subtitle: 'Tercihlerini belirle, size özel tarifler keşfet',
      description: 'Bu bilgiler sayesinde sana en uygun tarifleri önerebiliriz',
      icon: 'person-outline',
      color: '#06B6D4',
      gradient: ['#06B6D4', '#10B981'],
      interactive: true,
      skippable: true,
    },
    {
      id: 'dietary-preferences',
      type: 'dietary-preferences',
      title: 'Beslenme Tercihlerin',
      subtitle: 'Özel diyet gereksinimlerini belirle',
      description: 'Vegan, vejetaryan, glutensiz gibi beslenme tercihlerini seç',
      icon: 'leaf-outline',
      color: '#22C55E',
      gradient: ['#22C55E', '#16A34A'],
      interactive: true,
      skippable: true,
      tips: [
        'Tarifler tercihlerin doğrultusunda filtrelenecek',
        'İstediğin zaman değiştirebilirsin',
        'Birden fazla seçenek işaretleyebilirsin'
      ]
    },
    {
      id: 'tutorial',
      type: 'tutorial',
      title: 'Temel Özellikleri Keşfet',
      subtitle: 'Uygulamanın tüm özelliklerini öğren',
      description: 'Hızlı bir turla tüm özellikleri keşfedelim',
      icon: 'school-outline',
      color: '#F59E0B',
      gradient: ['#F59E0B', '#EF4444'],
      interactive: true,
      features: [
        'Ana ekranda hızlı arama',
        'Favorilere ekleme',
        'Tarif geçmişi',
        'Ayarlar ve kişiselleştirme',
      ],
    },
    {
      id: 'completion',
      type: 'completion',
      title: 'Hazırsın!',
      subtitle: 'İlk tarifini keşfetmeye başla',
      description: "Artık Yemek Bulucu'nun tüm özelliklerini kullanabilirsin",
      icon: 'checkmark-circle-outline',
      color: '#10B981',
      gradient: ['#10B981', '#059669'],
      tips: [
        'İlk tarifin için ana ekranda malzeme gir',
        'Beğendiğin tarifleri favorilere ekle',
        'Tarif geçmişinden eski aramalarını gör',
      ],
    },
  ];

  static async getOnboardingSteps(): Promise<OnboardingStep[]> {
    return this.defaultSteps;
  }

  static async getProgress(): Promise<OnboardingProgress | null> {
    try {
      const progressData = await AsyncStorage.getItem(this.ONBOARDING_KEY);
      if (progressData) {
        return JSON.parse(progressData);
      }
      return null;
    } catch (error) {
      Logger.error('Failed to get onboarding progress', error);
      return null;
    }
  }

  static async saveProgress(progress: OnboardingProgress): Promise<void> {
    try {
      await AsyncStorage.setItem(this.ONBOARDING_KEY, JSON.stringify(progress));
    } catch (error) {
      Logger.error('Failed to save onboarding progress', error);
      throw error;
    }
  }

  static async initializeProgress(): Promise<OnboardingProgress> {
    const progress: OnboardingProgress = {
      currentStep: 0,
      completedSteps: [],
      skippedSteps: [],
      startTime: Date.now(),
      preferences: {
        favoriteCategories: [],
        cookingLevel: 'orta',
        dietaryRestrictions: [],
        dietaryPreferences: [], // Yeni diyet tercihleri
        notifications: true,
        language: 'tr',
      },
    };

    await this.saveProgress(progress);
    return progress;
  }

  static async completeStep(stepId: string): Promise<void> {
    const progress = await this.getProgress();
    if (!progress) return;

    if (!progress.completedSteps.includes(stepId)) {
      progress.completedSteps.push(stepId);
    }

    // Remove from skipped if was previously skipped
    progress.skippedSteps = progress.skippedSteps.filter(id => id !== stepId);

    await this.saveProgress(progress);
  }

  static async skipStep(stepId: string): Promise<void> {
    const progress = await this.getProgress();
    if (!progress) return;

    if (!progress.skippedSteps.includes(stepId)) {
      progress.skippedSteps.push(stepId);
    }

    await this.saveProgress(progress);
  }

  static async updatePreferences(
    preferences: Partial<OnboardingProgress['preferences']>
  ): Promise<void> {
    const progress = await this.getProgress();
    if (!progress) return;

    progress.preferences = { ...progress.preferences, ...preferences };
    await this.saveProgress(progress);
  }

  static async setCurrentStep(stepIndex: number): Promise<void> {
    const progress = await this.getProgress();
    if (!progress) return;

    progress.currentStep = stepIndex;
    await this.saveProgress(progress);
  }

  static async completeOnboarding(): Promise<void> {
    const progress = await this.getProgress();
    if (!progress) return;

    try {
      // Save user preferences
      await UserPreferencesService.saveUserPreferences({
        favoriteCategories: progress.preferences.favoriteCategories,
        cookingLevel: progress.preferences.cookingLevel,
        dietaryRestrictions: progress.preferences.dietaryRestrictions,
        onboardingCompleted: true,
        language: progress.preferences.language,
      });

      // Mark onboarding as completed
      await AsyncStorage.setItem(this.COMPLETED_KEY, 'true');

      // Clear progress data
      await AsyncStorage.removeItem(this.ONBOARDING_KEY);

      Logger.info('Onboarding completed successfully', {
        completedSteps: progress.completedSteps.length,
        skippedSteps: progress.skippedSteps.length,
        duration: Date.now() - progress.startTime,
        preferences: progress.preferences,
      });
    } catch (error) {
      Logger.error('Failed to complete onboarding', error);
      throw error;
    }
  }

  static async isOnboardingCompleted(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(this.COMPLETED_KEY);
      return completed === 'true';
    } catch (error) {
      Logger.error('Failed to check onboarding completion', error);
      return false;
    }
  }

  static async resetOnboarding(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.ONBOARDING_KEY);
      await AsyncStorage.removeItem(this.COMPLETED_KEY);
      Logger.info('Onboarding reset successfully');
    } catch (error) {
      Logger.error('Failed to reset onboarding', error);
      throw error;
    }
  }

  static async getOnboardingStats(): Promise<{
    isCompleted: boolean;
    progress: OnboardingProgress | null;
    completionRate: number;
  }> {
    const isCompleted = await this.isOnboardingCompleted();
    const progress = await this.getProgress();

    let completionRate = 0;
    if (progress) {
      const totalSteps = this.defaultSteps.length;
      const completedSteps = progress.completedSteps.length;
      completionRate = (completedSteps / totalSteps) * 100;
    } else if (isCompleted) {
      completionRate = 100;
    }

    return {
      isCompleted,
      progress,
      completionRate: Math.round(completionRate),
    };
  }
}
