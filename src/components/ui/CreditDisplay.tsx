import React, { useState, useRef } from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useCreditContext } from "../../contexts/CreditContext";

interface CreditDisplayProps {
  onPress?: () => void;
  style?: any;
  compact?: boolean;
}

export const CreditDisplay: React.FC<CreditDisplayProps> = ({
  onPress,
  style,
  compact = false,
}) => {
  // Use actual credit context
  const { userCredits, loading } = useCreditContext();

  const { colors } = useThemedStyles();

  // Debug logging removed for security

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  const themedStyles = StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: compact ? 12 : 16,
      paddingVertical: compact ? 6 : 10,
      borderRadius: compact ? 20 : 25,
      minWidth: compact ? 70 : 90,
    },
    iconContainer: {
      width: compact ? 20 : 24,
      height: compact ? 20 : 24,
      borderRadius: compact ? 10 : 12,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
      marginRight: compact ? 6 : 8,
    },
    creditText: {
      fontSize: compact ? 14 : 16,
      fontWeight: "600",
      color: "white",
    },
    loadingContainer: {
      backgroundColor: "#f5f5f5",
      borderWidth: 1,
      borderColor: "#e0e0e0",
    },
    loadingText: {
      color: "#666",
      fontSize: compact ? 12 : 14,
    },
  });

  if (loading) {
    return (
      <View
        style={[themedStyles.container, themedStyles.loadingContainer, style]}
      >
        <Ionicons
          name="hourglass-outline"
          size={compact ? 16 : 20}
          color="#666"
        />
        <Text style={themedStyles.loadingText}>...</Text>
      </View>
    );
  }

  if (!userCredits) {
    return (
      <>
        <TouchableOpacity
          style={[
            themedStyles.container,
            { backgroundColor: "#FF6B6B" },
            style,
          ]}
          onPress={handlePress}
        >
          <Ionicons
            name="alert-circle"
            size={compact ? 16 : 20}
            color="white"
          />
          <Text style={themedStyles.creditText}>Hata</Text>
        </TouchableOpacity>
      </>
    );
  }

  const gradientColors =
    userCredits.remainingCredits > 0
      ? ["#4CAF50", "#45a049"] // Yeşil - krediler var
      : ["#FF6B6B", "#E53E3E"]; // Kırmızı - krediler bitti

  return (
    <>
      <TouchableOpacity onPress={handlePress} style={style}>
        <LinearGradient
          colors={gradientColors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={themedStyles.container}
        >
          <View style={themedStyles.iconContainer}>
            <Ionicons
              name={
                userCredits.remainingCredits > 0 ? "diamond" : "diamond-outline"
              }
              size={compact ? 12 : 14}
              color="white"
            />
          </View>
          <Text style={themedStyles.creditText}>
            {userCredits.remainingCredits}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </>
  );
};

export default CreditDisplay;
