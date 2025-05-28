import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { lightTheme as theme } from '../utils/theme';

const PostCard = ({ post, onLike, onComment }) => {
  const [comment, setComment] = useState('');

  const handleLike = () => {
    if (!post.isLiked) {
      onLike(post.id);
    }
  };

  const handleComment = () => {
    if (comment.trim()) {
      onComment(post.id, comment.trim());
      setComment('');
    } else {
      Alert.alert('Hata', 'Lütfen bir yorum yazın.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: post.user.avatar }}
          style={styles.avatar}
        />
        <View>
          <Text style={styles.username}>{post.user.username}</Text>
          <Text style={styles.location}>{post.location}</Text>
        </View>
      </View>

      <Image
        source={{ uri: post.imageUrl }}
        style={styles.image}
        resizeMode="cover"
      />

      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLike}>
          <Icon
            name={post.isLiked ? 'favorite' : 'favorite-border'}
            size={24}
            color={post.isLiked ? theme.colors.error : theme.colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity>
          <Icon name="chat-bubble-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.likes}>{post.likes} beğeni</Text>
        <Text style={styles.caption}>
          <Text style={styles.username}>{post.user.username}</Text>{' '}
          {post.caption}
        </Text>
        
        {post.comments.length > 0 && (
          <TouchableOpacity>
            <Text style={styles.viewComments}>
              {post.comments.length} yorumu gör
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.commentSection}>
        <TextInput
          style={styles.commentInput}
          placeholder="Yorum yaz..."
          value={comment}
          onChangeText={setComment}
          onSubmitEditing={handleComment}
        />
        <TouchableOpacity onPress={handleComment}>
          <Icon name="send" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing.md,
  },
  username: {
    fontWeight: 'bold',
  },
  location: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  image: {
    width: '100%',
    height: 400,
  },
  actions: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  content: {
    padding: theme.spacing.md,
  },
  likes: {
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  caption: {
    marginBottom: theme.spacing.sm,
  },
  viewComments: {
    color: theme.colors.textSecondary,
  },
  commentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  commentInput: {
    flex: 1,
    marginRight: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness.medium,
  },
});

export default PostCard;
