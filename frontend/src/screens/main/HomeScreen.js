import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Text,
  Image,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Audio } from 'expo-av';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Port 5001 kullanıldığından emin olarak servislerimizi import ediyoruz
import { getFeedPosts, likePost } from '../../services/postService';
import { useAuth } from '../../contexts/AuthContext';
import { lightTheme as theme } from '../../utils/theme';

const HomeScreen = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      // Yeni postService kullanarak MongoDB'den feed gönderilerini çek
      const feedPosts = await getFeedPosts();
      console.log(`Feed için ${feedPosts.length} gönderi bulundu`);
      setPosts(feedPosts);
    } catch (error) {
      console.error('Gönderiler yüklenirken hata:', error);
      Alert.alert('Hata', 'Gönderiler yüklenirken bir sorun oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleLike = async (postId) => {
    try {
      await likePost(postId);
      // Gönderiyi güncelle - isLiked ve likes sayısını artır
      setPosts(posts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            likes: (post.likes || 0) + 1,
            isLiked: true,
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Beğenme işleminde hata:', error);
      Alert.alert('Hata', 'Gönderi beğenilirken bir sorun oluştu');
    }
  };

  const handleComment = async (postId, text) => {
    try {
      const newComment = await api.commentOnPost(postId, text);
      // Gönderiyi güncelle
      setPosts(posts.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            comments: [...post.comments, newComment],
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Yorum yapılırken hata:', error);
    }
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
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onLike={handleLike}
            onComment={handleComment}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      />
    </View>
  );
};

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
      {/* Kullanıcı bilgisi */}
      <View style={styles.userInfo}>
        <Image 
          source={post.userPhotoURL ? { uri: post.userPhotoURL } : require('../../assets/default-avatar.png')} 
          style={styles.userAvatar} 
        />
        <View style={styles.userDetails}>
          <Text style={styles.username}>{post.username || 'Kullanıcı'}</Text>
          <Text style={styles.location}>{post.location || 'Konum yok'}</Text>
        </View>
      </View>

      {/* Görsel */}
      <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
      
      {/* Kontrol butonları (beğeni, yorum, ses) */}
      <View style={styles.controlButtons}>
        <TouchableOpacity onPress={() => handleLike(post._id)} style={styles.iconButton}>
          <Icon name={post.isLiked ? 'favorite' : 'favorite-border'} size={24} color={post.isLiked ? 'red' : theme.colors.text} />
        </TouchableOpacity>
        
        {post.audioUrl && (
          <TouchableOpacity onPress={playAudio} style={styles.iconButton}>
            <Icon name={isPlaying ? 'pause' : 'play-arrow'} size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Beğeni sayısı */}
      <Text style={styles.likes}>{post.likes || 0} beğeni</Text>
      
      {/* Açıklama */}
      {post.description && (
        <View style={styles.captionContainer}>
          <Text style={styles.usernameCaption}>{post.username}</Text>
          <Text style={styles.caption}>{post.description}</Text>
        </View>
      )}
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
    backgroundColor: theme.colors.background,
  },
  postCard: {
    marginBottom: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  location: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  postImage: {
    width: '100%',
    height: 300,
  },
  controlButtons: {
    flexDirection: 'row',
    padding: 12,
  },
  iconButton: {
    marginRight: 16,
  },
  likes: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    fontWeight: 'bold',
  },
  captionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  usernameCaption: {
    fontWeight: 'bold',
    marginRight: 6,
  },
  caption: {
    flex: 1,
  },
});

export default HomeScreen;
