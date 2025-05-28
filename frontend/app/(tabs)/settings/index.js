import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/contexts/AuthContext';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../src/firebaseConfig';
// BottomTabBar artık Expo Router tarafından otomatik olarak ekleniyor

export default function SettingsScreen() {
  const { user, updateUserProfile, logout } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    email: user?.email || '',
    bio: user?.bio || '',
  });
  
  // Bildirim ayarları
  const [notifications, setNotifications] = useState({
    likes: true,
    comments: true,
    mentions: true,
    newFollowers: true,
  });
  
  // Gizlilik ayarları
  const [privacy, setPrivacy] = useState({
    privateAccount: false,
    showLocation: true,
    allowComments: true,
  });

  const handleUpdatePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setUpdatingPhoto(true);
      try {
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const photoRef = storageRef(storage, `users/${user.uid}/profile.jpg`);
        await uploadBytes(photoRef, blob);
        const photoURL = await getDownloadURL(photoRef);
        await updateUserProfile({ photoURL });
        Alert.alert('Başarılı', 'Profil fotoğrafınız güncellendi.');
      } catch (error) {
        Alert.alert('Hata', 'Profil fotoğrafı güncellenirken bir hata oluştu.');
      } finally {
        setUpdatingPhoto(false);
      }
    }
  };

  const handleUpdateProfile = async () => {
    if (!formData.displayName.trim()) {
      Alert.alert('Uyarı', 'Kullanıcı adı boş olamaz.');
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile({
        displayName: formData.displayName,
        bio: formData.bio,
      });
      Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi.');
    } catch (error) {
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Expo Router formatında doğru yola yönlendirme
              router.replace('/(auth)/login');
            } catch (error) {
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil</Text>
          
          <TouchableOpacity
            style={styles.photoContainer}
            onPress={handleUpdatePhoto}
            disabled={updatingPhoto}
          >
            {updatingPhoto ? (
              <ActivityIndicator size="small" color="#1565c0" />
            ) : (
              <>
                <Image
                  source={{
                    uri: user?.photoURL || 'https://via.placeholder.com/100',
                  }}
                  style={styles.profilePhoto}
                />
                <View style={styles.editIconContainer}>
                  <MaterialIcons name="edit" size={16} color="#fff" />
                </View>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Kullanıcı Adı</Text>
            <TextInput
              style={styles.input}
              value={formData.displayName}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, displayName: text }))
              }
              placeholder="Kullanıcı adınız"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={formData.email}
              editable={false}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Biyografi</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.bio}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, bio: text }))
              }
              placeholder="Kendinizden bahsedin..."
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleUpdateProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Profili Güncelle</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bildirimler</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Beğeni Bildirimleri</Text>
            <Switch
              value={notifications.likes}
              onValueChange={(value) =>
                setNotifications((prev) => ({ ...prev, likes: value }))
              }
              trackColor={{ false: '#ddd', true: '#1565c0' }}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Yorum Bildirimleri</Text>
            <Switch
              value={notifications.comments}
              onValueChange={(value) =>
                setNotifications((prev) => ({ ...prev, comments: value }))
              }
              trackColor={{ false: '#ddd', true: '#1565c0' }}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Bahsedilme Bildirimleri</Text>
            <Switch
              value={notifications.mentions}
              onValueChange={(value) =>
                setNotifications((prev) => ({ ...prev, mentions: value }))
              }
              trackColor={{ false: '#ddd', true: '#1565c0' }}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Yeni Takipçi Bildirimleri</Text>
            <Switch
              value={notifications.newFollowers}
              onValueChange={(value) =>
                setNotifications((prev) => ({ ...prev, newFollowers: value }))
              }
              trackColor={{ false: '#ddd', true: '#1565c0' }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gizlilik</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Gizli Hesap</Text>
            <Switch
              value={privacy.privateAccount}
              onValueChange={(value) =>
                setPrivacy((prev) => ({ ...prev, privateAccount: value }))
              }
              trackColor={{ false: '#ddd', true: '#1565c0' }}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Konum Paylaş</Text>
            <Switch
              value={privacy.showLocation}
              onValueChange={(value) =>
                setPrivacy((prev) => ({ ...prev, showLocation: value }))
              }
              trackColor={{ false: '#ddd', true: '#1565c0' }}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Yorumlara İzin Ver</Text>
            <Switch
              value={privacy.allowComments}
              onValueChange={(value) =>
                setPrivacy((prev) => ({ ...prev, allowComments: value }))
              }
              trackColor={{ false: '#ddd', true: '#1565c0' }}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <MaterialIcons name="logout" size={20} color="#e91e63" />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
      {/* Expo Router kendi tab bar'ını sağladığı için BottomTabBar'a gerek yok */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  photoContainer: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  editIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#1565c0',
    borderRadius: 12,
    padding: 4,
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#1565c0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginVertical: 20,
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#e91e63',
    fontWeight: '500',
  },
});
