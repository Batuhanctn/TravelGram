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
import { db } from '../../src/firebaseConfig';
import { useAuth } from '../../src/contexts/AuthContext';
import FollowersList from '../../components/FollowersList';

const { width } = Dimensions.get('window');
const POST_SIZE = width / 3;

export default function UserProfileScreen() {
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
      } else {
        console.log('Kullanıcı bulunamadı');
      }
    });

    // Kullanıcının gönderilerini al
    const postsRef = ref(db, 'posts');
    const unsubscribePosts = onValue(postsRef, (snapshot) => {
      if (snapshot.exists()) {
        const allPosts = snapshot.val();
        const userPosts = Object.entries(allPosts)
          .filter(([_, post]) => post.userId === userId)
          .map(([id, post]) => ({ id, ...post }))
          .sort((a, b) => b.createdAt - a.createdAt);

        setPosts(userPosts);
      }
      setLoading(false);
    });

    // Cleanup
    return () => {
      unsubscribeUser();
      unsubscribePosts();
    };
  }, [id, currentUser]);

  const handleToggleFollow = () => {
    // Takip etme/bırakma işlemi burada yapılacak
    console.log('Takip etme işlemi');
  };

  const renderPost = ({ item }) => (
    <TouchableOpacity
      style={styles.postItem}
      onPress={() => router.push(`/post/${item.id}`)}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1DA1F2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerTitle: () => null, // Başlığı tamamen kaldır
          headerStyle: {
            backgroundColor: '#1DA1F2',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{marginLeft: 10}}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
          headerBackVisible: false, // Varsayılan geri butonunu kaldır
          headerShown: true,
        }}
      />
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <Image
              source={
                user?.photoURL
                  ? { uri: user.photoURL }
                  : { uri: 'https://via.placeholder.com/80' }
              }
              style={styles.profileImage}
            />
            <Text style={styles.username}>{user?.username || user?.displayName}</Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.statsContainer}>
              <TouchableOpacity style={styles.statItem}>
                <Text style={styles.statCount}>{posts.length}</Text>
                <Text style={styles.statLabel}>Gönderi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statItem}
                onPress={() => {
                  setModalType('followers');
                  setModalVisible(true);
                }}
              >
                <Text style={styles.statCount}>{followers.length}</Text>
                <Text style={styles.statLabel}>Takipçi</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.statItem}
                onPress={() => {
                  setModalType('following');
                  setModalVisible(true);
                }}
              >
                <Text style={styles.statCount}>{following.length}</Text>
                <Text style={styles.statLabel}>Takip</Text>
              </TouchableOpacity>
            </View>

            {id !== currentUser?.uid && (
              <TouchableOpacity
                style={styles.followButton}
                onPress={handleToggleFollow}
              >
                <Text style={styles.followButtonText}>Takip Et</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.bioContainer}>
          <Text style={styles.bio}>{user?.bio || ''}</Text>
        </View>

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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userInfo: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statCount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  followButton: {
    backgroundColor: '#1DA1F2',
    borderRadius: 5,
    paddingVertical: 8,
    alignItems: 'center',
  },
  followButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  bioContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  postsContainer: {
    paddingBottom: 20,
  },
  postItem: {
    width: POST_SIZE,
    height: POST_SIZE,
    padding: 1,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyStateText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
