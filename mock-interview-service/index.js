import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import mockInterviewRouter from "./routes/mockInterviewRoutes.js";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: true, // This allows ALL origins (equivalent to *)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-API-Key",
      "Cache-Control",
      "Accept",
      "Origin",
      "User-Agent",
      "DNT",
      "If-Modified-Since",
      "Keep-Alive",
      "X-Requested-With",
      "If-None-Match",
    ],
    exposedHeaders: ["X-Total-Count", "X-Rate-Limit-Remaining"],
    optionsSuccessStatus: 200,
  })
);

// MongoDB Connection
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://lanbixinfo:VfcMo7euOiX1mJ1w@interview-backend.p4usgoo.mongodb.net/interview?retryWrites=true&w=majority&appName=Interview-backend";
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Use routes
app.use("/interviews", mockInterviewRouter);

// Health Check
app.get("/", (req, res) => {
  res.send("Mock Interview Service is running!");
});

// Start Server
const PORT = process.env.PORT || 6002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
