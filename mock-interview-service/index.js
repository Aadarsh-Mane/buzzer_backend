import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import mockInterviewRouter from "./routes/mockInterviewRoutes.js";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:4001",
      "http://localhost:3000",
      "https://yourdomain.com",
      "https://auth.lanbix.com",
      "http://localhost:3000",
      "http://localhost:4001",
      "http://localhost:6001",
      "https://interview-backend-rho.vercel.app",
      "https://salapakshi.vercel.app",
    ],
    credentials: true,
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
