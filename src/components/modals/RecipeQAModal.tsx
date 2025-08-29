import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// UI Components
import { Text, Button, Card } from '../ui';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { spacing, borderRadius, shadows } from '../../theme/design-tokens';

// Types
import { Recipe } from '../../types/Recipe';

interface RecipeQAModalProps {
  visible: boolean;
  onClose: () => void;
  recipe: Recipe | null;
  onAskQuestion: (question: string) => Promise<string>;
}

// Önceden tanımlı soru örnekleri
const QUICK_QUESTIONS = [
  {
    id: 1,
    text: 'Bu yemek kaç kişilik?',
    icon: 'people',
  },
  {
    id: 2,
    text: 'Malzemeleri değiştirebilir miyim?',
    icon: 'swap-horizontal',
  },
  {
    id: 3,
    text: 'Pişirme süresini kısaltabilir miyim?',
    icon: 'time',
  },
  {
    id: 4,
    text: 'Bu tarif hangi diyete uygun?',
    icon: 'fitness',
  },
  {
    id: 5,
    text: 'Kalorisi ne kadar?',
    icon: 'speedometer',
  },
  {
    id: 6,
    text: 'Nasıl daha lezzetli yaparım?',
    icon: 'star',
  },
  {
    id: 7,
    text: 'Hangi yan yemeklerle servis edilir?',
    icon: 'restaurant',
  },
  {
    id: 8,
    text: 'Bu yemeği saklama koşulları nedir?',
    icon: 'archive',
  },
];

