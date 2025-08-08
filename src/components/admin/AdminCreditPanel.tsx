import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCreditContext } from '../../contexts/CreditContext';
import { canShowAdminFeatures, debugLog } from '../../config/environment';
import { useThemedStyles } from "../../hooks/useThemedStyles";

interface AdminCreditPanelProps {
  visible: boolean;
  onClose: () => void;
}

export const AdminCreditPanel: React.FC<AdminCreditPanelProps> = ({
  visible,
  onClose,
}) => {
  const [creditAmount, setCreditAmount] = useState("100");
  const [isLoading, setIsLoading] = useState(false);
  const { colors } = useThemedStyles();
  const { userCredits, addCredits } = useCreditContext();

  // Security check - bu panel sadece development'da çalışmalı
  if (!canShowAdminFeatures()) {
    debugLog('🚨 Admin panel blocked - not in development mode');
    return null;
  }

  const handleAddCredits = async () => {
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Hata", "Geçerli bir kredi miktarı girin");
      return;
    }

    setIsLoading(true);
    try {
      await addCredits(amount, `[DEV] Admin panel - ${amount} kredi eklendi`);
      debugLog(`🔧 Admin: Added ${amount} credits`);
      Alert.alert("Başarılı", `${amount} kredi eklendi!`);
      setCreditAmount("100"); // Reset form
    } catch (error) {
      debugLog('❌ Admin credit add failed:', error);
      Alert.alert("Hata", "Kredi eklenirken hata oluştu");
    }
    setIsLoading(false);
  };

  const quickAddCredits = async (amount: number) => {
    setIsLoading(true);
    try {
      await addCredits(amount, `[DEV] Admin panel - Hızlı ekleme: ${amount} kredi`);
      debugLog(`🔧 Admin: Quick added ${amount} credits`);
      Alert.alert("Başarılı", `${amount} kredi eklendi!`);
    } catch (error) {
      debugLog('❌ Admin quick credit add failed:', error);
      Alert.alert("Hata", "Kredi eklenirken hata oluştu");
    }
    setIsLoading(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            { backgroundColor: colors.background?.primary || "#fff" },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Ionicons name="shield-checkmark" size={24} color="#FF6B6B" />
              <Text
                style={[
                  styles.title,
                  { color: colors.text?.primary || "#000" },
                ]}
              >
                👑 Admin Panel
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons
                name="close"
                size={24}
                color={colors.text?.secondary || "#666"}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Current Credits */}
            <View
              style={[
                styles.section,
                { backgroundColor: colors.surface?.primary || "#f5f5f5" },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text?.primary || "#000" },
                ]}
              >
                💎 Mevcut Kredi Durumu
              </Text>
              <View style={styles.creditInfo}>
                <Text
                  style={[
                    styles.creditText,
                    { color: colors.text?.primary || "#000" },
                  ]}
                >
                  Kalan: {userCredits?.remainingCredits || 0}
                </Text>
                <Text
                  style={[
                    styles.creditText,
                    { color: colors.text?.primary || "#000" },
                  ]}
                >
                  Toplam: {userCredits?.totalCredits || 0}
                </Text>
                <Text
                  style={[
                    styles.creditText,
                    { color: colors.text?.primary || "#000" },
                  ]}
                >
                  Kullanılan: {userCredits?.usedCredits || 0}
                </Text>
              </View>
            </View>

            {/* Quick Add Buttons */}
            <View
              style={[
                styles.section,
                { backgroundColor: colors.surface?.primary || "#f5f5f5" },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text?.primary || "#000" },
                ]}
              >
                ⚡ Hızlı Kredi Ekleme
              </Text>
              <View style={styles.quickButtons}>
                {[10, 50, 100, 500, 1000].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[styles.quickButton, { backgroundColor: "#4CAF50" }]}
                    onPress={() => quickAddCredits(amount)}
                    disabled={isLoading}
                  >
                    <Text style={styles.quickButtonText}>+{amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Amount */}
            <View
              style={[
                styles.section,
                { backgroundColor: colors.surface?.primary || "#f5f5f5" },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.text?.primary || "#000" },
                ]}
              >
                🎯 Özel Miktar
              </Text>
              <View style={styles.customAmountContainer}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: colors.border?.medium || "#ddd",
                      color: colors.text?.primary || "#000",
                    },
                  ]}
                  value={creditAmount}
                  onChangeText={setCreditAmount}
                  placeholder="Kredi miktarı"
                  placeholderTextColor={colors.text?.secondary || "#999"}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[
                    styles.addButton,
                    {
                      backgroundColor: isLoading ? "#ccc" : "#2196F3",
                    },
                  ]}
                  onPress={handleAddCredits}
                  disabled={isLoading}
                >
                  <Text style={styles.addButtonText}>
                    {isLoading ? "⏳" : "➕ Ekle"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Warning */}
            <View style={styles.warning}>
              <Text style={styles.warningText}>
                ⚠️ Bu panel sadece development ortamında çalışır
              </Text>
              <Text style={[styles.warningText, { fontSize: 10, marginTop: 4 }]}>
                Production build'de bu panel tamamen devre dışıdır
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: 16,
    paddingVertical: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 5,
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  creditInfo: {
    gap: 8,
  },
  creditText: {
    fontSize: 14,
  },
  quickButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  quickButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  customAmountContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 80,
  },
  addButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  warning: {
    alignItems: "center",
    marginTop: 10,
  },
  warningText: {
    color: "#FF6B6B",
    fontSize: 12,
    textAlign: "center",
  },
});

export default AdminCreditPanel;
