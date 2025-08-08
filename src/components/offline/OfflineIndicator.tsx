/**
 * Offline Indicator Component - React Native
 *
 * Network durumunu gösteren component
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
} from "react-native";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { MobileStorageService } from "../../services/localStorageService";

interface OfflineIndicatorProps {
  style?: any;
  showDetails?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  style,
  showDetails = false,
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [networkType, setNetworkType] = useState<string>("unknown");
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // İlk network durumunu kontrol et
    const checkInitialState = async () => {
      const netInfo = await NetInfo.fetch();
      setIsOnline(Boolean(netInfo.isConnected && netInfo.isInternetReachable));
      setNetworkType(netInfo.type);
    };

    checkInitialState();

    // Network değişikliklerini dinle
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(Boolean(online));
      setNetworkType(state.type);

      // Offline olunca indicator'ı göster
      if (!online) {
        showIndicator();
      } else {
        hideIndicator();
      }
    });

    return () => unsubscribe();
  }, []);

  const showIndicator = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideIndicator = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (showDetails) {
      showNetworkDetails();
    }
  };

  const showNetworkDetails = async () => {
    try {
      const cacheInfo = await getCacheInfo();
      const message = `
Network: ${isOnline ? "Online" : "Offline"}
Type: ${networkType}
Cached Recipes: ${cacheInfo.cachedRecipes}
Storage Used: ${cacheInfo.storageUsed}
      `.trim();

      Alert.alert("Network Status", message);
    } catch (error) {
      Alert.alert(
        "Network Status",
        `Status: ${isOnline ? "Online" : "Offline"}`
      );
    }
  };

  const getCacheInfo = async () => {
    try {
      // Cache bilgilerini al
      const cache = await MobileStorageService.getSearchCache();
      const cacheSize = JSON.stringify(cache).length;

      return {
        cachedRecipes: Object.keys(cache).length,
        storageUsed: `${(cacheSize / 1024).toFixed(1)} KB`,
      };
    } catch (error) {
      return {
        cachedRecipes: 0,
        storageUsed: "0 KB",
      };
    }
  };

  // Online'sa indicator gösterme
  if (isOnline) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, style, { opacity: fadeAnim }]}>
      <TouchableOpacity
        style={styles.indicator}
        onPress={handlePress}
        disabled={!showDetails}
      >
        <View style={styles.content}>
          <Text style={styles.icon}>📱</Text>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Çevrimdışı</Text>
            <Text style={styles.subtitle}>
              Kaydedilmiş tarifler kullanılabilir
            </Text>
          </View>
        </View>

        {showDetails && (
          <Text style={styles.detailsHint}>Detaylar için dokunun</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  indicator: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    fontSize: 20,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
  },
  detailsHint: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 10,
    textAlign: "center",
    marginTop: 4,
  },
});

export default OfflineIndicator;
