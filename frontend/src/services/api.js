import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const getHeaders = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Auth
  login: async (email, password) => {
    // Firebase auth will handle this
    return null;
  },

  // User
  createUser: async (userData) => {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(userData),
    });
    return response.json();
  },

  getUser: async (userId) => {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      headers: await getHeaders(),
    });
    return response.json();
  },

  updateUser: async (userId, updates) => {
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(updates),
    });
    return response.json();
  },

  followUser: async (userId) => {
    const response = await fetch(`${API_URL}/users/${userId}/follow`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    return response.json();
  },

  // Posts
  createPost: async (postData) => {
    // Undefined, null veya boş string değerlerini temizle
    const cleanData = {};
    
    // Veri temizleme - özellikle audioUrl ve ses ile ilgili değerler için önemli
    for (const key in postData) {
      if (postData[key] !== undefined && 
          postData[key] !== null && 
          postData[key] !== '') {
        cleanData[key] = postData[key];
      }
    }
    
    // AudioUrl var mı son bir kontrol yap
    if ('audioUrl' in cleanData && (!cleanData.audioUrl || cleanData.audioUrl === 'undefined')) {
      console.log('Null veya undefined audioUrl temizlendi');
      delete cleanData.audioUrl;
    }
    
    // AudioId var mı son bir kontrol yap
    if ('audioId' in cleanData && (!cleanData.audioId || cleanData.audioId === 'undefined')) {
      console.log('Null veya undefined audioId temizlendi');
      delete cleanData.audioId;
    }
    
    console.log('Firebase\'e gönderilecek temiz veri:', cleanData);
    
    const response = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(cleanData),
    });
    return response.json();
  },

  getFeed: async () => {
    const response = await fetch(`${API_URL}/posts/feed`, {
      headers: await getHeaders(),
    });
    return response.json();
  },

  likePost: async (postId) => {
    const response = await fetch(`${API_URL}/posts/${postId}/like`, {
      method: 'POST',
      headers: await getHeaders(),
    });
    return response.json();
  },

  commentOnPost: async (postId, text) => {
    const response = await fetch(`${API_URL}/posts/${postId}/comment`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ text }),
    });
    return response.json();
  },
};
