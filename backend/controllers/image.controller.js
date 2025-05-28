const { getGridFS, getGridFSStream, uploadToGridFS } = require('../services/upload.service');
const Image = require('../models/Image');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const fs = require('fs');
const path = require('path');

// Resim yükleme işlemi - GridFS kullanarak MongoDB'ye yükleme
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Hiçbir dosya yüklenmedi' });
    }

    // Kullanıcı bilgilerini al
    const { uid } = req.user;
    console.log(`Resim yükleme başlıyor - Kullanıcı: ${uid}, Dosya: ${req.file.filename}`);
    
    // Geçici dosyayı GridFS'e yükle
    try {
      // Dosya yolu ve metadata bilgisi
      const filePath = req.file.path;
      const metadata = {
        userId: uid,
        contentType: req.file.mimetype,
        description: req.body.description || '',
        location: req.body.location || ''
      };
      
      // GridFS'e yükleme yap
      console.log(`GridFS'e yükleme başlıyor: ${filePath}`);
      const uploadResult = await uploadToGridFS(filePath, req.file.originalname, metadata);
      console.log(`GridFS'e yükleme tamamlandı:`, uploadResult);
      
      // MongoDB'de meta veri kaydı oluştur
      const newImage = new Image({
        filename: uploadResult.filename,
        originalName: req.file.originalname,
        contentType: req.file.mimetype,
        size: req.file.size,
        userId: uid,
        description: req.body.description || '',
        location: req.body.location || '',
        gridFSId: uploadResult.id,
        uploadDate: new Date()
      });
      
      await newImage.save();
      console.log(`Resim meta verisi kaydedildi, ID: ${newImage._id}`);
      
      res.status(201).json({
        success: true,
        imageId: newImage._id,
        filename: uploadResult.filename,
        message: 'Resim başarıyla MongoDB GridFS sistemine yüklendi'
      });
    } catch (gridFSError) {
      console.error('GridFS yükleme hatası:', gridFSError);
      return res.status(500).json({ error: `GridFS yükleme hatası: ${gridFSError.message}` });
    }
  } catch (error) {
    console.error('Resim yükleme hatası:', error);
    res.status(500).json({ error: 'Resim yüklenirken bir hata oluştu' });
  }
};

// Resim görüntüleme işlemi - GridFS'ten oku
const getImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Resim meta verilerini bul
    const image = await Image.findById(id);
    if (!image) {
      return res.status(404).json({ error: 'Resim bulunamadı' });
    }

    // GridFS bucket'i al
    const bucket = getGridFS();
    if (!bucket) {
      return res.status(500).json({ error: 'GridFS bağlantısı oluşturulamadı' });
    }
    
    // Content-Type header'ını ayarla
    res.set('Content-Type', image.contentType);
    
    // GridFS'ten dosyayı stream olarak oku
    console.log(`GridFS'ten resim okunuyor: ${image.filename}`);
    const downloadStream = bucket.openDownloadStreamByName(image.filename);
    
    // Stream hata yönetimi
    downloadStream.on('error', function(error) {
      console.error(`GridFS okuma hatası: ${error.message}`);
      return res.status(404).json({ error: 'Dosya bulunamadı veya okunamadı' });
    });
    
    // Stream'i response olarak ilet
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Resim görüntüleme hatası:', error);
    res.status(500).json({ error: 'Resim görüntülenirken bir hata oluştu' });
  }
};

// Kullanıcının tüm resimlerini listele
const getUserImages = async (req, res) => {
  try {
    const { uid } = req.user;
    const images = await Image.find({ userId: uid }).sort({ uploadDate: -1 });
    
    res.status(200).json({
      success: true,
      count: images.length,
      data: images
    });
  } catch (error) {
    console.error('Kullanıcı resimleri listeleme hatası:', error);
    res.status(500).json({ error: 'Resimler listelenirken bir hata oluştu' });
  }
};

// Resim silme işlemi - GridFS'ten silme
const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user;

    // Önce resim meta verilerini bul
    const image = await Image.findById(id);
    if (!image) {
      return res.status(404).json({ error: 'Resim bulunamadı' });
    }

    // Kullanıcının kendi resimlerini silme yetkisi kontrolü
    if (image.userId !== uid) {
      return res.status(403).json({ error: 'Bu resmi silme yetkiniz yok' });
    }

    // GridFS bucket'i al
    const bucket = getGridFS();
    if (!bucket) {
      return res.status(500).json({ error: 'GridFS bağlantısı oluşturulurken hata' });
    }
    
    // Önce GridFS'ten dosyayı bul ve ID'sini al
    try {
      console.log(`GridFS'ten dosya bulunuyor: ${image.filename}`);
      
      // Dosya gridFSId ile kaydedilmişse, direkt olarak kullan
      if (image.gridFSId) {
        const fileId = new ObjectId(image.gridFSId);
        console.log(`GridFS'ten dosya siliniyor, ID: ${fileId}`);
        await bucket.delete(fileId);
      } 
      // Aksi halde, dosya adı ile bul ve sil
      else {
        // GridFS koleksiyonlarına erişim al
        const filesCollection = mongoose.connection.db.collection('uploads.files');
        
        // Dosyayı adına göre bul
        const file = await filesCollection.findOne({ filename: image.filename });
        if (file) {
          console.log(`GridFS'ten dosya siliniyor, ID: ${file._id}`);
          await bucket.delete(file._id);
        } else {
          console.log(`GridFS'te dosya bulunamadı: ${image.filename}`);
        }
      }
    } catch (gridFSError) {
      console.error('GridFS dosya silme hatası:', gridFSError);
      // GridFS silme hatası olsa bile veritabanı kaydını silmeye devam et
    }

    // Veritabanından meta verileri sil
    await Image.findByIdAndDelete(id);
    console.log(`Resim veritabanından silindi, ID: ${id}`);

    res.json({ success: true, message: 'Resim başarıyla silindi' });
  } catch (error) {
    console.error('Resim silme hatası:', error);
    res.status(500).json({ error: 'Resim silinirken bir hata oluştu' });
  }
};

