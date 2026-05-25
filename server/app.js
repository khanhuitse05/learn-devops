"use strict";

const http = require("http");

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const failOnStart = process.env.FAIL_ON_START === "true";
const rdsStatus = process.env.DEMO_RDS_STATUS || "ok";
const redisStatus = process.env.DEMO_REDIS_STATUS || "ok";
const efsStatus = process.env.DEMO_EFS_STATUS || "ok";

const dependencyPorts = {
  rds: Number(process.env.DEMO_RDS_PORT || 5432),
  redis: Number(process.env.DEMO_REDIS_PORT || 6379),
  efs: Number(process.env.DEMO_EFS_PORT || 2049),
};

function log(level, message, extra = {}) {
  const entry = {
    time: new Date().toISOString(),
    level,
    service: "devops-demo-node",
    message,
    ...extra,
  };

  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
    return;
  }

  console.log(line);
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { "content-type": "application/json" });
  res.end(JSON.stringify(body, null, 2));
}

function getRequestContext(req) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedFor = req.headers["x-forwarded-for"];
  const hostHeader = req.headers.host || "localhost";
  const protocol = forwardedProto || "http";
  const isHttps = protocol === "https";

  return {
    client: {
      userAgent: req.headers["user-agent"] || "unknown",
      ip: forwardedFor || req.socket.remoteAddress,
    },
    dns: {
      domain: hostHeader,
      lesson: "DNS resolves this domain to the ALB, API Gateway, or local server address.",
    },
    tls: {
      protocol,
      port: isHttps ? 443 : port,
      certificateChecked: isHttps,
      lesson: isHttps
        ? "In AWS, TLS is commonly terminated at ALB, CloudFront, or API Gateway."
        : "Local HTTP has no TLS certificate. Use X-Forwarded-Proto: https to simulate ALB HTTPS.",
    },
    entryLayer: {
      receivedBy: req.headers["x-demo-entry-layer"] || "local Node.js server",
      albTraceId: req.headers["x-amzn-trace-id"] || null,
      lesson: "An ALB/API Gateway receives the public request and forwards it to the app target.",
    },
    ecs: {
      service: process.env.ECS_SERVICE_NAME || "devops-demo-node",
      taskId: process.env.ECS_TASK_ID || "local-task",
      containerPort: port,
      lesson: "In production, ECS runs this app as one or more containers.",
    },
  };
}

function dependency(name, status, portNumber, purpose) {
  return {
    name,
    status,
    port: portNumber,
    purpose,
    connected: status === "ok",
  };
}

if (failOnStart) {
  log("error", "FAIL_ON_START=true, exiting during startup");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  log("info", "request received", {
    method: req.method,
    url: req.url,
    userAgent: req.headers["user-agent"],
  });

  if (req.url === "/health") {
    sendJson(res, 200, { status: "ok", service: "devops-demo-node" });
    return;
  }

  if (req.url === "/flow") {
    const context = getRequestContext(req);
    const flow = [
      "Mobile app / browser sends request",
      `DNS resolves ${context.dns.domain}`,
      `${context.tls.protocol.toUpperCase()} connection uses port ${context.tls.port}`,
      context.tls.certificateChecked
        ? "TLS certificate is checked"
        : "TLS certificate is skipped in local HTTP demo",
      `${context.entryLayer.receivedBy} receives request`,
      `${context.ecs.service} receives request on container port ${context.ecs.containerPort}`,
      "App can talk to RDS / Redis / EFS",
      "Response goes back through the same path",
    ];

    log("info", "production flow demo requested", {
      host: context.dns.domain,
      protocol: context.tls.protocol,
      entryLayer: context.entryLayer.receivedBy,
    });

    sendJson(res, 200, {
      status: "ok",
      demo: "typical-production-flow",
      flow,
      context,
      tryNext: "/api/demo-order",
    });
    return;
  }

  if (req.url === "/api/demo-order") {
    const context = getRequestContext(req);
    const dependencies = [
      dependency("RDS", rdsStatus, dependencyPorts.rds, "persistent relational data"),
      dependency("Redis", redisStatus, dependencyPorts.redis, "fast cache or session data"),
      dependency("EFS", efsStatus, dependencyPorts.efs, "shared file storage"),
    ];
    const failed = dependencies.filter((item) => !item.connected);
    const statusCode = failed.length > 0 ? 503 : 200;

    log(failed.length > 0 ? "error" : "info", "demo order request processed", {
      failedDependencies: failed.map((item) => item.name),
      dependencyCount: dependencies.length,
    });

    sendJson(res, statusCode, {
      status: failed.length > 0 ? "dependency_error" : "ok",
      requestPath: "Mobile app/browser -> DNS -> TLS -> ALB/API Gateway -> ECS -> app -> dependencies",
      app: {
        service: context.ecs.service,
        taskId: context.ecs.taskId,
      },
      dependencies,
      response: failed.length > 0
        ? "App cannot complete the request because one or more dependencies failed."
        : {
            orderId: "demo-1001",
            totalUsd: 29,
            source: "simulated RDS plus Redis cache plus EFS receipt file",
          },
    });
    return;
  }

  if (req.url === "/crash") {
    log("error", "manual crash requested from /crash endpoint");
    sendJson(res, 500, { status: "crashing" });

    setTimeout(() => {
      throw new Error("Intentional crash for systemd and journalctl practice");
    }, 100);
    return;
  }

  res.writeHead(200, { "content-type": "text/plain" });
  res.end("Hello from devops-demo-node. Try /health, /flow, /api/demo-order, or /crash\n");
});

server.listen(port, host, () => {
  log("info", "server started", { host, port });
});

setInterval(() => {
  const memory = process.memoryUsage();
  log("info", "heartbeat", {
    uptimeSeconds: Math.round(process.uptime()),
    rssMb: Math.round(memory.rss / 1024 / 1024),
    heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
  });
}, 30000);

process.on("SIGTERM", () => {
  log("info", "SIGTERM received, shutting down");
  server.close(() => {
    log("info", "server stopped");
    process.exit(0);
  });
});

process.on("uncaughtException", (error) => {
  log("error", "uncaught exception", {
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
