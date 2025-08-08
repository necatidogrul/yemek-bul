import { supabase } from "./supabase";
import { AIRequestHistory, HistoryStats } from "../types/History";
import { HistoryService } from "./historyService";
import { Logger } from "../services/LoggerService";

/**
 * Cloud-based history service using Supabase
 * Bu servis kullanıcı history'sini bulutta saklar ve cihazlar arası senkronizasyon sağlar
 */
class CloudHistoryService {
  private static readonly TABLE_NAME = "user_history";

  /**
   * Kullanıcının cloud history'sini çeker
   */
  static async getCloudHistory(userId: string): Promise<AIRequestHistory[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select("*")
        .eq("user_id", userId)
        .order("timestamp", { ascending: false })
        .limit(100);

      if (error) {
        console.error("❌ Failed to get cloud history:", error);
        return [];
      }

      return (
        data?.map((item: any) => ({
          id: item.id,
          ingredients: item.ingredients,
          preferences: item.preferences,
          results: item.results,
          timestamp: item.timestamp,
          success: item.success,
          error: item.error,
        })) || []
      );
    } catch (error) {
      console.error("❌ Cloud history fetch error:", error);
      return [];
    }
  }

  /**
   * History'yi cloud'a kaydeder
   */
  static async saveToCloud(
    userId: string,
    historyItem: AIRequestHistory
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from(this.TABLE_NAME).insert([
        {
          id: historyItem.id,
          user_id: userId,
          ingredients: historyItem.ingredients,
          preferences: historyItem.preferences,
          results: historyItem.results,
          timestamp: historyItem.timestamp,
          success: historyItem.success,
          error: historyItem.error,
        },
      ]);

      if (error) {
        console.error("❌ Failed to save to cloud:", error);
        return false;
      }

      console.log("☁️ History saved to cloud:", historyItem.id);
      return true;
    } catch (error) {
      console.error("❌ Cloud save error:", error);
      return false;
    }
  }

  /**
   * Local ve cloud history'yi senkronize eder
   */
  static async syncHistory(userId: string): Promise<void> {
    try {
      console.log("🔄 Starting history sync for user:", userId);

      // Cloud'dan history'yi çek
      const cloudHistory = await this.getCloudHistory(userId);

      // Local history'yi çek
      const localHistory = await HistoryService.getHistory();

      // Cloud'da olmayan local kayıtları bulut'a yükle
      for (const localItem of localHistory) {
        const existsInCloud = cloudHistory.some(
          (cloudItem) => cloudItem.id === localItem.id
        );
        if (!existsInCloud) {
          await this.saveToCloud(userId, localItem);
        }
      }

      // Local'de olmayan cloud kayıtları local'e indir
      for (const cloudItem of cloudHistory) {
        const existsLocal = localHistory.some(
          (localItem) => localItem.id === cloudItem.id
        );
        if (!existsLocal) {
          // Local'e ekle (HistoryService'i güncellemek yerine doğrudan AsyncStorage'a ekle)
          const updatedLocal = [cloudItem, ...localHistory].slice(0, 100); // Max 100 kayıt
          await this.updateLocalHistory(updatedLocal);
        }
      }

      console.log("✅ History sync completed");
    } catch (error) {
      console.error("❌ History sync failed:", error);
    }
  }

  /**
   * Cloud history'yi temizler
   */
  static async clearCloudHistory(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq("user_id", userId);

      if (error) {
        console.error("❌ Failed to clear cloud history:", error);
        return false;
      }

      console.log("🗑️ Cloud history cleared for user:", userId);
      return true;
    } catch (error) {
      console.error("❌ Cloud clear error:", error);
      return false;
    }
  }

  /**
   * Belirli bir history item'ı cloud'dan siler
   */
  static async deleteFromCloud(
    userId: string,
    historyId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq("user_id", userId)
        .eq("id", historyId);

      if (error) {
        console.error("❌ Failed to delete from cloud:", error);
        return false;
      }

      console.log("🗑️ History item deleted from cloud:", historyId);
      return true;
    } catch (error) {
      console.error("❌ Cloud delete error:", error);
      return false;
    }
  }

  /**
   * Auto-sync özelliği: Belirli aralıklarla senkronize eder
   */
  static async enableAutoSync(
    userId: string,
    intervalMinutes: number = 30
  ): Promise<void> {
    const intervalMs = intervalMinutes * 60 * 1000;

    // İlk senkronizasyonu hemen yap
    await this.syncHistory(userId);

    // Periyodik senkronizasyon
    const syncInterval = setInterval(async () => {
      try {
        await this.syncHistory(userId);
      } catch (error) {
        console.error("❌ Auto-sync failed:", error);
      }
    }, intervalMs);

    console.log(
      `🔄 Auto-sync enabled for user ${userId} every ${intervalMinutes} minutes`
    );

    // Interval'i temizleme fonksiyonunu döndür
    clearInterval(syncInterval);
    console.log("🛑 Auto-sync disabled");
  }

  /**
   * Local history'yi günceller (private helper)
   */
  private static async updateLocalHistory(
    history: AIRequestHistory[]
  ): Promise<void> {
    try {
      const { default: AsyncStorage } = await import(
        "@react-native-async-storage/async-storage"
      );
      await AsyncStorage.setItem("ai_request_history", JSON.stringify(history));
    } catch (error) {
      console.error("❌ Failed to update local history:", error);
    }
  }

  /**
   * Kullanıcının cloud sync durumunu kontrol eder
   */
  static async getCloudSyncStatus(userId: string): Promise<{
    cloudCount: number;
    localCount: number;
    lastSyncTime?: number;
    syncEnabled: boolean;
  }> {
    try {
      const [cloudHistory, localHistory] = await Promise.all([
        this.getCloudHistory(userId),
        HistoryService.getHistory(),
      ]);

      return {
        cloudCount: cloudHistory.length,
        localCount: localHistory.length,
        syncEnabled: true, // Bu özellik için kullanıcı ayarları eklenebilir
      };
    } catch (error) {
      console.error("❌ Failed to get sync status:", error);
      return {
        cloudCount: 0,
        localCount: 0,
        syncEnabled: false,
      };
    }
  }
}

export { CloudHistoryService };
