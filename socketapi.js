// Server-side code
const User = require("./models/userModel");
const Chat = require('./models/chatModel')
const io = require("socket.io")();
const socketapi = {
    io: io
};

// Add your socket.io logic here!
io.on("connection", async function (socket) {
    console.log("A user connected");

    // Handling userConnected event
    socket.on("userConnected", async function (data) {
        const userId = data.userId;
        console.log(`User connected with ID: ${userId}`);

        // Store the user ID on the socket for later use
        socket.userId = userId;

        await User.findByIdAndUpdate({ _id: userId }, { $set: { is_online: "1" } });

        socket.broadcast.emit('userOnline', { user_Id: userId })
    });

    // Handling disconnect event
    socket.on("disconnect", async function () {
        // Check if the user ID is available on the socket
        if (socket.userId) {
            const userId = socket.userId;
            console.log("User disconnected");

            // Update the user status to offline
            await User.findByIdAndUpdate({ _id: userId }, { $set: { is_online: "0" } });
            socket.broadcast.emit('userOffline', { user_Id: userId })
        } else {
            console.log("User disconnected, but user ID not available");
        }
    });
    //chatting implemetation 
    socket.on('newChat', function (data) {
        socket.broadcast.emit('loadNewChat', data);
    })

    //load old chatss

    socket.on('existsChat', async function (data) {
        // Your existing logic to fetch chats
        var chats = await Chat.find({
            $or: [
                { sender_id: data.sender_id, receiver_id: data.receiver_id },
                { sender_id: data.receiver_id, receiver_id: data.sender_id }
            ]
        });

        // Your existing logic to emit 'loadChats' to the sender
        socket.emit('loadChats', { chats: chats });

        // Additional logic to remove deleted message from the UI
        if (data.deletedMessageId) {
            $("#" + data.deletedMessageId).remove();
        }
    });

    //delete chat
    // Server-side code
    socket.on('chatDeleted', function (id) {
        io.emit("chatMessageDeleted", id);
    });


    //update chat
    socket.on('chatUpdated', function(data){
        socket.broadcast.emit("chatMessageUpdated", { id: data.id, message: data.message });
    });
    
});



// end of socket.io logic
module.exports = socketapi;
