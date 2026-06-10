# 03 - Docker Compose App + PostgreSQL

## Objective

Run the app and PostgreSQL using Docker Compose to simulate how an ECS task connects to a database over an internal network.

## Prerequisites

- Completed [step 02](02-postgresql-local.md) to understand how the app connects to PostgreSQL.
- Docker Desktop and Docker daemon running.
- Cleaned up the manually created PostgreSQL container from step 02 to avoid port `5432` conflicts.
- The files `server/compose.yml`, `server/Dockerfile`, and `server/schema.sql` still exist.

## Knowledge to understand

- In Docker Compose, services call each other by service name.
- The app should use env vars, not hardcode host/password.
- Container logs should write to stdout/stderr.
- Volume keeps PostgreSQL data between restarts.
- `server/compose.yml` already contains full config; no need to modify code or create files during the lab.

## Estimated cost

Free locally.

## Cost warning for paid services

No AWS used in this step.

## Console steps

No AWS Console used in this step.

## Files already available

- `server/compose.yml`: runs app and PostgreSQL.
- `server/schema.sql`: automatically applied by the PostgreSQL container when creating the data volume for the first time.
- PostgreSQL has health check; app only starts after DB is healthy.

## `compose.yml`

`compose.yml` tells Docker to run multiple containers together. This file is typically configured by DevOps based on information from the developer.

In this lab:

| Config                       | Meaning                                                                    |
| ---------------------------- | -------------------------------------------------------------------------- |
| `services`                   | Has two containers: `app` and `postgres`.                                  |
| `build` / `image`            | Builds app from `Dockerfile` and uses the official PostgreSQL image.       |
| `environment`                | Passes config into containers, e.g., DB user/password and `DATABASE_URL`.  |
| `ports`                      | Opens app at `localhost:3000` and DB at `localhost:5432`.                  |
| `depends_on` + `healthcheck` | Only starts app after PostgreSQL is ready.                                 |
| `volumes`                    | Keeps DB data on restart and auto-runs `schema.sql` on first volume creation. |

Containers call each other by service name. Therefore the app uses host `postgres`, not `localhost`.

User/password in the file is for local use only. Do not commit real secrets to Git.

## CLI check/debug commands

```bash
cd server
docker compose up --build -d
docker compose ps
```

Another terminal:

```bash
curl -i http://localhost:3000/health
curl -i http://localhost:3000/api/db/health
curl -i http://localhost:3000/api/orders
```

View logs:

```bash
docker compose logs app
docker compose logs postgres
```

Check network:

```bash
docker compose exec app sh
```

Inside the app container shell, if suitable tools are available:

```bash
nc -vz postgres 5432
```

## Expected result

- `docker compose up --build` runs app and PostgreSQL.
- App calls DB using host `postgres`.
- Schema and seed data are created automatically on a new volume.
- Both `/health` and `/api/db/health` return HTTP 200.

## Cleanup

- If continuing to step 04: stop the local stack. Later AWS steps do not use local containers.
- If stopping here: stop the local stack to free CPU, RAM, and ports.

```bash
cd server
docker compose down
```

Delete the database volume if you want to reset data:

```bash
docker compose down -v
```

## Troubleshooting

- App hasn't started: run `docker compose ps` and `docker compose logs postgres` to check PostgreSQL health check.
- `postgres` cannot resolve: check the service name in compose.
- Old DB data causes schema error: use `docker compose down -v` to reset in a local environment.