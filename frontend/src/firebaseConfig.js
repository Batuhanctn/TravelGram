import { initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  getReactNativePersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
  getAuth
} from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase hatalarını yakalamak için global hata dinleyicisi
if (Platform.OS !== 'web') {
  const handlePromiseRejection = ({ reason }) => {
    if (reason instanceof Error) {
      console.error('Firebase Promise Rejection:', {
        name: reason.name,
        message: reason.message,
        code: reason.code,
        stack: reason.stack
      });
    } else {
      console.error('Firebase Promise Rejection (Non-Error):', reason);
    }
  };

  global.ErrorUtils.setGlobalHandler(handlePromiseRejection);
}

// .env değerlerini kontrol et
console.log('ENV DEĞERLERİ:', {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? 'var' : 'yok',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'var' : 'yok',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ? 'var' : 'yok',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ? 'var' : 'yok',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? 'var' : 'yok',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ? 'var' : 'yok',
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL ? 'var' : 'yok'
});

// .env değişkenlerini doğrudan kullanmak yerine sabit değerler kullanalim
const firebaseConfig = {
  apiKey: "AIzaSyB14vb6PR3FETtmEVNTAwa9Us1VnHAeWMw", 
  authDomain: "travelgram-8b530.firebaseapp.com",
  projectId: "travelgram-8b530",
  storageBucket: "travelgram-8b530.appspot.com",
  messagingSenderId: "414259750436",
  appId: "1:414259750436:web:68e4e8cd873c189fb2dab1",
  databaseURL: "https://travelgram-8b530-default-rtdb.europe-west1.firebasedatabase.app"
};

// Kontrol için çıktı ver
console.log('Firebase konfigürasyonu yüklendi:', {
  apiKey: firebaseConfig.apiKey ? firebaseConfig.apiKey.slice(0, 5) + '...' : 'eksik',
  authDomain: firebaseConfig.authDomain || 'eksik',
  databaseURL: firebaseConfig.databaseURL || 'eksik'
});

// Firebase yapılandırmasını kontrol et
Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value) {
    console.error(`Firebase yapılandırma hatası: ${key} eksik!`);
  }
});

console.log('Firebase yapılandırması yükleniyor...');

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

// Firebase Auth başlatılıyor
console.log('Firebase Auth başlatılıyor...');
console.log('Platform:', Platform.OS);

// Auth nesnesini oluştur
let auth;
try {
  // AsyncStorage ile persistence başlatılıyor
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
  console.log('Firebase Auth başarıyla başlatıldı');
} catch (error) {
  console.error('Auth başlatma hatası:', error);
  // Varsayılan auth kullanmayı dene
  try {
    const { getAuth } = require('firebase/auth');
    auth = getAuth(app);
    console.log('Varsayılan Firebase Auth başarıyla başlatıldı');
  } catch (fallbackError) {
    console.error('Varsayılan Auth başlatma hatası:', fallbackError);
    throw new Error('Firebase Auth başlatılamadı');
  }
}

// Auth nesnesini kontrol et
if (!auth) {
  console.error('Auth nesnesi oluşturulamadı, varsayılan getAuth metodunu deniyoruz...');
  auth = getAuth(app);
  
  if (!auth) {
    throw new Error('Auth nesnesi oluşturulamadı!');
  }
}

// Firebase Auth başarıyla yapılandırıldı
console.log('Firebase Auth başarıyla yapılandırıldı:', {
  platform: Platform.OS,
  currentUser: auth.currentUser ? 'var' : 'yok',
  isInitialized: auth ? 'evet' : 'hayır',
  authOptions: Object.keys(auth).filter(key => typeof auth[key] !== 'function').join(', ')
});

// Auth metodlarını kontrol et
console.log('Auth metod kontrolü:', {
  signIn: typeof signInWithEmailAndPassword === 'function' ? 'çalışıyor' : 'hata',
  createUser: typeof createUserWithEmailAndPassword === 'function' ? 'çalışıyor' : 'hata',
  updateProfile: typeof updateProfile === 'function' ? 'çalışıyor' : 'hata'
});

// Database ve Storage yapılandırması
let db, storage;
try {
  db = getDatabase(app);
  storage = getStorage(app);
  console.log('Firebase servisleri başarıyla yapılandırıldı');
} catch (error) {
  console.error('Firebase servis yapılandırma hatası:', error);
}

// Cloud Messaging sadece web'de çalışır
let messaging = null;
if (Platform.OS === 'web') {
  try {
    messaging = getMessaging(app);
    console.log('Firebase Cloud Messaging başarıyla yapılandırıldı');
  } catch (error) {
    console.error('Firebase Cloud Messaging yapılandırma hatası:', error);
  }
}

// Firebase metodlarının durumunu kontrol et
console.log('Firebase metodları kontrol ediliyor:', {
  auth: typeof auth,
  db: typeof db,
  createUserWithEmailAndPassword: typeof createUserWithEmailAndPassword,
  signInWithEmailAndPassword: typeof signInWithEmailAndPassword,
  updateProfile: typeof updateProfile,
  onAuthStateChanged: typeof onAuthStateChanged,
  signOut: typeof signOut
});

// Firebase servislerini ve metodları export et
// Tüm Firebase servislerini ve metodları export et
export { 
  auth, 
  db, 
  storage, 
  messaging,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut,
  getAuth,
  app // Uygulama referansını da dışa aktar
};
