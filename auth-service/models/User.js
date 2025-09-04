// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    // Basic Information
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: function () {
        return this.provider === "local";
      },
      minlength: [6, "Password must be at least 6 characters long"],
      select: false,
    },

    // User Type and Provider
    userType: {
      type: String,
      enum: ["candidate", "interviewer", "admin"],
      default: "candidate",
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    // OAuth Information
    googleId: {
      type: String,
      sparse: true,
    },

    // Profile Information
    profilePicture: {
      type: String,
      default: null,
    },
    phoneNumber: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-\(\)]+$/, "Please enter a valid phone number"],
    },
    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },
    location: {
      type: String,
      maxlength: [100, "Location cannot exceed 100 characters"],
    },
    website: {
      type: String,
      match: [/^https?:\/\/.+/, "Please enter a valid URL"],
    },
    linkedin: {
      type: String,
      match: [
        /^https?:\/\/(www\.)?linkedin\.com\/.*/,
        "Please enter a valid LinkedIn URL",
      ],
    },
    github: {
      type: String,
      match: [
        /^https?:\/\/(www\.)?github\.com\/.*/,
        "Please enter a valid GitHub URL",
      ],
    },

    // Account Status
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // Security and Login Management
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },

    // Email Verification
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      select: false,
    },

    // Password Reset
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },

    // Candidate Specific Fields
    candidateInfo: {
      education: {
        type: String,
        trim: true,
        default: "",
      },
      experience: {
        type: String,
        trim: true,
        default: "",
      },
      skills: [
        {
          type: String,
          trim: true,
        },
      ],
      preferredRoles: [
        {
          type: String,
          trim: true,
        },
      ],
      resume: {
        type: String, // File path or URL
        default: null,
      },
    },

    // Interviewer Specific Fields
    interviewerInfo: {
      company: {
        type: String,
        trim: true,
      },
      position: {
        type: String,
        trim: true,
      },
      expertise: [
        {
          type: String,
          trim: true,
        },
      ],
      yearsOfExperience: {
        type: Number,
        min: 0,
        max: 50,
      },
      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      totalInterviews: {
        type: Number,
        default: 0,
      },
    },

    // Preferences
    preferences: {
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      interviewReminders: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account locked status
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ isActive: 1 });

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = async function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // If we have max attempts and we're not locked, lock the account
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

// Static method to find active users
userSchema.statics.findActiveUsers = function () {
  return this.find({ isActive: true });
};

// Static method to find by user type
userSchema.statics.findByUserType = function (userType) {
  return this.find({ userType, isActive: true });
};

// Static method to find by provider
userSchema.statics.findByProvider = function (provider) {
  return this.find({ provider, isActive: true });
};

const User = mongoose.model("User", userSchema);

export default User;
