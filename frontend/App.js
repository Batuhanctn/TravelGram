import 'react-native-gesture-handler';
import React from 'react';
import { AuthProvider } from './src/contexts/AuthContext';

// Expo Router için giriş noktası düzenlemesi
export default function App({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
