import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { lightTheme as theme } from '../../utils/theme';

const CreatePostScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (!result.didCancel && result.assets?.[0]) {
      setImage(result.assets[0]);
    }
  };

  const uploadImage = async () => {
    if (!image) return null;

    const response = await fetch(image.uri);
    const blob = await response.blob();
    const filename = `posts/${user.uid}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
  };

  const handlePost = async () => {
    if (!image) {
      Alert.alert('Hata', 'Lütfen bir fotoğraf seçin.');
      return;
    }

    if (!caption) {
      Alert.alert('Hata', 'Lütfen bir açıklama yazın.');
      return;
    }

    try {
      setLoading(true);
      const imageUrl = await uploadImage();
      
      await api.createPost({
        imageUrl,
        caption,
        location,
      });

      Alert.alert('Başarılı', 'Gönderiniz paylaşıldı.');
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={pickImage}
      >
        {image ? (
          <Image
            source={{ uri: image.uri }}
            style={styles.image}
          />
        ) : (
          <Text style={styles.imagePlaceholder}>
            Fotoğraf seçmek için dokunun
          </Text>
        )}
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Açıklama yazın..."
        value={caption}
        onChangeText={setCaption}
        multiline
      />

      <TextInput
        style={styles.input}
        placeholder="Konum ekleyin (isteğe bağlı)"
        value={location}
        onChangeText={setLocation}
      />

      <TouchableOpacity
        style={[
          styles.button,
          (!image || !caption || loading) && styles.buttonDisabled,
        ]}
        onPress={handlePost}
        disabled={!image || !caption || loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Paylaşılıyor...' : 'Paylaş'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  imageContainer: {
    aspectRatio: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness.medium,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: theme.colors.textSecondary,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.roundness.medium,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default CreatePostScreen;
