import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { analyzeImage, generateDescription, calculateScore } from '../../../src/services/aiService';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/contexts/AuthContext';
import { ref, push, set } from 'firebase/database';
import { db } from '../../../src/firebaseConfig';
import { uploadImageToMongoDB } from '../../../src/services/imageService';
import { uploadAudioToMongoDB } from '../../../src/services/audioService';

export default function CreatePostScreen() {
  const [image, setImage] = useState(null);
  // Açıklama artık AI tarafından otomatik olarak oluşturulacak
  const [aiGenDescription, setAiGenDescription] = useState('');
  // AI analiz sonuçlarını saklayacağımız state'ler
  const [aiScoreData, setAiScoreData] = useState(null);
  const [location, setLocation] = useState(null);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const authContext = useAuth();
  const { user } = authContext;
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // Kamera izni
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        Alert.alert('Üzgünüz', 'Kamera erişim izni gerekiyor.');
      }
      
      // Galeri izni
      const { status: imageStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (imageStatus !== 'granted') {
        Alert.alert('Üzgünüz', 'Fotoğraf erişim izni gerekiyor.');
      }

      // Konum izni
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert('Üzgünüz', 'Konum erişim izni gerekiyor.');
      }

      // Mikrofon izni
      const { status: audioStatus } = await Audio.requestPermissionsAsync();
      if (audioStatus !== 'granted') {
        Alert.alert('Üzgünüz', 'Mikrofon erişim izni gerekiyor.');
      }
    })();
  }, []);

  const pickImage = async () => {
    // Kullanıcıya seçenek sun
    Alert.alert(
      'Fotoğraf Seç',
      'Fotoğrafı nereden seçmek istersiniz?',
      [
        {
          text: 'Kamera',
          onPress: () => {
            console.log('Kamera seçeneği seçildi');
            takePicture();
          },
        },
        {
          text: 'Galeri',
          onPress: () => {
            console.log('Galeri seçeneği seçildi');
            chooseFromGallery();
          },
        },
        {
          text: 'İptal',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const takePicture = async () => {
    console.log('takePicture fonksiyonu çağrıldı');
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      console.log('Kamera sonucu:', result);
      
      if (!result.canceled) {
        console.log('Kameradan alınan fotoğraf:', result.assets[0].uri);
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Kamera hatası:', error);
      Alert.alert('Hata', 'Kamera açılırken bir hata oluştu: ' + error.message);
    }
  };

  const chooseFromGallery = async () => {
    console.log('chooseFromGallery fonksiyonu çağrıldı');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      console.log('Galeri sonucu:', result);
      
      if (!result.canceled) {
        console.log('Galeriden seçilen fotoğraf:', result.assets[0].uri);
        setImage(result.assets[0].uri);
        
        // Fotoğraf yüklenince AI açıklaması için hazırlık yap
        setAiGenDescription('Yapay zeka analiz ediyor...');
        
        try {
          // AI analizi yapmak için resmi yükle
          const uploadedImageData = await uploadFile(result.assets[0].uri, `temp/${Date.now()}_image.jpg`);
          const imageUrl = uploadedImageData.imageUrl;
          
          // AI açıklaması ve puanlamasını eş zamanlı olarak al
          const [aiDescription, score] = await Promise.all([
            generateDescription(imageUrl),
            calculateScore(imageUrl)
          ]);
          
          // AI skor bilgisini sakla
          setAiScoreData(score);
          
          if (aiDescription && aiDescription.analysis && aiDescription.analysis.analysisText) {
            setAiGenDescription(aiDescription.analysis.analysisText);
          } else {
            setAiGenDescription('Yapay zeka açıklama oluşturamadı.');
          }
        } catch (error) {
          console.error('AI açıklama oluşturma hatası:', error);
          setAiGenDescription('Açıklama oluşturulurken bir hata oluştu.');
        }
      }
    } catch (error) {
      console.error('Galeri hatası:', error);
      Alert.alert('Hata', 'Galeri açılırken bir hata oluştu: ' + error.message);
    }
  };

  const getLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address[0]) {
        const { city, region } = address[0];
        setLocation(city && region ? `${city}, ${region}` : 'Konum bulunamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Konum alınamadı.');
    }
  };

  const startRecording = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      Alert.alert('Hata', 'Ses kaydı başlatılamadı.');
    }
  };

  const stopRecording = async () => {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      setRecording(null);
      setIsRecording(false);
    } catch (error) {
      Alert.alert('Hata', 'Ses kaydı durdurulamadı.');
    }
  };

  const uploadFile = async (uri, path) => {
    try {
      // Doğrudan Firebase Auth kullan
      const { getAuth } = require('firebase/auth');
      const firebaseAuth = getAuth();
      const activeUser = firebaseAuth.currentUser;
      
      if (!activeUser || !activeUser.uid) {
        Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
        return null;
      }
      
      // Yükleme bilgilerini hazırla
      const imageDescription = ''; // Gönderinin açıklaması gönderi oluşturulurken eklenecek
      const locationText = location || '';
      
      console.log('Resim MongoDB yüklemesi başlıyor...');
      // MongoDB'ye resmi yükle
      const imageUrl = await uploadImageToMongoDB(uri, imageDescription, locationText);
      
      if (!imageUrl) {
        throw new Error('Resim yükleme başarısız: Geçerli bir URL dönmedi');
      }
      
      console.log('Resim MongoDB yüklemesi BAŞARILI! URL:', imageUrl);
      
      // Resmin MongoDB ID'sini al (imageUrl'den çıkar)
      const imageIdMatch = imageUrl.match(/\/([^\/]+)$/);
      const imageId = imageIdMatch ? imageIdMatch[1] : null;
      
      if (!imageId) {
        console.warn('Resim ID\'si imageUrl\'den çıkarılamadı:', imageUrl);
      }
      
      return {
        imageUrl,
        imageId
      };
    } catch (error) {
      console.error('MongoDB resim yükleme hatası:', error);
      Alert.alert('Yükleme Hatası', `Resim yüklenirken bir hata oluştu: ${error.message}`);
      throw error;
    }
  };

  const handlePost = async () => {
    if (!image) {
      Alert.alert('Uyarı', 'Lütfen bir fotoğraf seçin.');
      return;
    }

    // Firebase Auth ile doğrudan kullanıcı kontrolü
    const { getAuth } = require('firebase/auth');
    const firebaseAuth = getAuth();
    const currentUser = firebaseAuth.currentUser;
    
    if (!currentUser || !currentUser.uid) {
      Alert.alert('Hata', 'Oturum açmanız gerekiyor. Lütfen tekrar giriş yapın.');
      return;
    }
    
    // Yükleme işlemi başladığında loading göster
    setIsLoading(true);
    
    try {
      console.log('Paylaşım başlıyor, kullanıcı:', currentUser.uid, currentUser.displayName);
      
      // 1. FOTOĞRAF YÜKLEME - MongoDB'ye
      console.log('Fotoğraf MongoDB\'ye yükleniyor...');
      const { imageUrl, imageId } = await uploadFile(
        image,
        `posts/${currentUser.uid}/${Date.now()}_image.jpg`
      );
      console.log('Fotoğraf MongoDB\'ye başarıyla yüklendi:', imageUrl);
      
      // 2. SES KAYDI YÜKLEME - MongoDB'ye (varsa)
      let audioUrl = null; // Boş deĞer varsayılan olarak null olacak (undefined değil)
      if (audioUri) {
        console.log('Ses dosyası MongoDB\'ye yükleniyor:', audioUri);
        try {
          // MongoDB'den gelen yanıtın tümünü logla (hata ayıklama için)
          const audioResponse = await uploadAudioToMongoDB(audioUri, imageId, description);
          console.log('Ses dosyası MongoDB yanıtı (tüm veri):', audioResponse);
          
          // Yanıt nesnesinden audio URL'i al
          if (audioResponse && typeof audioResponse === 'object') {
            // Eğer bir nesne döndüyse, audioId'yi kullanarak URL oluştur
            if (audioResponse.audioId) {
              audioUrl = `${API_URL}/api/audio/${audioResponse.audioId}`;
              console.log('Audio URL oluşturuldu:', audioUrl);
            } else if (audioResponse.url) {
              audioUrl = audioResponse.url;
              console.log('Audio URL doğrudan alındı:', audioUrl);
            }
          } else if (typeof audioResponse === 'string') {
            // Eğer bir string döndüyse, direk olarak kullan
            audioUrl = audioResponse;
            console.log('Audio URL string olarak alındı:', audioUrl);
          }
          
          // URL hala undefined/null ise, null olarak ayarla
          if (!audioUrl) {
            console.log('Geçerli audio URL bulunamadı, null olarak ayarlanıyor');
            audioUrl = null;
          }
          
          console.log('Ses dosyası MongoDB\'ye başarıyla yüklendi, URL:', audioUrl);
        } catch (audioError) {
          console.error('Ses dosyası yükleme hatası:', audioError);
          audioUrl = null; // Hata durumunda null olarak ayarla
          Alert.alert(
            'Ses Yükleme Uyarısı', 
            'Ses dosyası yüklenirken bir sorun oluştu. Yine de devam etmek istiyor musunuz?',
            [
              { text: 'Vazgeç', style: 'cancel', onPress: () => setIsLoading(false) },
              { text: 'Devam Et', onPress: () => console.log('Ses olmadan devam ediliyor') }
            ]
          );
        }
      }

      // 3. AI ANALİZLERİNİ KONTROL ET
      console.log('AI analiz sonuçları kullanılıyor...');
      // Daha önce saklanan AI skorlarını kullan, yoksa hata göster
      if (!aiScoreData) {
        console.warn('AI skor verisi bulunamadı. Daha önce AI analizi yapılmamış olabilir.');
        // Kullanıcıya bilgi ver
        Alert.alert(
          'Uyarı',
          'AI puanlaması alınırken bir sorun oluştu. Paylaşım AI skoru olmadan yapılacak.',
          [{ text: 'Tamam', style: 'default' }]
        );
      } else {
        console.log('AI analizleri önceden yapılmıştı:', { aiScore: aiScoreData.score, description: aiGenDescription });
      }

      // 4. GÖNDERİ OLUŞTUR
      console.log('Gönderi veritabanına kaydediliyor...');
      const postRef = push(ref(db, 'posts'));
      await set(postRef, {
        userId: currentUser.uid,
        username: currentUser.displayName || 'İsimsiz Kullanıcı',
        userPhoto: currentUser.photoURL || null,
        imageUrl,
        audioUrl,         // MongoDB'deki ses dosyasının URL'i
        imageId,          // MongoDB'deki resmin ID'si 
        description: aiGenDescription || 'Bu gönderinin içeriği hakkında bilgi yok.',
        location,
        createdAt: Date.now(),
        likes: [],
        comments: [],
        aiScore: aiScoreData ? aiScoreData.score : null,
        aiDescription: aiGenDescription || 'Bu gönderinin içeriği hakkında bilgi yok.',
      });
      console.log('Gönderi başarıyla kaydedildi! ID:', postRef.key);
      console.log('MONGO DB YÜKLEME VE GÖNDERİ BAŞARILI!');
      console.log('Resim URL:', imageUrl);
      console.log('Ses URL:', audioUrl);

      // 5. KULLANICIYA BİLDİRİM GÖSTER
      Alert.alert(
        'Başarılı!', 
        'Gönderiniz MongoDB\'ye başarıyla yüklendi ve paylaşıldı!',
        [
          { 
            text: 'Tamam',
            onPress: () => router.replace('/(tabs)/home/index')
          }
        ]
      );
    } catch (error) {
      console.error('Gönderi paylaşma hatası:', error);
      
      // Firebase hata kodlarına göre özel mesajlar
      let errorMessage = 'Gönderi paylaşılırken bir hata oluştu.';
      
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'Fotoğraf yükleme izniniz yok. Firebase Storage kurallarını kontrol edin.';
      } else if (error.code === 'permission-denied') {
        errorMessage = 'Veritabanına yazma izniniz yok. Firebase Database kurallarını kontrol edin.';
      }
      
      Alert.alert('Hata', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Yeni Gönderi</Text>
      </View>

      <View style={styles.imageContainer}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <TouchableOpacity style={styles.imagePlaceholder} onPress={pickImage}>
            <MaterialIcons name="add-a-photo" size={50} color="#666" />
            <Text style={styles.imagePlaceholderText}>Fotoğraf Ekle</Text>
          </TouchableOpacity>
        )}

        {image && (
          <TouchableOpacity style={styles.changeImageButton} onPress={pickImage}>
            <Text style={styles.changeImageText}>Değiştir</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.formContainer}>
        {image && (
          <View style={styles.aiDescriptionContainer}>
            <Text style={styles.aiDescriptionTitle}>Yapay Zeka Açıklaması</Text>
            <Text style={styles.aiDescriptionText}>
              {aiGenDescription || 'Fotoğraf yüklendiğinde otomatik açıklama oluşturulacak...'}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.locationButton} onPress={getLocation}>
          <MaterialIcons name="location-on" size={24} color="#1DA1F2" />
          <Text style={styles.locationText}>
            {location || 'Konum ekle'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.recordButton}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <MaterialIcons name={isRecording ? 'stop' : 'mic'} size={24} color={isRecording ? '#FF6347' : '#1DA1F2'} />
          <Text style={[styles.recordText, isRecording && { color: '#FF6347' }]}>
            {isRecording ? 'Kaydı Durdur' : audioUri ? 'Ses Kaydedildi' : 'Ses Kaydet'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.postButton, (!image || isLoading) && styles.disabledButton]} 
          onPress={handlePost} 
          disabled={!image || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.postButtonText}>{image ? 'Paylaş' : 'Önce Fotoğraf Seçin'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#1DA1F2',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  imageContainer: {
    padding: 20,
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 10,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#666',
  },
  changeImageButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#1DA1F2',
    padding: 10,
    borderRadius: 5,
  },
  changeImageText: {
    fontSize: 14,
    color: '#fff',
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  aiDescriptionContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
  },
  aiDescriptionTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
    color: '#1565c0',
  },
  aiDescriptionText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  locationText: {
    marginLeft: 5,
    color: '#1DA1F2',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  recordText: {
    marginLeft: 5,
    color: '#1DA1F2',
  },
  postButton: {
    backgroundColor: '#1DA1F2',
    borderRadius: 5,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#b3e0ff',
  },
  postButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
});
