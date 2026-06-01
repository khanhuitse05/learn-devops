# 02 - PostgreSQL Local

## Mục tiêu

Chạy PostgreSQL local để dùng các endpoint database đã có sẵn trong server. Bước này chỉ cấu hình runtime và tạo schema, không sửa source code.

## Kiến thức cần hiểu

- RDS PostgreSQL vẫn dùng protocol PostgreSQL chuẩn.
- App nên đọc connection config từ env vars.
- Health check của ALB/ECS nên tách khỏi DB health.
- DB migration/seed data nên chạy có kiểm soát, không chạy bừa trên production.

## Chi phí ước lượng

Miễn phí nếu chạy PostgreSQL local bằng Docker hoặc máy cá nhân.

## Cảnh báo service tốn tiền

Chưa tạo RDS ở bước này. Đừng tạo RDS trước khi app có thể kết nối PostgreSQL local.

## Các bước làm bằng Console

Không dùng AWS Console trong bước này.

## Server đã sẵn sàng

Các file cần thiết đã có trong `./server`:

- `app.js`: kết nối PostgreSQL và cung cấp endpoint database.
- `schema.sql`: tạo bảng `orders` và seed data idempotent.
- `package.json`: đã khai báo dependency `pg`.

App đọc config từ:

```bash
DATABASE_URL=postgres://devops_demo:devops_demo@localhost:5432/devops_demo
```

Hoặc:

```bash
PGHOST=localhost
PGPORT=5432
PGDATABASE=devops_demo
PGUSER=devops_demo
PGPASSWORD=devops_demo
```

Endpoint đã có:

- `GET /api/db/health`: chạy `select 1`.
- `GET /api/orders`: đọc danh sách order.
- `GET /api/orders/:id`: đọc một order.
- `POST /api/orders`: tạo order demo nếu muốn thực hành write.

Endpoint health riêng biệt:

- `GET /health`: chỉ báo app process còn sống, không phụ thuộc DB.
- `GET /flow`: vẫn dùng để demo request path.

## Lệnh CLI kiểm tra/debug

Chạy PostgreSQL local bằng Docker:

```bash
docker run --name learn-devops-demo-postgres \
  -e POSTGRES_DB=devops_demo \
  -e POSTGRES_USER=devops_demo \
  -e POSTGRES_PASSWORD=devops_demo \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Kiểm tra DB:

```bash
docker exec -it learn-devops-demo-postgres \
  psql -U devops_demo -d devops_demo -c "select version();"
```

Tạo schema:

```bash
docker exec -i learn-devops-demo-postgres \
  psql -U devops_demo -d devops_demo < server/schema.sql
```

Chạy app với PostgreSQL local:

```bash
cd server
DATABASE_URL=postgres://devops_demo:devops_demo@localhost:5432/devops_demo node app.js
```

Từ terminal khác:

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

- PostgreSQL local chạy trên port 5432.
- `select version()` thành công.
- `/api/db/health` trả HTTP 200.
- `/api/orders` và `/api/orders/1` trả dữ liệu từ bảng `orders`.
- `POST /api/orders` tạo order mới và trả HTTP 201.

## Cleanup

```bash
docker stop learn-devops-demo-postgres
docker rm learn-devops-demo-postgres
```

Nếu muốn xóa toàn bộ data volume do Docker tạo, kiểm tra volume trước rồi xóa volume không còn dùng.

## Troubleshooting

- `port is already allocated`: máy đã có PostgreSQL chạy trên 5432, đổi port host sang `5433:5432`.
- `password authentication failed`: kiểm tra user/password trong `DATABASE_URL`.
- App health OK nhưng DB health fail: đây là đúng thiết kế, debug DB riêng.
