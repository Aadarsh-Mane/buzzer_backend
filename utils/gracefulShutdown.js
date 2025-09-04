// utils/gracefulShutdown.js
import mongoose from "mongoose";

let isShuttingDown = false;

export const gracefulShutdown = (server, logger, options = {}) => {
  const {
    timeout = 30000, // 30 seconds default timeout
    signals = ["SIGTERM", "SIGINT", "SIGUSR2"],
    onShutdown = null,
  } = options;

  const shutdown = async (signal) => {
    if (isShuttingDown) {
      logger.warn(`Shutdown already in progress, ignoring ${signal}`);
      return;
    }

    isShuttingDown = true;
    logger.info(`🛑 Received ${signal}, starting graceful shutdown...`);

    // Set a timeout to force shutdown if graceful shutdown takes too long
    const forceShutdownTimer = setTimeout(() => {
      logger.error("⚠️ Graceful shutdown timed out, forcing shutdown");
      process.exit(1);
    }, timeout);

    try {
      // Stop accepting new connections
      logger.info("📡 Stopping HTTP server...");
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            logger.error("Error closing HTTP server:", err);
            reject(err);
          } else {
            logger.info("✅ HTTP server closed");
            resolve();
          }
        });
      });

      // Close database connections
      if (mongoose.connection.readyState === 1) {
        logger.info("🗄️ Closing database connections...");
        await mongoose.connection.close();
        logger.info("✅ Database connections closed");
      }

      // Execute custom shutdown logic
      if (onShutdown && typeof onShutdown === "function") {
        logger.info("🔧 Executing custom shutdown logic...");
        await onShutdown();
        logger.info("✅ Custom shutdown logic completed");
      }

      // Close any remaining connections
      await closeRemainingConnections();

      // Clear the force shutdown timer
      clearTimeout(forceShutdownTimer);

      logger.info("✅ Graceful shutdown completed successfully");
      process.exit(0);
    } catch (error) {
      logger.error("❌ Error during graceful shutdown:", error);
      clearTimeout(forceShutdownTimer);
      process.exit(1);
    }
  };

  // Register signal handlers
  signals.forEach((signal) => {
    process.on(signal, () => shutdown(signal));
  });

  // Handle uncaught exceptions
  process.on("uncaughtException", (error) => {
    logger.error("💥 Uncaught Exception:", {
      error: error.message,
      stack: error.stack,
    });

    if (!isShuttingDown) {
      shutdown("uncaughtException");
    }
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("💥 Unhandled Promise Rejection:", {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: promise,
    });

    if (!isShuttingDown) {
      shutdown("unhandledRejection");
    }
  });

  // Handle process warnings
  process.on("warning", (warning) => {
    logger.warn("⚠️ Process Warning:", {
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
    });
  });

  // logger.info("🛡️ Graceful shutdown handlers registered");
};

const closeRemainingConnections = async () => {
  // Close any remaining timers
  clearAllTimers();

  // Give a moment for cleanup
  await new Promise((resolve) => setTimeout(resolve, 100));
};

const clearAllTimers = () => {
  // Clear all timeouts and intervals
  let id = setTimeout(() => {}, 0);
  while (id--) {
    clearTimeout(id);
  }

  id = setInterval(() => {}, 0);
  while (id--) {
    clearInterval(id);
  }
};

// Health check function that can be used during shutdown
export const isHealthy = () => {
  return !isShuttingDown;
};

// Custom shutdown hook for additional cleanup
export const addShutdownHook = (callback) => {
  if (typeof callback !== "function") {
    throw new Error("Shutdown hook must be a function");
  }

  // Store shutdown hooks (you might want to implement a proper registry)
  process.shutdownHooks = process.shutdownHooks || [];
  process.shutdownHooks.push(callback);
};

export default gracefulShutdown;
