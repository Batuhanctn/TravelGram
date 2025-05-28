const express = require('express');
const router = express.Router();
const { upload, handleUploadErrors, ensureGridFSConnection } = require('../services/upload.service');
const { authenticateUser } = require('../middleware/auth.middleware');

// Audio controller - henüz oluşturulmadı, oluşturacağız
const audioController = require('../controllers/audio.controller');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Audio service is running' });
});

// Ses dosyası yükleme endpoint'i
router.post('/upload', 
  authenticateUser, 
  ensureGridFSConnection, 
  upload.audio.single('audio'), 
  handleUploadErrors, 
  audioController.uploadAudio
);

// Ses dosyası görüntüleme endpoint'i
router.get('/:id', audioController.getAudio);

// Kullanıcının ses dosyalarını listele
router.get('/myaudios', authenticateUser, audioController.getUserAudios);

// Ses dosyası silme endpoint'i
router.delete('/:id', authenticateUser, audioController.deleteAudio);

module.exports = router;
