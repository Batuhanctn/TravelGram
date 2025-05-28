import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Audio } from 'expo-av';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { getUserPosts } from '../../services/postService';
import { lightTheme as theme } from '../../utils/theme';

const ProfileScreen = ({ navigation }) => {
  const { user, signOut, getCurrentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeUser, setActiveUser] = useState(null);
  
  // Aktif kullanıcı bilgisini al ve sakla
  useEffect(() => {
    const fetchActiveUser = () => {
      // Önce context'teki user'ı kontrol et
      if (user) {
        console.log('ProfileScreen: Context user bulundu', user.uid);
        setActiveUser(user);
        return;
      }
      
      // Context'te yoksa getCurrentUser() ile dene
      const currentUser = getCurrentUser && getCurrentUser();
      if (currentUser) {
        console.log('ProfileScreen: getCurrentUser ile user bulundu', currentUser.uid);
        setActiveUser(currentUser);
        return;
      }
      
      console.log('ProfileScreen: Aktif kullanıcı bulunamadı');
    };
    
    fetchActiveUser();
  }, [user, getCurrentUser]);

  useEffect(() => {
    if (activeUser?.uid) {
      fetchProfile();
      fetchUserPosts();
    }
  }, [activeUser]);

  // MongoDB'den kullanıcı gönderilerini çek
  const fetchUserPosts = async () => {
    try {
      setLoading(true);
      if (!activeUser?.uid) {
        console.log('Kullanıcı kimliği bulunamadı');
        setLoading(false);
        return;
      }

      const userId = activeUser.uid;
      console.log('Kullanıcı gönderileri getiriliyor:', userId);
      
      // postService üzerinden kullanıcının MongoDB'deki gönderilerini çek
      const userPosts = await getUserPosts(userId);
      console.log(`${userPosts.length} gönderi bulundu`);
      setPosts(userPosts);
    } catch (error) {
      console.error('Gönderileri getirme hatası:', error);
      Alert.alert('Hata', 'Gönderiler yüklenirken bir sorun oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      // Aktif kullanıcıyı kullan, yoksa context user'ı dene
      const userToFetch = activeUser || user;
      
      if (!userToFetch || !userToFetch.uid) {
        console.error('Profil yüklenirken hata: Kullanıcı bilgisi yok');
        Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }
      
      console.log('Profil yükleniyor:', userToFetch.uid);
      const profileData = await api.getUser(userToFetch.uid);
      setProfile(profileData);
      setPosts(profileData.posts || []);
    } catch (error) {
      console.error('Profil yüklenirken hata:', error);
      Alert.alert('Hata', 'Profil bilgileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
    }
  };

  // CreatePost ekranına geçiş yap - user bilgisini de aktar
  const navigateToCreatePost = () => {
    // Aktif kullanıcıyı veya context user'ı kullan
    const userToPass = activeUser || user;
    
    if (!userToPass) {
      console.error('CreatePost ekranına geçiş hatası: Kullanıcı bilgisi yok');
      Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }
    
    console.log('CreatePost ekranına geçiliyor, user bilgisi aktarılıyor:', userToPass.uid);
    navigation.navigate('CreatePost', { user: userToPass });
  };
  
  const renderHeader = () => (
    <View style={styles.header}>
      <Image
        source={{ uri: profile?.avatar }}
        style={styles.avatar}
      />
      
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{posts.length}</Text>
          <Text style={styles.statLabel}>Gönderi</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile?.followers?.length || 0}</Text>
          <Text style={styles.statLabel}>Takipçi</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile?.following?.length || 0}</Text>
          <Text style={styles.statLabel}>Takip</Text>
        </View>
      </View>
    </View>
  );

  const renderBio = () => (
    <View style={styles.bioSection}>
      <Text style={styles.username}>{profile?.username}</Text>
      {profile?.bio && (
        <Text style={styles.bio}>{profile.bio}</Text>
      )}
      
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate('EditProfile')}
      >
        <Text style={styles.editButtonText}>Profili Düzenle</Text>
      </TouchableOpacity>
    </View>
  );

  // Görseli çalar (bir gönderiyi içeren) bir bileşen
  const PostCard = ({ post }) => {
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Ses dosyasını yükle ve çal
    const playAudio = async () => {
      try {
        if (isPlaying) {
          // Çalmakta olan sesi durdur
          await sound.stopAsync();
          setIsPlaying(false);
          return;
        }
        
        if (!post.audioUrl) {
          Alert.alert('Bilgi', 'Bu gönderi için ses kaydı bulunmuyor.');
          return;
        }
        
        // Ses dosyasını yükle ve çal
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: post.audioUrl },
          { shouldPlay: true }
        );
        
        setSound(newSound);
        setIsPlaying(true);
        
        // Ses bittiğinde
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      } catch (error) {
        console.error('Ses oynatma hatası:', error);
        Alert.alert('Hata', 'Ses dosyası oynatılamadı.');
      }
    };
    
    // Bileşen temizlendiğinde sesi durdur
    useEffect(() => {
      return () => {
        if (sound) {
          sound.unloadAsync();
        }
      };
    }, [sound]);
    
    return (
      <View style={styles.postCard}>
        {/* Üst bilgi alanı */}
        <View style={styles.postHeader}>
          <Text style={styles.postLocation}>{post.location || 'Konum yok'}</Text>
          {post.audioUrl && (
            <TouchableOpacity onPress={playAudio} style={styles.audioButton}>
              <Icon name={isPlaying ? 'pause' : 'play-arrow'} size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Görsel */}
        <TouchableOpacity onPress={() => handlePostPress(post)}>
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
        </TouchableOpacity>
        
        {/* Açıklama */}
        {post.description && (
          <Text style={styles.postDescription}>{post.description}</Text>
        )}
      </View>
    );
  };

  const renderPostItem = ({ item }) => <PostCard post={item} />;

  const handlePostPress = (post) => {
    navigation.navigate('PostDetail', { post });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.screenTitle}>{profile?.username}</Text>
        <View style={styles.topBarButtons}>
          <TouchableOpacity 
            style={styles.topBarButton} 
            onPress={navigateToCreatePost}
          >
            <Icon name="add-circle" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.topBarButton} 
            onPress={handleSignOut}
          >
            <Icon name="logout" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPostItem}
        numColumns={1}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderBio()}
          </>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  topBarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarButton: {
    marginLeft: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  screenTitle: {
    ...theme.typography.h2,
  },
  header: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  stats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: theme.colors.textSecondary,
  },
  bioSection: {
    padding: theme.spacing.lg,
  },
  username: {
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  bio: {
    marginBottom: theme.spacing.md,
  },
  editButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.medium,
    padding: theme.spacing.sm,
    alignItems: 'center',
  },
  editButtonText: {
    fontWeight: '500',
  },
  postItem: {
    flex: 1/3,
    aspectRatio: 1,
    padding: 1,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
});

export default ProfileScreen;
