import React from 'react';
import { View, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';

const CustomNavHeader = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  
  // Debug log kayıtları kaldırıldı
  
  // Auth sayfasında olup olmadığımızı kontrol et
  const isAuthPage = pathname.includes('(auth)');
  
  // Sadece auth sayfalarında gizle
  if (isAuthPage) {
    // Log kayıtları kaldırıldı
    return null;
  }
  
  // Kullanıcı kontrolünü kaldırıyoruz, çünkü bar her durumda görünmeli
  
  return (
    <View style={styles.navContainer}>
      <StatusBar backgroundColor="#1e88e5" barStyle="light-content" />
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            // Log kaldırıldı
            router.replace('/home');
          }}
        >
          <MaterialIcons name="home" size={24} color="#555" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            // Log kaldırıldı
            router.replace('/search');
          }}
        >
          <MaterialIcons name="search" size={24} color="#555" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            // Log kaldırıldı
            router.replace('/post/create');
          }}
        >
          <MaterialIcons name="add-circle" size={24} color="#1e88e5" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            // Log kaldırıldı
            router.replace('/profile');
          }}
        >
          <MaterialIcons name="person" size={24} color="#555" />
        </TouchableOpacity>
      </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#1e88e5',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    // Yüksek öncelik ve gizleme önleyicileri
    elevation: 1000,  
    zIndex: 100000,   
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  iconButton: {
    padding: 10,
  }
});

export default CustomNavHeader;
