/**
 * Production-ready Logging Service
 * Replaces console.log with proper logging levels and conditional output
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
}

class LoggerServiceClass {
  private currentLevel: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.ERROR;
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory
  private sessionId: string;

  constructor() {
    this.sessionId = Date.now().toString();
  }

  setLevel(level: LogLevel) {
    this.currentLevel = level;
  }

  debug(message: string, data?: any, userId?: string) {
    this.log(LogLevel.DEBUG, message, data, userId);
  }

  info(message: string, data?: any, userId?: string) {
    this.log(LogLevel.INFO, message, data, userId);
  }

  warn(message: string, data?: any, userId?: string) {
    this.log(LogLevel.WARN, message, data, userId);
  }

  error(message: string, error?: any, userId?: string) {
    this.log(LogLevel.ERROR, message, error, userId);

    // In production, send critical errors to crash reporting
    if (!__DEV__ && error) {
      this.reportError(message, error, userId);
    }
  }

  private log(level: LogLevel, message: string, data?: any, userId?: string) {
    if (level < this.currentLevel) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      userId,
      sessionId: this.sessionId,
    };

    // Store in memory
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output to console in development only
    if (__DEV__) {
      const emoji = this.getLevelEmoji(level);
      const timestamp = entry.timestamp.toISOString().substr(11, 12);
      const userInfo = userId ? ` [${userId}]` : '';

      console.log(`${emoji} ${timestamp}${userInfo} ${message}`, data || '');
    }
  }

  private getLevelEmoji(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '🔍';
      case LogLevel.INFO:
        return 'ℹ️';
      case LogLevel.WARN:
        return '⚠️';
      case LogLevel.ERROR:
        return '❌';
      default:
        return '📝';
    }
  }

  private async reportError(message: string, error: any, userId?: string) {
    try {
      // TODO: Integrate with Crashlytics or Sentry
      // For now, store locally for debugging
      const errorReport = {
        message,
        error: error?.message || String(error),
        stack: error?.stack,
        userId,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
      };

      // In a real app, send to crash reporting service
      console.error('🚨 Production Error Report:', errorReport);
    } catch (reportError) {
      // Silent fail for error reporting
    }
  }

  // Get logs for debugging or user support
  getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  // Clear logs (for memory management)
  clearLogs() {
    this.logs = [];
  }

  // Export logs for support
  exportLogs(): string {
    return this.logs
      .map(log => {
        const timestamp = log.timestamp.toISOString();
        const levelName = LogLevel[log.level];
        const userInfo = log.userId ? ` [${log.userId}]` : '';
        const dataInfo = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
        return `${timestamp} ${levelName}${userInfo}: ${log.message}${dataInfo}`;
      })
      .join('\n');
  }
}

// Singleton instance
export const Logger = new LoggerServiceClass();

// Convenience functions for easy migration from console.log
export const logDebug = (message: string, data?: any, userId?: string) =>
  Logger.debug(message, data, userId);
export const logInfo = (message: string, data?: any, userId?: string) =>
  Logger.info(message, data, userId);
export const logWarn = (message: string, data?: any, userId?: string) =>
  Logger.warn(message, data, userId);
export const logError = (message: string, error?: any, userId?: string) =>
  Logger.error(message, error, userId);

// Production-safe console replacement
export const prodLog = {
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
  log: logInfo, // For console.log migration
};
