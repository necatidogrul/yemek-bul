import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useToast } from '../../contexts/ToastContext';
import { Toast } from './Toast';

export const ToastContainer: React.FC = () => {
  const { toasts, hideToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  // Group toasts by position
  const topToasts = toasts.filter(toast => toast.position === 'top');
  const bottomToasts = toasts.filter(toast => toast.position === 'bottom');

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Top toasts */}
      {topToasts.map((toast, index) => (
        <Toast
          key={toast.id}
          {...toast}
          visible={true}
          onDismiss={toast.onDismiss || (() => hideToast(toast.id))}
          onAction={toast.onAction}
        />
      ))}

      {/* Bottom toasts */}
      {bottomToasts.map((toast, index) => (
        <Toast
          key={toast.id}
          {...toast}
          visible={true}
          onDismiss={toast.onDismiss || (() => hideToast(toast.id))}
          onAction={toast.onAction}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
});
