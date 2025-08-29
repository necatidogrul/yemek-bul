/**
 * Data Privacy Utilities
 * Supabase verilerinin güvenli şekilde loglanması ve maskelenmesi için
 */

import { debugLog, isProduction } from "../config/environment";

/**
 * Hassas veriyi maskeler
 */
export const maskSensitiveData = (
  data: any,
  fieldsToMask: string[] = []
): any => {
  if (!data || typeof data !== "object") {
    return data;
  }

  // Production'da tüm hassas alanlar maskeli
  const defaultMaskedFields = [
    "user_id",
    "email",
    "phone",
    "receipt_id",
    "package_id",
    "related_action",
    "description",
    "personal_notes",
    "ingredients",
  ];

  const fieldsToHide = isProduction()
    ? [...defaultMaskedFields, ...fieldsToMask]
    : fieldsToMask;

  if (Array.isArray(data)) {
    return data.map((item) => maskObject(item, fieldsToHide));
  }

  return maskObject(data, fieldsToHide);
};

/**
 * Objedeki hassas alanları maskeler
 */
const maskObject = (obj: any, fieldsToMask: string[]): any => {
  if (!obj || typeof obj !== "object") return obj;

  const masked = { ...obj };

  fieldsToMask.forEach((field) => {
    if (masked[field]) {
      if (typeof masked[field] === "string") {
        masked[field] = maskString(masked[field]);
      } else if (Array.isArray(masked[field])) {
        masked[field] = ["***masked_array***"];
      } else {
        masked[field] = "***masked***";
      }
    }
  });

  return masked;
};

/**
 * String'i güvenli şekilde maskeler
 */
const maskString = (str: string): string => {
  if (!str || str.length <= 4) return "***";

  const start = str.substring(0, 2);
  const end = str.substring(str.length - 2);
  const middle = "*".repeat(Math.min(str.length - 4, 8));

  return `${start}${middle}${end}`;
};

/**
 * Güvenli loglama - development'da detaylı, production'da minimal
 */
export const secureLog = (
  message: string,
  data?: any,
  level: "info" | "warn" | "error" = "info"
) => {
  if (isProduction() && level !== "error") {
    return; // Production'da sadece error logları
  }

  const maskedData = data ? maskSensitiveData(data) : undefined;

  debugLog(message, maskedData);
};

/**
 * Supabase query sonucunu güvenli loglama
 */
export const logSupabaseQuery = (
  operation: string,
  tableName: string,
  result?: any,
  error?: any
) => {
  if (error) {
    secureLog(
      `❌ Supabase ${operation} failed on ${tableName}`,
      {
        error: error.message,
        code: error.code,
      },
      "error"
    );
    return;
  }

  if (result?.data) {
    secureLog(`✅ Supabase ${operation} success on ${tableName}`, {
      recordCount: Array.isArray(result.data) ? result.data.length : 1,
      operation,
      tableName,
    });
  }
};

/**
 * Admin panel access logging
 */
export const logAdminAccess = (action: string, userId?: string) => {
  if (!isProduction()) {
    secureLog(`🔐 Admin action: ${action}`, {
      userId: userId ? maskString(userId) : "unknown",
      timestamp: new Date().toISOString(),
    });
  }
};
