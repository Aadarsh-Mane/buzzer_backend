// middleware/metrics.js
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.File({ filename: "logs/metrics.log" })],
});

// In-memory metrics storage (consider using Redis in production)
const metrics = {
  requests: {
    total: 0,
    byMethod: {},
    byStatus: {},
    byRoute: {},
  },
  responseTime: {
    total: 0,
    count: 0,
    average: 0,
    min: Infinity,
    max: 0,
  },
  errors: {
    total: 0,
    byType: {},
  },
  activeConnections: 0,
  startTime: Date.now(),
};

export const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Increment active connections
  metrics.activeConnections++;

  // Track request
  metrics.requests.total++;

  // Track by method
  metrics.requests.byMethod[req.method] =
    (metrics.requests.byMethod[req.method] || 0) + 1;

  // Track by route (simplified)
  const route = getRoutePattern(req.path);
  metrics.requests.byRoute[route] = (metrics.requests.byRoute[route] || 0) + 1;

  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Decrement active connections
    metrics.activeConnections--;

    // Track response time
    metrics.responseTime.total += responseTime;
    metrics.responseTime.count++;
    metrics.responseTime.average =
      metrics.responseTime.total / metrics.responseTime.count;
    metrics.responseTime.min = Math.min(metrics.responseTime.min, responseTime);
    metrics.responseTime.max = Math.max(metrics.responseTime.max, responseTime);

    // Track by status code
    const statusCode = res.statusCode;
    metrics.requests.byStatus[statusCode] =
      (metrics.requests.byStatus[statusCode] || 0) + 1;

    // Track errors
    if (statusCode >= 400) {
      metrics.errors.total++;
      const errorType = getErrorType(statusCode);
      metrics.errors.byType[errorType] =
        (metrics.errors.byType[errorType] || 0) + 1;
    }

    // Log metrics for slow requests
    if (responseTime > 1000) {
      logger.warn("Slow request detected", {
        method: req.method,
        path: req.path,
        statusCode,
        responseTime: `${responseTime}ms`,
        userAgent: req.get("User-Agent"),
        ip: req.ip,
      });
    }

    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Get metrics endpoint
export const getMetrics = (req, res) => {
  const currentTime = Date.now();
  const uptime = currentTime - metrics.startTime;

  const metricsData = {
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime / 1000), // in seconds
    requests: {
      total: metrics.requests.total,
      rate: metrics.requests.total / (uptime / 1000 / 60), // requests per minute
      byMethod: metrics.requests.byMethod,
      byStatus: metrics.requests.byStatus,
      byRoute: metrics.requests.byRoute,
    },
    responseTime: {
      average: Math.round(metrics.responseTime.average * 100) / 100,
      min: metrics.responseTime.min === Infinity ? 0 : metrics.responseTime.min,
      max: metrics.responseTime.max,
    },
    errors: {
      total: metrics.errors.total,
      rate: metrics.errors.total / (uptime / 1000 / 60), // errors per minute
      byType: metrics.errors.byType,
    },
    activeConnections: metrics.activeConnections,
    memory: getMemoryMetrics(),
    cpu: getCPUMetrics(),
    system: getSystemMetrics(),
  };

  res.json(metricsData);
};

