var express = require('express');
const passport = require('passport');
var router = express.Router();
var users = require('../models/userModel');
var postModel = require('../models/postModel');
var commentModel = require('../models/commentModel');
const mongoose = require('mongoose');
const multer = require("multer");
const userModel = require('../models/userModel');
const storyModel = require("../models/storyModel")
const chatModel = require("../models/chatModel")
const upload = multer();
const moment = require('moment');
var mailer = require("../nodemailer")
const crypto = require("crypto");
const { accessSync } = require('fs');



mongoose.connect('mongodb+srv://aksx3u:T6PdawoR4sbROgUU@instaclone.oti8ify.mongodb.net/instcloneretryWrites=true&w=majority').then(()=>{
  console.log("connect to database")
}).catch(err=>{
  console.log(err)
})





router.get('/', isloggedIn, async (req, res) => {
  try {
    const loggedInUser = req.user;

    // Retrieve the list of users that the logged-in user is following
    const followingUsers = loggedInUser.following;

    // suggested users 
    const suggestedUsers = await userModel.aggregate([
      { $match: { _id: { $nin: [...followingUsers, loggedInUser._id] } } },
      { $sample: { size: 5 } }
    ]);

    // Find posts created by the users that the logged-in user is following
    let posts = await postModel.find({ user: { $in: followingUsers } })
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          model: 'user',
          select: 'username profilePic'
        }
      })
      .populate('user')
      .populate({
        path: 'likes',
        model: 'user',
        select: 'username profilePic fullName'
      });

    // Sort posts in descending order based on createdAt
    posts = posts.sort((a, b) => b.createdAt - a.createdAt);

    // Find stories created by the users that the logged-in user is following
    const stories = await storyModel.find({ user: { $in: followingUsers } })
      .populate('user' ,'username profilePic');

    // Determine if the logged-in user is the owner of each comment
    posts.forEach(post => {
      post.comments.forEach(comment => {
        comment.isOwner = comment.user._id.equals(req.user._id);
      });
    });

    // Filter out users who don't have stories
    const users = followingUsers.filter(user => stories.some(story => story.user._id.equals(user._id)));

    // Determine if each user has stories
    users.forEach(user => {
      user.hasStory = stories.some(story => story.user._id.equals(user._id));
    });

    // Pass the data to the template
    res.render('index', { posts, stories, users, user: req.user, suggestedUsers, loggedInUser });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});



router.get('/reels', isloggedIn, async (req, res) => {
  try {
    const loggedInUser = req.user
    const loginUser = req.user;
    let videoPosts = await postModel.find({ mediaType: 'video' }).populate('user');

    // Sort video posts in descending order based on createdAt
    videoPosts = videoPosts.sort((a, b) => b.createdAt - a.createdAt);

    res.render('reels', { user: loginUser, posts: videoPosts ,loggedInUser});
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});





router.get('/login',(req,res,next)=>{
  res.render('login')
})
router.get('/register',(req,res,next)=>{
  res.render('register')
})
router.get("/edit",function(req,res,next){
  var loginUser = req.user; // This will contain the logged-in user's information
  res.render('edit', {  user: loginUser }); 
})

const localStrategy = require('passport-local').Strategy; // Import the Strategy class
passport.use(new localStrategy(users.authenticate()));
router.post('/register', (req, res, next) => {
  var newUser = {
    //user data here
    username: req.body.username,
    email: req.body.email,
    fullName:req.body.fullName,
    //user data here
  };
  users
    .register(newUser, req.body.password)
    .then((result) => {
      passport.authenticate('local')(req, res, () => {
        //destination after user register
        res.redirect('/');
      });
    })
    .catch((err) => {
      res.send(err);
    });
});

router.get('/auth', (req, res, next) => {
  res.render('register')
})
router.post('/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/auth',
  }),
  (req, res, next) => { }
);

router.get('/logout', (req, res, next) => {
  if (req.isAuthenticated())
    req.logout((err) => {
      if (err) res.send(err);
      else res.redirect('/');
    });
  else {
    res.redirect('/auth');
  }
});

function isloggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  else res.redirect('/auth');
}

