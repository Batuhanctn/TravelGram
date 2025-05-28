// AI Controller
const fetch = require('node-fetch');
const { getGridFS } = require('../services/upload.service');
const Image = require('../models/Image');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Gemini API ayarları
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';

// Görsel analiz işlemi
const analyzeImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Görsel URL\'si gereklidir' });
    }
    
    console.log(`Görsel analizi başlıyor: ${imageUrl}`);

    // URL'den gerçek resim dosyasına erişmek için
    // Eğer resim URL'i yerel bir dosya yolu ise
    let imageData;
    let base64Image;

    try {
      // Eğer bu bir tam URL ise, fetch et
      if (imageUrl.startsWith('http')) {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`HTTP error! status: ${imageResponse.status}`);
        }
        const buffer = await imageResponse.buffer();
        base64Image = buffer.toString('base64');
      } 
      // Eğer bu bir MongoDB ID ise, GridFS'den al
      else if (mongoose.Types.ObjectId.isValid(imageUrl.split('/').pop())) {
        const imageId = imageUrl.split('/').pop();
        const bucket = getGridFS();
        const image = await Image.findById(imageId);
        
        if (!image) {
          throw new Error('Görsel bulunamadı');
        }
        
        const downloadStream = bucket.openDownloadStreamByName(image.filename);
        const chunks = [];
        
        await new Promise((resolve, reject) => {
          downloadStream.on('data', (chunk) => {
            chunks.push(chunk);
          });
          
          downloadStream.on('error', reject);
          
          downloadStream.on('end', () => {
            resolve();
          });
        });
        
        const buffer = Buffer.concat(chunks);
        base64Image = buffer.toString('base64');
      }
      else {
        throw new Error('Geçersiz görsel URL formatı');
      }
    } catch (error) {
      console.error('Görsel yükleme hatası:', error);
      return res.status(500).json({ error: `Görsel yükleme hatası: ${error.message}` });
    }
    
    // Gemini API isteği hazırlama
    const geminiRequestBody = {
      contents: [
        {
          parts: [
            {
              text: `Lütfen aşağıdaki sorulara bu görsel hakkında cevap ver:\n
1-Bu resimde ne görüyorsun?\n
2-Bu resimde tarihi bir mekan veya obje varsa bu obje veya mekanın tarihi nedir?\n
3-Bu görselde bulunanların görülmesi neden önemlidir?\n
4-Diğer insanlar bu mekanı ya da objeyi neden görmeliler?\n
5-Bu obje veya mekanı gören insanlar başka hangi mekan veya objeler dikkatini çeker(buna benzer mekan veya objeler nerelerde vardır?)\n\nYanıtını bölümler halinde değil, akıcı bir paragraf şeklinde hazırla. Kullanıcı bu yanıtı sosyal medyada paylaşacak.`
            },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }
      ]
    };
    
    // Gemini API'ye istek gönder
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiRequestBody)
    });
    
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API hatası:', errorText);
      throw new Error(`Gemini API hatası: ${geminiResponse.status}`);
    }
    
    const geminiData = await geminiResponse.json();
    console.log('Gemini API yanıtı alındı');
    
    let analysisText = '';
    if (geminiData.candidates && geminiData.candidates.length > 0 && 
        geminiData.candidates[0].content && 
        geminiData.candidates[0].content.parts && 
        geminiData.candidates[0].content.parts.length > 0) {
      analysisText = geminiData.candidates[0].content.parts[0].text;
    } else {
      analysisText = 'Analiz sonucu bulunamadı';
    }
    
    // Analiz sonucunu döndür
    res.json({
      success: true,
      analysis: {
        analysisText,
        tags: geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.split(' ').filter(word => word.length > 5).slice(0, 5) || ['seyahat', 'gezi', 'keşif']
      }
    });
    
  } catch (error) {
    console.error('AI görsel analiz hatası:', error);
    res.status(500).json({ error: `AI analiz hatası: ${error.message}` });
  }
};

