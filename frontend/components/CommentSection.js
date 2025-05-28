import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ref, push, set, remove } from 'firebase/database';
import { db } from '../src/firebaseConfig';
import { useAuth } from '../src/contexts/AuthContext';

export default function CommentSection({ postId, comments = [] }) {
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    setLoading(true);
    Keyboard.dismiss();

    try {
      const commentRef = push(ref(db, `posts/${postId}/comments`));
      await set(commentRef, {
        userId: user.uid,
        username: user.displayName,
        userPhoto: user.photoURL,
        text: newComment.trim(),
        createdAt: Date.now(),
      });

      setNewComment('');
    } catch (error) {
      console.error('Yorum eklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await remove(ref(db, `posts/${postId}/comments/${commentId}`));
    } catch (error) {
      console.error('Yorum silinirken hata:', error);
    }
  };

  const renderComment = ({ item, index }) => (
    <View style={styles.commentItem}>
      <Image
        source={{ uri: item.userPhoto || 'https://via.placeholder.com/40' }}
        style={styles.userPhoto}
      />
      
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.timestamp}>
            {new Date(item.createdAt).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        
        <Text style={styles.commentText}>{item.text}</Text>
      </View>

      {user?.uid === item.userId && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteComment(item.id)}
        >
          <MaterialIcons name="delete-outline" size={20} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Yorumlar ({comments.length})</Text>

      <FlatList
        data={comments}
        renderItem={renderComment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.commentsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Henüz yorum yapılmamış. İlk yorumu sen yap!
            </Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <Image
          source={{ uri: user?.photoURL || 'https://via.placeholder.com/40' }}
          style={styles.userPhoto}
        />
        
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Yorum yaz..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newComment.trim() || loading) && styles.sendButtonDisabled,
            ]}
            onPress={handleAddComment}
            disabled={!newComment.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  commentsList: {
    paddingHorizontal: 15,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  userPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  username: {
    fontWeight: '600',
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  deleteButton: {
    padding: 5,
    marginLeft: 5,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#666',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#1565c0',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
