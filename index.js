import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Service configurations ww
const services = [
  {
    name: "auth-service",
    path: "./auth-service",
    port: 6001,
    script: "index.js",
  },
  {
    name: "mock-interview-service",
    path: "./mock-interview-service",
    port: 6002,
    script: "index.js",
  },
  {
    name: "room-interview-service",
    path: "./room-interview-service",
    port: 6003,
    script: "index.js",
  },
  {
    name: "live-interview-service",

    path: "./live-interview-service",
    port: 6004,
    script: "index.js",
  },
  // Add more services here as you create them
];

// Store running processes
const runningServices = new Map();

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Utility function to add colored prefix to logs
function colorLog(service, message, color = colors.cyan) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] [${service}]${colors.reset} ${message}`);
}

// Function to start a single service
function startService(service) {
  return new Promise((resolve, reject) => {
    const servicePath = path.join(__dirname, service.path);

    colorLog(
      service.name,
      `Starting service on port ${service.port}...`,
      colors.yellow
    );

    // Spawn the service process with nodemon for development
    const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
    const serviceProcess = spawn(npxCmd, ["nodemon", service.script], {
      cwd: servicePath,
      stdio: ["inherit", "pipe", "pipe"],
      env: { ...process.env, PORT: service.port },
      shell: process.platform === "win32" ? true : false,
    });

    // Handle service output
    serviceProcess.stdout.on("data", (data) => {
      const output = data.toString().trim();
      if (output) {
        colorLog(service.name, output, colors.green);
      }
    });

    serviceProcess.stderr.on("data", (data) => {
      const error = data.toString().trim();
      if (error) {
        colorLog(service.name, `ERROR: ${error}`, colors.red);
      }
    });

    // Handle service startup
    serviceProcess.on("spawn", () => {
      colorLog(service.name, `Service spawned successfully`, colors.green);
      runningServices.set(service.name, serviceProcess);
      resolve(serviceProcess);
    });

    // Handle service errors
    serviceProcess.on("error", (error) => {
      colorLog(service.name, `Failed to start: ${error.message}`, colors.red);
      reject(error);
    });

    // Handle service exit
    serviceProcess.on("exit", (code, signal) => {
      runningServices.delete(service.name);
      if (code === 0) {
        colorLog(service.name, `Service stopped gracefully`, colors.yellow);
      } else {
        colorLog(
          service.name,
          `Service exited with code ${code}${signal ? ` (${signal})` : ""}`,
          colors.red
        );
      }
    });
  });
}

// Function to start all services
async function startAllServices() {
  console.log(
    `${colors.bright}${colors.magenta}🚀 Starting Microservices Platform${colors.reset}\n`
  );

  for (const service of services) {
    try {
      await startService(service);
      // Add a small delay between service starts
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      colorLog(
        "SYSTEM",
        `Failed to start ${service.name}: ${error.message}`,
        colors.red
      );
    }
  }

  console.log(
    `\n${colors.bright}${colors.green}✅ All services started!${colors.reset}`
  );
  console.log(`${colors.cyan}Running services:${colors.reset}`);
  services.forEach((service) => {
    console.log(`  • ${service.name}: http://localhost:${service.port}`);
  });
  console.log("");
}

// Function to stop all services
function stopAllServices() {
  console.log(`\n${colors.yellow}🛑 Stopping all services...${colors.reset}`);

  runningServices.forEach((process, serviceName) => {
    colorLog(serviceName, "Stopping service...", colors.yellow);
    process.kill("SIGTERM");
  });

  // Force kill after 5 seconds if graceful shutdown fails
  setTimeout(() => {
    runningServices.forEach((process, serviceName) => {
      if (!process.killed) {
        colorLog(serviceName, "Force killing service...", colors.red);
        process.kill("SIGKILL");
      }
    });
  }, 5000);
}

// Handle process termination
process.on("SIGINT", () => {
  console.log(
    `\n${colors.yellow}Received SIGINT. Shutting down gracefully...${colors.reset}`
  );
  stopAllServices();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log(
    `\n${colors.yellow}Received SIGTERM. Shutting down gracefully...${colors.reset}`
  );
  stopAllServices();
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error(
    `${colors.red}Uncaught Exception in Service Manager:${colors.reset}`,
    error.message
  );
  stopAllServices();
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    `${colors.red}Unhandled Rejection in Service Manager:${colors.reset}`,
    reason
  );
  stopAllServices();
  process.exit(1);
});

// Start all services
startAllServices().catch((error) => {
  console.error(
    `${colors.red}Failed to start services:${colors.reset}`,
    error.message
  );
  process.exit(1);
});
