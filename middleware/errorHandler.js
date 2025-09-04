// // middleware/errorHandler.js
// import winston from "winston";
// import colors from "colors";

// // Enhanced error logger with colors
// const errorLogger = winston.createLogger({
//   level: "error",
//   format: winston.format.combine(
//     winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
//     winston.format.errors({ stack: true }),
//     winston.format.printf(({ timestamp, level, message, ...meta }) => {
//       if (meta.type === "application_error") {
//         return formatApplicationError(timestamp, meta);
//       }
//       return winston.format
//         .json()
//         .transform({ timestamp, level, message, ...meta });
//     })
//   ),
//   transports: [
//     new winston.transports.Console(),
//     new winston.transports.File({
//       filename: "logs/error.log",
//       format: winston.format.combine(
//         winston.format.timestamp(),
//         winston.format.json(),
//         winston.format.prettyPrint()
//       ),
//     }),
//   ],
// });

// // Format error for console display
// function formatApplicationError(timestamp, meta) {
//   const ts = colors.gray(`[${timestamp}]`);
//   const errorType = colors.red.bold(`[${meta.errorType || "ERROR"}]`);
//   const method = colors.yellow(`${meta.method.padEnd(6)}`);
//   const url = colors.cyan(meta.url);
//   const status = colors.red.bold(meta.statusCode);
//   const userId =
//     meta.userId !== "anonymous"
//       ? colors.green(`[User: ${meta.userId}]`)
//       : colors.gray("[Anonymous]");

//   return `
// ${colors.red(
//   "┌─────────────────────────────────────────────────────────────────────────────────"
// )}
// ${ts} ${errorType} ${colors.bold.red("APPLICATION ERROR")}
// ${colors.red("├─")} ${colors.bold("Request:")} ${method} ${url} ${colors.bold(
//     "Status:"
//   )} ${status}
// ${colors.red("├─")} ${colors.bold("Client:")} ${colors.gray(
//     `[${meta.ip}]`
//   )} ${userId}
// ${colors.red("├─")} ${colors.bold("Error:")} ${colors.white(meta.error)}
// ${colors.red("├─")} ${colors.bold("Message:")} ${colors.white(meta.message)}
// ${
//   meta.requestId
//     ? `${colors.red("├─")} ${colors.bold("Request ID:")} ${colors.magenta(
//         `[${meta.requestId}]`
//       )}`
//     : ""
// }
// ${
//   meta.stack && process.env.NODE_ENV === "development"
//     ? `${colors.red("├─")} ${colors.bold("Stack:")} ${colors.gray(
//         meta.stack.split("\n")[1]?.trim() || "N/A"
//       )}`
//     : ""
// }
// ${colors.red(
//   "└─────────────────────────────────────────────────────────────────────────────────"
// )}`;
// }

// // Error type detection and categorization
// const getErrorInfo = (err) => {
//   // Validation Errors
//   if (err.name === "ValidationError" || err.name === "ValidatorError") {
//     return {
//       type: "VALIDATION_ERROR",
//       status: 400,
//       message: err.message,
//       details: err.details || err.errors || null,
//       userMessage: "Invalid input data provided",
//     };
//   }

//   // Authentication Errors
//   if (
//     err.name === "UnauthorizedError" ||
//     err.name === "JsonWebTokenError" ||
//     err.status === 401
//   ) {
//     return {
//       type: "AUTH_ERROR",
//       status: 401,
//       message: "Authentication required",
//       userMessage: "Please provide valid authentication credentials",
//     };
//   }

//   // Authorization Errors
//   if (
//     err.name === "ForbiddenError" ||
//     err.name === "AccessDeniedError" ||
//     err.status === 403
//   ) {
//     return {
//       type: "AUTHORIZATION_ERROR",
//       status: 403,
//       message: "Access denied",
//       userMessage: "You don't have permission to access this resource",
//     };
//   }

//   // Not Found Errors
//   if (
//     err.name === "NotFoundError" ||
//     err.name === "CastError" ||
//     err.status === 404
//   ) {
//     return {
//       type: "NOT_FOUND_ERROR",
//       status: 404,
//       message: "Resource not found",
//       userMessage: "The requested resource was not found",
//     };
//   }

//   // Database Errors
//   if (
//     err.name === "MongoError" ||
//     err.name === "MongooseError" ||
//     err.name === "MongoServerError"
//   ) {
//     let userMessage = "Database operation failed";
//     let status = 500;

//     // Specific MongoDB errors
//     if (err.code === 11000) {
//       status = 409;
//       userMessage = "Duplicate entry - this record already exists";
//     } else if (err.code === 121) {
//       status = 400;
//       userMessage = "Data validation failed";
//     }

//     return {
//       type: "DATABASE_ERROR",
//       status,
//       message:
//         process.env.NODE_ENV === "production" ? userMessage : err.message,
//       userMessage,
//       code: err.code,
//     };
//   }

//   // Rate Limiting Errors
//   if (err.name === "TooManyRequestsError" || err.status === 429) {
//     return {
//       type: "RATE_LIMIT_ERROR",
//       status: 429,
//       message: "Rate limit exceeded",
//       userMessage: "Too many requests - please try again later",
//     };
//   }

