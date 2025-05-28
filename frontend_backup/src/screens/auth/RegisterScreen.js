import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { api } from '../../services/api';
import { lightTheme as theme } from '../../utils/theme';

const RegisterScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !username) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    try {
      setLoading(true);
      // Firebase'de kullanıcı oluştur
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Backend'de kullanıcı oluştur
      await api.createUser({
        uid: user.uid,
        email: user.email,
        username,
      });
      
      // Auth context'te token güncellenecek
    } catch (error) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TravelGram'a Katılın</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Kullanıcı Adı"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="E-posta"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Şifre"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        onPress={() => navigation.navigate('Login')}
        style={styles.linkButton}
      >
        <Text style={styles.linkText}>
          Zaten hesabınız var mı? Giriş yapın
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  title: {
    ...theme.typography.h1,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.roundness.medium,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    color: theme.colors.primary,
  },
});

export default RegisterScreen;
