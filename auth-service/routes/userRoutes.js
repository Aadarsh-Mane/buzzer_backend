import express from "express";
import { getProfile, updateProfile, uploadResume, getInterviewHistory } from "../controllers/authController.js";
import { ensureAuthenticated } from "../middleware/authMiddleware.js";
import multer from "multer";
import cloudinaryStorage from "../config/cloudinaryMulter.js";

const router = express.Router();

// Multer config for Cloudinary PDF resume upload
const upload = multer({
  storage: cloudinaryStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Only PDF files are allowed!"));
  },
});

// Get user profile
router.get("/profile", ensureAuthenticated, getProfile);
// Update user profile
router.put("/profile", ensureAuthenticated, updateProfile);
// Upload resume
router.post("/resume", ensureAuthenticated, upload.single("resume"), uploadResume);
// Get interview history
router.get("/interviews", ensureAuthenticated, getInterviewHistory);

export default router;
