import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import colors from "colors";
// import WebSocket from "WebSocket";

import liveInterviewRoutes from "./routes/liveInterviewRoutes.js";
import LiveInterview from "./models/LiveInterview.js";

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

const PORT = process.env.PORT || 6004;
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
    .then(() =>
      console.log(colors.green("✅ Successfully connected to MongoDB"))
    )
    .catch((err) => {
      console.error(colors.red("❌ Failed to connect to MongoDB:"), err);
      setTimeout(connectWithRetry, 5000);
    });
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(morgan("combined"));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:4001",
    credentials: true,
  })
);

// Routes
app.use("/live-interview", liveInterviewRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "live-interview-service",
    dbState: mongoose.connection.readyState,
    timestamp: new Date().toISOString(),
  });
});

// --- Enhanced Socket.io logic for Live Interviews ---
io.on("connection", (socket) => {
  console.log(colors.cyan(`🔌 New connection: ${socket.id}`));

  // Track active interviews for this socket
  const activeInterviews = new Set();

  // Helper function to update interview participants
  const updateInterviewParticipants = async (interviewId) => {
    try {
      const interview = await LiveInterview.findOne({ interviewId });
      if (interview) {
        io.to(interviewId).emit("interview-update", {
          interviewId,
          status: interview.status,
          candidate: interview.candidate,
          interviewer: interview.interviewer,
          startedAt: interview.startedAt,
          endedAt: interview.endedAt,
        });
      }
    } catch (err) {
      console.error(`Error updating interview ${interviewId}:`, err);
    }
  };

  // Join interview room
  socket.on(
    "join-interview",
    async ({ interviewId, userId, name, email, role }) => {
      try {
        console.log(
          colors.yellow(`${userId} joining interview ${interviewId} as ${role}`)
        );

        // Validate input
        if (!interviewId || !userId || !name || !role) {
          throw new Error("Missing required fields");
        }

        socket.join(interviewId);
        activeInterviews.add(interviewId);

        // Find interview and update participant
        const interview = await LiveInterview.findOne({ interviewId });
        if (!interview) {
          throw new Error("Interview not found");
        }

        // Update participant join time
        if (role === "candidate" && interview.candidate.userId === userId) {
          interview.candidate.joinedAt = new Date();
        } else if (
          role === "interviewer" &&
          interview.interviewer.userId === userId
        ) {
          interview.interviewer.joinedAt = new Date();
        }

        // Start interview if both participants have joined
        if (
          interview.candidate.joinedAt &&
          interview.interviewer.joinedAt &&
          interview.status === "scheduled"
        ) {
          interview.status = "active";
          interview.startedAt = new Date();
        }

        await interview.save();

        // Notify all participants in the room
        await updateInterviewParticipants(interviewId);

        // Notify user of successful join
        socket.emit("interview-joined", {
          success: true,
          interviewId,
          userId,
          role,
          title: interview.title,
          status: interview.status,
          startedAt: interview.startedAt,
          endedAt: interview.endedAt,
          candidate: interview.candidate,
          interviewer: interview.interviewer,
          questions: interview.questions || [],
          aiAssistance: interview.aiAssistance || {
            enabled: false,
            responses: [],
          },
        });

        // Send existing questions to the new participant (especially important for observers)
        if (interview.questions && interview.questions.length > 0) {
          interview.questions.forEach((question) => {
            socket.emit("question-asked", {
              ...question,
              interviewId,
            });
          });
        }

        // Notify others in the room
        socket.to(interviewId).emit("participant-joined", {
          userId,
          name,
          role,
          joinedAt: new Date(),
        });
      } catch (err) {
        console.error("Error in join-interview:", err);
        socket.emit("interview-error", {
          error: err.message || "Failed to join interview",
        });
      }
    }
  );

  // Leave interview room
  socket.on("leave-interview", async ({ interviewId, userId, role }) => {
    try {
      console.log(colors.yellow(`${userId} leaving interview ${interviewId}`));

      socket.leave(interviewId);
      activeInterviews.delete(interviewId);

      const interview = await LiveInterview.findOne({ interviewId });
      if (interview) {
        // Update participant leave time
        if (role === "candidate" && interview.candidate.userId === userId) {
          interview.candidate.leftAt = new Date();
        } else if (
          role === "interviewer" &&
          interview.interviewer.userId === userId
        ) {
          interview.interviewer.leftAt = new Date();
        }

        // End interview if both participants have left
        if (interview.candidate.leftAt && interview.interviewer.leftAt) {
          interview.status = "completed";
          interview.endedAt = new Date();
          interview.duration = Math.round(
            (interview.endedAt - interview.startedAt) / 1000 / 60
          );
        }

        await interview.save();
        await updateInterviewParticipants(interviewId);
      }

      // Notify others in the room
      socket.to(interviewId).emit("participant-left", {
        userId,
        role,
        leftAt: new Date(),
      });
    } catch (err) {
      console.error("Error in leave-interview:", err);
    }
  });

  // Handle question asking
  socket.on(
    "ask-question",
    async ({ interviewId, question, category, difficulty, askedBy }) => {
      try {
        const interview = await LiveInterview.findOne({ interviewId });
        if (!interview) {
          throw new Error("Interview not found");
        }

        // Add question to interview
        const questionData = {
          questionId: require("uuid").v4(),
          question,
          category: category || "general",
          difficulty: difficulty || "medium",
          askedBy,
          askedAt: new Date(),
        };

        await interview.addQuestion(questionData);

        // Broadcast question to all participants
        io.to(interviewId).emit("question-asked", {
          ...questionData,
          interviewId,
        });
      } catch (err) {
        console.error("Error in ask-question:", err);
        socket.emit("question-error", { error: err.message });
      }
    }
  );

  // Handle candidate response
  socket.on(
    "candidate-response",
    async ({ interviewId, questionId, response, responseTime }) => {
      try {
        const interview = await LiveInterview.findOne({ interviewId });
        if (!interview) {
          throw new Error("Interview not found");
        }

        // Find and update the question with response
        const question = interview.questions.find(
          (q) => q.questionId === questionId
        );
        if (!question) {
          throw new Error("Question not found");
        }

        question.candidateResponse = response;
        question.responseTime = responseTime;

        // Get AI assistance if enabled
        if (interview.aiAssistance.enabled) {
          const aiHelper = (await import("./utils/aiHelper.js")).default;
          const aiAssistance = await aiHelper.provideAssistance(
            question.question,
            response,
            interview.jobDescription
          );

          question.aiSuggestion = aiAssistance.suggestion;
          question.score = aiAssistance.score;

          // Add to AI responses tracking
          interview.aiAssistance.responses.push({
            question: question.question,
            candidateAnswer: response,
            aiSuggestion: aiAssistance.suggestion,
            timestamp: new Date(),
            confidence: aiAssistance.confidence,
          });
        }

        await interview.updatePerformance();
        await interview.save();

        // Broadcast response to all participants
        io.to(interviewId).emit("response-recorded", {
          questionId,
          response,
          responseTime,
          aiSuggestion: question.aiSuggestion,
          score: question.score,
          interviewId,
        });
      } catch (err) {
        console.error("Error in candidate-response:", err);
        socket.emit("response-error", { error: err.message });
      }
    }
  );

  // Handle AI assistance requests (for stealth console)
  socket.on(
    "request-ai-assistance",
    async ({ interviewId, question, candidateAnswer }) => {
      try {
        const interview = await LiveInterview.findOne({ interviewId });
        if (!interview) {
          throw new Error("Interview not found");
        }

        const aiHelper = (await import("./utils/aiHelper.js")).default;
        const assistance = await aiHelper.provideAssistance(
          question,
          candidateAnswer,
          interview.jobDescription
        );

        // Send AI assistance back to the requester
        socket.emit("ai-assistance", {
          question,
          candidateAnswer,
          assistance,
        });
      } catch (err) {
        console.error("Error in request-ai-assistance:", err);
        socket.emit("ai-assistance-error", { error: err.message });
      }
    }
  );

  // Handle speech recognition logs
  socket.on(
    "speech-log",
    async ({
      interviewId,
      id,
      timestamp,
      action,
      text,
      details,
      user,
      role,
    }) => {
      try {
        console.log(
          colors.cyan(
            `🎤 Speech Log [${interviewId}]: ${action} by ${user} (${role})`
          )
        );

        if (text) {
          console.log(colors.yellow(`📝 Transcript: "${text}"`));
        }

        if (details && Object.keys(details).length > 0) {
          console.log(colors.gray(`📊 Details:`, details));
        }

        // Find and update interview with speech log
        const interview = await LiveInterview.findOne({ interviewId });
        if (interview) {
          // Add speech log to interview
          if (!interview.speechLogs) {
            interview.speechLogs = [];
          }

          interview.speechLogs.push({
            id,
            timestamp,
            action,
            text,
            details,
            user,
            role,
          });

          // Keep only last 1000 speech logs
          if (interview.speechLogs.length > 1000) {
            interview.speechLogs = interview.speechLogs.slice(-1000);
          }

          await interview.save();

          // Broadcast speech log to all participants in the room
          socket.to(interviewId).emit("speech-log-broadcast", {
            id,
            timestamp,
            action,
            text,
            details,
            user,
            role,
          });
        }
      } catch (err) {
        console.error("Error in speech-log:", err);
      }
    }
  );

  // Handle screen/audio capture status
  socket.on("capture-status", ({ interviewId, type, enabled, url }) => {
    socket.to(interviewId).emit("capture-update", {
      type, // 'screen' or 'audio'
      enabled,
      url,
    });
  });

  // Handle AI assistance generated in live interview room
  socket.on(
    "ai-assistance-generated",
    async ({
      interviewId,
      question,
      assistance,
      userId,
      userName,
      timestamp,
    }) => {
      try {
        console.log(
          colors.blue(
            `🤖 AI assistance generated for interview ${interviewId} by ${userName}`
          )
        );

        // Broadcast AI assistance to all participants in the room (including Stealth Console observers)
        io.to(interviewId).emit("ai-assistance-live", {
          interviewId,
          question,
          assistance,
          userId,
          userName,
          timestamp,
        });

        // Also store in interview record for history
        const interview = await LiveInterview.findOne({ interviewId });
        if (interview) {
          if (!interview.aiAssistance.responses) {
            interview.aiAssistance.responses = [];
          }

          interview.aiAssistance.responses.push({
            question,
            candidateAnswer: "", // This is AI help, not a candidate response
            aiSuggestion: assistance.suggestion,
            timestamp: new Date(timestamp),
            confidence: assistance.confidence,
            type: "live-assistance",
          });

          await interview.save();
        }
      } catch (err) {
        console.error("Error in ai-assistance-generated:", err);
      }
    }
  );

  // Handle disconnection
  socket.on("disconnect", async () => {
    console.log(colors.red(`🔌 Disconnected: ${socket.id}`));

    try {
      // Mark all active interviews as left for this user
      for (const interviewId of activeInterviews) {
        const interview = await LiveInterview.findOne({ interviewId });
        if (interview) {
          // In a real app, you'd need to map socket.id to userId
          // This is simplified - you'd need proper user tracking
          await updateInterviewParticipants(interviewId);
        }
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
  console.error(colors.red("❌ Error:"), err.stack);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: err.message,
  });
});

// Start server with MongoDB connection
connectWithRetry();

server.listen(PORT, () => {
  console.log(
    colors.green(`🚀 Live Interview Service running on port ${PORT}`)
  );
  console.log(
    colors.cyan(`📡 Socket.io server ready for real-time communication`)
  );
});

// Cleanup on process termination
process.on("SIGINT", async () => {
  console.log(colors.yellow("🛑 Shutting down gracefully..."));

  try {
    // Mark all active interviews as completed
    await LiveInterview.updateMany(
      { status: "active" },
      {
        $set: {
          status: "completed",
          endedAt: new Date(),
        },
      }
    );

    await mongoose.connection.close();
    server.close(() => {
      console.log(colors.green("✅ Server closed"));
      process.exit(0);
    });
  } catch (err) {
    console.error(colors.red("❌ Error during shutdown:"), err);
    process.exit(1);
  }
});
