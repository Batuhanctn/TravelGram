const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

// Kullanıcı arama - ÖNEMLİ: Parametre içermeyen route'lar parametrik olanlardan ÖNCE gelmeli
router.get('/search', authenticateUser, userController.searchUsers);

// Kullanıcı işlemleri
router.post('/', userController.createUser);
router.get('/:userId', userController.getUser);
router.put('/:userId', userController.updateUser);

// Takip işlemleri
router.post('/:userId/follow', authenticateUser, userController.followUser);
router.post('/:userId/unfollow', authenticateUser, userController.unfollowUser);

// Takipçi ve takip edilen listelerini getirme
router.get('/:userId/followers', authenticateUser, userController.getFollowers);
router.get('/:userId/following', authenticateUser, userController.getFollowing);

module.exports = router;
