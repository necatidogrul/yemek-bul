/**
 * Professional Admin Management Service
 * 
 * Bu sistem backend'den admin yetkilerini kontrol eder.
 * Production'da güvenli admin yetkilendirme sağlar.
 */

import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debugLog } from '../config/environment';

export interface AdminUser {
  userId: string;
  email: string;
  role: 'admin' | 'super_admin' | 'developer';
  permissions: AdminPermission[];
  isActive: boolean;
  createdAt: Date;
}

export type AdminPermission = 
  | 'manage_credits'
  | 'view_analytics' 
  | 'manage_users'
  | 'access_logs'
  | 'system_settings'
  | 'content_management';

export class AdminService {
  private static currentAdmin: AdminUser | null = null;
  private static isInitialized = false;

  /**
   * Backend'den admin durumunu kontrol et
   */
  static async checkAdminStatus(userId: string): Promise<boolean> {
    try {
      const { data: adminUser, error } = await supabase
        .from('admin_users')
        .select(`
          user_id,
          email,
          role,
          permissions,
          is_active,
          created_at
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !adminUser) {
        debugLog('❌ Admin check failed:', error?.message);
        this.currentAdmin = null;
        return false;
      }

      this.currentAdmin = {
        userId: adminUser.user_id,
        email: adminUser.email,
        role: adminUser.role,
        permissions: adminUser.permissions || [],
        isActive: adminUser.is_active,
        createdAt: new Date(adminUser.created_at),
      };

      // Cache admin status
      await AsyncStorage.setItem('admin_status', JSON.stringify({
        isAdmin: true,
        permissions: this.currentAdmin.permissions,
        role: this.currentAdmin.role,
        lastCheck: Date.now()
      }));

      debugLog('✅ Admin verified:', this.currentAdmin.role);
      return true;

    } catch (error) {
      debugLog('❌ Admin service error:', error);
      return false;
    }
  }

  /**
   * Admin permission kontrolü
   */
  static hasPermission(permission: AdminPermission): boolean {
    if (!this.currentAdmin) return false;
    
    // Super admin her şeyi yapabilir
    if (this.currentAdmin.role === 'super_admin') return true;
    
    return this.currentAdmin.permissions.includes(permission);
  }

  /**
   * Cache'den admin durumunu kontrol et (hızlı)
   */
  static async isAdminCached(): Promise<boolean> {
    try {
      const cached = await AsyncStorage.getItem('admin_status');
      if (!cached) return false;

      const adminData = JSON.parse(cached);
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      
      // Cache 5 dakikadan eskiyse yenile
      if (adminData.lastCheck < fiveMinutesAgo) {
        return false;
      }

      return adminData.isAdmin === true;
    } catch {
      return false;
    }
  }

  /**
   * Admin yetkilerini backend'den güncelle
   */
  static async refreshAdminStatus(userId: string): Promise<void> {
    await this.checkAdminStatus(userId);
  }

  /**
   * Admin çıkış yap
   */
  static async logout(): Promise<void> {
    this.currentAdmin = null;
    await AsyncStorage.removeItem('admin_status');
    debugLog('🚪 Admin logged out');
  }

  /**
   * Kredi ekleme (admin only)
   */
  static async addCreditsAsAdmin(
    targetUserId: string, 
    amount: number, 
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.hasPermission('manage_credits')) {
      return { success: false, error: 'Kredi yönetimi yetkisi yok' };
    }

    try {
      const { error } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: targetUserId,
          transaction_type: 'admin_grant',
          amount: amount,
          description: `[ADMIN] ${reason}`,
          admin_user_id: this.currentAdmin?.userId,
          created_at: new Date().toISOString()
        });

      if (error) {
        return { success: false, error: error.message };
      }

      // Log admin action
      await this.logAdminAction('add_credits', {
        targetUserId,
        amount,
        reason
      });

      return { success: true };

    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Admin eylemlerini logla
   */
  static async logAdminAction(
    action: string, 
    details: Record<string, any>
  ): Promise<void> {
    if (!this.currentAdmin) return;

    try {
      await supabase
        .from('admin_logs')
        .insert({
          admin_user_id: this.currentAdmin.userId,
          action,
          details,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      debugLog('❌ Failed to log admin action:', error);
    }
  }

  /**
   * Kullanıcı bilgilerini getir (admin only)
   */
  static async getUserInfo(userId: string): Promise<any> {
    if (!this.hasPermission('manage_users')) {
      throw new Error('Kullanıcı yönetimi yetkisi yok');
    }

    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Current admin info
   */
  static getCurrentAdmin(): AdminUser | null {
    return this.currentAdmin;
  }
}