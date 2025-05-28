const { db, storage, admin } = require('../config/firebase');
const aiService = require('../services/ai.service');

const PostController = {
  createPost: async (req, res) => {
    try {
      const { imageUrl, audioUrl, location } = req.body;
      const userId = req.user.uid;

      // Generate AI caption for the image
      const caption = await aiService.generateImageCaption(imageUrl);
      
      // Analyze audio transcript (assuming we have the transcript)
      const transcript = req.body.transcript || '';
      const aiScore = await aiService.analyzeAudioTranscript(transcript);

      const postData = {
        userId,
        imageUrl,
        audioUrl,
        location,
        caption,
        aiScore,
        transcript,
        likes: [],
        comments: [],
        createdAt: new Date().toISOString()
      };

      const postRef = await db.collection('posts').add(postData);
      res.status(201).json({ id: postRef.id, ...postData });
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ error: 'Error creating post' });
    }
  },

  getFeed: async (req, res) => {
    try {
      const userId = req.user.uid;
      const userDoc = await db.collection('users').doc(userId).get();
      const following = userDoc.data().following || [];

      const postsSnapshot = await db.collection('posts')
        .where('userId', 'in', [...following, userId])
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      const posts = [];
      postsSnapshot.forEach(doc => {
        posts.push({ id: doc.id, ...doc.data() });
      });

      res.json(posts);
    } catch (error) {
      console.error('Error getting feed:', error);
      res.status(500).json({ error: 'Error getting feed' });
    }
  },

  likePost: async (req, res) => {
    try {
      const { postId } = req.params;
      const userId = req.user.uid;
      
      await db.collection('posts').doc(postId).update({
        likes: admin.firestore.FieldValue.arrayUnion(userId)
      });

      res.json({ message: 'Post liked successfully' });
    } catch (error) {
      console.error('Error liking post:', error);
      res.status(500).json({ error: 'Error liking post' });
    }
  },

  commentOnPost: async (req, res) => {
    try {
      const { postId } = req.params;
      const { text } = req.body;
      const userId = req.user.uid;

      const comment = {
        userId,
        text,
        createdAt: new Date().toISOString()
      };

      await db.collection('posts').doc(postId).update({
        comments: admin.firestore.FieldValue.arrayUnion(comment)
      });

      res.json({ message: 'Comment added successfully' });
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({ error: 'Error adding comment' });
    }
  }
};

module.exports = PostController;
