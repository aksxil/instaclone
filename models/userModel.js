const mongoose = require('mongoose');
const plm = require('passport-local-mongoose');

const userSchema = mongoose.Schema({
    private: {
        type: Boolean,
        default: false,
      },
      followRequests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }],
    savedPosts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'post'
      }],
    fullName: String,
    username: {
        type: String,
        required: true,
        unique: true
    },
    is_online:{
        type:String,
        default:"0"
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    key:String,
    keyExpires:Date,
    password: String,
    profilePic: {
        type: String,
        default: "https://qph.cf2.quoracdn.net/main-qimg-6d72b77c81c9841bd98fc806d702e859-lq"
    },
    bio: String,
    website: String,
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }],
    savedPosts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'post'
    }]
}, { timestamps: true });

userSchema.plugin(plm);

module.exports = mongoose.model('user', userSchema);
