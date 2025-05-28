const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // MongoDB Atlas bağlantı URL'si
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('MONGODB_URI çevre değişkeni tanımlanmamış!');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('MongoDB Atlas\'a başarıyla bağlandı');
  } catch (error) {
    console.error('MongoDB bağlantı hatası:', error.message);
    process.exit(1);
  }
};

module.exports = { connectDB };
