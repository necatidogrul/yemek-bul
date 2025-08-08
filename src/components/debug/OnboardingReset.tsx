import React from 'react';
import { Alert } from 'react-native';
import { UserPreferencesService } from '../../services/UserPreferencesService';
import { Button } from '../ui';
import { Logger } from '../../services/LoggerService';

interface OnboardingResetProps {
  onReset?: () => void;
}

const OnboardingReset: React.FC<OnboardingResetProps> = ({ onReset }) => {
  const handleReset = async () => {
    Alert.alert(
      'Onboarding Sıfırla',
      'Tüm kullanıcı tercihleri ve onboarding durumu silinecek. Emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sıfırla',
          style: 'destructive',
          onPress: async () => {
            try {
              await UserPreferencesService.resetAllPreferences();
              Alert.alert(
                'Başarılı',
                'Onboarding durumu sıfırlandı. Uygulamayı yeniden başlatın.',
                [
                  {
                    text: 'Tamam',
                    onPress: onReset,
                  },
                ]
              );
            } catch (error) {
              console.error('Reset error:', error);
              Alert.alert('Hata', 'Sıfırlama işlemi başarısız oldu.');
            }
          },
        },
      ]
    );
  };

  // Only show in development mode
  if (__DEV__) {
    return (
      <Button
        variant="outline"
        size="sm"
        onPress={handleReset}
        style={{ marginTop: 20 }}
      >
        🔄 Debug: Onboarding Sıfırla
      </Button>
    );
  }

  return null;
};

export default OnboardingReset;