import { getAuth } from 'firebase/auth';
import { app } from '../firebaseConfig';

const API_URL = 'http://192.168.1.172:5001/api/audio';

/**
 * Ses dosyasını MongoDB'ye yükler
 * @param {Object} audioFile - Ses dosyası URI
 * @param {String} imageId - İlişkilendirilen resim ID'si
 * @param {String} description - Ses kaydı açıklaması (opsiyonel)
 * @returns {Promise<String>} - MongoDB'den dönen ses URL'i
 */
export const uploadAudioToMongoDB = async (audioUri, imageId, description = '') => {
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

    // Form verisi oluştur
    const formData = new FormData();
    
    // Ses dosyası ekle
    if (audioUri) {
      console.log('Ses dosyası yükleniyor:', audioUri);
      
      // Base64 değil, dosya olarak yükle
      const audioParts = audioUri.split('/');
      const audioName = audioParts[audioParts.length - 1];
      
      formData.append('audio', {
        uri: audioUri,
        name: audioName || 'audio.m4a',
        type: 'audio/m4a'
      });
    } else {
      throw new Error('Geçerli bir ses dosyası bulunamadı');
    }
    
    // İlişkili resim ID'sini ekle
    formData.append('imageId', imageId);
    
    // Diğer ek bilgileri ekle 
    formData.append('description', description || '');
    formData.append('userId', user.uid);

    console.log('Ses dosyası MongoDB\'ye yükleniyor...');
    
    // API isteği yap
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    // Yanıtı kontrol et
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Ses yükleme hatası');
    }

    // Başarılı yanıtı al
    const data = await response.json();
    console.log('Ses dosyası MongoDB\'ye başarıyla yüklendi:', data);
    
    return data.audioUrl || data.url;
  } catch (error) {
    console.error('Ses yükleme hatası:', error);
    throw error;
  }
};

/**
 * Belirli bir resme ait ses dosyasını MongoDB'den getirir
 * @param {String} imageId - İlişkilendirilen resim ID'si
 * @returns {Promise<Object>} - Ses dosyası bilgileri
 */
export const getAudioForImage = async (imageId) => {
  try {
    // Firebase üzerinden kullanıcı bilgisini al
    const firebaseAuth = getAuth(app);
    const user = firebaseAuth.currentUser;
    
    // Kullanıcı bulunamadıysa hata fırlat
    if (!user) {
      throw new Error('Kullanıcı oturumu bulunamadı');
    }

    // Token al
    const token = await user.getIdToken();

    // API isteği yap
    const response = await fetch(`${API_URL}/image/${imageId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Yanıtı kontrol et
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Ses getirme hatası');
    }

    // Başarılı yanıtı al
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ses getirme hatası:', error);
    throw error;
  }
};

/**
 * Ses dosyasını MongoDB'den siler
 * @param {String} audioId - Silinecek ses dosyası ID'si
 * @returns {Promise<Object>} - Silme işlemi sonucu
 */
export const deleteAudio = async (audioId) => {
  try {
    // Firebase üzerinden kullanıcı bilgisini al
    const firebaseAuth = getAuth(app);
    const user = firebaseAuth.currentUser;
    
    // Kullanıcı bulunamadıysa hata fırlat
    if (!user) {
      throw new Error('Kullanıcı oturumu bulunamadı');
    }

    // Token al
    const token = await user.getIdToken();

    // API isteği yap
    const response = await fetch(`${API_URL}/${audioId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Yanıtı kontrol et
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Ses silme hatası');
    }

    // Başarılı yanıtı al
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Ses silme hatası:', error);
    throw error;
  }
};
