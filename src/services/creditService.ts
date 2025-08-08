import { supabase } from "./supabase";
import {
  CreditTransaction,
  UserCredits,
  CreditAction,
  CREDIT_COSTS,
  FREE_DAILY_CREDITS,
} from "../types/Credit";
import { Logger } from "../services/LoggerService";
import { logSupabaseQuery, logCreditOperation } from "../utils/dataPrivacy";

export class CreditService {
  /**
   * Initialize user credits with initial amount
   */
  static async initializeUserCredits(
    userId: string,
    initialCredits: number = 0
  ): Promise<UserCredits> {
    try {
      Logger.info(
        `[CreditService] 🚀 Initializing credits for user: ${userId} with ${initialCredits} credits`
      );

      const now = new Date();
      const newAccount = {
        user_id: userId,
        total_credits: initialCredits,
        used_credits: 0,
        remaining_credits: initialCredits,
        daily_free_credits: FREE_DAILY_CREDITS,
        daily_free_used: 0,
        last_daily_reset: now.toISOString(),
        lifetime_credits_earned: initialCredits,
        lifetime_credits_spent: 0,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      };

      const { data, error } = await supabase
        .from("user_credits")
        .insert(newAccount)
        .select()
        .single();

      logSupabaseQuery('INSERT', 'user_credits', { data }, error);

      if (error) {
        Logger.error(
          "[CreditService] 💥 Failed to create user credits in database:",
          error.message
        );

        // Return offline version instead of throwing
        const offlineCredits: UserCredits = {
          userId,
          totalCredits: initialCredits,
          usedCredits: 0,
          remainingCredits: initialCredits,
          dailyFreeCredits: FREE_DAILY_CREDITS,
          dailyFreeUsed: 0,
          lastDailyReset: now,
          lifetimeCreditsEarned: initialCredits,
          lifetimeCreditsSpent: 0,
          createdAt: now,
          updatedAt: now,
        };

        Logger.info(
          "[CreditService] 🔄 Returning offline credits due to database error"
        );
        return offlineCredits;
      }

      Logger.info(
        `[CreditService] ✅ User credits initialized successfully: ${userId}`
      );
      return this.mapDatabaseToUserCredits(data);
    } catch (error) {
      Logger.error(
        "[CreditService] 💥 Unexpected error in initializeUserCredits:",
        error
      );

      // Return offline version instead of throwing
      const now = new Date();
      const offlineCredits: UserCredits = {
        userId,
        totalCredits: initialCredits,
        usedCredits: 0,
        remainingCredits: initialCredits,
        dailyFreeCredits: FREE_DAILY_CREDITS,
        dailyFreeUsed: 0,
        lastDailyReset: now,
        lifetimeCreditsEarned: initialCredits,
        lifetimeCreditsSpent: 0,
        createdAt: now,
        updatedAt: now,
      };

      Logger.info(
        "[CreditService] 🔄 Returning offline credits due to unexpected error"
      );
      return offlineCredits;
    }
  }

  /**
   * Simple add credits method (overload for the context)
   */
  static async addCredits(
    userId: string,
    amount: number,
    description: string
  ): Promise<void> {
    const result = await this.addCreditsWithDetails(
      userId,
      amount,
      "bonus",
      description
    );
    if (!result.success) {
      throw new Error("Failed to add credits");
    }
  }