router.get('/forgot', function (req, res, next) {
  res.render('forgot');
});
router.post('/forgot', async function (req, res, next) {
  var user = await userModel.findOne({ email: req.body.email });
  if (!user) {
    res.send("We've sent a mail, if email exists.");
  } else {
    try {
      // Generate a random key
      crypto.randomBytes(80, async function (err, buff) {
        // Add this code after generating the random key
        let key = buff.toString("hex");
        user.key = key;
        user.keyExpires = Date.now() + 24 * 60 * 60 * 1000; 


        // Save the key to the user model
        await user.save();

        // Send the email with the reset link
        await mailer(req.body.email, user._id, key);

        // Redirect or send a response
        console.log("link sent")
        res.send("Password reset link sent successfully.");
      });
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  }
});

router.get('/reset/:userid/:key', async function (req, res, next) {
  const userId = req.params.userid;
  const key = req.params.key;

  try {
    const user = await userModel.findById(userId);

    // Check if the user exists and the key matches
    if (!user || user.key !== key) {
      return res.status(400).send('Invalid reset link');
    }
     // Check if the key has expired
     if (user.keyExpires && user.keyExpires < Date.now()) {
      return res.status(400).send('Reset link has expired');
    }

    // Render a reset password form
    res.render('reset', { userId, key });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/reset/:userid/:key', async function (req, res, next) {
  const userId = req.params.userid;
  const key = req.params.key;

  const newPassword = req.body.password;
  const confirmPassword = req.body.confirmPassword

  try {
    const user = await userModel.findById(userId);

    // Check if the user exists and the key matches
    if (!user || user.key !== key) {
      return res.status(400).send('Invalid reset link');
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).send('don not match password');
    }

    // Update the user's password
    user.setPassword(newPassword, async function () {
      await user.save();

      // Remove the key after successful password reset
      user.key = undefined;
      await user.save();
    //login the user
      req.logIn(user, function(){
        res.redirect("/");
      })
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

/* user authentication routes */

router.post('/upload/profile-pic', upload.single('profilePic'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  try {
    const profilePicBuffer = req.file.buffer;
    const profilePicBase64 = profilePicBuffer.toString('base64');

    const userId = req.user._id;
    const updatedUser = await users.findByIdAndUpdate(userId, { profilePic: profilePicBase64 });

    if (!updatedUser) {
      return res.status(404).send('User not found');
    }

    res.redirect("back")
  } catch (err) {    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
router.post('/update-profile', async (req, res, next) => {
  const userId = req.user._id;
  const newFullName = req.body.fullName;
  const newUsename = req.body.username;
  const newEmail = req.body.email;
  const bio = req.body.bio;

  try {
      // Find the user by ID and update their details
      const updatedUser = await userModel.findByIdAndUpdate(
          userId,
          { fullName: newFullName, email: newEmail ,bio:bio,username:newUsename},
          { new: true } // This option returns the updated document
      );

      if (!updatedUser) {
          return res.status(404).send('User not found');
      }

      // Render the edit page with updated user details
      res.render('edit', { user: updatedUser, oldDetails: req.body });
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});

router.post('/create', upload.single('media'), async (req, res) => {
  try {
    const { caption } = req.body;
    const mediaType = req.file ? req.file.mimetype.split('/')[0] : null;
    const mediaUrl = req.file ? req.file.buffer.toString('base64') : null;

    const newPost = new postModel({
      user: req.user._id, // Assuming you're using authentication and have access to the user ID
      caption,
      mediaType,
      mediaUrl
    });

    await newPost.save();

    res.redirect("back")
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Route to add a story
router.post('/add-story', upload.single('media'), async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { mediaType } = req.body;

    // Assuming 'media' is the field name in your form
    const mediaBuffer = req.file.buffer;
    const mediaUrl = `data:${req.file.mimetype};base64,${mediaBuffer.toString('base64')}`;

    // Set the expiry time to 24 hours from the current time
    const expiresAt = moment().add(24, 'hours').toDate();

    const newStory = new storyModel({
      user: loggedInUser,
      mediaType,
      mediaUrl,
      expiresAt, // Add the expiry time to the story
    });

    await newStory.save();

    res.status(201).json({ message: 'Story added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/like', async (req, res) => {
  const { postId } = req.body;

  try {
    const post = await postModel.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userId = req.user._id;
    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
    } else {
      post.likes.push(userId);
    }

    await post.save();
    res.json({ liked: !isLiked ,likeCount: post.likes.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// router.post('/add-comment', async (req, res) => {
//   const { postId, commentText } = req.body;

//   try {
//       const post = await postModel.findById(postId);

//       if (post) {
//           const newComment = new commentModel({
//               user: req.user._id,
//               post: postId,
//               text: commentText
//           });

//           await newComment.save();
//           post.comments.push(newComment);
//           await post.save();

//           const populatedComment = await commentModel.findById(newComment._id).populate('user');

//           if (populatedComment && populatedComment.user) {
//               res.json({
//                   username: populatedComment.user.username,
//                   text: populatedComment.text
//               });
//           } else {
//               res.status(404).json({ message: 'User not found' });
//           }
//       } else {
//           res.status(404).json({ message: 'Post not found' });
//       }
//   } catch (error) {
//       console.error(error);
//       res.status(500).json({ message: 'Internal Server Error' });
//   }
// });

// Route to add a comment
router.post('/add-comment', async (req, res) => {
  const { postId, commentText } = req.body;

  try {
    const post = await postModel.findById(postId);

    if (post) {
      const newComment = new commentModel({
        user: req.user._id,
        post: postId,
        text: commentText
      });

      await newComment.save();
      post.comments.push(newComment);
      await post.save();

      const populatedComment = await commentModel.findById(newComment._id).populate('user', 'username profilePic');

      if (populatedComment && populatedComment.user) {
        res.json({
          user: {
            username: populatedComment.user.username,
            profilePic: populatedComment.user.profilePic
          },
          text: populatedComment.text
        });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } else {
      res.status(404).json({ message: 'Post not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

//check username

router.get('/check/:username', function (req, res, next) {
  userModel.findOne({ username: req.params.username })
    .then(function (user) {
      if (user) {
        res.json(true);
      }
      else {
        res.json(false);
      }
    });
});



router.post('/delete-comment', async (req, res) => {
  const { commentId } = req.body;

  try {
    const comment = await commentModel.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if the logged-in user is the owner of the comment
    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Find the associated post
    const post = await postModel.findById(comment.post);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Log the current comments array before removal
    console.log('Current comments array:', post.comments);

    // Remove the comment ID from the post's comments array
    post.comments.pull(commentId);

    // Save the updated post
    await post.save();

    // Log the updated comments array
    console.log('Updated comments array:', post.comments);

    res.redirect("back")
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});






router.get('/search', async (req, res) => {
  const query = req.query.query;

  try {
    const users = await userModel.find({
      $or: [
        { fullName: { $regex: query, $options: 'i' } }, // Case-insensitive search by name
        { username: { $regex: query, $options: 'i' } } // Case-insensitive search by username
      ]
    }).select('fullName username profilePic');

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});



router.get('/profile/:username', isloggedIn, async (req, res) => {
  const username = req.params.username;

  try {
    loggedInUser = req.user;
    const user = await userModel.findOne({ username }).populate('savedPosts');
    const isOwnProfile = req.user && req.user.username === username;

    if (!user) {
      return res.status(404).send('User not found');
    }

    const isFollowing = req.user && req.user.following.includes(user._id);

    const posts = await postModel.find({ user: user._id });
    const savedPosts = user.savedPosts || [];

    res.render('profile', { user, posts, savedPosts, isOwnProfile, isFollowing ,loggedInUser});
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});




router.post('/follow/:userId', isloggedIn, async (req, res) => {
  const profileId = req.params.userId;

  try {
    // Find the profile user and the logged-in user
    const profileUser = await userModel.findById(profileId);
    const loggedInUser = req.user;

    // Check if both users exist
    if (!profileUser || !loggedInUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the logged-in user is trying to follow/unfollow themselves
    if (profileUser._id.equals(loggedInUser._id)) {
      return res.status(400).json({ message: 'You cannot follow/unfollow yourself' });
    }

    // Toggle follow status
    const isFollowing = loggedInUser.following.includes(profileId);

    if (isFollowing) {
      loggedInUser.following = loggedInUser.following.filter(id => id.toString() !== profileId.toString());
      profileUser.followers = profileUser.followers.filter(id => id.toString() !== loggedInUser._id.toString());
    } else {
      loggedInUser.following.push(profileId);
      profileUser.followers.push(loggedInUser._id);
    }

    // Save the changes
    await loggedInUser.save();
    await profileUser.save();

    res.json({ isFollowing: !isFollowing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// router.post('/follow/:userId', isloggedIn, async (req, res) => {
//   const profileId = req.params.userId;

//   try {
//     const profileUser = await userModel.findById(profileId);
//     const loggedInUser = req.user;

//     if (!profileUser || !loggedInUser) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     if (profileUser._id.equals(loggedInUser._id)) {
//       return res.status(400).json({ message: 'You cannot follow/unfollow yourself' });
//     }

//     if (profileUser.privateAccount) {
//       // Check if there is a follow request pending
//       if (!profileUser.followRequests.includes(loggedInUser._id)) {
//         // Send follow request
//         profileUser.followRequests.push(loggedInUser._id);
//         await profileUser.save();
//         return res.json({ followRequestSent: true });
//       } else {
//         // Cancel follow request
//         profileUser.followRequests.pull(loggedInUser._id);
//         await profileUser.save();
//         return res.json({ followRequestSent: false });
//       }
//     }

//     // If not a private account, handle follow/unfollow as usual
//     const isFollowing = loggedInUser.following.includes(profileId);

//     if (isFollowing) {
//       loggedInUser.following.pull(profileId);
//       profileUser.followers.pull(loggedInUser._id);
//     } else {
//       loggedInUser.following.push(profileId);
//       profileUser.followers.push(loggedInUser._id);

//       // Remove follow request if there was any
//       profileUser.followRequests.pull(loggedInUser._id);
//     }

//     await loggedInUser.save();
//     await profileUser.save();

//     res.json({ isFollowing: !isFollowing });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Internal Server Error' });
//   }
// });


router.get('/explore',isloggedIn, async (req, res) => {
  try {
      var loggedInUser = req.user
      const posts = await postModel.find().populate('user'); // Assuming user information is in the 'user' field, adjust as needed
      res.render('explore', { posts,loggedInUser }); // Render your explore page with the posts
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Define the route for viewing a single post
router.get('/post/:postId',isloggedIn, async (req, res) => {
  try {
    const loggedInUser = req.user;
    // Fetch the post details and comments using postId
    const postId = req.params.postId;

    // Fetch the post and related comments from the database
    const post = await postModel.findById(postId)
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          model: 'user',
          select: 'username profilePic'
        }
      })
      .populate('user');

    // Determine if the logged-in user is the owner of each comment
    post.comments.forEach(comment => {
      comment.isOwner = comment.user._id.equals(req.user._id);
    });

    // Render the post details view with the fetched data
    res.render('postDetails', { post, user: req.user ,loggedInUser});
  } catch (error) {
    // Handle errors
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
// DELETE route for deleting a post
router.post('/delete-post/:postId', isloggedIn, async (req, res) => {
  const postId = req.params.postId;

  try {
    // Find the post in the database
    const post = await postModel.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if the logged-in user is the owner of the post
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    // Remove the post
    await postModel.findByIdAndDelete(postId);

    // Redirect to the user's profile page
    res.redirect('/profile/' + req.user.username);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// POST route for saving a post
// POST route for saving a post
router.post('/save-post/:postId', isloggedIn, async (req, res) => {
  const postId = req.params.postId;
  const userId = req.user._id;

  try {
    // Find the post in the database
    const post = await postModel.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if the post is already saved by the user
    const isSaved = post.savedBy.includes(userId);

    if (isSaved) {
      // If already saved, remove from saved list
      post.savedBy = post.savedBy.filter(savedId => savedId.toString() !== userId.toString());
    } else {
      // If not saved, add to saved list
      post.savedBy.push(userId);
    }

    // Save the updated post
    await post.save();

    // Update the user's savedPosts array
    const user = await userModel.findById(userId);
    if (!user.savedPosts) {
      user.savedPosts = [];
    }

    if (isSaved) {
      // Remove the post from savedPosts
      user.savedPosts = user.savedPosts.filter(savedPostId => savedPostId.toString() !== postId.toString());
    } else {
      // Add the post to savedPosts
      user.savedPosts.push(postId);
    }

    // Save the updated user
    await user.save();

    res.json({ success: true, isSaved: !isSaved });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});



// Route to add a story
router.post('/ ', upload.single('media'), async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { mediaType } = req.body;

    // Assuming 'media' is the field name in your form
    const mediaBuffer = req.file.buffer;
    const mediaUrl = `data:${req.file.mimetype};base64,${mediaBuffer.toString('base64')}`;

    // Set the expiry time to 24 hours from the current time
    const expiresAt = moment().add(24, 'hours').toDate();

    const newStory = new storyModel({
      user: loggedInUser,
      mediaType,
      mediaUrl,
      expiresAt, // Add the expiry time to the story
    });

    await newStory.save();

    res.status(201).json({ message: 'Story added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// Route to show a user's stories
router.get('/user/:userId/stories', isloggedIn, async (req, res) => {
  const userId = req.params.userId;

  try {
    // Fetch user details
    const user = await userModel.findById(userId);
    const loggedInUser = req.user;

    if (!user) {
      return res.status(404).render('error', { message: 'User not found' });
    }

    // Fetch stories for the specified user from the database and populate the 'user' field with 'username' and 'profilePic'
    const userStories = await storyModel.find({
      user: userId,
      // Add a condition to filter out expired stories
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Fetch stories created within the last 24 hours
    }).populate('user', 'username profilePic');

    res.render('showStories', { stories: userStories, username: user.username, profilePic: user.profilePic, loggedInUser });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Internal Server Error' });
  }
});

// Example route for deleting a story
router.delete('/delete-story/:storyId', async (req, res) => {
  const storyId = req.params.storyId;

  try {
    // Find and delete the story by ID
    const deletedStory = await storyModel.findByIdAndDelete(storyId);

    if (!deletedStory) {
      return res.status(404).json({ message: 'Story not found' });
    }

    // Respond with success message or any additional data
    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.get("/chat", isloggedIn, async function(req, res, next){
  try {
    // Assuming you have a User model and the logged-in user's ID is stored in req.user.id
    const loggedInUserId = req.user.id;

    // Fetch the logged-in user
    const loggedInUser = await userModel.findById(loggedInUserId);

    if (!loggedInUser) {
      // Handle the case where the user is not found
      return res.status(404).send("User not found");
    }

    // Extract the followers and following users
    const followers = loggedInUser.followers || [];
    const following = loggedInUser.following || [];

    // Combine followers and following to get unique users
    const uniqueUserIds = Array.from(new Set([...followers, ...following]));

    // Fetch user details for the unique user IDs excluding the logged-in user
    const allUsers = await userModel.find({ _id: { $in: uniqueUserIds, $ne: loggedInUserId } });

    res.render("chat", { allUsers ,loggedInUser });
  } catch (error) {
    // Handle errors appropriately
    console.error(error);
    next(error);
  }
});

router.post("/save-chat", async (req, res, next) => {
  try {
    var chat = new chatModel({
      sender_id: req.body.sender_id,
      receiver_id: req.body.receiver_id,
      message: req.body.message,
    });

    var newChat = await chat.save();
    res.status(201).send({ success: true, msg: "Chat inserted", data: newChat });
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
});

router.get("/delete-chat",async(req,res,next)=>{
  try {
    chatModel.deleteOne({_id:req.body.id})
    res.status(200).send({ success: true});
  } catch (error) {
    res.status(400).send({ success: false, msg: error.message });
  }
})
router.post('/delete-chat', async (req, res, next) => {
  try {
    await chatModel.deleteOne({ _id: req.body.id }); // Note the use of 'await' here
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, msg: error.message });
  }
});

router.post('/update-chat', async (req, res, next) => {
  try {
    await chatModel.findByIdAndUpdate(
      { _id: req.body.id },
      { $set: { message: req.body.message } }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, msg: error.message });
  }
});

// route for displaying followers
router.get('/followers/:userId', isloggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.params.userId).populate('followers');
    const isOwnProfile = req.user && req.user._id.equals(user._id);

    res.render('followers', { user, isOwnProfile });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


// Example route for displaying following
router.get('/following/:userId', isloggedIn, async (req, res) => {
  try {
    loggedInUser = req.user;
    const user = await userModel.findById(req.params.userId).populate('following');
    const isOwnProfile = req.user && req.user._id.equals(user._id);
    res.render('following', { user ,isOwnProfile ,loggedInUser});
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Example route for removing a follower
router.post('/remove-follower/:followerId', isloggedIn, async (req, res) => {
  try {
    const user = await userModel.findById(req.user._id);
    const followerToRemove = req.params.followerId;

    // Remove the follower from the user's followers array
    user.followers.pull(followerToRemove);
    await user.save();

    // Optionally, update the follower's following array
    const follower = await userModel.findById(followerToRemove);
    follower.following.pull(user._id);
    await follower.save();

    res.redirect('/followers/' + user._id);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
// Example route for toggling follow status
router.post('/toggle-follow/:userId', isloggedIn, async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find the user in the database
    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the logged-in user is already following the user
    const isFollowing = req.user.following.includes(userId);

    if (isFollowing) {
      // If already following, remove from following list
      req.user.following = req.user.following.filter(followingId => followingId.toString() !== userId.toString());
    } else {
      // If not following, add to following list
      req.user.following.push(userId);
    }

    // Save the updated logged-in user
    await req.user.save();

    res.json({ success: true, isFollowing: !isFollowing });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


module.exports = router;