export const RecipeQAModal: React.FC<RecipeQAModalProps> = ({
  visible,
  onClose,
  recipe,
  onAskQuestion,
}) => {
  const { colors } = useThemedStyles();
  const [customQuestion, setCustomQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [conversation, setConversation] = useState<
    Array<{
      question: string;
      answer: string;
      timestamp: Date;
    }>
  >([]);

  const handleAskQuestion = async (question: string) => {
    if (!question.trim()) {
      Alert.alert('Hata', 'Lütfen bir soru girin.');
      return;
    }

    try {
      setLoading(true);
      setCurrentQuestion(question.trim());

      // Soruyu hemen ekle
      setConversation(prev => [
        ...prev,
        {
          question: question.trim(),
          answer: '',
          timestamp: new Date(),
        },
      ]);

      // Typing indicator göster
      setIsTyping(true);

      const answer = await onAskQuestion(question.trim());

      // Cevabı güncelle
      setConversation(prev =>
        prev.map((item, index) =>
          index === prev.length - 1 ? { ...item, answer } : item
        )
      );

      setCustomQuestion('');
      setCurrentQuestion('');
    } catch (error) {
      // Hatalı soruyu kaldır
      setConversation(prev => prev.slice(0, -1));
      Alert.alert('Hata', 'Soru sorulurken bir hata oluştu.');
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const renderQuickQuestion = (quickQ: (typeof QUICK_QUESTIONS)[0]) => (
    <TouchableOpacity
      key={quickQ.id}
      style={[
        styles.quickQuestionCard,
        {
          backgroundColor: colors.surface.primary,
          borderColor: colors.border.medium,
        },
      ]}
      onPress={() => handleAskQuestion(quickQ.text)}
      disabled={loading}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.quickQuestionIcon,
          { backgroundColor: colors.primary[100] },
        ]}
      >
        <Ionicons
          name={quickQ.icon as any}
          size={16}
          color={colors.primary[600]}
        />
      </View>
      <Text
        variant='bodySmall'
        style={{
          color: colors.text.primary,
          flex: 1,
        }}
      >
        {quickQ.text}
      </Text>
    </TouchableOpacity>
  );

  const renderConversation = () => (
    <View style={styles.conversationContainer}>
      {conversation.map((item, index) => (
        <View key={index} style={styles.conversationItem}>
          {/* User Question */}
          <View
            style={[
              styles.questionBubble,
              { backgroundColor: colors.primary[500] },
            ]}
          >
            <Text variant='bodySmall' style={{ color: 'white' }}>
              {item.question}
            </Text>
          </View>

          {/* AI Answer */}
          <View
            style={[
              styles.answerBubble,
              {
                backgroundColor: colors.surface.secondary,
                borderColor: colors.border.medium,
              },
            ]}
          >
            <View style={styles.aiHeader}>
              <View
                style={[
                  styles.aiIcon,
                  { backgroundColor: colors.success[100] },
                ]}
              >
                <Ionicons
                  name='sparkles'
                  size={12}
                  color={colors.success[600]}
                />
              </View>
              <Text variant='caption' style={{ color: colors.text.secondary }}>
                AI Aşçı
              </Text>
              {!item.answer && isTyping && (
                <View style={styles.typingIndicator}>
                  <View
                    style={[
                      styles.typingDot,
                      { backgroundColor: colors.text.secondary },
                    ]}
                  />
                  <View
                    style={[
                      styles.typingDot,
                      { backgroundColor: colors.text.secondary },
                    ]}
                  />
                  <View
                    style={[
                      styles.typingDot,
                      { backgroundColor: colors.text.secondary },
                    ]}
                  />
                </View>
              )}
            </View>
            {item.answer ? (
              <Text variant='bodySmall' style={{ color: colors.text.primary }}>
                {item.answer}
              </Text>
            ) : isTyping ? (
              <Text
                variant='bodySmall'
                style={{
                  color: colors.text.secondary,
                  fontStyle: 'italic',
                }}
              >
                Cevap hazırlanıyor...
              </Text>
            ) : null}
            {item.answer && (
              <Text
                variant='caption'
                style={{
                  color: colors.text.tertiary,
                  marginTop: spacing[2],
                }}
              >
                {item.timestamp.toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[
          styles.container,
          { backgroundColor: colors.background.primary },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View
          style={[styles.header, { borderBottomColor: colors.border.medium }]}
        >
          <View style={styles.headerContent}>
            <LinearGradient
              colors={[colors.success[500] + '20', colors.success[500] + '10']}
              style={styles.headerIcon}
            >
              <Ionicons
                name='help-circle'
                size={24}
                color={colors.success[500]}
              />
            </LinearGradient>

            <View style={styles.headerText}>
              <Text
                variant='h6'
                weight='bold'
                style={{ color: colors.text.primary }}
              >
                Tarif Hakkında Soru Sor
              </Text>
              <Text variant='caption' style={{ color: colors.text.secondary }}>
                {recipe?.name}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name='close' size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Conversation History */}
          {conversation.length > 0 && (
            <>
              <Text
                variant='h6'
                weight='semibold'
                style={{
                  color: colors.text.primary,
                  marginBottom: spacing[3],
                }}
              >
                Soru & Cevaplar
              </Text>
              {renderConversation()}
              <View style={styles.divider} />
            </>
          )}

          {/* Quick Questions */}
          <Text
            variant='h6'
            weight='semibold'
            style={{
              color: colors.text.primary,
              marginBottom: spacing[3],
            }}
          >
            Hızlı Sorular
          </Text>

          <View style={styles.quickQuestionsGrid}>
            {QUICK_QUESTIONS.map(renderQuickQuestion)}
          </View>

          <View style={styles.divider} />

          {/* Custom Question Input */}
          <Text
            variant='h6'
            weight='semibold'
            style={{
              color: colors.text.primary,
              marginBottom: spacing[3],
            }}
          >
            Özel Soru
          </Text>

          <Card variant='outlined' style={styles.customQuestionCard}>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.text.primary,
                  backgroundColor: colors.surface.primary,
                },
              ]}
              placeholder='Tarif hakkında sormak istediğin soruyu yaz...'
              placeholderTextColor={colors.text.tertiary}
              value={customQuestion}
              onChangeText={setCustomQuestion}
              multiline
              numberOfLines={3}
              textAlignVertical='top'
            />

            <Button
              variant='primary'
              size='sm'
              onPress={() => handleAskQuestion(customQuestion)}
              loading={loading}
              disabled={!customQuestion.trim() || loading}
              style={{ marginTop: spacing[3] }}
            >
              {loading ? 'Soru Soruluyor...' : 'Soru Sor (3 Kredi)'}
            </Button>
          </Card>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  headerText: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  upgradeButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  closeButton: {
    padding: spacing[2],
  },
  creditsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  conversationContainer: {
    gap: spacing[4],
    marginBottom: spacing[4],
  },
  conversationItem: {
    gap: spacing[2],
  },
  questionBubble: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderBottomRightRadius: spacing[1],
  },
  answerBubble: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderBottomLeftRadius: spacing[1],
    borderWidth: 1,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  aiIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickQuestionsGrid: {
    gap: spacing[2],
  },
  quickQuestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[3],
    ...shadows.sm,
  },
  quickQuestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customQuestionCard: {
    padding: spacing[4],
  },
  textInput: {
    borderRadius: borderRadius.md,
    padding: spacing[3],
    fontSize: 16,
    minHeight: 80,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB', // colors.border.primary,
    marginVertical: spacing[6],
  },
  bottomSpacing: {
    height: spacing[8],
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing[2],
    gap: 2,
  },
  typingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
});

export default RecipeQAModal;
