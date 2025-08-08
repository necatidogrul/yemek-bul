import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from "react-native";
import { Logger } from "../services/LoggerService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StackNavigationProp } from "@react-navigation/stack";

// Services & Types
import { HistoryService } from "../services/historyService";
import {
  AIRequestHistory,
  HistoryStats,
  HistoryFilter,
} from "../types/History";

// UI Components
import { Text, Card, Button } from "../components/ui";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { spacing, borderRadius, shadows } from "../theme/design-tokens";

const { width: screenWidth } = Dimensions.get("window");

interface HistoryScreenProps {
  navigation: StackNavigationProp<any, "History">;
}

type ViewMode = "list" | "stats";

const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const [history, setHistory] = useState<AIRequestHistory[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filter, setFilter] = useState<HistoryFilter>({ dateRange: "all" });
  const [popularCombinations, setPopularCombinations] = useState<
    Array<{
      ingredients: string[];
      count: number;
      successRate: number;
    }>
  >([]);

  const { colors } = useThemedStyles();

  useEffect(() => {
    loadHistoryData();
  }, [filter]);

  const loadHistoryData = async () => {
    try {
      setIsLoading(true);
      const [historyData, statsData, popularData] = await Promise.all([
        HistoryService.getHistory(filter),
        HistoryService.getStats(),
        HistoryService.getPopularCombinations(5),
      ]);

      setHistory(historyData);
      setStats(statsData);
      setPopularCombinations(popularData);
    } catch (error) {
      console.error("History loading error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewResults = useCallback(
    (item: AIRequestHistory) => {
      if (item.success && item.results.recipes.length > 0) {
        // Sonuçları direkt göster
        navigation.navigate("RecipeResults", {
          ingredients: item.ingredients,
          aiRecipes: item.results.recipes,
          fromHistory: true,
        });
      } else {
        // Başarısız aramalar için ana sayfaya yönlendir
        navigation.getParent()?.navigate("HomeTab", {
          screen: "HomeMain",
          params: { prefillIngredients: item.ingredients },
        });
      }
    },
    [navigation]
  );

  const handleDeleteItem = useCallback(async (id: string) => {
    Alert.alert(
      "Geçmişi Sil",
      "Bu arama geçmişini silmek istediğinizden emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            await HistoryService.deleteRequest(id);
            loadHistoryData();
          },
        },
      ]
    );
  }, []);

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      "Tüm Geçmişi Sil",
      "Tüm arama geçmişinizi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Tümünü Sil",
          style: "destructive",
          onPress: async () => {
            await HistoryService.clearHistory();
            loadHistoryData();
          },
        },
      ]
    );
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Bugün";
    if (diffDays === 2) return "Dün";
    if (diffDays <= 7) return `${diffDays - 1} gün önce`;

    return date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const renderHistoryItem = ({ item }: { item: AIRequestHistory }) => (
    <Card variant="elevated" size="lg" style={styles.historyItem}>
      <View style={styles.historyItemHeader}>
        <View style={styles.historyItemInfo}>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: item.success
                    ? colors.success[500]
                    : colors.error[500],
                },
              ]}
            />
            <Text variant="labelSmall" color="secondary">
              {formatDate(item.timestamp)}
            </Text>
          </View>
          <Text variant="bodyLarge" weight="semibold" color="primary">
            {item.results.count} tarif {item.success ? "bulundu" : "bulunamadı"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteItem(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error[500]} />
        </TouchableOpacity>
      </View>

      <View style={styles.ingredientsList}>
        {item.ingredients.map((ingredient, index) => (
          <View
            key={index}
            style={[
              styles.ingredientChip,
              { backgroundColor: colors.primary[50] },
            ]}
          >
            <Text
              variant="bodySmall"
              weight="medium"
              style={{ color: colors.primary[700] }}
            >
              {ingredient}
            </Text>
          </View>
        ))}
      </View>

      {item.success && item.results.recipes.length > 0 && (
        <View style={styles.recipesPreview}>
          <Text
            variant="bodySmall"
            color="secondary"
            style={styles.recipesTitle}
          >
            Bulunan tarifler:
          </Text>
          <View style={styles.recipesList}>
            {item.results.recipes.slice(0, 3).map((recipe, index) => (
              <Text key={recipe.id} variant="labelSmall" color="primary">
                • {recipe.name}
              </Text>
            ))}
            {item.results.recipes.length > 3 && (
              <Text variant="labelSmall" color="secondary">
                +{item.results.recipes.length - 3} daha fazla
              </Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.historyItemActions}>
        <Button
          variant={item.success ? "primary" : "outline"}
          size="sm"
          onPress={() => handleViewResults(item)}
          leftIcon={
            <Ionicons name={item.success ? "eye" : "refresh"} size={16} />
          }
          style={styles.repeatButton}
        >
          {item.success ? "Sonuçları Gör" : "Tekrar Dene"}
        </Button>

        {item.preferences && (
          <View style={styles.preferencesInfo}>
            {item.preferences.difficulty && (
              <View style={styles.preferenceTag}>
                <Ionicons
                  name="bar-chart"
                  size={12}
                  color={colors.neutral[500]}
                />
                <Text variant="labelSmall" color="secondary">
                  {item.preferences.difficulty}
                </Text>
              </View>
            )}
            {item.preferences.cookingTime && (
              <View style={styles.preferenceTag}>
                <Ionicons name="time" size={12} color={colors.neutral[500]} />
                <Text variant="labelSmall" color="secondary">
                  {item.preferences.cookingTime}dk
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </Card>
  );

  const renderStatsView = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <Card variant="elevated" size="lg" style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: colors.primary[100] },
              ]}
            >
              <Ionicons name="search" size={24} color={colors.primary[600]} />
            </View>
            <Text variant="headlineMedium" weight="bold" color="primary">
              {stats.totalRequests}
            </Text>
            <Text variant="bodySmall" color="secondary" align="center">
              Toplam Arama
            </Text>
          </Card>

          <Card variant="elevated" size="lg" style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: colors.success[100] },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={colors.success[600]}
              />
            </View>
            <Text variant="headlineMedium" weight="bold" color="success">
              {stats.successfulRequests}
            </Text>
            <Text variant="bodySmall" color="secondary" align="center">
              Başarılı Arama
            </Text>
          </Card>

          <Card variant="elevated" size="lg" style={styles.statCard}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: colors.warning[100] },
              ]}
            >
              <Ionicons
                name="restaurant"
                size={24}
                color={colors.warning[600]}
              />
            </View>
            <Text variant="headlineMedium" weight="bold" color="warning">
              {stats.totalRecipesGenerated}
            </Text>
            <Text variant="bodySmall" color="secondary" align="center">
              Tarif Bulundu
            </Text>
          </Card>
        </View>

        {/* Most Used Ingredients */}
        {stats.mostUsedIngredients.length > 0 && (
          <Card variant="elevated" size="lg" style={styles.statsSection}>
            <View style={styles.statsSectionHeader}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: colors.primary[100] },
                ]}
              >
                <Ionicons name="star" size={20} color={colors.primary[600]} />
              </View>
              <Text variant="headlineSmall" weight="bold" color="primary">
                En Çok Kullanılan Malzemeler
              </Text>
            </View>

            <View style={styles.ingredientsStats}>
              {stats.mostUsedIngredients.slice(0, 5).map((item, index) => (
                <View key={item.ingredient} style={styles.ingredientStat}>
                  <View style={styles.ingredientStatInfo}>
                    <Text variant="bodyMedium" weight="medium" color="primary">
                      {item.ingredient}
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      {item.count} kez kullanıldı
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.ingredientStatBadge,
                      { backgroundColor: colors.primary[500] },
                    ]}
                  >
                    <Text
                      variant="labelSmall"
                      weight="bold"
                      style={{ color: "white" }}
                    >
                      {item.count}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Popular Combinations */}
        {popularCombinations.length > 0 && (
          <Card variant="elevated" size="lg" style={styles.statsSection}>
            <View style={styles.statsSectionHeader}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: colors.success[100] },
                ]}
              >
                <Ionicons
                  name="trending-up"
                  size={20}
                  color={colors.success[600]}
                />
              </View>
              <Text variant="headlineSmall" weight="bold" color="primary">
                Popüler Kombinasyonlar
              </Text>
            </View>

            <View style={styles.combinationsStats}>
              {popularCombinations.map((combo, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.combinationItem}
                  onPress={() =>
                    navigation.getParent()?.navigate("HomeTab", {
                      screen: "HomeMain",
                      params: { prefillIngredients: combo.ingredients },
                    })
                  }
                >
                  <View style={styles.combinationIngredients}>
                    {combo.ingredients.map((ingredient, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.miniChip,
                          { backgroundColor: colors.success[50] },
                        ]}
                      >
                        <Text
                          variant="labelSmall"
                          style={{ color: colors.success[700] }}
                        >
                          {ingredient}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.combinationStats}>
                    <Text variant="bodySmall" color="secondary">
                      {combo.count} kez • %{Math.round(combo.successRate * 100)}{" "}
                      başarı
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.neutral[400]}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}
      </View>
    );
  };

  const renderFilterBar = () => (
    <Card variant="default" size="md" style={styles.filterBar}>
      <View style={styles.filterContent}>
        <Text variant="bodySmall" weight="medium" color="secondary">
          Filtrele:
        </Text>
        <View style={styles.filterButtons}>
          {[
            { key: "all", label: "Tümü" },
            { key: "today", label: "Bugün" },
            { key: "week", label: "Bu Hafta" },
            { key: "month", label: "Bu Ay" },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.filterButton,
                filter.dateRange === item.key && styles.filterButtonActive,
                {
                  backgroundColor:
                    filter.dateRange === item.key
                      ? colors.primary[500]
                      : colors.neutral[100],
                },
              ]}
              onPress={() =>
                setFilter({ ...filter, dateRange: item.key as any })
              }
            >
              <Text
                variant="labelSmall"
                weight="medium"
                style={{
                  color:
                    filter.dateRange === item.key
                      ? "white"
                      : colors.neutral[600],
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Card>
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background.primary },
        ]}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.primary[600]}
        />

        {/* Header for loading state */}
        <LinearGradient
          colors={[
            colors.primary[500],
            colors.primary[600],
            colors.primary[700],
          ]}
          style={styles.heroHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <SafeAreaView>
            <View style={styles.headerContainer}>
              <View style={styles.headerLeft}>
                <View style={styles.heroIcon}>
                  <Ionicons name="time" size={24} color="white" />
                </View>
                <View>
                  <Text
                    variant="headlineMedium"
                    weight="bold"
                    style={{ color: "white" }}
                  >
                    Arama Geçmişi
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: "rgba(255,255,255,0.8)" }}
                  >
                    Yükleniyor...
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={[colors.primary[100], colors.primary[200]]}
            style={styles.loadingIcon}
          >
            <Ionicons name="time" size={32} color={colors.primary[500]} />
          </LinearGradient>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text
            variant="headlineSmall"
            weight="semibold"
            color="primary"
            align="center"
          >
            Geçmiş Yükleniyor...
          </Text>
          <Text
            variant="bodyMedium"
            color="secondary"
            align="center"
            style={styles.loadingSubtext}
          >
            Arama geçmişiniz hazırlanıyor
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.primary }]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primary[600]}
      />

      {/* Modern Header with Back Button */}
      <LinearGradient
        colors={[colors.primary[500], colors.primary[600], colors.primary[700]]}
        style={styles.heroHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView>
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <View style={styles.heroIcon}>
                <Ionicons name="time" size={24} color="white" />
              </View>
              <View>
                <Text
                  variant="headlineMedium"
                  weight="bold"
                  style={{ color: "white" }}
                >
                  Arama Geçmişi
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                >
                  {stats ? `${stats.totalRequests} arama` : "Geçmiş aramaların"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* View Mode Toggle */}
        <Card variant="elevated" size="lg" style={styles.controlsCard}>
          <View style={styles.viewModeContainer}>
            <View style={styles.viewModeToggle}>
              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  viewMode === "list" && styles.viewModeButtonActive,
                  {
                    backgroundColor:
                      viewMode === "list"
                        ? colors.primary[500]
                        : colors.neutral[100],
                  },
                ]}
                onPress={() => setViewMode("list")}
              >
                <Ionicons
                  name="list"
                  size={16}
                  color={viewMode === "list" ? "white" : colors.neutral[600]}
                />
                <Text
                  variant="bodySmall"
                  weight="medium"
                  style={{
                    color: viewMode === "list" ? "white" : colors.neutral[600],
                    marginLeft: spacing[1],
                  }}
                >
                  Liste
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  viewMode === "stats" && styles.viewModeButtonActive,
                  {
                    backgroundColor:
                      viewMode === "stats"
                        ? colors.primary[500]
                        : colors.neutral[100],
                  },
                ]}
                onPress={() => setViewMode("stats")}
              >
                <Ionicons
                  name="stats-chart"
                  size={16}
                  color={viewMode === "stats" ? "white" : colors.neutral[600]}
                />
                <Text
                  variant="bodySmall"
                  weight="medium"
                  style={{
                    color: viewMode === "stats" ? "white" : colors.neutral[600],
                    marginLeft: spacing[1],
                  }}
                >
                  İstatistik
                </Text>
              </TouchableOpacity>
            </View>

            {history.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.clearButton,
                  { backgroundColor: colors.error[100] },
                ]}
                onPress={handleClearHistory}
              >
                <Ionicons name="trash" size={16} color={colors.error[500]} />
                <Text
                  variant="labelSmall"
                  weight="medium"
                  style={{ color: colors.error[500] }}
                >
                  Temizle
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {viewMode === "list" ? (
          <>
            {renderFilterBar()}

            {history.length === 0 ? (
              <View style={styles.emptyContainer}>
                <LinearGradient
                  colors={[colors.primary[100], colors.primary[200]]}
                  style={styles.emptyIcon}
                >
                  <Ionicons
                    name="time-outline"
                    size={48}
                    color={colors.primary[400]}
                  />
                </LinearGradient>
                <Text
                  variant="headlineMedium"
                  weight="bold"
                  color="primary"
                  align="center"
                >
                  Henüz Arama Geçmişi Yok
                </Text>
                <Text
                  variant="bodyMedium"
                  color="secondary"
                  align="center"
                  style={styles.emptyDescription}
                >
                  AI ile tarif aramaya başladığınızda geçmişiniz burada
                  görünecek
                </Text>
                <Button
                  variant="primary"
                  size="lg"
                  onPress={() => navigation.getParent()?.navigate("HomeTab")}
                  leftIcon={<Ionicons name="search" size={20} />}
                  style={styles.startSearchButton}
                >
                  İlk Aramayı Yap
                </Button>
              </View>
            ) : (
              <View style={styles.historyList}>
                {history.map((item) => (
                  <View key={item.id} style={{ marginBottom: spacing[4] }}>
                    {renderHistoryItem({ item })}
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>{renderStatsView()}</>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Hero Header
  heroHeader: {
    paddingBottom: spacing[4],
    marginBottom: spacing[4],
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing[3],
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Controls
  controlsCard: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  viewModeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  viewModeToggle: {
    flexDirection: "row",
    borderRadius: borderRadius.lg,
    padding: spacing[1],
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  viewModeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    marginHorizontal: spacing[0.5],
  },
  viewModeButtonActive: {
    ...shadows.sm,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    gap: spacing[1],
  },

  // Filter Bar
  filterBar: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  filterContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  filterButtons: {
    flexDirection: "row",
    gap: spacing[2],
    flex: 1,
  },
  filterButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    flex: 1,
    alignItems: "center",
  },
  filterButtonActive: {
    ...shadows.sm,
  },

  // History Items
  scrollContent: {
    paddingBottom: spacing[8],
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  historyList: {
    paddingHorizontal: spacing[4],
    gap: spacing[4],
  },
  historyItem: {
    marginBottom: spacing[0],
  },
  historyItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing[3],
  },
  historyItemInfo: {
    flex: 1,
    gap: spacing[1],
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deleteButton: {
    padding: spacing[2],
    borderRadius: borderRadius.md,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  ingredientsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  ingredientChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
  },
  recipesPreview: {
    marginBottom: spacing[3],
    padding: spacing[3],
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: borderRadius.md,
  },
  recipesTitle: {
    marginBottom: spacing[2],
  },
  recipesList: {
    gap: spacing[1],
  },
  historyItemActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  repeatButton: {
    paddingHorizontal: spacing[4],
  },
  preferencesInfo: {
    flexDirection: "row",
    gap: spacing[2],
  },
  preferenceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },

  // Stats View
  statsContainer: {
    paddingHorizontal: spacing[4],
    gap: spacing[4],
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing[3],
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: spacing[2],
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statsSection: {
    gap: spacing[4],
  },
  statsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  ingredientsStats: {
    gap: spacing[3],
  },
  ingredientStat: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ingredientStatInfo: {
    flex: 1,
  },
  ingredientStatBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    minWidth: 32,
    alignItems: "center",
  },
  combinationsStats: {
    gap: spacing[3],
  },
  combinationItem: {
    gap: spacing[3],
    padding: spacing[3],
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  combinationIngredients: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[1],
  },
  miniChip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  combinationStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[6],
    gap: spacing[4],
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingSubtext: {
    marginTop: spacing[2],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[6],
    gap: spacing[4],
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyDescription: {
    maxWidth: 280,
    lineHeight: 22,
  },
  startSearchButton: {
    paddingHorizontal: spacing[6],
    marginTop: spacing[4],
  },
});

export default HistoryScreen;
