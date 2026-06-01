# 03 - Docker Compose App + PostgreSQL

## Mục tiêu

Chạy app và PostgreSQL bằng Docker Compose để mô phỏng cách ECS task kết nối database qua network nội bộ.

## Prerequisites

- Đã hoàn thành [step 02](02-postgresql-local.md) để hiểu cách app kết nối PostgreSQL.
- Docker Desktop và Docker daemon đang chạy.
- Đã cleanup container PostgreSQL tạo thủ công ở step 02 để tránh trùng port `5432`.
- Các file `server/compose.yml`, `server/Dockerfile` và `server/schema.sql` còn tồn tại.

## Kiến thức cần hiểu

- Trong Docker Compose, service gọi nhau bằng service name.
- App nên dùng env var, không hardcode host/password.
- Container logs nên ghi ra stdout/stderr.
- Volume giữ data PostgreSQL giữa các lần restart.
- `server/compose.yml` đã chứa đầy đủ config; không cần sửa code hoặc tự tạo file trong lúc học.

## Chi phí ước lượng

Miễn phí local.

## Cảnh báo service tốn tiền

Không dùng AWS ở bước này.

## Các bước làm bằng Console

Không dùng AWS Console trong bước này.

## File đã có sẵn

- `server/compose.yml`: chạy app và PostgreSQL.
- `server/schema.sql`: được PostgreSQL container apply tự động khi tạo data volume lần đầu.
- PostgreSQL có healthcheck; app chỉ start sau khi DB healthy.

## `compose.yml`

`compose.yml` hướng dẫn Docker chạy nhiều container cùng nhau. File này thường do DevOps cấu hình dựa trên thông tin từ developer.

Trong lab này:


| Config                       | Ý nghĩa                                                                 |
| ---------------------------- | ----------------------------------------------------------------------- |
| `services`                   | Có hai container: `app` và `postgres`.                                  |
| `build` / `image`            | Build app từ `Dockerfile` và dùng image PostgreSQL có sẵn.              |
| `environment`                | Truyền config vào container, ví dụ user/password DB và `DATABASE_URL`.  |
| `ports`                      | Mở app tại `localhost:3000` và DB tại `localhost:5432`.                 |
| `depends_on` + `healthcheck` | Chỉ start app sau khi PostgreSQL sẵn sàng.                              |
| `volumes`                    | Giữ data DB khi restart và tự chạy `schema.sql` khi tạo volume lần đầu. |


Các container gọi nhau bằng service name. Vì vậy app dùng host `postgres`, không dùng `localhost`.

User/password trong file chỉ dùng cho local. Không commit secret thật vào Git.

## Lệnh CLI kiểm tra/debug

```bash
cd server
docker compose up --build -d
docker compose ps
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
- Schema và seed data được tạo tự động trên volume mới.
- `/health` và `/api/db/health` đều trả HTTP 200.

## Cleanup

- Nếu học tiếp step 04: dừng stack local. Các step AWS sau không dùng container local.
- Nếu dừng tại đây: dừng stack local để giải phóng CPU, RAM và port.

```bash
cd server
docker compose down
```

Xóa cả database volume nếu muốn reset data:

```bash
docker compose down -v
```

## Troubleshooting

- App chưa start: chạy `docker compose ps` và `docker compose logs postgres` để kiểm tra PostgreSQL healthcheck.
- `postgres` không resolve: kiểm tra service name trong compose.
- DB data cũ gây lỗi schema: dùng `docker compose down -v` để reset trong môi trường local.
