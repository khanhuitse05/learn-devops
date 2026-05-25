"use strict";

const http = require("http");

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const failOnStart = process.env.FAIL_ON_START === "true";

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
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "devops-demo-node" }));
    return;
  }

  if (req.url === "/crash") {
    log("error", "manual crash requested from /crash endpoint");
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "crashing" }));

    setTimeout(() => {
      throw new Error("Intentional crash for systemd and journalctl practice");
    }, 100);
    return;
  }

  res.writeHead(200, { "content-type": "text/plain" });
  res.end("Hello from devops-demo-node. Try /health or /crash\n");
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
