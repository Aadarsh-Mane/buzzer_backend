// middleware/requestLogger.js
import winston from "winston";
import colors from "colors";

// Define color themes
const colorTheme = {
  info: "cyan",
  warn: "yellow",
  error: "red",
  success: "green",
  debug: "blue",
  timestamp: "gray",
  method: {
    GET: "green",
    POST: "blue",
    PUT: "yellow",
    DELETE: "red",
    PATCH: "magenta",
  },
  status: {
    success: "green", // 2xx
    redirect: "yellow", // 3xx
    clientError: "red", // 4xx
    serverError: "red", // 5xx
  },
};

// Custom format for console logging
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const ts = colors.gray(`[${timestamp}]`);
    const lvl = colors[colorTheme[level] || "white"](
      `[${level.toUpperCase()}]`
    );

    if (meta.type === "request_start") {
      return formatRequestStart(ts, lvl, meta);
    } else if (meta.type === "request_end") {
      return formatRequestEnd(ts, lvl, meta);
    } else if (meta.type === "slow_request") {
      return formatSlowRequest(ts, lvl, meta);
    }

    return `${ts} ${lvl} ${message}`;
  })
);

// Custom format for file logging (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
  winston.format.prettyPrint()
);

const logger = winston.createLogger({
  level: "info",
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
    new winston.transports.File({
      filename: "logs/requests.log",
      format: fileFormat,
    }),
  ],
});

// Formatting functions
function formatRequestStart(timestamp, level, meta) {
  const method = colors[colorTheme.method[meta.method] || "white"](
    `${meta.method.padEnd(6)}`
  );
  const url = colors.cyan(meta.url);
  const ip = colors.gray(`[${meta.ip}]`);
  const userId =
    meta.userId !== "anonymous"
      ? colors.green(`[User: ${meta.userId}]`)
      : colors.gray("[Anonymous]");
  const requestId = colors.magenta(`[${meta.requestId}]`);

  return `
${colors.blue(
  "┌─────────────────────────────────────────────────────────────────────────────────"
)}
${timestamp} ${level} ${colors.bold("REQUEST STARTED")}
${colors.blue("├─")} ${colors.bold("Method:")} ${method} ${colors.bold(
    "URL:"
  )} ${url}
${colors.blue("├─")} ${colors.bold("Client:")} ${ip} ${userId}
${colors.blue("├─")} ${colors.bold("Request ID:")} ${requestId}
${colors.blue("├─")} ${colors.bold("User Agent:")} ${colors.gray(
    truncateString(meta.userAgent, 60)
  )}
${
  meta.contentLength
    ? `${colors.blue("├─")} ${colors.bold("Content Length:")} ${colors.yellow(
        meta.contentLength
      )}`
    : ""
}
${colors.blue(
  "└─────────────────────────────────────────────────────────────────────────────────"
)}`;
}

function formatRequestEnd(timestamp, level, meta) {
  const method = colors[colorTheme.method[meta.method] || "white"](
    `${meta.method.padEnd(6)}`
  );
  const url = colors.cyan(meta.url);
  const statusCode = getStatusColor(meta.statusCode);
  const duration = getDurationColor(meta.duration);
  const userId =
    meta.userId !== "anonymous"
      ? colors.green(`[User: ${meta.userId}]`)
      : colors.gray("[Anonymous]");
  const requestId = colors.magenta(`[${meta.requestId}]`);

  return `
${colors.green(
  "┌─────────────────────────────────────────────────────────────────────────────────"
)}
${timestamp} ${level} ${colors.bold("REQUEST COMPLETED")}
${colors.green("├─")} ${colors.bold("Method:")} ${method} ${colors.bold(
    "URL:"
  )} ${url}
${colors.green("├─")} ${colors.bold("Status:")} ${statusCode} ${colors.bold(
    "Duration:"
  )} ${duration}
${colors.green("├─")} ${colors.bold("Client:")} ${userId} ${colors.bold(
    "Request ID:"
  )} ${requestId}
${
  meta.contentLength
    ? `${colors.green("├─")} ${colors.bold("Response Size:")} ${colors.yellow(
        meta.contentLength
      )}`
    : ""
}
${colors.green(
  "└─────────────────────────────────────────────────────────────────────────────────"
)}`;
}

