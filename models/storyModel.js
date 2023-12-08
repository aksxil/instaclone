const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
  {
    
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user', // Update this to match the name of your 'user' model
      required: true,
    },
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    // Set the expiration time to 24 hours (24 * 60 * 60 seconds)
    expires: 24 * 60 * 60,
  }
);

const Story = mongoose.model('Story', storySchema);

module.exports = Story;
