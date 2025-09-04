// utils/validateEnvironment.js
import winston from "winston";

// Create a simple logger for validation that matches your main app logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length
        ? ` ${JSON.stringify(meta)}`
        : "";
      return `${level}: ${message}${metaString}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// Required environment variables for all environments
const requiredEnvVars = ["NODE_ENV", "PORT"];

// Production-specific required variables
const productionRequiredVars = ["JWT_SECRET", "MONGODB_URI", "ALLOWED_ORIGINS"];

export const validateEnvironment = () => {
  const errors = [];
  const warnings = [];

  console.log("🔍 Validating environment variables...");

  // Check required variables for all environments
  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Production-specific validations
  if (process.env.NODE_ENV === "production") {
    productionRequiredVars.forEach((varName) => {
      if (!process.env[varName]) {
        errors.push(
          `Missing required production environment variable: ${varName}`
        );
      }
    });

    // Check for insecure values in production
    if (process.env.ALLOWED_ORIGINS === "*") {
      warnings.push(
        "ALLOWED_ORIGINS is set to '*' in production - consider restricting to specific domains"
      );
    }
  }

  // Validate specific formats
  validateSpecificFormats(errors, warnings);

  // Report results
  if (errors.length > 0) {
    console.error("❌ Environment validation failed:");
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn("⚠️ Environment validation warnings:");
    warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  console.log("✅ Environment validation completed successfully");

  // Log current configuration (without sensitive data)
  logCurrentConfig();
};

const validateSpecificFormats = (errors, warnings) => {
  // Validate PORT
  if (process.env.PORT) {
    const port = parseInt(process.env.PORT);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push("PORT must be a valid number between 1 and 65535");
    }
  }

  // Validate NODE_ENV
  if (process.env.NODE_ENV) {
    const validNodeEnvs = ["development", "production", "test", "staging"];
    if (!validNodeEnvs.includes(process.env.NODE_ENV)) {
      warnings.push(
        `NODE_ENV '${
          process.env.NODE_ENV
        }' is not standard. Consider using: ${validNodeEnvs.join(", ")}`
      );
    }
  }

  // Validate BCRYPT_ROUNDS
  if (process.env.BCRYPT_ROUNDS) {
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS);
    if (isNaN(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 15) {
      warnings.push(
        "BCRYPT_ROUNDS should be between 10-15 for security and performance balance"
      );
    }
  }

  // Validate ALLOWED_ORIGINS format
  if (process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS !== "*") {
    const origins = process.env.ALLOWED_ORIGINS.split(",");
    origins.forEach((origin) => {
      const trimmedOrigin = origin.trim();
      if (trimmedOrigin && !isValidUrl(trimmedOrigin)) {
        warnings.push(
          `Invalid URL format in ALLOWED_ORIGINS: ${trimmedOrigin}`
        );
      }
    });
  }

  // Validate database connection string
  if (process.env.MONGODB_URI) {
    if (
      !process.env.MONGODB_URI.startsWith("mongodb://") &&
      !process.env.MONGODB_URI.startsWith("mongodb+srv://")
    ) {
      errors.push(
        "MONGODB_URI must start with 'mongodb://' or 'mongodb+srv://'"
      );
    }
  }
};

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const logCurrentConfig = () => {
  const config = {
    NODE_ENV: process.env.NODE_ENV || "NOT SET",
    PORT: process.env.PORT || "NOT SET",
    SERVICE_NAME: process.env.SERVICE_NAME || "NOT SET",
    SERVICE_VERSION: process.env.SERVICE_VERSION || "NOT SET",
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "NOT SET",
    DB_CONNECTION_TIMEOUT: process.env.DB_CONNECTION_TIMEOUT || "NOT SET",
    BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS || "NOT SET",
    JWT_SECRET: process.env.JWT_SECRET ? "***SET***" : "***NOT SET***",
    MONGODB_URI: process.env.MONGODB_URI ? "***SET***" : "***NOT SET***",
  };

  console.log("📋 Current configuration:");
  Object.entries(config).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
};

export default validateEnvironment;
