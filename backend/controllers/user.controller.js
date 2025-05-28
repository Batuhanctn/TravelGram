const { db, admin, firebaseAuth } = require('../config/firebase');

// Firebase Realtime Database referansı
const usersRef = db.ref('users');

const UserController = {
  createUser: async (req, res) => {
    try {
      const { uid, email, username, interests = [] } = req.body;
      
      // Realtime Database kullanarak kullanıcı oluşturma
      await usersRef.child(uid).set({
        email,
        username,
        bio: "",
        interests,
        followers: [],
        following: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        photoURL: null
      });

      res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu' });
    } catch (error) {
      console.error('Kullanıcı oluşturma hatası:', error);
      res.status(500).json({ error: 'Kullanıcı oluşturulurken bir hata oluştu' });
    }
  },

  getUser: async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Realtime Database kullanarak kullanıcı bilgilerini al
      const userSnapshot = await usersRef.child(userId).once('value');
      const userData = userSnapshot.val();

      if (!userData) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }

      res.json({ id: userId, ...userData });
    } catch (error) {
      console.error('Kullanıcı bilgileri çekilirken hata:', error);
      res.status(500).json({ error: 'Kullanıcı bilgileri alınırken bir hata oluştu' });
    }
  },

  updateUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      // Realtime Database kullanarak kullanıcı bilgilerini güncelle
      await usersRef.child(userId).update(updates);
      res.json({ message: 'Kullanıcı bilgileri başarıyla güncellendi' });
    } catch (error) {
      console.error('Kullanıcı güncelleme hatası:', error);
      res.status(500).json({ error: 'Kullanıcı bilgileri güncellenirken bir hata oluştu' });
    }
  },

  searchUsers: async (req, res) => {
    try {
      console.log('\n==== KULLANICI ARAMA İŞLEMİ BAŞLADI ====');
      console.log('Kullanıcı arama isteği alındı, query:', req.query);
      console.log('Kullanıcı UID:', req.user?.uid || 'Belirtilmedi');
      
      const { q } = req.query;
      
      if (!q || q.length < 2) {
        console.log('Sorgu çok kısa, boş sonuç döndürülüyor');
        return res.json({ users: [] });
      }
      
      console.log(`'${q}' için Realtime Database'de arama yapılıyor...`);
      
      try {
        // Realtime Database referansını kontrol et
        console.log('usersRef tipini kontrol ediyoruz:', typeof usersRef, 'metotlar:', Object.keys(usersRef));
        
        // Realtime Database kullanarak kullanıcıları çek
        console.log('Snapshot alınıyor...');
        const snapshot = await usersRef.once('value');
        console.log('Snapshot alındı, exists:', snapshot.exists());
        
        const usersData = snapshot.val() || {};
        console.log('Kullanıcılar yüklendi, veri boyutu:', Object.keys(usersData).length);
        console.log('Veri örneği (ilk kullanıcı):', Object.keys(usersData).length > 0 ? 
          JSON.stringify(usersData[Object.keys(usersData)[0]]).substring(0, 100) + '...' : 'Kullanıcı yok');
        
        const users = [];
        
        // Tüm kullanıcıları döngü ile işle ve filtrele
        Object.keys(usersData).forEach(userId => {
          const userData = usersData[userId];
          
          console.log(`Kullanıcı kontrol ediliyor - ID: ${userId}, username: ${userData.username || 'yok'}`);
          
          // Kullanıcı adı varsa ve arama terimini içeriyorsa
          if (userData.username && 
              userData.username.toLowerCase().includes(q.toLowerCase())) {
            // Kullanıcı nesnesini oluştur
            console.log(`Eşleşme bulundu - Kullanıcı ID: ${userId}, username: ${userData.username}`);
            users.push({
              id: userId,
              ...userData,
              // Hassas verileri filtrele
              password: undefined
            });
          }
        });
        
        console.log(`${users.length} eşleşen kullanıcı bulundu.`);
        console.log('Döndürülen kullanıcılar:', users.map(u => ({ id: u.id, username: u.username })));
        console.log('==== KULLANICI ARAMA İŞLEMİ TAMAMLANDI ====\n');
        
        return res.json({ users });
      } catch (dbError) {
        console.error('Database erişim hatası:', dbError);
        throw new Error(`Database erişim hatası: ${dbError.message}`);
      }
    } catch (error) {
      console.error('Kullanıcı arama hatası:', error);
      console.error('Hata stack:', error.stack);
      res.status(500).json({ error: 'Kullanıcı arama sırasında bir hata oluştu', details: error.message });
    }
  },
  
  followUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const followerId = req.user.uid;
      
      // Kullanıcının kendisini takip etmesini engelle
      if (userId === followerId) {
        return res.status(400).json({ error: 'Kendinizi takip edemezsiniz' });
      }
      
      // Kullanıcının varlığını kontrol et - Realtime Database
      const userSnapshot = await usersRef.child(userId).once('value');
      if (!userSnapshot.exists()) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }
      
      const followerSnapshot = await usersRef.child(followerId).once('value');
      if (!followerSnapshot.exists()) {
        return res.status(404).json({ error: 'Takip eden kullanıcı bulunamadı' });
      }

      // Hedef kullanıcının takipçilerini güncelle
      const userData = userSnapshot.val() || {};
      const userFollowers = userData.followers || [];
      
      // Takip eden kullanıcının takip ettiklerini güncelle
      const followerData = followerSnapshot.val() || {};
      const followerFollowing = followerData.following || [];
      
      // Eğer zaten takip ediyorsa, tekrar ekleme
      if (!userFollowers.includes(followerId)) {
        userFollowers.push(followerId);
        await usersRef.child(userId).update({ followers: userFollowers });
      }
      
      if (!followerFollowing.includes(userId)) {
        followerFollowing.push(userId);
        await usersRef.child(followerId).update({ following: followerFollowing });
      }

      res.json({ 
        success: true,
        message: 'Kullanıcı başarıyla takip edildi' 
      });
    } catch (error) {
      console.error('Kullanıcı takip etme hatası:', error);
      res.status(500).json({ error: 'Kullanıcı takip edilirken hata oluştu' });
    }
  },
  
  unfollowUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const followerId = req.user.uid;
      
      // Kullanıcının kendisini takipten çıkarmasını engelle
      if (userId === followerId) {
        return res.status(400).json({ error: 'Kendinizi takipten çıkaramazsınız' });
      }
      
      // Kullanıcıların varlığını kontrol et - Realtime Database
      const userSnapshot = await usersRef.child(userId).once('value');
      if (!userSnapshot.exists()) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }
      
      const followerSnapshot = await usersRef.child(followerId).once('value');
      if (!followerSnapshot.exists()) {
        return res.status(404).json({ error: 'Takip eden kullanıcı bulunamadı' });
      }

      // Hedef kullanıcının takipçilerini güncelle
      const userData = userSnapshot.val() || {};
      const userFollowers = userData.followers || [];
      
      // Takip eden kullanıcının takip ettiklerini güncelle
      const followerData = followerSnapshot.val() || {};
      const followerFollowing = followerData.following || [];
      
      // Takipçi listesinden çıkar
      const updatedUserFollowers = userFollowers.filter(id => id !== followerId);
      await usersRef.child(userId).update({ followers: updatedUserFollowers });
      
      // Takip edilen listesinden çıkar
      const updatedFollowerFollowing = followerFollowing.filter(id => id !== userId);
      await usersRef.child(followerId).update({ following: updatedFollowerFollowing });

      res.json({ 
        success: true,
        message: 'Kullanıcı takibi başarıyla bırakıldı' 
      });
    } catch (error) {
      console.error('Kullanıcı takibi bırakma hatası:', error);
      res.status(500).json({ error: 'Kullanıcı takibi bırakılırken hata oluştu' });
    }
  },
  
  getFollowers: async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Kullanıcının varlığını kontrol et - Realtime Database
      const userSnapshot = await usersRef.child(userId).once('value');
      if (!userSnapshot.exists()) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }
      
      const userData = userSnapshot.val();
      const followers = userData.followers || [];
      
      // Boş takipçi listesi kontrolü
      if (followers.length === 0) {
        return res.json({ followers: [] });
      }
      
      // Takipçi kullanıcı bilgilerini getir
      const followersData = [];
      const followerPromises = followers.map(followerId => {
        return usersRef.child(followerId).once('value');
      });
      
      const followerSnapshots = await Promise.all(followerPromises);
      
      followerSnapshots.forEach(snapshot => {
        if (snapshot.exists()) {
          const followerData = snapshot.val();
          followersData.push({
            id: snapshot.key,
            ...followerData,
            // Hassas verileri filtrele
            password: undefined
          });
        }
      });
      
      res.json({ followers: followersData });
    } catch (error) {
      console.error('Takipçileri alma hatası:', error);
      res.status(500).json({ error: 'Takipçiler alınırken hata oluştu' });
    }
  },
  
  getFollowing: async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Kullanıcının varlığını kontrol et - Realtime Database
      const userSnapshot = await usersRef.child(userId).once('value');
      if (!userSnapshot.exists()) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }
      
      const userData = userSnapshot.val();
      const following = userData.following || [];
      
      // Boş takip edilen listesi kontrolü
      if (following.length === 0) {
        return res.json({ following: [] });
      }
      
      // Takip edilen kullanıcı bilgilerini getir
      const followingData = [];
      const followingPromises = following.map(followedId => {
        return usersRef.child(followedId).once('value');
      });
      
      const followingSnapshots = await Promise.all(followingPromises);
      
      followingSnapshots.forEach(snapshot => {
        if (snapshot.exists()) {
          const followedData = snapshot.val();
          followingData.push({
            id: snapshot.key,
            ...followedData,
            // Hassas verileri filtrele
            password: undefined
          });
        }
      });
      
      res.json({ following: followingData });
    } catch (error) {
      console.error('Takip edilenleri alma hatası:', error);
      res.status(500).json({ error: 'Takip edilenler alınırken hata oluştu' });
    }
  }
};

module.exports = UserController;
