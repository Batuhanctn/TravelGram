import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/contexts/AuthContext';
import { ref, query, orderByChild, equalTo, onValue, set } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../src/firebaseConfig';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
// BottomTabBar artık Expo Router tarafından otomatik olarak ekleniyor

const { width } = Dimensions.get('window');
const PROFILE_SIZE = 100;
const POST_SIZE = width / 3 - 2;

export default function ProfileScreen() {
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [stats, setStats] = useState({
    posts: 0,
    totalLikes: 0,
    avgScore: 0,
  });
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const { user, updateUserProfile, logout } = useAuth();
  const router = useRouter();
  
  // Firebase'den doğrudan kullanıcı bilgilerini al
  useEffect(() => {
    console.log('ProfileScreen - Doğrudan Firebase kullanıcı bilgileri kontrol ediliyor');
    const auth = getAuth();
    
    // Geçerli kullanıcıyı hemen kontrol et
    if (auth.currentUser) {
      console.log('Firebase auth - mevcut kullanıcı bulundu:', auth.currentUser.uid);
      setFirebaseUser(auth.currentUser);
      
      // Veritabanı testini kaldırıyoruz, çünkü hataya neden olabilir
      console.log('Firebase kullanıcısı mevcut:', auth.currentUser.uid);
    } else {
      console.log('Firebase auth - şu anda mevcut kullanıcı yok, dinleyici ekleniyor');
    }
    
    // Kullanıcı durumu değişikliklerini dinle
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log('Firebase auth değişikliği algılandı:', currentUser ? 'kullanıcı var' : 'kullanıcı yok');
      setFirebaseUser(currentUser);
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Kullanıcı bilgisini kontrol et (AuthContext veya doğrudan Firebase'den)
    const activeUser = user || firebaseUser;
    if (!activeUser) {
      console.log('Profil - Aktif kullanıcı bulunamadı (user ve firebaseUser her ikisi de null)');
      return;
    }
    
    console.log('Profil - Aktif kullanıcı kullanılıyor:', activeUser.uid);
    
    console.log('Firebase DB test başlıyor - Realtime Database erişimi kontrol ediliyor...');
    try {
      // Önce basit bir veritabanı testi yapalım
      const testRef = ref(db, 'test');
      console.log('Test referansı oluşturuldu:', testRef ? 'Başarılı' : 'Başarısız');
      
      // Kullanıcı postları için sorgu
      console.log('Kullanıcı postları için sorgu oluşturuluyor:', activeUser.uid);
      const userPostsRef = query(
        ref(db, 'posts'),
        orderByChild('userId'),
        equalTo(activeUser.uid)
      );
      console.log('Kullanıcı postları sorgusu oluşturuldu');
    
      // Veriyi dinlemeye başla
      console.log('Realtime Database dinleme başlıyor...');
      const unsubscribe = onValue(userPostsRef, (snapshot) => {
      console.log('Firebase - Kullanıcı gönderileri alınıyor');
      const data = snapshot.val();
      if (data) {
        console.log('Firebase - Gönderi verileri bulundu');
        const postsArray = Object.entries(data).map(([id, post]) => ({
          id,
          ...post,
        }));

        setUserPosts(postsArray.reverse());

        // İstatistikleri hesapla
        const totalLikes = postsArray.reduce(
          (sum, post) => sum + (post.likes?.length || 0),
          0
        );
        const totalScore = postsArray.reduce(
          (sum, post) => sum + (post.aiScore || 0),
          0
        );

        setStats({
          posts: postsArray.length,
          totalLikes: totalLikes,
          avgScore: postsArray.length
            ? (totalScore / postsArray.length).toFixed(1)
            : 0,
        });
      } else {
        console.log('Firebase - Gönderi verisi bulunamadı');
        setUserPosts([]);
        setStats({
          posts: 0,
          totalLikes: 0,
          avgScore: 0,
        });
      }
      setLoading(false);
    }, (error) => {
      // Veritabanı erişim hatasını yakala
      console.error('Firebase Realtime Database hatası:', error);
      Alert.alert('Veritabanı Hatası', `Firebase veritabanına erişim sırasında bir hata oluştu: ${error.message}`);
      setLoading(false);
    });

    // Temizleme işlemi
    return () => {
      try {
        unsubscribe();
        console.log('Firebase dinleyici başarıyla kaldırıldı');
      } catch (e) {
        console.error('Dinleyici kaldırılırken hata:', e);
      }
    };
  } catch (error) {
    // Genel bir hata oluştu
    console.error('Firebase işlemleri sırasında hata:', error);
    Alert.alert('Firebase Hatası', `Firebase işlemleri sırasında bir hata oluştu: ${error.message}`);
    setLoading(false);
    return () => {}; // Boş temizleme fonksiyonu
  }
  }, [user, firebaseUser]);

  const handleUpdatePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaType: ImagePicker.MediaType.IMAGE,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUpdatingPhoto(true);
      try {
        // Aktif kullanıcıyı belirle (AuthContext veya Firebase'den)
        const activeUser = user || firebaseUser;
        if (!activeUser) {
          throw new Error('Profil güncellemek için kullanıcı bulunamadı');
        }

        console.log('Profil fotoğrafı güncelleniyor, kullanıcı:', activeUser.uid);
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const photoRef = storageRef(storage, `users/${activeUser.uid}/profile.jpg`);
        await uploadBytes(photoRef, blob);
        const photoURL = await getDownloadURL(photoRef);
        await updateUserProfile({ photoURL });
        Alert.alert('Başarılı', 'Profil fotoğrafınız güncellendi.');
      } catch (error) {
        console.error('Profil fotoğrafı güncelleme hatası:', error);
        Alert.alert('Hata', `Profil fotoğrafı güncellenirken bir hata oluştu: ${error.message}`);
      } finally {
        setUpdatingPhoto(false);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Expo Router formatında doğru yola yönlendirme
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <TouchableOpacity
              style={styles.profileImageContainer}
              onPress={handleUpdatePhoto}
              disabled={updatingPhoto}
            >
              {updatingPhoto ? (
                <ActivityIndicator size="small" color="#1565c0" />
              ) : (
                <>
                  <Image
                    source={{
                      uri: (user?.photoURL || firebaseUser?.photoURL) || 'https://via.placeholder.com/100',
                    }}
                    style={styles.profileImage}
                  />
                  <View style={styles.editIconContainer}>
                    <MaterialIcons name="edit" size={16} color="#fff" />
                  </View>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.userInfo}>
              <Text style={styles.username}>{(user?.displayName || firebaseUser?.displayName) || 'İsimsiz Kullanıcı'}</Text>
              <Text style={styles.email}>{(user?.email || firebaseUser?.email) || 'E-posta bilgisi alınamadı'}</Text>
              {user || firebaseUser ? null : (
                <Text style={styles.errorText}>Kullanıcı bilgileri yüklenemedi!</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <MaterialIcons name="logout" size={20} color="#666" />
              <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.posts}</Text>
              <Text style={styles.statLabel}>Gönderi</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalLikes}</Text>
              <Text style={styles.statLabel}>Beğeni</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="star" size={16} color="#ffd700" />
              <Text style={styles.statValue}>{stats.avgScore}</Text>
              <Text style={styles.statLabel}>Ort. Puan</Text>
            </View>
          </View>
        </View>

        <View style={styles.postsContainer}>
          <Text style={styles.sectionTitle}>Gönderiler</Text>
          {userPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="photo-library" size={48} color="#666" />
              <Text style={styles.emptyStateText}>
                Henüz bir gönderi paylaşmadınız
              </Text>
              <TouchableOpacity
                style={styles.createPostButton}
                onPress={() => router.push('/post/create')}
              >
                <Text style={styles.createPostButtonText}>
                  İlk Gönderini Paylaş
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={userPosts}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.postItem}>
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.postImage}
                  />
                  <View style={styles.postOverlay}>
                    <View style={styles.postStats}>
                      <MaterialIcons name="favorite" size={16} color="#fff" />
                      <Text style={styles.postStatText}>
                        {item.likes?.length || 0}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              numColumns={3}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
      {/* Expo Router kendi tab bar'ını sağladığı için BottomTabBar'a gerek yok */}
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileSection: {
    alignItems: 'center',
  },
  profileImageContainer: {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: PROFILE_SIZE / 2,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: PROFILE_SIZE / 2,
  },
  editIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#1565c0',
    borderRadius: 12,
    padding: 4,
  },
  userInfo: {
    alignItems: 'center',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  logoutText: {
    marginLeft: 5,
    color: '#666',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  postsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    marginBottom: 20,
  },
  createPostButton: {
    backgroundColor: '#1565c0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  createPostButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  postItem: {
    width: POST_SIZE,
    height: POST_SIZE,
    margin: 1,
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
  postStatText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: 'bold',
  },
});
