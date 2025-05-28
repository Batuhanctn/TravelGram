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
import { useAuth } from '../src/contexts/AuthContext';
import { ref, update } from 'firebase/database';
import { db } from '../src/firebaseConfig';

export default function FollowersList({
  users = [],
  loading = false,
  type = 'followers', // 'followers' veya 'following'
  onClose,
}) {
  const router = useRouter();
  const { user } = useAuth();

  const handleFollow = async (targetUser) => {
    if (!user) return;

    try {
      const updates = {};
      
      // Mevcut kullanıcının takip ettikleri listesini güncelle
      const isFollowing = targetUser.followers?.includes(user.uid);
      const currentUserFollowing = [...(user.following || [])];
      const targetUserFollowers = [...(targetUser.followers || [])];

      if (isFollowing) {
        // Takibi bırak
        const followingIndex = currentUserFollowing.indexOf(targetUser.uid);
        if (followingIndex > -1) currentUserFollowing.splice(followingIndex, 1);
        
        const followerIndex = targetUserFollowers.indexOf(user.uid);
        if (followerIndex > -1) targetUserFollowers.splice(followerIndex, 1);
      } else {
        // Takip et
        if (!currentUserFollowing.includes(targetUser.uid)) {
          currentUserFollowing.push(targetUser.uid);
        }
        if (!targetUserFollowers.includes(user.uid)) {
          targetUserFollowers.push(user.uid);
        }
      }

      updates[`users/${user.uid}/following`] = currentUserFollowing;
      updates[`users/${targetUser.uid}/followers`] = targetUserFollowers;

      await update(ref(db), updates);
    } catch (error) {
      console.error('Takip işlemi hatası:', error);
    }
  };

  const renderUser = ({ item }) => (
    <View style={styles.userItem}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => {
          router.push(`/profile/${item.uid}`);
          onClose?.();
        }}
      >
        <Image
          source={{ uri: item.photoURL || 'https://via.placeholder.com/50' }}
          style={styles.userPhoto}
        />
        <View>
          <Text style={styles.username}>{item.displayName}</Text>
          <Text style={styles.userStats}>
            {item.followers?.length || 0} takipçi • {item.following?.length || 0} takip
          </Text>
        </View>
      </TouchableOpacity>

      {user?.uid !== item.uid && (
        <TouchableOpacity
          style={[
            styles.followButton,
            item.followers?.includes(user?.uid) && styles.followingButton,
          ]}
          onPress={() => handleFollow(item)}
        >
          <Text style={[
            styles.followButtonText,
            item.followers?.includes(user?.uid) && styles.followingButtonText,
          ]}>
            {item.followers?.includes(user?.uid) ? 'Takiptesin' : 'Takip Et'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
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
      <View style={styles.header}>
        <Text style={styles.title}>
          {type === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialIcons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {users.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="group" size={48} color="#666" />
          <Text style={styles.emptyStateText}>
            {type === 'followers'
              ? 'Henüz takipçiniz yok'
              : 'Henüz kimseyi takip etmiyorsunuz'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.uid}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  list: {
    padding: 15,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userStats: {
    fontSize: 12,
    color: '#666',
  },
  followButton: {
    backgroundColor: '#1565c0',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1565c0',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  followingButtonText: {
    color: '#1565c0',
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
