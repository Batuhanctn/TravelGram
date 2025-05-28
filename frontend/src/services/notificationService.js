import { ref, push, set, onValue, query, orderByChild } from 'firebase/database';
import { db } from '../firebaseConfig';

export const NotificationType = {
  LIKE: 'like',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  MENTION: 'mention',
};

export const createNotification = async (data) => {
  try {
    const notificationRef = push(ref(db, `notifications/${data.recipientId}`));
    await set(notificationRef, {
      ...data,
      createdAt: Date.now(),
      isRead: false,
    });
  } catch (error) {
    console.error('Bildirim oluşturma hatası:', error);
  }
};

export const subscribeToNotifications = (userId, callback) => {
  const notificationsRef = query(
    ref(db, `notifications/${userId}`),
    orderByChild('createdAt')
  );

  const unsubscribe = onValue(notificationsRef, (snapshot) => {
    const notifications = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        notifications.unshift({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        });
      });
    }
    callback(notifications);
  });

  return unsubscribe;
};

export const markNotificationAsRead = async (userId, notificationId) => {
  try {
    await set(
      ref(db, `notifications/${userId}/${notificationId}/isRead`),
      true
    );
  } catch (error) {
    console.error('Bildirim güncelleme hatası:', error);
  }
};

export const markAllNotificationsAsRead = async (userId) => {
  try {
    const notificationsRef = ref(db, `notifications/${userId}`);
    const snapshot = await get(notificationsRef);
    
    if (snapshot.exists()) {
      const updates = {};
      snapshot.forEach((childSnapshot) => {
        updates[`${childSnapshot.key}/isRead`] = true;
      });
      await update(notificationsRef, updates);
    }
  } catch (error) {
    console.error('Bildirimleri güncelleme hatası:', error);
  }
};

export const getNotificationMessage = (notification) => {
  switch (notification.type) {
    case NotificationType.LIKE:
      return `${notification.senderName} gönderini beğendi`;
    case NotificationType.COMMENT:
      return `${notification.senderName} gönderine yorum yaptı: ${notification.comment}`;
    case NotificationType.FOLLOW:
      return `${notification.senderName} seni takip etmeye başladı`;
    case NotificationType.MENTION:
      return `${notification.senderName} senden bahsetti: ${notification.content}`;
    default:
      return 'Yeni bildirim';
  }
};
