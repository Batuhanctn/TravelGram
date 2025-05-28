import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { lightTheme as theme } from '../../utils/theme';
import { useAuth } from '../../contexts/AuthContext';
import { searchUsers, followUser, unfollowUser } from '../../services/userService';

const SearchScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState({});

  // Basitleştirilmiş doğrudan arama fonksiyonu
  const handleSearch = async (text) => {
    setQuery(text);
    
    // En az 2 karakter gerekli
    if (text.length < 2) {
      setUsers([]);
      return;
    }
  };
  
  // Manuel arama butonu için
  const handleSearchSubmit = async () => {
    if (query.length < 2) {
      Alert.alert('Uyarı', 'En az 2 karakter girmelisiniz');
      return;
    }
    
    console.log('[ARA BUTONU] Arama yapılıyor:', query);
    try {
      setLoading(true);
      Alert.alert('Arama Başlatılıyor', `"${query}" araması başlatılıyor`);
      
      // Arama servisini çağır
      const searchResults = await searchUsers(query);
      console.log('[ARA BUTONU] Arama sonuçları:', searchResults);
      
      // Kendimizi arama sonuçlarından çıkaralım
      const filteredResults = searchResults.filter(u => u.id !== user?.uid);
      setUsers(filteredResults);
    } catch (error) {
      console.error('[ARA BUTONU] Arama hatası:', error);
      Alert.alert('Arama Hatası', `Hata mesajı: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Kullanıcı takip et/bırak
  const handleFollowToggle = async (userId, isFollowing) => {
    try {
      // Durumu takip etmek için yükleniyor durumunu ayarla
      setFollowLoading({...followLoading, [userId]: true});
      
      // Kullanıcıyı takip et veya takibi bırak
      if (isFollowing) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
      
      // Başarılı olduğunda kullanıcı listesini güncelle
      setUsers(users.map(user => {
        if (user.id === userId) {
          return {
            ...user,
            isFollowing: !isFollowing
          };
        }
        return user;
      }));
    } catch (error) {
      console.error('Takip işlemi sırasında hata:', error);
      Alert.alert(
        'Hata', 
        isFollowing ? 'Takipten çıkarma işlemi başarısız oldu' : 'Takip etme işlemi başarısız oldu'
      );
    } finally {
      // Yükleniyor durumunu temizle
      setFollowLoading({...followLoading, [userId]: false});
    }
  };

  // Kullanıcı öğesi render
  const renderUser = ({ item }) => {
    const isFollowing = item.isFollowing;
    const isLoading = followLoading[item.id] || false;

    return (
      <View style={styles.userItem}>
        <TouchableOpacity 
          style={styles.userProfile}
          onPress={() => navigation.navigate('ProfileScreen', { userId: item.id })}
        >
          <Image
            source={item.profilePhoto ? { uri: item.profilePhoto } : require('../../assets/default-avatar.png')}
            style={styles.avatar}
          />
          
          <View style={styles.userInfo}>
            <Text style={styles.username}>{item.username}</Text>
            {item.name && (
              <Text style={styles.name}>{item.name}</Text>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.followButton, isFollowing ? styles.followingButton : {}]}
          onPress={() => handleFollowToggle(item.id, isFollowing)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.background} />
          ) : (
            <Text style={[styles.followButtonText, isFollowing ? styles.followingButtonText : {}]}>
              {isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kullanıcı Ara</Text>

      {/* Arama Çubuğu */}
      <View style={styles.searchBar}>
        <Icon name="search" size={24} color={theme.colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Kullanıcı ara..."
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              setUsers([]);
            }}
          >
            <Icon name="close" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Ara Butonu */}
      <TouchableOpacity 
        style={styles.searchButton} 
        onPress={handleSearchSubmit}
      >
        {loading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={styles.searchButtonText}>ARA</Text>
        )}
      </TouchableOpacity>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        ListEmptyComponent={
          query.length > 0 && !loading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Kullanıcı bulunamadı
              </Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.borderRadius,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: theme.spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  name: {
    color: theme.colors.textLight,
    fontSize: 14,
  },
  followButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  followButtonText: {
    color: theme.colors.background,
    fontWeight: 'bold',
    fontSize: 14,
  },
  followingButtonText: {
    color: theme.colors.primary,
  },
  emptyResult: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textLight,
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SearchScreen;
