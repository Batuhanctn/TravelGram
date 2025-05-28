import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ref, onValue, update } from 'firebase/database';
import { Audio } from 'expo-av';
import { db } from '../../../src/firebaseConfig';
import { useAuth } from '../../../src/contexts/AuthContext';
import CommentSection from '../../../components/CommentSection';

const { width } = Dimensions.get('window');

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const postRef = ref(db, `posts/${id}`);
    const unsubscribe = onValue(postRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Yorumları diziye dönüştür
        const comments = data.comments
          ? Object.entries(data.comments).map(([id, comment]) => ({
              id,
              ...comment,
            }))
          : [];
        // Tarihe göre sırala
        comments.sort((a, b) => b.createdAt - a.createdAt);
        setPost({ ...data, id: snapshot.key, comments });
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [id]);

  const handlePlayAudio = async () => {
    if (isPlaying) {
      await sound.stopAsync();
      setIsPlaying(false);
      setSound(null);
      return;
    }

    setIsAudioLoading(true);
    try {
      const { sound: audioSound } = await Audio.Sound.createAsync(
        { uri: post.audioUrl },
        { shouldPlay: true }
      );
      setSound(audioSound);
      setIsPlaying(true);

      audioSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
          setSound(null);
        }
      });
    } catch (error) {
      console.error('Ses oynatma hatası:', error);
    } finally {
      setIsAudioLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) return;

    const postRef = ref(db, `posts/${id}`);
    const userLiked = post.likes?.includes(user.uid);

    let newLikes = [...(post.likes || [])];
    if (userLiked) {
      newLikes = newLikes.filter(id => id !== user.uid);
    } else {
      newLikes.push(user.uid);
    }

    await update(postRef, { likes: newLikes });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.description}\n\nTravelGram'da paylaşıldı`,
        url: post.imageUrl,
      });
    } catch (error) {
      console.error('Paylaşım hatası:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1565c0" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Gönderi bulunamadı</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => router.push(`/profile/${post.userId}`)}
          >
            <Image
              source={{ uri: post.userPhoto || 'https://via.placeholder.com/40' }}
              style={styles.userPhoto}
            />
            <View>
              <Text style={styles.username}>{post.username}</Text>
              <Text style={styles.location}>{post.location}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare}>
            <MaterialIcons name="share" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <Image
          source={{ uri: post.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />

        <View style={styles.actions}>
          <View style={styles.leftActions}>
            <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
              <MaterialIcons
                name={post.likes?.includes(user?.uid) ? 'favorite' : 'favorite-border'}
                size={28}
                color={post.likes?.includes(user?.uid) ? '#e91e63' : '#666'}
              />
              <Text style={styles.actionText}>
                {post.likes?.length || 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handlePlayAudio}
              style={styles.actionButton}
              disabled={isAudioLoading || !post.audioUrl}
            >
              {isAudioLoading ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <MaterialIcons
                  name={isPlaying ? 'stop' : 'play-arrow'}
                  size={28}
                  color={post.audioUrl ? '#666' : '#ccc'}
                />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.rightActions}>
            <View style={styles.aiScore}>
              <MaterialIcons name="star" size={16} color="#ffd700" />
              <Text style={styles.scoreText}>{post.aiScore || 0}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>{post.description}</Text>
          <Text style={styles.aiDescription}>{post.aiDescription}</Text>
          <Text style={styles.timestamp}>
            {new Date(post.createdAt).toLocaleDateString('tr-TR')}
          </Text>
        </View>

        <CommentSection postId={id} comments={post.comments} />
      </ScrollView>
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
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#1565c0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontWeight: '600',
    fontSize: 16,
  },
  location: {
    color: '#666',
    fontSize: 14,
  },
  image: {
    width: width,
    height: width,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 16,
    color: '#666',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiScore: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  scoreText: {
    marginLeft: 5,
    color: '#666',
    fontWeight: '600',
  },
  content: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
  },
  aiDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
});
