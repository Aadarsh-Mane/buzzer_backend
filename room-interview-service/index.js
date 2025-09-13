import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import roomRoutes from "./routes/roomRoutes.js";
import Room from "./models/Room.js";
import Participant from "./models/Participant.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const PORT = process.env.PORT || 6003;
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://lanbixinfo:VfcMo7euOiX1mJ1w@interview-backend.p4usgoo.mongodb.net/interview?retryWrites=true&w=majority&appName=Interview-backend";

// Enhanced MongoDB connection with retry logic
const connectWithRetry = () => {
  mongoose
    .connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: "majority",
    })
    .then(() => console.log("Successfully connected to MongoDB"))
    .catch((err) => {
      console.error("Failed to connect to MongoDB:", err);
      setTimeout(connectWithRetry, 5000);
    });
};

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// Routes
app.use("/room", roomRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    dbState: mongoose.connection.readyState,
    timestamp: new Date().toISOString(),
  });
});

// --- Enhanced Socket.io logic ---
io.on("connection", (socket) => {
  console.log(`New connection: ${socket.id}`);

  // Track active rooms for this socket
  const activeRooms = new Set();

  // Helper function to update participants
  const updateParticipants = async (roomId) => {
    try {
      const participants = await Participant.find({
        roomId,
        status: { $in: ["joined", "pending"] },
      }).lean();

      io.to(roomId).emit(
        "participants-update",
        participants.map((p) => ({
          userId: p.userId,
          name: p.name,
          role: p.role,
          status: p.status,
        }))
      );
    } catch (err) {
      console.error(`Error updating participants for room ${roomId}:`, err);
    }
  };

  // Join room handler
  socket.on("join-room", async ({ roomId, userId, name, role }) => {
    try {
      console.log(`${userId} joining room ${roomId}`);

      // Validate input
      if (!roomId || !userId || !name || !role) {
        throw new Error("Missing required fields");
      }

      socket.join(roomId);
      activeRooms.add(roomId);
      
      // Store userId on socket for WebRTC signaling
      socket.userId = userId;

      // Find or create participant
      let participant = await Participant.findOne({ roomId, userId });

      if (!participant) {
        participant = new Participant({
          roomId,
          userId,
          name,
          role,
          status: "joined",
          joinedAt: new Date(),
          audioEnabled: true,
          videoEnabled: false,
          mediaReady: false
        });
      } else {
        participant.status = "joined";
        participant.lastActive = new Date();
        participant.audioEnabled = true;
        participant.videoEnabled = false;
        participant.mediaReady = false;
      }

      await participant.save();

      // Ensure room exists
      let room = await Room.findOne({ roomId });
      if (!room) {
        room = new Room({
          roomId,
          createdAt: new Date(),
          participants: [participant._id],
        });
      } else if (!room.participants.includes(participant._id)) {
        room.participants.push(participant._id);
      }

      await room.save();

      // Update all participants
      await updateParticipants(roomId);

      // Get current participants for this user
      const currentParticipants = await Participant.find({ 
        roomId, 
        status: "joined" 
      }).lean();

      // Notify user of successful join
      socket.emit("room-joined", {
        success: true,
        roomId,
        userId,
        participants: currentParticipants.map(p => ({
          userId: p.userId,
          name: p.name,
          role: p.role,
          status: p.status,
          audioEnabled: p.audioEnabled,
          videoEnabled: p.videoEnabled,
          mediaReady: p.mediaReady
        }))
      });

      // Notify others about new participant
      socket.to(roomId).emit("participant-joined", {
        userId,
        name,
        role,
        audioEnabled: participant.audioEnabled,
        videoEnabled: participant.videoEnabled,
        mediaReady: participant.mediaReady,
        joinedAt: participant.joinedAt
      });
      
      console.log(`✅ ${userId} successfully joined room ${roomId}`);
    } catch (err) {
      console.error("Error in join-room:", err);
      socket.emit("room-error", {
        error: err.message || "Failed to join room",
      });
    }
  });

  // Leave room handler
  socket.on("leave-room", async ({ roomId, userId }) => {
    try {
      console.log(`${userId} leaving room ${roomId}`);

      socket.leave(roomId);
      activeRooms.delete(roomId);

      const participant = await Participant.findOne({ roomId, userId });
      if (participant) {
        participant.status = "left";
        participant.leftAt = new Date();
        await participant.save();
      }

      await updateParticipants(roomId);
    } catch (err) {
      console.error("Error in leave-room:", err);
    }
  });

  // Enhanced WebRTC signaling for video calling
  socket.on("webrtc-offer", async ({ roomId, userId, offer, targetUserId }) => {
    try {
      console.log(`📤 WebRTC offer from ${userId} to ${targetUserId} in room ${roomId}`);
      
      // Validate the user is in the room
      const participant = await Participant.findOne({
        roomId,
        userId,
        status: "joined",
      });

      if (!participant) {
        throw new Error("Unauthorized signaling attempt");
      }

      // Validate offer format
      if (!offer || !offer.sdp) {
        throw new Error("Invalid offer format");
      }

      // Find target user's socket and send offer
      const roomSockets = await io.in(roomId).fetchSockets();
      const targetSocket = roomSockets.find(s => s.userId === targetUserId);
      
      if (targetSocket) {
        targetSocket.emit("webrtc-offer", {
          fromUserId: userId,
          offer: offer,
          roomId
        });
        console.log(`✅ Offer forwarded to ${targetUserId}`);
      } else {
        console.log(`❌ Target user ${targetUserId} not found in room`);
        socket.emit("webrtc-error", { error: "Target user not found" });
      }
    } catch (err) {
      console.error("Error in WebRTC offer handling:", err);
      socket.emit("webrtc-error", { error: err.message });
    }
  });

  socket.on("webrtc-answer", async ({ roomId, userId, answer, targetUserId }) => {
    try {
      console.log(`📥 WebRTC answer from ${userId} to ${targetUserId} in room ${roomId}`);
      
      // Validate the user is in the room
      const participant = await Participant.findOne({
        roomId,
        userId,
        status: "joined",
      });

      if (!participant) {
        throw new Error("Unauthorized signaling attempt");
      }

      // Validate answer format
      if (!answer || !answer.sdp) {
        throw new Error("Invalid answer format");
      }

      // Find target user's socket and send answer
      const roomSockets = await io.in(roomId).fetchSockets();
      const targetSocket = roomSockets.find(s => s.userId === targetUserId);
      
      if (targetSocket) {
        targetSocket.emit("webrtc-answer", {
          fromUserId: userId,
          answer: answer,
          roomId
        });
        console.log(`✅ Answer forwarded to ${targetUserId}`);
      } else {
        console.log(`❌ Target user ${targetUserId} not found in room`);
        socket.emit("webrtc-error", { error: "Target user not found" });
      }
    } catch (err) {
      console.error("Error in WebRTC answer handling:", err);
      socket.emit("webrtc-error", { error: err.message });
    }
  });

  socket.on("webrtc-ice-candidate", async ({ roomId, userId, candidate, targetUserId }) => {
    try {
      console.log(`🧊 ICE candidate from ${userId} to ${targetUserId} in room ${roomId}`);
      
      // Validate the user is in the room
      const participant = await Participant.findOne({
        roomId,
        userId,
        status: "joined",
      });

      if (!participant) {
        throw new Error("Unauthorized signaling attempt");
      }

      // Validate candidate format
      if (!candidate) {
        throw new Error("Invalid ICE candidate format");
      }

      // Find target user's socket and send ICE candidate
      const roomSockets = await io.in(roomId).fetchSockets();
      const targetSocket = roomSockets.find(s => s.userId === targetUserId);
      
      if (targetSocket) {
        targetSocket.emit("webrtc-ice-candidate", {
          fromUserId: userId,
          candidate: candidate,
          roomId
        });
        console.log(`✅ ICE candidate forwarded to ${targetUserId}`);
      } else {
        console.log(`❌ Target user ${targetUserId} not found in room`);
        socket.emit("webrtc-error", { error: "Target user not found" });
      }
    } catch (err) {
      console.error("Error in ICE candidate handling:", err);
      socket.emit("webrtc-error", { error: err.message });
    }
  });

  // Media stream status updates
  socket.on("media-status", async ({ roomId, userId, audioEnabled, videoEnabled }) => {
    try {
      console.log(`🎥 Media status update from ${userId}: audio=${audioEnabled}, video=${videoEnabled}`);
      
      // Validate the user is in the room
      const participant = await Participant.findOne({
        roomId,
        userId,
        status: "joined",
      });

      if (!participant) {
        throw new Error("Unauthorized media status update");
      }

      // Update participant media status
      participant.audioEnabled = audioEnabled;
      participant.videoEnabled = videoEnabled;
      await participant.save();

      // Broadcast media status to all participants in room
      socket.to(roomId).emit("media-status-update", {
        userId,
        audioEnabled,
        videoEnabled
      });

      console.log(`✅ Media status broadcasted for ${userId}`);
    } catch (err) {
      console.error("Error in media status handling:", err);
      socket.emit("media-error", { error: err.message });
    }
  });

  // User ready for video call
  socket.on("user-media-ready", async ({ roomId, userId }) => {
    try {
      console.log(`📹 User media ready: ${userId} in room ${roomId}`);
      
      // Validate the user is in the room
      const participant = await Participant.findOne({
        roomId,
        userId,
        status: "joined",
      });

      if (!participant) {
        throw new Error("Unauthorized media ready signal");
      }

      // Update participant ready status
      participant.mediaReady = true;
      await participant.save();

      // Notify all other participants that this user is ready
      socket.to(roomId).emit("user-media-ready", {
        userId,
        name: participant.name,
        role: participant.role
      });

      console.log(`✅ Media ready broadcasted for ${userId}`);
    } catch (err) {
      console.error("Error in user media ready handling:", err);
      socket.emit("media-error", { error: err.message });
    }
  });

  // Handle disconnection
  socket.on("disconnect", async () => {
    console.log(`Disconnected: ${socket.id}`);

    try {
      // Mark all active rooms as left
      for (const roomId of activeRooms) {
        const participants = await Participant.find({
          roomId,
          status: "joined",
        });

        // In a real app, you'd need to map socket.id to userId
        // This is simplified - you'd need proper user tracking
        for (const participant of participants) {
          participant.status = "left";
          participant.leftAt = new Date();
          await participant.save();
        }

        await updateParticipants(roomId);
      }
    } catch (err) {
      console.error("Error during disconnect cleanup:", err);
    }
  });

  // Ping/pong for connection health
  socket.on("ping", (cb) => {
    if (typeof cb === "function") {
      cb();
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// Start server with MongoDB connection
connectWithRetry();

server.listen(PORT, () => {
  console.log(`Room Interview Service running on port ${PORT}`);
});

// Cleanup on process termination
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");

  try {
    // Mark all participants as left
    await Participant.updateMany(
      { status: "joined" },
      { $set: { status: "left", leftAt: new Date() } }
    );

    await mongoose.connection.close();
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
});
