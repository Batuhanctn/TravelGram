import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ref, query, orderByChild, startAt, endAt, get } from 'firebase/database';
import { db } from '../../../src/firebaseConfig';

const { width } = Dimensions.get('window');
const POST_SIZE = width / 2 - 15;

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('location'); // 'location' veya 'user'
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const router = useRouter();

  useEffect(() => {
    // Son aramaları localStorage'dan yükle
    loadRecentSearches();
    
    // Başlangıçta kullanıcı aramayı seçili hale getir
    setSearchType('user');
  }, []);
  
  // Kullanıcı yazdıkça otomatik olarak kullanıcı ara
  useEffect(() => {
    if (searchType === 'user' && searchQuery.length > 0) {
      const delaySearch = setTimeout(() => {
        handleSearch();
      }, 500); // Yazım bittikten 500ms sonra arama yap
      
      return () => clearTimeout(delaySearch);
    }
  }, [searchQuery, searchType]);

  const loadRecentSearches = async () => {
    try {
      // Son aramalar burada yüklenecek
      setRecentSearches([
        'İstanbul',
        'Kapadokya',
        'Antalya',
        'İzmir',
      ]);
    } catch (error) {
      console.error('Son aramalar yüklenirken hata:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // Boş arama durumunda sonuçları temizle
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      let searchResults = [];

      if (searchType === 'location') {
        // Konuma göre arama
        const postsRef = query(
          ref(db, 'posts'),
          orderByChild('location'),
          startAt(searchQuery.toLowerCase()),
          endAt(searchQuery.toLowerCase() + '\uf8ff')
        );
        
        const snapshot = await get(postsRef);
        if (snapshot.exists()) {
          searchResults = Object.entries(snapshot.val()).map(([id, post]) => ({
            id,
            ...post,
            resultType: 'post'
          }));
        }
      } else {
        // Kullanıcıya göre arama
        console.log('Kullanıcılar aranıyor:', searchQuery);
        // Firebase'de kullanıcı arayalım
        try {
          // Önce doğrudan kullanıcı adı ile arama yapalım
          const usersRef = ref(db, 'users');
          const snapshot = await get(usersRef);
          
          if (snapshot.exists()) {
            // Tüm kullanıcılar arasında arama yap
            const usersData = snapshot.val();
            const userMatches = [];
            
            // Tüm kullanıcılar üzerinde döngü oluşturup aranan metni içerenleri bulalım
            Object.entries(usersData).forEach(([id, user]) => {
              const username = (user.username || user.displayName || '').toLowerCase();
              const displayName = (user.displayName || '').toLowerCase();
              const query = searchQuery.toLowerCase();
              
              if (username.includes(query) || displayName.includes(query)) {
                userMatches.push({
                  id,
                  ...user,
                  resultType: 'user'
                });
              }
            });
            
            // Sonuçları ekle
            searchResults = userMatches;
            console.log(`Bulunan kullanıcı sayısı: ${userMatches.length}`);
          }
        } catch (error) {
          console.error('Kullanıcı arama hatası:', error);
        }
      }

      // Sonuçları tarihe göre sırala
      searchResults.sort((a, b) => b.createdAt - a.createdAt);
      setResults(searchResults);

      // Son aramalara ekle
      if (!recentSearches.includes(searchQuery)) {
        const updatedSearches = [searchQuery, ...recentSearches].slice(0, 5);
        setRecentSearches(updatedSearches);
        // localStorage'a kaydet
      }
    } catch (error) {
      console.error('Arama hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sonuçlara göre farklı render fonksiyonları
  const renderPostResult = (item) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => router.push(`/post/${item.id}`)}
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.resultImage}
        resizeMode="cover"
      />
      <View style={styles.resultOverlay}>
        <Text style={styles.resultLocation} numberOfLines={1}>
          {item.location}
        </Text>
        <View style={styles.resultStats}>
          <MaterialIcons name="favorite" size={16} color="#fff" />
          <Text style={styles.resultStatText}>
            {item.likes?.length || 0}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
  
  const renderUserResult = (item) => (
    <TouchableOpacity
      style={styles.userResultItem}
      onPress={() => router.push(`/user-profile/${item.uid}`)}
    >
      <Image
        source={{ uri: item.photoURL || 'https://via.placeholder.com/100' }}
        style={styles.userAvatar}
      />
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username || item.displayName}</Text>
        {(item.fullName || item.displayName) !== (item.username || item.displayName) && (
          <Text style={styles.userFullName}>{item.fullName || item.displayName}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }) => {
    if (item.resultType === 'user') {
      return renderUserResult(item);
    } else {
      return renderPostResult(item);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={24} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder='Kullanıcı ara...'
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <MaterialIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#1DA1F2" />
      ) : results.length > 0 ? (
        // Arama sonuçlarını göster
        <FlatList
          data={results}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.id || item.uid}
          contentContainerStyle={styles.resultsContainer}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.resultSeparator} />}
        />
      ) : searchQuery ? (
        // Sonuç yoksa
        <View style={styles.noResultsContainer}>
          <MaterialIcons name="search-off" size={64} color="#ccc" />
          <Text style={styles.noResultsText}>Kullanıcı bulunamadı</Text>
          <Text style={styles.noResultsSubtext}>Lütfen farklı bir kullanıcı adı deneyin</Text>
        </View>
      ) : (
        // Önerilen kullanıcıları göster
        <View style={styles.suggestedUsersContainer}>
          <Text style={styles.suggestedUsersTitle}>Önerilen Kullanıcılar</Text>
          <Text style={styles.suggestedUsersSubtitle}>Aramaya başlamak için yukarıdaki arama çubuğuna dokunun</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Kullanıcı arama sonuçları için stiller
  userResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#262626',
  },
  userFullName: {
    fontSize: 14,
    color: '#8e8e8e',
    marginTop: 2,
  },
  // Arama sayfası için yeni stiller
  resultsContainer: {
    paddingBottom: 20,
  },
  resultSeparator: {
    height: 1,
    backgroundColor: '#efefef',
    marginLeft: 60, // Avatar genişliğinden sonra başlasın
  },
  loader: {
    marginTop: 30,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#262626',
    marginTop: 15,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#8e8e8e',
    textAlign: 'center',
    marginTop: 8,
  },
  suggestedUsersContainer: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 15,
  },
  suggestedUsersTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#262626',
    marginBottom: 5,
  },
  suggestedUsersSubtitle: {
    fontSize: 14,
    color: '#8e8e8e',
    marginBottom: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  searchTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  searchTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  activeSearchType: {
    backgroundColor: '#e3f2fd',
  },
  searchTypeText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
  },
  activeSearchTypeText: {
    color: '#1565c0',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    padding: 10,
  },
  resultRow: {
    justifyContent: 'space-between',
  },
  resultItem: {
    width: POST_SIZE,
    height: POST_SIZE,
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 10,
    justifyContent: 'space-between',
  },
  resultLocation: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  resultStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultStatText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '500',
  },
  recentContainer: {
    padding: 20,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  recentText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
});
