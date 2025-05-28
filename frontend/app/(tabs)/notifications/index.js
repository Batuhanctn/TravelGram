import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/contexts/AuthContext';
import {
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  NotificationType,
} from '../../../src/services/notificationService';
import NotificationList from '../../../components/NotificationList';
// BottomTabBar artık Expo Router tarafından otomatik olarak ekleniyor

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToNotifications(user.uid, (notifications) => {
      setNotifications(notifications);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleNotificationPress = async (notification) => {
    // Bildirimi okundu olarak işaretle
    if (!notification.isRead) {
      await markNotificationAsRead(user.uid, notification.id);
    }

    // Bildirim tipine göre yönlendirme yap
    switch (notification.type) {
      case NotificationType.LIKE:
      case NotificationType.COMMENT:
        router.push(`/post/${notification.postId}`);
        break;
      case NotificationType.FOLLOW:
        router.push(`/profile/${notification.senderId}`);
        break;
      case NotificationType.MENTION:
        router.push(`/post/${notification.postId}`);
        break;
    }
  };

  const handleMarkAllAsRead = () => {
    Alert.alert(
      'Tümünü Okundu İşaretle',
      'Tüm bildirimleri okundu olarak işaretlemek istediğinize emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Evet',
          onPress: async () => {
            try {
              await markAllNotificationsAsRead(user.uid);
            } catch (error) {
              Alert.alert('Hata', 'Bildirimler güncellenirken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  const hasUnreadNotifications = notifications.some(
    (notification) => !notification.isRead
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {hasUnreadNotifications && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
          >
            <MaterialIcons name="done-all" size={24} color="#1565c0" />
          </TouchableOpacity>
        )}
      </View>

      <NotificationList
        notifications={notifications}
        loading={loading}
        onNotificationPress={handleNotificationPress}
      />

      {/* Expo Router kendi tab bar'ını sağladığı için BottomTabBar'a gerek yok */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  markAllButton: {
    padding: 5,
  },
});
