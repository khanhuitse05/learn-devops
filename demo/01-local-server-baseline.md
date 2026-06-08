# 01 - Complete Local Server Baseline

## Mục tiêu

Chạy server hoàn chỉnh trong `./server` và hiểu các endpoint trước khi đưa lên AWS. Bước này vẫn cần thiết vì nó tạo baseline để phân biệt app health với database health khi debug các bước sau.

## Prerequisites

- Đã clone repo và đang đứng ở root folder `learn-devops`.
- Máy local có Node.js 18+ và npm.
- Chạy `npm ci` trong `./server` nếu chưa cài dependency.
- Không phụ thuộc resource AWS từ step 00. Tuy vậy nên hoàn thành [step 00](00-prerequisites.md) trước khi bắt đầu các step AWS.

## Kiến thức cần hiểu

- Server đã hoàn chỉnh trước khi bắt đầu demo; các bước sau không yêu cầu sửa source code.
- `/health` phù hợp làm health check cho ALB/ECS.
- `/flow` giúp học request path.
- `/api/demo-order` mô phỏng RDS/Redis/EFS để học dependency failure.
- `/api/db/health` và `/api/orders` gọi PostgreSQL thật khi database đã được cấu hình.
- `/test-error` tạo HTTP 500 có kiểm soát để demo logs, metrics và alarm mà không làm process chết.
- App process vẫn chạy khi PostgreSQL chưa sẵn sàng.

## Chi phí ước lượng

Miễn phí. Bước này chỉ chạy local.

## Cảnh báo service tốn tiền

Không tạo AWS resource ở bước này.

## Các bước làm bằng Console

Không dùng AWS Console trong bước này.

## Lệnh CLI kiểm tra/debug

Từ root repo:

```bash
cd server
npm ci
npm run check
node app.js
```

Mở terminal khác:

```bash
curl -i http://localhost:3000/
curl -i http://localhost:3000/health
curl -i http://localhost:3000/flow
curl -i http://localhost:3000/api/demo-order
curl -i http://localhost:3000/test-error
curl -i http://localhost:3000/api/db/health
```

Mô phỏng request đi qua ALB HTTPS:

```bash
curl -i \
  -H "Host: api.demo.local" \
  -H "X-Forwarded-Proto: https" \
  -H "X-Forwarded-For: 203.0.113.10" \
  -H "X-Demo-Entry-Layer: AWS ALB" \
  -H "X-Amzn-Trace-Id: Root=1-demo-trace" \
  http://localhost:3000/flow
```

Sau khi dừng server cũ bằng `Ctrl+C`, mô phỏng dependency failure:

```bash
DEMO_RDS_STATUS=down node app.js
```

Từ terminal khác:

```bash
curl -i http://localhost:3000/api/demo-order
```

## Expected result

- `/health` trả HTTP 200.
- `/flow` trả JSON mô tả DNS/TLS/ALB/ECS.
- `/api/demo-order` trả `status: ok` khi dependency env là `ok`.
- `/test-error` trả HTTP 500 có chủ đích và server vẫn tiếp tục chạy.
- `/api/db/health` trả HTTP 503 ở bước này vì chưa chạy PostgreSQL. Đây là kết quả mong đợi.
- Khi `DEMO_RDS_STATUS=down`, `/api/demo-order` trả HTTP 503.

## Cleanup

- Nếu học tiếp step 02: dừng server bằng `Ctrl+C`, sau đó chạy lại app với `DATABASE_URL` theo hướng dẫn ở step 02.
- Nếu dừng tại đây: dừng server bằng `Ctrl+C`.

## Troubleshooting

- Port 3000 bị dùng: chạy `PORT=3001 node app.js`.
- `node: command not found`: cài Node.js 18+.
- `Cannot find module 'pg'`: chạy `npm ci` trong `./server`.
- Curl không kết nối được: kiểm tra server còn chạy không.
