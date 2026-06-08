# Demo Node.js Systemd Service

This folder contains a complete Node.js demo app for learning DevOps basics with `systemd`, Docker, ECS, ALB, and PostgreSQL. The demo roadmap changes infrastructure and environment variables only; it does not require source-code edits between steps.

## Files

- `app.js`: demo HTTP server
- `schema.sql`: local PostgreSQL schema and seed data
- `compose.yml`: local app and PostgreSQL stack with automatic schema initialization
- `package.json`: Node project metadata and scripts
- `devops-demo-node.service`: sample `systemd` unit file
- `Dockerfile`: container image for running without Node.js installed on the host
- `devops-demo-node-docker.service`: sample `systemd` unit file that runs the Docker container

## Run Locally

```bash
npm ci
node app.js
```

In another terminal:

```bash
curl http://localhost:3000/
curl http://localhost:3000/health
curl http://localhost:3000/flow
curl http://localhost:3000/api/demo-order
curl http://localhost:3000/test-error
```

The app process can start without PostgreSQL. In that case `/health` still
returns HTTP `200`, while `/api/db/health` returns HTTP `503`.

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | App process health for ALB and ECS |
| `GET /flow` | Request-path learning demo |
| `GET /api/demo-order` | Simulated RDS, Redis, and EFS dependency demo |
| `GET /api/db/health` | Real PostgreSQL `select 1` check |
| `GET /api/orders` | Read real PostgreSQL orders |
| `GET /api/orders/:id` | Read one real PostgreSQL order |
| `POST /api/orders` | Create one real PostgreSQL order |
| `GET /test-error` | Intentional HTTP 500 for logs, metrics, dashboards, and alarms |
| `GET /crash` | Intentional process failure for restart practice |

## Run with Local PostgreSQL

Start PostgreSQL:

```bash
docker run --name learn-devops-demo-postgres \
  -e POSTGRES_DB=devops_demo \
  -e POSTGRES_USER=devops_demo \
  -e POSTGRES_PASSWORD=devops_demo \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Create the schema and seed data:

```bash
docker exec -i learn-devops-demo-postgres \
  psql -U devops_demo -d devops_demo < schema.sql
```

Start the app:

```bash
DATABASE_URL=postgres://devops_demo:devops_demo@localhost:5432/devops_demo node app.js
```

Test the real PostgreSQL endpoints from another terminal:

```bash
curl -i http://localhost:3000/api/db/health
curl -i http://localhost:3000/api/orders
curl -i http://localhost:3000/api/orders/1
curl -i \
  -H "Content-Type: application/json" \
  -d '{"customerName":"CLI User","totalUsd":19.99}' \
  http://localhost:3000/api/orders
```

`/health` only checks the app process. `/api/db/health` checks PostgreSQL
separately so an ALB or ECS health check does not depend on database health.

## Run App and PostgreSQL with Docker Compose

```bash
docker compose up --build -d
docker compose ps
curl -i http://localhost:3000/health
curl -i http://localhost:3000/api/db/health
curl -i http://localhost:3000/api/orders
```

The PostgreSQL container applies `schema.sql` automatically when its data volume
is first created. Reset the local database when needed:

```bash
docker compose down -v
```

## M1 Demo: Typical Production Flow

Use these endpoints while studying M1 networking.

Production idea:

```text
Mobile app / browser
  -> DNS resolves domain
  -> HTTPS connection starts on port 443
  -> TLS certificate is checked
  -> ALB or API Gateway receives request
  -> ECS service receives request
  -> app talks to RDS / Redis / EFS
  -> response goes back through the same path
```

This local app cannot create real DNS, TLS, ALB, ECS, RDS, Redis, or EFS by
itself. Instead, it shows the same flow with local HTTP plus demo headers.

Start the server:

```bash
node app.js
```

Show the request flow:

```bash
curl -i http://localhost:3000/flow
```

Simulate an ALB forwarding an HTTPS request to ECS:

```bash
curl -i \
  -H "Host: api.demo.local" \
  -H "X-Forwarded-Proto: https" \
  -H "X-Forwarded-For: 203.0.113.10" \
  -H "X-Demo-Entry-Layer: AWS ALB" \
  -H "X-Amzn-Trace-Id: Root=1-demo-trace" \
  http://localhost:3000/flow
