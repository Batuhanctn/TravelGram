import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useAuth } from '../src/contexts/AuthContext';
import { ref, update } from 'firebase/database';
import { db } from '../src/firebaseConfig';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export default function PostCard({ post }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handlePlayAudio = async () => {
    if (isPlaying) {
      await sound.stopAsync();
      setIsPlaying(false);
      setSound(null);
      return;
    }

    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) return;

    const postRef = ref(db, `posts/${post.id}`);
    const userLiked = post.likes?.includes(user.uid);

    let newLikes = [...(post.likes || [])];
    if (userLiked) {
      newLikes = newLikes.filter(id => id !== user.uid);
    } else {
      newLikes.push(user.uid);
    }

    await update(postRef, { likes: newLikes });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => router.push(`/user-profile/${post.userId}`)}
        >
          <Image
            source={{ uri: post.userPhoto || 'https://via.placeholder.com/40' }}
            style={styles.userPhoto}
          />
          <Text style={styles.username}>{post.username}</Text>
        </TouchableOpacity>
        <Text style={styles.location}>{post.location}</Text>
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
              size={24}
              color={post.likes?.includes(user?.uid) ? '#e91e63' : '#666'}
            />
            <Text style={styles.actionText}>
              {post.likes?.length || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="chat-bubble-outline" size={24} color="#666" />
            <Text style={styles.actionText}>
              {post.comments?.length || 0}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePlayAudio}
            style={styles.actionButton}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <MaterialIcons
                name={isPlaying ? 'stop' : 'play-arrow'}
                size={24}
                color="#666"
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.rightActions}>
          <View style={styles.aiScore}>
            <MaterialIcons name="star" size={16} color="#ffd700" />
            <Text style={styles.scoreText}>
              {typeof post.aiScore === 'object' 
                ? (post.aiScore.overall || '0').toFixed(1)
                : post.aiScore || '0'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>{post.description}</Text>
        <Text style={styles.timestamp}>
          {new Date(post.createdAt).toLocaleDateString('tr-TR')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
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
    fontSize: 14,
  },
  location: {
    color: '#666',
    fontSize: 12,
  },
  image: {
    width: width,
    height: width,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  actionText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 12,
  },
  aiScore: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 10,
  },
  description: {
    fontSize: 14,
    marginBottom: 5,
  },
  aiDescription: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 5,
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
  },
});
