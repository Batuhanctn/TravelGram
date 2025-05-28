import { API_URL } from './api';
import { auth } from './firebase';

// Kullanıcı profili için gönderileri getir
export const getUserPosts = async (userId) => {
  try {
    // Firebase token'ı al
    const token = await auth.currentUser?.getIdToken(true);
    
    if (!token) {
      throw new Error('Kimlik doğrulama gerekli');
    }
    
    const response = await fetch(`${API_URL}/images/profile/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Kullanıcı gönderileri alınamadı: ${response.status}`);
    }
    
    const data = await response.json();
    return data.images || [];
  } catch (error) {
    console.error('Kullanıcı gönderilerini getirme hatası:', error);
    throw error;
  }
};

// Ana sayfa için feed gönderilerini getir
export const getFeedPosts = async () => {
  try {
    // Firebase token'ı al
    const token = await auth.currentUser?.getIdToken(true);
    
    if (!token) {
      throw new Error('Kimlik doğrulama gerekli');
    }
    
    const response = await fetch(`${API_URL}/images/feed`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Feed gönderileri alınamadı: ${response.status}`);
    }
    
    const data = await response.json();
    return data.feed || [];
  } catch (error) {
    console.error('Feed gönderilerini getirme hatası:', error);
    throw error;
  }
};

// Gönderiyi beğen
export const likePost = async (postId) => {
  try {
    const token = await auth.currentUser?.getIdToken(true);
    
    if (!token) {
      throw new Error('Kimlik doğrulama gerekli');
    }
    
    // Firebase Realtime Database'de beğeni güncelleme
    // Bu kısmı Firebase yapınıza göre uyarlayabilirsiniz
    const userId = auth.currentUser.uid;
    
    // Firebase'e doğrudan beğeni eklemek için
    const response = await fetch(`${API_URL}/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId })
    });
    
    if (!response.ok) {
      throw new Error(`Gönderi beğenilemedi: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Gönderi beğenme hatası:', error);
    throw error;
  }
};

// Gönderiye yorum ekle
export const commentOnPost = async (postId, commentText) => {
  try {
    const token = await auth.currentUser?.getIdToken(true);
    
    if (!token) {
      throw new Error('Kimlik doğrulama gerekli');
    }
    
    const userId = auth.currentUser.uid;
    const username = auth.currentUser.displayName || 'Kullanıcı';
    
    const response = await fetch(`${API_URL}/posts/${postId}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        username,
        text: commentText
      })
    });
    
    if (!response.ok) {
      throw new Error(`Yorum eklenemedi: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Yorum ekleme hatası:', error);
    throw error;
  }
};
