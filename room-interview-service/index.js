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
    origin: process.env.CLIENT_URL || "http://localhost:4001",
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
    origin: process.env.CLIENT_URL || "http://localhost:4001",
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
        });
      } else {
        participant.status = "joined";
        participant.lastActive = new Date();
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

      // Notify user of successful join
      socket.emit("room-joined", {
        success: true,
        roomId,
        userId,
        participants: await Participant.find({ roomId, status: "joined" }),
      });
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

  // WebRTC signaling relay with validation
  socket.on("signal", async ({ roomId, userId, signal, targetId }) => {
    try {
      // Validate the user is in the room
      const participant = await Participant.findOne({
        roomId,
        userId,
        status: "joined",
      });

      if (!participant) {
        throw new Error("Unauthorized signaling attempt");
      }

      // Validate signal format
      if (!signal || (!signal.sdp && !signal.candidate)) {
        throw new Error("Invalid signal format");
      }

      // Forward the signal
      if (targetId) {
        // Private signal to specific peer
        socket.to(targetId).emit("signal", { userId, signal });
      } else {
        // Broadcast to all in room except sender
        socket.to(roomId).emit("signal", { userId, signal });
      }
    } catch (err) {
      console.error("Error in signal handling:", err);
      socket.emit("signal-error", { error: err.message });
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
