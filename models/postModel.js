// post.model.js

const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  savedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  }],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  caption: String,
  mediaType: String, // 'photo' or 'video'
  mediaUrl: String,
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  }],
  createdAt: { type: Date, default: Date.now },
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    },
    text: String
  }],
}, { timestamps: true });

const post = mongoose.model('post', postSchema);

module.exports = post;
