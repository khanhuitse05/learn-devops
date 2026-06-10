# AWS Monitoring & Logging Services

Giám sát hệ thống là bắt buộc cho production. AWS cung cấp: **CloudWatch** (metrics, logs, alarms), **CloudTrail** (audit API calls), và **X-Ray** (distributed tracing).

---

## 1. Bảng tổng quan

| Dịch vụ       | Vai trò                                  | Dữ liệu                                          | Use case chính                                   |
|---------------|------------------------------------------|--------------------------------------------------|--------------------------------------------------|
| CloudWatch    | Metrics, Logs, Alarms, Dashboards         | CPU, RAM, request count, application log         | Theo dõi sức khỏe hệ thống, cảnh báo khi có vấn đề |
| CloudTrail    | Audit API calls (ai gọi API gì, lúc nào)  | Mọi API call trong AWS account                   | Security audit, compliance, debug "ai xóa S3?"   |
| X-Ray         | Distributed tracing (trace request qua các service) | Trace map + segments + subsegments    | Debug latency trong microservices, tìm bottleneck |

---

## 2. CloudWatch – Trung tâm giám sát

### CloudWatch Components

| Thành phần        | Mô tả                                                                 |
|-------------------|-----------------------------------------------------------------------|
| Metrics           | Số liệu theo thời gian (CPU%, NetworkIn, RequestCount...)             |
| Logs              | Thu thập log từ EC2, Lambda, ECS, API Gateway...                      |
| Alarms            | Cảnh báo khi metric vượt ngưỡng → trigger SNS, Auto Scaling...        |
| Dashboards        | Custom dashboard trực quan hóa nhiều metric/graph cùng lúc            |
| Composite Alarms  | Kết hợp nhiều alarm với AND/OR logic                                  |
| Logs Insights     | Query log bằng SQL-like syntax (nhanh, rẻ hơn OpenSearch)             |
| Contributor Insights | Phân tích top-N contributor (vd: top 10 IP gửi request nhiều nhất) |
| Application Insights | Tự động setup dashboard + alarm cho app (.NET, Java)               |
| Synthetics        | Canary test: chạy script (Selenium/Node.js) định kỳ để kiểm tra endpoint |

### CloudWatch Metrics – Các metric quan trọng

| Dịch vụ    | Metric quan trọng                                      | Nên đặt alarm cho                                      |
|------------|--------------------------------------------------------|--------------------------------------------------------|
| EC2        | CPUUtilization, NetworkIn/Out, StatusCheckFailed       | CPU > 80% trong 5 phút, StatusCheckFailed > 0          |
| ALB        | RequestCount, TargetResponseTime, HTTPCode_ELB_5XX     | 5XX > 0, TargetResponseTime > 2s                       |
| RDS        | CPUUtilization, DatabaseConnections, FreeStorageSpace  | FreeStorageSpace < 10%, DatabaseConnections > threshold |
| Lambda     | Invocations, Duration, Errors, Throttles               | Errors > 0, Throttles > 0, Duration > timeout × 80%    |
| SQS        | ApproximateNumberOfMessagesVisible, AgeOfOldestMessage  | AgeOfOldestMessage > 5 phút                            |
| DynamoDB   | ConsumedReadCapacityUnits, ThrottledRequests           | ThrottledRequests > 0                                  |

### CloudWatch Alarms

```
Metric (CPU > 80%) 
    → Alarm state: OK → ALARM
    → Action: SNS notification → Email/Slack/PagerDuty
    → Action: Auto Scaling (scale-out EC2)
```

### CloudWatch Logs

| Nguồn log               | Cách gửi log                                           |
|--------------------------|--------------------------------------------------------|
| EC2                      | Cài CloudWatch Agent (CWAgent) hoặc gửi qua SDK        |
| ECS Fargate              | Tự động gửi stdout/stderr lên CloudWatch (awslogs driver) |
| Lambda                   | Tự động, không cần cấu hình gì thêm                     |
| API Gateway              | Bật CloudWatch Logs trong stage settings                |
| VPC Flow Logs            | Ghi lại IP traffic trong VPC (metadata, không nội dung)  |

### CloudWatch Logs Insights – Query Log

```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 20
```

Query tìm ERROR log trong 20 dòng gần nhất. Có thể aggregate, count, stats.

### CloudWatch Synthetics – Canary

Tự động test endpoint theo lịch (vd: mỗi 5 phút):
- **Heartbeat monitoring**: Gọi URL, kiểm tra HTTP 200
- **Browser canary**: Chạy Selenium script (vd: login → click → verify text)
- **Visual monitoring**: Screenshot UI so sánh với baseline

### Mẹo thực tế
- **CloudWatch Agent** cho EC2: gửi cả system log + custom metric (memory, disk) – CloudWatch mặc định không thấy RAM của EC2
- **Metric Filter**: Tạo metric từ log (vd: đếm số dòng "ERROR" trong log → alarm khi >10/phút)
- **Log Retention**: Cấu hình retention cho từng log group (mặc định không expire → tốn tiền)
- **Dashboard**: Tạo 1 dashboard tổng cho production với mọi metric quan trọng
- **Composite Alarm**: Dùng khi muốn cảnh báo chỉ khi CPU >80% **VÀ** request count > 1000 (tránh false alarm)

---

## 3. CloudTrail – Audit API Calls

### CloudTrail là gì?
CloudTrail ghi lại **mọi API call** trong AWS account của bạn: ai, gọi API gì, lúc nào, từ IP nào, kết quả ra sao. Log được lưu vào S3 hoặc CloudWatch Logs.

### CloudTrail Events

