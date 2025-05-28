// Geliştirme modundan çıkmak için
const fs = require('fs');
const path = require('path');

try {
  // .expo klasörünü temizle
  const expoDir = path.join(__dirname, '.expo');
  if (fs.existsSync(expoDir)) {
    console.log('Temizleniyor: .expo klasörü');
    fs.rmSync(expoDir, { recursive: true, force: true });
  }

  // Development client göstergesi olan dosyaları sil
  const devClientFiles = [
    path.join(__dirname, '.expo-shared'),
    path.join(__dirname, 'android'),
    path.join(__dirname, 'ios')
  ];

  devClientFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`Temizleniyor: ${file}`);
      if (fs.lstatSync(file).isDirectory()) {
        fs.rmSync(file, { recursive: true, force: true });
      } else {
        fs.unlinkSync(file);
      }
    }
  });

  console.log('Temizlik tamamlandı! Lütfen "npx expo start --clear" komutunu çalıştırın.');
} catch (err) {
  console.error('Hata:', err);
}
