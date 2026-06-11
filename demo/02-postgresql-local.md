# 02 - PostgreSQL Local

## Objective

Run PostgreSQL locally to use the database endpoints already present in the server. This step only configures runtime and creates schema, without modifying source code.

## Prerequisites

- Ran the local app and understood endpoints per [step 01](01-local-server-baseline.md).
- Local machine has Docker Desktop and Docker daemon running.
- Port `5432` is free or you know how to change the host port.
- If step 01 was cleaned up: no need to recreate any resources; just rerun the app when reaching the API test step.

## Knowledge to understand

- RDS PostgreSQL still uses the standard PostgreSQL protocol.
- The app should read connection config from env vars.
- ALB/ECS health checks should be separate from DB health.
- DB migration/seed data should run in a controlled manner, not run loosely on production.

## Estimated cost

Free if running PostgreSQL locally via Docker or personal machine.

## Cost warning for paid services

No RDS created at this step. Do not create RDS before the app can connect to local PostgreSQL.

## Console steps

No AWS Console used in this step.

## What needs to run?

There are three different processes:

| Process | Must run? | Purpose |
| --- | --- | --- |
| Docker Desktop daemon | Required | Docker CLI needs the daemon to create and run containers. |
| PostgreSQL container | Required | Provides local PostgreSQL on port `5432`. |
| Node.js app in `./server` | Only when testing APIs | Provides `/api/db/health`, `/api/orders`, and other HTTP endpoints. |

If you only want to test PostgreSQL with `psql`, you don't need to run the Node.js app yet.

## Server is already ready

The necessary files are already in `./server`:

- `app.js`: connects to PostgreSQL and provides database endpoints.
- `schema.sql`: creates the `orders` table and idempotent seed data.
- `package.json`: already declares the `pg` dependency.

Two groups of env vars have different purposes:

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: passed to the PostgreSQL container when creating the container for the first time.
- `DATABASE_URL`: passed to the Node.js app on startup so the app knows how to connect to PostgreSQL.

The Node.js app reads connection config from:

```bash
DATABASE_URL=postgres://devops_demo:devops_demo@localhost:5432/devops_demo
```

Or:

```bash
PGHOST=localhost
PGPORT=5432
PGDATABASE=devops_demo
PGUSER=devops_demo
PGPASSWORD=devops_demo
```

Creating a `.env` file is not required. The app currently does not auto-load `.env` files, so the simplest way is to pass `DATABASE_URL` right before the `node app.js` command.

Existing endpoints:

- `GET /api/db/health`: runs `select 1`.
- `GET /api/orders`: reads the order list.
- `GET /api/orders/:id`: reads a single order.
- `POST /api/orders`: creates a demo order if you want to practice writes.

Separate health endpoints:

- `GET /health`: only indicates the app process is alive, not dependent on DB.
- `GET /flow`: still used to demo the request path.

## Step-by-step practice

### 1. Start Docker Desktop

On macOS, Docker CLI only works after Docker Desktop daemon is running:

```bash
docker desktop start
docker info
```

Wait until `docker info` shows the `Server` section without Docker API connection errors.

### 2. Run PostgreSQL locally

From the repo root:

```bash
docker run --name learn-devops-demo-postgres \
  -e POSTGRES_DB=devops_demo \
  -e POSTGRES_USER=devops_demo \
  -e POSTGRES_PASSWORD=devops_demo \
  -p 5432:5432 \
  -d postgres:16-alpine
```

The `docker run` command creates the container for the first time. If the container already exists but is stopped, do not rerun the above command; use:

```bash
docker start learn-devops-demo-postgres
```

### 3. Check DB and create schema

Check that PostgreSQL is ready:

```bash
docker exec -it learn-devops-demo-postgres \
  psql -U devops_demo -d devops_demo -c "select version();"
```

Create table and seed data from the repo root:

```bash
docker exec -i learn-devops-demo-postgres \
  psql -U devops_demo -d devops_demo < server/schema.sql
```

### 4. Run Node.js app with DB connection env

If the app from step 01 is still running, stop the old app with `Ctrl+C`. Then:

```bash
cd server
DATABASE_URL=postgres://devops_demo:devops_demo@localhost:5432/devops_demo node app.js
```

`DATABASE_URL=... node app.js` applies the env var only for this app run. If you want to export the env for the entire current terminal:

```bash
cd server
export DATABASE_URL=postgres://devops_demo:devops_demo@localhost:5432/devops_demo
node app.js
```

### 5. Test API from another terminal

```bash
curl -i http://localhost:3000/api/db/health
curl -i http://localhost:3000/api/orders
curl -i http://localhost:3000/api/orders/1
curl -i \
  -H "Content-Type: application/json" \
  -d '{"customerName":"CLI User","totalUsd":19.99}' \
  http://localhost:3000/api/orders
```

## Expected result

- Local PostgreSQL runs on port 5432.
- Can connect to the database via TablePlus at `localhost:5432`.
- `select version()` succeeds.
- `/api/db/health` returns HTTP 200.
- `/api/orders` and `/api/orders/1` return data from the `orders` table.
- `POST /api/orders` creates a new order and returns HTTP 201.

## Cleanup

- Stop the app with `Ctrl+C`, then delete the manually created PostgreSQL container to avoid port conflicts with Docker Compose.

```bash
docker stop learn-devops-demo-postgres
docker rm learn-devops-demo-postgres
```

If you want to delete all data volumes created by Docker, check volumes first then delete unused volumes.

## Troubleshooting

- `failed to connect to the docker API` or `docker.sock: no such file or directory`: Docker Desktop daemon is not running. Run `docker desktop start`, then wait for `docker info` to succeed.
- `Conflict. The container name ... is already in use`: the container was created before. Use `docker start learn-devops-demo-postgres`, or delete the old container if you want to recreate.
- `port is already allocated`: machine already has PostgreSQL running on 5432, change the host port to `5433:5432`.
- `password authentication failed`: check user/password in `DATABASE_URL`.
- App health OK but DB health error: this is by design, debug DB separately.