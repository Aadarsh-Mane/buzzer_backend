// routes/authRoutes.js
import express from "express";
import passport from "passport";
import { uploadResume } from "../middleware/Multer.js";
import {
  register,
  login,
  logout,
  googleCallback,
  verifyEmail,
  getCurrentUser,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  updateUserType,
} from "../controllers/authController.js";
import { requireAuth, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Local Authentication Routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", requireAuth, logout);

// Email Verification
router.get("/verify-email/:token", verifyEmail);

// Google OAuth Routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
  }),
  googleCallback
);

// Remove broken/unused candidate profile route (handled by /api/user/profile and /api/user/resume)
// User Profile Routes
router.get("/me", requireAuth, getCurrentUser);
router.put("/profile", requireAuth, updateProfile);
router.put("/change-password", requireAuth, changePassword);

// Password Reset Routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.put("/user-type", requireAuth, requireAdmin, updateUserType);

export default router;
