import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import Modal from 'react-native-modal';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../ui';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { spacing, borderRadius } from '../../theme/design-tokens';
import { useTranslation } from 'react-i18next';

const { width, height } = Dimensions.get('window');

interface AILoadingModalProps {
  visible: boolean;
  onClose: () => void;
  stage: 'analyzing' | 'generating' | 'optimizing' | 'finalizing';
  progress: number; // 0-100
}

const stageIcons = {
  analyzing: { icon: 'search', color: '#3B82F6' },
  generating: { icon: 'restaurant', color: '#8B5CF6' },
  optimizing: { icon: 'settings', color: '#10B981' },
  finalizing: { icon: 'checkmark-circle', color: '#F59E0B' },
};

export const AILoadingModal: React.FC<AILoadingModalProps> = ({
  visible,
  onClose,
  stage,
  progress,
}) => {
  const { colors } = useThemedStyles();
  const { t } = useTranslation();
  const [spinValue] = useState(new Animated.Value(0));
  const [pulseValue] = useState(new Animated.Value(1));
  const [progressAnim] = useState(new Animated.Value(0));
  const [shimmerValue] = useState(new Animated.Value(0));
  const [particleAnimations] = useState(
    [...Array(6)].map(() => new Animated.Value(0))
  );

  const currentStageIcon = stageIcons[stage];
  const currentStageText = {
    title: t(`aiLoadingModal.stages.${stage}.title`),
    subtitle: t(`aiLoadingModal.stages.${stage}.subtitle`),
  };

  useEffect(() => {
    if (visible) {
      // Icon rotation - only for generating stage
      if (stage === 'generating') {
        const spinAnimation = Animated.loop(
          Animated.timing(spinValue, {
            toValue: 1,
            duration: 3000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );
        spinAnimation.start();
        return () => spinAnimation.stop();
      }

      // Gentle pulse for icon
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [visible, stage]);

  useEffect(() => {
    if (visible) {
      // Shimmer effect on progress bar
      const shimmerAnimation = Animated.loop(
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      shimmerAnimation.start();
      return () => shimmerAnimation.stop();
    }
  }, [visible]);

  useEffect(() => {
    // Smooth progress animation
    Animated.spring(progressAnim, {
      toValue: progress,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Particle animations
  useEffect(() => {
    if (visible) {
      const staggeredAnimations = particleAnimations.map((anim, index) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(index * 150),
            Animated.timing(anim, {
              toValue: 1,
              duration: 1500,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 1500,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
          ])
        );
      });

      staggeredAnimations.forEach(anim => anim.start());

      return () => {
        staggeredAnimations.forEach(anim => anim.stop());
      };
    }
  }, [visible]);

  return (
    <Modal
      isVisible={visible}
      animationIn='fadeIn'
      animationOut='fadeOut'
      backdropOpacity={0.9}
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
          colors={[currentStageIcon.color + '15', 'transparent']}
          style={styles.header}
        >
          <Animated.View
            style={[
              styles.iconContainer,
              {
                backgroundColor: colors.surface.primary,
                borderColor: currentStageIcon.color,
                transform: [
                  { scale: pulseValue },
                  { rotate: stage === 'generating' ? spin : '0deg' },
                ],
              },
            ]}
          >
            <Ionicons
              name={currentStageIcon.icon as any}
              size={36}
              color={currentStageIcon.color}
            />
          </Animated.View>
        </LinearGradient>

        {/* Content */}
        <View style={styles.content}>
          <Text variant='h4' weight='bold' align='center' style={styles.title}>
            {currentStageText.title}
          </Text>

          <Text
            variant='body'
            color='secondary'
            align='center'
            style={styles.subtitle}
          >
            {currentStageText.subtitle}
          </Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBg,
                {
                  backgroundColor: colors.neutral[100],
                  borderWidth: 1,
                  borderColor: colors.neutral[200],
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: currentStageIcon.color,
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              >
                <Animated.View
                  style={{
                    ...StyleSheet.absoluteFillObject,
                    opacity: shimmerValue.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.3, 0, 0.3],
                    }),
                    backgroundColor: 'rgba(255,255,255,0.4)',
                  }}
                />
              </Animated.View>
            </View>
            <View style={styles.progressInfo}>
              <Text
                variant='h6'
                weight='bold'
                style={{ ...styles.progressPercent, color: currentStageIcon.color }}
              >
                {Math.round(progress)}%
              </Text>
              <Text
                variant='caption'
                color='secondary'
                style={styles.progressText}
              >
                {t('aiLoadingModal.completed')}
              </Text>
            </View>
          </View>

          {/* AI Particles Animation */}
          <View style={styles.particlesContainer}>
            {particleAnimations.map((anim, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.particle,
                  {
                    backgroundColor: currentStageIcon.color,
                    width: 3 + (index % 2),
                    height: 3 + (index % 2),
                    opacity: anim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 1, 0],
                    }),
                    transform: [
                      {
                        translateY: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [20, -30],
                        }),
                      },
                      {
                        translateX: anim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [
                            0,
                            (index - 2.5) * 8,
                            (index - 2.5) * 15,
                          ],
                        }),
                      },
                      {
                        scale: anim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.5, 1, 0.3],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}
          </View>

          {/* Fun Facts */}
          <Animated.View
            style={[
              styles.factContainer,
              {
                opacity: pulseValue.interpolate({
                  inputRange: [1, 1.05, 1.1],
                  outputRange: [0.8, 1, 0.8],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={[colors.warning[500] + '10', colors.warning[500] + '05']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Ionicons name='sparkles' size={14} color={colors.warning[500]} />
            <Text variant='caption' color='secondary' style={styles.factText}>
              {t(`aiLoadingModal.facts.${stage}`)}
            </Text>
          </Animated.View>
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
    borderWidth: 2.5,
    borderStyle: 'solid',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
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
    minHeight: 40,
  },
  progressBg: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing[3],
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[2],
    height: 20,
  },
  progressPercent: {
    fontSize: 18,
    lineHeight: 20,
  },
  progressText: {
    fontSize: 13,
    lineHeight: 20,
  },
  particlesContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -50,
    marginTop: -20,
    width: 100,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    borderRadius: 10,
  },
  factContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
    marginTop: spacing[2],
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  factText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
});
