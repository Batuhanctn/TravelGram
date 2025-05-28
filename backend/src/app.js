const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { connectDB } = require('../config/mongodb');

// MongoDB Atlas'a bağlan
connectDB().catch(err => console.error('MongoDB bağlantı hatası:', err));

const app = express();

// CORS Yapılandırması - basitleştirilmiş ama etkili
app.use(cors());

// JSON ve form verileri için middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const userRoutes = require('../routes/user.routes');
const postRoutes = require('../routes/post.routes');
const imageRoutes = require('../routes/image.routes');
const audioRoutes = require('../routes/audio.routes');
const aiRoutes = require('../routes/ai.routes');

app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/ai', aiRoutes);
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

const PORT = process.env.PORT || 5001; // 5000'den 5001'e değiştirildi - AirTunes çakışmasını önlemek için
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
