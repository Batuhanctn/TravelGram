import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  SafeAreaView,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Audio } from 'expo-av';
import { launchImageLibrary } from 'react-native-image-picker';
import * as ImagePicker from 'expo-image-picker';
import { getAuth } from 'firebase/auth';
import { app } from '../../firebaseConfig';
import { api } from '../../services/api';
import { lightTheme as theme } from '../../utils/theme';
import { analyzeImage, generateDescription } from '../../services/aiService';

const CreatePostScreen = ({ navigation, route }) => {
  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Ses kaydı için state değişkenleri
  const [recording, setRecording] = useState(null);
  const [sound, setSound] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const captionInputRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [uploadedAudioId, setUploadedAudioId] = useState(null);
  
  // Firebase Auth ile kullanıcı doğrulama
  const firebaseAuth = getAuth(app);

  useEffect(() => {
    // Kamera ve galeri izinlerini kontrol et
    (async () => {
      // Kamera izni
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        Alert.alert('Uyarı', 'Kamera izni verilmediği için bu özelliği kullanamayacaksınız.');
      }
      
      // Galeri izni
      const galleryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (galleryPermission.status !== 'granted') {
        Alert.alert('Uyarı', 'Galeri izni verilmediği için bu özelliği kullanamayacaksınız.');
      }
    })();
  }, []);

  const pickImage = async () => {
    // Firebase Auth kullanıcı kontrolü
    if (!firebaseAuth.currentUser) {
      Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }
    
    // React Native Image Picker'i öncelikle dene
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });
  
      if (!result.didCancel && result.assets?.[0]) {
        console.log('React Native Image Picker - Resim seçildi');
        setImage(result.assets[0]);
        return;
      }
    } catch (error) {
      console.log('React Native Image Picker hatası, Expo kullanılıyor:', error);
      await chooseFromGallery();
    }
  };
  
  const chooseFromGallery = async () => {
    try {
      // Firebase Auth kullanıcı kontrolü
      if (!firebaseAuth.currentUser) {
        Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });
      
      console.log('Galeri sonucu:', result);
      
      // Kullanıcı galeriyi iptal ettiyse işlemi sonlandır
      if (result.canceled || !result.assets || !result.assets[0]) {
        console.log('Galeri seçimi iptal edildi veya görsel alınamadı.');
        return;
      }
      
      console.log('Galeriden seçilen fotoğraf:', result.assets[0].uri);
      
      // Yükleme durumunu göster
      setLoading(true);
      setCaption('Görsel analiz ediliyor...');
      
      // Expo Image Picker formatını react-native-image-picker formatına dönüştür
      const adaptedImage = {
        uri: result.assets[0].uri,
        type: 'image/jpeg',
        fileName: result.assets[0].fileName || `photo-${Date.now()}.jpg`,
        width: result.assets[0].width,
        height: result.assets[0].height,
        fileSize: result.assets[0].fileSize,
      };
      
      // Resmi state'e kaydet
      setImage(adaptedImage);
      
      // iOS için kullanıcı bilgisini sabitliyoruz
      if (Platform.OS === 'ios') {
        // Her durumda iOS için sabit kullanıcıyı tekrar ayarla
        const activeUser = {
          uid: 'ZwqvEyaqrwfrcnG0bf4TYXRNXOt1',
          email: 'batu@hotmail.com',
          displayName: 'batuta'
        };
        global.travelgramUser = activeUser;
        console.log('RESİM SONRASI - iOS için kullanıcı tekrar sabitlendi:', activeUser.uid);
      }
      
      // Resmi yükle ve AI analizi yap
      try {
        // Görüntüyü FormData'ya ekle (MongoDB için)
        const formData = new FormData();
        
        // Resmin URI'sinden dosya oluştur
        const imageFile = {
          uri: adaptedImage.uri,
          type: adaptedImage.type || 'image/jpeg',
          name: adaptedImage.fileName || `photo-${Date.now()}.jpg`
        };
        
        // FormData'ya resmi ekle
        formData.append('image', imageFile);
        
        // Firebase Auth'tan kullanıcı kimliği ekleme
        const userId = firebaseAuth.currentUser.uid;
        formData.append('userId', userId);
        formData.append('timestamp', Date.now().toString());
        
        // Firebase token alınıyor
        const token = await firebaseAuth.currentUser.getIdToken(true);
        console.log('Firebase token alındı, ilk 20 karakter:', token.substring(0, 20));
        
        // Backend'deki resim yükleme endpoint'ine gönder
        const response = await fetch(`${api.API_URL}/images/upload`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        console.log('Sunucu yanıt durumu:', response.status);
        
        if (!response.ok) {
          throw new Error(`Yükleme başarısız: ${response.status}`);
        }
        
        const uploadResult = await response.json();
        console.log('Görsel başarıyla yüklendi:', uploadResult);
        
        // Imageurl'i al
        const imageUrl = `${api.API_URL}/images/${uploadResult.imageId}`;
        console.log('Oluşturulan görsel URL:', imageUrl);
        
        // Görsel URL'ini daha sonraki kullanım için sakla
        adaptedImage.uploadedImageId = uploadResult.imageId;
        adaptedImage.uploadedUrl = imageUrl;
        
        // Yeni görsel bilgileriyle state'i güncelle
        setImage({...adaptedImage});
        
        // Gemini API için AI analizi yap
        console.log('AI analizleri yapılıyor...');
        try {
          const aiResponse = await generateDescription(imageUrl);
          
          console.log('AI yanıtı:', aiResponse);
          
          if (aiResponse && aiResponse.success && aiResponse.analysis && aiResponse.analysis.analysisText) {
            const analysisText = aiResponse.analysis.analysisText;
            console.log('AI analizi başarılı, açıklama:', analysisText.substring(0, 50) + '...');
            
            // Doğrudan state değişkenini güncelle
            setCaption(analysisText);
            
            // TextInput değeri olarak da güncelle (React Native bazen sadece state güncellemesini yeterince hızlı yansıtmaz)
            if (captionInputRef.current) {
              captionInputRef.current.setNativeProps({ text: analysisText });
            }
            
            // Ekstra log ekleyelim
            console.log('Caption metin alanı güncellendi');
          } else {
            console.error('AI yanıtı beklenen formatta değil:', aiResponse);
            setCaption('');
          }
        } catch (aiError) {
          console.error('AI analizi sırasında hata:', aiError);
          // Hata oluştuğunda kullanıcıya bildirirken kapanmasını önleyelim
          Alert.alert(
            'Görsel Analiz Hatası',
            'Fotoğrafınız başarıyla yüklendi ancak AI analizi sırasında bir hata oluştu. Açıklamayı manuel olarak girebilirsiniz.',
            [{ text: 'Tamam', style: 'default' }]
          );
        }
      } catch (uploadError) {
        console.error('Görsel yükleme veya AI analizi hatası:', uploadError);
        Alert.alert('Hata', 'Görsel analizi sırasında bir hata oluştu: ' + uploadError.message);
        setCaption('');
      } finally {
        // İşlem sonunda yükleme durumunu kapat
        setLoading(false);
      }
    } catch (error) {
      console.error('Galeri hatası:', error);
      Alert.alert('Hata', 'Galeri kullanılırken bir sorun oluştu.');
      setLoading(false);
    }
  };

  const takePicture = async () => {
    try {
      // Firebase Auth kullanıcı kontrolü
      if (!firebaseAuth.currentUser) {
        Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      console.log('Kamera sonucu:', result);
      
      // Kullanıcı kamerayı iptal ettiyse işlemi sonlandır
      if (result.canceled || !result.assets || !result.assets[0]) {
        console.log('Kamera iptal edildi veya görsel alınamadı.');
        return;
      }
      
      console.log('Kameradan alınan fotoğraf:', result.assets[0].uri);
      
      // Yükleme durumunu göster
      setLoading(true);
      setCaption('Görsel analiz ediliyor...');
      
      // Expo Image Picker formatını react-native-image-picker formatına dönüştür
      const adaptedImage = {
        uri: result.assets[0].uri,
        type: 'image/jpeg',
        fileName: result.assets[0].fileName || `photo-${Date.now()}.jpg`,
        width: result.assets[0].width,
        height: result.assets[0].height,
        fileSize: result.assets[0].fileSize,
      };
      
      // Resmi state'e kaydet
      setImage(adaptedImage);
      
      // iOS için kullanıcı bilgisini sabitliyoruz
      if (Platform.OS === 'ios') {
        // Her durumda iOS için sabit kullanıcıyı tekrar ayarla
        const activeUser = {
          uid: 'ZwqvEyaqrwfrcnG0bf4TYXRNXOt1',
          email: 'batu@hotmail.com',
          displayName: 'batuta'
        };
        global.travelgramUser = activeUser;
        console.log('RESİM SONRASI - iOS için kullanıcı tekrar sabitlendi:', activeUser.uid);
      }
      
      // Resmi yükle ve AI analizi yap
      try {
        // Görüntüyü FormData'ya ekle (MongoDB için)
        const formData = new FormData();
        
        // Resmin URI'sinden dosya oluştur
        const imageFile = {
          uri: adaptedImage.uri,
          type: adaptedImage.type || 'image/jpeg',
          name: adaptedImage.fileName || `photo-${Date.now()}.jpg`
        };
        
        // FormData'ya resmi ekle
        formData.append('image', imageFile);
        
        // Firebase Auth'tan kullanıcı kimliği ekleme
        const userId = firebaseAuth.currentUser.uid;
        formData.append('userId', userId);
        formData.append('timestamp', Date.now().toString());
        
        // Firebase token alınıyor
        const token = await firebaseAuth.currentUser.getIdToken(true);
        console.log('Firebase token alındı, ilk 20 karakter:', token.substring(0, 20));
        
        // Backend'deki resim yükleme endpoint'ine gönder
        const response = await fetch(`${api.API_URL}/images/upload`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        console.log('Sunucu yanıt durumu:', response.status);
        
        if (!response.ok) {
          throw new Error(`Yükleme başarısız: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Görsel başarıyla yüklendi:', result);
        
        // Imageurl'i al
        const imageUrl = `${api.API_URL}/images/${result.imageId}`;
        console.log('Oluşturulan görsel URL:', imageUrl);
        
        // Görsel URL'ini daha sonraki kullanım için sakla
        adaptedImage.uploadedImageId = result.imageId;
        adaptedImage.uploadedUrl = imageUrl;
        
        // Yeni görsel bilgileriyle state'i güncelle
        setImage({...adaptedImage});
        
        // Gemini API için AI analizi yap
        console.log('AI analizleri yapılıyor...');
        try {
          const aiResponse = await generateDescription(imageUrl);
          
          console.log('AI yanıtı:', aiResponse);
          
          if (aiResponse && aiResponse.success && aiResponse.analysis && aiResponse.analysis.analysisText) {
            const analysisText = aiResponse.analysis.analysisText;
            console.log('AI analizi başarılı, açıklama:', analysisText.substring(0, 50) + '...');
            
            // Doğrudan state değişkenini güncelle
            setCaption(analysisText);
            
            // TextInput değeri olarak da güncelle (React Native bazen sadece state güncellemesini yeterince hızlı yansıtmaz)
            if (captionInputRef.current) {
              captionInputRef.current.setNativeProps({ text: analysisText });
            }
            
            // Ekstra log ekleyelim
            console.log('Caption metin alanı güncellendi');
          } else {
            console.error('AI yanıtı beklenen formatta değil:', aiResponse);
            setCaption('');
          }
        } catch (aiError) {
          console.error('AI analizi sırasında hata:', aiError);
          // Hata oluştuğunda kullanıcıya bildirirken kapanmasını önleyelim
          Alert.alert(
            'Görsel Analiz Hatası',
            'Fotoğrafınız başarıyla yüklendi ancak AI analizi sırasında bir hata oluştu. Açıklamayı manuel olarak girebilirsiniz.',
            [{ text: 'Tamam', style: 'default' }]
          );
        }
      } catch (uploadError) {
        console.error('Görsel yükleme veya AI analizi hatası:', uploadError);
        Alert.alert('Hata', 'Görsel analizi sırasında bir hata oluştu: ' + uploadError.message);
        setCaption('');
      } finally {
        // İşlem sonunda yükleme durumunu kapat
        setLoading(false);
      }
    } catch (error) {
      console.error('Kamera hatası:', error);
      Alert.alert('Hata', 'Kamera kullanılırken bir sorun oluştu.');
      setLoading(false);
    }
  };


  
  const uploadImage = async (selectedImage = null) => {
    // Eğer belirli bir resim gönderilmişse onu kullan, yoksa state'deki resmi kullan
    const imageToUpload = selectedImage || image;
    try {
      // Firebase Auth kullanıcı kontrolü
      if (!firebaseAuth.currentUser) {
        Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
        return null;
      }
      
      if (!imageToUpload) {
        console.log('Yüklenecek resim yok');
        return null;
      }

      try {
        // Görüntüyü FormData'ya ekle (MongoDB için)
        const formData = new FormData();
        
        // Resmin URI'sinden dosya oluştur
        const imageFile = {
          uri: imageToUpload.uri,
          type: imageToUpload.type || 'image/jpeg',
          name: imageToUpload.fileName || `photo-${Date.now()}.jpg`
        };
        
        // FormData'ya resmi ekle
        formData.append('image', imageFile);
        
        // Firebase Auth'tan kullanıcı kimliği ekleme
        const userId = firebaseAuth.currentUser.uid;
        formData.append('userId', userId);
        formData.append('timestamp', Date.now().toString());
        
        console.log('Resim backend\'e yükleniyor...');
        
        // Firebase token al
        const token = await firebaseAuth.currentUser.getIdToken(true);
        console.log('Firebase token alındı, ilk 20 karakter:', token.substring(0, 20));
        
        // Backend'deki resim yükleme endpoint'ine gönder
        const response = await fetch(`${api.API_URL}/images/upload`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
            // FormData kullanırken Content-Type otomatik olarak ayarlanacak
          },
          body: formData
        });
        
        console.log('Sunucu yanıt durumu:', response.status);
        
        if (!response.ok) {
          throw new Error(`Yükleme başarısız: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Resim başarıyla yüklendi:', result);
        
        // Yüklenen görsele ait bilgileri sakla
        if (imageToUpload === image) { // State'deki görseli güncelliyoruz
          const updatedImage = {...image};
          updatedImage.uploadedImageId = result.imageId;
          updatedImage.uploadedUrl = `${api.API_URL}/images/${result.imageId}`;
          setImage(updatedImage);
        }
        
        // Backend'in döndürdüğü değere göre URL oluştur
        const imageUrl = `${api.API_URL}/images/${result.imageId}`;
        console.log('Oluşturulan resim URL:', imageUrl);
        return imageUrl;
      } catch (error) {
        console.error('Resim yükleme hatası:', error);
        Alert.alert('Hata', 'Resim yüklenirken bir sorun oluştu: ' + error.message);
        return null;
      }
    } catch (error) {
      console.error('Upload ana hatası:', error);
      Alert.alert('Hata', 'İşlem sırasında bir sorun oluştu: ' + error.message);
      return null;
    }
  };

  // Ses kaydını başlat
  const startRecording = async () => {
    try {
      // İzinleri kontrol et
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Hata', 'Ses kaydı izni verilmedi.');
        return;
      }
      
      // Önceki ses kaydını temizle
      if (recording) {
        await stopRecording();
      }
      
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      
      // Ses kalitesi ayarları
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false
      });
      
      console.log('Ses kaydı başlıyor...');
      
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();
      
      setRecording(newRecording);
      setIsRecording(true);
      setAudioUrl(null); // Yeni kayıt için URL temizlenir
      setUploadedAudioId(null); // Yeni kayıt için upload ID temizlenir
      
      console.log('Ses kaydı başladı.');
      
    } catch (error) {
      console.error('Ses kaydı başlatma hatası:', error);
      Alert.alert('Hata', 'Ses kaydı başlatılamadı: ' + error.message);
    }
  };
  
  // Ses kaydını durdur
  const stopRecording = async () => {
    try {
      if (!recording) {
        console.warn('Durdurulacak kayıt yok.');
        return;
      }
      
      console.log('Ses kaydı durduruluyor...');
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUrl(uri);
      
      // Kayıt süresini al
      const status = await recording.getStatusAsync();
      setAudioDuration(status.durationMillis / 1000); // saniye cinsinden
      
      // Ses oynatıcı moduna geç
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: true,
        playThroughEarpieceAndroid: false
      });
      
      setIsRecording(false);
      setRecording(null);
      
      console.log('Ses kaydı tamamlandı:', uri);
      
      // Ses dosyasını otomatik olarak yükle
      await uploadAudio(uri);
      
    } catch (error) {
      console.error('Ses kaydı durdurma hatası:', error);
      Alert.alert('Hata', 'Ses kaydı durdurulamadı: ' + error.message);
      setIsRecording(false);
      setRecording(null);
    }
  };
  
  // Ses kaydını oynat
  const playSound = async () => {
    try {
      if (!audioUrl) {
        console.warn('Oynatılacak ses kaydı yok.');
        return;
      }
      
      // Eğer zaten oynatılıyorsa durdur
      if (isPlaying && sound) {
        await sound.stopAsync();
        setIsPlaying(false);
        return;
      }
      
      // Yeni ses yükle
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setIsPlaying(true);
      
      // Ses bittiğinde
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
      
      await newSound.playAsync();
      
    } catch (error) {
      console.error('Ses oynatma hatası:', error);
      Alert.alert('Hata', 'Ses oynatılamadı: ' + error.message);
      setIsPlaying(false);
    }
  };
  
  // Ses dosyasını yükle
  const uploadAudio = async (audioUri = null) => {
    try {
      const uri = audioUri || audioUrl;
      
      if (!uri) {
        console.warn('Yüklenecek ses dosyası yok.');
        return null;
      }
      
      if (!firebaseAuth.currentUser) {
        Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
        return null;
      }
      
      setLoading(true);
      
      // FormData oluştur
      const formData = new FormData();
      
      // Ses dosyasını ekle
      const audioFile = {
        uri: uri,
        type: 'audio/m4a',
        name: `audio-${Date.now()}.m4a`
      };
      
      formData.append('audio', audioFile);
      formData.append('userId', firebaseAuth.currentUser.uid);
      formData.append('timestamp', Date.now().toString());
      formData.append('duration', audioDuration.toString());
      
      // Firebase token al
      const token = await firebaseAuth.currentUser.getIdToken(true);
      
      console.log('Ses dosyası yükleniyor...');
      
      // Backend'e gönder - port 5001 kullandığımızdan emin olalım
      const response = await fetch(`${api.API_URL}/audio/upload`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Ses yükleme başarısız: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Ses dosyası başarıyla yüklendi:', result);
      
      // Yüklenen ses dosyasının ID'sini sakla
      setUploadedAudioId(result.audioId);
      
      // Ses URL'ini oluştur
      const audioUrlFromServer = `${api.API_URL}/audio/${result.audioId}`;
      console.log('Oluşturulan ses URL:', audioUrlFromServer);
      
      setLoading(false);
      
      // Hem audioId hem de URL döndür
      return {
        audioId: result.audioId,
        audioUrl: audioUrlFromServer
      };
      
    } catch (error) {
      console.error('Ses yükleme hatası:', error);
      Alert.alert('Hata', 'Ses yüklenirken bir sorun oluştu: ' + error.message);
      setLoading(false);
      return null;
    }
  };

  const handlePost = async () => {
    try {
      // Firebase Auth kullanıcı kontrolü
      if (!firebaseAuth.currentUser) {
        Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }
      
      if (!image) {
        Alert.alert('Hata', 'Lütfen bir fotoğraf seçin.');
        return;
      }

      if (!caption) {
        Alert.alert('Hata', 'Lütfen bir açıklama yazın.');
        return;
      }

      setLoading(true);
      
      try {
        const imageUrl = await uploadImage();
        if (!imageUrl) {
          throw new Error('Resim yüklenemedi');
        }
        
        // Eğer yüklenmiş bir ses dosyası varsa ve hemen yüklenmemişse
        let audioId = uploadedAudioId;
        let audioUrlFromServer = null;
        
        if (audioUrl && !uploadedAudioId) {
          // uploadAudio artık bir nesne döndürüyor: {audioId, audioUrl}
          const audioUploadResult = await uploadAudio();
          if (audioUploadResult) {
            audioId = audioUploadResult.audioId;
            audioUrlFromServer = audioUploadResult.audioUrl;
            console.log('Ses dosyası başarıyla yüklendi, ID:', audioId, 'URL:', audioUrlFromServer);
          }
        }
        
        // Gönderi içeriğini hazırla - kesinlikle undefined değerleri içermeyecek şekilde
        // Temel objeyi oluştur
        const postData = {
          userId: firebaseAuth.currentUser.uid,
          imageUrl, // Resim URL'si zorunlu
          caption, // Açıklama zorunlu
          location: location || '', // Lokasyon boş olabilir ama undefined olamaz
          userName: firebaseAuth.currentUser.displayName || 'TravelGram Kullanıcı',
          userProfilePic: firebaseAuth.currentUser.photoURL || '',
          likes: 0,
          comments: 0,
          createdAt: new Date().toISOString()
        };
        
        // Ses dosyası ile ilgili bilgileri ekle - SADECE varsa
        if (audioId) {
          console.log('Ses ID ekleniyor:', audioId);
          postData.audioId = audioId;
        }
        
        // URL için önce uploadAudio'dan gelen URL'i dene, yoksa state'teki URL'i kullan
        const finalAudioUrl = audioUrlFromServer || (
          uploadedAudioId ? `${api.API_URL}/audio/${uploadedAudioId}` : null
        );
        
        // Ses URL'si varsa ve geçerliyse ekle
        if (finalAudioUrl) {
          console.log('Ses URL ekleniyor:', finalAudioUrl);
          postData.audioUrl = finalAudioUrl;
        } else {
          console.log('Hiçbir geçerli ses URL bulunmadığı için eklenmedi');
        }

        // Firebase'e undefined değerlerin gönderilmesini önle
        const cleanPostData = {};
        
        // Tüm özellikleri kontrol et ve sadece undefined olmayanları ekle
        Object.keys(postData).forEach(key => {
          if (postData[key] !== undefined) {
            cleanPostData[key] = postData[key];
          }
        });
        
        console.log('Firebasee gönderilecek temiz veri:', cleanPostData);
        
        // Temizlenmiş veriyi kullanarak gönderiyi oluştur
        await api.createPost(cleanPostData);

        Alert.alert('Başarılı', 'Gönderiniz paylaşıldı.');
        navigation.navigate('Home');
      } catch (error) {
        console.error('Post oluşturma hatası:', error);
        Alert.alert('Hata', 'Gönderi oluşturulurken bir sorun oluştu: ' + error.message);
      } finally {
        setLoading(false);
      }
    } catch (error) {
      console.error('HandlePost hata:', error);
      Alert.alert('Hata', 'İşlem sırasında bir sorun oluştu: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {image ? (
          <Image
            source={{ uri: image.uri }}
            style={styles.image}
          />
        ) : (
          <Text style={styles.imagePlaceholder}>
            Fotoğraf için aşağıdaki seçenekleri kullanın
          </Text>
        )}
      </View>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.optionButton, styles.galleryButton]}
          onPress={Platform.OS === 'ios' ? chooseFromGallery : pickImage}
        >
          <Text style={styles.optionButtonText}>Galeriden Seç</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.optionButton, styles.cameraButton]}
          onPress={takePicture}
        >
          <Text style={styles.optionButtonText}>Kamera</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        ref={captionInputRef}
        style={styles.input}
        placeholder="Gönderinize bir açıklama ekleyin..."
        value={caption}
        onChangeText={setCaption}
        multiline
        numberOfLines={3}
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
    marginBottom: theme.spacing.md,
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  optionButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.roundness.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  galleryButton: {
    backgroundColor: theme.colors.secondary || '#4a90e2',
  },
  cameraButton: {
    backgroundColor: theme.colors.accent || '#50c878',
  },
  optionButtonText: {
    color: 'white',
    fontWeight: 'bold',
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
