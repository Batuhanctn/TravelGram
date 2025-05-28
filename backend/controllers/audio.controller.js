const { getGridFS, getGridFSStream, uploadToGridFS } = require('../services/upload.service');
const Audio = require('../models/Audio');
const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;
const fs = require('fs');
const path = require('path');

// Ses dosyası yükleme işlemi
const uploadAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Hiçbir ses dosyası yüklenmedi' });
    }

    // Kullanıcı bilgilerini al
    const { uid } = req.user;
    console.log(`Ses yükleme başlıyor - Kullanıcı: ${uid}, Dosya: ${req.file.filename}`);
    
    // Geçici dosyayı GridFS'e yükle
    try {
      // Dosya yolu ve metadata bilgisi
      const filePath = req.file.path;
      const metadata = {
        userId: uid,
        contentType: req.file.mimetype,
        description: req.body.description || '',
        duration: req.body.duration || 0,
        transcript: req.body.transcript || ''
      };
      
      // GridFS'e yükleme yap
      console.log(`GridFS'e ses yükleme başlıyor: ${filePath}`);
      const uploadResult = await uploadToGridFS(filePath, req.file.originalname, metadata);
      console.log(`GridFS'e ses yükleme tamamlandı:`, uploadResult);
      
      // MongoDB'de meta veri kaydı oluştur
      const newAudio = new Audio({
        filename: uploadResult.filename,
        originalName: req.file.originalname,
        contentType: req.file.mimetype,
        size: req.file.size,
        userId: uid,
        duration: req.body.duration || 0,
        transcript: req.body.transcript || '',
        gridFSId: uploadResult.id,
        uploadDate: new Date()
      });
      
      await newAudio.save();
      console.log(`Ses meta verisi kaydedildi, ID: ${newAudio._id}`);
      
      res.status(201).json({
        success: true,
        audioId: newAudio._id,
        filename: uploadResult.filename,
        message: 'Ses dosyası başarıyla MongoDB GridFS sistemine yüklendi'
      });
    } catch (gridFSError) {
      console.error('GridFS ses yükleme hatası:', gridFSError);
      return res.status(500).json({ error: `GridFS ses yükleme hatası: ${gridFSError.message}` });
    }
  } catch (error) {
    console.error('Ses yükleme hatası:', error);
    res.status(500).json({ error: 'Ses dosyası yüklenirken bir hata oluştu' });
  }
};

// Ses dosyası görüntüleme işlemi
const getAudio = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Ses meta verilerini bul
    const audio = await Audio.findById(id);
    if (!audio) {
      return res.status(404).json({ error: 'Ses dosyası bulunamadı' });
    }

    // GridFS bucket'i al
    const bucket = getGridFS();
    if (!bucket) {
      return res.status(500).json({ error: 'GridFS bağlantısı oluşturulamadı' });
    }
    
    // Content-Type header'ını ayarla
    res.set('Content-Type', audio.contentType);
    
    // GridFS'ten dosyayı stream olarak oku
    console.log(`GridFS'ten ses dosyası okunuyor: ${audio.filename}`);
    const downloadStream = bucket.openDownloadStreamByName(audio.filename);
    
    // Stream hata yönetimi
    downloadStream.on('error', function(error) {
      console.error(`GridFS ses okuma hatası: ${error.message}`);
      return res.status(404).json({ error: 'Ses dosyası bulunamadı veya okunamadı' });
    });
    
    // Stream'i response olarak ilet
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Ses görüntüleme hatası:', error);
    res.status(500).json({ error: 'Ses dosyası görüntülenirken bir hata oluştu' });
  }
};

// Kullanıcının ses dosyalarını listeleme
const getUserAudios = async (req, res) => {
  try {
    const { uid } = req.user;
    
    const userAudios = await Audio.find({ userId: uid })
      .sort({ uploadDate: -1 }) // En yeniden en eskiye
      .select('-__v');
    
    res.json(userAudios);
  } catch (error) {
    console.error('Kullanıcı ses dosyalarını listeleme hatası:', error);
    res.status(500).json({ error: 'Ses dosyaları listelenirken bir hata oluştu' });
  }
};

// Ses dosyası silme işlemi
const deleteAudio = async (req, res) => {
  try {
    const { id } = req.params;
    const { uid } = req.user;

    // Önce ses meta verilerini bul
    const audio = await Audio.findById(id);
    if (!audio) {
      return res.status(404).json({ error: 'Ses dosyası bulunamadı' });
    }

    // Kullanıcının kendi ses dosyalarını silme yetkisi kontrolü
    if (audio.userId !== uid) {
      return res.status(403).json({ error: 'Bu ses dosyasını silme yetkiniz yok' });
    }

    // GridFS bucket'i al
    const bucket = getGridFS();
    if (!bucket) {
      return res.status(500).json({ error: 'GridFS bağlantısı oluşturulurken hata' });
    }
    
    // Önce GridFS'ten dosyayı bul ve ID'sini al
    try {
      // Dosya gridFSId ile kaydedilmişse, direkt olarak kullan
      if (audio.gridFSId) {
        const fileId = new ObjectId(audio.gridFSId);
        console.log(`GridFS'ten ses dosyası siliniyor, ID: ${fileId}`);
        await bucket.delete(fileId);
      } 
      // Aksi halde, dosya adı ile bul ve sil
      else {
        // GridFS koleksiyonlarına erişim al
        const filesCollection = mongoose.connection.db.collection('uploads.files');
        
        // Dosyayı adına göre bul
        const file = await filesCollection.findOne({ filename: audio.filename });
        if (file) {
          console.log(`GridFS'ten ses dosyası siliniyor, ID: ${file._id}`);
          await bucket.delete(file._id);
        } else {
          console.log(`GridFS'te ses dosyası bulunamadı: ${audio.filename}`);
        }
      }
    } catch (gridFSError) {
      console.error('GridFS ses dosyası silme hatası:', gridFSError);
      // GridFS silme hatası olsa bile veritabanı kaydını silmeye devam et
    }

    // Veritabanından meta verileri sil
    await Audio.findByIdAndDelete(id);
    console.log(`Ses dosyası veritabanından silindi, ID: ${id}`);

    res.json({ success: true, message: 'Ses dosyası başarıyla silindi' });
  } catch (error) {
    console.error('Ses dosyası silme hatası:', error);
    res.status(500).json({ error: 'Ses dosyası silinirken bir hata oluştu' });
  }
};

module.exports = {
  uploadAudio,
  getAudio,
  getUserAudios,
  deleteAudio
};
