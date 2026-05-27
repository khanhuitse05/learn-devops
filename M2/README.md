# M2: Docker and Containerization

M2 is about packaging an application into a container image that can run
consistently on a laptop, in CI, and on ECS/Fargate.

## Learning Goals

- Write a clean `Dockerfile`.
- Understand image layers, tags, containers, ports, volumes, and networks.
- Use Docker Compose for local app plus database/cache.
- Build smaller and safer images with `.dockerignore`, non-root users, and
  multi-stage builds.
- Prepare images for ECR and ECS deployment.

## Core Topics

### Image vs Container

- Image: immutable package containing app, runtime, and dependencies.
- Container: running instance of an image.
- Tag: human-readable image version such as `demo-001` or a commit SHA.
- Digest: immutable content identifier.

### Dockerfile Basics

- `FROM`: base image.
- `WORKDIR`: working directory.
- `COPY`: copy files into the image.
- `RUN`: build-time command.
- `ENV`: default environment variable.
- `EXPOSE`: documented container port.
- `CMD`: default runtime command.

### Runtime Basics

- Containers should log to stdout/stderr.
- Apps should bind to `0.0.0.0`, not only `localhost`.
- Configuration should come from environment variables or secrets.
- Data that must survive container replacement should use a managed database or
  volume.

## Hands-On Lab

1. Build the app in `server/`:

```bash
cd server
docker build -t learn-devops-demo-node:local .
```

2. Run it locally:

```bash
docker run --rm -p 3000:3000 \
  -e HOST=0.0.0.0 \
  -e PORT=3000 \
  learn-devops-demo-node:local
```

3. Test health:

```bash
curl -i http://localhost:3000/health
```

4. Add PostgreSQL and Redis with Docker Compose.
5. Compare image size before and after `.dockerignore` or multi-stage changes.

## Docker Compose Example

```yaml
services:
  app:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      HOST: 0.0.0.0
      PORT: 3000
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/app
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"
```

## Checklist

- The app starts with `docker run`.
- `/health` works from the host machine.
- Logs appear in `docker logs`.
- Image does not include `.git`, local secrets, or unnecessary files.
- The container can be configured by environment variables.

## Troubleshooting

- `curl` fails: check port mapping and app bind address.
- Container exits immediately: inspect `docker logs`.
- Build is slow: check layer order and `.dockerignore`.
- Image is huge: remove build tools from runtime image or use multi-stage build.
