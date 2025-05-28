import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getNotificationMessage } from '../src/services/notificationService';

export default function NotificationList({
  notifications = [],
  loading = false,
  onNotificationPress,
}) {
  const router = useRouter();

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unread]}
      onPress={() => onNotificationPress(item)}
    >
      <Image
        source={{ uri: item.senderPhoto || 'https://via.placeholder.com/40' }}
        style={styles.senderPhoto}
      />

      <View style={styles.notificationContent}>
        <Text style={styles.message}>{getNotificationMessage(item)}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.createdAt).toLocaleDateString('tr-TR')}
        </Text>
      </View>

      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="notifications-none" size={48} color="#666" />
          <Text style={styles.emptyStateText}>
            Henüz bildiriminiz bulunmuyor
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 15,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  unread: {
    backgroundColor: '#f0f8ff',
  },
  senderPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    marginBottom: 5,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1565c0',
    marginLeft: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
