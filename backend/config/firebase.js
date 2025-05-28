const admin = require('firebase-admin');
require('dotenv').config();

// Firebase özel anahtar JSON formatında olmalıdır
const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://travelgram-8b530-default-rtdb.europe-west1.firebasedatabase.app',
  storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
});

// Realtime Database referansı
const db = admin.database();
const firebaseAuth = admin.auth();

console.log('Firebase Realtime Database yapılandırması başarılı');

module.exports = { admin, db, firebaseAuth };
