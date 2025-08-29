import React, {
  useCallback,
  useContext,
  createContext,
  ReactNode,
} from 'react';
import { HapticFeedback, HapticFeedbackType } from '../services/HapticService';

interface HapticContextType {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  trigger: (type: HapticFeedbackType) => Promise<void>;
  // Convenience methods
  buttonPress: () => Promise<void>;
  toggle: () => Promise<void>;
  success: () => Promise<void>;
  error: () => Promise<void>;
  warning: () => Promise<void>;
  selection: () => Promise<void>;
  // App-specific methods
  addFavorite: () => Promise<void>;
  removeFavorite: () => Promise<void>;
  searchStart: () => Promise<void>;
  searchComplete: () => Promise<void>;
  voiceStart: () => Promise<void>;
  voiceStop: () => Promise<void>;
  purchaseSuccess: () => Promise<void>;
  tabPress: () => Promise<void>;
  // Additional methods needed
  light: () => Promise<void>;
  medium: () => Promise<void>;
  heavy: () => Promise<void>;
  notificationSuccess: () => Promise<void>;
  lightImpact: () => Promise<void>;
  impactLight: () => Promise<void>; // ModernHomeScreen'de kullanılan
}

const HapticContext = createContext<HapticContextType | undefined>(undefined);

export const useHaptics = (): HapticContextType => {
  const context = useContext(HapticContext);
  if (context === undefined) {
    // Return a fallback implementation if no provider is found
    return {
      enabled: true,
      setEnabled: () => {},
      trigger: async () => {},
      buttonPress: async () => {},
      toggle: async () => {},
      success: async () => {},
      error: async () => {},
      warning: async () => {},
      selection: async () => {},
      addFavorite: async () => {},
      removeFavorite: async () => {},
      searchStart: async () => {},
      searchComplete: async () => {},
      voiceStart: async () => {},
      voiceStop: async () => {},
      purchaseSuccess: async () => {},
      tabPress: async () => {},
      // Additional methods
      light: async () => {},
      medium: async () => {},
      heavy: async () => {},
      notificationSuccess: async () => {},
      lightImpact: async () => {},
      impactLight: async () => {},
    };
  }
  return context;
};

interface HapticProviderProps {
  children: ReactNode;
  initialEnabled?: boolean;
}

export const HapticProvider: React.FC<HapticProviderProps> = ({
  children,
  initialEnabled = true,
}) => {
  const setEnabled = useCallback((enabled: boolean) => {
    HapticFeedback.setEnabled(enabled);
  }, []);

  const trigger = useCallback(async (type: HapticFeedbackType) => {
    await HapticFeedback.trigger(type);
  }, []);

  // Convenience methods
  const buttonPress = useCallback(async () => {
    await HapticFeedback.buttonPress();
  }, []);

  const toggle = useCallback(async () => {
    await HapticFeedback.toggle();
  }, []);

  const success = useCallback(async () => {
    await HapticFeedback.success();
  }, []);

  const error = useCallback(async () => {
    await HapticFeedback.error();
  }, []);

  const warning = useCallback(async () => {
    await HapticFeedback.warning();
  }, []);

  const selection = useCallback(async () => {
    await HapticFeedback.selection();
  }, []);

  // App-specific methods
  const addFavorite = useCallback(async () => {
    await HapticFeedback.addFavorite();
  }, []);

  const removeFavorite = useCallback(async () => {
    await HapticFeedback.removeFavorite();
  }, []);

  const searchStart = useCallback(async () => {
    await HapticFeedback.searchStart();
  }, []);

  const searchComplete = useCallback(async () => {
    await HapticFeedback.searchComplete();
  }, []);

  const voiceStart = useCallback(async () => {
    await HapticFeedback.voiceStart();
  }, []);

  const voiceStop = useCallback(async () => {
    await HapticFeedback.voiceStop();
  }, []);

  const purchaseSuccess = useCallback(async () => {
    await HapticFeedback.purchaseSuccess();
  }, []);

  const tabPress = useCallback(async () => {
    await HapticFeedback.tabPress();
  }, []);

  // Set initial enabled state
  React.useEffect(() => {
    HapticFeedback.setEnabled(initialEnabled);
  }, [initialEnabled]);

  // Additional methods
  const light = useCallback(async () => {
    await HapticFeedback.light();
  }, []);

  const medium = useCallback(async () => {
    await HapticFeedback.medium();
  }, []);

  const heavy = useCallback(async () => {
    await HapticFeedback.heavy();
  }, []);

  const notificationSuccess = useCallback(async () => {
    await HapticFeedback.success();
  }, []);

  const lightImpact = useCallback(async () => {
    await HapticFeedback.light();
  }, []);

  const impactLight = useCallback(async () => {
    await HapticFeedback.light();
  }, []);

  const value: HapticContextType = {
    enabled: initialEnabled,
    setEnabled,
    trigger,
    buttonPress,
    toggle,
    success,
    error,
    warning,
    selection,
    addFavorite,
    removeFavorite,
    searchStart,
    searchComplete,
    voiceStart,
    voiceStop,
    purchaseSuccess,
    tabPress,
    // Additional methods
    light,
    medium,
    heavy,
    notificationSuccess,
    lightImpact,
    impactLight,
  };

  return (
    <HapticContext.Provider value={value}>{children}</HapticContext.Provider>
  );
};
