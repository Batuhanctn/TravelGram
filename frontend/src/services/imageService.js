import { getAuth } from 'firebase/auth';
import { app } from '../firebaseConfig';

const API_URL = 'http://192.168.1.172:5001/api/images';

// Kullanıcı bilgisini almak için yardımcı fonksiyon - Firebase Auth üzerinden direkt erişim
export const getAuthUser = () => {
  const firebaseAuth = getAuth(app);
  return firebaseAuth.currentUser;
};


/**
 * Resim yükleme servisi - MongoDB Atlas'a resim yükler
 */
export const uploadImageToMongoDB = async (imageFile, description = '', location = '') => {
  try {
    // Firebase üzerinden kullanıcı bilgisini al
    const firebaseAuth = getAuth(app);
    const user = firebaseAuth.currentUser;
    
    // Kullanıcı bulunamadıysa hata fırlat
    if (!user) {
      throw new Error('Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
    }

    // Token al
    const token = await user.getIdToken();
    console.log('Firebase Token (ilk 50 karakter):', token.substring(0, 50) + '...');
    console.log('Firebase UID:', user.uid);
    console.log('Auth Headers:', 'Bearer ' + token.substring(0, 15) + '...');
    
    // Form verisi oluştur
    const formData = new FormData();
    formData.append('image', {
      uri: imageFile,
      name: 'image.jpg',
      type: 'image/jpeg'
    });
    
    if (description) formData.append('description', description);
    if (location) formData.append('location', location);

    // API'ye istek gönder
    console.log('MongoDB API çağrısı yapılıyor:', API_URL + '/upload');
    
    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });
      
      // Response detaylarını logla
      console.log('API Yanıt Durum Kodu:', response.status);
      console.log('API Yanıt Headers:', JSON.stringify(response.headers));
      
      // Yanıt text'i al
      const responseText = await response.text();
      console.log('API Yanıt Text:', responseText);
      
      if (!response.ok) {
        throw new Error(`API Hatası (${response.status}): ${responseText}`);
      }
      
      // JSON'a çevirmeyi dene
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('JSON Parse Hatası:', jsonError);
        throw new Error(`JSON parse hatası: ${responseText}`);
      }
      
      console.log('Resim başarıyla yüklendi:', data);
      
      // MongoDB'ye yüklenen resmin URL'sini oluştur
      return `${API_URL}/${data.imageId}`;
    } catch (fetchError) {
      console.error('Fetch işlemi hatası:', fetchError);
      throw new Error(`API fetch hatası: ${fetchError.message}`);
    }
  } catch (error) {
    console.error('Resim yükleme hatası:', error.message);
    // Hata yönetimini daha net yapmak için
    if (error.message.includes('MongoDB') || error.message.includes('bağlanılamıyor')) {
      throw new Error('Sunucu bağlantı hatası: MongoDB sunucusu kapalı olabilir');
    } else if (error.message.includes('Oturum')) {
      throw new Error('Oturum açmanız gerekiyor. Lütfen tekrar giriş yapın.');
    } else {
      throw error;
    }
  }
};

/**
 * Kullanıcının resimlerini getir
 */
export const getUserImages = async () => {
  try {
    // Firebase üzerinden kullanıcı bilgisini al
    const firebaseAuth = getAuth(app);
    const user = firebaseAuth.currentUser;

    if (!user) {
      throw new Error('Oturum açmanız gerekiyor');
    }

    const token = await user.getIdToken();
    
    const response = await fetch(`${API_URL}/myimages`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Resimler alınırken bir hata oluştu');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Resimleri getirme hatası:', error);
    throw error;
  }
};

/**
 * Resmi sil
 */
export const deleteImage = async (imageId) => {
  try {
    // Firebase üzerinden kullanıcı bilgisini al
    const firebaseAuth = getAuth(app);
    const user = firebaseAuth.currentUser;

    // Kullanıcı bulunamadıysa hata fırlat
    if (!user) {
      throw new Error('Oturum açmanız gerekiyor');
    }

    const token = await user.getIdToken();
    
    const response = await fetch(`${API_URL}/${imageId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Resim silinirken bir hata oluştu');
    }

    return true;
  } catch (error) {
    console.error('Resim silme hatası:', error);
    throw error;
  }
};
