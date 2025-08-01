import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { ToastConfig, ToastType, ToastPosition } from '../components/ui/Toast';

interface ToastContextType {
  toasts: ToastConfig[];
  showToast: (config: Omit<ToastConfig, 'id'>) => string;
  hideToast: (id: string) => void;
  hideAllToasts: () => void;
  // Convenience methods
  showSuccess: (title: string, message?: string, options?: Partial<ToastConfig>) => string;
  showError: (title: string, message?: string, options?: Partial<ToastConfig>) => string;
  showWarning: (title: string, message?: string, options?: Partial<ToastConfig>) => string;
  showInfo: (title: string, message?: string, options?: Partial<ToastConfig>) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
  defaultPosition?: ToastPosition;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 3,
  defaultDuration = 4000,
  defaultPosition = 'top',
}) => {
  const [toasts, setToasts] = useState<ToastConfig[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  const generateId = useCallback(() => {
    return `toast_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }, []);

  const showToast = useCallback((config: Omit<ToastConfig, 'id'>) => {
    const id = generateId();
    const newToast: ToastConfig = {
      id,
      duration: defaultDuration,
      position: defaultPosition,
      ...config,
    };

    setToasts(prevToasts => {
      // Remove oldest toast if we're at max capacity
      const updatedToasts = prevToasts.length >= maxToasts 
        ? prevToasts.slice(1) 
        : prevToasts;
      
      return [...updatedToasts, newToast];
    });

    // Auto-hide toast after duration (unless duration is 0)
    if (newToast.duration && newToast.duration > 0) {
      const timeout = setTimeout(() => {
        hideToast(id);
        timeoutsRef.current.delete(id);
      }, newToast.duration);
      timeoutsRef.current.set(id, timeout);
    }

    return id;
  }, [generateId, defaultDuration, defaultPosition, maxToasts]);

  const hideToast = useCallback((id: string) => {
    // Clear timeout if exists
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const hideAllToasts = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();
    setToasts([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<ToastConfig>
  ) => {
    return showToast({
      type: 'success',
      title,
      message,
      ...options,
    });
  }, [showToast]);

  const showError = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<ToastConfig>
  ) => {
    return showToast({
      type: 'error',
      title,
      message,
      duration: 6000, // Errors stay longer by default
      ...options,
    });
  }, [showToast]);

  const showWarning = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<ToastConfig>
  ) => {
    return showToast({
      type: 'warning',
      title,
      message,
      duration: 5000, // Warnings stay a bit longer
      ...options,
    });
  }, [showToast]);

  const showInfo = useCallback((
    title: string, 
    message?: string, 
    options?: Partial<ToastConfig>
  ) => {
    return showToast({
      type: 'info',
      title,
      message,
      ...options,
    });
  }, [showToast]);

  const value: ToastContextType = {
    toasts,
    showToast,
    hideToast,
    hideAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};