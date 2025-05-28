const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');

// Auth middleware'i daha sonra eklenecek
router.post('/', postController.createPost);
router.get('/feed', postController.getFeed);
router.post('/:postId/like', postController.likePost);
router.post('/:postId/comment', postController.commentOnPost);

module.exports = router;