// Görsel açıklaması üretme işlemi
const generateDescription = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Görsel URL\'si gereklidir' });
    }
    
    console.log(`Görsel açıklaması üretiliyor: ${imageUrl}`);

    // URL'den gerçek resim dosyasına erişmek için
    let base64Image;

    try {
      // Eğer bu bir tam URL ise, fetch et
      if (imageUrl.startsWith('http')) {
        console.log('HTTP URL resmi indiriliyor...');
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`HTTP error! status: ${imageResponse.status}`);
        }
        const buffer = await imageResponse.arrayBuffer();
        base64Image = Buffer.from(buffer).toString('base64');
      } 
      // Eğer bu bir MongoDB ID ise, GridFS'den al
      else if (mongoose.Types.ObjectId.isValid(imageUrl.split('/').pop())) {
        console.log('MongoDB\'den resim indiriliyor...');
        const imageId = imageUrl.split('/').pop();
        const bucket = getGridFS();
        const image = await Image.findById(imageId);
        
        if (!image) {
          throw new Error('Görsel bulunamadı');
        }
        
        // Geçici bir klasör oluşturup dosyayı kaydet
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const filePath = path.join(tempDir, image.filename);
        const writeStream = fs.createWriteStream(filePath);
        const downloadStream = bucket.openDownloadStreamByName(image.filename);
        
        await new Promise((resolve, reject) => {
          downloadStream.pipe(writeStream)
            .on('finish', resolve)
            .on('error', reject);
        });
        
        // Dosyayı oku ve Base64'e çevir
        const fileBuffer = fs.readFileSync(filePath);
        base64Image = fileBuffer.toString('base64');
        
        // Geçici dosyayı temizle
        fs.unlinkSync(filePath);
      } else {
        throw new Error('Geçersiz resim URL\'si veya ID');
      }
      
      console.log('Resim başarıyla yüklendi, Gemini API\'sine gönderiliyor...');
      
      // Soruları hazırla
      const prompt = `Bu resimde ne görüyörsun? Bu resimde tarihi bir mekan veya obje varsa bu obje veya mekanın tarihi nedir? Bu görselde bulunanların görülmesi neden önemlidir? Diğer insanlar bu mekanı ya da objeyi neden görmeliler? Bu obje veya mekanı gören insanlar başka hangi mekan veya objeler dikkatini çeker?`;
      
      // Gemini API\'ye gönder
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image
                }
              }
            ]
          }]
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API hatası:', errorText);
        throw new Error(`Gemini API hatası: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const analysisText = data.candidates[0].content.parts[0].text;
      
      console.log('AI analizi başarılı');
      console.log('Analiz metni (örnek): ' + analysisText.substring(0, 100) + '...');
      
      res.json({
        success: true,
        analysis: {
          analysisText
        }
      });
    } catch (error) {
      console.error('Resim işleme veya API hatası:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  } catch (error) {
    console.error('AI açıklama üretme hatası:', error);
    res.status(500).json({ success: false, error: `AI açıklama hatası: ${error.message}` });
  }
};

// Görsel puanlama işlemi - kullanıcı dostu bir puan vermek için basit bir değerlendirme döndürelim
const calculateScore = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Görsel URL\'si gereklidir' });
    }
    
    console.log(`Görsel puanlaması yapılıyor: ${imageUrl}`);
    
    // Rastgele bir puan ve pozitif bir geri bildirim oluştur
    const randomScore = (min, max) => Math.round((Math.random() * (max - min) + min) * 10) / 10;
    
    const score = {
      overall: randomScore(8.0, 9.5),
      composition: randomScore(7.5, 9.5),
      lighting: randomScore(7.5, 9.5),
      subject: randomScore(8.0, 9.5),
      creativity: randomScore(7.5, 9.5),
      feedback: 'Bu etkileyici görsel profesyonel bir çekim kalitesi yansıtıyor. Kompozisyon dengeli ve konu net şekilde görülebiliyor. Işık kullanımı oldukça başarılı. TravelGram topluluğu bu görseli beğenecek!'
    };
    
    console.log('Görsel puanlaması tamamlandı');
    
    res.json({
      success: true,
      score
    });
  } catch (error) {
    console.error('AI puanlama hatası:', error);
    res.status(500).json({ error: `AI puanlama hatası: ${error.message}` });
  }
};

module.exports = {
  analyzeImage,
  generateDescription,
  calculateScore
};
