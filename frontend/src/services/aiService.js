import { getAuth } from 'firebase/auth';
import { app } from '../firebaseConfig';

const API_BASE_URL = 'http://192.168.1.172:5001/api';

// Firebase token'ı alma fonksiyonu
const getAuthToken = async () => {
  try {
    const auth = getAuth(app);
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Kullanıcı oturumu bulunamadı');
    }
    
    const token = await user.getIdToken(true);
    return token;
  } catch (error) {
    console.error('Token alma hatası:', error);
    throw error;
  }
};

export const analyzeImage = async (imageUrl) => {
  try {
    // Firebase token'ı al
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/ai/analyze-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      throw new Error('AI analiz hatası');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('AI servis hatası:', error);
    throw error;
  }
};

export const generateDescription = async (imageUrl) => {
  try {
    console.log('AI analizi için istek gönderiliyor:', imageUrl);
    
    // Firebase token'ı al
    const token = await getAuthToken();
    console.log('AI analizi için token alındı, ilk 20 karakter:', token.substring(0, 20));
    
    const response = await fetch(`${API_BASE_URL}/ai/generate-description`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ imageUrl }),
    });
    
    console.log('AI analizi yanıt durumu:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Yanıt metni alınamadı');
      console.error('AI servis yanıt metni:', errorText);
      throw new Error(`Açıklama oluşturma hatası: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('AI analizi başarılı, veri alındı:', data);
    return data;
  } catch (error) {
    console.error('AI servis hatası:', error);
    // Hata detaylarını Console'a yazdır
    if (error.message) console.error('Hata mesajı:', error.message);
    if (error.stack) console.error('Hata yığını:', error.stack);
    
    // UI'a döndürmek için daha kullanıcı dostu bir hata yapısı oluştur
    throw {
      error: true,
      message: `AI analizi yapılırken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`,
      originalError: error
    };
  }
};

export const calculateScore = async (imageUrl) => {
  try {
    // Firebase token'ı al
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/ai/calculate-score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      throw new Error('Puan hesaplama hatası');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('AI servis hatası:', error);
    throw error;
  }
};
