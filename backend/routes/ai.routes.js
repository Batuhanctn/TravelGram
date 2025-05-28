const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth.middleware');
const aiController = require('../controllers/ai.controller');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'AI service is running' });
});

// Görsel analizi endpoint'i
router.post('/analyze-image', authenticateUser, aiController.analyzeImage);

// Görsel açıklaması üretme endpoint'i
router.post('/generate-description', authenticateUser, aiController.generateDescription);

// Görsel puanlama endpoint'i
router.post('/calculate-score', authenticateUser, aiController.calculateScore);

module.exports = router;
