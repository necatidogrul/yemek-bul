import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import Modal from 'react-native-modal';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../ui';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { spacing, borderRadius } from '../../theme/design-tokens';

const { width, height } = Dimensions.get('window');

interface AILoadingModalProps {
  visible: boolean;
  onClose: () => void;
  stage: 'analyzing' | 'generating' | 'optimizing' | 'finalizing';
  progress: number; // 0-100
}

const stages = {
  analyzing: {
    title: 'Malzemeler Analiz Ediliyor',
    subtitle: 'AI malzeme kombinasyonlarını inceliyor...',
    icon: 'search',
    color: '#3B82F6',
  },
  generating: {
    title: 'Tarifler Oluşturuluyor',
    subtitle: 'Yaratıcı algoritma çalışıyor...',
    icon: 'restaurant',
    color: '#8B5CF6',
  },
  optimizing: {
    title: 'Tarifler Optimize Ediliyor',
    subtitle: 'En iyi öneriler seçiliyor...',
    icon: 'settings',
    color: '#10B981',
  },
  finalizing: {
    title: 'Son Dokunuşlar',
    subtitle: 'Tarifler hazırlanıyor...',
    icon: 'checkmark-circle',
    color: '#F59E0B',
  },
};

export const AILoadingModal: React.FC<AILoadingModalProps> = ({
  visible,
  onClose,
  stage,
  progress,
}) => {
  const { colors } = useThemedStyles();
  const [spinValue] = useState(new Animated.Value(0));
  const [pulseValue] = useState(new Animated.Value(1));
  const [progressAnim] = useState(new Animated.Value(0));

  const currentStage = stages[stage];

  useEffect(() => {
    if (visible) {
      // Spinning animation
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );

      // Pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      spinAnimation.start();
      pulseAnimation.start();

      return () => {
        spinAnimation.stop();
        pulseAnimation.stop();
      };
    }
  }, [visible]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      isVisible={visible}
      animationIn='fadeIn'
      animationOut='fadeOut'
      backdropOpacity={0.8}
      backdropColor='#000'
      style={styles.modal}
      onBackdropPress={onClose}
      useNativeDriverForBackdrop
    >
      <View
        style={[styles.container, { backgroundColor: colors.surface.primary }]}
      >
        {/* Header */}
        <LinearGradient
          colors={[currentStage.color + '20', currentStage.color + '10']}
          style={styles.header}
        >
          <Animated.View
            style={[
              styles.iconContainer,
              {
                backgroundColor: currentStage.color + '20',
                transform: [
                  { scale: pulseValue },
                  { rotate: stage === 'generating' ? spin : '0deg' },
                ],
              },
            ]}
          >
            <Ionicons
              name={currentStage.icon as any}
              size={32}
              color={currentStage.color}
            />
          </Animated.View>
        </LinearGradient>

        {/* Content */}
        <View style={styles.content}>
          <Text variant='h4' weight='bold' align='center' style={styles.title}>
            {currentStage.title}
          </Text>

          <Text
            variant='body'
            color='secondary'
            align='center'
            style={styles.subtitle}
          >
            {currentStage.subtitle}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBg,
                { backgroundColor: colors.neutral[200] },
              ]}
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: currentStage.color,
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text
              variant='caption'
              color='secondary'
              style={styles.progressText}
            >
              {Math.round(progress)}% tamamlandı
            </Text>
          </View>

          {/* AI Particles Animation */}
          <View style={styles.particlesContainer}>
            {[...Array(6)].map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.particle,
                  {
                    backgroundColor: currentStage.color + '60',
                    opacity: spinValue.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 1, 0.3],
                    }),
                    transform: [
                      {
                        translateY: spinValue.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -20 * (index + 1)],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>

          {/* Fun Facts */}
          <View style={styles.factContainer}>
            <Ionicons name='bulb' size={16} color={colors.warning[500]} />
            <Text variant='caption' color='secondary' style={styles.factText}>
              AI şu anda binlerce tarif veritabanını tarayarak size özel
              öneriler hazırlıyor
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  container: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  header: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  content: {
    padding: spacing[6],
    alignItems: 'center',
  },
  title: {
    marginBottom: spacing[2],
  },
  subtitle: {
    marginBottom: spacing[6],
    lineHeight: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  progressBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
  },
  particlesContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    height: 40,
    marginBottom: spacing[4],
    gap: spacing[1],
  },
  particle: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  factContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  factText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 14,
  },
});
