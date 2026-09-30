let Notification;
try {
  Notification = require('../modules/notifications/notification.model');
} catch (e) {
  // lazy loaded if needed
}

const socketService = require('./socket.service');

class NotificationService {
  async notify({ user, type, title, message, entityType, entityId }) {
    try {
      if (!Notification) {
        Notification = require('../modules/notifications/notification.model');
      }

      const doc = await Notification.create({
        user,
        type,
        title,
        message,
        entityType,
        entityId,
        isRead: false
      });

      // Also emit via socket if user is specified
      if (user) {
        socketService.emit('notification', doc, `user_${user.toString()}`);
      }

      return doc;
    } catch (err) {
      console.warn('NotificationService error:', err.message);
      return null;
    }
  }
}

module.exports = new NotificationService();
