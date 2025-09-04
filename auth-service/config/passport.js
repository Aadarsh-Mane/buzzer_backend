// config/passport.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import "dotenv/config";

console.log("Initializing Passport with Google OAuth...");

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google OAuth profile received:", {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName,
        });

        // Check if user already exists with Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          console.log("Existing user found with Google ID:", user.email);

          // Update user info if exists
          user.lastLogin = new Date();
          user.isActive = true;

          // Update profile picture if changed
          if (profile.photos && profile.photos[0] && profile.photos[0].value) {
            user.profilePicture = profile.photos[0].value;
          }

          await user.save();
          return done(null, user);
        }

        // Check if user exists with same email
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          console.log(
            "Existing user found with same email, linking Google account:",
            user.email
          );

          // Link Google account to existing user
          user.googleId = profile.id;
          user.provider = "google";
          user.isEmailVerified = true;
          user.lastLogin = new Date();

          if (profile.photos && profile.photos[0] && profile.photos[0].value) {
            user.profilePicture = profile.photos[0].value;
          }

          await user.save();
          return done(null, user);
        }

        // Create new user
        console.log(
          "Creating new user with Google account:",
          profile.emails[0].value
        );

        user = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          firstName:
            profile.name.givenName || profile.displayName.split(" ")[0],
          lastName:
            profile.name.familyName ||
            profile.displayName.split(" ").slice(1).join(" "),
          profilePicture: profile.photos?.[0]?.value || null,
          provider: "google",
          isEmailVerified: true,
          userType: "candidate", // Default type
          lastLogin: new Date(),
          isActive: true,
        });

        console.log("New user created successfully:", user.email);
        return done(null, user);
      } catch (error) {
        console.error("Google OAuth error:", error.message);
        return done(error, null);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  console.log("Serializing user:", user._id);
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    console.log("Deserializing user:", id);

    const user = await User.findById(id).select("-password");

    if (!user) {
      console.log("User not found during deserialization:", id);
      return done(null, false);
    }

    console.log("User deserialized successfully:", user.email);
    done(null, user);
  } catch (error) {
    console.error("Deserialization error:", error.message);
    done(error, null);
  }
});

export default passport;
