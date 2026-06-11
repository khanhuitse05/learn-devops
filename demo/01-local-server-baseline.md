# 01 - Complete Local Server Baseline

## Objective

Run the complete server in `./server` and understand the endpoints before moving to AWS. This step is still necessary because it establishes a baseline to distinguish app health from database health when debugging later steps.

## Prerequisites

- Repo cloned and standing at the root folder `learn-devops`.
- Local machine has Node.js 18+ and npm.
- Run `npm ci` in `./server` if dependencies are not yet installed.
- No dependency on AWS resources from step 00. However, complete [step 00](00-prerequisites.md) before starting AWS steps.

## Knowledge to understand

- The server is already complete before starting the demo; later steps do not require modifying source code.
- `/health` is suitable as a health check for ALB/ECS.
- `/flow` helps learn the request path.
- `/api/demo-order` simulates RDS/Redis/EFS to learn dependency failure.
- `/api/db/health` and `/api/orders` call real PostgreSQL when the database is configured.
- `/test-error` produces a controlled HTTP 500 to demo logs, metrics, and alarms without crashing the process.
- The app process continues running when PostgreSQL is not yet available.

## CLI check/debug commands

From the repo root:

```bash
cd server
npm ci
npm run check
node app.js
```

Open another terminal:

```bash
curl -i http://localhost:3000/
curl -i http://localhost:3000/health
curl -i http://localhost:3000/flow
curl -i http://localhost:3000/api/demo-order
curl -i http://localhost:3000/test-error
curl -i http://localhost:3000/api/db/health
```

Simulate request going through ALB HTTPS:

```bash
curl -i \
  -H "Host: api.demo.local" \
  -H "X-Forwarded-Proto: https" \
  -H "X-Forwarded-For: 203.0.113.10" \
  -H "X-Demo-Entry-Layer: AWS ALB" \
  -H "X-Amzn-Trace-Id: Root=1-demo-trace" \
  http://localhost:3000/flow
```

After stopping the old server with `Ctrl+C`, simulate dependency failure:

```bash
DEMO_RDS_STATUS=down node app.js
```

From another terminal:

```bash
curl -i http://localhost:3000/api/demo-order
```

## Expected result

- `/health` returns HTTP 200.
- `/flow` returns JSON describing DNS/TLS/ALB/ECS.
- `/api/demo-order` returns `status: ok` when dependency env is `ok`.
- `/test-error` returns an intentional HTTP 500 and the server continues running.
- `/api/db/health` returns HTTP 503 at this step because PostgreSQL is not running yet. This is expected.
- When `DEMO_RDS_STATUS=down`, `/api/demo-order` returns HTTP 503.

## Cleanup

- Stop the server with `Ctrl+C`, then restart the app with `DATABASE_URL` as instructed in step 02.

## Troubleshooting

- Port 3000 in use: run `PORT=3001 node app.js`.
- `node: command not found`: install Node.js 18+.
- `Cannot find module 'pg'`: run `npm ci` in `./server`.
- Curl cannot connect: check if the server is still running.