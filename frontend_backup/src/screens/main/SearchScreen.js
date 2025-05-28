import React, { useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  Text,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { api } from '../../services/api';
import { lightTheme as theme } from '../../utils/theme';

const SearchScreen = ({ navigation }) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (text) => {
    setQuery(text);
    if (text.length < 2) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      const results = await api.searchUsers(text);
      setUsers(results);
    } catch (error) {
      console.error('Arama yapılırken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderUser = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
    >
      <Image
        source={{ uri: item.avatar }}
        style={styles.avatar}
      />
      
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        {item.name && (
          <Text style={styles.name}>{item.name}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
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
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.md,
    marginRight: theme.spacing.md,
    fontSize: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    marginLeft: theme.spacing.md,
  },
  username: {
    fontWeight: 'bold',
  },
  name: {
    color: theme.colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default SearchScreen;
