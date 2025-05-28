const mongoose = require('mongoose');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { GridFSBucket } = require('mongodb');
const Grid = require('gridfs-stream');
require('dotenv').config();

// MongoDB bağlantı URI'sini al
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('MONGODB_URI çevre değişkeni tanımlanmamış!');
  process.exit(1);
}

// Geçici klasör (GridFS'e aktarım öncesi)
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Multer storage (geçici dosya depolama)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(16, (err, buf) => {
      if (err) {
        console.error('Dosya adı oluştururken hata:', err);
        return cb(err);
      }
      const filename = buf.toString('hex') + path.extname(file.originalname);
      cb(null, filename);
    });
  }
});

// Resimler için filtre
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Sadece resim dosyaları yüklenebilir! (JPEG, JPG, PNG, GIF, WEBP)'));
  }
};

// Ses dosyaları için filtre
const audioFilter = (req, file, cb) => {
  const allowedTypes = /mp3|wav|ogg|m4a|aac/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.includes('audio');

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Sadece ses dosyaları yüklenebilir! (MP3, WAV, OGG, M4A, AAC)'));
  }
};

// Görüntü ve ses için multer konfigurasyonu
const uploadConfig = (fileType) => {
  let filter;
  let fileSize;

  if (fileType === 'image') {
    filter = imageFilter;
    fileSize = 5 * 1024 * 1024; // 5MB
  } else if (fileType === 'audio') {
    filter = audioFilter;
    fileSize = 10 * 1024 * 1024; // 10MB
  } else {
    filter = (req, file, cb) => cb(null, true); // Varsayılan: tüm dosya tiplerini kabul et
    fileSize = 5 * 1024 * 1024; // 5MB
  }

  return multer({
    storage: storage,
    limits: { fileSize: fileSize },
    fileFilter: filter
  });
};

// Multer yükleme nesneleri
const upload = {
  image: uploadConfig('image'),
  audio: uploadConfig('audio')
};

// GridFS değişkenleri
let gfs;
let gridFSBucket;

// GridFS bağlantısını kur
mongoose.connection.once('open', () => {
  // GridFS-Stream bağlantısı (okuma işlemleri için)
  gfs = Grid(mongoose.connection.db, mongoose.mongo);
  gfs.collection('uploads');
  
  // GridFSBucket bağlantısı (yazma işlemleri için)
  gridFSBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads'
  });
  
  console.log('GridFS bağlantısı hazır');
});

// Geçici dosyayı GridFS'e yükle
const uploadToGridFS = (filePath, originalname, metadata = {}) => {
  return new Promise((resolve, reject) => {
    // Eğer bağlantı yoksa hata dön
    if (!gridFSBucket) {
      return reject(new Error('GridFS bağlantısı hazır değil'));
    }
    
    const filename = path.basename(filePath);
    const contentType = metadata.contentType || 'application/octet-stream';
    
    // Dosya okunur ve GridFS'e aktarılır
    const readStream = fs.createReadStream(filePath);
    const writeStream = gridFSBucket.openUploadStream(filename, {
      contentType: contentType,
      metadata: {
        ...metadata,
        originalName: originalname
      }
    });
    
    // Hata durumunu izle
    readStream.on('error', (err) => {
      return reject(err);
    });
    
    writeStream.on('error', (err) => {
      return reject(err);
    });
    
    // Yükleme tamamlandığında
    writeStream.on('finish', (file) => {
      // Geçici dosyayı sil
      fs.unlink(filePath, (err) => {
        if (err) console.error('Geçici dosya silinirken hata:', err);
      });
      
      resolve({
        id: writeStream.id, 
        filename: filename
      });
    });
    
    // Yükleme işlemini başlat
    readStream.pipe(writeStream);
  });
};

// Upload işlemlerini izlemek için middleware
const handleUploadErrors = (err, req, res, next) => {
  if (err) {
    console.error('Dosya yükleme hatası:', err);
    return res.status(400).json({ error: err.message || 'Dosya yükleme hatası' });
  }
  next();
};

// GridFS bağlantısını kontrol eden middleware
const ensureGridFSConnection = (req, res, next) => {
  if (!gridFSBucket || !gfs) {
    const isConnected = mongoose.connection.readyState === 1;
    if (!isConnected) {
      return res.status(500).json({ error: 'MongoDB bağlantısı kurulamadı' });
    }
    return res.status(500).json({ error: 'GridFS bağlantısı hazır değil' });
  }
  next();
};

module.exports = { 
  upload,
  getGridFS: () => gridFSBucket,
  getGridFSStream: () => gfs,
  handleUploadErrors,
  ensureGridFSConnection,
  uploadToGridFS
};