```

Demo the app talking to dependencies:

```bash
curl -i http://localhost:3000/api/demo-order
```

The response shows simulated connections to:

- `RDS` on port `5432`
- `Redis` on port `6379`
- `EFS` on port `2049`

Practice a dependency failure:

```bash
DEMO_RDS_STATUS=down node app.js
```

In another terminal:

```bash
curl -i http://localhost:3000/api/demo-order
```

You should see HTTP `503`, which means the app is reachable but cannot finish
the request because a dependency is unhealthy.

Other failure simulations:

```bash
DEMO_REDIS_STATUS=down node app.js
DEMO_EFS_STATUS=down node app.js
```

Generate a safe HTTP 500 without stopping the app:

```bash
curl -i http://localhost:3000/test-error
curl -i http://localhost:3000/health
```

`/test-error` is useful for CloudWatch, ALB 5xx, dashboard, and alarm demos. It returns HTTP `500` but keeps the process alive. Use `/crash` only when you want to practice process restart behavior.

Useful lesson mapping:

| Flow step | Local demo signal |
| --- | --- |
| DNS resolves domain | `Host` header in `/flow` |
| HTTPS and TLS | `X-Forwarded-Proto: https` |
| ALB/API Gateway | `X-Demo-Entry-Layer: AWS ALB` |
| ECS service | `ECS_SERVICE_NAME` and `ECS_TASK_ID` env vars |
| RDS/Redis/EFS | `/api/demo-order` dependencies |
| Error signal | `/test-error` HTTP 500 without process crash |
| Response path | HTTP response from `curl -i` |

## Install as a Systemd Service on Ubuntu

Use this section only when Node.js is installed directly on the Ubuntu host.

These commands assume the repository is copied to `/opt/learn-devops`.

```bash
sudo mkdir -p /opt/learn-devops
sudo cp -R ~/learn-devops/* /opt/learn-devops/
sudo chown -R ubuntu:ubuntu /opt/learn-devops
cd /opt/learn-devops/server
npm ci --omit=dev
```

Check Node.js path:

```bash
which node
```

If the result is not `/usr/bin/node`, update `ExecStart` in `devops-demo-node.service`.

Copy the service file:

```bash
sudo cp /opt/learn-devops/server/devops-demo-node.service /etc/systemd/system/devops-demo-node.service
sudo systemctl daemon-reload
```

Start and enable the service:

```bash
sudo systemctl start devops-demo-node
sudo systemctl enable devops-demo-node
```

Check service status:

```bash
systemctl status devops-demo-node
```

Test the app:

```bash
curl http://localhost:3000/health
```

## Read Logs

Show recent logs:

```bash
journalctl -u devops-demo-node -n 100
```

Follow logs in real time:

```bash
journalctl -u devops-demo-node -f
```

Show logs since a time:

```bash
journalctl -u devops-demo-node --since "10 minutes ago"
```

Show only errors:

```bash
journalctl -u devops-demo-node -p err
```

## Practice: Make the Service Return HTTP 500

The `/test-error` endpoint returns an intentional HTTP `500` without stopping the process. Use it for log, metric, dashboard, and alarm practice.

```bash
curl http://localhost:3000/test-error
journalctl -u devops-demo-node -p err -n 20
curl http://localhost:3000/health
```

## Practice: Make the Service Fail

The `/crash` endpoint intentionally throws an error so you can practice reading failure logs and watching `systemd` restart the service.

```bash
curl http://localhost:3000/crash
systemctl status devops-demo-node
journalctl -u devops-demo-node -n 50
```

Because the service file has `Restart=on-failure`, `systemd` should restart it after the crash.

## Practice: Fail During Startup

Edit the service file:

```bash
sudo systemctl edit devops-demo-node
```

Add this override:

```ini
[Service]
Environment=FAIL_ON_START=true
```

Reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart devops-demo-node
```

Check what happened:

```bash
systemctl status devops-demo-node
journalctl -u devops-demo-node -n 100
```

Remove the override when finished:

```bash
sudo systemctl revert devops-demo-node
sudo systemctl daemon-reload
sudo systemctl restart devops-demo-node
```

## Useful Commands

```bash
sudo systemctl start devops-demo-node
sudo systemctl stop devops-demo-node
sudo systemctl restart devops-demo-node
sudo systemctl disable devops-demo-node
systemctl status devops-demo-node
journalctl -u devops-demo-node -f
sudo ss -tulpn | grep ":3000"
```

## Run with Docker

Use this when the Ubuntu server has Docker but does not have Node.js installed.

Build the image:

```bash
cd ~/learn-devops/server
docker build -t devops-demo-node:latest .
```

Run the container:

```bash
docker run --name devops-demo-node --rm -p 3000:3000 devops-demo-node:latest
```

Test the app from another terminal:

```bash
curl http://localhost:3000/health
```

Read container logs:

```bash
docker logs devops-demo-node
docker logs -f devops-demo-node
```

Practice an HTTP 500 and then a crash:

```bash
curl http://localhost:3000/test-error
curl http://localhost:3000/crash
docker ps -a
docker logs devops-demo-node
```

## Run Docker Container with Systemd

This is useful for learning both Docker and `systemd`.

These commands assume the repository is cloned at `~/learn-devops`.

Copy the repo to `/opt`:

```bash
sudo mkdir -p /opt/learn-devops
sudo cp -R ~/learn-devops/* /opt/learn-devops/
```

Build the Docker image:

```bash
cd /opt/learn-devops/server
sudo docker build -t devops-demo-node:latest .
```

Install the Docker-based service:

```bash
sudo cp /opt/learn-devops/server/devops-demo-node-docker.service /etc/systemd/system/devops-demo-node-docker.service
sudo systemctl daemon-reload
sudo systemctl start devops-demo-node-docker
sudo systemctl enable devops-demo-node-docker
```

Check service status:

```bash
systemctl status devops-demo-node-docker
```

Read service logs from journald:

```bash
journalctl -u devops-demo-node-docker -n 100
journalctl -u devops-demo-node-docker -f
```

Test the app:

```bash
curl http://localhost:3000/health
```

Practice service failure:

```bash
curl http://localhost:3000/test-error
curl http://localhost:3000/crash
systemctl status devops-demo-node-docker
journalctl -u devops-demo-node-docker -n 100
```
