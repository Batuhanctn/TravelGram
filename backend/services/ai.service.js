const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class AIService {
  async generateImageCaption(imageUrl) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
      const result = await model.generateContent([imageUrl]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating image caption:', error);
      throw error;
    }
  }

  async analyzeAudioTranscript(transcript) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `Please analyze this travel story and rate it on a scale of 1-10 based on its informativeness, engagement, and storytelling quality: "${transcript}"`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      // Extract the numerical score from the response
      const score = parseInt(response.text().match(/\d+/)[0]) || 5;
      return score;
    } catch (error) {
      console.error('Error analyzing audio transcript:', error);
      throw error;
    }
  }

  async generateTravelRecommendations(userInterests, visitedLocations) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `Based on the user's interests: ${userInterests.join(', ')} and previously visited locations: ${visitedLocations.join(', ')}, suggest 3 new travel destinations with brief descriptions.`;
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating travel recommendations:', error);
      throw error;
    }
  }
}

module.exports = new AIService();
