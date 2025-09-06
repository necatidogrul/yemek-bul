import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { spacing, borderRadius, typography } from '../../theme/design-tokens';

interface LegalDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({
  visible,
  onClose,
  title,
  content,
}) => {
  const { colors, isDark } = useThemedStyles();

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background.primary },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface.primary,
              borderBottomColor: colors.border.light,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name='close' size={28} color={colors.text.primary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            {title}
          </Text>

          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <Text style={[styles.content, { color: colors.text.primary }]}>
            {content}
          </Text>
        </ScrollView>

        {/* Bottom Close Button */}
        <View
          style={[
            styles.bottomContainer,
            {
              backgroundColor: colors.surface.primary,
              borderTopColor: colors.border.light,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.bottomButton,
              { backgroundColor: colors.primary[500] },
            ]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.bottomButtonText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
  },
  content: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    letterSpacing: typography.letterSpacing.normal,
  },
  bottomContainer: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  bottomButton: {
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  bottomButtonText: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
});