  /**
   * Kullanıcının kredi durumunu getir
   */
  static async getUserCredits(userId: string): Promise<UserCredits | null> {
    try {
      Logger.info(`[CreditService] 🔍 Fetching credits for user: ${userId}`);

      // In development, if temp user ID, skip database operations
      if (userId.startsWith("temp_") && __DEV__) {
        Logger.info(
          "[CreditService] 🔄 Development mode with temp user, skipping database"
        );
        return null;
      }

      const { data, error } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        Logger.info(
          `[CreditService] ⚠️ Supabase error: ${error.code} - ${error.message}`
        );

        if (error.code === "PGRST116") {
          // User not found, return null to trigger initialization
          Logger.info("[CreditService] 👤 User not found in database");
          return null;
        } else if (error.code === "42P01") {
          // Table doesn't exist
          Logger.warn("[CreditService] 📋 user_credits table does not exist");
          return null;
        } else if (error.code === "22P02") {
          // UUID format error - likely temp user in dev mode
          Logger.warn(
            "[CreditService] 🔄 UUID format error, likely temp user in dev mode"
          );
          return null;
        } else {
          // Other database errors
          Logger.error("[CreditService] 💥 Database error:", error);
          return null;
        }
      }

      if (!data) {
        Logger.info("[CreditService] 📂 No data returned for user");
        return null;
      }

      Logger.info("[CreditService] ✅ User credits found:", data);

      // Günlük ücretsiz kredileri sıfırla (gerekirse)
      const userCredits = await this.resetDailyCreditsIfNeeded(data);

      return userCredits;
    } catch (error) {
      Logger.error(
        "[CreditService] 💥 Unexpected error in getUserCredits:",
        error
      );
      return null;
    }
  }

  /**
   * Yeni kullanıcı için kredi hesabı oluştur
   */
  private static async createUserCreditsAccount(
    userId: string
  ): Promise<UserCredits> {
    const now = new Date();
    const newAccount = {
      user_id: userId,
      total_credits: 0,
      used_credits: 0,
      remaining_credits: 0,
      daily_free_credits: FREE_DAILY_CREDITS,
      daily_free_used: 0,
      last_daily_reset: now.toISOString(),
      lifetime_credits_earned: 0,
      lifetime_credits_spent: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const { data, error } = await supabase
      .from("user_credits")
      .insert(newAccount)
      .select()
      .single();

    if (error) throw error;

    return this.mapDatabaseToUserCredits(data);
  }

  /**
   * Günlük kredi sıfırlama kontrolü
   */
  private static async resetDailyCreditsIfNeeded(
    data: any
  ): Promise<UserCredits> {
    const lastReset = new Date(data.last_daily_reset);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const resetDate = new Date(
      lastReset.getFullYear(),
      lastReset.getMonth(),
      lastReset.getDate()
    );

    // Eğer son sıfırlama bugün değilse, günlük kredileri sıfırla
    if (today.getTime() !== resetDate.getTime()) {
      const { data: updatedData, error } = await supabase
        .from("user_credits")
        .update({
          daily_free_used: 0,
          last_daily_reset: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("user_id", data.user_id)
        .select()
        .single();

      if (error) throw error;
      return this.mapDatabaseToUserCredits(updatedData);
    }

    return this.mapDatabaseToUserCredits(data);
  }

  /**
   * Kredi kullanımı kontrolü
   */
  static async canUseCredits(
    userId: string,
    action: CreditAction
  ): Promise<{
    canUse: boolean;
    creditsNeeded: number;
    userCredits: UserCredits;
    usesFreeCredit: boolean;
  }> {
    const creditsNeeded = CREDIT_COSTS[action] || 1;
    const fetchedCredits = await this.getUserCredits(userId);
    let userCredits: UserCredits;

    if (!fetchedCredits) {
      if (userId.startsWith("temp_") && __DEV__) {
        // Dev modunda temp kullanıcı için offline default
        const now = new Date();
        userCredits = {
          userId,
          totalCredits: 0,
          usedCredits: 0,
          remainingCredits: 0,
          dailyFreeCredits: FREE_DAILY_CREDITS,
          dailyFreeUsed: 0,
          lastDailyReset: now,
          lifetimeCreditsEarned: 0,
          lifetimeCreditsSpent: 0,
          createdAt: now,
          updatedAt: now,
        };
      } else {
        // Prod için kullanıcı hesabı oluştur
        userCredits = await this.createUserCreditsAccount(userId);
      }
    } else {
      userCredits = fetchedCredits;
    }

    // Önce günlük ücretsiz kredileri kontrol et
    const remainingFreeCredits =
      userCredits.dailyFreeCredits - userCredits.dailyFreeUsed;
    if (remainingFreeCredits >= creditsNeeded) {
      return {
        canUse: true,
        creditsNeeded,
        userCredits,
        usesFreeCredit: true,
      };
    }

    // Satın alınmış kredileri kontrol et
    if (userCredits.remainingCredits >= creditsNeeded) {
      return {
        canUse: true,
        creditsNeeded,
        userCredits,
        usesFreeCredit: false,
      };
    }

    return {
      canUse: false,
      creditsNeeded,
      userCredits,
      usesFreeCredit: false,
    };
  }

  /**
   * Kredi kullan
   */
  static async spendCredits(
    userId: string,
    action: CreditAction,
    description?: string
  ): Promise<{ success: boolean; transaction?: CreditTransaction }> {
    try {
      const creditCheck = await this.canUseCredits(userId, action);

      if (!creditCheck.canUse) {
        return { success: false };
      }

      const creditsNeeded = creditCheck.creditsNeeded;
      let updateData: any = {
        updated_at: new Date().toISOString(),
      };

      let transactionType: "spend" | "daily_free" = "spend";

      // Ücretsiz kredi kullanımı
      if (creditCheck.usesFreeCredit) {
        updateData.daily_free_used =
          creditCheck.userCredits.dailyFreeUsed + creditsNeeded;
        transactionType = "daily_free";
      }
      // Satın alınmış kredi kullanımı
      else {
        updateData.used_credits =
          creditCheck.userCredits.usedCredits + creditsNeeded;
        updateData.remaining_credits =
          creditCheck.userCredits.remainingCredits - creditsNeeded;
        updateData.lifetime_credits_spent =
          creditCheck.userCredits.lifetimeCreditsSpent + creditsNeeded;
      }

      // Kredi güncelle
      const { error: updateError } = await supabase
        .from("user_credits")
        .update(updateData)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      // Transaction kaydı oluştur
      const transaction = await this.createTransaction({
        userId,
        transactionType,
        amount: -creditsNeeded,
        description: description || `${action} kullanımı`,
        relatedAction: action,
      });

      Logger.info(
        `✅ Credit spent successfully`,
        { action, creditsNeeded }
      );

      return { success: true, transaction };
    } catch (error) {
      Logger.error("Spend credits error:", error);
      return { success: false };
    }
  }

  /**
   * Deduct credits for an action
   */
  static async deductCredits(
    userId: string,
    action: CreditAction,
    amount: number,
    description: string
  ): Promise<boolean> {
    try {
      // In development mode with temp user, skip database operations
      if (userId.startsWith("temp_") && __DEV__) {
        Logger.info(
          "[CreditService] 🔄 Development mode with temp user, skipping credit deduction in database"
        );
        return true; // Return true to allow the action to proceed in dev mode
      }

      const userCredits = await this.getUserCredits(userId);

      if (!userCredits) {
        Logger.error("[CreditService] User credits not found");
        return false;
      }

      if (userCredits.remainingCredits < amount) {
        Logger.warn(
          `[CreditService] Insufficient credits. Required: ${amount}, Available: ${userCredits.remainingCredits}`
        );
        return false;
      }

      const updateData = {
        used_credits: userCredits.usedCredits + amount,
        remaining_credits: userCredits.remainingCredits - amount,
        lifetime_credits_spent: userCredits.lifetimeCreditsSpent + amount,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("user_credits")
        .update(updateData)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      // Create transaction record
      await this.createTransaction({
        userId,
        transactionType: "spend",
        amount: -amount, // Negative for spending
        description,
        relatedAction: action,
      });

      Logger.info(
        `[CreditService] Successfully deducted ${amount} credits for ${action}`
      );
      return true;
    } catch (error) {
      Logger.error("[CreditService] Failed to deduct credits:", error);
      return false;
    }
  }

  /**
   * Kredi ekle (satın alma, bonus vs.)
   */
  static async addCreditsWithDetails(
    userId: string,
    amount: number,
    type: "purchase" | "bonus" | "earn",
    description: string,
    packageId?: string,
    receiptId?: string
  ): Promise<{ success: boolean; transaction?: CreditTransaction }> {
    try {
      let userCredits = await this.getUserCredits(userId);
      if (!userCredits) {
        if (userId.startsWith("temp_") && __DEV__) {
          const now = new Date();
          userCredits = {
            userId,
            totalCredits: 0,
            usedCredits: 0,
            remainingCredits: 0,
            dailyFreeCredits: FREE_DAILY_CREDITS,
            dailyFreeUsed: 0,
            lastDailyReset: now,
            lifetimeCreditsEarned: 0,
            lifetimeCreditsSpent: 0,
            createdAt: now,
            updatedAt: now,
          };
        } else {
          userCredits = await this.createUserCreditsAccount(userId);
        }
      }

      const updateData = {
        total_credits: userCredits.totalCredits + amount,
        remaining_credits: userCredits.remainingCredits + amount,
        lifetime_credits_earned: userCredits.lifetimeCreditsEarned + amount,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("user_credits")
        .update(updateData)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      // Transaction kaydı
      const transaction = await this.createTransaction({
        userId,
        transactionType: type,
        amount,
        description,
        packageId,
        receiptId,
      });

      Logger.info(
        `✅ Credits added successfully`,
        { amount, type }
      );

      return { success: true, transaction };
    } catch (error) {
      Logger.error("Add credits error:", error);
      return { success: false };
    }
  }

  /**
   * Transaction kaydı oluştur
   */
  private static async createTransaction(data: {
    userId: string;
    transactionType: CreditTransaction["transactionType"];
    amount: number;
    description: string;
    relatedAction?: CreditAction;
    packageId?: string;
    receiptId?: string;
  }): Promise<CreditTransaction> {
    const transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: data.userId,
      transaction_type: data.transactionType,
      amount: data.amount,
      description: data.description,
      related_action: data.relatedAction,
      package_id: data.packageId,
      receipt_id: data.receiptId,
      created_at: new Date().toISOString(),
    };

    const { data: insertedData, error } = await supabase
      .from("credit_transactions")
      .insert(transaction)
      .select()
      .single();

    if (error) throw error;

    return this.mapDatabaseToTransaction(insertedData);
  }

  /**
   * Kullanıcının transaction geçmişini getir
   */
  static async getUserTransactions(
    userId: string,
    limit: number = 50
  ): Promise<CreditTransaction[]> {
    try {
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(this.mapDatabaseToTransaction);
    } catch (error) {
      Logger.error("Get user transactions error:", error);
      return [];
    }
  }

  /**
   * Database mapping functions
   */
  private static mapDatabaseToUserCredits(data: any): UserCredits {
    return {
      userId: data.user_id,
      totalCredits: data.total_credits || 0,
      usedCredits: data.used_credits || 0,
      remainingCredits: data.remaining_credits || 0,
      dailyFreeCredits: data.daily_free_credits || FREE_DAILY_CREDITS,
      dailyFreeUsed: data.daily_free_used || 0,
      lastDailyReset: new Date(data.last_daily_reset),
      lifetimeCreditsEarned: data.lifetime_credits_earned || 0,
      lifetimeCreditsSpent: data.lifetime_credits_spent || 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  private static mapDatabaseToTransaction(data: any): CreditTransaction {
    return {
      id: data.id,
      userId: data.user_id,
      transactionType: data.transaction_type,
      amount: data.amount,
      description: data.description,
      relatedAction: data.related_action,
      packageId: data.package_id,
      receiptId: data.receipt_id,
      createdAt: new Date(data.created_at),
    };
  }
}