// Get Prometheus-style metrics
export const getPrometheusMetrics = (req, res) => {
  const serviceName = process.env.SERVICE_NAME || "healthcare_backend";
  const serviceVersion = process.env.SERVICE_VERSION || "v1.0.0";

  let prometheusMetrics = "";

  // Request metrics
  prometheusMetrics += `# HELP http_requests_total Total number of HTTP requests\n`;
  prometheusMetrics += `# TYPE http_requests_total counter\n`;
  Object.entries(metrics.requests.byMethod).forEach(([method, count]) => {
    prometheusMetrics += `http_requests_total{method="${method}",service="${serviceName}",version="${serviceVersion}"} ${count}\n`;
  });

  // Response time metrics
  prometheusMetrics += `# HELP http_request_duration_seconds HTTP request duration in seconds\n`;
  prometheusMetrics += `# TYPE http_request_duration_seconds histogram\n`;
  prometheusMetrics += `http_request_duration_seconds_sum{service="${serviceName}",version="${serviceVersion}"} ${
    metrics.responseTime.total / 1000
  }\n`;
  prometheusMetrics += `http_request_duration_seconds_count{service="${serviceName}",version="${serviceVersion}"} ${metrics.responseTime.count}\n`;

  // Error metrics
  prometheusMetrics += `# HELP http_errors_total Total number of HTTP errors\n`;
  prometheusMetrics += `# TYPE http_errors_total counter\n`;
  Object.entries(metrics.errors.byType).forEach(([type, count]) => {
    prometheusMetrics += `http_errors_total{type="${type}",service="${serviceName}",version="${serviceVersion}"} ${count}\n`;
  });

  // Active connections
  prometheusMetrics += `# HELP http_active_connections Current number of active connections\n`;
  prometheusMetrics += `# TYPE http_active_connections gauge\n`;
  prometheusMetrics += `http_active_connections{service="${serviceName}",version="${serviceVersion}"} ${metrics.activeConnections}\n`;

  // Memory metrics
  const memoryUsage = process.memoryUsage();
  prometheusMetrics += `# HELP process_memory_usage_bytes Process memory usage in bytes\n`;
  prometheusMetrics += `# TYPE process_memory_usage_bytes gauge\n`;
  prometheusMetrics += `process_memory_usage_bytes{type="heap_used",service="${serviceName}",version="${serviceVersion}"} ${memoryUsage.heapUsed}\n`;
  prometheusMetrics += `process_memory_usage_bytes{type="heap_total",service="${serviceName}",version="${serviceVersion}"} ${memoryUsage.heapTotal}\n`;
  prometheusMetrics += `process_memory_usage_bytes{type="external",service="${serviceName}",version="${serviceVersion}"} ${memoryUsage.external}\n`;
  prometheusMetrics += `process_memory_usage_bytes{type="rss",service="${serviceName}",version="${serviceVersion}"} ${memoryUsage.rss}\n`;

  res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(prometheusMetrics);
};

// Reset metrics (useful for testing)
export const resetMetrics = (req, res) => {
  metrics.requests = {
    total: 0,
    byMethod: {},
    byStatus: {},
    byRoute: {},
  };
  metrics.responseTime = {
    total: 0,
    count: 0,
    average: 0,
    min: Infinity,
    max: 0,
  };
  metrics.errors = {
    total: 0,
    byType: {},
  };
  metrics.activeConnections = 0;
  metrics.startTime = Date.now();

  res.json({ message: "Metrics reset successfully" });
};

// Helper functions
const getRoutePattern = (path) => {
  // Simplify route patterns for better grouping
  return path
    .replace(/\/\d+/g, "/:id") // Replace numeric IDs
    .replace(/\/[a-f0-9-]{36}/g, "/:uuid") // Replace UUIDs
    .replace(/\/[a-f0-9]{24}/g, "/:objectId"); // Replace MongoDB ObjectIds
};

const getErrorType = (statusCode) => {
  if (statusCode >= 400 && statusCode < 500) return "client_error";
  if (statusCode >= 500) return "server_error";
  return "unknown";
};

const getMemoryMetrics = () => {
  const memoryUsage = process.memoryUsage();
  return {
    heapUsed: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100, // MB
    heapTotal: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100, // MB
    external: Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100, // MB
    rss: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100, // MB
    usage_percent: Math.round(
      (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
    ),
  };
};

const getCPUMetrics = () => {
  const cpuUsage = process.cpuUsage();
  return {
    user: cpuUsage.user,
    system: cpuUsage.system,
    total: cpuUsage.user + cpuUsage.system,
  };
};

const getSystemMetrics = () => {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    pid: process.pid,
    uptime: Math.floor(process.uptime()),
  };
};

export default metricsMiddleware;
