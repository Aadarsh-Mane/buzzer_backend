// middleware/authMiddleware.js
import User from "../models/User.js";

// Session-based Authentication Middleware
export const requireAuth = async (req, res, next) => {
  // alias for ensureAuthenticated
  return ensureAuthenticated(req, res, next);
};

// Passport session check
export const ensureAuthenticated = async (req, res, next) => {
  try {
    console.log("Checking authentication for user:", req.user);
    // Check if user is authenticated via session
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required. Please login.",
      });
    }

    // Check if user is still active
    const user = await User.findById(req.user._id);
    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        error: "Account is deactivated.",
      });
    }

    // Update req.user with latest user data
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    res.status(500).json({
      success: false,
      error: "Server error during authentication",
    });
  }
};

// Authorization Middleware
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required.",
    });
  }

  if (req.user.userType !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Access denied. Admin privileges required.",
    });
  }

  next();
};

// Interviewer Authorization
export const requireInterviewer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required.",
    });
  }

  if (!["interviewer", "admin"].includes(req.user.userType)) {
    return res.status(403).json({
      success: false,
      error: "Access denied. Interviewer privileges required.",
    });
  }

  next();
};

// Multiple Role Authorization
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    if (!roles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: "Access denied. Insufficient permissions.",
      });
    }

    next();
  };
};

// Email Verification Middleware
export const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required.",
    });
  }

  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      error: "Please verify your email before accessing this resource.",
    });
  }

  next();
};

// Optional Authentication (for public routes that can benefit from user context)
export const optionalAuth = async (req, res, next) => {
  try {
    if (req.isAuthenticated() && req.user) {
      const user = await User.findById(req.user._id);
      if (user && user.isActive) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Ignore errors for optional auth
    next();
  }
};

// Check if user owns resource
export const requireOwnership = (resourceField = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required.",
      });
    }

    // Admin can access any resource
    if (req.user.userType === "admin") {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceField] || req.body[resourceField];
    if (resourceUserId && resourceUserId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only access your own resources.",
      });
    }

    next();
  };
};
