// Notificación unificada que usa el sistema global
export function showNotification(message, type = 'info') {
  if (typeof window.showUnifiedNotification === 'function') {
    window.showUnifiedNotification(message, type);
  } else {
    // Fallback simple
    console.log(`Notification [${type}]:`, message);
  }
} 