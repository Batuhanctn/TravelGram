import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ref, onValue, get } from 'firebase/database';
import { db } from '../../../src/firebaseConfig';
import { useAuth } from '../../../src/contexts/AuthContext';
import FollowersList from '../../../components/FollowersList';

const { width } = Dimensions.get('window');
const POST_SIZE = width / 3;

export default function ProfileScreen() {
  const { id } = useLocalSearchParams();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('followers');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);

  // Bu useEffect kullanıcı adını başlıkta gösterecek
  useEffect(() => {
    if (user?.username || user?.displayName) {
      // Kullanıcı adını başlıkta göster
      router.setParams({ title: user.username || user.displayName });
    }
  }, [user]);
  
  useEffect(() => {
    const userId = id || currentUser?.uid;
    if (!userId) return;

    // Kullanıcı bilgilerini al
    const userRef = ref(db, `users/${userId}`);
    const unsubscribeUser = onValue(userRef, async (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUser({ uid: snapshot.key, ...userData });

        // Takipçi ve takip edilen kullanıcıları al
        if (userData.followers?.length) {
          const followersData = await Promise.all(
            userData.followers.map(async (followerId) => {
              const followerSnapshot = await get(ref(db, `users/${followerId}`));
              return { uid: followerSnapshot.key, ...followerSnapshot.val() };
            })
          );
          setFollowers(followersData);
        }

        if (userData.following?.length) {
          const followingData = await Promise.all(
            userData.following.map(async (followingId) => {
              const followingSnapshot = await get(ref(db, `users/${followingId}`));
              return { uid: followingSnapshot.key, ...followingSnapshot.val() };
            })
          );
          setFollowing(followingData);
        }
      }
      setLoading(false);
    });

    // Kullanıcının gönderilerini al
    const postsRef = ref(db, 'posts');
    const unsubscribePosts = onValue(postsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allPosts = Object.entries(snapshot.val())
          .map(([id, post]) => ({ id, ...post }))
          .filter((post) => post.userId === userId)
          .sort((a, b) => b.createdAt - a.createdAt);
        setPosts(allPosts);
      }
    });

    return () => {
      unsubscribeUser();
      unsubscribePosts();
    };
  }, [id, currentUser]);

  const handleFollowersPress = () => {
    setModalType('followers');
    setModalVisible(true);
  };

  const handleFollowingPress = () => {
    setModalType('following');
    setModalVisible(true);
  };

  const renderPost = ({ item }) => (
    <TouchableOpacity
      style={styles.postItem}
      onPress={() => router.push(`/post/${item.id}`)}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
      <View style={styles.postOverlay}>
        <View style={styles.postStats}>
          <MaterialIcons name="favorite" size={16} color="#fff" />
          <Text style={styles.postStatsText}>{item.likes?.length || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Kullanıcı bulunamadı</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          title: user?.username || user?.displayName || 'Profil',
          headerStyle: {
            backgroundColor: '#1DA1F2',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <ScrollView>
        <View style={styles.header}>
          <Image
            source={{ uri: user.photoURL || 'https://via.placeholder.com/100' }}
            style={styles.profilePhoto}
          />

          <View style={styles.stats}>
            <TouchableOpacity style={styles.statItem}>
              <Text style={styles.statNumber}>{posts.length}</Text>
              <Text style={styles.statLabel}>Gönderi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statItem}
              onPress={handleFollowersPress}
            >
              <Text style={styles.statNumber}>
                {user.followers?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Takipçi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statItem}
              onPress={handleFollowingPress}
            >
              <Text style={styles.statNumber}>
                {user.following?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Takip</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileInfo}>
          <Text style={styles.username}>{user.displayName}</Text>
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
        </View>

        {currentUser?.uid === user.uid ? (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/settings')}
          >
            <Text style={styles.editButtonText}>Profili Düzenle</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.followButton,
              user.followers?.includes(currentUser?.uid) && styles.followingButton,
            ]}
            onPress={() => handleFollow(user)}
          >
            <Text
              style={[
                styles.followButtonText,
                user.followers?.includes(currentUser?.uid) &&
                  styles.followingButtonText,
              ]}
            >
              {user.followers?.includes(currentUser?.uid)
                ? 'Takiptesin'
                : 'Takip Et'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.postsContainer}>
          {posts.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="photo-library" size={48} color="#666" />
              <Text style={styles.emptyStateText}>
                Henüz gönderi paylaşılmamış
              </Text>
            </View>
          ) : (
            <FlatList
              data={posts}
              renderItem={renderPost}
              keyExtractor={(item) => item.id}
              numColumns={3}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <FollowersList
          users={modalType === 'followers' ? followers : following}
          type={modalType}
          onClose={() => setModalVisible(false)}
        />
      </Modal>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  stats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  profileInfo: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  bio: {
    fontSize: 14,
    color: '#333',
  },
  editButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    color: '#333',
  },
  followButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: '#1565c0',
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#1565c0',
  },
  followButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  followingButtonText: {
    color: '#1565c0',
  },
  postsContainer: {
    flex: 1,
    marginTop: 10,
  },
  postItem: {
    width: POST_SIZE,
    height: POST_SIZE,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  postOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStatsText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
