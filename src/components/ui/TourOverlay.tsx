import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTour } from '../../contexts/TourContext';
import { Button, Card, Text } from './index';
import { colors, spacing, borderRadius } from '../../theme/design-tokens';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const TourOverlay: React.FC = () => {
  const { 
    isActive, 
    currentTour, 
    currentStep, 
    totalSteps, 
    nextStep, 
    previousStep, 
    skipTour,
    completeTour 
  } = useTour();

  if (!isActive || !currentTour) {
    return null;
  }

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const getTooltipPosition = () => {
    // This is a simplified positioning system
    // In a real app, you'd want to measure actual component positions
    const baseStyle = {
      position: 'absolute' as const,
      maxWidth: screenWidth - 40,
      minWidth: 280,
    };

    switch (currentTour.placement) {
      case 'top':
        return {
          ...baseStyle,
          top: screenHeight * 0.15,
          left: 20,
          right: 20,
        };
      case 'bottom':
        return {
          ...baseStyle,
          bottom: screenHeight * 0.25,
          left: 20,
          right: 20,
        };
      case 'center':
        return {
          ...baseStyle,
          top: screenHeight * 0.4,
          left: 20,
          right: 20,
        };
      default:
        return {
          ...baseStyle,
          top: screenHeight * 0.3,
          left: 20,
          right: 20,
        };
    }
  };

  return (
    <Modal
      visible={isActive}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Background overlay */}
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* Tooltip */}
        <View style={[styles.tooltip, getTooltipPosition()]}>
          <Card variant="elevated" size="lg" style={styles.tooltipCard}>
            {/* Header */}
            <View style={styles.tooltipHeader}>
              <Text variant="h3" weight="bold" color="primary">
                {currentTour.title}
              </Text>
              
              {currentTour.showSkip && (
                <TouchableOpacity onPress={skipTour} style={styles.skipButton}>
                  <Ionicons name="close" size={20} color={colors.neutral[500]} />
                </TouchableOpacity>
              )}
            </View>

            {/* Content */}
            <View style={styles.tooltipContent}>
              <Text variant="body" color="secondary" style={styles.description}>
                {currentTour.description}
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.tooltipFooter}>
              {/* Progress indicator */}
              <View style={styles.progressContainer}>
                <View style={styles.progressDots}>
                  {Array.from({ length: totalSteps }).map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.progressDot,
                        {
                          backgroundColor: index === currentStep 
                            ? colors.primary[500] 
                            : colors.neutral[300],
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text variant="caption" color="secondary">
                  {currentStep + 1} / {totalSteps}
                </Text>
              </View>

              {/* Navigation buttons */}
              <View style={styles.buttonContainer}>
                {!isFirstStep && (
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={previousStep}
                    leftIcon={<Ionicons name="arrow-back" size={16} />}
                  >
                    Geri
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  onPress={isLastStep ? completeTour : nextStep}
                  rightIcon={
                    isLastStep ? (
                      <Ionicons name="checkmark" size={16} />
                    ) : (
                      <Ionicons name="arrow-forward" size={16} />
                    )
                  }
                >
                  {isLastStep ? 'Tamamla' : 'Devam'}
                </Button>
              </View>
            </View>
          </Card>

          {/* Pointer arrow */}
          {currentTour.placement !== 'center' && (
            <View style={[
              styles.arrow, 
              currentTour.placement === 'top' ? styles.arrowDown : styles.arrowUp
            ]} />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  tooltip: {
    zIndex: 1000,
  },
  tooltipCard: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    elevation: 8,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  skipButton: {
    padding: spacing[1],
    marginTop: -spacing[1],
    marginRight: -spacing[1],
  },
  tooltipContent: {
    marginBottom: spacing[4],
  },
  description: {
    lineHeight: 22,
  },
  tooltipFooter: {
    gap: spacing[3],
  },
  progressContainer: {
    alignItems: 'center',
    gap: spacing[2],
  },
  progressDots: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  arrow: {
    position: 'absolute',
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowUp: {
    bottom: -8,
    borderTopWidth: 8,
    borderTopColor: colors.neutral[0],
  },
  arrowDown: {
    top: -8,
    borderBottomWidth: 8,
    borderBottomColor: colors.neutral[0],
  },
});

export default TourOverlay;