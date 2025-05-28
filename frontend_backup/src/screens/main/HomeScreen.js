import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { api } from '../../services/api';
import { lightTheme as theme } from '../../utils/theme';
import PostCard from '../../components/PostCard';

const HomeScreen = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async () => {
    try {
      const data = await api.getFeed();
      setPosts(data);
    } catch (error) {
      console.error('Gönderiler yüklenirken hata:', error);
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
      await api.likePost(postId);
      // Gönderiyi güncelle
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likes: post.likes + 1,
            isLiked: true,
          };
        }
        return post;
      }));
    } catch (error) {
      console.error('Beğeni yapılırken hata:', error);
    }
  };

  const handleComment = async (postId, text) => {
    try {
      const newComment = await api.commentOnPost(postId, text);
      // Gönderiyi güncelle
      setPosts(posts.map(post => {
        if (post.id === postId) {
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
        keyExtractor={(item) => item.id}
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
});

export default HomeScreen;
