// // middleware/healthCheck.js
// import mongoose from "mongoose";
// import { isHealthy } from "../utils/gracefulShutdown.js";

// export const healthCheck = async (req, res) => {
//   const startTime = Date.now();

//   try {
//     // Basic health status
//     const health = {
//       status: "healthy",
//       timestamp: new Date().toISOString(),
//       uptime: Math.floor(process.uptime()),
//       service: process.env.SERVICE_NAME || "healthcare-backend",
//       version: process.env.SERVICE_VERSION || "v1.0.0",
//       environment: process.env.NODE_ENV || "development",
//     };

//     // Check if shutdown is in progress
//     if (!isHealthy()) {
//       health.status = "shutting_down";
//       return res.status(503).json(health);
//     }

//     // Database health check
//     const dbHealth = await checkDatabaseHealth();
//     health.database = dbHealth;

//     // Memory usage
//     const memoryUsage = process.memoryUsage();
//     health.memory = {
//       used: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100, // MB
//       total: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100, // MB
//       external: Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100, // MB
//       rss: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100, // MB
//     };

//     // CPU usage (basic)
//     const cpuUsage = process.cpuUsage();
//     health.cpu = {
//       user: cpuUsage.user,
//       system: cpuUsage.system,
//     };

//     // Check overall health status
//     const overallStatus = determineOverallHealth(health);
//     health.status = overallStatus;

//     // Response time
//     health.responseTime = `${Date.now() - startTime}ms`;

//     // Set appropriate status code
//     const statusCode = overallStatus === "healthy" ? 200 : 503;
//     res.status(statusCode).json(health);
//   } catch (error) {
//     const errorHealth = {
//       status: "unhealthy",
//       timestamp: new Date().toISOString(),
//       error: error.message,
//       responseTime: `${Date.now() - startTime}ms`,
//     };

//     res.status(503).json(errorHealth);
//   }
// };

// const checkDatabaseHealth = async () => {
//   try {
//     const dbState = mongoose.connection.readyState;
//     const states = {
//       0: "disconnected",
//       1: "connected",
//       2: "connecting",
//       3: "disconnecting",
//     };

//     if (dbState === 1) {
//       // Test database connection with a simple query
//       const startTime = Date.now();
//       await mongoose.connection.db.admin().ping();
//       const responseTime = Date.now() - startTime;

//       return {
//         status: "healthy",
//         state: states[dbState],
//         responseTime: `${responseTime}ms`,
//       };
//     } else {
//       return {
//         status: "unhealthy",
//         state: states[dbState],
//         responseTime: null,
//       };
//     }
//   } catch (error) {
//     return {
//       status: "unhealthy",
//       state: "error",
//       error: error.message,
//       responseTime: null,
//     };
//   }
// };

// const determineOverallHealth = (health) => {
//   // Check database health
//   if (health.database?.status !== "healthy") {
//     return "unhealthy";
//   }

//   // Check memory usage (alert if over 80% of heap)
//   const memoryUsagePercent = (health.memory.used / health.memory.total) * 100;
//   if (memoryUsagePercent > 80) {
//     return "degraded";
//   }

//   // Check if process is running for less than 30 seconds (might be starting up)
//   if (health.uptime < 30) {
//     return "starting";
//   }

//   return "healthy";
// };

// // Detailed health check for monitoring systems
// export const detailedHealthCheck = async (req, res) => {
//   try {
//     const health = await getDetailedHealthStatus();
//     const statusCode = health.status === "healthy" ? 200 : 503;
//     res.status(statusCode).json(health);
//   } catch (error) {
//     res.status(503).json({
//       status: "unhealthy",
//       error: error.message,
//       timestamp: new Date().toISOString(),
//     });
//   }
// };

// const getDetailedHealthStatus = async () => {
//   const startTime = Date.now();

//   const health = {
//     status: "healthy",
//     timestamp: new Date().toISOString(),
//     service: process.env.SERVICE_NAME || "healthcare-backend",
//     version: process.env.SERVICE_VERSION || "v1.0.0",
//     environment: process.env.NODE_ENV || "development",
//     uptime: Math.floor(process.uptime()),
//     checks: {},
//   };

//   // Database check
//   health.checks.database = await checkDatabaseHealth();

//   // Memory check
//   const memoryUsage = process.memoryUsage();
//   health.checks.memory = {
//     status:
//       memoryUsage.heapUsed < memoryUsage.heapTotal * 0.8
//         ? "healthy"
//         : "degraded",
//     used: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
//     total: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
//     usage_percent: Math.round(
//       (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
//     ),
//   };

//   // File system check (basic)
//   try {
//     const fs = await import("fs/promises");
//     await fs.access("./logs", fs.constants.F_OK);
//     health.checks.filesystem = { status: "healthy" };
//   } catch (error) {
//     health.checks.filesystem = {
//       status: "unhealthy",
//       error: "Cannot access logs directory",
//     };
//   }

//   // Determine overall status
//   const allChecks = Object.values(health.checks);
//   const hasUnhealthy = allChecks.some((check) => check.status === "unhealthy");
//   const hasDegraded = allChecks.some((check) => check.status === "degraded");

//   if (hasUnhealthy) {
//     health.status = "unhealthy";
//   } else if (hasDegraded) {
//     health.status = "degraded";
//   } else {
//     health.status = "healthy";
//   }

//   health.responseTime = `${Date.now() - startTime}ms`;
//   return health;
// };

// export default healthCheck;
