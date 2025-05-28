import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';

const AuthContext = createContext({
  user: null,
  loading: true,
  signOut: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Firebase'den token al
        const token = await user.getIdToken();
        // Token'ı local storage'a kaydet
        await AsyncStorage.setItem('userToken', token);
        setUser(user);
      } else {
        await AsyncStorage.removeItem('userToken');
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    try {
      await auth.signOut();
      await AsyncStorage.removeItem('userToken');
      setUser(null);
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