//   // JSON/Parsing Errors
//   if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
//     return {
//       type: "PARSE_ERROR",
//       status: 400,
//       message: "Invalid JSON in request body",
//       userMessage: "Request body contains invalid JSON format",
//     };
//   }

//   // File Upload Errors
//   if (err.name === "MulterError") {
//     let message = "File upload error";
//     if (err.code === "LIMIT_FILE_SIZE") {
//       message = "File too large";
//     } else if (err.code === "LIMIT_FILE_COUNT") {
//       message = "Too many files";
//     } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
//       message = "Unexpected file field";
//     }

//     return {
//       type: "FILE_UPLOAD_ERROR",
//       status: 400,
//       message,
//       userMessage: message,
//     };
//   }

//   // Network/Timeout Errors
//   if (err.name === "TimeoutError" || err.code === "ETIMEDOUT") {
//     return {
//       type: "TIMEOUT_ERROR",
//       status: 408,
//       message: "Request timeout",
//       userMessage: "Request took too long to process",
//     };
//   }

//   // CORS Errors
//   if (err.message && err.message.includes("CORS")) {
//     return {
//       type: "CORS_ERROR",
//       status: 403,
//       message: "CORS policy violation",
//       userMessage: "Cross-origin request blocked",
//     };
//   }

//   // Third-party API Errors
//   if (err.name === "AxiosError" || err.isAxiosError) {
//     return {
//       type: "EXTERNAL_API_ERROR",
//       status: err.response?.status || 502,
//       message: "External service error",
//       userMessage: "External service temporarily unavailable",
//     };
//   }

//   // Default/Unknown Errors
//   return {
//     type: "UNKNOWN_ERROR",
//     status: err.status || err.statusCode || 500,
//     message:
//       process.env.NODE_ENV === "production"
//         ? "Internal Server Error"
//         : err.message,
//     userMessage: "An unexpected error occurred",
//   };
// };

// // Enhanced error handler
// export const errorHandler = (err, req, res, next) => {
//   const errorInfo = getErrorInfo(err);
//   const requestId = req.requestId || req.headers["x-request-id"] || "unknown";

//   // Enhanced error logging with context
//   errorLogger.error("Application error occurred", {
//     type: "application_error",
//     errorType: errorInfo.type,
//     error: err.name || "UnknownError",
//     message: err.message,
//     stack: err.stack,
//     url: req.url,
//     method: req.method,
//     ip: req.ip || req.connection?.remoteAddress,
//     userAgent: req.get("User-Agent"),
//     timestamp: new Date().toISOString(),
//     userId: req.user?.id || "anonymous",
//     requestId: requestId,
//     statusCode: errorInfo.status,
//     body: process.env.NODE_ENV === "development" ? req.body : undefined,
//     query: process.env.NODE_ENV === "development" ? req.query : undefined,
//     params: process.env.NODE_ENV === "development" ? req.params : undefined,
//   });

//   // Prepare response object
//   const response = {
//     success: false,
//     error: errorInfo.type.replace(/_/g, " ").toLowerCase(),
//     message: errorInfo.userMessage,
//     statusCode: errorInfo.status,
//     timestamp: new Date().toISOString(),
//     requestId: requestId,
//   };

//   // Add details for specific error types
//   if (errorInfo.details) {
//     response.details = errorInfo.details;
//   }

//   // Add development-only information
//   if (process.env.NODE_ENV === "development") {
//     response.debug = {
//       originalMessage: err.message,
//       errorName: err.name,
//       stack: err.stack?.split("\n").slice(0, 5), // First 5 lines of stack
//     };
//   }

//   // Handle async errors properly
//   if (res.headersSent) {
//     return next(err);
//   }

//   // Send error response
//   res.status(errorInfo.status).json(response);
// };

// // Async error wrapper utility
// export const asyncHandler = (fn) => {
//   return (req, res, next) => {
//     Promise.resolve(fn(req, res, next)).catch(next);
//   };
// };

// // Custom error classes for better error handling
// export class AppError extends Error {
//   constructor(message, statusCode) {
//     super(message);
//     this.statusCode = statusCode;
//     this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
//     this.isOperational = true;

//     Error.captureStackTrace(this, this.constructor);
//   }
// }

// export class ValidationError extends AppError {
//   constructor(message, details = null) {
//     super(message, 400);
//     this.name = "ValidationError";
//     this.details = details;
//   }
// }

// export class NotFoundError extends AppError {
//   constructor(message = "Resource not found") {
//     super(message, 404);
//     this.name = "NotFoundError";
//   }
// }

// export class UnauthorizedError extends AppError {
//   constructor(message = "Authentication required") {
//     super(message, 401);
//     this.name = "UnauthorizedError";
//   }
// }

// export class ForbiddenError extends AppError {
//   constructor(message = "Access denied") {
//     super(message, 403);
//     this.name = "ForbiddenError";
//   }
// }

// export default errorHandler;
