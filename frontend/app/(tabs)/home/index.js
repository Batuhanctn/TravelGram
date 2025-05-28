import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { ref, onValue, query, orderByChild } from 'firebase/database';
import { db } from '../../../src/firebaseConfig';
import { useAuth } from '../../../src/contexts/AuthContext';
import PostCard from '../../../components/PostCard';
import CustomNavHeader from '../../../components/CustomNavHeader';

export default function HomeScreen() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  // Güvenli bir şekilde postları yüklemeyi deneyin, izin hatası durumunda boş liste gösterin
  const loadPosts = () => {
    setLoading(true);
    try {
      // Firebase Realtime Database'de posts yoluna sorgu yap
      const postsRef = query(ref(db, 'posts'), orderByChild('createdAt'));

      // Yükleme işleminin sınırsız beklemesini önlemek için bir timeout ekleyelim
      const timeoutId = setTimeout(() => {
        console.log('Firebase veri yükleme zaman aşımına uğradı');
        setLoading(false);
        setRefreshing(false);
        setPosts([]);
      }, 5000); // 5 saniye sonra yükleme duracak

      return onValue(postsRef, (snapshot) => {
        // Timeout'u temizle
        clearTimeout(timeoutId);
        
        const data = snapshot.val();
        console.log('Firebase veri yüklendi:', data ? 'Veri var' : 'Veri yok');
        
        if (data) {
          const postsArray = Object.entries(data).map(([id, post]) => ({
            id,
            ...post,
          }));
          
          // En yeni gönderiler en üstte
          setPosts(postsArray.reverse());
        } else {
          setPosts([]);
        }
        setLoading(false);
        setRefreshing(false);
      }, (error) => {
        // İzin hatası veya başka bir hata durumunda
        console.error('Firebase veri yükleme hatası:', error);
        clearTimeout(timeoutId);
        setLoading(false);
        setRefreshing(false);
        setPosts([]);
      });
    } catch (error) {
      console.error('Kritik Firebase hatası:', error);
      setLoading(false);
      setRefreshing(false);
      setPosts([]);
      return () => {}; // boş temizleme fonksiyonu
    }
  };

  useEffect(() => {
    const unsubscribe = loadPosts();
    return () => unsubscribe();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPosts();
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
      {posts.length === 0 ? (
        // İçerik yoksa
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Gösterilecek gönderi bulunamadı</Text>
          <Text style={styles.secondaryText}>Yeni gönderi oluşturmak için "Paylaş" sekmesini kullanın</Text>
        </View>
      ) : (
        // İçerik varsa
        <FlatList
          data={posts}
          renderItem={({ item }) => <PostCard post={item} />}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#1565c0']}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
      {/* Çift navigasyon sorunu çözüldü - çubuğu tabs layouta taşıdık */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    paddingBottom: 70, // Alt navigasyon çubuğu için ekstra boşluk
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 70, // Alt navigasyon çubuğu için boşluk
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#e53935',
    textAlign: 'center',
    marginTop: 10,
  },
  secondaryText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 10,
  },
});
