import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { UserPreferencesService } from '../services/UserPreferencesService';
import { Logger } from '../services/LoggerService';

interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  showSkip?: boolean;
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  currentTour: TourStep | null;
  startTour: (steps: TourStep[]) => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  isFirstTimeUser: boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

interface TourProviderProps {
  children: ReactNode;
}

const HOME_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: 'home-screen',
    title: '🏠 Ana Sayfa',
    description:
      'Burada evdeki malzemelerinizi girip tarif önerileri alabilirsiniz.',
    placement: 'center',
    showSkip: true,
  },
  {
    id: 'ingredient-input',
    target: 'ingredient-input',
    title: '🥕 Malzeme Girişi',
    description:
      'Malzemelerinizi yazın veya mikrofon butonuna basarak sesli giriş yapın.',
    placement: 'bottom',
  },
  {
    id: 'search-button',
    target: 'search-recipes-button',
    title: '🔍 Tarif Arama',
    description:
      'Bu butona basarak girdiğiniz malzemelerle yapılabilecek tarifleri görün.',
    placement: 'top',
  },
  {
    id: 'random-recipe',
    target: 'random-recipe-button',
    title: '🎲 Rastgele Tarif',
    description: 'Karar veremiyorsanız rastgele bir tarif önerisi alın!',
    placement: 'top',
  },
  {
    id: 'bottom-tabs',
    target: 'bottom-tabs',
    title: '📱 Navigasyon',
    description: 'Alt menüden farklı sayfalara geçiş yapabilirsiniz.',
    placement: 'top',
  },
];

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tourSteps, setTourSteps] = useState<TourStep[]>([]);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  useEffect(() => {
    checkFirstTimeUser();
  }, []);

  const checkFirstTimeUser = async () => {
    try {
      const hasCompletedTour =
        await UserPreferencesService.hasCompletedFirstTimeTour();
      setIsFirstTimeUser(!hasCompletedTour);

      // Auto-start tour for first-time users after a short delay
      if (!hasCompletedTour) {
        setTimeout(() => {
          startTour(HOME_TOUR_STEPS);
        }, 1500);
      }
    } catch (error) {
      console.error('Error checking first time user status:', error);
    }
  };

  const startTour = (steps: TourStep[]) => {
    setTourSteps(steps);
    setCurrentStep(0);
    setIsActive(true);
  };

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipTour = async () => {
    setIsActive(false);
    setCurrentStep(0);
    setTourSteps([]);

    if (isFirstTimeUser) {
      try {
        await UserPreferencesService.markFirstTimeTourCompleted();
        setIsFirstTimeUser(false);
      } catch (error) {
        console.error('Error marking tour as completed:', error);
      }
    }
  };

  const completeTour = async () => {
    setIsActive(false);
    setCurrentStep(0);
    setTourSteps([]);

    if (isFirstTimeUser) {
      try {
        await UserPreferencesService.markFirstTimeTourCompleted();
        setIsFirstTimeUser(false);
      } catch (error) {
        console.error('Error marking tour as completed:', error);
      }
    }
  };

  const value: TourContextType = {
    isActive,
    currentStep,
    totalSteps: tourSteps.length,
    currentTour: tourSteps[currentStep] || null,
    startTour,
    nextStep,
    previousStep,
    skipTour,
    completeTour,
    isFirstTimeUser,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};

export const useTour = (): TourContextType => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

export default TourContext;