function formatSlowRequest(timestamp, level, meta) {
  const method = colors[colorTheme.method[meta.method] || "white"](
    `${meta.method.padEnd(6)}`
  );
  const url = colors.cyan(meta.url);
  const duration = colors.red.bold(meta.duration);
  const userId =
    meta.userId !== "anonymous"
      ? colors.green(`[User: ${meta.userId}]`)
      : colors.gray("[Anonymous]");

  return `
${colors.red(
  "┌─────────────────────────────────────────────────────────────────────────────────"
)}
${timestamp} ${level} ${colors.bold.red("⚠️  SLOW REQUEST DETECTED")}
${colors.red("├─")} ${colors.bold("Method:")} ${method} ${colors.bold(
    "URL:"
  )} ${url}
${colors.red("├─")} ${colors.bold("Duration:")} ${duration} ${colors.bold(
    "User:"
  )} ${userId}
${colors.red(
  "└─────────────────────────────────────────────────────────────────────────────────"
)}`;
}

// Helper functions
function getStatusColor(statusCode) {
  const code = parseInt(statusCode);
  let color = "white";

  if (code >= 200 && code < 300) color = "green";
  else if (code >= 300 && code < 400) color = "yellow";
  else if (code >= 400 && code < 500) color = "red";
  else if (code >= 500) color = "red";

  return colors[color].bold(`${statusCode} ${getStatusText(code)}`);
}

function getStatusText(code) {
  const statusTexts = {
    200: "OK",
    201: "Created",
    204: "No Content",
    300: "Multiple Choices",
    301: "Moved Permanently",
    302: "Found",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
  };
  return statusTexts[code] || "Unknown";
}

function getDurationColor(duration) {
  const time = parseInt(duration);
  let color = "green";

  if (time > 5000) color = "red";
  else if (time > 2000) color = "yellow";
  else if (time > 1000) color = "cyan";

  return colors[color].bold(duration);
}

function truncateString(str, maxLength) {
  if (!str) return "N/A";
  return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
}

// Generate unique request ID with timestamp
const generateRequestId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`;
};

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = req.headers["x-request-id"] || generateRequestId();

  // Skip logging for health check and static files
  const skipPaths = ["/health", "/favicon.ico", "/robots.txt"];
  if (skipPaths.includes(req.path)) {
    return next();
  }

  // Add request ID to request object for later use
  req.requestId = requestId;

  // Log request start
  logger.info("Request started", {
    type: "request_start",
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("User-Agent"),
    contentLength: req.get("Content-Length"),
    userId: req.user?.id || "anonymous",
    requestId: requestId,
    timestamp: new Date().toISOString(),
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const duration = Date.now() - startTime;

    logger.info("Request completed", {
      type: "request_end",
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get("Content-Length"),
      userId: req.user?.id || "anonymous",
      requestId: requestId,
      timestamp: new Date().toISOString(),
    });

    // Log slow requests
    if (duration > 5000) {
      logger.warn("Slow request detected", {
        type: "slow_request",
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        userId: req.user?.id || "anonymous",
        requestId: requestId,
      });
    }

    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Optional: Export a simple colored console logger for other parts of your app
export const appLogger = {
  info: (message, data = {}) => {
    console.log(colors.cyan(`ℹ️  ${message}`), data);
  },
  success: (message, data = {}) => {
    console.log(colors.green(`✅ ${message}`), data);
  },
  warn: (message, data = {}) => {
    console.log(colors.yellow(`⚠️  ${message}`), data);
  },
  error: (message, data = {}) => {
    console.log(colors.red(`❌ ${message}`), data);
  },
  debug: (message, data = {}) => {
    console.log(colors.blue(`🔍 ${message}`), data);
  },
};

export default requestLogger;
