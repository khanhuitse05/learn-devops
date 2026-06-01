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

## Cần chạy những gì?

Có ba process khác nhau:

| Process | Có cần chạy không? | Mục đích |
| --- | --- | --- |
| Docker Desktop daemon | Bắt buộc | Docker CLI cần daemon để tạo và chạy container. |
| PostgreSQL container | Bắt buộc | Cung cấp PostgreSQL local trên port `5432`. |
| Node.js app trong `./server` | Chỉ cần khi test API | Cung cấp `/api/db/health`, `/api/orders`, và các endpoint HTTP khác. |

Nếu chỉ muốn kiểm tra PostgreSQL bằng `psql`, chưa cần chạy Node.js app.

## Server đã sẵn sàng

Các file cần thiết đã có trong `./server`:

- `app.js`: kết nối PostgreSQL và cung cấp endpoint database.
- `schema.sql`: tạo bảng `orders` và seed data idempotent.
- `package.json`: đã khai báo dependency `pg`.

Hai nhóm env var có mục đích khác nhau:

- `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: truyền vào PostgreSQL container khi tạo container lần đầu.
- `DATABASE_URL`: truyền vào Node.js app khi khởi động app để app biết cách kết nối PostgreSQL.

Node.js app đọc config kết nối từ:

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

Không bắt buộc tạo file `.env`. App hiện không tự động load file `.env`, vì vậy cách đơn giản nhất là truyền `DATABASE_URL` ngay trước lệnh `node app.js`.

Endpoint đã có:

- `GET /api/db/health`: chạy `select 1`.
- `GET /api/orders`: đọc danh sách order.
- `GET /api/orders/:id`: đọc một order.
- `POST /api/orders`: tạo order demo nếu muốn thực hành write.

Endpoint health riêng biệt:

- `GET /health`: chỉ báo app process còn sống, không phụ thuộc DB.
- `GET /flow`: vẫn dùng để demo request path.

## Thực hành từng bước

### 1. Khởi động Docker Desktop

Trên macOS, Docker CLI chỉ hoạt động sau khi Docker Desktop daemon đã chạy:

```bash
docker desktop start
docker info
```

Đợi đến khi `docker info` hiển thị phần `Server` mà không có lỗi kết nối Docker API.

### 2. Chạy PostgreSQL local

Từ root repo:

```bash
docker run --name learn-devops-demo-postgres \
  -e POSTGRES_DB=devops_demo \
  -e POSTGRES_USER=devops_demo \
  -e POSTGRES_PASSWORD=devops_demo \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Lệnh `docker run` tạo container lần đầu. Nếu container đã tồn tại nhưng đang dừng, không chạy lại lệnh trên; dùng:

```bash
docker start learn-devops-demo-postgres
```

### 3. Kiểm tra DB và tạo schema

Kiểm tra PostgreSQL đã sẵn sàng:

```bash
docker exec -it learn-devops-demo-postgres \
  psql -U devops_demo -d devops_demo -c "select version();"
```

Tạo bảng và seed data từ root repo:

```bash
docker exec -i learn-devops-demo-postgres \
  psql -U devops_demo -d devops_demo < server/schema.sql
```

### 4. Chạy Node.js app với env kết nối DB

Nếu app của bước 01 vẫn đang chạy, dừng app cũ bằng `Ctrl+C`. Sau đó:

```bash
cd server
DATABASE_URL=postgres://devops_demo:devops_demo@localhost:5432/devops_demo node app.js
```

`DATABASE_URL=... node app.js` chỉ áp dụng env var cho lần chạy app này. Nếu muốn export env cho cả terminal hiện tại:

```bash
cd server
export DATABASE_URL=postgres://devops_demo:devops_demo@localhost:5432/devops_demo
node app.js
```

### 5. Test API từ terminal khác

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
- Có thể kết nối database bằng TablePlus qua `localhost:5432`.
- `select version()` thành công.
- `/api/db/health` trả HTTP 200.
- `/api/orders` và `/api/orders/1` trả dữ liệu từ bảng `orders`.
- `POST /api/orders` tạo order mới và trả HTTP 201.

## Cleanup

- Nếu học tiếp step 03: dừng app bằng `Ctrl+C`, sau đó xóa container PostgreSQL tạo thủ công để tránh trùng port với Docker Compose.
- Nếu dừng tại đây: dừng app bằng `Ctrl+C` và xóa container PostgreSQL local.

```bash
docker stop learn-devops-demo-postgres
docker rm learn-devops-demo-postgres
```

Nếu muốn xóa toàn bộ data volume do Docker tạo, kiểm tra volume trước rồi xóa volume không còn dùng.

## Troubleshooting

- `failed to connect to the docker API` hoặc `docker.sock: no such file or directory`: Docker Desktop daemon chưa chạy. Chạy `docker desktop start`, sau đó đợi `docker info` thành công.
- `Conflict. The container name ... is already in use`: container đã được tạo trước đó. Dùng `docker start learn-devops-demo-postgres`, hoặc xóa container cũ nếu muốn tạo lại.
- `port is already allocated`: máy đã có PostgreSQL chạy trên 5432, đổi port host sang `5433:5432`.
- `password authentication failed`: kiểm tra user/password trong `DATABASE_URL`.
- App health OK nhưng DB health fail: đây là đúng thiết kế, debug DB riêng.
