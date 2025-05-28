const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AudioSchema = new Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 0
  },
  transcript: {
    type: String,
    default: ''
  },
  gridFSId: {
    type: String
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Audio', AudioSchema);
