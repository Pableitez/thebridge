// Notification system for table actions
export class TableNotification {
  constructor() {
    this.notification = document.getElementById('tableNotification');
    this.messageElement = document.getElementById('notificationMessage');
    this.closeButton = this.notification.querySelector('.notification-close');
    this.timeout = null;

    this.closeButton.addEventListener('click', () => this.hide());
  }

  show(message, duration = 3000) {
    // Clear any existing timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    // Set message and show notification
    this.messageElement.textContent = message;
    this.notification.classList.remove('hidden');
    this.notification.classList.add('show');

    // Force a reflow to ensure the transition works
    this.notification.offsetHeight;

    // Auto hide after duration
    this.timeout = setTimeout(() => {
      this.hide();
    }, duration);
  }

  hide() {
    this.notification.classList.add('hidden');
    this.notification.classList.remove('show');
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

// Create and export a singleton instance
export const tableNotification = new TableNotification(); 