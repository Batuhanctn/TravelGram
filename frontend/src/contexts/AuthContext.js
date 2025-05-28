import React, { createContext, useState, useContext, useEffect } from 'react';
import { getAuth, onAuthStateChanged, updateProfile, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ref, set, get, update } from 'firebase/database';
import { getDatabase } from 'firebase/database';
import { app } from '../firebaseConfig';

const AuthContext = createContext({
  user: null,
  loading: true,
  register: async () => {},
  login: async () => {},
  logout: async () => {},
  updateUserProfile: async () => {},
  getCurrentUser: () => {}
});

// Firebase hata mesajlarını Türkçeleştir
const getFirebaseErrorMessage = (errorCode) => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresi zaten kullanımda';
    case 'auth/invalid-email':
      return 'Geçersiz e-posta adresi';
    case 'auth/operation-not-allowed':
      return 'E-posta/şifre girişi etkin değil';
    case 'auth/weak-password':
      return 'Şifre çok zayıf';
    case 'auth/user-disabled':
      return 'Bu kullanıcı hesabı devre dışı bırakılmış';
    case 'auth/user-not-found':
      return 'Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı';
    case 'auth/wrong-password':
      return 'Hatalı şifre';
    case 'auth/too-many-requests':
      return 'Çok fazla başarısız giriş denemesi. Lütfen daha sonra tekrar deneyin';
    default:
      return 'Bir hata oluştu. Lütfen tekrar deneyin';
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Firebase Auth ile kullanıcı doğrulama
  useEffect(() => {
    // Firebase Auth üzerinden tek bir auth nesnesi kullan
    const firebaseAuth = getAuth(app);
    
    // Kullanıcı giriş/çıkış durumunu dinle
    const unsubscribe = onAuthStateChanged(firebaseAuth, (authUser) => {
      if (authUser) {
        // Kullanıcı giriş yaptıysa state'i güncelle
        setUser(authUser);
      } else {
        // Kullanıcı çıkış yaptıysa state'i null olarak ayarla
        setUser(null);
      }
      
      // Yükleme işlemini tamamla
      setLoading(false);
    });
    
    // Dinleyiciyi temizle
    return () => unsubscribe();
  }, []);

  const register = async (username, email, password) => {
    // Temel değişkenler
    let user = null;

    try {
      // Giriş verilerini kontrol et
      if (!username?.trim()) throw new Error('Kullanıcı adı gerekli');
      if (!email?.trim()) throw new Error('E-posta adresi gerekli');
      if (!password?.trim()) throw new Error('Şifre gerekli');
      if (password.length < 6) throw new Error('Şifre en az 6 karakter olmalı');
      
      // E-posta formatını kontrol et
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw new Error('Geçerli bir e-posta adresi girin');
      }

      // Değişkenleri temizle
      const trimmedUsername = username.trim();
      const trimmedEmail = email.trim();
      
      // Firebase Auth ile doğrudan erişim
      const firebaseAuth = getAuth(app);
      
      // Kullanıcı oluştur
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, trimmedEmail, password);
      
      if (!userCredential?.user) {
        throw new Error('Kullanıcı oluşturulamadı');
      }
      
      user = userCredential.user;
      
      // Kullanıcı profilini güncelle
      await updateProfile(user, {
        displayName: trimmedUsername
      });
      
      // Veritabanı kaydı oluştur
      const db = getDatabase(app);
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
      console.log('Kullanıcı veritabanına kaydedildi');
      
      // Auth state güncelle
      setUser(user);
      
      console.log('Kayıt tamamen başarılı:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      });
      
      return user;
      
    } catch (error) {
      console.error('KAYIT HATASI:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // Eğer kullanıcı oluşturulmuşsa ama bir hata olduysa, kullanıcıyı sil
      if (user) {
        try {
          await user.delete();
          console.log('Hata nedeniyle kullanıcı silindi');
        } catch (deleteError) {
          console.error('Kullanıcı silinirken hata:', deleteError.message);
        }
      }
      
      // Firebase hata kodlarını insancıl mesajlara çevir
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Bu e-posta adresi zaten kullanımda');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Geçersiz e-posta formatı');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Şifre çok zayıf. En az 6 karakter kullanın');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('E-posta/şifre ile kayıt şu anda mümkün değil');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('İnternet bağlantınızı kontrol edin');
      }
      
      // Diğer hatalar için
      throw new Error('Kayıt işlemi başarısız oldu: ' + error.message);
    }
  };

  const login = async (email, password) => {
    // Giriş parametrelerini kontrol et
    if (!email?.trim() || !password) {
      throw new Error('E-posta ve şifre gereklidir');
    }
    
    try {
      // Firebase Auth ile doğrudan erişim
      const firebaseAuth = getAuth(app);
      
      // Oturum açma işlemi
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      
      // Kullanıcı credential kontrolü
      if (!userCredential?.user) {
        throw new Error('Giriş başarısız: Kullanıcı bilgisi alınamadı');
      }
      
      const user = userCredential.user;
      
      // Kullanıcı veritabanı varlığını kontrol et
      try {
        const db = getDatabase(app);
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        
        if (!snapshot.exists()) {
          // Kullanıcı veritabanında yoksa oluştur
          const userData = {
            email: user.email,
            username: user.displayName || email.split('@')[0],
            createdAt: new Date().toISOString(),
            uid: user.uid
          };
          
          await set(userRef, userData);
        }
      } catch (dbError) {
        // Veritabanı hatası giriş işlemini engellemeyecek
        console.error('Veritabanı güncelleme hatası:', dbError);
      }
      
      // State'i güncelle - onAuthStateChanged tarafından otomatik olarak yapılacak
      // setUser(user); 
      
      return user;
      
    } catch (error) {
      console.error('LOGIN GENEL HATASI:', {
        name: error.name,
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      
      // Hata zaten işlemden geçmişse direkt fırlat
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Firebase Auth ile doğrudan erişim
      const firebaseAuth = getAuth(app);
      
      // Kullanıcı çıkış işlemi
      await signOut(firebaseAuth);
      
      // State onAuthStateChanged tarafından otomatik olarak güncellenecek
      // setUser(null);
      
      return true;
    } catch (error) {
      console.error('Çıkış işlemi hatası:', error);
      throw error;
    }
  };

  const updateUserProfile = async (profileData) => {
    try {
      // Firebase Auth ile doğrudan erişim
      const firebaseAuth = getAuth(app);
      const user = firebaseAuth.currentUser;
      
      if (!user) {
        throw new Error('Profil güncellemek için oturum açmanız gerekmektedir');
      }
      
      // Profil güncelleme işlemi
      await updateProfile(user, profileData);
      
      // Veritabanı güncellemesi
      const db = getDatabase(app);
      const userRef = ref(db, `users/${user.uid}`);
      await update(userRef, {
        ...profileData,
        updatedAt: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      throw new Error('Profil güncellenemedi');
    }
  };

  // Mevcut kullanıcı bilgilerini döndüren fonksiyon
  const getCurrentUser = () => {
    // Firebase Auth ile doğrudan erişim
    const firebaseAuth = getAuth(app);
    return firebaseAuth.currentUser;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      register, 
      login, 
      logout, 
      updateUserProfile,
      getCurrentUser,
      isAuthenticated: !!user
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
