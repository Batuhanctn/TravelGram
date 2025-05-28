import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, Animated, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const { register } = useAuth();
  
  const fadeAnim = useState(new Animated.Value(0))[0];
  
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setError(null);

      // 1. Giriş verilerini temizle ve kontrol et
      const trimmedUsername = username?.trim() || '';
      const trimmedEmail = email?.trim() || '';
      const trimmedPassword = password || '';

      // Form doğrulama
      const validationErrors = [];

      if (!trimmedUsername) validationErrors.push('Kullanıcı adı gerekli');
      else if (trimmedUsername.length < 3) validationErrors.push('Kullanıcı adı en az 3 karakter olmalı');

      if (!trimmedEmail) validationErrors.push('E-posta adresi gerekli');
      else if (!validateEmail(trimmedEmail)) validationErrors.push('Geçersiz e-posta formatı');

      if (!trimmedPassword) validationErrors.push('Şifre gerekli');
      else if (trimmedPassword.length < 6) validationErrors.push('Şifre en az 6 karakter olmalı');

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('\n'));
      }

      console.log('TEMEL FORM DOĞRULAMA BAŞARILI. Kayıt başlatılıyor...');

      // 2. Register fonksiyonunun mümkün olup olmadığını kontrol et
      if (typeof register !== 'function') {
        console.error('YENİ HATA: Register fonksiyonu bir fonksiyon değil', typeof register);
        throw new Error('Kayıt sistemi şu anda kullanılamıyor');
      }

      // 3. Kayıt işlemini başlat - Doğrudan Firebase'i kullanmak için
      const { getAuth, createUserWithEmailAndPassword, updateProfile } = require('firebase/auth');
      const { getDatabase, ref, set } = require('firebase/database');

      try {
        // 3.1 Firebase servislerini al
        const auth = getAuth();
        const db = getDatabase();
        
        console.log('Doğrudan kayıt işlemi başlatılıyor...', { username: trimmedUsername });
        
        // 3.2 Kullanıcı oluştur
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        
        if (!userCredential?.user) {
          throw new Error('Kullanıcı oluşturulamadı');
        }
        
        const user = userCredential.user;
        
        // 3.3 Profil güncelle
        await updateProfile(user, { displayName: trimmedUsername });
        
        // 3.4 Veritabanı kaydı oluştur
        const userRef = ref(db, `users/${user.uid}`);
        const userData = {
          username: trimmedUsername,
          email: trimmedEmail,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          uid: user.uid,
          photoURL: '',
          bio: '',
          followers: {},
          following: {}
        };
        
        await set(userRef, userData);
        console.log('Kullanıcı kaydı başarılı:', user.uid);
        
        // 3.5 Auth durumunu güncelle
        if (typeof setUser === 'function') {
          setUser(user);
        }

        console.log('KAYIT TAMAMEN BAŞARILI:', {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });
        
        // Kayıt başarılı mesajını göster ve yönlendir
        Alert.alert(
          'Başarılı', 
          'Hesabınız başarıyla oluşturuldu. Giriş yapabilirsiniz.',
          [{ text: 'Tamam', onPress: () => router.replace('/(auth)/login') }]
        );
      } catch (firebaseError) {
        // Firebase hata kodlarını yorumla
        console.error('DOĞRUDAN FIREBASE HATASI:', {
          code: firebaseError.code,
          message: firebaseError.message,
          name: firebaseError.name,
          stack: firebaseError.stack
        });
        
        // Hata mesajını insancıl hale getir
        let errorMsg = 'Kayıt işlemi başarısız oldu.';
        
        if (firebaseError.code === 'auth/email-already-in-use') {
          errorMsg = 'Bu e-posta adresi zaten kullanımda';
        } else if (firebaseError.code === 'auth/invalid-email') {
          errorMsg = 'Geçersiz e-posta formatı';
        } else if (firebaseError.code === 'auth/operation-not-allowed') {
          errorMsg = 'E-posta/şifre ile kayıt şu anda mümkün değil';
        } else if (firebaseError.code === 'auth/weak-password') {
          errorMsg = 'Şifre çok zayıf. En az 6 karakter kullanın';
        } else if (firebaseError.code === 'auth/network-request-failed') {
          errorMsg = 'İnternet bağlantınızı kontrol edin';
        }
        
        throw new Error(errorMsg);
      }

    } catch (error) {
      console.error('KAYIT HATASI (ANA CATCH):', {
        name: error.name,
        code: error.code,
        message: error.message,
        stack: error.stack
      });

      let errorMessage = 'Kayıt işlemi başarısız oldu.';

      // Hata mesajını daha anlaşılır hale getir
      if (error.message && error.message.includes('veritabanı')) {
        errorMessage = 'Kullanıcı kaydı oluşturuldu ancak kullanıcı bilgileri kaydedilemedi. Lütfen tekrar deneyin.';
      } else if (error.code === 'auth/email-already-in-use' || (error.message && error.message.includes('zaten kullanımda'))) {
        errorMessage = 'Bu e-posta adresi zaten kullanımda. Farklı bir e-posta adresi deneyin veya giriş yapın.';
      } else if (error.code === 'auth/invalid-email' || (error.message && error.message.includes('geçersiz e-posta'))) {
        errorMessage = 'Geçersiz e-posta adresi formatı.';
      } else if (error.code === 'auth/operation-not-allowed' || (error.message && error.message.includes('devre dışı'))) {
        errorMessage = 'E-posta/şifre ile kayıt şu anda mümkün değil. Lütfen daha sonra tekrar deneyin.';
      } else if (error.code === 'auth/weak-password' || (error.message && error.message.includes('şifre') && error.message.includes('zayıf'))) {
        errorMessage = 'Şifre çok zayıf, en az 6 karakter kullanın.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin ve tekrar deneyin.';
      } else if (error.code === 'auth/internal-error') {
        errorMessage = 'Firebase servisinde bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
      } else if (error.message) {
        // Hata mesajı varsa onu kullan, ancak uzun hata mesajlarını kırp
        errorMessage = error.message.length > 100 ? error.message.substring(0, 100) + '...' : error.message;
      }

      setError(errorMessage);
      Alert.alert('Kayıt Hatası', errorMessage);
      
      // Konsola hatanın tamamını yazdır
      console.log('Kullanıcı tarafından görülen hata mesajı:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1e88e5', '#1565c0']}
      style={styles.container}
    >
      <Animated.View 
        style={[styles.content, { opacity: fadeAnim }]}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <MaterialIcons name="photo-camera" size={64} color="#fff" />
          </View>
          <Text style={styles.title}>TravelGram</Text>
          <Text style={styles.subtitle}>Seyahat topluluğuna katılın</Text>
        </View>
      
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <MaterialIcons name="person" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Kullanıcı Adı"
              placeholderTextColor="#666"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E-posta"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        
          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.passwordToggle}
              onPress={() => setShowPassword(!showPassword)}
            >
              <MaterialIcons 
                name={showPassword ? "visibility-off" : "visibility"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Kayıt Ol</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.linkText}>
              Zaten hesabınız var mı? <Text style={styles.linkTextBold}>Giriş yapın</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 15,
  },
  inputIcon: {
    padding: 10,
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  passwordToggle: {
    padding: 10,
  },
  button: {
    backgroundColor: '#1565c0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#2196F3',
    fontSize: 16,
  },
  linkTextBold: {
    fontWeight: 'bold',
  },
});
