const mongoose = require('mongoose');

// Resim modeli - MongoDB'de resim bilgilerini saklamak için
const ImageSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  // Gerçek dosya GridFS'de saklanacak
  // Bu, sadece dosya meta verilerini içerir
  uploadDate: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('Image', ImageSchema);
