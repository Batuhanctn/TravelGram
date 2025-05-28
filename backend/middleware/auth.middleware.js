// firebaseAuth şeklinde yeniden adlandırıldı (Realtime Database yapılandırması değişikliğinden dolayı)
const { firebaseAuth } = require('../config/firebase');

// Firebase Auth ile kimlik doğrulama middleware'i
const authenticateUser = async (req, res, next) => {
  console.log('\n==== AUTH MIDDLEWARE BAŞLADI ====');
  console.log('Endpoint:', req.method, req.originalUrl);
  console.log('Headers:', JSON.stringify(req.headers));
  
  try {
    // Authorization header kontrolü
    if (!req.headers.authorization) {
      console.log('Authorization header bulunamadı');
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authorization header eksik' 
      });
    }
    
    console.log('Authorization header bulundu:', req.headers.authorization.substring(0, 20) + '...');
    
    // Token formatını kontrol et
    if (!req.headers.authorization.startsWith('Bearer ')) {
      console.log('Token formatı hatalı (Bearer ile başlamıyor)');
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Token formatı hatalı' 
      });
    }
    
    // Token'i ayıkla
    const token = req.headers.authorization.split('Bearer ')[1];
    if (!token) {
      console.log('Token bulunamadı');
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Token bulunamadı' 
      });
    }
    
    console.log('Token alındı (ilk 20 karakter):', token.substring(0, 20) + '...');
    console.log('Token doğrulama işlemi başlıyor...');
    
    // Firebase token doğrulama
    try {
      const decodedToken = await firebaseAuth.verifyIdToken(token);
      console.log('Token başarıyla doğrulandı. Kullanıcı UID:', decodedToken.uid);
      req.user = decodedToken;
      console.log('==== AUTH MIDDLEWARE BAŞARILI ====\n');
      next();
    } catch (verifyError) {
      console.error('Token doğrulama hatası:', verifyError);
      console.log('Token detayları (hatalı):', token.substring(0, 30) + '...');
      console.log('==== AUTH MIDDLEWARE BAŞARISIZ: TOKEN DOĞRULAMA HATASI ====\n');
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Token doğrulanamadı: ' + verifyError.message 
      });
    }
  } catch (error) {
    console.error('Kimlik doğrulama genel hatası:', error);
    console.log('==== AUTH MIDDLEWARE BAŞARISIZ: GENEL HATA ====\n');
    res.status(500).json({ 
      error: 'Server Error', 
      message: 'Kimlik doğrulama sürecinde beklenmeyen bir hata oluştu' 
    });
  }
};

module.exports = { authenticateUser };
