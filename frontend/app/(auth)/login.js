import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, Animated, Platform, ActivityIndicator } from 'react-native';
import { router, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
// Logo yerine geçici olarak MaterialIcons kullanacağız
// import logo from '../../assets/logo.png';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  
  const fadeAnim = useState(new Animated.Value(0))[0];
  
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }
    
    setIsLoading(true);

    try {
      console.log('HANDLE LOGIN BAŞLATILDI:', { emailLength: email.length });
      
      // Doğrudan Firebase kullanalım
      const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
      const auth = getAuth();
      
      console.log('Doğrudan Firebase ile giriş deneniyor...');
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      
      if (!userCredential?.user) {
        throw new Error('Firebase kullanıcı dönmedi');
      }
      
      const user = userCredential.user;
      console.log('Firebase giriş başarılı!', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'ayarlanmamış'
      });
      
      // Global auth context'i güncelle (isteğe bağlı)
      if (typeof setUser === 'function') {
        setUser(user);
        console.log('Global auth context güncellendi');
      }
      
      // Başarılı giriş - yönlendir
      router.replace('/home');
    } catch (error) {
      console.error('LOGIN FİREBASE HATASI:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // Kullanıcıya anlaşılır bir hata mesajı göster
      let errorMessage = 'Giriş yapılamadı.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı. Lütfen önce kayıt olun.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Geçersiz e-posta formatı.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Çok fazla başarısız deneme. Lütfen daha sonra tekrar deneyin.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'İnternet bağlantınızı kontrol edin.';
      }
      
      Alert.alert('Giriş Hatası', errorMessage);
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
          <Text style={styles.subtitle}>Seyahatlerinizi paylaşın</Text>
        </View>
      
        <View style={styles.form}>
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
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.linkText}>
              Hesabınız yok mu? <Text style={styles.linkTextBold}>Kayıt olun</Text>
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
});
