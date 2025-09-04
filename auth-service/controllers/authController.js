// Get user profile
export const getProfile = async (req, res) => {
  try {
    // Return basic user info (customize as needed)
    const user = req.user;
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch profile" });
  }
};

// Update user profile

// Upload resume
export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }
    // req.file.path is the Cloudinary URL
    // Save the Cloudinary URL to the user profile
    const user = req.user;
    user.candidateInfo = user.candidateInfo || {};
    user.candidateInfo.resume = req.file.path;
    await user.save();
    res.status(200).json({ success: true, message: "Resume uploaded to Cloudinary", url: req.file.path });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to upload resume" });
  }
};
// Get Interview History
export const getInterviewHistory = async (req, res) => {
  try {
    // Placeholder: Replace with real DB query for user's interview history
    const sampleHistory = [
      {
        date: "2025-07-01",
        role: "Frontend Developer",
        status: "Completed",
        feedback: "Good communication skills."
      },
      {
        date: "2025-06-15",
        role: "Backend Developer",
        status: "Pending",
        feedback: null
      }
    ];
    res.status(200).json({ success: true, history: sampleHistory });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch interview history" });
  }
};
// controllers/authController.js
import User from "../models/User.js";
import { validateInput } from "../utils/vaildation.js";
import crypto from "crypto";

// Register new user
export const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, userType, phoneNumber } =
      req.body;

    // Validate input
    const validation = validateInput({
      email,
      password,
      firstName,
      lastName,
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: validation.errors,
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: "User already exists with this email",
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      userType: userType || "candidate",
      phoneNumber,
      provider: "local",
    });

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();

    console.log("User registered successfully:", user.email);

    res.status(201).json({
      success: true,
      message: "User registered successfully. Please verify your email.",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        isEmailVerified: user.isEmailVerified,
      },
      verificationToken, // For testing purposes
    });
  } catch (error) {
    console.error("Registration error:", error.message);
    res.status(500).json({
      success: false,
      error: "Server error during registration",
    });
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required",
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        error:
          "Account is temporarily locked due to multiple failed login attempts",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: "Account is deactivated",
      });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.incLoginAttempts();
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Login user to session
    req.login(user, (err) => {
      if (err) {
        console.error("Login session error:", err.message);
        return res.status(500).json({
          success: false,
          error: "Server error during login",
        });
      }

      console.log("User logged in successfully:", user.email);

      res.status(200).json({
        success: true,
        message: "Login successful",
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userType: user.userType,
          isEmailVerified: user.isEmailVerified,
          profilePicture: user.profilePicture,
        },
      });
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      success: false,
      error: "Server error during login",
    });
  }
};

// Google OAuth success callback
export const googleCallback = async (req, res) => {
  try {
    console.log("Google OAuth Callback Started");

    const user = req.user;

    if (!user) {
      console.log("No user found in request");
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=auth_failed`
      );
    }

    console.log("User found:", {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      googleId: user.googleId,
      provider: user.provider,
    });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    console.log("Google OAuth login successful");

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error("Google OAuth callback error:", error.message);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
  }
};

// Logout user
export const logout = async (req, res) => {
  try {
    const user = req.user;

    // Destroy session
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err.message);
        return res.status(500).json({
          success: false,
          error: "Server error during logout",
        });
      }

      req.session.destroy((err) => {
        if (err) {
          console.error("Session destruction error:", err.message);
          return res.status(500).json({
            success: false,
            error: "Could not destroy session",
          });
        }

        console.log("User logged out successfully:", user?.email);

        res.status(200).json({
          success: true,
          message: "Logout successful",
        });
      });
    });
  } catch (error) {
    console.error("Logout error:", error.message);
    res.status(500).json({
      success: false,
      error: "Server error during logout",
    });
  }
};

// Verify email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired verification token",
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    console.log("Email verified successfully:", user.email);

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Email verification error:", error.message);
    res.status(500).json({
      success: false,
      error: "Server error during email verification",
    });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        userType: user.userType,
        isEmailVerified: user.isEmailVerified,
        profilePicture: user.profilePicture,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error.message);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// Unified Update user profile (handles candidate fields too)
export const updateProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    // Main user fields
    const {
      firstName,
      lastName,
      phoneNumber,
      bio,
      location,
      website,
      linkedin,
      github,
      education,
      experience,
      skills,
      preferredRoles
    } = req.body;

    // Update main fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (bio) user.bio = bio;
    if (location) user.location = location;
    if (website) user.website = website;
    if (linkedin) user.linkedin = linkedin;
    if (github) user.github = github;

    // Candidate info fields
    if (user.userType === "candidate") {
      user.candidateInfo = user.candidateInfo || {};
      if (education !== undefined) user.candidateInfo.education = education;
      if (experience !== undefined) user.candidateInfo.experience = experience;
      if (skills !== undefined) {
        user.candidateInfo.skills = Array.isArray(skills)
          ? skills
          : typeof skills === "string"
          ? skills.split(",").map(s => s.trim()).filter(Boolean)
          : [];
      }
      if (preferredRoles !== undefined) {
        user.candidateInfo.preferredRoles = Array.isArray(preferredRoles)
          ? preferredRoles
          : typeof preferredRoles === "string"
          ? preferredRoles.split(",").map(r => r.trim()).filter(Boolean)
          : [];
      }
    }

    await user.save();
    console.log("Profile updated successfully:", user.email);
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Profile update error:", error.message);
    res.status(500).json({ success: false, error: "Server error during profile update" });
  }
};

// Change password
export const changePassword = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Not authenticated",
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Current password and new password are required",
      });
    }

    // Get user with password
    const userWithPassword = await User.findById(user._id).select("+password");

    // Check current password
    const isMatch = await userWithPassword.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: "Current password is incorrect",
      });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "New password must be at least 6 characters long",
      });
    }

    // Update password
    userWithPassword.password = newPassword;
    await userWithPassword.save();

    console.log("Password changed successfully:", user.email);

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Password change error:", error.message);
    res.status(500).json({
      success: false,
      error: "Server error during password change",
    });
  }
};

// Request password reset
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email is required",
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found with this email",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    console.log("Password reset token generated:", user.email);

    // In production, send email with reset link
    res.status(200).json({
      success: true,
      message: "Password reset token sent to your email",
      resetToken, // For testing purposes
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    res.status(500).json({
      success: false,
      error: "Server error during password reset request",
    });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: "New password is required",
      });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token",
      });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    console.log("Password reset successfully:", user.email);

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Password reset error:", error.message);
    res.status(500).json({
      success: false,
      error: "Server error during password reset",
    });
  }
};

// Update user type (Admin only)
export const updateUserType = async (req, res) => {
  try {
    const { userId, userType } = req.body;

    // Validate userType
    if (!["candidate", "interviewer", "admin"].includes(userType)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user type",
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { userType },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    console.log("User type updated:", user.email, "->", userType);

    res.status(200).json({
      success: true,
      message: "User type updated successfully",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
      },
    });
  } catch (error) {
    console.error("Update user type error:", error.message);
    res.status(500).json({
      success: false,
      error: "Server error during user type update",
    });
  }
};



// ...existing code...

