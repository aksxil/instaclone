const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  follower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  following: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
}, { timestamps: true });

const follow = mongoose.model('follow', followSchema);

module.exports = follow;
