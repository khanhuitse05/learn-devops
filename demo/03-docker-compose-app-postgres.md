# 03 - Docker Compose App + PostgreSQL

## Mục tiêu

Chạy app và PostgreSQL bằng Docker Compose để mô phỏng cách ECS task kết nối database qua network nội bộ.

## Kiến thức cần hiểu

- Trong Docker Compose, service gọi nhau bằng service name.
- App nên dùng env var, không hardcode host/password.
- Container logs nên ghi ra stdout/stderr.
- Volume giữ data PostgreSQL giữa các lần restart.

## Chi phí ước lượng

Miễn phí local.

## Cảnh báo service tốn tiền

Không dùng AWS ở bước này.

## Các bước làm bằng Console

Không dùng AWS Console trong bước này.

## File cần bổ sung sau

Khi triển khai phần code, nên thêm `server/schema.sql` và `server/docker-compose.yml` hoặc `compose.yml` ở root repo.

Compose gợi ý:

```yaml
services:
  app:
    build: .
    environment:
      PORT: "3000"
      HOST: "0.0.0.0"
      DATABASE_URL: postgres://devops_demo:devops_demo@postgres:5432/devops_demo
    ports:
      - "3000:3000"
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: devops_demo
      POSTGRES_USER: devops_demo
      POSTGRES_PASSWORD: devops_demo
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Lệnh CLI kiểm tra/debug

```bash
cd server
docker compose up --build
```

Terminal khác:

```bash
curl -i http://localhost:3000/health
curl -i http://localhost:3000/api/db/health
curl -i http://localhost:3000/api/orders
```

Xem logs:

```bash
docker compose logs app
docker compose logs postgres
```

Kiểm tra network:

```bash
docker compose exec app sh
```

Trong shell container app, nếu có tool phù hợp:

```bash
nc -vz postgres 5432
```

## Expected result

- `docker compose up --build` chạy app và PostgreSQL.
- App gọi DB bằng host `postgres`.
- `/health` và `/api/db/health` đều OK sau khi code DB được bổ sung.

## Cleanup

```bash
cd server
docker compose down
```

Xóa cả database volume nếu muốn reset data:

```bash
docker compose down -v
```

## Troubleshooting

- App start trước DB: thêm retry connection trong app hoặc chạy lại request sau vài giây.
- `postgres` không resolve: kiểm tra service name trong compose.
- DB data cũ gây lỗi schema: dùng `docker compose down -v` để reset trong môi trường local.
