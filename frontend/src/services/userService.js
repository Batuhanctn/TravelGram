import { auth } from './firebase';

// API URL'ini doğru port ve IP ile yeniden tanımla
const IP_ADDRESS = '192.168.1.172';
const PORT = '5001';
const API_URL = `http://${IP_ADDRESS}:${PORT}/api`;

console.log('KULLANICI SERVİSİ AYARLANIYOR:');
console.log('- API URL:', API_URL);
console.log('- Kullanılan IP:', IP_ADDRESS);
console.log('- Kullanılan Port:', PORT);

// Firebase'den kimlik token'ı alma işlevi
const getAuthToken = async () => {
  try {
    const token = await auth.currentUser?.getIdToken(true);
    return token;
  } catch (error) {
    console.error('Token alınamadı:', error);
    throw error;
  }
};

// Kullanıcı arama
export const searchUsers = async (query) => {
  try {
    console.log('======== KULLANICI ARAMA BAŞLADI ========');
    console.log(`Aranan terim: "${query}"`);
    
    const token = await getAuthToken();
    console.log('Token alındı (ilk 20 karakter):', token ? token.substring(0, 20) + '...' : 'Token yok');
    
    if (!token) {
      throw new Error('Kimlik doğrulama gerekli');
    }
    
    // URL'i oluştur ve log ekle
    const searchUrl = `${API_URL}/users/search?q=${encodeURIComponent(query)}`;
    console.log(`===== ARAMA İSTEĞİ GÖNDERİLİYOR =====`);
    console.log(`API URL: ${API_URL}`);
    console.log(`Tam URL: ${searchUrl}`);
    console.log(`Metot: GET`);
    console.log(`Authorization: Bearer ${token.substring(0, 10)}...`);
    
    let response;
    
    try {
      // İsteği gönder ve yanıtı bekle
      response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('API yanıt durum kodu:', response.status);
      console.log('API yanıt headers:', JSON.stringify([...response.headers.entries()]));
      console.log(`Yanıt alındı - Durum kodu: ${response.status}`);
    } catch (networkError) {
      console.error(`NETWORK HATA! İstek başarısız:`, networkError);
      console.error(`Tam hata mesajı: ${networkError.message}`);
      alert(`Network hatası: ${networkError.message}. Lütfen bağlantınızı kontrol edin.`);
      throw new Error(`Network hatası: ${networkError.message}`);
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API hata yanıtı: ${errorText}`);
      throw new Error(`Kullanıcı araması başarısız (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    console.log('API yanıtı (data):', data);
    
    if (!data.users) {
      console.warn('Uyarı: API yanıtında "users" alanı bulunamadı. Tam yanıt:', data);
      // Backend'in döndürdüğü formatı kontrol et, doğrudan data dönebilir mi?
      const users = Array.isArray(data) ? data : [];
      console.log('Dönen kullanıcı sayısı:', users.length);
      console.log('======== KULLANICI ARAMA TAMAMLANDI ========');
      return users;
    }
    
    console.log('Dönen kullanıcı sayısı:', data.users.length);
    console.log('======== KULLANICI ARAMA TAMAMLANDI ========');
    return data.users || [];
  } catch (error) {
    console.error('Kullanıcı arama hatası:', error);
    console.error('Hata ayrıntıları:', error.message);
    throw error;
  }
};

// Kullanıcı profili getirme
export const getUserProfile = async (userId) => {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('Kimlik doğrulama gerekli');
    }
    
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Kullanıcı profili alınamadı: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Kullanıcı profili getirme hatası:', error);
    throw error;
  }
};

// Kullanıcı takip etme
export const followUser = async (userId) => {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('Kimlik doğrulama gerekli');
    }
    
    const response = await fetch(`${API_URL}/users/${userId}/follow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Kullanıcı takip edilemedi: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Kullanıcı takip etme hatası:', error);
    throw error;
  }
};

// Kullanıcı takibi bırakma
export const unfollowUser = async (userId) => {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('Kimlik doğrulama gerekli');
    }
    
    const response = await fetch(`${API_URL}/users/${userId}/unfollow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Kullanıcı takibi bırakılamadı: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Kullanıcı takibi bırakma hatası:', error);
    throw error;
  }
};

// Takipçileri getirme
export const getFollowers = async (userId) => {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('Kimlik doğrulama gerekli');
    }
    
    const response = await fetch(`${API_URL}/users/${userId}/followers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Takipçiler alınamadı: ${response.status}`);
    }
    
    const data = await response.json();
    return data.followers || [];
  } catch (error) {
    console.error('Takipçileri getirme hatası:', error);
    throw error;
  }
};

// Takip edilenleri getirme
export const getFollowing = async (userId) => {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('Kimlik doğrulama gerekli');
    }
    
    const response = await fetch(`${API_URL}/users/${userId}/following`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Takip edilenler alınamadı: ${response.status}`);
    }
    
    const data = await response.json();
    return data.following || [];
  } catch (error) {
    console.error('Takip edilenleri getirme hatası:', error);
    throw error;
  }
};
