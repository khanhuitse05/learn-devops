"use strict";

const http = require("http");
const { Pool } = require("pg");

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const failOnStart = process.env.FAIL_ON_START === "true";
const rdsStatus = process.env.DEMO_RDS_STATUS || "ok";
const redisStatus = process.env.DEMO_REDIS_STATUS || "ok";
const efsStatus = process.env.DEMO_EFS_STATUS || "ok";
const databaseUrl = process.env.DATABASE_URL;
const pool = new Pool(databaseUrl ? { connectionString: databaseUrl } : undefined);

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

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

async function readJsonBody(req) {
  const chunks = [];
  let length = 0;

  for await (const chunk of req) {
    length += chunk.length;
    if (length > 1024 * 1024) {
      throw new HttpError(413, "Request body must be smaller than 1 MB.");
    }
    chunks.push(chunk);
  }

  const body = Buffer.concat(chunks).toString("utf8");
  if (!body.trim()) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

async function queryDatabase(operation, text, values = []) {
  try {
    return await pool.query(text, values);
  } catch (error) {
    error.databaseOperation = operation;
    throw error;
  }
}

function getOrderId(pathname) {
  const id = pathname.slice("/api/orders/".length);
  if (!/^[1-9]\d*$/.test(id)) {
    throw new HttpError(400, "Order id must be a positive integer.");
  }

  return Number(id);
}

function parseNewOrder(body) {
  const customerName = typeof body.customerName === "string"
    ? body.customerName.trim()
    : "";
  const hasTotal = typeof body.totalUsd === "number"
    || (typeof body.totalUsd === "string" && body.totalUsd.trim() !== "");
  const totalUsd = hasTotal ? Number(body.totalUsd) : Number.NaN;
  const status = body.status === undefined ? "created" : body.status;

  if (!customerName) {
    throw new HttpError(400, "customerName is required.");
  }

  if (!Number.isFinite(totalUsd) || totalUsd < 0) {
    throw new HttpError(400, "totalUsd must be a non-negative number.");
  }

  if (typeof status !== "string" || !status.trim()) {
    throw new HttpError(400, "status must be a non-empty string.");
  }

  return {
    customerName,
    totalUsd,
    status: status.trim(),
  };
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

async function handleRequest(req, res) {
  const pathname = new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname;

  log("info", "request received", {
    method: req.method,
    url: pathname,
    userAgent: req.headers["user-agent"],
  });

  if (pathname === "/health") {
    sendJson(res, 200, { status: "ok", service: "devops-demo-node" });
    return;
  }

  if (pathname === "/flow") {
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

  if (pathname === "/api/demo-order") {
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

  if (req.method === "GET" && pathname === "/api/db/health") {
    await queryDatabase("health check", "select 1 as result");
    sendJson(res, 200, { status: "ok", database: "reachable" });
    return;
  }

  if (req.method === "GET" && pathname === "/api/orders") {
    const result = await queryDatabase(
      "list orders",
      `select
         id,
         customer_name as "customerName",
         total_usd as "totalUsd",
         status,
         created_at as "createdAt"
       from orders
       order by id`
    );
    sendJson(res, 200, {
      status: "ok",
      count: result.rowCount,
      orders: result.rows,
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/orders") {
    const order = parseNewOrder(await readJsonBody(req));
    const result = await queryDatabase(
      "create order",
      `insert into orders (customer_name, total_usd, status)
       values ($1, $2, $3)
       returning
         id,
         customer_name as "customerName",
         total_usd as "totalUsd",
         status,
         created_at as "createdAt"`,
      [order.customerName, order.totalUsd, order.status]
    );
    sendJson(res, 201, { status: "ok", order: result.rows[0] });
    return;
  }

  if (pathname.startsWith("/api/orders/")) {
    if (req.method !== "GET") {
      throw new HttpError(405, "Only GET is supported for a single order.");
    }

    const orderId = getOrderId(pathname);
    const result = await queryDatabase(
      "get order",
      `select
         id,
         customer_name as "customerName",
         total_usd as "totalUsd",
         status,
         created_at as "createdAt"
       from orders
       where id = $1`,
      [orderId]
    );

    if (result.rowCount === 0) {
      sendJson(res, 404, { status: "not_found", message: "Order not found." });
      return;
    }

    sendJson(res, 200, { status: "ok", order: result.rows[0] });
    return;
  }

  if (pathname === "/api/db/health") {
    throw new HttpError(405, "Only GET is supported for database health.");
  }

  if (pathname === "/api/orders") {
    throw new HttpError(405, "Only GET and POST are supported for orders.");
  }

  if (req.method === "GET" && pathname === "/test-error") {
    log("error", "intentional test error requested", {
      endpoint: "/test-error",
      purpose: "Generate HTTP 500 data for logs, metrics, dashboards, and alarms.",
    });
    sendJson(res, 500, {
      status: "test_error",
      message: "Intentional HTTP 500 for log, metric, dashboard, and alarm demos.",
    });
    return;
  }

  if (pathname === "/test-error") {
    throw new HttpError(405, "Only GET is supported for the test error demo.");
  }

  if (pathname === "/crash") {
    log("error", "manual crash requested from /crash endpoint");
    sendJson(res, 500, { status: "crashing" });

    setTimeout(() => {
      throw new Error("Intentional crash for systemd and journalctl practice");
    }, 100);
    return;
  }

  res.writeHead(200, { "content-type": "text/plain" });
  res.end(
    "Hello from devops-demo-node. Try /health, /flow, /api/demo-order, /api/db/health, /api/orders, /test-error, or /crash\n"
  );
}

function handleRequestError(error, req, res) {
  if (res.headersSent) {
    res.end();
    return;
  }

  if (error instanceof HttpError) {
    log("error", "invalid request", {
      method: req.method,
      url: req.url,
      statusCode: error.statusCode,
      errorMessage: error.message,
    });
    sendJson(res, error.statusCode, {
      status: "request_error",
      message: error.message,
    });
    return;
  }

  if (error.databaseOperation) {
    log("error", "database request failed", {
      operation: error.databaseOperation,
      errorName: error.name,
      errorMessage: error.message,
    });
    sendJson(res, 503, {
      status: "database_error",
      message: "Database request failed. Check PostgreSQL connection and schema.",
    });
    return;
  }

  log("error", "request failed", {
    method: req.method,
    url: req.url,
    errorName: error.name,
    errorMessage: error.message,
  });
  sendJson(res, 500, {
    status: "internal_error",
    message: "Unexpected server error.",
  });
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    handleRequestError(error, req, res);
  });
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

function shutdown(signal) {
  log("info", `${signal} received, shutting down`);
  server.close(async () => {
    try {
      await pool.end();
      log("info", "server stopped");
      process.exit(0);
    } catch (error) {
      log("error", "database pool shutdown failed", {
        errorName: error.name,
        errorMessage: error.message,
      });
      process.exit(1);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  log("error", "uncaught exception", {
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