| Loại event           | Mô tả                                                      | Ví dụ                                        |
|----------------------|------------------------------------------------------------|-----------------------------------------------|
| Management Events    | API call quản lý tài nguyên (create/delete/modify)         | `ec2:RunInstances`, `s3:CreateBucket`         |
| Data Events          | API call truy cập dữ liệu (đọc/ghi object)                 | `s3:GetObject`, `lambda:Invoke`               |
| Insights Events      | Phát hiện hoạt động bất thường (API call spike, unusual)   | Tự động detect spike gọi `s3:DeleteBucket`    |

### CloudTrail Use Cases

- **Security audit**: "Ai đã xóa RDS database hôm qua lúc 3h sáng?"
- **Compliance**: Đáp ứng yêu cầu SOC2, PCI-DSS, HIPAA
- **Troubleshooting**: "Tại sao EC2 bị terminated?" → xem CloudTrail log
- **Anomaly detection**: CloudTrail Insights tự động phát hiện gọi API bất thường

### Mẹo thực tế
- Bật **CloudTrail cho tất cả region** + **Organization trail** (nếu dùng AWS Organizations)
- Bật **Data Events cho S3** nếu bucket chứa dữ liệu nhạy cảm (mặc định Data Events tắt)
- Log CloudTrail vào **S3 bucket riêng**, cấu hình lifecycle (chuyển Glacier sau 90 ngày)
- **CloudTrail Lake**: Query CloudTrail log bằng SQL mà không cần export ra Athena

---

## 4. X-Ray – Distributed Tracing

### X-Ray là gì?
X-Ray giúp bạn trace 1 request khi nó đi qua nhiều service (microservices, Lambda, SQS, DynamoDB...). Nó vẽ **trace map** cho thấy latency ở từng service, giúp tìm bottleneck.

### X-Ray Concepts

| Khái niệm   | Mô tả                                                            |
|-------------|------------------------------------------------------------------|
| Trace       | Toàn bộ hành trình của 1 request (gồm nhiều segment)              |
| Segment     | 1 service trong trace (vd: API Gateway → Lambda → DynamoDB)      |
| Subsegment  | 1 thao tác trong service (vd: gọi DynamoDB.GetItem trong Lambda) |
| Annotation  | Key-value metadata để filter/search (vd: user_id, order_id)      |
| Metadata    | Dữ liệu debug thêm (không dùng để search)                        |
| Trace Map   | Visual graph toàn bộ service và latency giữa chúng               |

### X-Ray Trace Map Ví dụ

```
[Client] → (30ms) → [API Gateway] → (150ms) → [Lambda A]
                                                    ↓ (500ms)
                                              [DynamoDB.GetItem]
                                                    ↓ (50ms)
                                              [Lambda B] → (800ms) → [RDS Query]
```

Nhìn vào trace map, bạn biết ngay RDS Query đang là bottleneck (800ms).

### X-Ray Integration

X-Ray được tích hợp sẵn trong:
- **Lambda**: Chỉ cần bật X-Ray tracing trong Lambda config
- **API Gateway**: Bật X-Ray per stage
- **ECS/EC2**: Chạy X-Ray Daemon sidecar container hoặc agent
- **SQS, SNS, Step Functions**: Tự động propagate trace context

### Mẹo thực tế
- Dùng **X-Ray SDK** trong code (Node.js, Python, Java...) để tạo custom subsegment, annotation
- **Sampling rule**: Mặc định sample theo số lượng request/giây (không theo %), tránh quá tải
- Dùng annotation `user_id`, `order_id` để filter trace theo business context
- Kết hợp X-Ray + CloudWatch Logs: X-Ray tự động correlate trace với log group

---

## 5. CloudWatch, CloudTrail, X-Ray khác nhau thế nào?

| Tiêu chí          | CloudWatch                              | CloudTrail                              | X-Ray                                    |
|-------------------|-----------------------------------------|----------------------------------------|------------------------------------------|
| Hỏi câu gì?       | "Hệ thống khỏe không?"                  | "Ai đã làm gì?"                        | "Request đi qua đâu, chậm ở đâu?"         |
| Dữ liệu           | Metrics (CPU, RAM), application log     | API call log (audit)                   | Trace, latency per service               |
| Thời gian         | Real-time (metrics <1 phút)             | Within 15 phút (thường 5-10 phút)      | Real-time                                |
| Retention mặc định | 15 tháng (metrics), tùy chọn (logs)     | 90 ngày (management events)            | 30 ngày                                   |
| Mức giá           | Rẻ                                    | Gần như miễn phí (trừ data events)     | $5/1 triệu trace                         |

---

## 6. Tóm tắt chọn dịch vụ

| Nhu cầu                                                            | Dịch vụ                              |
|--------------------------------------------------------------------|--------------------------------------|
| Xem CPU/RAM của EC2, số request của ALB                            | **CloudWatch Metrics**               |
| Xem log ứng dụng, query log bằng SQL-like                          | **CloudWatch Logs + Logs Insights**  |
| Cảnh báo khi CPU > 80%, 5XX error, free disk < 10%                 | **CloudWatch Alarms** + SNS          |
| Dashboard tổng quan hệ thống                                       | **CloudWatch Dashboards**            |
| Audit: ai đã xóa S3 bucket, ai đã gọi API gì                       | **CloudTrail**                       |
| Trace request qua microservices, tìm bottleneck                    | **X-Ray**                            |
| Tự động test endpoint định kỳ (heartbeat)                          | **CloudWatch Synthetics**            |
| Phân tích top IP, top URL gửi request nhiều nhất                   | **CloudWatch Contributor Insights**  |
| Tự động detect API call bất thường                                 | **CloudTrail Insights**              |