const express = require('express');
const router = express.Router();
const { uploadImage, getImage, getUserImages, getUserImagesByDate, getFeedImages, deleteImage } = require('../controllers/image.controller');
const { upload, handleUploadErrors, ensureGridFSConnection } = require('../services/upload.service');
const { authenticateUser } = require('../middleware/auth.middleware');

// Sunucu durumunu kontrol etmek için health check rotası
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Image service is running' });
});

// Resim yükleme rotası - gelişmiş hata yönetimi ve bağlantı kontrolü ile
router.post('/upload', 
  authenticateUser, 
  ensureGridFSConnection, 
  upload.image.single('image'), 
  handleUploadErrors, 
  uploadImage
);

// Kullanıcının resimlerini listeleme
router.get('/myimages', authenticateUser, getUserImages);

// Kullanıcının resimlerini listeleme
router.get('/user/:userId', getUserImages);

// Belirli bir resmi görüntüleme
router.get('/:id', getImage);

// Belirli bir resmi silme
router.delete('/:id', authenticateUser, deleteImage);

// YENI ROTALAR
// Kullanıcı profili için gönderileri tarihe göre getirme
router.get('/profile/:userId', authenticateUser, getUserImagesByDate);

// Ana sayfa için feed (kullanıcının ve takip ettiklerinin gönderileri)
router.get('/feed', authenticateUser, getFeedImages);

module.exports = router;
