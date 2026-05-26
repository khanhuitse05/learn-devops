# 01 - Local Server Baseline

## Mục tiêu

Chạy app Node.js hiện có trong `./server` và hiểu các endpoint trước khi đưa lên AWS.

## Kiến thức cần hiểu

- App hiện tại không có dependency npm ngoài.
- `/health` phù hợp làm health check cho ALB/ECS.
- `/flow` giúp học request path.
- `/api/demo-order` hiện đang mô phỏng RDS/Redis/EFS, chưa kết nối database thật.

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
npm run check
node app.js
```

Mở terminal khác:

```bash
curl -i http://localhost:3000/
curl -i http://localhost:3000/health
curl -i http://localhost:3000/flow
curl -i http://localhost:3000/api/demo-order
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

Mô phỏng dependency fail:

```bash
DEMO_RDS_STATUS=down node app.js
curl -i http://localhost:3000/api/demo-order
```

## Expected result

- `/health` trả HTTP 200.
- `/flow` trả JSON mô tả DNS/TLS/ALB/ECS.
- `/api/demo-order` trả `status: ok` khi dependency env là `ok`.
- Khi `DEMO_RDS_STATUS=down`, `/api/demo-order` trả HTTP 503.

## Cleanup

Dừng server bằng `Ctrl+C`.

## Troubleshooting

- Port 3000 bị dùng: chạy `PORT=3001 node app.js`.
- `node: command not found`: cài Node.js 18+.
- Curl không kết nối được: kiểm tra server còn chạy không.
