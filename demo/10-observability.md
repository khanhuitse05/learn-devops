# 10 - Observability

## Mục tiêu

Theo dõi app bằng CloudWatch Logs, metric cơ bản và alarm để biết service có chạy ổn không.

## Kiến thức cần hiểu

- Container nên log ra stdout/stderr.
- ECS awslogs driver gửi log vào CloudWatch Logs.
- ALB có metric target response, 4xx, 5xx.
- Alarm giúp cảnh báo khi service unhealthy hoặc error tăng.

## Chi phí ước lượng

- CloudWatch Logs tính phí ingest và storage.
- CloudWatch Alarms có phí theo alarm.
- Với lab nhỏ, chi phí thường thấp nhưng vẫn nên xóa log group/alarm sau demo.

## Cảnh báo service tốn tiền

Log group để lâu có thể tích lũy storage. Đặt retention ngắn, ví dụ 1-3 ngày cho lab.

## Các bước làm bằng Console

1. Vào CloudWatch Logs.
2. Mở log group `/ecs/learn-devops-demo-node`.
3. Xem log stream của task đang chạy.
4. Set retention 1 hoặc 3 ngày.
5. Vào CloudWatch Metrics.
6. Xem ECS service metrics: CPU, memory.
7. Xem ALB target group metrics: healthy host count, HTTP 5xx.
8. Tạo alarm đơn giản:
   - ECS running task count < 1.
   - Hoặc ALB target 5xx > 0 trong vài phút.

## Lệnh CLI kiểm tra/debug

Xem logs gần đây:

```bash
aws logs tail /ecs/learn-devops-demo-node --since 30m
```

Set retention:

```bash
aws logs put-retention-policy \
  --log-group-name /ecs/learn-devops-demo-node \
  --retention-in-days 3
```

Liệt kê alarms:

```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix learn-devops-demo \
  --query 'MetricAlarms[].{Name:AlarmName,State:StateValue}' \
  --output table
```

Test app log qua ALB:

```bash
curl -i "http://$ALB_DNS/health"
curl -i "http://$ALB_DNS/flow"
```

## Expected result

- CloudWatch Logs có request logs từ app.
- Log retention không để mặc định never expire.
- Có ít nhất một alarm demo hoặc biết cách tạo alarm từ metric.

## Cleanup

Xóa alarm demo:

```bash
aws cloudwatch delete-alarms \
  --alarm-names learn-devops-demo-ecs-running-task-low
```

Xóa log group sau khi xóa ECS service:

```bash
aws logs delete-log-group \
  --log-group-name /ecs/learn-devops-demo-node
```

## Troubleshooting

- Không thấy logs: kiểm tra task definition log configuration và execution role.
- Logs quá nhiều: giảm request test, set retention ngắn.
- Alarm không đổi state ngay: CloudWatch cần vài datapoint tùy period/evaluation.