// Kullanıcının gönderilerini tarihe göre sıralı şekilde getir (profil ekranı için)
const getUserImagesByDate = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // İlk olarak Firebase'de kullanıcının var olup olmadığını kontrol ederiz
    if (!userId) {
      return res.status(400).json({ error: 'Kullanici ID bilgisi gereklidir' });
    }
    
    // MongoDB'den kullanıcıya ait tüm görselleri çek (en yeniden en eskiye sıralı)
    const userImages = await Image.find({ userId })
      .sort({ uploadDate: -1 })
      .lean()
      .exec();
      
    if (!userImages || userImages.length === 0) {
      return res.status(200).json({ images: [] });
    }
    
    // Her görüntü için ses dosyası bilgisini de ekle (eğer varsa)
    const enrichedImages = await Promise.all(userImages.map(async (image) => {
      // Görüntü URL'sini ekle
      const imageUrl = `${req.protocol}://${req.get('host')}/api/images/${image._id}`;
      
      // Eğer bu görsele bağlı bir ses dosyası var mı diye kontrol et
      // (Bu kısmı ses ve görsel ilişkisine göre uyarlamanız gerekebilir)
      const Audio = mongoose.model('Audio');
      const relatedAudio = await Audio.findOne({ 
        $or: [
          { imageId: image._id.toString() },
          { userId: userId, uploadDate: { $gte: new Date(image.uploadDate - 60000), $lte: new Date(image.uploadDate + 60000) }}
        ]
      });
      
      let audioUrl = null;
      if (relatedAudio) {
        audioUrl = `${req.protocol}://${req.get('host')}/api/audio/${relatedAudio._id}`;
      }
      
      return {
        _id: image._id,
        imageUrl,
        audioUrl,
        description: image.description || '',
        location: image.location || '',
        uploadDate: image.uploadDate,
        userId: image.userId
      };
    }));
    
    res.status(200).json({ images: enrichedImages });
  } catch (error) {
    console.error('Kullanıcı görsellerini getirme hatası:', error);
    res.status(500).json({ error: 'Görselleri getirirken bir hata oluştu' });
  }
};

// Ana sayfa için feed (kullanıcının kendi ve takip ettiği kişilerin gönderileri)
const getFeedImages = async (req, res) => {
  try {
    // Kullanıcı kimliği gerekli
    const userId = req.user.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'Kimlik doğrulama gerekli' });
    }
    
    // Önce Firebase'den kullanıcının takip ettiği kişilerin listesini al
    const { admin, db } = require('../config/firebase');
    const userDoc = await db.ref(`users/${userId}`).once('value');
    const userData = userDoc.val() || {};
    
    // Takip edilen kullanıcıların ID'lerini al
    let followingUserIds = [];
    if (userData.following) {
      followingUserIds = Object.keys(userData.following);
    }
    
    // Kullanıcının kendi ID'sini de ekle
    const allUserIds = [userId, ...followingUserIds];
    
    // Tüm bu kullanıcıların görsellerini MongoDB'den çek
    const feedImages = await Image.find({ userId: { $in: allUserIds } })
      .sort({ uploadDate: -1 })
      .limit(20) // Son 20 gönderiyi sınırla
      .lean()
      .exec();
    
    // Her görüntü için ses dosyası bilgisini de ekle (eğer varsa)
    const enrichedImages = await Promise.all(feedImages.map(async (image) => {
      // Görüntü URL'sini ekle
      const imageUrl = `${req.protocol}://${req.get('host')}/api/images/${image._id}`;
      
      // Eğer bu görsele bağlı bir ses dosyası var mı diye kontrol et
      const Audio = mongoose.model('Audio');
      const relatedAudio = await Audio.findOne({ 
        $or: [
          { imageId: image._id.toString() },
          { userId: image.userId, uploadDate: { $gte: new Date(image.uploadDate - 60000), $lte: new Date(image.uploadDate + 60000) }}
        ]
      });
      
      let audioUrl = null;
      if (relatedAudio) {
        audioUrl = `${req.protocol}://${req.get('host')}/api/audio/${relatedAudio._id}`;
      }
      
      // Firebase'den kullanıcı bilgilerini al
      const userSnapshot = await db.ref(`users/${image.userId}`).once('value');
      const userInfo = userSnapshot.val() || {};
      
      return {
        _id: image._id,
        imageUrl,
        audioUrl,
        description: image.description || '',
        location: image.location || '',
        uploadDate: image.uploadDate,
        userId: image.userId,
        username: userInfo.username || 'Kullanıcı',
        userPhotoURL: userInfo.profilePhoto || null
      };
    }));
    
    res.status(200).json({ feed: enrichedImages });
  } catch (error) {
    console.error('Feed görsellerini getirme hatası:', error);
    res.status(500).json({ error: 'Feed görsellerini getirirken bir hata oluştu' });
  }
};

module.exports = {
  uploadImage,
  getImage,
  getUserImages,
  getUserImagesByDate,
  getFeedImages,
  deleteImage
};
